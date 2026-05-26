/**
 * Script: upload-bundesliga.mjs
 * Faz upload das imagens da Bundesliga para o Cloudinary e cria os produtos no Supabase.
 *
 * Como rodar:
 *   node scripts/upload-bundesliga.mjs
 *
 * Para retomar de onde parou, rode novamente — imagens já enviadas são puladas.
 */

import { readdir, readFile, writeFile } from 'fs/promises'
import { join, basename } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Cloudinary ─────────────────────────────────────────────────────────────────
const CLOUD_NAME    = 'drdxlvlk4'
const UPLOAD_PRESET = 'storefanatic'
const BASE_FOLDER   = 'bundesliga'
const IMAGES_ROOT   = join(__dirname, '..', 'public', 'Bundesliga')
const MAP_OUTPUT    = join(__dirname, '..', 'cloudinary-map-bundesliga.json')
const CONCURRENT    = 5

// ── Supabase ───────────────────────────────────────────────────────────────────
const SUPABASE_URL      = 'https://jynsexowmcznrapapkwc.supabase.co'
const SERVICE_ROLE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bnNleG93bWN6bnJhcGFwa3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNDAzNiwiZXhwIjoyMDk0ODEwMDM2fQ.0sWt0vuiU4aUjw7Mz1HbUZMmmFnIdM8GDBvLfYfMhkQ'
const LEAGUE_ID         = 'bundesliga'
const PRECO_PADRAO      = 149.99

// ── Mapeamento: nome da pasta → dados do time ──────────────────────────────────
const TEAM_MAP = {
  'Bayern de Munique':    { id: 'bayern-munique',       name: 'Bayern de Munique' },
  'Borussia Dortmund':    { id: 'borussia-dortmund',    name: 'Borussia Dortmund' },
  'Borussia M_Gladbach':  { id: 'borussia-mgladbach',   name: "Borussia M'Gladbach" },
  'Eintracht Frankfurt':  { id: 'eintracht-frankfurt',  name: 'Eintracht Frankfurt' },
  'Hertha Berlin':        { id: 'hertha-berlin',        name: 'Hertha Berlin' },
  'Hoffenheim':           { id: 'hoffenheim',           name: 'Hoffenheim' },
  'Mainz 05':             { id: 'mainz',                name: 'Mainz 05' },
  'RB Leipzig':           { id: 'rb-leipzig',           name: 'RB Leipzig' },
  'Schalke 04':           { id: 'schalke',              name: 'Schalke 04' },
  'Union Berlin':         { id: 'union-berlin',         name: 'Union Berlin' },
  'Wolfsburg':            { id: 'wolfsburg',            name: 'Wolfsburg' },
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildPublicId(filePath) {
  const relative = filePath.replace(IMAGES_ROOT, '').replace(/\\/g, '/')
  const withoutExt = relative.replace(/\.[^/.]+$/, '')
  const clean = withoutExt.replace(/^\//, '').replace(/\s+/g, '-').replace(/'/g, '')
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
    if (entry.isDirectory()) {
      files.push(...await listImages(full))
    } else if (/\.(jpe?g|png|webp|gif)$/i.test(entry.name)) {
      files.push(full)
    }
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

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }

  const data = await res.json()
  return data.secure_url
}

async function runBatch(items, fn, concurrency) {
  const results = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.allSettled(batch.map(fn))
    results.push(...batchResults)
    const done = Math.min(i + concurrency, items.length)
    process.stdout.write(`\r  ${done}/${items.length} enviados`)
  }
  console.log()
  return results
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // 1. Confirmar que a liga bundesliga existe no banco
  const { data: league, error: leagueErr } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('id', LEAGUE_ID)
    .single()

  if (leagueErr || !league) {
    console.error(`❌ Liga "${LEAGUE_ID}" não encontrada no banco. Rode seed-leagues-logos.mjs primeiro.`)
    process.exit(1)
  }
  console.log(`✅ Liga: ${league.name} (${league.id})\n`)

  // 2. Listar todas as imagens
  console.log('🔍 Listando imagens em public/Bundesliga...')
  const allFiles = await listImages(IMAGES_ROOT)
  console.log(`  ${allFiles.length} imagens encontradas\n`)

  // 3. Carregar mapa existente para retomar de onde parou
  let existingMap = {}
  try {
    const raw = await readFile(MAP_OUTPUT, 'utf-8')
    existingMap = JSON.parse(raw)
    const already = Object.keys(existingMap).length
    if (already > 0) console.log(`  📂 ${already} já enviadas — pulando\n`)
  } catch {
    // mapa ainda não existe
  }

  // 4. Upload para o Cloudinary
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
    if (r.status === 'rejected') {
      fail++
      console.error(`\n  ❌ Erro: ${r.reason?.message || r.reason}`)
    }
  }

  await writeFile(MAP_OUTPUT, JSON.stringify(map, null, 2), 'utf-8')
  console.log(`\n✅ ${ok} imagens enviadas | ${fail > 0 ? `❌ ${fail} com erro` : '0 erros'}`)
  console.log(`📄 Mapa salvo em: cloudinary-map-bundesliga.json\n`)

  if (fail > 0) {
    console.log('⚠️  Houve erros no upload. Rode novamente para tentar as imagens que falharam.\n')
  }

  // 5. Criar/atualizar produtos no Supabase por time
  console.log('📦 Criando produtos no Supabase...\n')

  const teamFolders = await readdir(IMAGES_ROOT, { withFileTypes: true })
  const dirs = teamFolders.filter(e => e.isDirectory()).map(e => e.name).sort()

  let totalProducts = 0
  let productErrors = 0

  for (const folderName of dirs) {
    const teamData = TEAM_MAP[folderName]
    if (!teamData) {
      console.warn(`⚠️  "${folderName}" sem mapeamento — pulando. Adicione ao TEAM_MAP se necessário.`)
      continue
    }

    const teamDir = join(IMAGES_ROOT, folderName)
    const files = (await readdir(teamDir))
      .filter(f => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .sort((a, b) => extractNumber(a) - extractNumber(b))

    if (files.length === 0) {
      console.log(`⚠️  ${folderName}: nenhuma imagem — pulando`)
      continue
    }

    const productsToInsert = []

    for (let i = 0; i < files.length; i++) {
      const filePath = join(teamDir, files[i])
      const imageUrl = map[filePath]

      if (!imageUrl) {
        console.warn(`  ⚠️  URL não encontrada para ${files[i]} — imagem pode não ter sido enviada`)
        continue
      }

      productsToInsert.push({
        title:                `Camisa ${teamData.name} - Modelo ${i + 1}`,
        description:          '',
        price:                PRECO_PADRAO,
        stock:                100,
        stock_quantity:       100,
        category:             'camisas',
        league:               LEAGUE_ID,
        team:                 teamData.id,
        sizes:                ['P', 'M', 'G', 'GG', 'XG', 'XGG'],
        image_url:            imageUrl,
        featured:             false,
        active:               true,
        type:                 'torcedor',
        personalization_price: 20,
        order_priority:       i + 1,
      })
    }

    if (productsToInsert.length === 0) continue

    const { error: insertError } = await supabase.from('products').insert(productsToInsert)
    if (insertError) {
      console.error(`❌ Erro ao inserir produtos de ${teamData.name}: ${insertError.message}`)
      productErrors++
    } else {
      totalProducts += productsToInsert.length
      console.log(`✅ ${teamData.name}: ${productsToInsert.length} produtos criados`)
    }
  }

  console.log('\n' + '─'.repeat(50))
  console.log(`🎉 Concluído!`)
  console.log(`   ✅ ${ok} imagens no Cloudinary`)
  console.log(`   ✅ ${totalProducts} produtos criados no banco`)
  if (fail > 0 || productErrors > 0) {
    console.log(`   ❌ ${fail} erros de upload | ${productErrors} erros de produto`)
  }
  console.log('─'.repeat(50) + '\n')
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err)
  process.exit(1)
})
