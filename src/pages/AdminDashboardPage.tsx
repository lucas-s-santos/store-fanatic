import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, ShoppingCart, Package, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    outOfStock: 0,
    pendingOrders: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      
      // Get Orders
      const { data: orders } = await supabase.from('orders').select('*')
      
      // Get Products
      const { data: products } = await supabase.from('products').select('*')
      
      if (orders && products) {
        const totalSales = orders
          .filter(o => o.status === 'pago' || o.status === 'enviado' || o.status === 'entregue')
          .reduce((acc, order) => acc + Number(order.total_amount), 0)
        
        const pendingOrders = orders.filter(o => o.status === 'aguardando_pagamento').length
        
        const outOfStock = products.filter(p => p.stock === 0).length

        setStats({
          totalSales,
          totalOrders: orders.length,
          outOfStock,
          pendingOrders,
        })
      }
      setLoading(false)
    }
    fetchStats()
  }, [])

  if (loading) {
    return <div className="p-10 text-white">Carregando dashboard...</div>
  }

  return (
    <div className="p-8 sm:p-12 space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold uppercase tracking-tight text-white mb-2">
          Dashboard
        </h1>
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Visão geral do sistema
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign className="w-16 h-16" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#25D366]/10 text-[#25D366] rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Faturamento
            </p>
          </div>
          <h3 className="text-3xl font-display font-bold text-white">
            R$ {stats.totalSales.toFixed(2).replace('.', ',')}
          </h3>
        </motion.div>

        {/* Card 2 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShoppingCart className="w-16 h-16" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Total Pedidos
            </p>
          </div>
          <h3 className="text-3xl font-display font-bold text-white">
            {stats.totalOrders}
          </h3>
        </motion.div>

        {/* Card 3 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Package className="w-16 h-16" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-[#FF9F43]/10 text-[#FF9F43] rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Aguardando Pgto
            </p>
          </div>
          <h3 className="text-3xl font-display font-bold text-white">
            {stats.pendingOrders}
          </h3>
        </motion.div>

        {/* Card 4 */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <AlertTriangle className="w-16 h-16" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-destructive/10 text-destructive rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Produtos Esgotados
            </p>
          </div>
          <h3 className="text-3xl font-display font-bold text-white">
            {stats.outOfStock}
          </h3>
        </motion.div>
      </div>
    </div>
  )
}
