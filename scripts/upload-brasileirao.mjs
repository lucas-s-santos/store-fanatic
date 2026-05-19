/**
 * Script: upload-brasileirao.mjs
 * Faz upload das imagens do Brasileirão para o Supabase Storage
 * e cria os produtos correspondentes no banco de dados.
 *
 * Como rodar:
 *   node scripts/upload-brasileirao.mjs
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Configuração ───────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://cuysmgukyikxdwsladeo.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1eXNtZ3VreWlreGR3c2xhZGVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgyNTk4MCwiZXhwIjoyMDkxNDAxOTgwfQ.ZkwhB2yN7KdyVWxijCEl4vVGzdsqdMWHN3RPgdlAZVU'
const BUCKET = 'jersey-images'
const BASE_DIR = path.join(__dirname, '..', 'public', 'camisasBrasileirao', 'CAMISAS BRASILEIRÃO')

// Preço padrão — ajuste se quiser
const PRECO_PADRAO = 149.99

// ── Mapeamento: nome da pasta → ID do time no banco ───────────────────────────
const TEAM_MAP = {
  'América Mineiro':      'america-mg',
  'Athletico Paranaense': 'athletico-pr',
  'Atlético Mineiro':     '69c6cbd1-b638-4638-94bf-452f26d77150',
  'Bahia':                'bahia',
  'Botafogo':             'botafogo',
  'Ceará':                'ceara',
  'Corinthians':          'corinthians',
  'Cruzeiro':             'cruzeiro',
  'Flamengo':             'flamengo',
  'Fluminense':           'fluminense',
  'Fortaleza':            'fortaleza',
  'Gremio':               'gremio',
  'Internacional':        'internacional',
  'Palmeiras':            'palmeiras',
  'Paysandu':             'paysandu',
  'RB Bragantino':        'bragantino',
  'Remo':                 'remo',
  'Santa Cruz':           'santa-cruz',
  'Santos':               'santos',
  'São Paulo':            'sao-paulo',
  'Sport':                'sport',
  'Vasco':                'vasco',
  'Vitória':              'vitoria',
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Remove acentos e substitui espaços por hífens para usar no caminho do Storage */
function sanitizeFolder(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-]/g, '')
}

/** Extrai o número do nome do arquivo para ordenação numérica correta */
function extractNumber(filename) {
  const match = filename.match(/-(\d+)\./i)
  return match ? parseInt(match[1], 10) : 0
}

/** Retorna o MIME type baseado na extensão */
function getMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase()
  return { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' }[ext] || 'image/jpeg'
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // 1. Descobrir o ID da liga do Brasileirão
  const { data: leagues, error: leagueErr } = await supabase.from('leagues').select('id, name')
  if (leagueErr) { console.error('Erro ao buscar ligas:', leagueErr.message); process.exit(1) }

  console.log('\nLigas encontradas no banco:')
  leagues.forEach(l => console.log(`  • ${l.id} → ${l.name}`))

  const brasileiraoLeague = leagues.find(l =>
    l.name.toLowerCase().includes('brasil') || l.id.toLowerCase().includes('brasil')
  )
  if (!brasileiraoLeague) {
    console.error('\n❌ Liga do Brasileirão não encontrada. Verifique os nomes acima e ajuste o filtro no script.')
    process.exit(1)
  }
  const leagueId = brasileiraoLeague.id
  console.log(`\n✅ Liga selecionada: "${brasileiraoLeague.name}" (id: ${leagueId})\n`)

  // 2. Listar pastas de times na pasta local
  // Para rodar apenas times específicos, liste-os aqui (deixe [] para processar todos):
  const ONLY_TEAMS = ['Ceará']

  const allFolders = fs.readdirSync(BASE_DIR).filter(name =>
    fs.statSync(path.join(BASE_DIR, name)).isDirectory()
  ).sort()
  const teamFolders = ONLY_TEAMS.length > 0
    ? allFolders.filter(f => ONLY_TEAMS.includes(f))
    : allFolders

  let totalUploaded = 0
  let totalErrors = 0
  let totalProducts = 0

  for (const teamFolder of teamFolders) {
    const teamId = TEAM_MAP[teamFolder]
    if (!teamId) {
      console.warn(`⚠️  Pasta "${teamFolder}" não tem mapeamento — pulando. Adicione ao TEAM_MAP se necessário.`)
      continue
    }

    const teamDir = path.join(BASE_DIR, teamFolder)
    const files = fs.readdirSync(teamDir)
      .filter(f => /\.(jpe?g|png|webp|avif)$/i.test(f))
      .sort((a, b) => extractNumber(a) - extractNumber(b)) // ordem numérica correta

    if (files.length === 0) {
      console.log(`⚠️  ${teamFolder}: nenhuma imagem encontrada — pulando`)
      continue
    }

    const folderInStorage = sanitizeFolder(teamFolder)
    console.log(`\n📁 ${teamFolder} (${files.length} imagens)`)

    const productsToInsert = []

    for (let i = 0; i < files.length; i++) {
      const filename = files[i]
      const sanitizedFilename = sanitizeFolder(filename.replace(/(\.\w+)$/, '')) + filename.match(/(\.\w+)$/)?.[1]
      const storagePath = `jersey/brasileirao/${folderInStorage}/${sanitizedFilename}`
      const localPath = path.join(teamDir, filename)

      // Upload para o Supabase Storage
      const fileBuffer = fs.readFileSync(localPath)
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, fileBuffer, { contentType: getMimeType(filename), upsert: true })

      if (uploadError) {
        console.error(`   ❌ Erro no upload de ${filename}: ${uploadError.message}`)
        totalErrors++
        continue
      }

      totalUploaded++
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`

      productsToInsert.push({
        title:                `Camisa ${teamFolder} - Modelo ${i + 1}`,
        description:          '',
        price:                PRECO_PADRAO,
        stock:                100,
        category:             'camisas',
        league:               leagueId,
        team:                 teamId,
        sizes:                ['P', 'M', 'G', 'GG', 'XG', 'XGG'],
        image_url:            publicUrl,
        featured:             false,
        active:               true,
        type:                 'torcedor',
        personalization_price: 20,
        order_priority:       i + 1,
      })

      process.stdout.write(`   ⬆️  ${i + 1}/${files.length} — ${filename}\r`)
    }

    // Inserir produtos no banco em lote
    if (productsToInsert.length > 0) {
      const { error: insertError } = await supabase.from('products').insert(productsToInsert)
      if (insertError) {
        console.error(`\n   ❌ Erro ao inserir produtos de ${teamFolder}: ${insertError.message}`)
        totalErrors++
      } else {
        totalProducts += productsToInsert.length
        console.log(`\n   ✅ ${productsToInsert.length} produtos criados no banco`)
      }
    }
  }

  console.log('\n' + '─'.repeat(50))
  console.log(`🎉 Concluído!`)
  console.log(`   ✅ ${totalUploaded} imagens enviadas ao Storage`)
  console.log(`   ✅ ${totalProducts} produtos criados no banco`)
  if (totalErrors > 0) console.log(`   ❌ ${totalErrors} erros — verifique o log acima`)
  console.log('─'.repeat(50) + '\n')
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err)
  process.exit(1)
})
