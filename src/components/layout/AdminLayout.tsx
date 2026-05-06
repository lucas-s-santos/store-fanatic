import { Link, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, LogOut, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export function AdminLayout() {
  const location = useLocation()

  const links = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Produtos', path: '/admin/produtos', icon: Package },
    { name: 'Pedidos', path: '/admin/pedidos', icon: ShoppingCart },
  ]

  return (
    <div className="flex min-h-screen bg-[#030303] text-white">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-black/50 p-6 flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-display font-bold uppercase tracking-widest text-primary">Admin Panel</h2>
          <p className="font-sans text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Store Fanatic</p>
        </div>

        <nav className="flex-1 space-y-2">
          {links.map((link) => {
            const isActive = location.pathname === link.path
            const Icon = link.icon
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-sans text-xs font-semibold uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {link.name}
              </Link>
            )
          })}
        </nav>

        <div className="pt-6 border-t border-white/10 space-y-2">
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
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
