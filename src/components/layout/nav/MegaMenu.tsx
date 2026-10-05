import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ChevronDown, LayoutGrid } from 'lucide-react'

import { LeagueRow } from '@/components/product/LeagueRow'
import { CrestDock } from '@/components/ui/crest-dock'
import { optimizedImageUrl } from '@/lib/assets'
import { displayProductName, productName, type ShowcaseLeague } from '@/lib/catalog'
import { cn } from '@/lib/utils'
import { TextRoll } from './TextRoll'
import type { LeagueShowcase } from './useNavData'

const EASE_OUT = [0.23, 1, 0.32, 1] as const

/**
 * "Camisas" no menu do desktop: o texto leva ao catálogo; passar o mouse (ou
 * a setinha, no teclado/toque) abre o painel com as ligas à esquerda e as
 * camisas e escudos da liga em foco à direita. O painel ancora na barra do
 * cabeçalho (o <li> é static).
 */
export function MegaMenu({
  leagues,
  showcase,
  teamName,
  active = false,
  highlighted = false,
  onHighlight,
}: {
  leagues: ShowcaseLeague[]
  showcase: Map<string, LeagueShowcase>
  teamName: Map<string, string>
  /** Página atual é o catálogo. */
  active?: boolean
  /** Pílula de hover compartilhada com os outros links do menu. */
  highlighted?: boolean
  onHighlight?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const openTimer = useRef<number>(undefined)
  const closeTimer = useRef<number>(undefined)
  const triggerRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const preloaded = useRef(false)
  const reduce = useReducedMotion() ?? false

  const current = leagues.find((l) => l.id === activeId) ?? leagues[0]
  const data = current ? showcase.get(current.id) : undefined
  // 4 das 8 camisas em destaque, pulando de duas em duas para variar os times.
  const picks = (data?.picks ?? []).filter((_, i) => i % 2 === 0).slice(0, 4)
  const total = [...showcase.values()].reduce((sum, d) => sum + d.count, 0)

  // Na primeira aproximação do mouse, baixa as fotos de todas as ligas:
  // quando o painel abre (90 ms depois) elas já estão chegando.
  const preload = () => {
    if (preloaded.current || showcase.size === 0) return
    preloaded.current = true
    for (const league of showcase.values()) {
      league.picks.filter((_, i) => i % 2 === 0).slice(0, 4).forEach((p) => (new Image().src = optimizedImageUrl(p.image_url, 360)))
      league.topTeams.forEach((t) => t.logo_url && (new Image().src = optimizedImageUrl(t.logo_url, 64)))
    }
  }

  // Pequena intenção de hover para não abrir ao cruzar o mouse pelo menu.
  const scheduleOpen = () => {
    preload()
    window.clearTimeout(closeTimer.current)
    openTimer.current = window.setTimeout(() => setOpen(true), 90)
  }
  const scheduleClose = () => {
    window.clearTimeout(openTimer.current)
    closeTimer.current = window.setTimeout(() => setOpen(false), 160)
  }
  const cancelClose = () => window.clearTimeout(closeTimer.current)

  useEffect(() => {
    if (!open) return
    const onDown = (event: globalThis.MouseEvent) => {
      const target = event.target as Node
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(
    () => () => {
      window.clearTimeout(openTimer.current)
      window.clearTimeout(closeTimer.current)
    },
    [],
  )

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !open) return
    setOpen(false)
    toggleRef.current?.focus()
  }

  // Qualquer link clicado (no painel ou o próprio "Camisas") fecha o menu.
  const closeOnLink = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('a')) setOpen(false)
  }

  return (
    <li className="static" onMouseEnter={onHighlight}>
      <div
        ref={triggerRef}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        onKeyDown={onKeyDown}
        onClick={closeOnLink}
        className="relative flex items-center rounded-full"
      >
        {highlighted && (
          <motion.span
            layoutId="nav-hover"
            className="absolute inset-0 rounded-full bg-white/[0.07]"
            transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
          />
        )}
        <Link
          to="/produtos"
          aria-current={active ? 'page' : undefined}
          className={cn(
            'roll-trigger relative flex items-center py-2 pl-4 pr-1 text-sm font-semibold transition-colors duration-150',
            active || open ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          <TextRoll text="Camisas" />
          {active && (
            <motion.span
              layoutId="nav-active"
              className="absolute bottom-0.5 left-4 right-1 h-0.5 rounded-full bg-primary"
              transition={{ type: 'spring', duration: 0.4, bounce: 0.1 }}
            />
          )}
        </Link>
        <button
          ref={toggleRef}
          type="button"
          aria-expanded={open}
          aria-controls="mega-camisas"
          aria-label={open ? 'Fechar ligas' : 'Mostrar ligas'}
          onClick={() => {
            preload()
            setOpen((v) => !v)
          }}
          className="relative mr-1 flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 hover:text-foreground aria-expanded:text-foreground"
        >
          <ChevronDown className={cn('size-4 transition-transform duration-200', open && 'rotate-180')} aria-hidden />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mega-camisas"
            ref={panelRef}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            onKeyDown={onKeyDown}
            onClick={closeOnLink}
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-6px) scale(0.985)' }}
            animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
            exit={{ opacity: 0, transform: reduce ? 'none' : 'translateY(-4px) scale(0.99)', transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            style={{ transformOrigin: 'top center' }}
            className="absolute left-1/2 top-full z-50 w-[min(1100px,calc(100vw-2rem))] -translate-x-1/2 pt-2.5"
          >
            <div className="grid grid-cols-[17rem_1fr] overflow-hidden rounded-3xl border border-white/10 bg-popover/95 shadow-[0_40px_80px_-30px_rgb(0_0_0/0.9)] backdrop-blur-xl">
              <div className="flex flex-col gap-0.5 border-r border-border p-3">
                <LeagueRow
                  to="/produtos"
                  active={false}
                  icon={<LayoutGrid className="size-4" />}
                  name="Todas as camisas"
                  count={total}
                />
                <div className="my-1.5 h-px bg-border" />
                {leagues.length === 0 &&
                  Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-muted" />)}
                {leagues.map((league) => (
                  <LeagueRow
                    key={league.id}
                    to={`/produtos?liga=${league.id}`}
                    active={league.id === current?.id}
                    logoUrl={league.logo_url}
                    name={league.name}
                    count={showcase.get(league.id)?.count}
                    onMouseEnter={() => setActiveId(league.id)}
                    onFocus={() => setActiveId(league.id)}
                  />
                ))}
              </div>

              {current && (
                // Troca de liga: entra rápido com um leve desfoque (sem esperar a saída da anterior).
                <motion.div
                  key={current.id}
                  initial={reduce ? false : { opacity: 0, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  transition={{ duration: 0.16, ease: EASE_OUT }}
                  className="p-6"
                >
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      {current.country && (
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{current.country}</p>
                      )}
                      <p className="display-title mt-1 text-4xl">{current.name}</p>
                    </div>
                    <Link
                      to={`/produtos?liga=${current.id}`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-input px-4 py-2 text-sm font-bold transition-colors duration-150 hover:border-white/50"
                    >
                      Ver {data?.count ? `as ${data.count} camisas` : 'camisas'}
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </div>

                  <ul className="mt-5 grid grid-cols-4 gap-3">
                    {picks.length > 0
                      ? picks.map((product) => (
                          <li key={product.id}>
                            <Link to={`/produtos/${product.id}`} className="group block">
                              <span className="block overflow-hidden rounded-2xl bg-muted">
                                <img
                                  src={optimizedImageUrl(product.image_url, 360)}
                                  alt=""
                                  className="aspect-[4/5] w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.04]"
                                />
                              </span>
                              <span className="mt-2 block truncate text-sm font-semibold">
                                {teamName.get(`${product.league}:${product.team}`) ?? displayProductName(productName(product))}
                              </span>
                            </Link>
                          </li>
                        ))
                      : Array.from({ length: 4 }).map((_, i) => (
                          <li key={i} className="aspect-[4/5] animate-pulse rounded-2xl bg-muted" />
                        ))}
                  </ul>

                  {data && data.topTeams.length > 0 && (
                    <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Times</p>
                      <CrestDock className="pt-2">
                        {data.topTeams.map((team) => (
                            <Link
                              key={team.id}
                              to={`/produtos?liga=${team.league_id}&time=${team.id}`}
                              title={team.name}
                              aria-label={team.name}
                              className="flex size-10 items-center justify-center rounded-full border border-border bg-card p-1.5 transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-white/30"
                            >
                              {team.logo_url && (
                                <img src={optimizedImageUrl(team.logo_url, 64)} alt="" className="size-full object-contain" />
                              )}
                            </Link>
                        ))}
                      </CrestDock>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}
