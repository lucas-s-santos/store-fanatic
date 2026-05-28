import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Truck, CheckCircle2, Clock, XCircle, ShieldCheck,
  ExternalLink, Star, Send, Home, Loader2, AlertCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useSettings } from '../lib/useSettings'

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
  iconColor: string
  icon: React.ElementType
}> = {
  aguardando_pagamento: {
    label: 'Aguardando Pagamento',
    shortLabel: 'Aguardando',
    description: 'Seu pedido foi recebido e está aguardando confirmação do pagamento.',
    iconColor: '#FF9F43',
    icon: Clock,
  },
  pago: {
    label: 'Pagamento Confirmado',
    shortLabel: 'Pago',
    description: 'Pagamento confirmado! Seu pedido está sendo preparado com cuidado.',
    iconColor: '#25D366',
    icon: ShieldCheck,
  },
  enviado: {
    label: 'A Caminho',
    shortLabel: 'Enviado',
    description: 'Seu pedido foi despachado e está a caminho!',
    iconColor: '#e5c07b',
    icon: Truck,
  },
  entregue: {
    label: 'Entregue',
    shortLabel: 'Entregue',
    description: 'Pedido entregue com sucesso. Obrigado pela compra!',
    iconColor: '#25D366',
    icon: CheckCircle2,
  },
  cancelado: {
    label: 'Cancelado',
    shortLabel: 'Cancelado',
    description: 'Este pedido foi cancelado.',
    iconColor: '#ff453a',
    icon: XCircle,
  },
}

// ─── Stepper (somente leitura) ────────────────────────────────────────────────

function StatusStepper({ status }: { status: string }) {
  const isCancelled = status === 'cancelado'
  const currentIndex = STATUS_FLOW.indexOf(status as FlowStatus)

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-4">
        <XCircle className="h-5 w-5 shrink-0 text-destructive" />
        <div>
          <p className="text-sm font-bold text-destructive">Pedido Cancelado</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Este pedido foi cancelado. Em caso de dúvidas, entre em contato conosco.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex items-start justify-between gap-0">
      {STATUS_FLOW.map((step, index) => {
        const cfg = STATUS_CONFIG[step]
        const Icon = cfg.icon
        const done = currentIndex > index
        const active = currentIndex === index
        const isLast = index === STATUS_FLOW.length - 1

        return (
          <div key={step} className="relative flex flex-1 flex-col items-center">
            {/* Linha antes */}
            {index > 0 && (
              <div className="absolute left-0 top-4 right-1/2 h-px -translate-y-1/2">
                <div className={`h-full transition-all duration-500 ${done || active ? 'bg-[#25D366]' : 'bg-white/10'}`} />
              </div>
            )}
            {/* Linha depois */}
            {!isLast && (
              <div className="absolute right-0 top-4 left-1/2 h-px -translate-y-1/2">
                <div className={`h-full transition-all duration-500 ${done ? 'bg-[#25D366]' : 'bg-white/10'}`} />
              </div>
            )}

            {/* Círculo */}
            <motion.div
              animate={active ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                done
                  ? 'border-[#25D366] bg-[#25D366]/20'
                  : active
                    ? 'border-primary bg-primary/15 shadow-[0_0_16px_rgba(229,192,123,0.35)]'
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
  )
}

// ─── Avaliação por estrelas ───────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange?: (v: number) => void
}) {
  const [hover, setHover] = useState(0)
  const interactive = !!onChange

  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => interactive && setHover(star)}
          onMouseLeave={() => interactive && setHover(0)}
          className={interactive ? 'transition-transform hover:scale-110' : ''}
        >
          <Star
            className="h-7 w-7 transition-colors"
            fill={(hover || value) >= star ? '#e5c07b' : 'transparent'}
            stroke={(hover || value) >= star ? '#e5c07b' : 'rgba(255,255,255,0.2)'}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function OrderTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
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
    if (!orderId) {
      setNotFound(true)
      setLoading(false)
      return
    }
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    setLoading(true)
    const [orderRes, itemsRes, feedbackRes] = await Promise.all([
      supabase.from('orders').select('*').eq('id', orderId).single(),
      supabase.from('order_items').select('*').eq('order_id', orderId),
      supabase.from('order_feedback').select('*').eq('order_id', orderId).maybeSingle(),
    ])

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
  if (loading) {
    return (
      <div className="section-shell flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // ── Pedido não encontrado ──
  if (notFound || !order) {
    return (
      <div className="section-shell px-4 sm:px-6 flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-[2rem] w-full max-w-lg p-10 text-center space-y-5"
        >
          <AlertCircle className="mx-auto h-16 w-16 text-muted-foreground/40" />
          <div>
            <h1 className="text-2xl font-display font-bold uppercase text-white">Pedido não encontrado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Verifique o link enviado no seu e-mail de confirmação.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="mx-auto flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-3 text-xs font-bold uppercase tracking-widest text-white transition-colors hover:bg-white/10"
          >
            <Home className="h-4 w-4" />
            Voltar à loja
          </button>
        </motion.div>
      </div>
    )
  }

  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.aguardando_pagamento
  const subtotal = (order.total_amount ?? 0) + (order.discount_amount ?? 0) - (order.shipping_cost ?? 0)

  // WhatsApp
  const phone = settings.whatsapp_number || '5511999999999'
  const waMsg = `Olá! Quero acompanhar meu pedido #${order.id.slice(0, 8).toUpperCase()}.`
  const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`

  const isDelivered = order.status === 'entregue'
  const ratingLabels = ['', 'Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente!']

  return (
    <div className="section-shell px-3 sm:px-5 py-10 space-y-6 max-w-3xl mx-auto">

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-[2rem] p-6 sm:p-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-1">
              Acompanhar pedido
            </p>
            <h1 className="text-2xl font-display font-bold uppercase tracking-tight text-white sm:text-3xl">
              Olá, {order.customer_name.split(' ')[0]}!
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-primary/60">
                #{order.id.slice(0, 8).toUpperCase()}
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="text-xs text-muted-foreground">
                {new Date(order.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Badge de status */}
          <div
            className="flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5"
            style={{ borderColor: cfg.iconColor + '33', background: cfg.iconColor + '12' }}
          >
            <cfg.icon className="h-4 w-4" style={{ color: cfg.iconColor }} />
            <span className="text-sm font-bold" style={{ color: cfg.iconColor }}>{cfg.label}</span>
          </div>
        </div>

        {/* Descrição do status */}
        <p className="mt-5 text-sm text-muted-foreground border-t border-white/[0.06] pt-5">
          {cfg.description}
        </p>
      </motion.div>

      {/* ── Stepper ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="glass-card rounded-[2rem] p-6 sm:p-8 space-y-2"
      >
        <h2 className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-5">
          Status do Pedido
        </h2>
        <StatusStepper status={order.status} />
      </motion.div>

      {/* ── Rastreio ── */}
      {order.tracking_code && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-[2rem] p-6 sm:p-8"
        >
          <h2 className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-4">
            Código de Rastreio
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 shrink-0 text-primary" />
              <span className="font-mono text-base font-bold text-primary tracking-widest">
                {order.tracking_code}
              </span>
            </div>
            <a
              href={`https://rastreamento.correios.com.br/app/index.php?objetos=${order.tracking_code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:opacity-90 hover:scale-105"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Rastrear nos Correios
            </a>
          </div>
        </motion.div>
      )}

      {/* ── Itens ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className="glass-card rounded-[2rem] p-6 sm:p-8 space-y-4"
      >
        <h2 className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Itens do Pedido
        </h2>
        <ul className="space-y-3">
          {items.map(item => {
            const persList = Array.isArray(item.personalization)
              ? item.personalization.filter(p => p?.name || p?.number)
              : []
            return (
              <li key={item.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">{item.product_title}</p>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      {[`Tam. ${item.size}`, `Qtd. ${item.quantity}`].map(tag => (
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
                    R$ {(Number(item.unit_price) * item.quantity).toFixed(2).replace('.', ',')}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>

        {/* Resumo financeiro */}
        <div className="divide-y divide-white/[0.06] rounded-xl border border-white/10 bg-white/[0.02] mt-2">
          <div className="flex justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-white">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </div>
          <div className="flex justify-between px-4 py-3 text-sm">
            <span className="text-muted-foreground">Frete</span>
            {(order.shipping_cost ?? 0) > 0
              ? <span className="text-white">R$ {Number(order.shipping_cost).toFixed(2).replace('.', ',')}</span>
              : <span className="font-bold text-[#25D366]">Grátis</span>}
          </div>
          {(order.discount_amount ?? 0) > 0 && (
            <div className="flex justify-between px-4 py-3 text-sm">
              <span className="text-[#25D366]">Desconto {order.coupon_code && `(${order.coupon_code})`}</span>
              <span className="font-bold text-[#25D366]">− R$ {Number(order.discount_amount).toFixed(2).replace('.', ',')}</span>
            </div>
          )}
          <div className="flex items-center justify-between bg-white/[0.02] px-4 py-4">
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-white">Total</span>
            <span className="text-2xl font-display font-bold text-white">
              R$ {Number(order.total_amount).toFixed(2).replace('.', ',')}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ── Feedback (apenas quando entregue) ── */}
      <AnimatePresence>
        {isDelivered && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="glass-card rounded-[2rem] p-6 sm:p-8"
          >
            <h2 className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-5">
              Avalie sua experiência
            </h2>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 py-6 text-center"
              >
                <CheckCircle2 className="h-12 w-12 text-[#25D366]" />
                <div>
                  <p className="text-lg font-display font-bold text-white uppercase">Obrigado pelo feedback!</p>
                  <p className="mt-1 text-sm text-muted-foreground">Sua avaliação nos ajuda a melhorar cada vez mais.</p>
                </div>
                {feedback && (
                  <div className="flex flex-col items-center gap-2">
                    <StarRating value={feedback.rating} />
                    <span className="text-xs font-semibold text-primary">{ratingLabels[feedback.rating]}</span>
                    {feedback.comment && (
                      <p className="mt-1 max-w-sm text-xs text-muted-foreground italic">"{feedback.comment}"</p>
                    )}
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col items-center gap-2 py-2">
                  <StarRating value={rating} onChange={setRating} />
                  <AnimatePresence mode="wait">
                    {rating > 0 && (
                      <motion.span
                        key={rating}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="text-xs font-bold text-primary"
                      >
                        {ratingLabels[rating]}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  placeholder="Conte como foi sua experiência (opcional)..."
                  className="form-input w-full resize-none text-sm"
                />

                <button
                  onClick={handleSubmitFeedback}
                  disabled={rating === 0 || submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 font-sans text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:opacity-90 hover:scale-[1.02] active:scale-100 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Send className="h-4 w-4" />}
                  Enviar avaliação
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ações ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] py-4 font-sans text-xs font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-[#20bd5a] hover:scale-[1.02] shadow-[0_0_20px_rgba(37,211,102,0.2)]"
        >
          <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.558 4.148 1.535 5.9L.057 23.57a.75.75 0 00.92.921l5.773-1.498A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.7-.492-5.26-1.352l-.378-.213-3.928 1.02 1.037-3.848-.233-.384A10 10 0 0112 2c5.514 0 10 4.486 10 10s-4.486 10-10 10z" />
          </svg>
          Falar com a loja
        </a>
        <button
          onClick={() => navigate('/')}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 py-4 font-sans text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/10"
        >
          <Home className="h-4 w-4" />
          Voltar à loja
        </button>
      </motion.div>
    </div>
  )
}
