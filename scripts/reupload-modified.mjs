/**
 * Re-faz upload apenas dos arquivos modificados recentemente.
 * Requer que o preset Cloudinary tenha Overwrite = true.
 *
 * Como rodar:
 *   node scripts/reupload-modified.mjs
 *
 * Por padrão considera "recente" = modificado nas últimas 24h.
 * Passe --hours=48 para ampliar a janela.
 */

import { readdir, readFile, writeFile, stat } from 'fs/promises'
import { join, basename, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const CLOUD_NAME    = 'drdxlvlk4'
const UPLOAD_PRESET = 'storefanatic'
const BASE_FOLDER   = 'brasileirao'
const IMAGES_ROOT   = join(__dirname, '..', 'public', 'camisasBrasileirao', 'CAMISAS BRASILEIRÃO')
const MAP_OUTPUT    = join(__dirname, '..', 'cloudinary-map.json')
const CONCURRENT    = 4

const hoursArg = process.argv.find(a => a.startsWith('--hours='))
const HOURS = hoursArg ? parseInt(hoursArg.split('=')[1]) : 24
const CUTOFF = Date.now() - HOURS * 60 * 60 * 1000

function buildPublicId(filePath) {
  const relative = filePath.replace(IMAGES_ROOT, '').replace(/\\/g, '/')
  const withoutExt = relative.replace(/\.[^/.]+$/, '')
  const clean = withoutExt.replace(/^\//, '').replace(/\s+/g, '-')
  return `${BASE_FOLDER}/${clean}`
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
    process.stdout.write(`\r  ${Math.min(i + concurrency, items.length)}/${items.length} processados`)
  }
  console.log()
  return results
}

async function main() {
  console.log(`\n🔍 Procurando imagens modificadas nas últimas ${HOURS}h...\n`)

  const allFiles = await listImages(IMAGES_ROOT)

  // Filtra apenas arquivos modificados recentemente
  const modified = []
  for (const f of allFiles) {
    const s = await stat(f)
    if (s.mtimeMs >= CUTOFF) modified.push(f)
  }

  if (modified.length === 0) {
    console.log(`Nenhum arquivo modificado nas últimas ${HOURS}h.`)
    console.log(`Use --hours=48 para ampliar a janela de tempo.`)
    return
  }

  console.log(`📋 ${modified.length} arquivo(s) modificado(s):\n`)
  for (const f of modified) console.log(' ', f.replace(IMAGES_ROOT, ''))

  // Carrega mapa existente
  let map = {}
  try {
    map = JSON.parse(await readFile(MAP_OUTPUT, 'utf-8'))
  } catch { /* mapa ainda não existe */ }

  console.log(`\n🚀 Fazendo re-upload (${CONCURRENT} por vez)...\n`)

  let ok = 0, fail = 0
  const results = await runBatch(modified, async (filePath) => {
    const publicId = buildPublicId(filePath)
    const url = await uploadToCloudinary(filePath, publicId)
    map[filePath] = url
    ok++
    return { filePath, url }
  }, CONCURRENT)

  for (const r of results) {
    if (r.status === 'rejected') {
      fail++
      console.error(`  ❌ Erro:`, r.reason?.message || r.reason)
    }
  }

  await writeFile(MAP_OUTPUT, JSON.stringify(map, null, 2), 'utf-8')

  console.log('\n' + '─'.repeat(50))
  console.log(`✅ ${ok} imagem(ns) re-enviada(s)`)
  if (fail > 0) console.log(`❌ ${fail} com erro`)
  console.log('─'.repeat(50) + '\n')

  if (ok > 0) {
    console.log('💡 As URLs do Cloudinary não mudam quando você sobrescreve a imagem.')
    console.log('   O banco de dados não precisa ser atualizado.\n')
  }
}

main().catch(err => { console.error('\n❌ Erro fatal:', err); process.exit(1) })
