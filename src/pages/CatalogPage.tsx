import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { ChevronRight, RotateCcw, Search, SearchX, X } from 'lucide-react'

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

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-10 shrink-0 items-center gap-2 rounded-full border pl-1.5 pr-4 text-sm font-semibold transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-foreground/85 hover:border-white/25 hover:text-foreground',
      )}
    >
      {children}
    </button>
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

        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
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
              <h1 className="display-title text-5xl sm:text-6xl lg:text-7xl">{title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {loading ? 'Carregando camisas…' : `${filtered.length} ${filtered.length === 1 ? 'camisa' : 'camisas'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="relative flex h-12 min-w-0 flex-1 items-center sm:w-80 sm:flex-none">
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
                className="form-input h-12 w-[9.5rem] cursor-pointer appearance-none rounded-full py-0 pl-4 pr-9 text-sm font-semibold sm:w-48"
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
      </div>

      {/* Filtros de liga: grudam embaixo do cabeçalho ao rolar. */}
      <div className="sticky top-16 z-30 mt-8 border-y border-border bg-background/90 backdrop-blur-xl lg:top-[72px]">
        <div className="shelf mx-auto max-w-[1440px] gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <Chip active={!activeLeague} onClick={() => updateParams({ liga: null, time: null })}>
            <span className="ml-2.5">Todas</span>
          </Chip>
          {leagues.map((league) => (
            <Chip
              key={league.id}
              active={activeLeague?.id === league.id}
              onClick={() => updateParams({ liga: league.id, time: null })}
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-paper p-1">
                {league.logo_url && (
                  <img src={optimizedImageUrl(league.logo_url, 64)} alt="" className="size-full object-contain" loading="lazy" />
                )}
              </span>
              {league.name}
              {leagueCounts.get(league.id) ? (
                <span className="text-xs font-medium opacity-60">{leagueCounts.get(league.id)}</span>
              ) : null}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Escudos dos times da liga escolhida. */}
        {leagueTeams.length > 0 && (
          <div className="shelf -mx-4 mt-6 auto-cols-[5.5rem] gap-2 px-4 sm:-mx-6 sm:auto-cols-[6.5rem] sm:px-6 lg:-mx-8 lg:px-8">
            <button
              type="button"
              onClick={() => updateParams({ time: null })}
              aria-pressed={!activeTeam}
              className="group flex flex-col items-center gap-2 rounded-2xl p-2 text-center"
            >
              <span
                className={cn(
                  'flex size-16 items-center justify-center rounded-full border-2 text-xs font-extrabold uppercase transition-colors sm:size-[4.5rem]',
                  !activeTeam ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card group-hover:border-white/30',
                )}
              >
                Todos
              </span>
              <span className="text-xs font-semibold text-muted-foreground">Todos os times</span>
            </button>
            {leagueTeams.map((team) => {
              const active = activeTeam?.id === team.id
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => updateParams({ time: active ? null : team.id })}
                  aria-pressed={active}
                  className="group flex flex-col items-center gap-2 rounded-2xl p-2 text-center"
                >
                  <span
                    className={cn(
                      'flex size-16 items-center justify-center rounded-full border-2 bg-card p-2.5 transition-[border-color,transform] sm:size-[4.5rem]',
                      active ? 'border-primary' : 'border-border group-hover:-translate-y-0.5 group-hover:border-white/30',
                    )}
                  >
                    {team.logo_url && (
                      <img src={optimizedImageUrl(team.logo_url, 128)} alt="" loading="lazy" className="size-full object-contain" />
                    )}
                  </span>
                  <span className={cn('line-clamp-2 text-xs font-semibold leading-tight', active ? 'text-foreground' : 'text-muted-foreground')}>
                    {team.name}
                  </span>
                </button>
              )
            })}
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
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 2xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
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
              <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 2xl:grid-cols-5">
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
  )
}
