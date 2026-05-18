import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, X, Loader2, Truck, Search, Filter,
  Phone, Mail, MapPin, CreditCard, Tag, ChevronDown,
  CheckCircle2, Clock, XCircle, RotateCcw, Copy, ExternalLink,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Order {
  id: string
  customer_name: string
  customer_cpf: string
  customer_email: string
  customer_phone: string
  customer_address: string
  payment_method: string
  total_amount: number
  shipping_cost: number
  discount_amount: number
  coupon_code: string | null
  status: string
  tracking_code: string
  created_at: string
  mp_preference_id?: string
}

interface OrderItem {
  id: string
  product_title: string
  size: string
  quantity: number
  price: number
  personalization: { name?: string; number?: string }[] | null
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'aguardando_pagamento', label: 'Aguardando pagamento' },
  { value: 'pago', label: 'Pago' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  aguardando_pagamento: { label: 'Aguardando Pagamento', color: 'text-[#FF9F43] bg-[#FF9F43]/10 border-[#FF9F43]/30', icon: Clock },
  pago: { label: 'Pago', color: 'text-[#25D366] bg-[#25D366]/10 border-[#25D366]/30', icon: CheckCircle2 },
  enviado: { label: 'Enviado', color: 'text-primary bg-primary/10 border-primary/30', icon: Truck },
  entregue: { label: 'Entregue', color: 'text-white bg-white/10 border-white/20', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'text-destructive bg-destructive/10 border-destructive/30', icon: XCircle },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'text-muted-foreground border-white/10 bg-white/5', icon: Clock }
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={handleCopy}
      title="Copiar"
      className="ml-1 text-muted-foreground hover:text-primary transition-colors"
    >
      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-[#25D366]" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [trackingInput, setTrackingInput] = useState('')
  const [savingTracking, setSavingTracking] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => { fetchOrders() }, [])

  const fetchOrders = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setOrders(data || [])
    setLoading(false)
  }

  const handleViewOrder = async (order: Order) => {
    setSelectedOrder(order)
    setTrackingInput(order.tracking_code || '')
    setOrderItems([])
    setItemsLoading(true)
    const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id)
    setOrderItems(data || [])
    setItemsLoading(false)
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedOrder) return
    setStatusUpdating(true)
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', selectedOrder.id)
    if (!error) {
      const updated = { ...selectedOrder, status: newStatus }
      setSelectedOrder(updated)
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated : o))
    }
    setStatusUpdating(false)
  }

  const handleSaveTracking = async () => {
    if (!selectedOrder) return
    setSavingTracking(true)
    const { error } = await supabase
      .from('orders')
      .update({ tracking_code: trackingInput })
      .eq('id', selectedOrder.id)
    if (!error) {
      const updated = { ...selectedOrder, tracking_code: trackingInput }
      setSelectedOrder(updated)
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated : o))
    }
    setSavingTracking(false)
  }

  const filteredOrders = orders.filter(o => {
    const matchStatus = filterStatus === 'all' || o.status === filterStatus
    const term = searchTerm.toLowerCase()
    const matchSearch = !term ||
      o.customer_name?.toLowerCase().includes(term) ||
      o.customer_email?.toLowerCase().includes(term) ||
      o.customer_phone?.includes(term) ||
      o.id.includes(term)
    return matchStatus && matchSearch
  })

  const subtotal = selectedOrder
    ? (selectedOrder.total_amount ?? 0) + (selectedOrder.discount_amount ?? 0) - (selectedOrder.shipping_cost ?? 0)
    : 0

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
              Gerenciar Pedidos
            </h1>
            <p className="mt-1 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {orders.length} pedido{orders.length !== 1 ? 's' : ''} no total
            </p>
          </div>

          {/* Filtros */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Nome, e-mail, telefone ou ID…"
                className="form-input h-10 pl-9 text-sm w-full sm:w-64"
              />
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="form-input h-10 pl-9 pr-8 text-sm appearance-none"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabela (desktop) / Cards (mobile) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card rounded-[1.5rem] overflow-hidden"
      >
        {loading ? (
          <div className="flex justify-center p-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 p-16 text-center text-muted-foreground">
            <Package className="h-12 w-12 opacity-30" />
            <p className="text-sm">
              {searchTerm || filterStatus !== 'all' ? 'Nenhum pedido encontrado para essa busca.' : 'Nenhum pedido recebido ainda.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    {['Pedido', 'Cliente', 'Data', 'Total', 'Status', 'Rastreio', ''].map(h => (
                      <th key={h} className="px-5 py-4 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredOrders.map(order => (
                    <tr
                      key={order.id}
                      className="group cursor-pointer transition-colors hover:bg-white/[0.02]"
                      onClick={() => handleViewOrder(order)}
                    >
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs text-primary/60">#{order.id.split('-')[0].toUpperCase()}</span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">{order.customer_name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{order.customer_email}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        <span className="block text-[10px] opacity-60">
                          {new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-white whitespace-nowrap">
                        R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-5 py-4 font-mono text-[10px] text-muted-foreground">
                        {order.tracking_code || <span className="opacity-40">—</span>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Ver detalhes →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="lg:hidden divide-y divide-white/5">
              {filteredOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => handleViewOrder(order)}
                  className="w-full text-left px-5 py-5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] text-primary/60">#{order.id.split('-')[0].toUpperCase()}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="font-semibold text-white text-sm">{order.customer_name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{order.customer_email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-white text-sm">
                        R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}
                      </p>
                      <div className="mt-1.5">
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                  </div>
                  {order.tracking_code && (
                    <p className="mt-2 font-mono text-[10px] text-primary/60">
                      📦 {order.tracking_code}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </motion.div>

      {/* Modal Detalhes */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 24 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-[2rem] border border-white/10 bg-[#0a0a0a] shadow-2xl custom-scrollbar"
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl px-6 py-5 sm:px-8">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-primary/60 font-bold">
                      #{selectedOrder.id.split('-')[0].toUpperCase()}
                    </span>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                  <h2 className="mt-1.5 text-xl font-display font-bold uppercase tracking-tight text-white sm:text-2xl">
                    {selectedOrder.customer_name}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(selectedOrder.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 sm:p-8 space-y-8">

                {/* Grid: Cliente + Ações */}
                <div className="grid gap-6 md:grid-cols-2">

                  {/* Dados do cliente */}
                  <div className="space-y-4">
                    <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                      Dados do Cliente
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 shrink-0 text-primary/60" />
                        <span className="text-white/80">
                          {selectedOrder.customer_phone || 'Não informado'}
                        </span>
                        {selectedOrder.customer_phone && (
                          <>
                            <CopyButton value={selectedOrder.customer_phone} />
                            <a
                              href={`https://wa.me/${selectedOrder.customer_phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto flex items-center gap-1 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 px-3 py-1 text-[10px] font-bold text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                            >
                              <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.558 4.148 1.535 5.9L.057 23.57a.75.75 0 00.92.921l5.773-1.498A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.7-.492-5.26-1.352l-.378-.213-3.928 1.02 1.037-3.848-.233-.384A10 10 0 0112 2c5.514 0 10 4.486 10 10s-4.486 10-10 10z"/></svg>
                              WhatsApp
                            </a>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="h-4 w-4 shrink-0 text-primary/60" />
                        <span className="text-white/80 break-all">{selectedOrder.customer_email || 'Não informado'}</span>
                        {selectedOrder.customer_email && <CopyButton value={selectedOrder.customer_email} />}
                      </div>

                      <div className="flex items-start gap-3 text-sm">
                        <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-primary/60" />
                        <span className="text-white/80 leading-relaxed">{selectedOrder.customer_address}</span>
                      </div>

                      <div className="flex items-center gap-3 text-sm">
                        <CreditCard className="h-4 w-4 shrink-0 text-primary/60" />
                        <span className="text-white/80">CPF: {selectedOrder.customer_cpf}</span>
                        <CopyButton value={selectedOrder.customer_cpf} />
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="space-y-5">
                    <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                      Status e Rastreio
                    </h3>

                    {/* Status */}
                    <div className="space-y-2">
                      <label className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Alterar Status
                      </label>
                      <div className="relative">
                        <select
                          disabled={statusUpdating}
                          value={selectedOrder.status}
                          onChange={e => handleUpdateStatus(e.target.value)}
                          className="form-input text-sm appearance-none pr-8 w-full"
                        >
                          <option value="aguardando_pagamento">Aguardando Pagamento</option>
                          <option value="pago">Pago</option>
                          <option value="enviado">Enviado</option>
                          <option value="entregue">Entregue</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                        {statusUpdating
                          ? <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary" />
                          : <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        }
                      </div>
                    </div>

                    {/* Rastreio */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        <Truck className="h-3 w-3" />
                        Código de Rastreio
                      </label>
                      <div className="flex gap-2">
                        <input
                          value={trackingInput}
                          onChange={e => setTrackingInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveTracking()}
                          placeholder="Ex: BR123456789BR"
                          className="form-input text-sm flex-1 font-mono"
                        />
                        <button
                          onClick={handleSaveTracking}
                          disabled={savingTracking}
                          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-4 text-xs font-bold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                        >
                          {savingTracking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                          Salvar
                        </button>
                      </div>
                      {selectedOrder.tracking_code && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-[10px] text-primary">{selectedOrder.tracking_code}</span>
                          <CopyButton value={selectedOrder.tracking_code} />
                          <a
                            href={`https://rastreamento.correios.com.br/app/index.php?objetos=${selectedOrder.tracking_code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Correios
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resumo Financeiro */}
                <div className="space-y-4">
                  <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                    Resumo Financeiro
                  </h3>
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/[0.06]">
                    <div className="flex items-center justify-between px-5 py-3 text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-white">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                    {(selectedOrder.shipping_cost ?? 0) > 0 ? (
                      <div className="flex items-center justify-between px-5 py-3 text-sm">
                        <span className="text-muted-foreground">Frete</span>
                        <span className="text-white">R$ {Number(selectedOrder.shipping_cost).toFixed(2).replace('.', ',')}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-5 py-3 text-sm">
                        <span className="text-muted-foreground">Frete</span>
                        <span className="font-bold text-[#25D366]">Grátis</span>
                      </div>
                    )}
                    {(selectedOrder.discount_amount ?? 0) > 0 && (
                      <div className="flex items-center justify-between px-5 py-3 text-sm">
                        <span className="flex items-center gap-2 text-[#25D366]">
                          <Tag className="h-3.5 w-3.5" />
                          Desconto{selectedOrder.coupon_code ? ` (${selectedOrder.coupon_code})` : ''}
                        </span>
                        <span className="font-bold text-[#25D366]">
                          − R$ {Number(selectedOrder.discount_amount).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between px-5 py-4 bg-white/[0.02]">
                      <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-white">Total</span>
                      <span className="text-2xl font-display font-bold text-white">
                        R$ {Number(selectedOrder.total_amount).toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Itens do Pedido */}
                <div className="space-y-4">
                  <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                    Itens do Pedido
                  </h3>
                  {itemsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : orderItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Nenhum item encontrado.</p>
                  ) : (
                    <ul className="space-y-3">
                      {orderItems.map(item => {
                        const persList = Array.isArray(item.personalization)
                          ? item.personalization.filter(p => p?.name || p?.number)
                          : []
                        return (
                          <li
                            key={item.id}
                            className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="font-bold text-white text-sm">{item.product_title}</p>
                                <div className="flex flex-wrap gap-3 mt-1.5">
                                  <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                    Tam. {item.size}
                                  </span>
                                  <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                    Qtd. {item.quantity}
                                  </span>
                                  <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                    Unit. R$ {Number(item.price).toFixed(2).replace('.', ',')}
                                  </span>
                                </div>
                                {persList.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {persList.map((p, i) => (
                                      <span
                                        key={i}
                                        className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[10px] font-bold text-primary"
                                      >
                                        🎽 {p.name && p.name}{p.number && ` #${p.number}`}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-primary text-base">
                                  R$ {(Number(item.price) * Number(item.quantity)).toFixed(2).replace('.', ',')}
                                </p>
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
