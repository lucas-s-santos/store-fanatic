/**
 * Script: seed-ligue1-teams.mjs
 * 1. Faz upload das logos dos times da Ligue 1 para o Cloudinary.
 * 2. Upserta os times na tabela `teams` do Supabase com logo_url.
 *
 * Como rodar:
 *   node scripts/seed-ligue1-teams.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL     = 'https://jynsexowmcznrapapkwc.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bnNleG93bWN6bnJhcGFwa3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNDAzNiwiZXhwIjoyMDk0ODEwMDM2fQ.0sWt0vuiU4aUjw7Mz1HbUZMmmFnIdM8GDBvLfYfMhkQ'
const CLOUD_NAME       = 'drdxlvlk4'
const UPLOAD_PRESET    = 'storefanatic'
const LOGOS_DIR        = join(__dirname, '..', 'public', 'logostimesliga1')
const LEAGUE_ID        = 'ligue-1'

const TEAMS = [
  { id: 'rc-lens',      name: 'Lens',                   logoFile: 'RC_Lens.png' },
  { id: 'lille',        name: 'Lille',                  logoFile: 'lille-logo.png' },
  { id: 'lorient',      name: 'Lorient',                logoFile: 'FC_Lorient.png' },
  { id: 'lyon',         name: 'Lyon',                   logoFile: 'Olympique_lyonnais.png' },
  { id: 'monaco',       name: 'Monaco',                 logoFile: 'monaco-fc-logo-1.png' },
  { id: 'nantes',       name: 'Nantes',                 logoFile: 'FC-Nantes-blason-rvb.png' },
  { id: 'marseille',    name: 'Olympique de Marseille', logoFile: 'Olympique_Marseille_logo.svg.png' },
  { id: 'psg',          name: 'Paris Saint-Germain',    logoFile: 'psg-logo-escudo-paris-saint-germain.png' },
  { id: 'rennes',       name: 'Rennes',                 logoFile: 'Stade_Rennais_FC.png' },
  { id: 'stade-reims',  name: 'Stade de Reims',         logoFile: 'Stade_de_Reims.png' },
  { id: 'strasbourg',   name: 'Strasbourg',             logoFile: 'Strasbourg-logo.png' },
]

async function uploadToCloudinary(filePath, publicId) {
  const buffer = readFileSync(filePath)
  const blob = new Blob([buffer])
  const form = new FormData()
  form.append('file', blob, publicId)
  form.append('upload_preset', UPLOAD_PRESET)
  form.append('public_id', publicId)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  return (await res.json()).secure_url
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  console.log(`🚀 Processando ${TEAMS.length} times da Ligue 1...\n`)

  const teamsToUpsert = []
  let uploadOk = 0, uploadFail = 0

  for (const team of TEAMS) {
    const filePath = join(LOGOS_DIR, team.logoFile)
    const publicId = `teams/ligue1/${team.id}`
    process.stdout.write(`  ⬆️  ${team.name.padEnd(26)} `)
    let logoUrl = ''
    try {
      logoUrl = await uploadToCloudinary(filePath, publicId)
      process.stdout.write(`✅\n`)
      uploadOk++
    } catch (err) {
      process.stdout.write(`❌ ${err.message}\n`)
      uploadFail++
    }
    teamsToUpsert.push({ id: team.id, league_id: LEAGUE_ID, name: team.name, logo_url: logoUrl })
  }

  console.log(`\n📦 Upserting ${teamsToUpsert.length} times no Supabase...`)
  const { error } = await supabase.from('teams').upsert(teamsToUpsert, { onConflict: 'id' })
  if (error) { console.error(`❌ Erro: ${error.message}`); process.exit(1) }

  console.log('\n' + '─'.repeat(50))
  console.log(`🎉 Concluído!`)
  console.log(`   ✅ ${uploadOk} logos enviadas ao Cloudinary`)
  if (uploadFail > 0) console.log(`   ❌ ${uploadFail} logos com erro`)
  console.log(`   ✅ ${teamsToUpsert.length} times no banco (${LEAGUE_ID})`)
  console.log('─'.repeat(50) + '\n')
}

main().catch(err => { console.error('\n❌ Erro fatal:', err); process.exit(1) })
