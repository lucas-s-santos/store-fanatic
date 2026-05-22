/**
 * Seed: Grêmio, Vasco da Gama e Clube do Remo
 * Faz upload das imagens para Cloudinary e cria os produtos no Supabase.
 * Uso: node scripts/seed-missing-teams.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL         = 'https://jynsexowmcznrapapkwc.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bnNleG93bWN6bnJhcGFwa3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNDAzNiwiZXhwIjoyMDk0ODEwMDM2fQ.0sWt0vuiU4aUjw7Mz1HbUZMmmFnIdM8GDBvLfYfMhkQ'
const CLOUDINARY_CLOUD_NAME    = 'drdxlvlk4'
const CLOUDINARY_UPLOAD_PRESET = 'storefanatic'

const DEFAULT_PRICE = 89.90
const DEFAULT_SIZES = ['P', 'M', 'G', 'GG', 'XGG']

const BASE_DIR = resolve(__dirname, '..', 'public', 'camisasBrasileirao', 'CAMISAS BRASILEIRÃO')

// Times a processar: pasta local → team.id no Supabase
const TARGETS = [
  { folder: 'Gremio',        teamId: '0eb3ce44-ddf3-46b5-a452-51efacfc1cfb', teamName: 'Grêmio',        slugBase: 'gremio' },
  { folder: 'Vasco',         teamId: '8ce84a50-90bc-44c3-b3c4-12718372e389', teamName: 'Vasco da Gama', slugBase: 'vasco-da-gama' },
  { folder: 'Remo',          teamId: 'c0d4fae7-d5f2-41d7-81d1-22386d0e044a', teamName: 'Clube do Remo', slugBase: 'clube-do-remo' },
]

function extractNumber(filename) {
  const m = filename.match(/-(\d+)\./i)
  return m ? parseInt(m[1], 10) : 0
}

async function uploadToCloudinary(filePath, publicId) {
  const buffer = readFileSync(filePath)
  const blob = new Blob([buffer])
  const form = new FormData()
  form.append('file', blob, publicId)
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  form.append('folder', 'brasileirao')
  form.append('public_id', publicId)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: form }
  )
  if (!res.ok) throw new Error(`Cloudinary ${res.status}: ${await res.text()}`)
  return (await res.json()).secure_url
}

async function main() {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  for (const { folder, teamId, teamName, slugBase } of TARGETS) {
    const folderPath = join(BASE_DIR, folder)
    const files = readdirSync(folderPath)
      .filter(f => /\.(jpe?g|png|webp)$/i.test(f))
      .sort((a, b) => extractNumber(a) - extractNumber(b))

    console.log(`\n⚽ ${teamName} — ${files.length} imagens`)

    const products = []

    for (const file of files) {
      const num = extractNumber(file)
      const publicId = `${slugBase}-${num}`
      const filePath = join(folderPath, file)

      process.stdout.write(`  Upload ${file.padEnd(30)} `)
      let imageUrl = ''
      try {
        imageUrl = await uploadToCloudinary(filePath, publicId)
        process.stdout.write('OK\n')
      } catch (err) {
        process.stdout.write(`ERRO: ${err.message}\n`)
        continue
      }

      products.push({
        id: randomUUID(),
        slug: `${slugBase}-${num}`,
        name: `${teamName} ${num}`,
        title: `Camisa ${teamName}`,
        description: `Camisa oficial ${teamName} — Brasileirão`,
        price: DEFAULT_PRICE,
        category: 'camisas',
        league: 'brasileirao',
        team: teamId,
        image_url: imageUrl,
        images: [imageUrl],
        sizes: DEFAULT_SIZES,
        active: true,
        type: 'torcedor',
        stock_quantity: 10,
        order_priority: 0,
      })
    }

    if (products.length === 0) {
      console.log(`  Nenhum produto para inserir.`)
      continue
    }

    const { error } = await sb.from('products').upsert(products, { onConflict: 'slug' })
    if (error) {
      console.error(`  ❌ Erro ao inserir produtos: ${error.message}`)
    } else {
      console.log(`  ✅ ${products.length} produtos inseridos`)
    }
  }

  console.log('\n✅ Seed concluído!')
}

main().catch(err => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
