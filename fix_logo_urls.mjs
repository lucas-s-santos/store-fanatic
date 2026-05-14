/**
 * fix_logo_urls.mjs
 * 
 * Corrige as URLs de logos quebradas no banco de dados (tabelas teams e leagues).
 * Problema: algumas logo_url têm espaços ou & no path que não existem no Storage.
 * Solução: normaliza o path para corresponder ao que foi gravado no bucket.
 * 
 * Uso: node fix_logo_urls.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Lê o .env manualmente
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
  console.error('Variáveis VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não encontradas no .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

/**
 * Normaliza um segmento de path do Storage:
 * espaços → hífens, & e chars especiais → hífens, colapsa hífens duplos.
 */
function normalizeSegment(seg) {
  return seg
    .replace(/[&()',`]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Recebe uma URL do Supabase Storage e normaliza cada segmento do path.
 * URLs já corretas passarão sem alteração.
 */
function fixStorageUrl(url) {
  if (!url) return url

  // Encontra o ponto após /object/public/<bucket>/
  const marker = '/object/public/'
  const markerIdx = url.indexOf(marker)
  if (markerIdx === -1) return url // não é URL do Storage

  const base    = url.slice(0, markerIdx + marker.length)
  const rest    = url.slice(markerIdx + marker.length) // "jersey-images/logos/Serie A/..."

  const segments = rest.split('/')
  // Primeiro segmento é o nome do bucket — não normalizar
  const bucket   = segments[0]
  const pathSegs = segments.slice(1).map(normalizeSegment)

  return `${base}${bucket}/${pathSegs.join('/')}`
}

async function fixTable(table, column) {
  console.log(`\n📋 Verificando tabela "${table}"...`)

  const { data: rows, error } = await supabase.from(table).select(`id, ${column}`)
  if (error) { console.error('Erro ao buscar:', error.message); return }

  const toFix = rows.filter(r => {
    const original = r[column]
    if (!original) return false
    const fixed = fixStorageUrl(original)
    return fixed !== original
  })

  console.log(`   ${rows.length} registros | ${toFix.length} com URL para corrigir`)

  let ok = 0
  let fail = 0

  for (const row of toFix) {
    const original = row[column]
    const fixed    = fixStorageUrl(original)

    console.log(`   Corrigindo ${row.id}:`)
    console.log(`     DE:  ${original}`)
    console.log(`     PARA: ${fixed}`)

    const { error: updateError } = await supabase
      .from(table)
      .update({ [column]: fixed })
      .eq('id', row.id)

    if (updateError) {
      console.error(`     ❌ FALHOU: ${updateError.message}`)
      fail++
    } else {
      console.log(`     ✅ OK`)
      ok++
    }
  }

  console.log(`\n   Resultado: ${ok} corrigidos, ${fail} falhas`)
}

async function main() {
  console.log('🔧 Iniciando correção de URLs de logos no banco de dados...')
  console.log(`   Supabase: ${SUPABASE_URL}\n`)

  await fixTable('leagues', 'logo_url')
  await fixTable('teams',   'logo_url')

  console.log('\n✅ Concluído! Verifique o site agora.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
