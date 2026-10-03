import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown,
  Flame,
  LogIn,
  LogOut,
  Menu,
  Package,
  Pause,
  Play,
  Search,
  Shield,
  ShoppingBag,
  User,
  X,
} from 'lucide-react'

import { Button } from '../ui/button'
import { Marquee } from '../ui/marquee'
import { useCartStore } from '../../store/cartStore'
import { useAuth } from '../../lib/useAuth'
import { useSettings } from '../../lib/useSettings'
import { fetchLeaguesAndTeams, type ShowcaseLeague } from '../../lib/catalog'
import { optimizedImageUrl } from '../../lib/assets'
import { cn, formatPrice } from '../../lib/utils'

const NAV_ITEMS = [
  { label: 'Início', to: '/' },
  { label: 'Camisas', to: '/produtos' },
  { label: 'Seleções', to: '/produtos?liga=selecoes' },
  { label: 'Brasileirão', to: '/produtos?liga=brasileirao' },
]

function AnnouncementBar({ hidden }: { hidden: boolean }) {
  const { settings } = useSettings()
  const [paused, setPaused] = useState(false)
  const messages = [
    `Frete grátis acima de ${formatPrice(settings.shipping_free_threshold)}`,
    'Pagamento rápido via PIX',
    `Nome e número por + ${formatPrice(settings.personalization_price)}`,
    'Enviamos para todo o Brasil',
    'Atendimento direto no WhatsApp',
  ]

  return (
    <div
      className={cn(
        'grid bg-primary text-primary-foreground transition-[grid-template-rows] duration-300',
        hidden ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
      )}
    >
      <div className="relative overflow-hidden">
        <Marquee duration={45} paused={paused} className="h-9 items-center pr-10" itemsClassName="items-center gap-10 pr-10">
          {messages.map((message) => (
            <span key={message} className="inline-flex items-center gap-10 whitespace-nowrap text-xs font-bold uppercase tracking-[0.12em]">
              {message}
              <Flame className="size-3.5" aria-hidden />
            </span>
          ))}
        </Marquee>
        {/* Movimento automático precisa de pausa (WCAG 2.2.2). */}
        <button
          type="button"
          onClick={() => setPaused((v) => !v)}
          aria-pressed={paused}
          aria-label={paused ? 'Continuar avisos' : 'Pausar avisos'}
          tabIndex={hidden ? -1 : 0}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center bg-primary text-primary-foreground focus-visible:outline-primary-foreground motion-reduce:hidden"
        >
          {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
        </button>
      </div>
    </div>
  )
}

function LeaguesMenu({ leagues }: { leagues: ShowcaseLeague[] }) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<number>(undefined)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const show = () => {
    window.clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const hide = () => {
    closeTimer.current = window.setTimeout(() => setOpen(false), 120)
  }

  return (
    <div
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={() => window.clearTimeout(closeTimer.current)}
      onBlur={hide}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !open) return
        setOpen(false)
        buttonRef.current?.focus()
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground aria-expanded:text-foreground"
      >
        Ligas
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18 }}
            className="absolute left-1/2 top-full z-50 mt-3 w-[420px] -translate-x-1/2 rounded-2xl border border-border bg-popover p-2 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8)]"
          >
            <div className="grid grid-cols-2 gap-1">
              {leagues.map((league) => (
                <Link
                  key={league.id}
                  to={`/produtos?liga=${league.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-accent"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-paper p-1.5">
                    {league.logo_url && (
                      <img src={optimizedImageUrl(league.logo_url, 80)} alt="" className="size-full object-contain" loading="lazy" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">{league.name}</span>
                    {league.country && <span className="block text-xs text-muted-foreground">{league.country}</span>}
                  </span>
                </Link>
              ))}
            </div>
            <Link
              to="/produtos"
              onClick={() => setOpen(false)}
              className="mt-1 flex items-center justify-center rounded-xl bg-primary/10 px-3 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-primary transition-colors hover:bg-primary/20"
            >
              Ver todas as camisas
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { getTotalItems, toggleDrawer } = useCartStore()
  const totalItems = getTotalItems()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [leagues, setLeagues] = useState<ShowcaseLeague[]>([])
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { user, isAdmin, signOut } = useAuth()

  useEffect(() => {
    fetchLeaguesAndTeams()
      .then(({ leagues }) => setLeagues(leagues))
      .catch(() => {})
  }, [])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setUserMenuOpen(false)
    navigate('/')
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Menu do celular ocupa a tela: trava a rolagem do fundo.
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMenuOpen])

  const isActive = (to: string) => {
    const [path, query] = to.split('?')
    if (query) return location.pathname === path && location.search.includes(query)
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path) && !location.search.includes('liga=')
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <AnnouncementBar hidden={scrolled || isMenuOpen} />

      <div
        className={cn(
          'border-b transition-[background-color,border-color,box-shadow] duration-300',
          scrolled || isMenuOpen
            ? 'border-border bg-background/90 shadow-[0_10px_30px_-10px_rgb(0_0_0/0.6)] backdrop-blur-xl'
            : 'border-transparent bg-gradient-to-b from-background/90 to-background/0',
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:h-[72px] lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen((v) => !v)}
            className="-ml-2 text-foreground lg:hidden"
            aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>

          <Link to="/" className="flex min-w-0 items-center gap-2.5" aria-label="Store Fanatic, página inicial">
            <img
              src="/store-fanatic.jpg"
              alt=""
              className="size-10 shrink-0 rounded-xl border border-white/10 object-cover"
            />
            <span className="display-title truncate text-[1.375rem] tracking-[0.02em] text-foreground sm:text-2xl">
              Store <span className="text-primary">Fanatic</span>
            </span>
          </Link>

          <nav className="ml-6 hidden items-center lg:flex" aria-label="Principal">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'relative px-4 py-2 text-sm font-semibold transition-colors',
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item.label}
                  {active && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              )
            })}
            {leagues.length > 0 && <LeaguesMenu leagues={leagues} />}
          </nav>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" size="icon" asChild className="text-foreground">
              <Link to="/produtos?busca=1" aria-label="Buscar camisas">
                <Search className="size-5" />
              </Link>
            </Button>

            {user ? (
              <div ref={userMenuRef} className="relative hidden lg:block">
                <Button
                  variant="ghost"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-expanded={userMenuOpen}
                  className="gap-2 px-3 font-semibold text-foreground"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-black uppercase text-primary-foreground">
                    {user.email?.[0]}
                  </span>
                  <span className="max-w-[120px] truncate">{user.email?.split('@')[0]}</span>
                  <ChevronDown className={cn('transition-transform', userMenuOpen && 'rotate-180')} />
                </Button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl"
                    >
                      <div className="border-b border-border px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Minha conta</p>
                        <p className="mt-0.5 truncate text-sm text-foreground">{user.email}</p>
                      </div>
                      <div className="p-1.5">
                        {isAdmin && (
                          <Link
                            to="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                          >
                            <Shield className="size-4" />
                            Painel admin
                          </Link>
                        )}
                        <Link
                          to="/meus-pedidos"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-foreground/85 transition-colors hover:bg-accent hover:text-foreground"
                        >
                          <Package className="size-4 text-primary" />
                          Meus pedidos
                        </Link>
                        <button
                          onClick={handleSignOut}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <LogOut className="size-4" />
                          Sair
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Button variant="ghost" size="icon" asChild className="hidden text-foreground lg:inline-flex">
                <Link to="/login" aria-label="Entrar na minha conta">
                  <User className="size-5" />
                </Link>
              </Button>
            )}

            <Button
              onClick={toggleDrawer}
              className="relative gap-2 px-3 sm:px-4"
              aria-label={totalItems > 0 ? `Abrir sacola, ${totalItems} ${totalItems === 1 ? 'item' : 'itens'}` : 'Abrir sacola'}
            >
              <ShoppingBag className="size-[18px]" />
              <span className="hidden font-bold sm:inline">Sacola</span>
              <AnimatePresence>
                {totalItems > 0 && (
                  <motion.span
                    key={totalItems}
                    initial={{ scale: 0.4 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex h-5 min-w-5 items-center justify-center rounded-full bg-background px-1 text-[11px] font-black text-primary"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            aria-label="Menu"
            // Fecha ao tocar em qualquer link do menu.
            onClick={(event) => {
              if ((event.target as HTMLElement).closest('a')) setIsMenuOpen(false)
            }}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className="h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-background px-4 pb-10 pt-4 lg:hidden"
          >
            <div className="grid">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="display-title flex items-center justify-between border-b border-border py-4 text-4xl text-foreground"
                >
                  {item.label}
                  {isActive(item.to) && <span className="size-2.5 rounded-full bg-primary" aria-hidden />}
                </Link>
              ))}
            </div>

            {leagues.length > 0 && (
              <div className="mt-8">
                <p className="eyebrow">Ligas</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {leagues.map((league) => (
                    <Link
                      key={league.id}
                      to={`/produtos?liga=${league.id}`}
                      className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-paper p-1">
                        {league.logo_url && (
                          <img src={optimizedImageUrl(league.logo_url, 64)} alt="" className="size-full object-contain" loading="lazy" />
                        )}
                      </span>
                      <span className="truncate text-sm font-semibold">{league.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 grid gap-2">
              {user ? (
                <>
                  {isAdmin && (
                    <Link to="/admin" className="flex items-center gap-3 rounded-xl px-1 py-3 text-base font-semibold text-primary">
                      <Shield className="size-5" />
                      Painel admin
                    </Link>
                  )}
                  <Link to="/meus-pedidos" className="flex items-center gap-3 rounded-xl px-1 py-3 text-base font-semibold">
                    <Package className="size-5 text-primary" />
                    Meus pedidos
                  </Link>
                  <button onClick={handleSignOut} className="flex items-center gap-3 rounded-xl px-1 py-3 text-left text-base font-semibold text-muted-foreground">
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
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  )
}
