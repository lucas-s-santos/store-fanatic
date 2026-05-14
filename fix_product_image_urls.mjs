/**
 * fix_product_image_urls.mjs
 *
 * Corrige as image_url dos produtos no banco de dados.
 * Problema: URLs absolutas do Supabase Storage têm espaços, acentos e
 * nomes de pasta que não batem com o que foi gravado no bucket.
 *
 * Ex: /jersey/Serie A/Lazio/  →  /jersey/Serie-A/Lazio/
 *     /jersey/Premier league/ →  /jersey/Premier-league/
 *     /jersey/brasileirao/América Mineiro/ → /jersey/brasileirao/America-Mineiro/
 *
 * Uso: node fix_product_image_urls.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

const SUPABASE_URL = env.VITE_SUPABASE_URL
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltam variáveis de ambiente')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// Remove acentos de uma string
function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Normaliza um segmento do path para corresponder ao Storage:
 * - Remove acentos
 * - Espaços → hífens
 * - & e chars especiais → hífens
 * - Colapsa hífens duplos
 * - Trim hífens nas bordas
 */
function normalizeSegment(seg) {
  return removeAccents(seg)
    .replace(/[&()',`]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Corrige uma URL do Supabase Storage normalizando cada segmento do path.
 */
function fixUrl(url) {
  if (!url) return url

  const marker = '/object/public/'
  const markerIdx = url.indexOf(marker)
  if (markerIdx === -1) return url // não é URL do Storage

  const base     = url.slice(0, markerIdx + marker.length)
  const rest     = url.slice(markerIdx + marker.length) // "jersey-images/jersey/..."
  const segments = rest.split('/')
  const bucket   = segments[0] // não normalizar o nome do bucket

  const pathSegs = segments.slice(1).map(seg => {
    // Não normalizar segmentos que já estão corretos (sem espaços/acentos)
    const normalized = normalizeSegment(seg)
    return normalized
  })

  return `${base}${bucket}/${pathSegs.join('/')}`
}

async function main() {
  console.log('🔍 Buscando todos os produtos...')

  // Buscar todos produtos paginando
  let allProducts = []
  let page = 0
  const limit = 1000

  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('id, image_url')
      .range(page * limit, (page + 1) * limit - 1)

    if (error) { console.error('Erro:', error.message); break }
    if (!data || data.length === 0) break

    allProducts = [...allProducts, ...data]
    console.log(`  Carregados: ${allProducts.length}`)

    if (data.length < limit) break
    page++
  }

  console.log(`\nTotal: ${allProducts.length} produtos`)

  // Filtrar apenas os que precisam de correção
  const toFix = allProducts.filter(p => {
    const fixed = fixUrl(p.image_url)
    return fixed !== p.image_url
  })

  console.log(`Produtos com URL para corrigir: ${toFix.length}`)

  if (toFix.length === 0) {
    console.log('\n✅ Nada para corrigir!')
    return
  }

  // Atualizar em lotes de 50
  const BATCH = 50
  let ok = 0
  let fail = 0

  for (let i = 0; i < toFix.length; i += BATCH) {
    const batch = toFix.slice(i, i + BATCH)

    await Promise.all(batch.map(async (product) => {
      const newImageUrl = fixUrl(product.image_url)

      const { error } = await supabase
        .from('products')
        .update({ image_url: newImageUrl })
        .eq('id', product.id)

      if (error) {
        console.error(`  ❌ ${product.id}: ${error.message}`)
        fail++
      } else {
        ok++
      }
    }))

    const pct = Math.round(((i + BATCH) / toFix.length) * 100)
    console.log(`  Progresso: ${Math.min(i + BATCH, toFix.length)}/${toFix.length} (${pct}%)`)
  }

  console.log(`\n✅ Concluído! Corrigidos: ${ok} | Falhas: ${fail}`)

  // Mostrar exemplos do que foi corrigido
  console.log('\nExemplos de correção:')
  toFix.slice(0, 5).forEach(p => {
    console.log('  Antes:', p.image_url?.slice(-80))
    console.log('  Depois:', fixUrl(p.image_url)?.slice(-80))
    console.log()
  })
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
