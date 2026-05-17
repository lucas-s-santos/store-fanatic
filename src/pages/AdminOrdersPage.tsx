import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, X, FileText, Loader2, Truck } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Order {
  id: string
  customer_name: string
  customer_cpf: string
  customer_email: string
  customer_address: string
  payment_method: string
  total_amount: number
  status: string
  tracking_code: string
  created_at: string
}

interface OrderItem {
  id: string
  product_title: string
  size: string
  quantity: number
  price: number
  personalization: any
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'aguardando_pagamento', label: 'Aguardando' },
  { value: 'pago', label: 'Pago' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' },
]

const STATUS_COLOR: Record<string, string> = {
  aguardando_pagamento: 'text-[#FF9F43] bg-[#FF9F43]/10 border-[#FF9F43]/20',
  pago: 'text-[#25D366] bg-[#25D366]/10 border-[#25D366]/20',
  enviado: 'text-primary bg-primary/10 border-primary/20',
  entregue: 'text-white bg-white/10 border-white/20',
  cancelado: 'text-destructive bg-destructive/10 border-destructive/20',
}

const STATUS_LABEL: Record<string, string> = {
  aguardando_pagamento: 'Aguardando Pagamento',
  pago: 'Pago',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [trackingInput, setTrackingInput] = useState('')
  const [savingTracking, setSavingTracking] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

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
    const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id)
    setOrderItems(data || [])
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedOrder) return
    setStatusUpdating(true)
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', selectedOrder.id)
    if (error) {
      alert('Erro ao atualizar status: ' + error.message)
    } else {
      const updated = { ...selectedOrder, status: newStatus }
      setSelectedOrder(updated)
      setOrders(orders.map(o => o.id === selectedOrder.id ? updated : o))
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

    if (error) {
      alert('Erro ao salvar rastreio: ' + error.message)
    } else {
      const updated = { ...selectedOrder, tracking_code: trackingInput }
      setSelectedOrder(updated)
      setOrders(orders.map(o => o.id === selectedOrder.id ? updated : o))
    }
    setSavingTracking(false)
  }

  const filteredOrders = orders.filter(o => {
    const matchStatus = filterStatus === 'all' || o.status === filterStatus
    const matchSearch = o.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.includes(searchTerm)
    return matchStatus && matchSearch
  })

  return (
    <div className="p-6 sm:p-10 space-y-6">
      <div className="glass-card rounded-[1.5rem] px-6 py-6 sm:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-tight text-white">Gerenciar Pedidos</h1>
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mt-1">
            Histórico e status de vendas
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou ID..."
            className="form-input h-10 text-sm w-full sm:w-52"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="form-input h-10 text-sm appearance-none"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-card rounded-[1.5rem] overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{searchTerm || filterStatus !== 'all' ? 'Nenhum pedido encontrado.' : 'Nenhum pedido recebido ainda.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <tr>
                  <th className="p-4">ID Pedido</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Data</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Rastreio</th>
                  <th className="p-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 font-mono text-xs text-white/50">{order.id.split('-')[0]}</td>
                    <td className="p-4">
                      <div className="font-medium text-white">{order.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{order.payment_method?.toUpperCase()}</div>
                    </td>
                    <td className="p-4 text-xs">
                      {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4 font-bold text-white">
                      R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLOR[order.status] || 'text-muted-foreground border-white/10 bg-white/5'}`}>
                        {STATUS_LABEL[order.status] || order.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-mono text-muted-foreground">
                      {order.tracking_code || '—'}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleViewOrder(order)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors inline-flex"
                        title="Ver Detalhes"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detalhes do Pedido */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-white/10 bg-[#0a0a0a] shadow-2xl p-6 sm:p-10 custom-scrollbar"
            >
              <button
                onClick={() => setSelectedOrder(null)}
                className="absolute right-6 top-6 text-white/50 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>

              <div className="mb-8">
                <span className="chip border-primary/20 bg-primary/5 text-primary mb-4">Detalhes do Pedido</span>
                <h2 className="text-2xl font-display font-bold uppercase text-white">
                  Pedido #{selectedOrder.id.split('-')[0]}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Feito em {new Date(selectedOrder.created_at).toLocaleString('pt-BR')}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                {/* Cliente */}
                <div className="space-y-4">
                  <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground border-b border-white/10 pb-2">
                    Cliente e Envio
                  </h3>
                  <div className="text-sm space-y-2 text-white/80">
                    <p><strong className="text-white">Nome:</strong> {selectedOrder.customer_name}</p>
                    <p><strong className="text-white">CPF:</strong> {selectedOrder.customer_cpf}</p>
                    <p><strong className="text-white">Email:</strong> {selectedOrder.customer_email || 'Não informado'}</p>
                    <p><strong className="text-white">Endereço:</strong><br />{selectedOrder.customer_address}</p>
                  </div>
                </div>

                {/* Pagamento e Status */}
                <div className="space-y-4">
                  <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground border-b border-white/10 pb-2">
                    Pagamento
                  </h3>
                  <div className="text-sm space-y-3 text-white/80">
                    <p><strong className="text-white">Método:</strong> {selectedOrder.payment_method?.toUpperCase()}</p>
                    <p><strong className="text-white">Total:</strong> R$ {Number(selectedOrder.total_amount).toFixed(2).replace('.', ',')}</p>

                    <div className="pt-3 border-t border-white/10">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2 block">
                        Status
                      </label>
                      <select
                        disabled={statusUpdating}
                        value={selectedOrder.status}
                        onChange={e => handleUpdateStatus(e.target.value)}
                        className="form-input text-sm"
                      >
                        <option value="aguardando_pagamento">Aguardando Pagamento</option>
                        <option value="pago">Pago</option>
                        <option value="enviado">Enviado</option>
                        <option value="entregue">Entregue</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>

                    {/* Código de Rastreio */}
                    <div className="pt-3 border-t border-white/10">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2 flex items-center gap-2">
                        <Truck className="h-3 w-3" />
                        Código de Rastreio
                      </label>
                      <div className="flex gap-2">
                        <input
                          value={trackingInput}
                          onChange={e => setTrackingInput(e.target.value)}
                          placeholder="Ex: BR123456789BR"
                          className="form-input text-sm flex-1 font-mono"
                        />
                        <button
                          onClick={handleSaveTracking}
                          disabled={savingTracking}
                          className="btn-glow-primary px-4 text-xs shrink-0 flex items-center gap-1.5"
                        >
                          {savingTracking ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                          Salvar
                        </button>
                      </div>
                      {selectedOrder.tracking_code && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Atual: <span className="font-mono text-primary">{selectedOrder.tracking_code}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Itens */}
              <div className="space-y-4">
                <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground border-b border-white/10 pb-2">
                  Itens do Pedido ({orderItems.length})
                </h3>
                {orderItems.length === 0 ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : (
                  <ul className="space-y-3">
                    {orderItems.map(item => (
                      <li key={item.id} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                        <div>
                          <p className="font-bold text-white text-sm">{item.product_title}</p>
                          <p className="text-xs text-muted-foreground">
                            Tamanho: {item.size} · Qtd: {item.quantity}
                          </p>
                          {item.personalization && Array.isArray(item.personalization) && item.personalization.length > 0 && (
                            <p className="text-[10px] text-primary mt-1">
                              Personalização: {item.personalization.map((p: any) => `${p.name} #${p.number}`).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right font-bold text-primary ml-4">
                          R$ {(Number(item.price) * Number(item.quantity)).toFixed(2).replace('.', ',')}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
