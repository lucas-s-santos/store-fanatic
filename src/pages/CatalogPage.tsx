import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MoveRight, Search, Shield, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { LEAGUES } from '../lib/constants'

interface Product {
  id: string
  name?: string
  title?: string
  price: number
  league: string
  team: string
  image_url: string
  stock_quantity?: number
  stock?: number
}

type ViewState = 'leagues' | 'teams' | 'products' | 'all'

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const, delay: i * 0.05 },
  }),
}

function ProductSkeleton() {
  return (
    <div className="overflow-hidden rounded-sm border border-white/[0.06] bg-card animate-pulse">
      <div className="aspect-[4/5] bg-white/5" />
      <div className="space-y-3 p-5">
        <div className="h-2 w-16 bg-white/5 rounded" />
        <div className="h-6 w-3/4 bg-white/5 rounded" />
        <div className="h-4 w-1/2 bg-white/5 rounded mt-2" />
      </div>
    </div>
  )
}

export function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewState>('leagues')
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true)
      
      let allData: any[] = []
      let hasMore = true
      let page = 0
      const limit = 1000
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: true })
          .range(page * limit, (page + 1) * limit - 1)

        if (error) {
          console.error('Error fetching products:', error)
          break
        } 
        
        if (data) {
          allData = [...allData, ...data]
          if (data.length < limit) {
            hasMore = false
          } else {
            page++
          }
        } else {
          hasMore = false
        }
      }

      // Ordenação: Destaques primeiro, depois alfabético natural
      const sortedData = allData.sort((a, b) => {
        // Colocar em destaque/novas primeiro
        const aPriority = a.featured || a.category === 'mundial-copa-2026' ? 1 : 0
        const bPriority = b.featured || b.category === 'mundial-copa-2026' ? 1 : 0
        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }
        
        const titleA = a.name || a.title || ''
        const titleB = b.name || b.title || ''
        return titleA.localeCompare(titleB, undefined, { numeric: true, sensitivity: 'base' })
      })
      
      setProducts(sortedData)
      setLoading(false)
    }
    fetchProducts()
  }, [])

  const activeLeague = LEAGUES.find((l) => l.id === selectedLeagueId)
  const activeTeam = activeLeague?.teams.find((t) => t.id === selectedTeamId)

  let displayProducts = products
  if (view === 'products' && selectedLeagueId && selectedTeamId) {
    displayProducts = products.filter(
      (p) => p.league === selectedLeagueId && p.team === selectedTeamId,
    )
  }

  const q = searchQuery.trim().toLowerCase()
  if (q.length > 0) {
    displayProducts = products.filter((p) =>
      (p.name || p.title || '').toLowerCase().includes(q),
    )
  }

  const isSearching = q.length > 0
  const currentView = isSearching ? 'all' : view

  // ─── League Grid ──────────────────────────────────────────────────────────
  const renderLeagues = () => (
    <motion.div layout className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
      {LEAGUES.map((league, i) => (
        <motion.button
          key={league.id}
          custom={i}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ y: -4 }}
          onClick={() => {
            setSelectedLeagueId(league.id)
            setSelectedTeamId(null)
            setView('teams')
          }}
          className="group relative min-h-[260px] overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md px-6 py-7 text-left transition-all duration-500 hover:border-primary/30 hover:bg-white/[0.04] hover:shadow-[0_0_40px_rgba(255,170,0,0.08)]"
        >
          {/* Ambient glow on hover */}
          <div className="absolute top-0 right-0 h-32 w-32 bg-primary/0 group-hover:bg-primary/5 blur-[60px] transition-all duration-700 rounded-full" />

          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Campeonato
                </p>
                <h3 className="mt-3 text-2xl font-display font-bold uppercase text-white tracking-tight">
                  {league.name}
                </h3>
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  {league.country}
                </p>
              </div>
              <div className="h-16 w-16 rounded-xl bg-white/90 flex items-center justify-center p-2 opacity-80 transition-all duration-700 group-hover:opacity-100 group-hover:scale-110 group-hover:rotate-3">
                <img
                  src={league.logo}
                  alt={league.name}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
            <div className="mt-8 flex items-center justify-between">
              <span className="chip border-primary/20 bg-primary/5 text-primary text-[9px]">
                {league.teams.length} times
              </span>
              <MoveRight className="h-5 w-5 text-muted-foreground transition-all duration-500 group-hover:text-primary group-hover:translate-x-2" />
            </div>
          </div>
        </motion.button>
      ))}
    </motion.div>
  )

  // ─── Team Grid ────────────────────────────────────────────────────────────
  const renderTeams = () => {
    if (!activeLeague) return null
    return (
      <div className="space-y-6">
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setView('leagues')}
          className="inline-flex items-center gap-2 rounded-sm border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/60 transition-all hover:border-primary/20 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para ligas
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-5 rounded-[2rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl px-8 py-8 lg:flex-row lg:items-center lg:justify-between shadow-2xl"
        >
          <div className="flex items-center gap-5">
            <img src={activeLeague.logo} alt={activeLeague.name} className="h-16 w-16 object-contain" />
            <div>
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                Escolha o time
              </p>
              <h2 className="mt-2 text-3xl font-display font-bold uppercase text-white tracking-tight">
                {activeLeague.name}
              </h2>
            </div>
          </div>
          <div className="chip bg-white/[0.03] border-white/10 text-white/70">
            <Shield className="h-3.5 w-3.5" />
            {activeLeague.teams.length} times disponíveis
          </div>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {activeLeague.teams.map((team, i) => (
            <motion.button
              key={team.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ y: -3 }}
              onClick={() => {
                setSelectedTeamId(team.id)
                setView('products')
              }}
              className="group flex min-h-[200px] flex-col items-center justify-center gap-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md px-5 py-7 transition-all duration-500 hover:border-primary/30 hover:bg-white/[0.04] hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(255,170,0,0.08)]"
            >
              <img
                src={team.logo}
                alt={team.name}
                className="h-20 w-20 object-contain transition-transform duration-500 group-hover:scale-110"
              />
              <span className="text-center text-base font-display uppercase text-white">
                {team.name}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    )
  }

  // ─── Product Grid ─────────────────────────────────────────────────────────
  const renderProducts = () => (
    <div className="space-y-6">
      {!isSearching && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 rounded-sm border border-white/[0.06] bg-card px-5 py-5 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setView('teams')}
              className="inline-flex items-center gap-2 rounded-sm border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white/60 transition-all hover:border-primary/20 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Mudar time
            </button>

            {activeTeam && (
              <div className="chip">
                <img src={activeTeam.logo} alt={activeTeam.name} className="h-4 w-4 object-contain" />
                {activeTeam.name}
              </div>
            )}
          </div>
          <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {displayProducts.length} produto{displayProducts.length !== 1 ? 's' : ''}
          </span>
        </motion.div>
      )}

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
          {[...Array(8)].map((_, i) => <ProductSkeleton key={i} />)}
        </div>
      ) : displayProducts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex min-h-[340px] flex-col items-center justify-center gap-5 rounded-sm border border-white/[0.06] bg-card text-center"
        >
          <Trophy className="h-14 w-14 text-primary/30" />
          <div>
            <h3 className="text-2xl font-display uppercase text-white">
              Nenhum produto encontrado
            </h3>
            <p className="mt-2 text-sm text-white/35">
              Tente outro time ou utilize a busca acima.
            </p>
          </div>
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {displayProducts.map((product, i) => {
              const name = product.name || product.title || ''
              const stock = product.stock_quantity ?? product.stock ?? 0
              const isLow = stock > 0 && stock <= 5
              const outOfStock = stock === 0

              return (
                <motion.div
                  key={product.id}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <Link
                    to={`/produtos/${product.id}`}
                    className="group block overflow-hidden rounded-[2rem] bg-[#0a0a0a] border border-white/[0.08] transition-all duration-500 hover:border-primary/40 hover:shadow-[0_20px_40px_rgba(255,170,0,0.08)] hover:-translate-y-2"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <img
                        src={product.image_url || 'https://via.placeholder.com/400x500?text=Sem+Foto'}
                        alt={name}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/40 to-transparent opacity-80 group-hover:opacity-40 transition-opacity duration-500" />

                      {/* Stock badges */}
                      {isLow && (
                        <div className="absolute top-4 right-4 z-10">
                          <span className="rounded-full bg-[#FF453A]/20 border border-[#FF453A]/40 px-3 py-1.5 font-sans text-[9px] font-semibold uppercase tracking-wider text-[#FF453A] backdrop-blur-md shadow-lg">
                            Últimas unidades
                          </span>
                        </div>
                      )}
                      {outOfStock && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                          <span className="font-display text-sm font-bold uppercase tracking-wider text-white/50">
                            Esgotado
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="relative space-y-4 p-6 sm:p-8 bg-[#0a0a0a]">
                      <div>
                        <h3 className="line-clamp-2 text-2xl font-display font-bold uppercase text-white group-hover:text-primary transition-colors tracking-tight leading-tight">
                          {name}
                        </h3>
                      </div>

                      <div className="flex items-end justify-between gap-4 border-t border-white/10 pt-5 mt-2">
                        <div>
                          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70">
                            Preço Oficial
                          </p>
                          <p className="mt-1 text-3xl font-display font-bold text-white tracking-tight">
                            R$ {product.price?.toFixed(2).replace('.', ',')}
                          </p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.03] border border-white/10 text-muted-foreground transition-all duration-300 group-hover:bg-primary group-hover:border-primary group-hover:text-primary-foreground group-hover:shadow-[0_0_20px_rgba(255,170,0,0.3)]">
                          <MoveRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  )

  return (
    <div className="section-shell px-4 pt-28 sm:px-6">
      <div className="mx-auto max-w-[1440px] space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl space-y-4">
              <h1 className="text-4xl font-display font-extrabold uppercase text-white sm:text-5xl lg:text-6xl tracking-tight leading-none">
                CATÁLOGO DE <br/><span className="text-gradient-gold">EXCELÊNCIA</span>
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base font-medium">
                Navegue por liga, selecione seu time e escolha o manto perfeito para o seu estilo.
              </p>
            </div>

            {/* Search + Show all */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="flex min-w-[260px] items-center gap-3 rounded-sm border border-white/10 bg-white/[0.03] px-4 py-3">
                <Search className="h-4 w-4 shrink-0 text-primary/50" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar camiseta..."
                  className="w-full bg-transparent text-sm text-white placeholder:text-white/25"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="shrink-0 text-white/30 hover:text-white transition-colors text-xs"
                  >
                    ✕
                  </button>
                )}
              </label>

              <button
                onClick={() => {
                  setSearchQuery('')
                  setView('all')
                }}
                className="btn-outline py-3 text-xs"
              >
                Ver todos
              </button>
            </div>
          </div>

          {/* Gold line separator */}
          <div className="gold-line" />
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView + selectedLeagueId + selectedTeamId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {currentView === 'leagues' && renderLeagues()}
            {currentView === 'teams' && renderTeams()}
            {(currentView === 'products' || currentView === 'all') && renderProducts()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
