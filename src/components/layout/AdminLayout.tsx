import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, LogOut, ArrowLeft, Tag, Settings, Trophy, Menu, X, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { CyberBackground } from '../ui/CyberBackground'

const links = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, exact: true },
  { name: 'Produtos', path: '/admin/produtos', icon: Package },
  { name: 'Pedidos', path: '/admin/pedidos', icon: ShoppingCart },
  { name: 'Usuários', path: '/admin/usuarios', icon: Users },
  { name: 'Cupons', path: '/admin/cupons', icon: Tag },
  { name: 'Ligas & Times', path: '/admin/ligas', icon: Trophy },
  { name: 'Configurações', path: '/admin/configuracoes', icon: Settings },
]

export function AdminLayout() {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isActive = (link: typeof links[0]) =>
    link.exact ? location.pathname === link.path : location.pathname.startsWith(link.path)

  const SidebarContent = () => (
    <>
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-display font-bold uppercase tracking-widest text-primary">Admin Panel</h2>
        <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Store Fanatic</p>
      </div>

      <nav className="flex-1 space-y-1">
        {links.map((link) => {
          const active = isActive(link)
          const Icon = link.icon
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-sans text-xs font-semibold uppercase tracking-wider transition-colors ${
                active
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.name}
            </Link>
          )
        })}
      </nav>

      <div className="pt-6 border-t border-white/10 space-y-1">
        <Link
          to="/"
          className="flex items-center gap-3 px-4 py-3 rounded-lg font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar à Loja
        </Link>
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            window.location.href = '/'
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-sans text-xs font-semibold uppercase tracking-wider text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </>
  )

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-[#030303] text-white" translate="no">
      <CyberBackground />

      {/* Sidebar Desktop */}
      <aside className="relative z-10 hidden lg:flex w-64 flex-col gap-8 border-r border-white/10 bg-black/45 p-6 backdrop-blur-xl">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div>
          <h2 className="text-base font-display font-bold uppercase tracking-widest text-primary">Admin Panel</h2>
          <p className="font-sans text-[9px] uppercase tracking-[0.2em] text-muted-foreground">Store Fanatic</p>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-72 flex flex-col gap-8 border-r border-white/10 bg-[#0a0a0a] p-6 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-display font-bold uppercase tracking-widest text-primary">Admin Panel</h2>
            <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Store Fanatic</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1">
          {links.map((link) => {
            const active = isActive(link)
            const Icon = link.icon
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-sans text-xs font-semibold uppercase tracking-wider transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {link.name}
              </Link>
            )
          })}
        </nav>

        <div className="pt-6 border-t border-white/10 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-white/5 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar à Loja
          </Link>
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/'
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-sans text-xs font-semibold uppercase tracking-wider text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative z-10 flex-1 overflow-y-auto lg:pt-0 pt-14">
        <Outlet />
      </main>
    </div>
  )
}
