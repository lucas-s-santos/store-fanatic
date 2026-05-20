/**
 * Corrige o campo `team` nos produtos: substitui o nome do time pelo id/slug,
 * para bater com o selectedTeamId do CatalogPage.
 */
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'

const SUPABASE_URL         = 'https://jynsexowmcznrapapkwc.supabase.co'
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5bnNleG93bWN6bnJhcGFwa3djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTIzNDAzNiwiZXhwIjoyMDk0ODEwMDM2fQ.0sWt0vuiU4aUjw7Mz1HbUZMmmFnIdM8GDBvLfYfMhkQ'

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

async function main() {
  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Busca todos os teams para montar mapa nome → slug
  const { data: teams, error: teamsErr } = await client.from('teams').select('id, name')
  if (teamsErr) { console.error('Erro ao buscar times:', teamsErr.message); process.exit(1) }

  const nameToSlug = {}
  for (const t of teams) nameToSlug[t.name] = t.id
  console.log(`${teams.length} times carregados\n`)

  // Busca produtos com team ainda sendo o nome (não o slug)
  const { data: products, error: prodErr } = await client.from('products').select('id, team')
  if (prodErr) { console.error('Erro ao buscar produtos:', prodErr.message); process.exit(1) }

  const toFix = products.filter(p => nameToSlug[p.team] && p.team !== nameToSlug[p.team])
  console.log(`${toFix.length} produtos para corrigir\n`)

  let ok = 0
  for (const p of toFix) {
    const newSlug = nameToSlug[p.team]
    const { error } = await client.from('products').update({ team: newSlug }).eq('id', p.id)
    if (error) console.error(`  ❌ ${p.id}: ${error.message}`)
    else ok++
  }

  console.log(`✅ ${ok} produtos atualizados`)
}

main().catch(err => { console.error('Erro fatal:', err); process.exit(1) })
