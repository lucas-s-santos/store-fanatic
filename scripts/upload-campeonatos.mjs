/**
 * Script: upload-campeonatos.mjs
 * Faz upload das logos dos campeonatos para o Cloudinary na pasta "campeonatos".
 *
 * Como rodar:
 *   node scripts/upload-campeonatos.mjs
 */

import { readdir, readFile } from 'fs/promises'
import { join, basename, extname } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const CLOUD_NAME    = 'drdxlvlk4'
const UPLOAD_PRESET = 'storefanatic'
const BASE_FOLDER   = 'campeonatos'
const IMAGES_ROOT   = join(__dirname, '..', 'public', 'campeonatos')

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

async function main() {
  const entries = await readdir(IMAGES_ROOT, { withFileTypes: true })
  const images = entries
    .filter(e => e.isFile() && /\.(jpe?g|png|webp|gif)$/i.test(e.name))
    .map(e => join(IMAGES_ROOT, e.name))

  console.log(`Encontradas ${images.length} imagens em public/campeonatos/\n`)

  for (const filePath of images) {
    const name = basename(filePath, extname(filePath))
      .toLowerCase()
      .replace(/\s+/g, '-')
    const publicId = `${BASE_FOLDER}/${name}`

    process.stdout.write(`  Enviando: ${basename(filePath)} ...`)
    try {
      const url = await uploadToCloudinary(filePath, publicId)
      console.log(` OK\n    → ${url}`)
    } catch (err) {
      console.log(` ERRO: ${err.message}`)
    }
  }

  console.log('\nUpload concluído!')
}

main().catch(err => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
