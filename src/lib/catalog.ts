import { supabase } from './supabase'

/** Campos que a vitrine (home, prateleiras, relacionados) precisa de cada produto. */
export interface ShowcaseProduct {
  id: string
  title: string | null
  name: string | null
  price: number
  image_url: string
  images: string[] | null
  league: string
  team: string
  featured: boolean | null
  stock_quantity: number | null
  sizes: string[] | null
  created_at: string
}

export interface ShowcaseLeague {
  id: string
  name: string
  country: string | null
  logo_url: string | null
}

export interface ShowcaseTeam {
  id: string
  name: string
  league_id: string
  logo_url: string | null
}

const SHOWCASE_FIELDS = 'id, title, name, price, image_url, images, league, team, featured, stock_quantity, sizes, created_at'
const PAGE_SIZE = 1000

let productsRequest: Promise<ShowcaseProduct[]> | null = null
let leaguesRequest: Promise<{ leagues: ShowcaseLeague[]; teams: ShowcaseTeam[] }> | null = null

async function loadAllProducts() {
  const all: ShowcaseProduct[] = []
  // O Supabase devolve no máximo 1000 linhas por vez.
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from('products')
      .select(SHOWCASE_FIELDS)
      // active nulo conta como ativo, como sempre foi no catálogo.
      .not('active', 'is', false)
      .order('created_at', { ascending: false })
      .order('id', { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (error) throw error
    all.push(...((data ?? []) as ShowcaseProduct[]))
    if (!data || data.length < PAGE_SIZE) return all
  }
}

/**
 * Todos os produtos ativos, só com os campos de vitrine. São ~600 linhas leves;
 * a promessa fica em memória para home, catálogo e produto não repetirem a busca.
 */
export function fetchShowcaseProducts() {
  productsRequest ??= loadAllProducts().catch((error) => {
    productsRequest = null
    throw error
  })
  return productsRequest
}

export function fetchLeaguesAndTeams() {
  leaguesRequest ??= Promise.all([
    supabase.from('leagues').select('id, name, country, logo_url').order('name'),
    supabase.from('teams').select('id, name, league_id, logo_url').order('name'),
  ]).then(([leagueRes, teamRes]) => {
    if (leagueRes.error) {
      leaguesRequest = null
      throw leagueRes.error
    }
    return {
      leagues: (leagueRes.data ?? []) as ShowcaseLeague[],
      teams: (teamRes.data ?? []) as ShowcaseTeam[],
    }
  })
  return leaguesRequest
}

export function productName(product: { name?: string | null; title?: string | null }) {
  return product.name || product.title || ''
}

/**
 * Nome para a vitrine. Muitos produtos se chamam "Uruguai 1", "Grêmio 5": o
 * número final é o modelo, então mostramos "Uruguai · Modelo 1".
 */
export function displayProductName(name: string) {
  const match = name.match(/^(.*\S)\s+(\d{1,3})$/)
  if (!match || /modelo/i.test(name)) return name
  return `${match[1]} · Modelo ${match[2]}`
}

/** Minúsculas e sem acento, para "gremio" achar "Grêmio". */
export function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** Embaralha uma cópia (Fisher–Yates); `sort(() => Math.random() - 0.5)` é enviesado. */
export function shuffle<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
