/**
 * Script: seed-mundial.mjs
 * Insere times e produtos do Mundial no Supabase a partir do cloudinary-map-mundial.json.
 * Insere um produto por vez com upsert para evitar falhas em batch.
 *
 * Como rodar:
 *   node scripts/seed-mundial.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://jynsexowmcznrapapkwc.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bnNleG93bWN6bnJhcGFwa3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNDAzNiwiZXhwIjoyMDk0ODEwMDM2fQ.0sWt0vuiU4aUjw7Mz1HbUZMmmFnIdM8GDBvLfYfMhkQ'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const LEAGUE_ID = 'selecoes'
const PRICE     = 89.90
const SIZES     = ['P', 'M', 'G', 'GG', 'XGG']

function slugify(name) {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function extractCountry(filePath) {
  const parts = filePath.replace(/\\/g, '/').split('/')
  const idx = parts.findIndex(p => p === 'Mundial')
  return parts[idx + 1] ?? 'Desconhecido'
}

async function main() {
  const mapPath = join(__dirname, '..', 'cloudinary-map-mundial.json')
  const map = JSON.parse(readFileSync(mapPath, 'utf-8'))

  // ── Agrupa por país ──────────────────────────────────────────────────────
  const byCountry = new Map()
  for (const [filePath, url] of Object.entries(map)) {
    const country = extractCountry(filePath)
    if (!byCountry.has(country)) byCountry.set(country, [])
    byCountry.get(country).push(url)
  }
  console.log(`${byCountry.size} seleções | ${Object.keys(map).length} imagens\n`)

  // ── 1. Upsert times ──────────────────────────────────────────────────────
  console.log('Inserindo times...')
  const teamRows = Array.from(byCountry.keys()).map(c => ({
    id: slugify(c),
    league_id: LEAGUE_ID,
    name: c,
    logo_url: '',
  }))
  const { error: teamsErr } = await supabase.from('teams').upsert(teamRows, { onConflict: 'id' })
  if (teamsErr) { console.error('Erro times:', teamsErr.message); process.exit(1) }
  console.log(`  ${teamRows.length} times OK\n`)

  // ── 2. Rastreia slugs gerados nesta execução (evita duplicatas internas) ─
  // Não carrega slugs do banco — deixa o upsert ignorar conflitos externos.
  const usedSlugs = new Set()

  // ── 3. Insere produtos um a um ───────────────────────────────────────────
  console.log('Inserindo produtos...')
  let inserted = 0, skipped = 0, failed = 0

  for (const [country, urls] of byCountry) {
    const teamSlug = slugify(country)
    let countryIndex = 0  // índice sequencial por país para slug fallback

    for (const url of urls) {
      countryIndex++

      // Número extraído do filename (ex: Brasil-12.jpeg → 12)
      const match = url.match(/-(\d+)\.[^.]+$/)
      const rawNum = match ? match[1] : String(countryIndex)
      let slug = `${teamSlug}-${rawNum}`

      // Se o slug já existe (DB ou gerado nesta sessão), cria variante única
      if (usedSlugs.has(slug)) {
        let suffix = 2
        while (usedSlugs.has(`${slug}-v${suffix}`)) suffix++
        slug = `${slug}-v${suffix}`
      }
      usedSlugs.add(slug)

      const isFirst = countryIndex === 1
      const row = {
        id: randomUUID(),
        slug,
        name: `${country} ${rawNum}`,
        title: `Camisa ${country}`,
        description: `Camisa oficial ${country} — Copa do Mundo 2026`,
        price: PRICE,
        category: 'camisas',
        league: LEAGUE_ID,
        team: teamSlug,
        stock_quantity: 10,
        stock: 0,
        sizes: SIZES,
        image_url: url,
        images: [url],
        featured: isFirst,
        active: true,
        type: 'torcedor',
        order_priority: countryIndex - 1,
        personalization_price: 0,
        tech_specs: {},
      }

      const { error } = await supabase
        .from('products')
        .upsert(row, { onConflict: 'slug', ignoreDuplicates: true })

      if (error) {
        failed++
        console.error(`\nERRO ${slug}: ${error.message}`)
      } else {
        inserted++
        if (inserted % 20 === 0) process.stdout.write(`\r  ${inserted} inseridos...`)
      }
    }
  }

  console.log(`\n\n${'─'.repeat(50)}`)
  console.log(`✅ ${inserted} produtos processados`)
  if (skipped) console.log(`⏭  ${skipped} pulados`)
  if (failed)  console.log(`❌ ${failed} com erro`)
  console.log('─'.repeat(50))

  // ── Resumo final ─────────────────────────────────────────────────────────
  const { count } = await supabase
    .from('products')
    .select('count', { count: 'exact', head: true })
    .eq('league', LEAGUE_ID)
  console.log(`\nTotal de produtos selecoes no banco: ${count}`)
}

main().catch(err => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
