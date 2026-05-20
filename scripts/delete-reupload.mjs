/**
 * Deleta imagens modificadas do Cloudinary e faz re-upload.
 * As credenciais são passadas por argumento para não ficarem no código.
 *
 * Como rodar:
 *   node scripts/delete-reupload.mjs <API_KEY> <API_SECRET>
 *
 * Opcional: --hours=48 para ampliar a janela de arquivos modificados
 */

import { readdir, readFile, writeFile, stat } from 'fs/promises'
import { join, basename, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash, createHmac } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

const CLOUD_NAME    = 'drdxlvlk4'
const UPLOAD_PRESET = 'storefanatic'
const BASE_FOLDER   = 'brasileirao'
const IMAGES_ROOT   = join(__dirname, '..', 'public', 'camisasBrasileirao', 'CAMISAS BRASILEIRÃO')
const MAP_OUTPUT    = join(__dirname, '..', 'cloudinary-map.json')
const CONCURRENT    = 4

const [,, API_KEY, API_SECRET] = process.argv
if (!API_KEY || !API_SECRET) {
  console.error('Uso: node scripts/delete-reupload.mjs <API_KEY> <API_SECRET>')
  process.exit(1)
}

const hoursArg = process.argv.find(a => a.startsWith('--hours='))
const HOURS  = hoursArg ? parseInt(hoursArg.split('=')[1]) : 24
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

async function deleteFromCloudinary(publicIds) {
  const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64')
  const params = publicIds.map(id => `public_ids[]=${encodeURIComponent(id)}`).join('&')
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/upload?${params}`

  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Basic ${auth}` }
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Delete HTTP ${res.status}: ${text}`)
  }
  return res.json()
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
    throw new Error(`Upload HTTP ${res.status}: ${text}`)
  }
  const data = await res.json()
  return data.secure_url
}

async function runBatch(items, fn, concurrency) {
  const results = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    results.push(...await Promise.allSettled(batch.map(fn)))
    process.stdout.write(`\r  ${Math.min(i + concurrency, items.length)}/${items.length} processados`)
  }
  console.log()
  return results
}

async function main() {
  console.log(`\n🔍 Procurando imagens modificadas nas últimas ${HOURS}h...\n`)

  const allFiles = await listImages(IMAGES_ROOT)
  const modified = []
  for (const f of allFiles) {
    const s = await stat(f)
    if (s.mtimeMs >= CUTOFF) modified.push(f)
  }

  if (modified.length === 0) {
    console.log(`Nenhum arquivo modificado nas últimas ${HOURS}h.`)
    console.log(`Use --hours=48 para ampliar a janela.`)
    return
  }

  console.log(`📋 ${modified.length} arquivo(s) para re-enviar:`)
  for (const f of modified) console.log(' ', f.replace(IMAGES_ROOT, ''))

  const publicIds = modified.map(buildPublicId)

  // 1. Deleta do Cloudinary (em lotes de 100 — limite da API)
  console.log('\n🗑️  Deletando do Cloudinary...')
  for (let i = 0; i < publicIds.length; i += 100) {
    const batch = publicIds.slice(i, i + 100)
    const result = await deleteFromCloudinary(batch)
    const deleted = result.deleted ? Object.keys(result.deleted).length : 0
    console.log(`   ${deleted} imagem(ns) deletada(s)`)
  }

  // 2. Remove entradas do mapa local
  let map = {}
  try { map = JSON.parse(await readFile(MAP_OUTPUT, 'utf-8')) } catch {}
  for (const f of modified) delete map[f]

  // 3. Re-upload
  console.log('\n🚀 Fazendo re-upload...\n')
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
      console.error(`  ❌`, r.reason?.message || r.reason)
    }
  }

  await writeFile(MAP_OUTPUT, JSON.stringify(map, null, 2), 'utf-8')

  console.log('\n' + '─'.repeat(50))
  console.log(`✅ ${ok} imagem(ns) substituída(s) com sucesso`)
  if (fail > 0) console.log(`❌ ${fail} com erro`)
  console.log('─'.repeat(50) + '\n')
}

main().catch(err => { console.error('\n❌ Erro fatal:', err); process.exit(1) })
