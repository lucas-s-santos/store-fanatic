/**
 * Script: upload-ligue1.mjs
 * Faz upload das imagens da Ligue 1 para o Cloudinary e cria os produtos no Supabase.
 *
 * Como rodar:
 *   node scripts/upload-ligue1.mjs
 */

import { readdir, readFile, writeFile } from 'fs/promises'
import { join, basename, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const CLOUD_NAME    = 'drdxlvlk4'
const UPLOAD_PRESET = 'storefanatic'
const BASE_FOLDER   = 'ligue1'
const IMAGES_ROOT   = join(__dirname, '..', 'public', 'Liga1')
const MAP_OUTPUT    = join(__dirname, '..', 'cloudinary-map-ligue1.json')
const CONCURRENT    = 5

const SUPABASE_URL     = 'https://jynsexowmcznrapapkwc.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bnNleG93bWN6bnJhcGFwa3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNDAzNiwiZXhwIjoyMDk0ODEwMDM2fQ.0sWt0vuiU4aUjw7Mz1HbUZMmmFnIdM8GDBvLfYfMhkQ'
const LEAGUE_ID        = 'ligue-1'
const PRECO_PADRAO     = 149.99

const TEAM_MAP = {
  'Lens':                   { id: 'rc-lens',      name: 'Lens' },
  'Lille':                  { id: 'lille',        name: 'Lille' },
  'Lorient':                { id: 'lorient',      name: 'Lorient' },
  'Lyon':                   { id: 'lyon',         name: 'Lyon' },
  'Monaco':                 { id: 'monaco',       name: 'Monaco' },
  'Nantes':                 { id: 'nantes',       name: 'Nantes' },
  'Olympique de Marseille': { id: 'marseille',    name: 'Olympique de Marseille' },
  'Paris Saint Germain':    { id: 'psg',          name: 'Paris Saint-Germain' },
  'Rennes':                 { id: 'rennes',       name: 'Rennes' },
  'Stade Reims':            { id: 'stade-reims',  name: 'Stade de Reims' },
  'Strasbourg':             { id: 'strasbourg',   name: 'Strasbourg' },
}

function buildPublicId(filePath) {
  const relative = filePath.replace(IMAGES_ROOT, '').replace(/\\/g, '/')
  const withoutExt = relative.replace(/\.[^/.]+$/, '')
  const clean = withoutExt.replace(/^\//, '').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9/_-]/g, '')
  return `${BASE_FOLDER}/${clean}`
}

function extractNumber(filename) {
  const match = filename.match(/-(\d+)\./i)
  return match ? parseInt(match[1], 10) : 0
}

async function listImages(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await listImages(full))
    else if (/\.(jpe?g|png|webp|gif)$/i.test(entry.name)) files.push(full)
  }
  return files
}

async function uploadToCloudinary(filePath, publicId) {
  const buffer = await readFile(filePath)
  const blob = new Blob([buffer])
  const form = new FormData()
  form.append('file', blob, basename(filePath))
  form.append('upload_preset', UPLOAD_PRESET)
  form.append('public_id', publicId)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  return (await res.json()).secure_url
}

async function runBatch(items, fn, concurrency) {
  const results = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(batch.map(fn))
    results.push(...batchResults)
    process.stdout.write(`\r  ${Math.min(i + concurrency, items.length)}/${items.length} enviados`)
  }
  console.log()
  return results
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: league, error: leagueErr } = await supabase.from('leagues').select('id, name').eq('id', LEAGUE_ID).single()
  if (leagueErr || !league) { console.error(`❌ Liga "${LEAGUE_ID}" não encontrada. Rode seed-leagues-logos.mjs primeiro.`); process.exit(1) }
  console.log(`✅ Liga: ${league.name} (${league.id})\n`)

  console.log('🔍 Listando imagens em public/Liga1...')
  const allFiles = await listImages(IMAGES_ROOT)
  console.log(`  ${allFiles.length} imagens encontradas\n`)

  let existingMap = {}
  try {
    existingMap = JSON.parse(await readFile(MAP_OUTPUT, 'utf-8'))
    const already = Object.keys(existingMap).length
    if (already > 0) console.log(`  📂 ${already} já enviadas — pulando\n`)
  } catch { /* mapa não existe ainda */ }

  const toUpload = allFiles.filter(f => !existingMap[f])
  console.log(`🚀 Enviando ${toUpload.length} imagens para o Cloudinary (${CONCURRENT} por vez)...\n`)

  const map = { ...existingMap }
  let ok = 0, fail = 0

  const results = await runBatch(toUpload, async (filePath) => {
    const publicId = buildPublicId(filePath)
    const url = await uploadToCloudinary(filePath, publicId)
    map[filePath] = url
    ok++
    return { filePath, url }
  }, CONCURRENT)

  for (const r of results) {
    if (r.status === 'rejected') { fail++; console.error(`\n  ❌ Erro: ${r.reason?.message || r.reason}`) }
  }

  await writeFile(MAP_OUTPUT, JSON.stringify(map, null, 2), 'utf-8')
  console.log(`\n✅ ${ok} imagens enviadas | ${fail > 0 ? `❌ ${fail} com erro` : '0 erros'}`)
  console.log(`📄 Mapa salvo em: cloudinary-map-ligue1.json\n`)

  console.log('📦 Criando produtos no Supabase...\n')
  const teamFolders = (await readdir(IMAGES_ROOT, { withFileTypes: true })).filter(e => e.isDirectory()).map(e => e.name).sort()

  let totalProducts = 0, productErrors = 0

  for (const folderName of teamFolders) {
    const teamData = TEAM_MAP[folderName]
    if (!teamData) { console.warn(`⚠️  "${folderName}" sem mapeamento — pulando`); continue }

    const teamDir = join(IMAGES_ROOT, folderName)
    const files = (await readdir(teamDir)).filter(f => /\.(jpe?g|png|webp|avif)$/i.test(f)).sort((a, b) => extractNumber(a) - extractNumber(b))
    if (files.length === 0) continue

    const productsToInsert = []
    for (let i = 0; i < files.length; i++) {
      const imageUrl = map[join(teamDir, files[i])]
      if (!imageUrl) { console.warn(`  ⚠️  URL não encontrada para ${files[i]}`); continue }
      productsToInsert.push({
        title:                 `Camisa ${teamData.name} - Modelo ${i + 1}`,
        description:           '',
        price:                 PRECO_PADRAO,
        stock:                 100,
        stock_quantity:        100,
        category:              'camisas',
        league:                LEAGUE_ID,
        team:                  teamData.id,
        sizes:                 ['P', 'M', 'G', 'GG', 'XG', 'XGG'],
        image_url:             imageUrl,
        featured:              false,
        active:                true,
        type:                  'torcedor',
        personalization_price: 20,
        order_priority:        i + 1,
      })
    }

    if (productsToInsert.length === 0) continue
    const { error } = await supabase.from('products').insert(productsToInsert)
    if (error) { console.error(`❌ Erro em ${teamData.name}: ${error.message}`); productErrors++ }
    else { totalProducts += productsToInsert.length; console.log(`✅ ${teamData.name}: ${productsToInsert.length} produtos criados`) }
  }

  console.log('\n' + '─'.repeat(50))
  console.log(`🎉 Concluído!`)
  console.log(`   ✅ ${ok} imagens no Cloudinary`)
  console.log(`   ✅ ${totalProducts} produtos criados no banco`)
  if (fail > 0 || productErrors > 0) console.log(`   ❌ ${fail} erros de upload | ${productErrors} erros de produto`)
  console.log('─'.repeat(50) + '\n')
}

main().catch(err => { console.error('\n❌ Erro fatal:', err); process.exit(1) })
