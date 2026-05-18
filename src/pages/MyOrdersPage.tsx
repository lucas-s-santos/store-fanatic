import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Package, Loader2, Clock, ShieldCheck, Truck,
  CheckCircle2, XCircle, ChevronRight, AlertCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'

interface OrderItem {
  order_id: string
  product_title: string
  quantity: number
  size: string
}

interface Order {
  id: string
  total_amount: number
  status: string
  tracking_code: string | null
  created_at: string
  order_items: OrderItem[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  aguardando_pagamento: { label: 'Aguardando pagamento', color: 'text-[#FF9F43]', icon: Clock },
  pago:                { label: 'Pagamento confirmado', color: 'text-[#25D366]',  icon: ShieldCheck },
  enviado:             { label: 'A caminho',            color: 'text-primary',    icon: Truck },
  entregue:            { label: 'Entregue',             color: 'text-[#25D366]',  icon: CheckCircle2 },
  cancelado:           { label: 'Cancelado',            color: 'text-destructive', icon: XCircle },
}

export function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [orders, setOrders]   = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  // Redireciona se não estiver logado
  useEffect(() => {
    if (!authLoading && !user) navigate('/login?next=/meus-pedidos')
  }, [user, authLoading, navigate])

  // Carrega pedidos quando o usuário estiver disponível
  useEffect(() => {
    if (authLoading) return          // aguarda auth resolver
    if (!user) {                      // sem user → vai redirecionar, para o loading
      setLoading(false)
      return
    }
    load(user.id, user.email ?? '')
  }, [user, authLoading])

  async function load(userId: string, email: string) {
    setLoading(true)
    setError('')

    try {
      // Busca por user_id E por customer_email (para pedidos antigos sem user_id)
      const [byId, byEmail] = await Promise.all([
        supabase
          .from('orders')
          .select('id, total_amount, status, tracking_code, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),

        email
          ? supabase
              .from('orders')
              .select('id, total_amount, status, tracking_code, created_at')
              .eq('customer_email', email)
              .is('user_id', null)           // só os sem user_id (evita duplicatas)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ])

      if (byId.error) throw new Error(byId.error.message)
      if (byEmail.error) throw new Error(byEmail.error.message)

      // Mescla e remove duplicatas pelo id
      const merged = [
        ...(byId.data ?? []),
        ...(byEmail.data ?? []),
      ]
      const unique = Array.from(new Map(merged.map(o => [o.id, o])).values())
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      // Busca itens para todos os pedidos encontrados
      let itemsData: OrderItem[] = []
      if (unique.length > 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select('order_id, product_title, quantity, size')
          .in('order_id', unique.map(o => o.id))
        itemsData = (items ?? []) as OrderItem[]
      }

      setOrders(
        unique.map(o => ({
          ...o,
          order_items: itemsData.filter(i => i.order_id === o.id),
        }))
      )
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar pedidos.')
    } finally {
      setLoading(false)
    }
  }

  // ── Loading / auth ────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="section-shell flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // ── Erro de rede/RLS ──────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="section-shell flex items-center justify-center min-h-[60vh] px-4">
        <div className="glass-card rounded-[2rem] p-10 text-center space-y-4 max-w-md">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive/60" />
          <p className="text-sm font-semibold text-white">Não foi possível carregar seus pedidos</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <button
            onClick={() => load(user!.id, user!.email ?? '')}
            className="rounded-full bg-primary px-8 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground hover:opacity-90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  // ── Página ────────────────────────────────────────────────────────────────
  return (
    <div className="section-shell px-3 sm:px-5 py-10 max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-[2rem] px-6 py-6 sm:px-8"
      >
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-1">
          {user?.email}
        </p>
        <h1 className="text-2xl font-display font-bold uppercase tracking-tight text-white sm:text-3xl">
          Meus Pedidos
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {orders.length} pedido{orders.length !== 1 ? 's' : ''} encontrado{orders.length !== 1 ? 's' : ''}
        </p>
      </motion.div>

      {/* Lista */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="glass-card rounded-[2rem] overflow-hidden"
      >
        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center px-6">
            <Package className="h-16 w-16 text-muted-foreground/20" />
            <div>
              <p className="text-sm font-semibold text-white">Nenhum pedido ainda</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Seus pedidos aparecerão aqui após a compra.
              </p>
            </div>
            <Link
              to="/produtos"
              className="mt-2 rounded-full bg-primary px-8 py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:opacity-90 hover:scale-105"
            >
              Ver produtos
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {orders.map((order, i) => {
              const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.aguardando_pagamento
              const Icon = cfg.icon
              const firstItems = order.order_items.slice(0, 2)
              const extra = order.order_items.length - 2

              return (
                <motion.li
                  key={order.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i }}
                >
                  <Link
                    to={`/pedido/${order.id}`}
                    className="group flex items-start justify-between gap-4 px-5 py-5 transition-colors hover:bg-white/[0.02] sm:px-7"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-mono text-[10px] text-primary/60 font-bold">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </span>
                      </div>

                      {firstItems.length > 0 ? (
                        <p className="text-sm text-white/70 leading-relaxed">
                          {firstItems.map(item =>
                            `${item.quantity}× ${item.product_title} (${item.size})`
                          ).join(' · ')}
                          {extra > 0 && (
                            <span className="text-muted-foreground">
                              {' '}+{extra} item{extra > 1 ? 's' : ''}
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Detalhes não disponíveis</p>
                      )}

                      <div className={`mt-2 flex items-center gap-1.5 text-xs font-semibold ${cfg.color}`}>
                        <Icon className="h-3.5 w-3.5" />
                        {cfg.label}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <p className="text-base font-bold text-white">
                        R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}
                      </p>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-colors group-hover:text-primary" />
                    </div>
                  </Link>
                </motion.li>
              )
            })}
          </ul>
        )}
      </motion.div>
    </div>
  )
}
