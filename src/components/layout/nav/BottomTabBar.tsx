import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { User } from '@supabase/supabase-js'
import { Home, Shirt, ShoppingBag, UserRound, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'
import { useShowTabBar } from './useShowTabBar'

interface Tab {
  key: string
  label: string
  icon: LucideIcon
  active: boolean
  to?: string
  onClick?: () => void
  badge?: number
}

/** Atalhos fixos no celular, como em app de loja. Só o indicador ativo se move. */
export function BottomTabBar({ user }: { user: User | null }) {
  const { pathname } = useLocation()
  const show = useShowTabBar()
  const toggleDrawer = useCartStore((s) => s.toggleDrawer)
  const totalItems = useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0))

  if (!show) return null

  const tabs: Tab[] = [
    { key: 'home', label: 'Início', icon: Home, to: '/', active: pathname === '/' },
    { key: 'shop', label: 'Camisas', icon: Shirt, to: '/produtos', active: pathname.startsWith('/produtos') },
    { key: 'bag', label: 'Sacola', icon: ShoppingBag, onClick: toggleDrawer, active: false, badge: totalItems },
    {
      key: 'account',
      label: user ? 'Conta' : 'Entrar',
      icon: UserRound,
      to: user ? '/meus-pedidos' : '/login',
      active: /^\/(meus-pedidos|login|pedido)/.test(pathname),
    },
  ]

  return (
    <nav
      aria-label="Atalhos"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {tabs.map((tab) => {
          const content = (
            <>
              <span className="relative flex h-8 w-14 items-center justify-center">
                {tab.active && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute inset-0 rounded-full bg-primary/15"
                    transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
                  />
                )}
                <tab.icon className="relative size-5" aria-hidden />
                {tab.badge ? (
                  <span className="absolute right-2 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-primary-foreground">
                    {tab.badge}
                  </span>
                ) : null}
              </span>
              <span>{tab.label}</span>
            </>
          )
          const className = cn(
            'flex h-16 w-full flex-col items-center justify-center gap-0.5 text-[11px] font-bold transition-[color,transform] duration-150 active:scale-[0.96]',
            tab.active ? 'text-primary' : 'text-muted-foreground',
          )
          const label = tab.badge ? `${tab.label}, ${tab.badge} ${tab.badge === 1 ? 'item' : 'itens'}` : undefined

          return (
            <li key={tab.key}>
              {tab.to ? (
                <Link to={tab.to} aria-current={tab.active ? 'page' : undefined} className={className}>
                  {content}
                </Link>
              ) : (
                <button type="button" onClick={tab.onClick} aria-label={label} className={className}>
                  {content}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
