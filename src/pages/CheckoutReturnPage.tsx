import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, XCircle, Home, RotateCcw, Package } from 'lucide-react'

import { Button } from '../components/ui/button'
import { WhatsAppIcon, whatsappUrl } from '../components/ui/whatsapp-icon'
import { useSettings } from '../lib/useSettings'
import { cn } from '../lib/utils'

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
    tone: 'bg-success/15 text-success',
    title: 'Pagamento aprovado!',
    subtitle: 'Seu pedido foi confirmado e está sendo preparado.',
    chip: 'Pedido confirmado',
  },
  pending: {
    icon: Clock,
    tone: 'bg-primary/15 text-primary',
    title: 'Pagamento pendente',
    subtitle: 'Recebemos seu pedido. Assim que o pagamento for confirmado, começamos a preparar.',
    chip: 'Aguardando confirmação',
  },
  rejected: {
    icon: XCircle,
    tone: 'bg-destructive/15 text-destructive',
    title: 'Pagamento não aprovado',
    subtitle: 'Não conseguimos processar o pagamento. Tente de novo ou fale com a gente.',
    chip: 'Pagamento recusado',
  },
  unknown: {
    icon: Clock,
    tone: 'bg-primary/15 text-primary',
    title: 'Processando…',
    subtitle: 'Estamos conferindo o pagamento. Você recebe a confirmação em breve.',
    chip: 'Em processamento',
  },
}

const paymentTypeLabel: Record<string, string> = {
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  pix: 'PIX',
  ticket: 'Boleto',
  account_money: 'Saldo Mercado Pago',
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
  const canFollow = status !== 'rejected'

  // Link WhatsApp para acompanhar pedido
  const phone = settings.whatsapp_number || '5511999999999'
  const waLink = whatsappUrl(phone, `Olá! Realizei o pedido #${orderId.slice(0, 8)} e gostaria de acompanhar o envio.`)

  return (
    <div className="page-shell px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto flex max-w-2xl flex-col items-center gap-7 rounded-[2rem] border border-border bg-card px-6 py-12 text-center sm:px-12"
      >
        <span className={cn('flex size-24 items-center justify-center rounded-full', cfg.tone)}>
          <Icon className="size-11" aria-hidden />
        </span>

        <div className="space-y-3">
          <h1 className="display-title text-5xl sm:text-6xl">{cfg.title}</h1>
          <p className="mx-auto max-w-md leading-7 text-muted-foreground">{cfg.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className={cn('rounded-full px-3.5 py-1.5 text-sm font-bold', cfg.tone)}>{cfg.chip}</span>
          {orderId && (
            <span className="rounded-full bg-muted px-3.5 py-1.5 font-mono text-sm font-semibold text-muted-foreground">
              Pedido #{orderId.slice(0, 8).toUpperCase()}
            </span>
          )}
          {paymentType && paymentTypeLabel[paymentType] && (
            <span className="rounded-full bg-muted px-3.5 py-1.5 text-sm font-semibold text-muted-foreground">
              {paymentTypeLabel[paymentType]}
            </span>
          )}
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          {canFollow && orderId && (
            <Button asChild size="lg">
              <Link to={`/pedido/${orderId}`}>
                <Package />
                Acompanhar pedido
              </Link>
            </Button>
          )}
          {canFollow && (
            <Button asChild size="lg" variant="success">
              <a href={waLink} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon />
                Falar no WhatsApp
              </a>
            </Button>
          )}
          {status === 'rejected' && (
            <Button size="lg" onClick={() => navigate('/checkout')}>
              <RotateCcw />
              Tentar de novo
            </Button>
          )}
          <Button asChild size="lg" variant="outline">
            <Link to="/">
              <Home />
              Voltar à loja
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
