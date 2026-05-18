import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Search, X, Loader2, Package, Mail, Phone,
  Calendar, TrendingUp, ShoppingCart, ChevronRight,
  UserCheck, Clock, Shield, User,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface RawOrder {
  id: string
  user_id: string | null
  customer_name: string
  customer_email: string
  customer_phone: string
  total_amount: number
  status: string
  created_at: string
}

interface Profile {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  created_at: string
  role: 'user' | 'admin' | null
}

interface Customer {
  key: string
  userId: string | null
  name: string
  email: string
  phone: string
  memberSince: string
  ordersCount: number
  totalSpent: number
  lastOrderAt: string | null
  orders: RawOrder[]
  isRegistered: boolean
  role: 'user' | 'admin' | null
}

// ─── Config status ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  aguardando_pagamento: { label: 'Aguardando', color: 'text-[#FF9F43] bg-[#FF9F43]/10 border-[#FF9F43]/20' },
  pago:                { label: 'Pago',        color: 'text-[#25D366] bg-[#25D366]/10 border-[#25D366]/20' },
  enviado:             { label: 'Enviado',     color: 'text-primary bg-primary/10 border-primary/20' },
  entregue:            { label: 'Entregue',    color: 'text-[#25D366] bg-[#25D366]/10 border-[#25D366]/20' },
  cancelado:           { label: 'Cancelado',   color: 'text-destructive bg-destructive/10 border-destructive/20' },
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .split(' ').filter(Boolean).slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '').join('')

  const palette = [
    'from-primary/30 to-primary/10 text-primary',
    'from-[#25D366]/30 to-[#25D366]/10 text-[#25D366]',
    'from-[#FF9F43]/30 to-[#FF9F43]/10 text-[#FF9F43]',
    'from-blue-500/30 to-blue-500/10 text-blue-400',
    'from-purple-500/30 to-purple-500/10 text-purple-400',
  ]
  const color = palette[(name.charCodeAt(0) || 0) % palette.length]
  const sizes = { sm: 'h-8 w-8 text-[10px]', md: 'h-10 w-10 text-xs', lg: 'h-14 w-14 text-base' }

  return (
    <div className={`shrink-0 ${sizes[size]} flex items-center justify-center rounded-full bg-gradient-to-br border border-white/10 font-bold ${color}`}>
      {initials || '?'}
    </div>
  )
}

// ─── Modal de detalhes ────────────────────────────────────────────────────────

function CustomerModal({
  customer,
  onClose,
  onRoleChange,
}: {
  customer: Customer
  onClose: () => void
  onRoleChange: (userId: string, newRole: 'user' | 'admin') => Promise<void>
}) {
  const [updatingRole, setUpdatingRole] = useState(false)

  const spent = customer.orders
    .filter(o => ['pago', 'enviado', 'entregue'].includes(o.status))
    .reduce((acc, o) => acc + Number(o.total_amount), 0)

  const currentRole = customer.role ?? 'user'
  const nextRole: 'user' | 'admin' = currentRole === 'admin' ? 'user' : 'admin'

  async function handleRoleToggle() {
    if (!customer.userId) return
    setUpdatingRole(true)
    await onRoleChange(customer.userId, nextRole)
    setUpdatingRole(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.96, y: 20 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="custom-scrollbar relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-white/10 bg-[#0a0a0a] shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0a0a0a]/95 px-6 py-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Avatar name={customer.name} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-display font-bold uppercase tracking-tight text-white">
                  {customer.name}
                </h2>
                {customer.isRegistered && (
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                    Conta ativa
                  </span>
                )}
                {currentRole === 'admin' && (
                  <span className="rounded-full border border-[#a855f7]/40 bg-[#a855f7]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#a855f7] flex items-center gap-1">
                    <Shield className="h-2.5 w-2.5" />
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{customer.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Pedidos',     value: customer.ordersCount,    icon: ShoppingCart, color: 'text-primary' },
              { label: 'Total gasto', value: `R$ ${spent.toFixed(2).replace('.', ',')}`, icon: TrendingUp, color: 'text-[#25D366]' },
              { label: 'Cliente desde', value: new Date(customer.memberSince).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), icon: Calendar, color: 'text-[#FF9F43]' },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-center">
                <stat.icon className={`mx-auto mb-1.5 h-4 w-4 ${stat.color}`} />
                <p className="text-sm font-bold text-white">{stat.value}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Info */}
          <div className="space-y-2">
            <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Informações
            </h3>
            <div className="divide-y divide-white/[0.05] rounded-xl border border-white/10 bg-white/[0.02]">
              {[
                { icon: Mail,     label: 'E-mail',        value: customer.email || '—' },
                { icon: Phone,    label: 'Telefone',       value: customer.phone || 'Não informado' },
                { icon: Calendar, label: 'Primeiro pedido', value: new Date(customer.memberSince).toLocaleDateString('pt-BR') },
                { icon: Clock,    label: 'Último pedido',  value: customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString('pt-BR') : '—' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 px-4 py-3">
                  <item.icon className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                  <span className="w-28 shrink-0 text-[10px] text-muted-foreground">{item.label}</span>
                  <span className="truncate text-xs text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Gerenciamento de cargo */}
          {customer.isRegistered && customer.userId && (
            <div className="space-y-2">
              <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Cargo
              </h3>
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5">
                <div className="flex items-center gap-3">
                  {currentRole === 'admin' ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#a855f7]/15 border border-[#a855f7]/30">
                      <Shield className="h-4 w-4 text-[#a855f7]" />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] border border-white/10">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {currentRole === 'admin' ? 'Administrador' : 'Usuário'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {currentRole === 'admin'
                        ? 'Acesso total ao painel admin'
                        : 'Acesso somente à loja'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleRoleToggle}
                  disabled={updatingRole}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all disabled:opacity-50 ${
                    currentRole === 'admin'
                      ? 'border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20'
                      : 'border border-[#a855f7]/30 bg-[#a855f7]/10 text-[#a855f7] hover:bg-[#a855f7]/20'
                  }`}
                >
                  {updatingRole ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : currentRole === 'admin' ? (
                    <>
                      <User className="h-3.5 w-3.5" />
                      Rebaixar
                    </>
                  ) : (
                    <>
                      <Shield className="h-3.5 w-3.5" />
                      Tornar admin
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Pedidos */}
          <div className="space-y-2">
            <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Histórico de pedidos
            </h3>
            {customer.orders.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                <Package className="h-8 w-8 opacity-30" />
                <p className="text-sm">Nenhum pedido ainda.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {customer.orders.map(order => {
                  const st = STATUS_CONFIG[order.status] ?? { label: order.status, color: 'text-muted-foreground border-white/10 bg-white/5' }
                  return (
                    <li key={order.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                      <div>
                        <p className="font-mono text-[10px] font-bold text-primary/60">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${st.color}`}>
                        {st.label}
                      </span>
                      <span className="font-bold text-sm text-white">
                        R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AdminUsersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [selected, setSelected]   = useState<Customer | null>(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)

    const { data: ordersData } = await supabase
      .from('orders')
      .select('id, user_id, customer_name, customer_email, customer_phone, total_amount, status, created_at')
      .order('created_at', { ascending: false })

    const orders: RawOrder[] = (ordersData ?? []) as RawOrder[]

    let profiles: Profile[] = []
    try {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, created_at, role')
      profiles = (profilesData ?? []) as Profile[]
    } catch {
      // profiles table pode não existir ainda
    }

    const map = new Map<string, Customer>()

    for (const order of orders) {
      const key = (order.customer_email || '').toLowerCase() || order.user_id || order.id
      if (!map.has(key)) {
        map.set(key, {
          key,
          userId: order.user_id,
          name: order.customer_name || 'Cliente',
          email: order.customer_email || '',
          phone: order.customer_phone || '',
          memberSince: order.created_at,
          ordersCount: 0,
          totalSpent: 0,
          lastOrderAt: null,
          orders: [],
          isRegistered: !!order.user_id,
          role: null,
        })
      }

      const customer = map.get(key)!
      customer.orders.push(order)
      customer.ordersCount++
      if (['pago', 'enviado', 'entregue'].includes(order.status)) {
        customer.totalSpent += Number(order.total_amount)
      }
      if (new Date(order.created_at) < new Date(customer.memberSince)) {
        customer.memberSince = order.created_at
      }
      if (!customer.lastOrderAt || new Date(order.created_at) > new Date(customer.lastOrderAt)) {
        customer.lastOrderAt = order.created_at
      }
      if (order.user_id) customer.isRegistered = true
    }

    for (const profile of profiles) {
      const key = (profile.email || '').toLowerCase()
      if (map.has(key)) {
        const c = map.get(key)!
        if (profile.full_name) c.name = profile.full_name
        if (profile.phone)     c.phone = profile.phone
        if (new Date(profile.created_at) < new Date(c.memberSince)) {
          c.memberSince = profile.created_at
        }
        c.isRegistered = true
        c.role = profile.role ?? 'user'
        if (!c.userId) c.userId = profile.id
      } else {
        map.set(key || profile.id, {
          key: key || profile.id,
          userId: profile.id,
          name: profile.full_name || profile.email?.split('@')[0] || 'Usuário',
          email: profile.email || '',
          phone: profile.phone || '',
          memberSince: profile.created_at,
          ordersCount: 0,
          totalSpent: 0,
          lastOrderAt: null,
          orders: [],
          isRegistered: true,
          role: profile.role ?? 'user',
        })
      }
    }

    const list = Array.from(map.values()).sort(
      (a, b) => new Date(b.memberSince).getTime() - new Date(a.memberSince).getTime()
    )
    setCustomers(list)
    setLoading(false)
  }

  async function handleRoleChange(userId: string, newRole: 'user' | 'admin') {
    await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    setCustomers(prev =>
      prev.map(c => c.userId === userId ? { ...c, role: newRole } : c)
    )
    setSelected(prev =>
      prev?.userId === userId ? { ...prev, role: newRole } : prev
    )
  }

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
  })

  const totalClients = customers.length
  const registered   = customers.filter(c => c.isRegistered).length
  const admins       = customers.filter(c => c.role === 'admin').length

  return (
    <div className="p-4 sm:p-8 space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-[1.5rem] px-6 py-6 sm:px-8"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold uppercase tracking-tight text-white sm:text-3xl">
              Usuários
            </h1>
            <p className="mt-1 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Gerencie cargos e visualize clientes
            </p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail…"
              className="form-input h-10 pl-9 text-sm w-full sm:w-64"
            />
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total de clientes', value: totalClients, icon: Users,     color: 'text-primary',    bg: 'bg-primary/10' },
          { label: 'Com conta ativa',   value: registered,   icon: UserCheck, color: 'text-[#25D366]',  bg: 'bg-[#25D366]/10' },
          { label: 'Administradores',   value: admins,       icon: Shield,    color: 'text-[#a855f7]',  bg: 'bg-[#a855f7]/10' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="glass-card rounded-2xl p-5 relative overflow-hidden"
          >
            <div className="absolute right-4 top-4 opacity-[0.06]">
              <card.icon className="h-16 w-16" />
            </div>
            <div className={`mb-3 inline-flex rounded-lg p-2 ${card.bg} ${card.color}`}>
              <card.icon className="h-4 w-4" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{card.label}</p>
            {loading
              ? <div className="mt-1 h-8 w-16 animate-pulse rounded bg-white/10" />
              : <p className="mt-1 text-3xl font-display font-bold text-white">{card.value}</p>}
          </motion.div>
        ))}
      </div>

      {/* Tabela */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-[1.5rem] overflow-hidden"
      >
        {loading ? (
          <div className="flex justify-center p-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 p-16 text-center text-muted-foreground">
            <Users className="h-12 w-12 opacity-20" />
            <p className="text-sm">
              {search ? 'Nenhum cliente encontrado para essa busca.' : 'Nenhum cliente ainda.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    {['Cliente', 'Cargo', 'Desde', 'Pedidos', 'Total gasto', ''].map(h => (
                      <th key={h} className="px-5 py-4 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filtered.map(customer => (
                    <tr
                      key={customer.key}
                      onClick={() => setSelected(customer)}
                      className="group cursor-pointer transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={customer.name} size="sm" />
                          <div>
                            <p className="font-semibold text-white">{customer.name}</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground">{customer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {customer.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#a855f7]/30 bg-[#a855f7]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#a855f7]">
                            <Shield className="h-2.5 w-2.5" />
                            Admin
                          </span>
                        ) : customer.isRegistered ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                            <User className="h-2.5 w-2.5" />
                            Usuário
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(customer.memberSince).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-white">{customer.ordersCount}</span>
                      </td>
                      <td className="px-5 py-4 font-bold text-[#25D366]">
                        {customer.totalSpent > 0
                          ? `R$ ${customer.totalSpent.toFixed(2).replace('.', ',')}`
                          : <span className="text-muted-foreground font-normal">—</span>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground/30 transition-colors group-hover:text-primary" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-white/[0.04]">
              {filtered.map(customer => (
                <button
                  key={customer.key}
                  onClick={() => setSelected(customer)}
                  className="w-full px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={customer.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{customer.name}</p>
                        {customer.role === 'admin' && (
                          <Shield className="h-3 w-3 shrink-0 text-[#a855f7]" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">{customer.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {customer.totalSpent > 0 && (
                        <p className="text-sm font-bold text-[#25D366]">
                          R$ {customer.totalSpent.toFixed(2).replace('.', ',')}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {customer.ordersCount} pedido{customer.ordersCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {selected && (
          <CustomerModal
            customer={selected}
            onClose={() => setSelected(null)}
            onRoleChange={handleRoleChange}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
