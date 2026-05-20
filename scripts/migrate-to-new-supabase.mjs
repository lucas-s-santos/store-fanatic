/**
 * Script: migrate-to-new-supabase.mjs
 * Copia todos os dados do Supabase ANTIGO para o NOVO.
 * Também atualiza image_url dos produtos para URLs do Cloudinary (se cloudinary-map.json existir).
 *
 * Como rodar:
 *   1. Preencha OLD_URL / OLD_SERVICE_KEY com o projeto atual
 *   2. Preencha NEW_URL / NEW_SERVICE_KEY com o novo projeto
 *   3. node scripts/migrate-to-new-supabase.mjs
 *
 * Pré-requisito: npm install @supabase/supabase-js (já instalado)
 */

import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── ANTIGO ────────────────────────────────────────────────────────────────────
const OLD_URL         = 'https://cuysmgukyikxdwsladeo.supabase.co'
const OLD_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1eXNtZ3VreWlreGR3c2xhZGVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgyNTk4MCwiZXhwIjoyMDkxNDAxOTgwfQ.ZkwhB2yN7KdyVWxijCEl4vVGzdsqdMWHN3RPgdlAZVU'

// ── NOVO ──────────────────────────────────────────────────────────────────────
const NEW_URL         = 'https://jynsexowmcznrapapkwc.supabase.co'
const NEW_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bnNleG93bWN6bnJhcGFwa3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNDAzNiwiZXhwIjoyMDk0ODEwMDM2fQ.0sWt0vuiU4aUjw7Mz1HbUZMmmFnIdM8GDBvLfYfMhkQ'
// ─────────────────────────────────────────────────────────────────────────────

// Tabelas a migrar, na ordem correta (respeita foreign keys)
const TABLES = [
  'leagues',
  'teams',
  'products',
  'profiles',
  'coupons',
  'site_settings',
  'testimonials',
  'site_stats',
  'orders',
  'order_items',
  'order_feedback',
]

async function fetchAll(client, table) {
  let all = []
  let offset = 0
  const limit = 1000
  while (true) {
    const { data, error } = await client.from(table).select('*').range(offset, offset + limit - 1)
    if (error) {
      console.error(`  ⚠️  Erro ao ler ${table}:`, error.message)
      break
    }
    if (!data || data.length === 0) break
    all = [...all, ...data]
    if (data.length < limit) break
    offset += limit
  }
  return all
}

async function insertBatch(client, table, rows) {
  const BATCH = 500
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await client.from(table).upsert(batch, { onConflict: 'id' })
    if (error) {
      console.error(`  ❌ Erro ao inserir em ${table}:`, error.message)
      return inserted
    }
    inserted += batch.length
  }
  return inserted
}

async function main() {
  if (NEW_URL === 'COLE_AQUI_A_URL_DO_NOVO_PROJETO') {
    console.error('❌ Preencha NEW_URL e NEW_SERVICE_KEY no topo do script antes de rodar!')
    process.exit(1)
  }

  const oldClient = createClient(OLD_URL, OLD_SERVICE_KEY)
  const newClient = createClient(NEW_URL, NEW_SERVICE_KEY)

  // Carrega mapa Cloudinary (opcional)
  let cloudinaryMap = {}
  try {
    const raw = await readFile(join(__dirname, '..', 'cloudinary-map.json'), 'utf-8')
    cloudinaryMap = JSON.parse(raw)
    const count = Object.keys(cloudinaryMap).length
    if (count > 0) console.log(`🖼️  Mapa Cloudinary: ${count} URLs — image_url será atualizado\n`)
  } catch {
    console.log('ℹ️  cloudinary-map.json não encontrado — image_url não será alterado\n')
  }

  // Inverte o mapa: supabase_url → cloudinary_url
  // As imagens estão em: /jersey/brasileirao/{Time}/{Time}-N.jpeg
  // E o map tem chaves com caminho local → cloudinary URL
  // Vamos criar mapeamento pelo public_id (nome do arquivo sem extensão)
  const filenameToCloudinary = {}
  for (const [localPath, cdnUrl] of Object.entries(cloudinaryMap)) {
    // extrai ex: "Flamengo/Flamengo-1" do path local
    const match = localPath.replace(/\\/g, '/').match(/CAMISAS BRASILEIRÃO\/(.+)\.[^.]+$/)
    if (match) {
      filenameToCloudinary[match[1].replace(/\s+/g, '-')] = cdnUrl
    }
  }

  let totalMigrated = 0

  for (const table of TABLES) {
    process.stdout.write(`📦 Migrando ${table}... `)

    const rows = await fetchAll(oldClient, table)
    if (rows.length === 0) {
      console.log('0 linhas (vazio)')
      continue
    }

    // Para products: tenta atualizar image_url para Cloudinary
    let processedRows = rows
    if (table === 'products' && Object.keys(filenameToCloudinary).length > 0) {
      processedRows = rows.map(row => {
        if (!row.image_url) return row
        // extrai o sufixo da URL do Supabase storage, ex: jersey/brasileirao/Flamengo/Flamengo-1.jpeg
        const match = row.image_url.match(/jersey\/brasileirao\/([^?]+)/)
        if (!match) return row
        const key = match[1].replace(/\.[^.]+$/, '') // remove extensão
        const cdnUrl = filenameToCloudinary[key]
        return cdnUrl ? { ...row, image_url: cdnUrl } : row
      })
    }

    const inserted = await insertBatch(newClient, table, processedRows)
    console.log(`${inserted}/${rows.length} inseridos`)
    totalMigrated += inserted
  }

  console.log('\n' + '─'.repeat(50))
  console.log(`✅ Migração concluída! ${totalMigrated} registros movidos.`)
  console.log('\nPróximo passo: atualize o .env com as credenciais do novo projeto.')
  console.log('─'.repeat(50) + '\n')
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err)
  process.exit(1)
})
