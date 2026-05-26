/**
 * Script: seed-laliga-teams.mjs
 * 1. Faz upload das logos dos times da La Liga para o Cloudinary.
 * 2. Upserta os times na tabela `teams` do Supabase com logo_url.
 *
 * Como rodar:
 *   node scripts/seed-laliga-teams.mjs
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
const LOGOS_DIR     = join(__dirname, '..', 'public', 'logostimeslaliga')
const LEAGUE_ID     = 'laliga'

const TEAMS = [
  { id: 'athletic-bilbao',  name: 'Athletic Bilbao',    logoFile: 'Athletic_Club_de_Bilbao.png' },
  { id: 'atletico-madrid',  name: 'Atlético de Madrid', logoFile: 'Atletico_Madrid_logo.svg.png' },
  { id: 'barcelona',        name: 'Barcelona',          logoFile: 'FCBarcelona.svg.png' },
  { id: 'celta-vigo',       name: 'Celta de Vigo',      logoFile: 'Celta_de_Vigo.png' },
  { id: 'espanyol',         name: 'Espanyol',           logoFile: 'Rcd_espanyol_logo.png' },
  { id: 'rayo-vallecano',   name: 'Rayo Vallecano',     logoFile: 'Rayo_Vallecano_de_Madrid.png' },
  { id: 'real-betis',       name: 'Real Betis',         logoFile: 'Real_Betis_Balompié.png' },
  { id: 'real-madrid',      name: 'Real Madrid',        logoFile: 'Real_Madrid.png' },
  { id: 'real-valladolid',  name: 'Real Valladolid',    logoFile: 'Real_Valladolid_CF.png' },
  { id: 'sevilla',          name: 'Sevilla',            logoFile: 'Sevilla_cf.png' },
  { id: 'villarreal',       name: 'Villarreal',         logoFile: 'Villarreal_CF_logo.svg.png' },
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
  console.log(`🚀 Processando ${TEAMS.length} times da La Liga...\n`)

  const teamsToUpsert = []
  let uploadOk = 0, uploadFail = 0

  for (const team of TEAMS) {
    const filePath = join(LOGOS_DIR, team.logoFile)
    const publicId = `teams/laliga/${team.id}`
    process.stdout.write(`  ⬆️  ${team.name.padEnd(22)} `)
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
