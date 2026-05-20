/**
 * Script: cleanup-other-leagues.mjs
 * Apaga do banco de dados e do Supabase Storage todas as camisetas
 * das ligas que NÃO são Brasileirão e Mundial.
 *
 * Como rodar:
 *   node scripts/cleanup-other-leagues.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://cuysmgukyikxdwsladeo.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1eXNtZ3VreWlreGR3c2xhZGVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgyNTk4MCwiZXhwIjoyMDkxNDAxOTgwfQ.ZkwhB2yN7KdyVWxijCEl4vVGzdsqdMWHN3RPgdlAZVU'
const BUCKET = 'jersey-images'

// Pastas do Storage que serão APAGADAS (dentro de jersey/)
const FOLDERS_TO_DELETE = [
  'Bundesliga',
  'LaLiga',
  'Liga1',
  'Premier-league',
  'Rayo-Vallecano',
  'Serie-A',
]

async function deleteStorageFolder(supabase, folderPath) {
  console.log(`\n  Listando arquivos em: jersey/${folderPath}`)

  // Lista com paginação
  let allFiles = []
  let offset = 0
  const limit = 1000
  while (true) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(`jersey/${folderPath}`, { limit, offset })

    if (error) { console.error(`  ❌ Erro ao listar: ${error.message}`); break }
    if (!data || data.length === 0) break

    // Pode haver subpastas (times) dentro da pasta da liga
    for (const item of data) {
      if (item.id === null) {
        // É uma subpasta — lista os arquivos dentro
        const { data: subFiles, error: subErr } = await supabase.storage
          .from(BUCKET)
          .list(`jersey/${folderPath}/${item.name}`, { limit: 1000 })

        if (subErr) { console.error(`  ❌ Erro ao listar subpasta: ${subErr.message}`); continue }
        if (subFiles) {
          allFiles.push(...subFiles
            .filter(f => f.id !== null)
            .map(f => `jersey/${folderPath}/${item.name}/${f.name}`)
          )
        }
      } else {
        allFiles.push(`jersey/${folderPath}/${item.name}`)
      }
    }

    if (data.length < limit) break
    offset += limit
  }

  if (allFiles.length === 0) {
    console.log(`  ⚠️  Nenhum arquivo encontrado`)
    return 0
  }

  console.log(`  📄 ${allFiles.length} arquivos encontrados — apagando...`)

  // Remove em lotes de 100
  let deleted = 0
  for (let i = 0; i < allFiles.length; i += 100) {
    const batch = allFiles.slice(i, i + 100)
    const { error } = await supabase.storage.from(BUCKET).remove(batch)
    if (error) {
      console.error(`  ❌ Erro ao apagar lote: ${error.message}`)
    } else {
      deleted += batch.length
      process.stdout.write(`  ⬆️  ${deleted}/${allFiles.length} apagados\r`)
    }
  }
  console.log(`  ✅ ${deleted} arquivos apagados`)
  return deleted
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // 1. Buscar IDs das ligas que serão apagadas
  const { data: leagues, error: leagueErr } = await supabase
    .from('leagues')
    .select('id, name')

  if (leagueErr) { console.error('Erro ao buscar ligas:', leagueErr.message); process.exit(1) }

  console.log('\nLigas no banco:')
  leagues.forEach(l => console.log(`  • ${l.id} → ${l.name}`))

  // Ligas a MANTER (brasileirao e mundial)
  const KEEP_KEYWORDS = ['brasil', 'mundial', 'copa do mundo', 'world cup', 'selec']
  const leaguesToDelete = leagues.filter(l =>
    !KEEP_KEYWORDS.some(kw =>
      l.name.toLowerCase().includes(kw) || l.id.toLowerCase().includes(kw)
    )
  )

  if (leaguesToDelete.length === 0) {
    console.log('\n✅ Nenhuma liga para apagar (apenas Brasileirão e Mundial encontrados)')
    return
  }

  console.log('\nLigas que serão APAGADAS:')
  leaguesToDelete.forEach(l => console.log(`  ✗ ${l.id} → ${l.name}`))
  console.log('\nLigas que serão MANTIDAS:')
  leagues.filter(l => !leaguesToDelete.includes(l)).forEach(l => console.log(`  ✓ ${l.id} → ${l.name}`))

  const leagueIdsToDelete = leaguesToDelete.map(l => l.id)

  // 2. Contar produtos que serão apagados
  const { count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .in('league', leagueIdsToDelete)

  console.log(`\n📦 Produtos a apagar do banco: ${count}`)

  // 3. Apagar produtos do banco
  console.log('\n🗑️  Apagando produtos do banco...')
  const { error: deleteErr } = await supabase
    .from('products')
    .delete()
    .in('league', leagueIdsToDelete)

  if (deleteErr) {
    console.error('❌ Erro ao apagar produtos:', deleteErr.message)
    process.exit(1)
  }
  console.log(`✅ ${count} produtos apagados do banco`)

  // 4. Apagar arquivos do Storage
  console.log('\n🗑️  Apagando arquivos do Storage...')
  let totalDeleted = 0
  for (const folder of FOLDERS_TO_DELETE) {
    totalDeleted += await deleteStorageFolder(supabase, folder)
  }

  // 5. (Opcional) Apagar as ligas do banco também
  console.log('\n🗑️  Apagando ligas do banco...')
  const { error: leagueDeleteErr } = await supabase
    .from('leagues')
    .delete()
    .in('id', leagueIdsToDelete)

  if (leagueDeleteErr) {
    console.error('❌ Erro ao apagar ligas:', leagueDeleteErr.message)
  } else {
    console.log(`✅ ${leaguesToDelete.length} ligas apagadas do banco`)
  }

  console.log('\n' + '─'.repeat(50))
  console.log('🎉 Limpeza concluída!')
  console.log(`   ✅ ${count} produtos removidos do banco`)
  console.log(`   ✅ ${totalDeleted} arquivos removidos do Storage`)
  console.log(`   ✅ ${leaguesToDelete.length} ligas removidas do banco`)
  console.log('─'.repeat(50) + '\n')
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err)
  process.exit(1)
})
