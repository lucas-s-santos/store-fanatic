import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, ChevronRight, LayoutGrid, RotateCcw, Search, SearchX, X } from 'lucide-react'

import { LeagueRow } from '../components/product/LeagueRow'
import { ProductCard, ProductCardSkeleton } from '../components/product/ProductCard'
import { QuickViewModal } from '../components/product/QuickViewModal'
import { Button } from '../components/ui/button'
import { optimizedImageUrl } from '../lib/assets'
import {
  fetchLeaguesAndTeams,
  fetchShowcaseProducts,
  normalizeSearch,
  productName,
  type ShowcaseLeague,
  type ShowcaseProduct,
  type ShowcaseTeam,
} from '../lib/catalog'
import { useFocusTrap } from '../lib/useFocusTrap'
import { cn } from '../lib/utils'

const PAGE_SIZE = 24

const SORT_OPTIONS = [
  { value: 'relevancia', label: 'Relevância' },
  { value: 'menor-preco', label: 'Menor preço' },
  { value: 'maior-preco', label: 'Maior preço' },
  { value: 'a-z', label: 'Nome A–Z' },
] as const

type SortValue = (typeof SORT_OPTIONS)[number]['value']

const nameCollator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' })

/** "Seleções Mundiais", "selecoes" e "Mundial" levam à mesma liga. */
function normalizeRouteValue(value: string) {
  return normalizeSearch(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

/** Lista de ligas: a mesma na barra lateral (desktop) e na folha do celular. */
function LeagueList({
  leagues,
  counts,
  total,
  activeId,
  onSelect,
}: {
  leagues: ShowcaseLeague[]
  counts: Map<string, number>
  total: number
  activeId?: string
  onSelect: (leagueId: string | null) => void
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <LeagueRow
        active={!activeId}
        aria-pressed={!activeId}
        icon={<LayoutGrid className="size-4" />}
        name="Todas as camisas"
        count={total}
        onClick={() => onSelect(null)}
      />
      <div className="my-1.5 h-px bg-border" />
      {leagues.length === 0 &&
        Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-muted" />)}
      {leagues.map((league) => (
        <LeagueRow
          key={league.id}
          active={league.id === activeId}
          aria-pressed={league.id === activeId}
          logoUrl={league.logo_url}
          name={league.name}
          count={counts.get(league.id)}
          onClick={() => onSelect(league.id)}
        />
      ))}
    </div>
  )
}

/** Celular: a lista de ligas sobe de baixo, como uma gaveta. */
function LeagueSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion() ?? false
  useFocusTrap(ref, open)

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          onClick={onClose}
          className="fixed inset-0 z-[60] flex items-end bg-black/70 backdrop-blur-sm lg:hidden"
        >
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label="Escolher liga"
            initial={reduce ? { opacity: 0 } : { transform: 'translateY(100%)' }}
            animate={reduce ? { opacity: 1 } : { transform: 'translateY(0%)' }}
            exit={reduce ? { opacity: 0 } : { transform: 'translateY(100%)', transition: { duration: 0.25, ease: [0.77, 0, 0.175, 1] } }}
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-popover p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20" aria-hidden />
            <div className="mb-2 flex items-center justify-between px-3">
              <p className="display-title text-3xl">Ligas</p>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
                <X className="size-5" />
              </Button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<ShowcaseProduct[]>([])
  const [leagues, setLeagues] = useState<ShowcaseLeague[]>([])
  const [teams, setTeams] = useState<ShowcaseTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [quickView, setQuickView] = useState<ShowcaseProduct | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const leagueParam = searchParams.get('liga') || searchParams.get('league') || ''
  const teamParam = searchParams.get('time') || ''
  const queryParam = searchParams.get('q') || ''
  const sort = (searchParams.get('ordem') as SortValue) || 'relevancia'
  const [query, setQuery] = useState(queryParam)

  // Links externos (cabeçalho, breadcrumb) trocam a URL inteira: o campo acompanha.
  useEffect(() => {
    setQuery(queryParam)
  }, [queryParam])

  useEffect(() => {
    let active = true
    Promise.all([fetchShowcaseProducts(), fetchLeaguesAndTeams()])
      .then(([allProducts, { leagues, teams }]) => {
        if (!active) return
        setProducts(allProducts)
        setLeagues(leagues)
        setTeams(teams)
      })
      .catch((err) => {
        console.error('[Catalog] Erro ao carregar o catálogo:', err)
        if (active) setError(true)
      })
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  // O ícone de busca do cabeçalho chega aqui com ?busca=1: foca o campo.
  useEffect(() => {
    if (searchParams.get('busca')) {
      searchInputRef.current?.focus()
      updateParams({ busca: null }, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Busca vai para a URL com um pequeno atraso, sem empilhar histórico.
  useEffect(() => {
    if (query === queryParam) return
    const timer = setTimeout(() => updateParams({ q: query.trim() || null }, true), 250)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [leagueParam, teamParam, queryParam, sort])

  function updateParams(changes: Record<string, string | null>, replace = false) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        if ('liga' in changes) next.delete('league')
        return next
      },
      { replace },
    )
  }

  const activeLeague = useMemo(() => {
    if (!leagueParam) return undefined
    const wanted = normalizeRouteValue(leagueParam)
    return leagues.find((league) =>
      [league.id, league.name, league.country || ''].filter(Boolean).map(normalizeRouteValue).includes(wanted),
    )
  }, [leagues, leagueParam])

  const leagueTeams = useMemo(
    () => (activeLeague ? teams.filter((team) => team.league_id === activeLeague.id) : []),
    [teams, activeLeague],
  )
  const activeTeam = leagueTeams.find((team) => team.id === teamParam)

  const teamNames = useMemo(
    () => new Map(teams.map((team) => [`${team.league_id}:${team.id}`, team.name] as const)),
    [teams],
  )
  const leagueNames = useMemo(() => new Map(leagues.map((league) => [league.id, league.name] as const)), [leagues])

  const filtered = useMemo(() => {
    let list = products
    if (activeLeague) list = list.filter((p) => p.league === activeLeague.id)
    if (activeLeague && activeTeam) list = list.filter((p) => p.team === activeTeam.id)

    const q = normalizeSearch(queryParam)
    if (q) {
      list = list.filter((p) =>
        normalizeSearch(
          `${productName(p)} ${teamNames.get(`${p.league}:${p.team}`) ?? p.team} ${leagueNames.get(p.league) ?? p.league}`,
        ).includes(q),
      )
    }

    const sorted = [...list]
    if (sort === 'menor-preco') sorted.sort((a, b) => a.price - b.price)
    else if (sort === 'maior-preco') sorted.sort((a, b) => b.price - a.price)
    else if (sort === 'a-z') sorted.sort((a, b) => nameCollator.compare(productName(a), productName(b)))
    else {
      // Relevância: destaques primeiro, depois em estoque, depois por nome.
      sorted.sort(
        (a, b) =>
          Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
          Number((b.stock_quantity ?? 0) > 0) - Number((a.stock_quantity ?? 0) > 0) ||
          nameCollator.compare(productName(a), productName(b)),
      )
    }
    return sorted
  }, [products, activeLeague, activeTeam, queryParam, sort, teamNames, leagueNames])

  const visible = filtered.slice(0, visibleCount)
  const leagueCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of products) counts.set(p.league, (counts.get(p.league) ?? 0) + 1)
    return counts
  }, [products])

  const title = queryParam
    ? `Busca: “${queryParam}”`
    : activeTeam?.name ?? activeLeague?.name ?? 'Todas as camisas'
  const hasFilters = Boolean(activeLeague || queryParam)

  const clearFilters = () => {
    setQuery('')
    setSearchParams({})
  }

  const selectLeague = (leagueId: string | null) => {
    updateParams({ liga: leagueId, time: null })
    setSheetOpen(false)
  }

  const leagueList = (
    <LeagueList
      leagues={leagues}
      counts={leagueCounts}
      total={products.length}
      activeId={activeLeague?.id}
      onSelect={selectLeague}
    />
  )

  const eyebrow = queryParam ? 'Busca' : activeTeam ? activeLeague?.name : activeLeague?.country ?? 'Catálogo'

  return (
    <div className="pb-16 pt-[7.25rem] lg:pt-[8.25rem]">
      <AnimatePresence>
        {quickView && (
          <QuickViewModal
            product={quickView}
            subtitle={teamNames.get(`${quickView.league}:${quickView.team}`) ?? leagueNames.get(quickView.league)}
            onClose={() => setQuickView(null)}
          />
        )}
      </AnimatePresence>

      <LeagueSheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        {leagueList}
      </LeagueSheet>

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <nav aria-label="Você está em" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Início
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <Link to="/produtos" className="hover:text-foreground" onClick={clearFilters}>
            Camisas
          </Link>
          {activeLeague && (
            <>
              <ChevronRight className="size-3.5" aria-hidden />
              <button type="button" className="hover:text-foreground" onClick={() => updateParams({ time: null })}>
                {activeLeague.name}
              </button>
            </>
          )}
          {activeTeam && (
            <>
              <ChevronRight className="size-3.5" aria-hidden />
              <span className="text-foreground">{activeTeam.name}</span>
            </>
          )}
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-[17rem_1fr] lg:gap-10">
          {/* Ligas na lateral, no mesmo formato do menu "Camisas". */}
          <aside aria-label="Ligas" className="hidden lg:block">
            <div className="sticky top-24 rounded-3xl border border-border bg-card p-3">{leagueList}</div>
          </aside>

          <div className="min-w-0">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="flex items-end gap-4">
                {(activeTeam?.logo_url || activeLeague?.logo_url) && !queryParam && (
                  <span
                    className={cn(
                      'hidden size-20 shrink-0 items-center justify-center rounded-2xl p-2.5 sm:flex',
                      activeTeam ? 'bg-card ring-1 ring-border' : 'bg-paper',
                    )}
                  >
                    <img
                      src={optimizedImageUrl(activeTeam?.logo_url ?? activeLeague?.logo_url, 160)}
                      alt=""
                      className="size-full object-contain"
                    />
                  </span>
                )}
                <div>
                  {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>}
                  <h1 className="display-title mt-1 text-5xl sm:text-6xl">{title}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {loading ? 'Carregando camisas…' : `${filtered.length} ${filtered.length === 1 ? 'camisa' : 'camisas'}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="relative flex h-12 min-w-0 flex-1 items-center sm:w-72 sm:flex-none">
                  <span className="sr-only">Buscar camisa</span>
                  <Search className="pointer-events-none absolute left-4 size-4 text-muted-foreground" aria-hidden />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar time ou seleção"
                    className="form-input h-12 rounded-full py-0 pl-11 pr-10 [&::-webkit-search-cancel-button]:hidden"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Limpar busca"
                      className="absolute right-2 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </label>

                <label className="relative shrink-0">
                  <span className="sr-only">Ordenar por</span>
                  <select
                    value={sort}
                    onChange={(event) => updateParams({ ordem: event.target.value === 'relevancia' ? null : event.target.value }, true)}
                    className="form-input h-12 w-[9.5rem] cursor-pointer appearance-none rounded-full py-0 pl-4 pr-9 text-sm font-semibold sm:w-44"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-popover">
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <ChevronRight className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 rotate-90 text-muted-foreground" aria-hidden />
                </label>
              </div>
            </div>

            {/* Celular: um botão com a liga atual abre a lista de baixo para cima. */}
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-haspopup="dialog"
              className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 text-left lg:hidden"
            >
              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl p-1.5', activeLeague ? 'bg-paper' : 'bg-primary/15 text-primary')}>
                {activeLeague?.logo_url ? (
                  <img src={optimizedImageUrl(activeLeague.logo_url, 80)} alt="" className="size-full object-contain" />
                ) : (
                  <LayoutGrid className="size-4" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Liga</span>
                <span className="block truncate text-sm font-semibold">{activeLeague?.name ?? 'Todas as camisas'}</span>
              </span>
              <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
            </button>

            {/* Escudos dos times, no mesmo formato do menu. */}
            {leagueTeams.length > 0 && (
              <div className="mt-6 flex items-center gap-3 border-y border-border py-4">
                <p className="shrink-0 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Times</p>
                <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <button
                    type="button"
                    onClick={() => updateParams({ time: null })}
                    aria-pressed={!activeTeam}
                    className={cn(
                      'h-11 shrink-0 rounded-full border px-4 text-xs font-extrabold uppercase tracking-wide transition-colors duration-150',
                      !activeTeam ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-white/30',
                    )}
                  >
                    Todos
                  </button>
                  {leagueTeams.map((team) => {
                    const active = activeTeam?.id === team.id
                    return (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() => updateParams({ time: active ? null : team.id })}
                        aria-pressed={active}
                        aria-label={team.name}
                        title={team.name}
                        className={cn(
                          'flex size-11 shrink-0 items-center justify-center rounded-full border bg-card p-1.5 transition-[border-color,transform,box-shadow] duration-150',
                          active
                            ? 'border-primary ring-2 ring-primary/40'
                            : 'border-border hover:-translate-y-0.5 hover:border-white/30',
                        )}
                      >
                        {team.logo_url && <img src={optimizedImageUrl(team.logo_url, 64)} alt="" loading="lazy" className="size-full object-contain" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-8">
              {error ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-3xl border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
                  <p className="text-lg font-bold">Não conseguimos carregar o catálogo</p>
                  <p className="text-sm text-muted-foreground">Verifique sua conexão e tente de novo.</p>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    <RotateCcw />
                    Tentar de novo
                  </Button>
                </div>
              ) : loading ? (
                <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 xl:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <ProductCardSkeleton key={index} />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex min-h-[340px] flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-card px-6 py-12 text-center">
                  <span className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <SearchX className="size-7" aria-hidden />
                  </span>
                  <div>
                    <p className="display-title text-3xl">Nenhuma camisa encontrada</p>
                    <p className="mt-2 text-sm text-muted-foreground">Tente outro nome de time ou veja todas as camisas.</p>
                  </div>
                  {hasFilters && (
                    <Button variant="outline" onClick={clearFilters}>
                      Ver todas as camisas
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 xl:grid-cols-4">
                    {visible.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        eyebrow={activeLeague ? undefined : leagueNames.get(product.league)}
                        onQuickView={() => setQuickView(product)}
                      />
                    ))}
                  </div>

                  {filtered.length > PAGE_SIZE && (
                    <div className="mx-auto mt-14 flex max-w-xs flex-col items-center gap-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        Mostrando {visible.length} de {filtered.length} camisas
                      </p>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(visible.length / filtered.length) * 100}%` }} />
                      </div>
                      {visible.length < filtered.length && (
                        <Button variant="outline" size="lg" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                          Carregar mais camisas
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
