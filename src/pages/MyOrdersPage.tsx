import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Package, Loader2, Clock, ShieldCheck, Truck,
  CheckCircle2, XCircle, ChevronRight, AlertCircle, ArrowRight, RotateCcw,
} from 'lucide-react'

import { Button } from '../components/ui/button'
import { displayProductName } from '../lib/catalog'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/useAuth'
import { cn, formatPrice } from '../lib/utils'

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

const STATUS_CONFIG: Record<string, { label: string; tone: string; icon: React.ElementType }> = {
  aguardando_pagamento: { label: 'Aguardando pagamento', tone: 'bg-warning/15 text-warning', icon: Clock },
  pago:                { label: 'Pagamento confirmado', tone: 'bg-success/15 text-success', icon: ShieldCheck },
  enviado:             { label: 'A caminho',            tone: 'bg-primary/15 text-primary', icon: Truck },
  entregue:            { label: 'Entregue',             tone: 'bg-success/15 text-success', icon: CheckCircle2 },
  cancelado:           { label: 'Cancelado',            tone: 'bg-destructive/15 text-destructive', icon: XCircle },
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
    } catch (err) {
      setError((err as Error).message || 'Erro ao carregar pedidos.')
    } finally {
      setLoading(false)
    }
  }

  // ── Loading / auth ────────────────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="page-shell flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-label="Carregando pedidos" />
      </div>
    )
  }

  // ── Erro de rede/RLS ──────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="page-shell flex min-h-[70vh] flex-col items-center justify-center gap-5 px-4 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="size-9" aria-hidden />
        </span>
        <div>
          <h1 className="display-title text-4xl">Não carregamos seus pedidos</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{error}</p>
        </div>
        <Button size="lg" onClick={() => load(user!.id, user!.email ?? '')}>
          <RotateCcw />
          Tentar de novo
        </Button>
      </div>
    )
  }

  // ── Página ────────────────────────────────────────────────────────────────
  return (
    <div className="page-shell mx-auto max-w-4xl px-4 sm:px-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        <h1 className="display-title mt-2 text-5xl sm:text-6xl">Meus pedidos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
        </p>
      </motion.div>

      {orders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="mt-8 flex flex-col items-center gap-5 rounded-3xl border border-border bg-card px-6 py-16 text-center"
        >
          <span className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Package className="size-9" aria-hidden />
          </span>
          <div>
            <p className="display-title text-3xl">Nenhum pedido ainda</p>
            <p className="mt-2 text-sm text-muted-foreground">Quando você comprar, seus pedidos aparecem aqui.</p>
          </div>
          <Button asChild size="lg">
            <Link to="/produtos">
              Ver camisas
              <ArrowRight />
            </Link>
          </Button>
        </motion.div>
      ) : (
        <ul className="mt-8 space-y-3">
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
                  className="group flex items-center gap-4 rounded-3xl border border-border bg-card px-5 py-5 transition-colors hover:border-white/20 sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold', cfg.tone)}>
                        <Icon className="size-3.5" aria-hidden />
                        {cfg.label}
                      </span>
                      <span className="font-mono text-sm font-semibold text-muted-foreground">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    {firstItems.length > 0 ? (
                      <p className="mt-3 text-sm leading-relaxed text-foreground/85">
                        {firstItems.map((item) => `${item.quantity}× ${displayProductName(item.product_title)} (${item.size})`).join(' · ')}
                        {extra > 0 && (
                          <span className="text-muted-foreground">
                            {' '}+{extra} {extra > 1 ? 'itens' : 'item'}
                          </span>
                        )}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm italic text-muted-foreground">Detalhes não disponíveis</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <p className="text-lg font-black tabular-nums">{formatPrice(Number(order.total_amount))}</p>
                    <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden />
                  </div>
                </Link>
              </motion.li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
