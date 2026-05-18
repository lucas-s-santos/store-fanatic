import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, XCircle, ShieldCheck, Home, RotateCcw, Package } from 'lucide-react'
import { useSettings } from '../lib/useSettings'

type PaymentStatus = 'approved' | 'pending' | 'rejected' | 'unknown'

function resolveStatus(params: URLSearchParams): PaymentStatus {
  const s = params.get('collection_status') || params.get('status') || ''
  if (s === 'approved') return 'approved'
  if (s === 'pending' || s === 'in_process') return 'pending'
  if (s === 'rejected' || s === 'cancelled' || s === 'refunded') return 'rejected'
  return 'unknown'
}

const statusConfig = {
  approved: {
    icon: CheckCircle2,
    color: '#25D366',
    border: 'border-[#25D366]/30',
    bg: 'bg-[#25D366]/10',
    title: 'Pagamento Aprovado!',
    subtitle: 'Seu pedido foi confirmado e está sendo preparado.',
    chip: 'Pedido confirmado',
  },
  pending: {
    icon: Clock,
    color: '#E5C07B',
    border: 'border-primary/30',
    bg: 'bg-primary/10',
    title: 'Pagamento Pendente',
    subtitle: 'Seu pedido foi recebido. Assim que o pagamento for confirmado, começaremos a preparar.',
    chip: 'Aguardando confirmação',
  },
  rejected: {
    icon: XCircle,
    color: '#FF453A',
    border: 'border-red-500/30',
    bg: 'bg-red-500/10',
    title: 'Pagamento não aprovado',
    subtitle: 'Não foi possível processar o pagamento. Tente novamente com outro método.',
    chip: 'Pagamento recusado',
  },
  unknown: {
    icon: Clock,
    color: '#E5C07B',
    border: 'border-primary/30',
    bg: 'bg-primary/10',
    title: 'Processando...',
    subtitle: 'Estamos verificando o status do seu pagamento. Você receberá uma confirmação em breve.',
    chip: 'Em processamento',
  },
}

export function CheckoutReturnPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { settings } = useSettings()

  const status = resolveStatus(searchParams)
  const orderId = searchParams.get('external_reference') || sessionStorage.getItem('last_order_id') || ''
  const paymentType = searchParams.get('payment_type') || ''

  const cfg = statusConfig[status]
  const Icon = cfg.icon

  const paymentTypeLabel: Record<string, string> = {
    credit_card: 'Cartão de crédito',
    debit_card: 'Cartão de débito',
    pix: 'PIX',
    ticket: 'Boleto',
    account_money: 'Saldo Mercado Pago',
  }

  // Link WhatsApp para acompanhar pedido
  const phone = settings.whatsapp_number || '5511999999999'
  const waMsg = `Olá! Realizei o pedido #${orderId.slice(0, 8)} e gostaria de acompanhar o envio.`
  const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`

  return (
    <div className="section-shell px-3 sm:px-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass-card rounded-[2rem] mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center gap-8 text-center p-8 sm:p-12"
      >
        {/* Ícone */}
        <div className="relative">
          <div
            className="absolute inset-0 rounded-full blur-3xl opacity-30"
            style={{ background: cfg.color }}
          />
          <Icon className="relative h-20 w-20" style={{ color: cfg.color }} />
        </div>

        {/* Texto */}
        <div className="space-y-3">
          <h1 className="text-4xl font-display font-bold uppercase tracking-tight text-white">
            {cfg.title}
          </h1>
          <p className="max-w-md text-sm leading-7 text-muted-foreground">
            {cfg.subtitle}
          </p>
        </div>

        {/* Chips de info */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className={`chip ${cfg.border} ${cfg.bg}`} style={{ color: cfg.color }}>
            <ShieldCheck className="h-4 w-4" />
            {cfg.chip}
          </span>
          {orderId && (
            <span className="chip border-white/10 bg-white/[0.03] text-white/60">
              Pedido #{orderId.slice(0, 8)}
            </span>
          )}
          {paymentType && paymentTypeLabel[paymentType] && (
            <span className="chip border-white/10 bg-white/[0.03] text-white/60">
              {paymentTypeLabel[paymentType]}
            </span>
          )}
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-2">
          {(status === 'approved' || status === 'pending' || status === 'unknown') && orderId && (
            <Link
              to={`/pedido/${orderId}`}
              className="flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 font-sans text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:opacity-90 hover:scale-105 active:scale-95"
            >
              <Package className="h-4 w-4" />
              Acompanhar meu pedido
            </Link>
          )}

          {(status === 'approved' || status === 'pending' || status === 'unknown') && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-8 py-4 font-sans text-xs font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-[#20bd5a] hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(37,211,102,0.3)]"
            >
              Acompanhar pelo WhatsApp
            </a>
          )}

          {status === 'rejected' && (
            <button
              onClick={() => navigate('/checkout')}
              className="flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 font-sans text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:scale-105 active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
              Tentar novamente
            </button>
          )}

          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 font-sans text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/10"
          >
            <Home className="h-4 w-4" />
            Voltar à loja
          </button>
        </div>
      </motion.div>
    </div>
  )
}
