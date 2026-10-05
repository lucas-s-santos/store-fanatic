import { useRef, useState, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

import { useNavData } from '@/components/layout/nav/useNavData'
import { LeagueRow } from '@/components/product/LeagueRow'
import { ProductCard, ProductCardSkeleton } from '@/components/product/ProductCard'
import { Button } from '@/components/ui/button'
import { optimizedImageUrl } from '@/lib/assets'
import { SectionHeading } from './SectionHeading'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

/**
 * Vitrine da home: todas as camisas num lugar só, no mesmo formato do mega
 * menu (ligas de um lado, camisas da liga escolhida do outro).
 */
export function LeagueShowcase() {
  const { leagues, showcase, teamName } = useNavData()
  const [activeId, setActiveId] = useState<string | null>(null)
  const tabsRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion() ?? false

  const current = leagues.find((l) => l.id === activeId) ?? leagues[0]
  const data = current ? showcase.get(current.id) : undefined
  const loading = !data || data.picks.length === 0

  // Abas: setas trocam a liga e levam o foco junto (padrão de tablist).
  const onKeyDown = (event: KeyboardEvent) => {
    const keys = ['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft']
    if (!keys.includes(event.key) || !current) return
    event.preventDefault()
    const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1
    const index = leagues.findIndex((l) => l.id === current.id)
    const next = leagues[(index + step + leagues.length) % leagues.length]
    setActiveId(next.id)
    tabsRef.current?.querySelector<HTMLElement>(`[data-league="${next.id}"]`)?.focus()
  }

  return (
    <section className="section-shell" aria-labelledby="vitrine-titulo">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Vitrine"
          title={
            <span id="vitrine-titulo">
              Escolha o <span className="text-highlight">seu campeonato</span>
            </span>
          }
          action={
            <Button asChild variant="outline" className="font-bold">
              <Link to="/produtos">
                Ver todas as camisas
                <ArrowRight />
              </Link>
            </Button>
          }
        />

        <div className="grid gap-6 lg:grid-cols-[17rem_1fr] lg:gap-8">
          {/* No celular as ligas rolam na horizontal; no desktop viram coluna. */}
          <div
            ref={tabsRef}
            role="tablist"
            aria-label="Ligas"
            onKeyDown={onKeyDown}
            className="-mx-4 flex snap-x scroll-px-4 gap-1.5 overflow-x-auto px-4 pb-1 sm:scroll-px-6 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-0.5 lg:self-start lg:overflow-visible lg:rounded-3xl lg:border lg:border-border lg:bg-card lg:p-3 lg:pb-3 [&::-webkit-scrollbar]:hidden"
          >
            {leagues.length === 0 &&
              Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 w-56 shrink-0 animate-pulse rounded-2xl bg-muted lg:w-full" />)}
            {leagues.map((league) => {
              const active = league.id === current?.id
              return (
                <LeagueRow
                  key={league.id}
                  role="tab"
                  aria-selected={active}
                  aria-controls="vitrine-painel"
                  tabIndex={active ? 0 : -1}
                  data-league={league.id}
                  active={active}
                  logoUrl={league.logo_url}
                  name={league.name}
                  count={showcase.get(league.id)?.count}
                  onClick={() => setActiveId(league.id)}
                  className="max-lg:w-56 max-lg:shrink-0 max-lg:snap-start max-lg:border max-lg:border-border max-lg:bg-card"
                />
              )
            })}
          </div>

          <div id="vitrine-painel" role="tabpanel" aria-label={current?.name}>
            {current && (
              <motion.div
                key={current.id}
                initial={reduce ? false : { opacity: 0, filter: 'blur(4px)' }}
                animate={{ opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
              >
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    {current.country && (
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{current.country}</p>
                    )}
                    <p className="display-title mt-1 text-4xl sm:text-5xl">{current.name}</p>
                  </div>
                  <Link
                    to={`/produtos?liga=${current.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-input px-4 py-2 text-sm font-bold transition-colors duration-150 hover:border-white/50"
                  >
                    Ver {data?.count ? `as ${data.count} camisas` : 'camisas'}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5 xl:grid-cols-4">
                  {loading
                    ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
                    : data.picks.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          eyebrow={teamName.get(`${product.league}:${product.team}`)}
                        />
                      ))}
                </div>

                {data && data.topTeams.length > 0 && (
                  <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border pt-5">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Times</p>
                    <ul className="flex flex-wrap gap-1.5">
                      {data.topTeams.map((team) => (
                        <li key={team.id}>
                          <Link
                            to={`/produtos?liga=${team.league_id}&time=${team.id}`}
                            title={team.name}
                            aria-label={team.name}
                            className="flex size-11 items-center justify-center rounded-full border border-border bg-card p-1.5 transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-white/30"
                          >
                            {team.logo_url && <img src={optimizedImageUrl(team.logo_url, 64)} alt="" className="size-full object-contain" loading="lazy" />}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
