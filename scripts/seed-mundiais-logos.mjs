/**
 * Script: seed-mundiais-logos.mjs
 * 1. Faz upload das logos das seleções para o Cloudinary.
 * 2. Upserta os times na tabela `teams` com logo_url.
 *
 * Como rodar:
 *   node scripts/seed-mundiais-logos.mjs
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
const LOGOS_DIR        = join(__dirname, '..', 'public', 'logostimesmundiais')
const LEAGUE_ID        = 'selecoes'

const TEAMS = [
  { id: 'argentina',      name: 'Argentina',       logoFile: '230px-Afa_logo.svg.png' },
  { id: 'alemanha',       name: 'Alemanha',         logoFile: 'alemanha.png' },
  { id: 'algeria',        name: 'Algeria',          logoFile: 'Algeria_National_Football_Team_logo.png' },
  { id: 'qatar',          name: 'Qatar',            logoFile: 'Associação_do_Qatar_de_Futebol.png' },
  { id: 'uruguai',        name: 'Uruguai',          logoFile: 'AUF.png' },
  { id: 'belgica',        name: 'Belgica',          logoFile: 'belgian-national-team-logo-2.png' },
  { id: 'brasil',         name: 'Brasil',           logoFile: 'Brazilian_Football_Confederation_logo.svg' },
  { id: 'camaroes',       name: 'Camarões',         logoFile: 'Cameroon_2010crest.png' },
  { id: 'costa-do-marfim',name: 'Costa Do Marfim',  logoFile: 'costa do marfim.png' },
  { id: 'costa-rica',     name: 'Costa Rica',       logoFile: 'Costa_Rica_national_football_team_logo.svg.png' },
  { id: 'croacia',        name: 'Croácia',          logoFile: 'Croatia_football_federation.png' },
  { id: 'dinamarca',      name: 'Dinamarca',        logoFile: 'Dansk_boldspil_union_logo.svg.png' },
  { id: 'egito',          name: 'Egito',            logoFile: 'Egyptian_Football_Association.png' },
  { id: 'inglaterra',     name: 'Inglaterra',       logoFile: 'england-national-team-logo-0-2048x2048.png' },
  { id: 'irlanda',        name: 'Irlanda',          logoFile: 'FAIreland.png' },
  { id: 'gales',          name: 'Gales',            logoFile: 'FAWales.png' },
  { id: 'canada',         name: 'Canadá',           logoFile: 'Flag_of_Canada.png' },
  { id: 'chile',          name: 'Chile',            logoFile: 'Flag_of_Chile.png' },
  { id: 'arabia-saudita', name: 'Arábia Saudita',   logoFile: 'Flag_of_Saudi_Arabia.png' },
  { id: 'coreia-do-sul',  name: 'Coreia do Sul',    logoFile: 'Flag_of_South_Korea.svg' },
  { id: 'china',          name: 'China',            logoFile: "Flag_of_the_People's_Republic_of_China.svg.png" },
  { id: 'romenia',        name: 'Romênia',          logoFile: 'FRomânăF.png' },
  { id: 'senegal',        name: 'Senegal',          logoFile: 'FSenegalaiseF.png' },
  { id: 'marrocos',       name: 'Marrocos',         logoFile: 'Fédération_Royale_Marocaine_de_Football.png' },
  { id: 'grecia',         name: 'Grécia',           logoFile: 'Greece_National_Football_Team.svg.png' },
  { id: 'jamaica',        name: 'Jamaica',          logoFile: 'Jamaica_FA.svg.png' },
  { id: 'japao',          name: 'Japão',            logoFile: 'JapanFA.png' },
  { id: 'equador',        name: 'Equador',          logoFile: 'Logo_de_la_Federación_Ecuatoriana_de_Fútbol_(2).svg.png' },
  { id: 'italia',         name: 'Itália',           logoFile: 'Logo_Italy_National_Football_Team_-_2023.svg.png' },
  { id: 'franca',         name: 'França',           logoFile: 'Logo_Seleção_Francesa_2018.png' },
  { id: 'mexico',         name: 'México',           logoFile: 'Mexico_national_football_team_crest_(2022).png' },
  { id: 'holanda',        name: 'Holanda',          logoFile: 'Netherlands_national_football_team_logo_2017.png' },
  { id: 'nigeria',        name: 'Nigéria',          logoFile: 'NigeriaFA.png' },
  { id: 'polonia',        name: 'Polônia',          logoFile: 'Polish_Football_Association_logo.svg.png' },
  { id: 'portugal',       name: 'Portugal',         logoFile: 'Portugal_National_Team_logo.png' },
  { id: 'turquia',        name: 'Turquia',          logoFile: 'Roundel_flag_of_Turkey.svg' },
  { id: 'peru',           name: 'Peru',             logoFile: 'selecao-peruana-de-futebol.png' },
  { id: 'escocia',        name: 'Escócia',          logoFile: 'Seleção_Escocesa_logo.png' },
  { id: 'noruega',        name: 'Noruega',          logoFile: 'Seleção_Norueguesa_de_Futebol_Logo.png' },
  { id: 'suica',          name: 'Suiça',            logoFile: 'SFV_Logo.svg.png' },
  { id: 'espanha',        name: 'Espanha',          logoFile: 'Spain_National_Football_Team_badge.png' },
  { id: 'estados-unidos', name: 'Estados Unidos',   logoFile: 'United_States_Soccer_Federation_logo.svg.png' },
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
  console.log(`🚀 Processando ${TEAMS.length} seleções mundiais...\n`)

  const teamsToUpsert = []
  let uploadOk = 0, uploadFail = 0

  for (const team of TEAMS) {
    const filePath = join(LOGOS_DIR, team.logoFile)
    const publicId = `teams/selecoes/${team.id}`
    process.stdout.write(`  ⬆️  ${team.name.padEnd(20)} `)
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

  console.log(`\n📦 Upserting ${teamsToUpsert.length} seleções no Supabase...`)
  const { error } = await supabase.from('teams').upsert(teamsToUpsert, { onConflict: 'id' })
  if (error) { console.error(`❌ Erro: ${error.message}`); process.exit(1) }

  console.log('\n' + '─'.repeat(50))
  console.log(`🎉 Concluído!`)
  console.log(`   ✅ ${uploadOk} logos enviadas ao Cloudinary`)
  if (uploadFail > 0) console.log(`   ❌ ${uploadFail} logos com erro`)
  console.log(`   ✅ ${teamsToUpsert.length} seleções no banco (${LEAGUE_ID})`)
  console.log('─'.repeat(50) + '\n')
}

main().catch(err => { console.error('\n❌ Erro fatal:', err); process.exit(1) })
