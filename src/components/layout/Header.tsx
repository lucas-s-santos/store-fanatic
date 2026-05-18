import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu, ShoppingBag, X, User, LogIn, Package, LogOut, ChevronDown, Shield } from 'lucide-react'

import { useCartStore } from '../../store/cartStore'
import { useAuth } from '../../lib/useAuth'

const NAV_ITEMS = [
  { label: 'Início', to: '/' },
  { label: 'Catálogo', to: '/produtos' },
]

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { getTotalItems, toggleDrawer } = useCartStore()
  const totalItems = getTotalItems()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { user, isAdmin, signOut } = useAuth()

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
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-white/[0.06] bg-background/80 shadow-[0_4px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-6 px-5 py-4 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-3.5">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-[30px]" />
            <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-background/90 shadow-xl">
              <img src="/store-fanatic.jpg" alt="Store Fanatic" className="h-full w-full object-cover" />
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/70">Store Fanatic</p>
            <p className="truncate text-xl font-display font-bold uppercase tracking-tight text-white">Loja de camisas</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = item.to === '/' ? location.pathname === item.to : location.pathname.startsWith(item.to)

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative px-5 py-2.5 text-sm font-semibold tracking-wide transition-colors ${
                  isActive ? 'text-white' : 'text-muted-foreground hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-x-2 -bottom-px h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {/* Botão de usuário */}
          {user ? (
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary/10"
              >
                <User className="h-4 w-4" />
                <span className="max-w-[120px] truncate">{user.email?.split('@')[0]}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-52 rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-white/[0.06]">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Minha conta</p>
                      <p className="mt-0.5 text-xs text-white truncate">{user.email}</p>
                    </div>
                    <div className="p-1.5">
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-primary/90 transition-colors hover:bg-primary/10 hover:text-primary font-semibold"
                        >
                          <Shield className="h-4 w-4" />
                          Admin Panel
                        </Link>
                      )}
                      <Link
                        to="/meus-pedidos"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
                      >
                        <Package className="h-4 w-4 text-primary" />
                        Meus pedidos
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                      >
                        <LogOut className="h-4 w-4" />
                        Sair
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-white/70 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-white"
            >
              <LogIn className="h-4 w-4" />
              Entrar
            </Link>
          )}

          <button
            onClick={toggleDrawer}
            className="relative flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.02] px-5 py-2.5 text-sm font-semibold text-white/70 transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-white hover:shadow-[0_0_20px_rgba(229,192,123,0.15)]"
            aria-label="Abrir carrinho"
          >
            <ShoppingBag className="h-4 w-4" />
            Carrinho
            <AnimatePresence>
              {totalItems > 0 && (
                <motion.span
                  key="badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
                >
                  {totalItems}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        <div className="flex items-center gap-2.5 lg:hidden">
          <button
            onClick={toggleDrawer}
            className="relative flex items-center justify-center rounded-sm border border-white/10 bg-white/[0.04] p-2.5"
            aria-label="Abrir carrinho"
          >
            <ShoppingBag className="h-4 w-4 text-white/70" />
            <AnimatePresence>
              {totalItems > 0 && (
                <motion.span
                  key="badge-mobile"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[9px] font-bold text-primary-foreground"
                >
                  {totalItems}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex items-center justify-center rounded-sm border border-white/10 bg-white/[0.04] p-2.5"
            aria-label="Abrir menu"
          >
            {isMenuOpen ? <X className="h-4 w-4 text-white/70" /> : <Menu className="h-4 w-4 text-white/70" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-white/[0.06] bg-background/95 backdrop-blur-3xl lg:hidden"
          >
            <div className="grid gap-1 px-5 pb-5 pt-3">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-lg px-4 py-3.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              <div className="my-1 h-px bg-white/[0.06]" />
              {user ? (
                <>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2.5 rounded-lg px-4 py-3.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                    >
                      <Shield className="h-4 w-4" />
                      Admin Panel
                    </Link>
                  )}
                  <Link
                    to="/meus-pedidos"
                    className="flex items-center gap-2.5 rounded-lg px-4 py-3.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white"
                  >
                    <Package className="h-4 w-4 text-primary" />
                    Meus pedidos
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-4 py-3.5 text-left text-sm font-medium text-white/50 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2.5 rounded-lg px-4 py-3.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.04] hover:text-white"
                >
                  <LogIn className="h-4 w-4 text-primary" />
                  Entrar / Cadastrar
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
