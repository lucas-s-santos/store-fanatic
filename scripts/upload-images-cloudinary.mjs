/**
 * Script: upload-images-cloudinary.mjs
 * Faz upload de todas as imagens locais do Brasileirão para o Cloudinary.
 * Salva um mapeamento de caminho → URL em cloudinary-map.json.
 *
 * Como rodar:
 *   node scripts/upload-images-cloudinary.mjs
 *
 * Requisitos:
 *   Node 18+ (fetch nativo)
 *   Preencher CLOUD_NAME e UPLOAD_PRESET abaixo.
 */

import { readdir, readFile, writeFile } from 'fs/promises'
import { join, basename } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
// FormData e Blob são globais no Node 18+

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Configuração ──────────────────────────────────────────────────────────────
const CLOUD_NAME     = 'drdxlvlk4'
const UPLOAD_PRESET  = 'storefanatic'   // nome do preset sem assinatura
const BASE_FOLDER    = 'brasileirao'           // pasta raiz no Cloudinary
const IMAGES_ROOT    = join(__dirname, '..', 'public', 'camisasBrasileirao', 'CAMISAS BRASILEIRÃO')
const MAP_OUTPUT     = join(__dirname, '..', 'cloudinary-map.json')
const CONCURRENT     = 4                       // uploads em paralelo
// ─────────────────────────────────────────────────────────────────────────────

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

function buildPublicId(filePath) {
  // ex: .../CAMISAS BRASILEIRÃO/Flamengo/Flamengo-1.jpeg
  //  → brasileirao/Flamengo/Flamengo-1
  const relative = filePath.replace(IMAGES_ROOT, '').replace(/\\/g, '/')
  const withoutExt = relative.replace(/\.[^/.]+$/, '')
  const clean = withoutExt.replace(/^\//, '').replace(/\s+/g, '-')
  return `${BASE_FOLDER}/${clean}`
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

async function main() {
  console.log('🔍 Listando imagens...')
  const allFiles = await listImages(IMAGES_ROOT)
  console.log(`  ${allFiles.length} imagens encontradas\n`)

  // Carrega mapa existente (para retomar de onde parou)
  let existingMap = {}
  try {
    const raw = await readFile(MAP_OUTPUT, 'utf-8')
    existingMap = JSON.parse(raw)
    console.log(`  📂 ${Object.keys(existingMap).length} já no mapa — pulando esses\n`)
  } catch {
    // mapa não existe ainda
  }

  const toUpload = allFiles.filter(f => !existingMap[f])
  console.log(`🚀 Fazendo upload de ${toUpload.length} imagens (${CONCURRENT} por vez)...\n`)

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
      console.error(`  ❌ Erro:`, r.reason?.message || r.reason)
    }
  }

  await writeFile(MAP_OUTPUT, JSON.stringify(map, null, 2), 'utf-8')

  console.log('\n' + '─'.repeat(50))
  console.log(`✅ ${ok} imagens enviadas com sucesso`)
  if (fail > 0) console.log(`❌ ${fail} com erro (rode novamente para tentar de novo)`)
  console.log(`📄 Mapa salvo em: cloudinary-map.json`)
  console.log('─'.repeat(50) + '\n')
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err)
  process.exit(1)
})
