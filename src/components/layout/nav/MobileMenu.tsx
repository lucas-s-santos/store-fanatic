import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { User } from '@supabase/supabase-js'
import { ArrowRight, LogIn, LogOut, Package, Shield, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { optimizedImageUrl } from '@/lib/assets'
import type { ShowcaseLeague } from '@/lib/catalog'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { cn } from '@/lib/utils'
import type { LeagueShowcase } from './useNavData'

const EASE_OUT = [0.23, 1, 0.32, 1] as const
const EASE_DRAWER = [0.32, 0.72, 0, 1] as const

export interface NavItem {
  label: string
  to: string
}

/**
 * Menu do celular em tela cheia: entra como uma cortina (clip-path) com a
 * curva de gaveta do iOS; links e ligas aparecem em cascata curta.
 */
export function MobileMenu({
  open,
  onClose,
  items,
  isActive,
  leagues,
  showcase,
  user,
  isAdmin,
  onSignOut,
}: {
  open: boolean
  onClose: () => void
  items: NavItem[]
  isActive: (to: string) => boolean
  leagues: ShowcaseLeague[]
  showcase: Map<string, LeagueShowcase>
  user: User | null
  isAdmin: boolean
  onSignOut: () => void
}) {
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

  // Cascata: 50 ms entre itens, começando logo depois da cortina abrir.
  const item = (index: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, transform: 'translateY(20px)' },
          animate: { opacity: 1, transform: 'translateY(0px)' },
          transition: { duration: 0.45, ease: EASE_OUT, delay: 0.12 + index * 0.05 },
        }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          initial={reduce ? { opacity: 0 } : { clipPath: 'inset(0% 0% 100% 0%)' }}
          animate={reduce ? { opacity: 1 } : { clipPath: 'inset(0% 0% 0% 0%)' }}
          exit={
            reduce
              ? { opacity: 0, transition: { duration: 0.15 } }
              : { clipPath: 'inset(0% 0% 100% 0%)', transition: { duration: 0.3, ease: [0.77, 0, 0.175, 1] } }
          }
          transition={{ duration: 0.5, ease: EASE_DRAWER }}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a')) onClose()
          }}
          className="fixed inset-0 z-[55] flex flex-col overflow-y-auto bg-background lg:hidden"
        >
          <div className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-xl">
            <Link to="/" className="flex items-center gap-2.5" aria-label="Store Fanatic, página inicial">
              <img src="/store-fanatic.jpg" alt="" className="size-9 rounded-xl border border-white/10 object-cover" />
              <span className="display-title text-xl">
                Store <span className="text-primary">Fanatic</span>
              </span>
            </Link>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar menu">
              <X className="size-5" />
            </Button>
          </div>

          <div className="flex-1 px-4 pb-10 pt-4">
            <nav aria-label="Principal">
              <ol>
                {items.map((navItem, index) => {
                  const active = isActive(navItem.to)
                  return (
                    <motion.li key={navItem.to} {...item(index)}>
                      <Link
                        to={navItem.to}
                        aria-current={active ? 'page' : undefined}
                        className="flex items-baseline justify-between border-b border-border py-4 active:opacity-70"
                      >
                        <span className={cn('display-title text-5xl', active && 'text-primary')}>{navItem.label}</span>
                        <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, '0')}</span>
                      </Link>
                    </motion.li>
                  )
                })}
              </ol>
            </nav>

            {leagues.length > 0 && (
              <section className="mt-8" aria-label="Ligas">
                <motion.p className="eyebrow" {...item(items.length)}>
                  Ligas
                </motion.p>
                <ul className="mt-3 grid grid-cols-2 gap-2">
                  {leagues.map((league, index) => {
                    const data = showcase.get(league.id)
                    return (
                      <motion.li key={league.id} {...item(items.length + 1 + index * 0.5)}>
                        <Link
                          to={`/produtos?liga=${league.id}`}
                          className="relative flex h-28 flex-col justify-end overflow-hidden rounded-2xl bg-muted p-3 active:scale-[0.98] transition-transform duration-150"
                        >
                          {data?.cover && (
                            <img
                              src={optimizedImageUrl(data.cover, 320)}
                              alt=""
                              loading="lazy"
                              className="absolute inset-0 size-full object-cover"
                            />
                          )}
                          <span className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" aria-hidden />
                          <span className="relative flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-paper p-1">
                              {league.logo_url && (
                                <img src={optimizedImageUrl(league.logo_url, 56)} alt="" className="size-full object-contain" />
                              )}
                            </span>
                            <span className="truncate text-sm font-bold">{league.name}</span>
                          </span>
                        </Link>
                      </motion.li>
                    )
                  })}
                </ul>
                <motion.div {...item(items.length + 2 + leagues.length * 0.5)}>
                  <Link
                    to="/produtos"
                    className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-primary/10 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-primary"
                  >
                    Todas as camisas
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </motion.div>
              </section>
            )}

            <div className="mt-8 grid gap-1">
              {user ? (
                <>
                  <p className="truncate pb-2 text-sm text-muted-foreground">{user.email}</p>
                  {isAdmin && (
                    <Link to="/admin" className="flex items-center gap-3 rounded-xl py-3 text-base font-semibold text-primary">
                      <Shield className="size-5" />
                      Painel admin
                    </Link>
                  )}
                  <Link to="/meus-pedidos" className="flex items-center gap-3 rounded-xl py-3 text-base font-semibold">
                    <Package className="size-5 text-primary" />
                    Meus pedidos
                  </Link>
                  <button onClick={onSignOut} className="flex items-center gap-3 rounded-xl py-3 text-left text-base font-semibold text-muted-foreground">
                    <LogOut className="size-5" />
                    Sair
                  </button>
                </>
              ) : (
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link to="/login">
                    <LogIn />
                    Entrar ou criar conta
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
