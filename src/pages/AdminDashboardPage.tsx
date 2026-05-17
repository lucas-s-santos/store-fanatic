import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, ShoppingCart, Package, AlertTriangle, TrendingUp, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Order {
  id: string
  customer_name: string
  total_amount: number
  status: string
  payment_method: string
  created_at: string
}

interface TopProduct {
  product_title: string
  total_qty: number
  total_revenue: number
}

const STATUS_LABEL: Record<string, string> = {
  aguardando_pagamento: 'Aguardando',
  pago: 'Pago',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

const STATUS_COLOR: Record<string, string> = {
  aguardando_pagamento: 'text-[#FF9F43] bg-[#FF9F43]/10 border-[#FF9F43]/20',
  pago: 'text-[#25D366] bg-[#25D366]/10 border-[#25D366]/20',
  enviado: 'text-primary bg-primary/10 border-primary/20',
  entregue: 'text-white bg-white/10 border-white/20',
  cancelado: 'text-destructive bg-destructive/10 border-destructive/20',
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState({ totalSales: 0, totalOrders: 0, outOfStock: 0, pendingOrders: 0 })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)

      const [ordersRes, productsRes, itemsRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*'),
        supabase.from('order_items').select('product_title, quantity, price'),
      ])

      const orders: Order[] = ordersRes.data || []
      const products = productsRes.data || []
      const items = itemsRes.data || []

      // Stats
      const totalSales = orders
        .filter(o => ['pago', 'enviado', 'entregue'].includes(o.status))
        .reduce((acc, o) => acc + Number(o.total_amount), 0)

      setStats({
        totalSales,
        totalOrders: orders.length,
        outOfStock: products.filter(p => (p.stock ?? p.stock_quantity ?? 0) === 0).length,
        pendingOrders: orders.filter(o => o.status === 'aguardando_pagamento').length,
      })

      // Recent orders (last 8)
      setRecentOrders(orders.slice(0, 8))

      // Top products by quantity sold
      const map: Record<string, TopProduct> = {}
      for (const item of items) {
        const key = item.product_title || 'Sem título'
        if (!map[key]) map[key] = { product_title: key, total_qty: 0, total_revenue: 0 }
        map[key].total_qty += Number(item.quantity)
        map[key].total_revenue += Number(item.price) * Number(item.quantity)
      }
      const sorted = Object.values(map).sort((a, b) => b.total_qty - a.total_qty).slice(0, 5)
      setTopProducts(sorted)

      setLoading(false)
    }
    fetchAll()
  }, [])

  const cards = [
    {
      label: 'Faturamento Total',
      value: `R$ ${stats.totalSales.toFixed(2).replace('.', ',')}`,
      icon: DollarSign,
      color: 'text-[#25D366]',
      bg: 'bg-[#25D366]/10',
    },
    {
      label: 'Total de Pedidos',
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Aguardando Pgto',
      value: stats.pendingOrders,
      icon: Clock,
      color: 'text-[#FF9F43]',
      bg: 'bg-[#FF9F43]/10',
    },
    {
      label: 'Produtos Esgotados',
      value: stats.outOfStock,
      icon: AlertTriangle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
  ]

  return (
    <div className="p-6 sm:p-10 space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold uppercase tracking-tight text-white mb-1">Dashboard</h1>
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Visão geral do sistema
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="glass-card rounded-2xl p-6 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-[0.06]">
                <Icon className="w-20 h-20" />
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 ${card.bg} ${card.color} rounded-lg`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {card.label}
                </p>
              </div>
              {loading ? (
                <div className="h-9 w-24 rounded bg-white/10 animate-pulse" />
              ) : (
                <h3 className="text-3xl font-display font-bold text-white">{card.value}</h3>
              )}
            </motion.div>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl overflow-hidden xl:col-span-3"
        >
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-white">
              Pedidos Recentes
            </h2>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">Nenhum pedido ainda.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between px-6 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{order.customer_name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">
                      #{order.id.split('-')[0]} · {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className={`hidden sm:inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLOR[order.status] || 'text-muted-foreground border-white/10 bg-white/5'}`}>
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                    <span className="font-bold text-sm text-white">
                      R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl overflow-hidden xl:col-span-2"
        >
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-white">
              Top Produtos
            </h2>
          </div>
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : topProducts.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">Sem dados de vendas.</div>
          ) : (
            <div className="p-4 space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.product_title} className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-muted-foreground w-4 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{p.product_title}</p>
                    <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(p.total_qty / (topProducts[0]?.total_qty || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-primary shrink-0">{p.total_qty}x</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
