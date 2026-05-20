/**
 * Script: seed-from-cloudinary.mjs
 * Popula o novo Supabase com leagues, teams e products
 * usando o cloudinary-map.json gerado pelo upload.
 *
 * Como rodar:
 *   node scripts/seed-from-cloudinary.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL         = 'https://jynsexowmcznrapapkwc.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bnNleG93bWN6bnJhcGFwa3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNDAzNiwiZXhwIjoyMDk0ODEwMDM2fQ.0sWt0vuiU4aUjw7Mz1HbUZMmmFnIdM8GDBvLfYfMhkQ'

const DEFAULT_PRICE = 89.90
const DEFAULT_SIZES = ['P', 'M', 'G', 'GG', 'XGG']

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

async function main() {
  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Lê o mapa cloudinary
  const raw = await readFile(join(__dirname, '..', 'cloudinary-map.json'), 'utf-8')
  const cloudinaryMap = JSON.parse(raw)

  // Agrupa por time: { "Flamengo": ["url1", "url2", ...] }
  const teamImages = {}
  for (const [localPath, cdnUrl] of Object.entries(cloudinaryMap)) {
    const match = localPath.replace(/\\/g, '/').match(/CAMISAS BRASILEIR[AÃ]O\/([^/]+)\//)
    if (!match) continue
    const teamName = match[1]
    if (!teamImages[teamName]) teamImages[teamName] = []
    teamImages[teamName].push(cdnUrl)
  }

  const teams = Object.keys(teamImages).sort()
  console.log(`\n📋 ${teams.length} times encontrados\n`)

  // 1. Upsert league Brasileirão
  const { error: leagueErr } = await client.from('leagues').upsert({
    id: 'brasileirao',
    name: 'Brasileirão',
    country: 'Brasil',
  }, { onConflict: 'id' })
  if (leagueErr) {
    console.error('❌ Erro ao criar league:', leagueErr.message)
    process.exit(1)
  }
  console.log('✅ League Brasileirão criada')

  // 2. Upsert times
  const teamRows = teams.map(name => ({
    id: slugify(name),
    league_id: 'brasileirao',
    name,
  }))
  const { error: teamsErr } = await client.from('teams').upsert(teamRows, { onConflict: 'id' })
  if (teamsErr) {
    console.error('❌ Erro ao criar teams:', teamsErr.message)
    process.exit(1)
  }
  console.log(`✅ ${teams.length} times criados`)

  // 3. Upsert products (uma camisa por imagem)
  let totalProducts = 0
  let errors = 0

  for (const teamName of teams) {
    const urls = teamImages[teamName]
    const teamSlug = slugify(teamName)

    const products = urls.map((imageUrl, i) => {
      const num = i + 1
      const slug = `${teamSlug}-${num}`
      return {
        slug,
        name: `${teamName} ${num}`,
        title: `Camisa ${teamName}`,
        description: `Camisa oficial ${teamName} — Brasileirão`,
        price: DEFAULT_PRICE,
        category: 'camisas',
        league: 'brasileirao',
        team: teamName,
        image_url: imageUrl,
        images: [imageUrl],
        sizes: DEFAULT_SIZES,
        active: true,
        type: 'torcedor',
        stock_quantity: 10,
        order_priority: 0,
      }
    })

    const { error } = await client.from('products').upsert(products, { onConflict: 'slug' })
    if (error) {
      console.error(`  ❌ ${teamName}: ${error.message}`)
      errors++
    } else {
      console.log(`  ✅ ${teamName}: ${urls.length} camisas`)
      totalProducts += urls.length
    }
  }

  console.log('\n' + '─'.repeat(50))
  console.log(`✅ ${totalProducts} produtos criados no Supabase`)
  if (errors > 0) console.log(`❌ ${errors} times com erro`)
  console.log('─'.repeat(50) + '\n')
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err)
  process.exit(1)
})
