import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package, X, Loader2, Truck, Search, Filter,
  Phone, Mail, MapPin, CreditCard, Tag, ChevronDown,
  CheckCircle2, Clock, XCircle, Copy, ExternalLink,
  AlertTriangle, ShieldCheck, ArrowRight,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'

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

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_FLOW = ['aguardando_pagamento', 'pago', 'enviado', 'entregue'] as const
type FlowStatus = (typeof STATUS_FLOW)[number]

const STATUS_CONFIG: Record<string, {
  label: string
  shortLabel: string
  color: string
  iconColor: string
  icon: React.ElementType
}> = {
  aguardando_pagamento: {
    label: 'Aguardando Pagamento',
    shortLabel: 'Aguardando',
    color: 'text-[#FF9F43] bg-[#FF9F43]/10 border-[#FF9F43]/30',
    iconColor: '#FF9F43',
    icon: Clock,
  },
  pago: {
    label: 'Pago',
    shortLabel: 'Pago',
    color: 'text-[#25D366] bg-[#25D366]/10 border-[#25D366]/30',
    iconColor: '#25D366',
    icon: ShieldCheck,
  },
  enviado: {
    label: 'Enviado',
    shortLabel: 'Enviado',
    color: 'text-primary bg-primary/10 border-primary/30',
    iconColor: '#e5c07b',
    icon: Truck,
  },
  entregue: {
    label: 'Entregue',
    shortLabel: 'Entregue',
    color: 'text-[#25D366] bg-[#25D366]/10 border-[#25D366]/30',
    iconColor: '#25D366',
    icon: CheckCircle2,
  },
  cancelado: {
    label: 'Cancelado',
    shortLabel: 'Cancelado',
    color: 'text-destructive bg-destructive/10 border-destructive/30',
    iconColor: '#ff453a',
    icon: XCircle,
  },
}

const NEXT_ACTION: Record<string, { label: string; next: string }> = {
  aguardando_pagamento: { label: 'Confirmar Pagamento', next: 'pago' },
  pago: { label: 'Marcar como Enviado', next: 'enviado' },
  enviado: { label: 'Confirmar Entrega', next: 'entregue' },
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'aguardando_pagamento', label: 'Aguardando pagamento' },
  { value: 'pago', label: 'Pago' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
]

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status]
  if (!cfg) return null
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>
      <Icon className="h-3 w-3" />
      {cfg.shortLabel}
    </span>
  )
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      title="Copiar"
      className="ml-1 text-muted-foreground transition-colors hover:text-primary"
    >
      {copied
        ? <CheckCircle2 className="h-3.5 w-3.5 text-[#25D366]" />
        : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

// ─── Stepper de status ────────────────────────────────────────────────────────

function OrderStatusStepper({
  currentStatus,
  updating,
  onUpdate,
}: {
  currentStatus: string
  updating: boolean
  onUpdate: (status: string) => void
}) {
  const isCancelled = currentStatus === 'cancelado'
  const currentFlowIndex = STATUS_FLOW.indexOf(currentStatus as FlowStatus)
  const nextAction = NEXT_ACTION[currentStatus]

  return (
    <div className="space-y-5">
      {/* Linha de progresso */}
      {!isCancelled && (
        <div className="relative flex items-start justify-between gap-0">
          {STATUS_FLOW.map((step, index) => {
            const cfg = STATUS_CONFIG[step]
            const Icon = cfg.icon
            const done = currentFlowIndex > index
            const active = currentFlowIndex === index
            const isLast = index === STATUS_FLOW.length - 1

            return (
              <div key={step} className="relative flex flex-1 flex-col items-center">
                {/* Linha conectora antes */}
                {index > 0 && (
                  <div className="absolute left-0 top-4 right-1/2 h-px -translate-y-1/2">
                    <div className={`h-full transition-all duration-500 ${done || active ? 'bg-[#25D366]' : 'bg-white/10'}`} />
                  </div>
                )}
                {/* Linha conectora depois */}
                {!isLast && (
                  <div className="absolute right-0 top-4 left-1/2 h-px -translate-y-1/2">
                    <div className={`h-full transition-all duration-500 ${done ? 'bg-[#25D366]' : 'bg-white/10'}`} />
                  </div>
                )}

                {/* Círculo */}
                <motion.div
                  animate={active ? { scale: [1, 1.12, 1] } : {}}
                  transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                  className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    done
                      ? 'border-[#25D366] bg-[#25D366]/20'
                      : active
                        ? 'border-primary bg-primary/15 shadow-[0_0_16px_rgba(229,192,123,0.4)]'
                        : 'border-white/15 bg-white/5'
                  }`}
                >
                  {done
                    ? <CheckCircle2 className="h-4 w-4 text-[#25D366]" />
                    : <Icon
                        className="h-3.5 w-3.5"
                        style={{ color: active ? cfg.iconColor : 'rgba(255,255,255,0.2)' }}
                      />
                  }
                </motion.div>

                {/* Label */}
                <p className={`mt-2 text-center text-[9px] font-semibold uppercase tracking-wider leading-tight ${
                  done ? 'text-[#25D366]' : active ? 'text-primary' : 'text-white/20'
                }`}>
                  {cfg.shortLabel}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Estado cancelado */}
      {isCancelled && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <XCircle className="h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-bold text-destructive">Pedido Cancelado</p>
            <p className="text-xs text-muted-foreground mt-0.5">Este pedido foi cancelado e não está mais em processamento.</p>
          </div>
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex flex-col gap-2 sm:flex-row">
        {/* Avançar status */}
        {nextAction && !isCancelled && (
          <button
            onClick={() => onUpdate(nextAction.next)}
            disabled={updating}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
          >
            {updating
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <ArrowRight className="h-4 w-4" />}
            {nextAction.label}
          </button>
        )}

        {/* Estado final entregue */}
        {currentStatus === 'entregue' && (
          <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 px-4 py-3 text-sm font-bold text-[#25D366]">
            <CheckCircle2 className="h-4 w-4" />
            Pedido concluído
          </div>
        )}

        {/* Reativar cancelado */}
        {isCancelled && (
          <button
            onClick={() => onUpdate('aguardando_pagamento')}
            disabled={updating}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Reativar pedido
          </button>
        )}

        {/* Cancelar (disponível até estar entregue ou já cancelado) */}
        {currentStatus !== 'entregue' && currentStatus !== 'cancelado' && (
          <button
            onClick={() => onUpdate('cancelado')}
            disabled={updating}
            className="flex items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/15 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            Cancelar pedido
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AdminOrdersPage() {
  const { toast } = useToast()
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
  const [cancelConfirm, setCancelConfirm] = useState(false)

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
    setCancelConfirm(false)
    setItemsLoading(true)
    const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id)
    setOrderItems(data || [])
    setItemsLoading(false)
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedOrder) return
    setStatusUpdating(true)
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', selectedOrder.id)
    if (error) {
      toast(`Erro ao atualizar status: ${error.message}`, 'error')
    } else {
      const updated = { ...selectedOrder, status: newStatus }
      setSelectedOrder(updated)
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated : o))
      toast('Status atualizado com sucesso', 'success')
    }
    setStatusUpdating(false)
    setCancelConfirm(false)
  }

  const handleSaveTracking = async () => {
    if (!selectedOrder) return
    setSavingTracking(true)
    const { error } = await supabase
      .from('orders')
      .update({ tracking_code: trackingInput })
      .eq('id', selectedOrder.id)
    if (error) {
      toast(`Erro ao salvar rastreio: ${error.message}`, 'error')
    } else {
      const updated = { ...selectedOrder, tracking_code: trackingInput }
      setSelectedOrder(updated)
      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? updated : o))
      toast('Código de rastreio salvo', 'success')
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

      {/* Lista */}
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
              {searchTerm || filterStatus !== 'all'
                ? 'Nenhum pedido encontrado para essa busca.'
                : 'Nenhum pedido recebido ainda.'}
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
                      onClick={() => handleViewOrder(order)}
                      className="group cursor-pointer transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-4 font-mono text-xs text-primary/60">
                        #{order.id.split('-')[0].toUpperCase()}
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
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary opacity-0 transition-opacity group-hover:opacity-100">
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
                  className="w-full px-5 py-5 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-primary/60">
                          #{order.id.split('-')[0].toUpperCase()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-white">{order.customer_name}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{order.customer_email}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-white">
                        R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}
                      </p>
                      <div className="mt-1.5">
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                  </div>
                  {order.tracking_code && (
                    <p className="mt-2 font-mono text-[10px] text-primary/60">📦 {order.tracking_code}</p>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 24 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="custom-scrollbar relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-[2rem] border border-white/10 bg-[#0a0a0a] shadow-2xl"
            >
              {/* Sticky header */}
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0a0a0a]/95 px-6 py-5 backdrop-blur-xl sm:px-8">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-primary/60">
                      #{selectedOrder.id.split('-')[0].toUpperCase()}
                    </span>
                    <StatusBadge status={selectedOrder.status} />
                  </div>
                  <h2 className="mt-1.5 text-xl font-display font-bold uppercase tracking-tight text-white sm:text-2xl">
                    {selectedOrder.customer_name}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(selectedOrder.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-full p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-8 p-6 sm:p-8">

                {/* ── Status stepper ── */}
                <section>
                  <h3 className="mb-5 font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                    Status do Pedido
                  </h3>

                  {/* Confirmação de cancelamento */}
                  <AnimatePresence>
                    {cancelConfirm && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 overflow-hidden"
                      >
                        <div className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
                            <p className="text-sm text-white">
                              Confirmar cancelamento deste pedido?
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setCancelConfirm(false)}
                              className="rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-white/60 transition-colors hover:bg-white/5"
                            >
                              Não
                            </button>
                            <button
                              onClick={() => handleUpdateStatus('cancelado')}
                              disabled={statusUpdating}
                              className="flex items-center gap-1.5 rounded-lg bg-destructive px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                            >
                              {statusUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
                              Sim, cancelar
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <OrderStatusStepper
                    currentStatus={selectedOrder.status}
                    updating={statusUpdating}
                    onUpdate={(next) => {
                      if (next === 'cancelado') {
                        setCancelConfirm(true)
                      } else {
                        handleUpdateStatus(next)
                      }
                    }}
                  />
                </section>

                {/* ── Rastreio ── */}
                <section className="space-y-3">
                  <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                    Código de Rastreio
                  </h3>
                  <div className="flex gap-2">
                    <input
                      value={trackingInput}
                      onChange={e => setTrackingInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSaveTracking()}
                      placeholder="Ex: BR123456789BR"
                      className="form-input flex-1 font-mono text-sm"
                    />
                    <button
                      onClick={handleSaveTracking}
                      disabled={savingTracking}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-4 text-xs font-bold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
                    >
                      {savingTracking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                      Salvar
                    </button>
                  </div>
                  {selectedOrder.tracking_code && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-primary">{selectedOrder.tracking_code}</span>
                      <CopyButton value={selectedOrder.tracking_code} />
                      <a
                        href={`https://rastreamento.correios.com.br/app/index.php?objetos=${selectedOrder.tracking_code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-primary"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Correios
                      </a>
                    </div>
                  )}
                </section>

                {/* ── Cliente + Financeiro (grid) ── */}
                <div className="grid gap-6 md:grid-cols-2">

                  {/* Dados do cliente */}
                  <section className="space-y-4">
                    <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                      Dados do Cliente
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="h-4 w-4 shrink-0 text-primary/60" />
                        <span className="text-white/80">{selectedOrder.customer_phone || 'Não informado'}</span>
                        {selectedOrder.customer_phone && (
                          <>
                            <CopyButton value={selectedOrder.customer_phone} />
                            <a
                              href={`https://wa.me/${selectedOrder.customer_phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto flex items-center gap-1 rounded-full border border-[#25D366]/20 bg-[#25D366]/10 px-3 py-1 text-[10px] font-bold text-[#25D366] transition-colors hover:bg-[#25D366]/20"
                            >
                              <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.558 4.148 1.535 5.9L.057 23.57a.75.75 0 00.92.921l5.773-1.498A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.7-.492-5.26-1.352l-.378-.213-3.928 1.02 1.037-3.848-.233-.384A10 10 0 0112 2c5.514 0 10 4.486 10 10s-4.486 10-10 10z" />
                              </svg>
                              WhatsApp
                            </a>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="h-4 w-4 shrink-0 text-primary/60" />
                        <span className="break-all text-white/80">{selectedOrder.customer_email || 'Não informado'}</span>
                        {selectedOrder.customer_email && <CopyButton value={selectedOrder.customer_email} />}
                      </div>
                      <div className="flex items-start gap-3 text-sm">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
                        <span className="leading-relaxed text-white/80">{selectedOrder.customer_address}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <CreditCard className="h-4 w-4 shrink-0 text-primary/60" />
                        <span className="text-white/80">CPF: {selectedOrder.customer_cpf}</span>
                        <CopyButton value={selectedOrder.customer_cpf} />
                      </div>
                    </div>
                  </section>

                  {/* Resumo financeiro */}
                  <section className="space-y-4">
                    <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                      Resumo Financeiro
                    </h3>
                    <div className="divide-y divide-white/[0.06] rounded-xl border border-white/10 bg-white/[0.02]">
                      <div className="flex items-center justify-between px-4 py-3 text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="text-white">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 text-sm">
                        <span className="text-muted-foreground">Frete</span>
                        {(selectedOrder.shipping_cost ?? 0) > 0
                          ? <span className="text-white">R$ {Number(selectedOrder.shipping_cost).toFixed(2).replace('.', ',')}</span>
                          : <span className="font-bold text-[#25D366]">Grátis</span>}
                      </div>
                      {(selectedOrder.discount_amount ?? 0) > 0 && (
                        <div className="flex items-center justify-between px-4 py-3 text-sm">
                          <span className="flex items-center gap-2 text-[#25D366]">
                            <Tag className="h-3.5 w-3.5" />
                            {selectedOrder.coupon_code || 'Desconto'}
                          </span>
                          <span className="font-bold text-[#25D366]">
                            − R$ {Number(selectedOrder.discount_amount).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between bg-white/[0.02] px-4 py-4">
                        <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-white">Total</span>
                        <span className="text-2xl font-display font-bold text-white">
                          R$ {Number(selectedOrder.total_amount).toFixed(2).replace('.', ',')}
                        </span>
                      </div>
                    </div>
                  </section>
                </div>

                {/* ── Itens ── */}
                <section className="space-y-4">
                  <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                    Itens do Pedido
                  </h3>
                  {itemsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {orderItems.map(item => {
                        const persList = Array.isArray(item.personalization)
                          ? item.personalization.filter(p => p?.name || p?.number)
                          : []
                        return (
                          <li key={item.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-white">{item.product_title}</p>
                                <div className="mt-1.5 flex flex-wrap gap-2">
                                  {[
                                    `Tam. ${item.size}`,
                                    `Qtd. ${item.quantity}`,
                                    `Unit. R$ ${Number(item.price).toFixed(2).replace('.', ',')}`,
                                  ].map(tag => (
                                    <span key={tag} className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                                {persList.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {persList.map((p, i) => (
                                      <span key={i} className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-[10px] font-bold text-primary">
                                        🎽 {p.name}{p.number ? ` #${p.number}` : ''}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <p className="shrink-0 text-base font-bold text-primary">
                                R$ {(Number(item.price) * Number(item.quantity)).toFixed(2).replace('.', ',')}
                              </p>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
