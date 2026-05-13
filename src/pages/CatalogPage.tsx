import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, Eye, MoveRight, Search, Shield, ShoppingCart, Trophy, X } from 'lucide-react'

import { supabase } from '../lib/supabase'
import { useCartStore } from '../store/cartStore'

interface Product {
  id: string
  name?: string
  title?: string
  price: number
  league: string
  team: string
  image_url: string
  images?: string[]
  stock_quantity?: number
  stock?: number
  sizes?: string[]
  type?: string
  category?: string
}

interface League {
  id: string
  name: string
  country?: string
  logo: string
  teams: Team[]
}

interface Team {
  id: string
  name: string
  logo: string
}

type ViewState = 'leagues' | 'teams' | 'products' | 'all'

const SIZE_OPTIONS = ['P', 'M', 'G', 'GG', 'XG', 'XGG']

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const, delay: index * 0.05 },
  }),
}

function getProductName(product: Product) {
  return product.name || product.title || ''
}

function getProductSearchText(product: Product) {
  return `${getProductName(product)} ${product.team || ''} ${product.league || ''}`.toLowerCase()
}

function normalizeRouteValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function ProductSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-sm border border-white/[0.06] bg-card">
      <div className="aspect-[4/5] bg-white/5" />
      <div className="space-y-3 p-5">
        <div className="h-2 w-16 rounded bg-white/5" />
        <div className="h-6 w-3/4 rounded bg-white/5" />
        <div className="mt-2 h-4 w-1/2 rounded bg-white/5" />
      </div>
    </div>
  )
}

function QuickViewModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const addItem = useCartStore((state) => state.addItem)
  const [selectedSize, setSelectedSize] = useState('')
  const [added, setAdded] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)

  const name = getProductName(product)
  const stock = product.stock_quantity ?? product.stock ?? 0
  const allImages = [product.image_url, ...(product.images || [])].filter(Boolean)

  const handleAdd = () => {
    if (!selectedSize) return

    addItem({
      id: product.id,
      title: name,
      price: product.price,
      imageUrl: product.image_url,
      size: selectedSize,
      quantity: 1,
    })

    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(event) => event.stopPropagation()}
        className="relative max-h-[90vh] w-full overflow-y-auto overflow-hidden rounded-t-2xl border bg-card shadow-2xl sm:max-w-2xl sm:rounded-2xl"
      >
        <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white/70 transition-colors hover:text-white">
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col sm:flex-row">
          <div className="relative w-full shrink-0 bg-black/20 sm:w-72">
            {allImages.length > 0 ? (
              <>
                <img src={allImages[imgIdx]} alt={name} className="aspect-[3/4] w-full object-cover" />
                {allImages.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                    {allImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setImgIdx(index)}
                        className={`h-2 w-2 rounded-full transition-all ${index === imgIdx ? 'w-4 bg-primary' : 'bg-white/40'}`}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex aspect-[3/4] w-full items-center justify-center text-xs text-muted-foreground">Sem imagem</div>
            )}
          </div>

          <div className="flex-1 space-y-4 p-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary/60">{product.league} / {product.team}</p>
              <h3 className="mt-1 text-xl font-display font-bold uppercase text-white">{name}</h3>
            </div>

            <p className="text-3xl font-black text-white">R$ {product.price?.toFixed(2).replace('.', ',')}</p>

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Escolha o tamanho</p>
              <div className="flex flex-wrap gap-2">
                {(product.sizes || SIZE_OPTIONS).map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    disabled={stock === 0}
                    className={`rounded-lg border px-3 py-2 text-xs font-bold transition-all ${
                      selectedSize === size
                        ? 'border-primary bg-primary/10 text-primary'
                        : stock === 0
                          ? 'cursor-not-allowed border-white/5 text-muted-foreground/30 line-through'
                          : 'border-white/10 text-muted-foreground hover:border-primary/30 hover:text-white'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className={stock > 0 ? 'text-green-400' : 'text-red-400'}>
                {stock > 0 ? `${stock} disponivel` : 'Esgotado'}
              </span>
            </div>

            <button
              onClick={handleAdd}
              disabled={!selectedSize || stock === 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40"
            >
              {added ? (
                <>
                  <Check className="h-4 w-4" />
                  Adicionado ao carrinho
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  Adicionar ao carrinho
                </>
              )}
            </button>

            <Link to={`/produtos/${product.id}`} onClick={onClose} className="block text-center text-xs text-muted-foreground underline underline-offset-4 transition-colors hover:text-primary">
              Ver detalhes do produto
            </Link>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function CatalogPage() {
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [dbLeagues, setDbLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewState>('leagues')
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)

  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const leagueParam = searchParams.get('liga') || searchParams.get('league')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      const [leagueRes, teamRes] = await Promise.all([
        supabase.from('leagues').select('*').order('name'),
        supabase.from('teams').select('*').order('name'),
      ])

      if (leagueRes.data && teamRes.data) {
        const builtLeagues = leagueRes.data.map((league) => ({
          ...league,
          logo: league.logo_url,
          teams: teamRes.data
            .filter((team) => team.league_id === league.id)
            .map((team) => ({ ...team, logo: team.logo_url })),
        }))

        setDbLeagues(builtLeagues)
      }

      let allData: Product[] = []
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

        if (error) break

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

      const sortedData = allData.sort((a: any, b: any) => {
        const aPriority = a.featured || a.category === 'mundial-copa-2026' ? 1 : 0
        const bPriority = b.featured || b.category === 'mundial-copa-2026' ? 1 : 0

        if (aPriority !== bPriority) return bPriority - aPriority

        return getProductName(a).localeCompare(getProductName(b), undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      })

      setProducts(sortedData)
      setLoading(false)
    }

    fetchData()
  }, [])

  const updateSuggestions = useCallback((query: string) => {
    const normalizedQuery = query.trim().toLowerCase()

    if (normalizedQuery.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const filtered = products.filter((product) => getProductSearchText(product).includes(normalizedQuery)).slice(0, 5)
    setSuggestions(filtered)
    setShowSuggestions(filtered.length > 0)
  }, [products])

  useEffect(() => {
    const timer = setTimeout(() => updateSuggestions(searchQuery), 200)
    return () => clearTimeout(timer)
  }, [searchQuery, updateSuggestions])

  useEffect(() => {
    if (!leagueParam || dbLeagues.length === 0) return

    const normalizedParam = normalizeRouteValue(leagueParam)
    const leagueFromRoute = dbLeagues.find((league) => {
      const aliases = [league.id, league.name, league.country || ''].filter(Boolean).map(normalizeRouteValue)
      return aliases.includes(normalizedParam)
    })

    if (!leagueFromRoute) return

    setSelectedLeagueId(leagueFromRoute.id)
    setSelectedTeamId(null)
    setSearchQuery('')
    setShowSuggestions(false)
    setView('teams')
  }, [dbLeagues, leagueParam])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const activeLeague = dbLeagues.find((league) => league.id === selectedLeagueId)
  const activeTeam = activeLeague?.teams.find((team) => team.id === selectedTeamId)

  let displayProducts = products

  if (view === 'products' && selectedLeagueId && selectedTeamId) {
    displayProducts = products.filter((product) => product.league === selectedLeagueId && product.team === selectedTeamId)
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()
  if (normalizedQuery.length > 0) {
    displayProducts = displayProducts.filter((product) => getProductSearchText(product).includes(normalizedQuery))
  }

  const isSearching = normalizedQuery.length > 0
  const currentView = isSearching ? 'all' : view

  const renderLeagues = () => (
    <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {dbLeagues.map((league, index) => (
        <motion.button
          key={league.id}
          custom={index}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          whileHover={{ y: -4 }}
          onClick={() => {
            setSelectedLeagueId(league.id)
            setSelectedTeamId(null)
            setView('teams')
          }}
          className="group relative min-h-[220px] overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-6 text-left backdrop-blur-md transition-all duration-500 hover:border-primary/30 hover:bg-white/[0.04] hover:shadow-[0_0_40px_rgba(255,170,0,0.08)] sm:min-h-[260px] sm:px-6 sm:py-7"
        >
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/0 blur-[60px] transition-all duration-700 group-hover:bg-primary/5" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Liga</p>
                <h3 className="mt-2 text-xl font-display font-bold uppercase leading-tight text-white tracking-tight sm:text-2xl">{league.name}</h3>
                <p className="mt-1.5 text-xs font-medium text-muted-foreground">{league.country}</p>
              </div>
              <div className="h-14 w-14 shrink-0 rounded-xl bg-white/90 p-2 opacity-80 transition-all duration-700 group-hover:rotate-3 group-hover:scale-110 group-hover:opacity-100 sm:h-16 sm:w-16">
                <img src={league.logo} alt={league.name} className="h-full w-full object-contain" />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between sm:mt-8">
              <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-[9px] font-bold uppercase text-primary">
                {league.teams.length} times
              </span>
              <MoveRight className="h-4 w-4 text-muted-foreground transition-all duration-500 group-hover:translate-x-2 group-hover:text-primary sm:h-5 sm:w-5" />
            </div>
          </div>
        </motion.button>
      ))}
    </motion.div>
  )

  const renderTeams = () => {
    if (!activeLeague) return null

    return (
      <div className="space-y-4 sm:space-y-6">
        <motion.button
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => setView('leagues')}
          className="inline-flex items-center gap-2 rounded-sm border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/60 transition-all hover:border-primary/20 hover:text-white sm:px-4 sm:py-2.5 sm:text-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Voltar para as ligas
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 rounded-[1.5rem] border border-white/5 bg-white/[0.02] px-5 py-6 shadow-2xl backdrop-blur-xl sm:gap-5 sm:rounded-[2rem] sm:px-8 sm:py-8 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex items-center gap-4 sm:gap-5">
            <img src={activeLeague.logo} alt={activeLeague.name} className="h-12 w-12 object-contain sm:h-16 sm:w-16" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Escolha um time</p>
              <h2 className="mt-1 text-2xl font-display font-bold uppercase tracking-tight text-white sm:mt-2 sm:text-3xl">{activeLeague.name}</h2>
            </div>
          </div>

          <div className="chip border-white/10 bg-white/[0.03] text-xs text-white/70">
            <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {activeLeague.teams.length} times
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {activeLeague.teams.map((team, index) => (
            <motion.button
              key={team.id}
              custom={index}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              whileHover={{ y: -3 }}
              onClick={() => {
                setSelectedTeamId(team.id)
                setView('products')
              }}
              className="group flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-5 backdrop-blur-md transition-all duration-500 hover:border-primary/30 hover:bg-white/[0.04] hover:shadow-[0_10px_30px_rgba(255,170,0,0.08)] sm:min-h-[200px] sm:gap-5 sm:px-5 sm:py-7"
            >
              <img src={team.logo} alt={team.name} className="h-14 w-14 object-contain transition-transform duration-500 group-hover:scale-110 sm:h-20 sm:w-20" />
              <span className="text-center text-xs font-display uppercase leading-tight text-white sm:text-base">{team.name}</span>
            </motion.button>
          ))}
        </div>
      </div>
    )
  }

  const renderProducts = () => (
    <div className="space-y-4 sm:space-y-6">
      {!isSearching && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 rounded-sm border border-white/[0.06] bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-5"
        >
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setView('teams')}
              className="inline-flex items-center gap-2 rounded-sm border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/60 transition-all hover:border-primary/20 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Escolher outro time
            </button>

            {activeTeam && (
              <div className="chip text-xs">
                <img src={activeTeam.logo} alt={activeTeam.name} className="h-3.5 w-3.5 object-contain" />
                {activeTeam.name}
              </div>
            )}
          </div>

          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {displayProducts.length} produto{displayProducts.length !== 1 ? 's' : ''}
          </span>
        </motion.div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 2xl:grid-cols-5">
          {[...Array(10)].map((_, index) => (
            <ProductSkeleton key={index} />
          ))}
        </div>
      ) : displayProducts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex min-h-[300px] flex-col items-center justify-center gap-5 rounded-sm border border-white/[0.06] bg-card px-6 py-12 text-center sm:min-h-[340px]"
        >
          <Trophy className="h-10 w-10 text-primary/30 sm:h-14 sm:w-14" />
          <div>
            <h3 className="text-xl font-display uppercase text-white sm:text-2xl">Nenhum produto encontrado</h3>
            <p className="mt-2 text-sm text-white/35">Tente buscar por outro nome ou voltar para escolher outro time.</p>
          </div>
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 2xl:grid-cols-5">
            {displayProducts.map((product, index) => {
              const name = getProductName(product)
              const stock = product.stock_quantity ?? product.stock ?? 0
              const isLow = stock > 0 && stock <= 5
              const outOfStock = stock === 0

              return (
                <motion.div key={product.id} custom={index} variants={cardVariants} initial="hidden" animate="visible" className="group relative">
                  <Link
                    to={`/produtos/${product.id}`}
                    className="block overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a] transition-all duration-500 hover:-translate-y-2 hover:border-primary/40 hover:shadow-[0_20px_40px_rgba(255,170,0,0.08)] sm:rounded-[2rem]"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <img
                        src={product.image_url || 'https://via.placeholder.com/400x500?text=Sem+Foto'}
                        alt={name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/40 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-40" />

                      {isLow && (
                        <div className="absolute right-2 top-2 z-10 sm:right-4 sm:top-4">
                          <span className="rounded-full border border-[#FF453A]/40 bg-[#FF453A]/20 px-2 py-0.5 text-[7px] font-semibold uppercase tracking-wider text-[#FF453A] shadow-lg backdrop-blur-md sm:px-3 sm:py-1.5 sm:text-[9px]">
                            Ultimas unidades
                          </span>
                        </div>
                      )}

                      {outOfStock && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 sm:text-sm">Esgotado</span>
                        </div>
                      )}
                    </div>

                    <div className="relative space-y-2 bg-[#0a0a0a] p-3 sm:mt-2 sm:space-y-4 sm:p-6 sm:pt-8">
                      <div>
                        <h3 className="line-clamp-2 text-xs font-display font-bold uppercase leading-tight tracking-tight text-white transition-colors group-hover:text-primary sm:text-sm md:text-base lg:text-lg">
                          {name}
                        </h3>
                      </div>

                      <div className="mt-1 flex items-end justify-between gap-2 border-t border-white/10 pt-2 sm:pt-5">
                        <div>
                          <p className="text-[7px] font-semibold uppercase tracking-[0.2em] text-primary/70 sm:text-[10px]">Preco</p>
                          <p className="mt-0.5 text-sm font-display font-bold tracking-tight text-white sm:mt-1 sm:text-xl lg:text-2xl">
                            R$ {product.price?.toFixed(2).replace('.', ',')}
                          </p>
                        </div>

                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-muted-foreground transition-all duration-300 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-[0_0_20px_rgba(255,170,0,0.3)] sm:h-10 sm:w-10 lg:h-12 lg:w-12">
                          <MoveRight className="h-3 w-3 transition-transform group-hover:translate-x-1 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                        </div>
                      </div>
                    </div>
                  </Link>

                  <button
                    onClick={(event) => {
                      event.preventDefault()
                      setQuickViewProduct(product)
                    }}
                    className="absolute left-2 top-2 z-10 rounded-full border border-white/10 bg-black/60 p-1.5 text-white/60 opacity-0 transition-all hover:bg-black/80 hover:text-white group-hover:opacity-100 sm:left-4 sm:top-4 sm:p-2"
                    title="Ver rapidamente"
                  >
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                </motion.div>
              )
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  )

  return (
    <div className="section-shell px-3 pt-24 sm:px-4 sm:pt-28">
      <AnimatePresence>
        {quickViewProduct && <QuickViewModal product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />}
      </AnimatePresence>

      <div className="mx-auto max-w-[1440px] space-y-6 sm:space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-4 sm:gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl space-y-3 sm:space-y-4">
              <h1 className="text-3xl font-display font-extrabold uppercase leading-none tracking-tight text-white sm:text-4xl lg:text-5xl xl:text-6xl">
                Encontre sua
                <br className="hidden sm:block" /> <span className="text-gradient-gold">camisa ideal</span>
              </h1>
              <p className="max-w-xl text-xs font-medium leading-relaxed text-muted-foreground sm:text-sm sm:text-base">
                Escolha uma liga, depois o seu time, ou pesquise direto pelo nome da camisa.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div ref={searchRef} className="relative min-w-[220px] sm:min-w-[260px]">
                <label className="flex items-center gap-3 rounded-sm border border-white/10 bg-white/[0.03] px-3 py-2.5 sm:px-4 sm:py-3">
                  <Search className="h-3.5 w-3.5 shrink-0 text-primary/50 sm:h-4 sm:w-4" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onFocus={() => searchQuery.trim().length >= 2 && setShowSuggestions(true)}
                    placeholder="Buscar por time ou modelo"
                    className="w-full bg-transparent text-xs text-white placeholder:text-white/25 focus:outline-none sm:text-sm"
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setSuggestions([]); setShowSuggestions(false) }} className="shrink-0 text-xs text-white/30 transition-colors hover:text-white">
                      x
                    </button>
                  )}
                </label>

                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a] shadow-2xl"
                    >
                      {suggestions.map((suggestion) => (
                        <Link
                          key={suggestion.id}
                          to={`/produtos/${suggestion.id}`}
                          onClick={() => setShowSuggestions(false)}
                          className="flex items-center gap-3 border-b border-white/5 px-4 py-3 transition-colors hover:bg-white/[0.04] last:border-b-0"
                        >
                          <div className="h-10 w-8 shrink-0 overflow-hidden rounded bg-white/5">
                            <img src={suggestion.image_url || ''} alt={getProductName(suggestion)} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{getProductName(suggestion)}</p>
                            <p className="text-[10px] text-muted-foreground">R$ {suggestion.price?.toFixed(2).replace('.', ',')}</p>
                          </div>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedLeagueId(null)
                  setSelectedTeamId(null)
                  setView('all')
                }}
                className="btn-outline py-2.5 text-[10px] sm:py-3 sm:text-xs"
              >
                Ver todos os produtos
              </button>
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentView}-${selectedLeagueId}-${selectedTeamId}-${normalizedQuery}`}
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
