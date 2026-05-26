/**
 * Script: clean-storage-mundial.mjs
 * Deleta recursivamente todos os arquivos do bucket jersey-images
 * que NÃO estão na pasta brasileirao — ou seja, imagens de times mundiais.
 *
 * Como rodar:
 *   node scripts/clean-storage-mundial.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cuysmgukyikxdwsladeo.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1eXNtZ3VreWlreGR3c2xhZGVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgyNTk4MCwiZXhwIjoyMDkxNDAxOTgwfQ.ZkwhB2yN7KdyVWxijCEl4vVGzdsqdMWHN3RPgdlAZVU'
const BUCKET = 'jersey-images'

// Pastas dentro de "jersey/" que devem ser MANTIDAS
const KEEP_FOLDERS = ['brasileirao']

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// Lista todos os arquivos de um caminho recursivamente
async function listAllFiles(prefix) {
  const files = []
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000 })
  if (error) { console.error(`Erro listando ${prefix}:`, error.message); return files }
  if (!data) return files

  for (const item of data) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name
    if (item.id === null) {
      // É uma "pasta" (objeto sem id) — recursão
      const nested = await listAllFiles(fullPath)
      files.push(...nested)
    } else {
      files.push(fullPath)
    }
  }
  return files
}

// Deleta em lotes de 100
async function deleteInBatches(paths) {
  const BATCH = 100
  let total = 0
  for (let i = 0; i < paths.length; i += BATCH) {
    const batch = paths.slice(i, i + BATCH)
    const { error } = await supabase.storage.from(BUCKET).remove(batch)
    if (error) {
      console.error('Erro ao deletar lote:', error.message)
    } else {
      total += batch.length
      console.log(`  ✓ ${total}/${paths.length} arquivos deletados...`)
    }
  }
  return total
}

async function main() {
  console.log('=== Limpeza de Storage — Times Mundiais ===\n')

  // 1. Lista o que existe em jersey/
  console.log('Listando pastas em jersey/...')
  const { data: jerseyFolders, error } = await supabase.storage.from(BUCKET).list('jersey', { limit: 200 })
  if (error) { console.error('Erro:', error.message); process.exit(1) }

  const toDelete = jerseyFolders.filter(f => !KEEP_FOLDERS.includes(f.name))
  const toKeep   = jerseyFolders.filter(f =>  KEEP_FOLDERS.includes(f.name))

  console.log(`Manter: ${toKeep.map(f => f.name).join(', ')}`)
  console.log(`Deletar: ${toDelete.map(f => f.name).join(', ')}\n`)

  if (toDelete.length === 0) {
    console.log('Nada para deletar em jersey/.')
  } else {
    for (const folder of toDelete) {
      const prefix = `jersey/${folder.name}`
      console.log(`Listando arquivos em ${prefix}/...`)
      const files = await listAllFiles(prefix)
      console.log(`  ${files.length} arquivos encontrados`)
      if (files.length > 0) await deleteInBatches(files)
    }
  }

  // 2. Limpa league-logos/ inteira (logos de ligas mundiais)
  console.log('\nListando arquivos em league-logos/...')
  const logoFiles = await listAllFiles('league-logos')
  console.log(`  ${logoFiles.length} arquivos encontrados`)
  if (logoFiles.length > 0) await deleteInBatches(logoFiles)

  console.log('\n=== Concluído! ===')
  console.log('Agora verifique o Storage no painel do Supabase.')
}

main().catch(console.error)
