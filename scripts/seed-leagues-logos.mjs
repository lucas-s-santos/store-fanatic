/**
 * Script: seed-leagues-logos.mjs
 * Upsert das ligas internacionais com logos do Cloudinary no Supabase.
 *
 * Como rodar:
 *   node scripts/seed-leagues-logos.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jynsexowmcznrapapkwc.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bnNleG93bWN6bnJhcGFwa3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNDAzNiwiZXhwIjoyMDk0ODEwMDM2fQ.0sWt0vuiU4aUjw7Mz1HbUZMmmFnIdM8GDBvLfYfMhkQ'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const LEAGUES = [
  {
    id: 'brasileirao',
    name: 'Brasileirão',
    logo_url: 'https://res.cloudinary.com/drdxlvlk4/image/upload/campeonatos/campeonato_brasileiro_de_futebol.png',
    country: 'Brasil',
  },
  {
    id: 'selecoes',
    name: 'Seleções Mundiais',
    logo_url: 'https://res.cloudinary.com/drdxlvlk4/image/upload/campeonatos/logo-fifa.png',
    country: 'Mundial',
  },
  {
    id: 'premier-league',
    name: 'Premier League',
    logo_url: 'https://res.cloudinary.com/drdxlvlk4/image/upload/campeonatos/premier-league.png',
    country: 'Inglaterra',
  },
  {
    id: 'laliga',
    name: 'La Liga',
    logo_url: 'https://res.cloudinary.com/drdxlvlk4/image/upload/campeonatos/laliga.png',
    country: 'Espanha',
  },
  {
    id: 'bundesliga',
    name: 'Bundesliga',
    logo_url: 'https://res.cloudinary.com/drdxlvlk4/image/upload/campeonatos/bundesliga_logo.png',
    country: 'Alemanha',
  },
  {
    id: 'serie-a',
    name: 'Serie A',
    logo_url: 'https://res.cloudinary.com/drdxlvlk4/image/upload/campeonatos/serie-a-logo-png.png',
    country: 'Itália',
  },
  {
    id: 'ligue-1',
    name: 'Ligue 1',
    logo_url: 'https://res.cloudinary.com/drdxlvlk4/image/upload/campeonatos/ligue-1-logo.png',
    country: 'França',
  },
]

async function main() {
  console.log(`Inserindo/atualizando ${LEAGUES.length} ligas...\n`)

  for (const league of LEAGUES) {
    const { error } = await supabase
      .from('leagues')
      .upsert(league, { onConflict: 'id' })

    if (error) {
      console.error(`  ❌ ${league.name}: ${error.message}`)
    } else {
      console.log(`  ✅ ${league.name} (${league.id})`)
    }
  }

  console.log('\nConcluído!')
}

main().catch(err => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
