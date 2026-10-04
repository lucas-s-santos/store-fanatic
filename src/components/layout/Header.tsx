import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Flame, LogOut, Menu, Package, Pause, Play, Search, Shield, ShoppingBag, User } from 'lucide-react'

import { Button } from '../ui/button'
import { Marquee } from '../ui/marquee'
import { BottomTabBar } from './nav/BottomTabBar'
import { useShowTabBar } from './nav/useShowTabBar'
import { MegaMenu } from './nav/MegaMenu'
import { MobileMenu, type NavItem } from './nav/MobileMenu'
import { TextRoll } from './nav/TextRoll'
import { useNavData } from './nav/useNavData'
import { useCartStore } from '../../store/cartStore'
import { useAuth } from '../../lib/useAuth'
import { useSettings } from '../../lib/useSettings'
import { cn, formatPrice } from '../../lib/utils'

const NAV_ITEMS: NavItem[] = [
  { label: 'Início', to: '/' },
  { label: 'Camisas', to: '/produtos' },
  { label: 'Seleções', to: '/produtos?liga=selecoes' },
  { label: 'Brasileirão', to: '/produtos?liga=brasileirao' },
]

/** A partir daqui o cabeçalho vira a pílula flutuante. */
const FLOAT_AFTER = 80

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
        'grid bg-primary text-primary-foreground transition-[grid-template-rows] duration-300 ease-[var(--ease-out-strong)]',
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

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { getTotalItems, toggleDrawer } = useCartStore()
  const totalItems = getTotalItems()
  const [menuOpen, setMenuOpen] = useState(false)
  const [floating, setFloating] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { user, isAdmin, signOut } = useAuth()
  const { leagues, showcase, teamName } = useNavData()
  const showTabBar = useShowTabBar()

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  useEffect(() => {
    const onScroll = () => setFloating(window.scrollY > FLOAT_AFTER)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const closeMenu = useCallback(() => setMenuOpen(false), [])

  const handleSignOut = async () => {
    await signOut()
    setUserMenuOpen(false)
    setMenuOpen(false)
    navigate('/')
  }

  const isActive = (to: string) => {
    const [path, query] = to.split('?')
    if (query) return location.pathname === path && location.search.includes(query)
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path) && !location.search.includes('liga=')
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50">
        <AnnouncementBar hidden={floating} />

        <div className="relative">
          {/* Desfoque progressivo: só quando a pílula flutua sobre o conteúdo. */}
          <div
            aria-hidden
            className={cn(
              'progressive-blur pointer-events-none absolute inset-x-0 top-0 -z-10 h-[68px] transition-opacity duration-300 lg:h-[76px]',
              floating ? 'opacity-100' : 'opacity-0',
            )}
          />

          <div
            className={cn(
              'transition-[padding,background-color] duration-500 ease-[var(--ease-out-strong)]',
              floating ? 'px-2 pt-2 sm:px-3 lg:pt-3' : 'bg-gradient-to-b from-background/90 to-background/0',
            )}
          >
            <div
              className={cn(
                'relative mx-auto flex items-center gap-2 border transition-[max-width,height,border-radius,background-color,border-color,box-shadow,padding] duration-500 ease-[var(--ease-out-strong)]',
                floating
                  ? 'h-14 max-w-[1040px] rounded-[28px] border-white/10 bg-popover/80 px-2 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.85)] backdrop-blur-xl sm:px-3'
                  : 'h-16 max-w-[1440px] rounded-none border-transparent px-4 sm:px-6 lg:h-[72px] lg:px-8',
              )}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMenuOpen(true)}
                className="text-foreground lg:hidden"
                aria-label="Abrir menu"
                aria-expanded={menuOpen}
              >
                <Menu className="size-5" />
              </Button>

              <Link to="/" className="flex min-w-0 items-center gap-2.5 rounded-full pr-1" aria-label="Store Fanatic, página inicial">
                <img
                  src="/store-fanatic.jpg"
                  alt=""
                  className={cn(
                    'shrink-0 rounded-xl border border-white/10 object-cover transition-[width,height] duration-500 ease-[var(--ease-out-strong)]',
                    floating ? 'size-9' : 'size-10',
                  )}
                />
                <span className="display-title truncate text-[1.375rem] tracking-[0.02em] text-foreground sm:text-2xl">
                  Store <span className="text-primary">Fanatic</span>
                </span>
              </Link>

              <nav className="ml-4 hidden lg:block" aria-label="Principal" onMouseLeave={() => setHovered(null)}>
                <ul className="flex items-center">
                  {NAV_ITEMS.map((item) => {
                    const active = isActive(item.to)
                    return (
                      <li key={item.to} className="relative" onMouseEnter={() => setHovered(item.to)}>
                        <Link
                          to={item.to}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'roll-trigger relative flex items-center rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-150',
                            active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {hovered === item.to && (
                            <motion.span
                              layoutId="nav-hover"
                              className="absolute inset-0 rounded-full bg-white/[0.07]"
                              transition={{ type: 'spring', duration: 0.3, bounce: 0 }}
                            />
                          )}
                          <TextRoll text={item.label} className="relative" />
                          {active && (
                            <motion.span
                              layoutId="nav-active"
                              className="absolute inset-x-4 bottom-0.5 h-0.5 rounded-full bg-primary"
                              transition={{ type: 'spring', duration: 0.4, bounce: 0.1 }}
                            />
                          )}
                        </Link>
                      </li>
                    )
                  })}
                  <MegaMenu
                    leagues={leagues}
                    showcase={showcase}
                    teamName={teamName}
                    highlighted={hovered === 'ligas'}
                    onHighlight={() => setHovered('ligas')}
                  />
                </ul>
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
                      className="gap-2 px-2.5 font-semibold text-foreground"
                    >
                      <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-black uppercase text-primary-foreground">
                        {user.email?.[0]}
                      </span>
                      <span className={cn('max-w-[120px] truncate', floating && 'hidden xl:inline')}>{user.email?.split('@')[0]}</span>
                      <ChevronDown className={cn('transition-transform duration-200', userMenuOpen && 'rotate-180')} />
                    </Button>
                    <AnimatePresence>
                      {userMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, transform: 'translateY(-4px) scale(0.97)' }}
                          animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
                          exit={{ opacity: 0, transform: 'translateY(-4px) scale(0.97)', transition: { duration: 0.12 } }}
                          transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                          style={{ transformOrigin: 'top right' }}
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

                {/* No celular a sacola fica na barra de baixo (quando ela aparece). */}
                <Button
                  onClick={toggleDrawer}
                  className={cn('relative gap-2 px-3 sm:px-4', showTabBar && 'max-lg:hidden')}
                  aria-label={totalItems > 0 ? `Abrir sacola, ${totalItems} ${totalItems === 1 ? 'item' : 'itens'}` : 'Abrir sacola'}
                >
                  <ShoppingBag className="size-[18px]" />
                  <span className="hidden font-bold sm:inline">Sacola</span>
                  <AnimatePresence>
                    {totalItems > 0 && (
                      <motion.span
                        key={totalItems}
                        initial={{ opacity: 0, transform: 'scale(0.6)' }}
                        animate={{ opacity: 1, transform: 'scale(1)' }}
                        exit={{ opacity: 0, transform: 'scale(0.6)' }}
                        transition={{ type: 'spring', duration: 0.35, bounce: 0.3 }}
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
        </div>

        <MobileMenu
          open={menuOpen}
          onClose={closeMenu}
          items={NAV_ITEMS}
          isActive={isActive}
          leagues={leagues}
          showcase={showcase}
          user={user}
          isAdmin={isAdmin}
          onSignOut={handleSignOut}
        />
      </header>

      <BottomTabBar user={user} />
    </>
  )
}
