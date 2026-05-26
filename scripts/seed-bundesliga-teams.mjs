/**
 * Script: seed-bundesliga-teams.mjs
 * 1. Faz upload das logos dos times da Bundesliga para o Cloudinary.
 * 2. Upserta os times na tabela `teams` do Supabase com logo_url.
 *
 * Como rodar:
 *   node scripts/seed-bundesliga-teams.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL      = 'https://jynsexowmcznrapapkwc.supabase.co'
const SERVICE_ROLE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bnNleG93bWN6bnJhcGFwa3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNDAzNiwiZXhwIjoyMDk0ODEwMDM2fQ.0sWt0vuiU4aUjw7Mz1HbUZMmmFnIdM8GDBvLfYfMhkQ'

const CLOUD_NAME    = 'drdxlvlk4'
const UPLOAD_PRESET = 'storefanatic'
const LOGOS_DIR     = join(__dirname, '..', 'public', 'logostimesbundesliga')
const LEAGUE_ID     = 'bundesliga'

// ── Mapeamento: arquivo de logo → dados do time ────────────────────────────────
const TEAMS = [
  {
    id:       'bayern-munique',
    name:     'Bayern de Munique',
    logoFile: 'Bayern-Munchen-munique-logo-escudo.png',
  },
  {
    id:       'borussia-dortmund',
    name:     'Borussia Dortmund',
    logoFile: 'bvb-borussia-dortmund-logo-1.png',
  },
  {
    id:       'borussia-mgladbach',
    name:     "Borussia M'Gladbach",
    logoFile: 'Borussia_Mönchengladbach_logo.svg.png',
  },
  {
    id:       'eintracht-frankfurt',
    name:     'Eintracht Frankfurt',
    logoFile: 'eintracht-frankfurt-logo.png',
  },
  {
    id:       'hertha-berlin',
    name:     'Hertha Berlin',
    logoFile: 'Hertha_BSC_Logo.svg.png',
  },
  {
    id:       'hoffenheim',
    name:     'Hoffenheim',
    logoFile: 'Logo_TSG_Hoffenheim.svg.png',
  },
  {
    id:       'mainz',
    name:     'Mainz 05',
    logoFile: 'FSV_Mainz_05_Logo.png',
  },
  {
    id:       'rb-leipzig',
    name:     'RB Leipzig',
    logoFile: 'RB_Leipzig_2020_Logo.png',
  },
  {
    id:       'schalke',
    name:     'Schalke 04',
    logoFile: 'FC_Schalke_04_Logo.png',
  },
  {
    id:       'union-berlin',
    name:     'Union Berlin',
    logoFile: 'Escudo_Union_Berlin.png',
  },
  {
    id:       'wolfsburg',
    name:     'Wolfsburg',
    logoFile: 'Logo-VfL-Wolfsburg.svg.png',
  },
]

async function uploadToCloudinary(filePath, publicId) {
  const buffer = readFileSync(filePath)
  const blob = new Blob([buffer])

  const form = new FormData()
  form.append('file', blob, publicId)
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

  return (await res.json()).secure_url
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  console.log(`🚀 Processando ${TEAMS.length} times da Bundesliga...\n`)

  const teamsToUpsert = []
  let uploadOk = 0, uploadFail = 0

  for (const team of TEAMS) {
    const filePath = join(LOGOS_DIR, team.logoFile)
    const publicId = `teams/bundesliga/${team.id}`

    process.stdout.write(`  ⬆️  ${team.name.padEnd(25)} `)

    let logoUrl = ''
    try {
      logoUrl = await uploadToCloudinary(filePath, publicId)
      process.stdout.write(`✅\n`)
      uploadOk++
    } catch (err) {
      process.stdout.write(`❌ ${err.message}\n`)
      uploadFail++
    }

    teamsToUpsert.push({
      id:        team.id,
      league_id: LEAGUE_ID,
      name:      team.name,
      logo_url:  logoUrl,
    })
  }

  console.log(`\n📦 Upserting ${teamsToUpsert.length} times no Supabase...`)

  const { error } = await supabase
    .from('teams')
    .upsert(teamsToUpsert, { onConflict: 'id' })

  if (error) {
    console.error(`❌ Erro ao inserir times: ${error.message}`)
    process.exit(1)
  }

  console.log('\n' + '─'.repeat(50))
  console.log(`🎉 Concluído!`)
  console.log(`   ✅ ${uploadOk} logos enviadas ao Cloudinary`)
  if (uploadFail > 0) console.log(`   ❌ ${uploadFail} logos com erro`)
  console.log(`   ✅ ${teamsToUpsert.length} times no banco (${LEAGUE_ID})`)
  console.log('─'.repeat(50) + '\n')
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err)
  process.exit(1)
})
