import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, LogOut, ArrowLeft, Tag, Settings, Trophy, Menu, X, Users } from 'lucide-react'

import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'

const links = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
  { name: 'Produtos', path: '/admin/produtos', icon: Package },
  { name: 'Pedidos', path: '/admin/pedidos', icon: ShoppingCart },
  { name: 'Usuários', path: '/admin/usuarios', icon: Users },
  { name: 'Cupons', path: '/admin/cupons', icon: Tag },
  { name: 'Ligas & Times', path: '/admin/ligas', icon: Trophy },
  { name: 'Configurações', path: '/admin/configuracoes', icon: Settings },
]

function Brand() {
  return (
    <Link to="/admin" className="flex items-center gap-3">
      <img src="/store-fanatic.jpg" alt="" className="size-10 rounded-xl border border-white/10 object-cover" />
      <span>
        <span className="display-title block text-xl leading-none">
          Store <span className="text-primary">Fanatic</span>
        </span>
        <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Painel admin</span>
      </span>
    </Link>
  )
}

export function AdminLayout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isActive = (link: typeof links[0]) =>
    link.exact ? location.pathname === link.path : location.pathname.startsWith(link.path)

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const navigation = (
    <>
      <nav className="flex-1 space-y-1" aria-label="Admin">
        {links.map((link) => {
          const active = isActive(link)
          const Icon = link.icon
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setSidebarOpen(false)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors',
                active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {link.name}
            </Link>
          )
        })}
      </nav>

      <div className="space-y-1 border-t border-border pt-5">
        <Link
          to="/"
          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar à loja
        </Link>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="size-4" />
          Sair
        </button>
      </div>
    </>
  )

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-background text-foreground" translate="no">
      {/* Sidebar Desktop */}
      <aside className="relative z-10 hidden w-64 shrink-0 flex-col gap-8 border-r border-border bg-card p-5 lg:flex">
        <Brand />
        {navigation}
      </aside>

      {/* Mobile Header */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur-xl lg:hidden">
        <Brand />
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menu"
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full w-72 flex-col gap-8 border-r border-border bg-card p-5 transition-transform duration-300 lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between">
          <Brand />
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Fechar menu"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
        {navigation}
      </aside>

      {/* Main Content */}
      <main className="relative z-10 flex-1 overflow-y-auto pt-16 lg:pt-0">
        <Outlet />
      </main>
    </div>
  )
}
