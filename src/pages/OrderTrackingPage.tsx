import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Truck, CheckCircle2, Clock, XCircle, ShieldCheck,
  ExternalLink, Star, Send, Home, Loader2, PackageSearch, Shirt,
} from 'lucide-react'

import { Button } from '../components/ui/button'
import { WhatsAppIcon, whatsappUrl } from '../components/ui/whatsapp-icon'
import { displayProductName } from '../lib/catalog'
import { supabase } from '../lib/supabase'
import { useSettings } from '../lib/useSettings'
import { cn, formatPrice } from '../lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Order {
  id: string
  customer_name: string
  customer_email: string
  total_amount: number
  shipping_cost: number
  discount_amount: number
  coupon_code: string | null
  status: string
  tracking_code: string | null
  payment_method: string
  created_at: string
}

interface OrderItem {
  id: string
  product_title: string
  size: string
  quantity: number
  unit_price: number
  personalization: { name?: string; number?: string }[] | null
}

interface Feedback {
  id: string
  rating: number
  comment: string | null
}

// ─── Config de status ─────────────────────────────────────────────────────────

const STATUS_FLOW = ['aguardando_pagamento', 'pago', 'enviado', 'entregue'] as const
type FlowStatus = (typeof STATUS_FLOW)[number]

const STATUS_CONFIG: Record<string, {
  label: string
  shortLabel: string
  description: string
  /** Classes do selo de status (texto + fundo). */
  tone: string
  icon: React.ElementType
}> = {
  aguardando_pagamento: {
    label: 'Aguardando pagamento',
    shortLabel: 'Aguardando',
    description: 'Recebemos seu pedido. Assim que o PIX for confirmado, começamos a preparar o envio.',
    tone: 'bg-warning/15 text-warning',
    icon: Clock,
  },
  pago: {
    label: 'Pagamento confirmado',
    shortLabel: 'Pago',
    description: 'Pagamento confirmado! Seu pedido está sendo preparado com cuidado.',
    tone: 'bg-success/15 text-success',
    icon: ShieldCheck,
  },
  enviado: {
    label: 'A caminho',
    shortLabel: 'Enviado',
    description: 'Seu pedido foi despachado e está a caminho!',
    tone: 'bg-primary/15 text-primary',
    icon: Truck,
  },
  entregue: {
    label: 'Entregue',
    shortLabel: 'Entregue',
    description: 'Pedido entregue. Obrigado pela compra e bom jogo!',
    tone: 'bg-success/15 text-success',
    icon: CheckCircle2,
  },
  cancelado: {
    label: 'Cancelado',
    shortLabel: 'Cancelado',
    description: 'Este pedido foi cancelado.',
    tone: 'bg-destructive/15 text-destructive',
    icon: XCircle,
  },
}

const RATING_LABELS = ['', 'Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente!']

// ─── Stepper (somente leitura) ────────────────────────────────────────────────

function StatusStepper({ status }: { status: string }) {
  const currentIndex = STATUS_FLOW.indexOf(status as FlowStatus)

  if (status === 'cancelado') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-4">
        <XCircle className="size-5 shrink-0 text-destructive" aria-hidden />
        <div>
          <p className="text-sm font-bold text-destructive">Pedido cancelado</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Ficou com alguma dúvida? Fale com a gente pelo WhatsApp.</p>
        </div>
      </div>
    )
  }

  return (
    <ol className="relative flex items-start justify-between">
      {STATUS_FLOW.map((step, index) => {
        const cfg = STATUS_CONFIG[step]
        const Icon = cfg.icon
        const done = currentIndex > index
        const active = currentIndex === index
        const isLast = index === STATUS_FLOW.length - 1

        return (
          <li
            key={step}
            aria-current={active ? 'step' : undefined}
            className="relative flex flex-1 flex-col items-center"
          >
            {index > 0 && (
              <div aria-hidden className={cn('absolute left-0 right-1/2 top-5 h-0.5', done || active ? 'bg-success' : 'bg-muted')} />
            )}
            {!isLast && (
              <div aria-hidden className={cn('absolute left-1/2 right-0 top-5 h-0.5', done ? 'bg-success' : 'bg-muted')} />
            )}

            <span
              className={cn(
                'relative z-10 flex size-10 items-center justify-center rounded-full border-2',
                done && 'border-success bg-success text-success-foreground',
                active && 'border-primary bg-primary text-primary-foreground shadow-[0_0_24px_rgb(255_194_26/0.4)]',
                !done && !active && 'border-input bg-card text-muted-foreground',
              )}
            >
              {done ? <CheckCircle2 className="size-5" aria-hidden /> : <Icon className="size-4" aria-hidden />}
            </span>

            <p
              className={cn(
                'mt-2.5 text-center text-xs font-bold leading-tight',
                done ? 'text-success' : active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {cfg.shortLabel}
              {done && <span className="sr-only"> (concluído)</span>}
            </p>
          </li>
        )
      })}
    </ol>
  )
}

// ─── Avaliação por estrelas ───────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  const interactive = Boolean(onChange)

  if (!interactive) {
    return (
      <div className="flex gap-1.5" role="img" aria-label={`${value} de 5 estrelas`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} className={cn('size-7', star <= value ? 'fill-primary text-primary' : 'text-muted')} strokeWidth={1.5} aria-hidden />
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-1.5" role="radiogroup" aria-label="Sua nota">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} ${star === 1 ? 'estrela' : 'estrelas'}: ${RATING_LABELS[star]}`}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="rounded-lg p-0.5 transition-transform hover:scale-110"
        >
          <Star
            className={cn('size-8 transition-colors', (hover || value) >= star ? 'fill-primary text-primary' : 'text-muted-foreground/50')}
            strokeWidth={1.5}
            aria-hidden
          />
        </button>
      ))}
    </div>
  )
}

function Panel({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-3xl border border-border bg-card p-6 sm:p-8"
    >
      <h2 className="mb-6 text-lg font-extrabold">{title}</h2>
      {children}
    </motion.section>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const { settings } = useSettings()

  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Formulário de feedback
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    let active = true

    async function loadOrder() {
      const [orderRes, itemsRes, feedbackRes] = await Promise.all([
        supabase.from('orders').select('*').eq('id', orderId).single(),
        supabase.from('order_items').select('*').eq('order_id', orderId),
        supabase.from('order_feedback').select('*').eq('order_id', orderId).maybeSingle(),
      ])
      if (!active) return

      if (orderRes.error || !orderRes.data) {
        setNotFound(true)
      } else {
        setOrder(orderRes.data)
        setItems(itemsRes.data || [])
        if (feedbackRes.data) {
          setFeedback(feedbackRes.data)
          setSubmitted(true)
        }
      }
      setLoading(false)
    }

    if (orderId) loadOrder()

    return () => {
      active = false
    }
  }, [orderId])

  const handleSubmitFeedback = async () => {
    if (!order || rating === 0) return
    setSubmitting(true)
    const { error } = await supabase.from('order_feedback').insert({
      order_id: order.id,
      rating,
      comment: comment.trim() || null,
    })
    if (!error) {
      setFeedback({ id: '', rating, comment: comment.trim() || null })
      setSubmitted(true)
    }
    setSubmitting(false)
  }

  // ── Loading ──
  if (loading && orderId) {
    return (
      <div className="page-shell flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" aria-label="Carregando pedido" />
      </div>
    )
  }

  // ── Pedido não encontrado ──
  if (!orderId || notFound || !order) {
    return (
      <div className="page-shell flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PackageSearch className="size-9" aria-hidden />
        </span>
        <div>
          <h1 className="display-title text-5xl">Pedido não encontrado</h1>
          <p className="mx-auto mt-3 max-w-sm text-muted-foreground">Confira o link do pedido ou veja a lista em “Meus pedidos”.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/meus-pedidos">Meus pedidos</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/">
              <Home />
              Voltar à loja
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.aguardando_pagamento
  const subtotal = (order.total_amount ?? 0) + (order.discount_amount ?? 0) - (order.shipping_cost ?? 0)
  const shortId = order.id.slice(0, 8).toUpperCase()
  const phone = settings.whatsapp_number || '5511999999999'
  const waLink = whatsappUrl(phone, `Olá! Quero acompanhar meu pedido #${shortId}.`)
  const isDelivered = order.status === 'entregue'

  return (
    <div className="page-shell mx-auto max-w-3xl space-y-5 px-4 sm:px-6">
      {/* ── Topo ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <p className="eyebrow">Acompanhar pedido</p>
        <h1 className="display-title mt-3 text-5xl sm:text-6xl">Olá, {order.customer_name.split(' ')[0]}!</h1>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className={cn('inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold', cfg.tone)}>
            <cfg.icon className="size-4" aria-hidden />
            {cfg.label}
          </span>
          <span className="font-mono text-sm font-semibold text-muted-foreground">#{shortId}</span>
          <span className="text-sm text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <p className="mt-4 max-w-xl text-muted-foreground">{cfg.description}</p>
      </motion.div>

      <Panel title="Andamento" delay={0.05}>
        <StatusStepper status={order.status} />
      </Panel>

      {order.tracking_code && (
        <Panel title="Código de rastreio" delay={0.08}>
          <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Truck className="size-5 shrink-0 text-primary" aria-hidden />
              <span className="font-mono text-base font-bold tracking-widest text-primary">{order.tracking_code}</span>
            </div>
            <Button asChild>
              <a
                href={`https://rastreamento.correios.com.br/app/index.php?objetos=${order.tracking_code}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink />
                Rastrear nos Correios
              </a>
            </Button>
          </div>
        </Panel>
      )}

      <Panel title="Itens do pedido" delay={0.11}>
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const persList = Array.isArray(item.personalization)
              ? item.personalization.filter((p) => p?.name || p?.number)
              : []
            return (
              <li key={item.id} className="flex items-start justify-between gap-4 py-4 first:pt-0">
                <div className="min-w-0">
                  <p className="font-semibold">{displayProductName(item.product_title)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tamanho {item.size} · {item.quantity} {item.quantity === 1 ? 'unidade' : 'unidades'}
                  </p>
                  {persList.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {persList.map((p, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                          <Shirt className="size-3.5" aria-hidden />
                          {p.name}
                          {p.number ? ` #${p.number}` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <p className="shrink-0 font-bold tabular-nums">{formatPrice(Number(item.unit_price) * item.quantity)}</p>
              </li>
            )
          })}
        </ul>

        <dl className="mt-4 space-y-2.5 border-t border-border pt-5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Frete</dt>
            <dd className={cn('tabular-nums', (order.shipping_cost ?? 0) > 0 ? '' : 'font-bold text-success')}>
              {(order.shipping_cost ?? 0) > 0 ? formatPrice(Number(order.shipping_cost)) : 'Grátis'}
            </dd>
          </div>
          {(order.discount_amount ?? 0) > 0 && (
            <div className="flex justify-between text-success">
              <dt>Desconto {order.coupon_code && `(${order.coupon_code})`}</dt>
              <dd className="font-bold tabular-nums">− {formatPrice(Number(order.discount_amount))}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-2">
            <dt className="font-bold">Total</dt>
            <dd className="text-2xl font-black tabular-nums">{formatPrice(Number(order.total_amount))}</dd>
          </div>
        </dl>
      </Panel>

      {/* ── Avaliação (só quando entregue) ── */}
      <AnimatePresence>
        {isDelivered && (
          <Panel title="Como foi sua compra?" delay={0.14}>
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 py-4 text-center"
              >
                <CheckCircle2 className="size-12 text-success" aria-hidden />
                <div>
                  <p className="display-title text-3xl">Valeu pelo feedback!</p>
                  <p className="mt-1 text-sm text-muted-foreground">Sua avaliação ajuda a gente a melhorar.</p>
                </div>
                {feedback && (
                  <div className="flex flex-col items-center gap-2">
                    <StarRating value={feedback.rating} />
                    <span className="text-sm font-semibold text-primary">{RATING_LABELS[feedback.rating]}</span>
                    {feedback.comment && <p className="mt-1 max-w-sm text-sm italic text-muted-foreground">“{feedback.comment}”</p>}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col items-center gap-2">
                  <StarRating value={rating} onChange={setRating} />
                  <span className="h-5 text-sm font-bold text-primary" aria-live="polite">
                    {RATING_LABELS[rating]}
                  </span>
                </div>

                <label htmlFor="feedback-comment" className="sr-only">
                  Comentário (opcional)
                </label>
                <textarea
                  id="feedback-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Conte como foi sua experiência (opcional)"
                  className="form-input resize-none text-sm"
                />

                <Button size="lg" className="w-full" onClick={handleSubmitFeedback} disabled={rating === 0 || submitting}>
                  {submitting ? <Loader2 className="animate-spin" /> : <Send />}
                  Enviar avaliação
                </Button>
              </div>
            )}
          </Panel>
        )}
      </AnimatePresence>

      {/* ── Ações ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <Button asChild size="xl" variant="success" className="flex-1">
          <a href={waLink} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon />
            Falar com a loja
          </a>
        </Button>
        <Button asChild size="xl" variant="outline" className="flex-1">
          <Link to="/">
            <Home />
            Voltar à loja
          </Link>
        </Button>
      </motion.div>
    </div>
  )
}
