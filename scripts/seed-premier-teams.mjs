/**
 * Script: seed-premier-teams.mjs
 * 1. Faz upload das logos dos times da Premier League para o Cloudinary.
 * 2. Upserta os times na tabela `teams` do Supabase com logo_url.
 *
 * Como rodar:
 *   node scripts/seed-premier-teams.mjs
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
const LOGOS_DIR        = join(__dirname, '..', 'public', 'logotimespremier')
const LEAGUE_ID        = 'premier-league'

const TEAMS = [
  { id: 'arsenal',            name: 'Arsenal',            logoFile: 'Arsenal_FC.svg.png' },
  { id: 'aston-villa',        name: 'Aston Villa',        logoFile: 'Aston_Villa.svg.png' },
  { id: 'brighton',           name: 'Brighton',           logoFile: 'Brighton_&_Hove_Albion.png' },
  { id: 'chelsea',            name: 'Chelsea',            logoFile: 'Chelsea_FC.svg.png' },
  { id: 'crystal-palace',     name: 'Crystal Palace',     logoFile: 'Crystal_Palace_FC_logo.png' },
  { id: 'everton',            name: 'Everton',            logoFile: 'Everton_FC_logo_2014.png' },
  { id: 'fulham',             name: 'Fulham',             logoFile: 'Fulham_FC.svg.png' },
  { id: 'leeds-united',       name: 'Leeds United',       logoFile: 'Leeds_United_Logo.png' },
  { id: 'leicester-city',     name: 'Leicester City',     logoFile: 'LeicesterCity_logo2014.png' },
  { id: 'liverpool',          name: 'Liverpool',          logoFile: 'Liverpool_FC.svg.png' },
  { id: 'manchester-city',    name: 'Manchester City',    logoFile: 'Manchester_City_Football_Club.png' },
  { id: 'manchester-united',  name: 'Manchester United',  logoFile: 'Manchester_United_FC_logo.png' },
  { id: 'newcastle',          name: 'Newcastle',          logoFile: 'Newcastle_United_Logo.png' },
  { id: 'nottingham-forest',  name: 'Nottingham Forest',  logoFile: 'Nottingham_Forest.png' },
  { id: 'sheffield-united',   name: 'Sheffield United',   logoFile: 'Sheffield_United_FC.png' },
  { id: 'tottenham',          name: 'Tottenham',          logoFile: 'Tottenham_Hotspur.png' },
  { id: 'west-ham',           name: 'West Ham',           logoFile: 'West_Ham_United_FC_logo.png' },
  { id: 'wolverhampton',      name: 'Wolverhampton',      logoFile: 'Wolverhampton_Wanderers.png' },
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
  console.log(`🚀 Processando ${TEAMS.length} times da Premier League...\n`)

  const teamsToUpsert = []
  let uploadOk = 0, uploadFail = 0

  for (const team of TEAMS) {
    const filePath = join(LOGOS_DIR, team.logoFile)
    const publicId = `teams/premier-league/${team.id}`
    process.stdout.write(`  ⬆️  ${team.name.padEnd(24)} `)
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
