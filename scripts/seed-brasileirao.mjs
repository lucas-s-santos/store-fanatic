/**
 * Seed script: cria a liga "Brasileirão" e insere os times com upload para Cloudinary.
 * Uso: node scripts/seed-brasileirao.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://jynsexowmcznrapapkwc.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bnNleG93bWN6bnJhcGFwa3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNDAzNiwiZXhwIjoyMDk0ODEwMDM2fQ.0sWt0vuiU4aUjw7Mz1HbUZMmmFnIdM8GDBvLfYfMhkQ'
const CLOUDINARY_CLOUD_NAME = 'drdxlvlk4'
const CLOUDINARY_UPLOAD_PRESET = 'storefanatic'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Mapeamento: arquivo → nome do time
const TIMES = [
  { file: 'Athletico_Paranaense.png',                    nome: 'Athletico Paranaense' },
  { file: 'Atletico_mineiro_galo.png',                   nome: 'Atlético Mineiro' },
  { file: 'Brasao_do_Sao_Paulo_Futebol_Clube.svg.png',   nome: 'São Paulo' },
  { file: 'Ceará_Sporting_Club_logo.svg.png',            nome: 'Ceará' },
  { file: 'Clube_do_Remo.svg.png',                       nome: 'Clube do Remo' },
  { file: 'Corinthians_simbolo.png',                     nome: 'Corinthians' },
  { file: 'Cruzeiro_Esporte_Clube_(logo).svg.png',       nome: 'Cruzeiro' },
  { file: 'EscudoDoVascoDaGama.svg.png',                 nome: 'Vasco da Gama' },
  { file: 'Escudo_Botafogo.png',                         nome: 'Botafogo' },
  { file: 'Escudo_do_America_Futebol_Clube.svg.png',     nome: 'América Mineiro' },
  { file: 'Escudo_do_Sport_Club_Internacional.svg.png',  nome: 'Internacional' },
  { file: 'Esporte_Clube_Bahia_logo.svg.png',            nome: 'Bahia' },
  { file: 'Flamengo.png',                                nome: 'Flamengo' },
  { file: 'Fluminense_FC_escudo.png',                    nome: 'Fluminense' },
  { file: 'Fortaleza_Esporte_Clube_logo.png',            nome: 'Fortaleza' },
  { file: 'Gremio_logo.png',                             nome: 'Grêmio' },
  { file: 'Palmeiras_logo.svg.png',                      nome: 'Palmeiras' },
  { file: 'PaysanduSC.png',                              nome: 'Paysandu' },
  { file: 'RedBullBragantino.png',                       nome: 'RB Bragantino' },
  { file: 'Santa_Cruz_Futebol_Clube_(1915-99).png',      nome: 'Santa Cruz' },
  { file: 'Santos_Logo.png',                             nome: 'Santos' },
  { file: 'Sport_Club_do_Recife.png',                    nome: 'Sport' },
  { file: 'esporte-clube-vitoria.png',                   nome: 'Vitória' },
]

async function uploadToCloudinary(filePath, publicId) {
  const fileBuffer = readFileSync(filePath)
  const blob = new Blob([fileBuffer])

  const formData = new FormData()
  formData.append('file', blob, publicId)
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
  formData.append('folder', 'team-logos')
  formData.append('public_id', publicId)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Cloudinary error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return data.secure_url
}

async function main() {
  console.log('🏆 Criando liga Brasileirão...')

  // Cria ou reutiliza a liga
  let leagueId
  const { data: existing } = await supabase
    .from('leagues')
    .select('id')
    .ilike('name', '%brasileir%')
    .limit(1)

  if (existing && existing.length > 0) {
    leagueId = existing[0].id
    console.log(`  Liga já existe (id: ${leagueId}), reutilizando.`)
  } else {
    const { data, error } = await supabase
      .from('leagues')
      .insert([{ name: 'Brasileirão', country: 'Brasil', logo_url: '' }])
      .select('id')
      .single()

    if (error) throw new Error('Erro ao criar liga: ' + error.message)
    leagueId = data.id
    console.log(`  Liga criada (id: ${leagueId})`)
  }

  const logosDir = resolve(__dirname, '../public/logotimesbr')

  console.log(`\n⚽ Inserindo ${TIMES.length} times...\n`)

  for (const time of TIMES) {
    const filePath = resolve(logosDir, time.file)
    const publicId = time.nome.toLowerCase().replace(/[^a-z0-9]/g, '-')

    process.stdout.write(`  ${time.nome.padEnd(25)} → upload Cloudinary... `)

    let logoUrl = ''
    try {
      logoUrl = await uploadToCloudinary(filePath, publicId)
      process.stdout.write('OK\n')
    } catch (err) {
      process.stdout.write(`ERRO (${err.message})\n`)
    }

    // Verifica se o time já existe nessa liga
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('league_id', leagueId)
      .ilike('name', time.nome)
      .limit(1)

    if (existingTeam && existingTeam.length > 0) {
      // Atualiza logo se já existe
      await supabase
        .from('teams')
        .update({ logo_url: logoUrl })
        .eq('id', existingTeam[0].id)
      process.stdout.write(`  ${time.nome.padEnd(25)}   (atualizado)\n`)
    } else {
      const { error } = await supabase
        .from('teams')
        .insert([{ id: randomUUID(), league_id: leagueId, name: time.nome, logo_url: logoUrl }])
      if (error) console.error(`  Erro ao inserir ${time.nome}: ${error.message}`)
    }
  }

  console.log('\n✅ Seed concluído!')
}

main().catch(err => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
