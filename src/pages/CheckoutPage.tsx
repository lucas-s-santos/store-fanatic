import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import { useAuth } from '../lib/useAuth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Lock, Loader2, ArrowLeft,
  Tag, Percent, Gift, Copy, Check,
  ClipboardCheck, PackageCheck, MapPin, UserRound,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { WhatsAppIcon } from '../components/ui/whatsapp-icon'
import { optimizedImageUrl } from '../lib/assets'
import { displayProductName } from '../lib/catalog'
import { supabase } from '../lib/supabase'
import { useSettings } from '../lib/useSettings'
import { cn, formatPrice } from '../lib/utils'
import { useToast } from '../components/ui/Toast'

// ─── Validadores ────────────────────────────────────────────────────────────
function validateCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g, '')
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i)
  let rem = (sum * 10) % 11
  if (rem === 10 || rem === 11) rem = 0
  if (rem !== parseInt(c[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i)
  rem = (sum * 10) % 11
  if (rem === 10 || rem === 11) rem = 0
  return rem === parseInt(c[10])
}

const checkoutSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().regex(/^\(\d{2}\) 9\d{4}-\d{4}$/, 'Telefone inválido (ex: (11) 99999-9999)'),
  cpf: z.string()
    .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido (000.000.000-00)')
    .refine(validateCPF, 'CPF inválido'),
  cep: z.string().regex(/^\d{5}-\d{3}$/, 'CEP inválido (00000-000)'),
  address: z.string().min(5, 'Endereço obrigatório'),
  number: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional(),
  couponCode: z.string().optional(),
})

type FormData = z.infer<typeof checkoutSchema>

// ─── Máscaras ───────────────────────────────────────────────────────────────
const maskCpf = (v: string) =>
  v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')

const maskCep = (v: string) =>
  v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')

const maskPhone = (v: string) =>
  v.replace(/\D/g, '').slice(0, 11).replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')

const PIX_STEPS = ['Pague o PIX com a chave abaixo', 'Envie o comprovante no WhatsApp', 'A gente confirma e prepara o envio']

// ─── Tela PIX + WhatsApp ────────────────────────────────────────────────────
function PixConfirmation({
  orderId,
  grandTotal,
  itemsSummary,
  pixKey,
  whatsapp,
}: {
  orderId: string
  grandTotal: number
  itemsSummary: string
  pixKey: string
  whatsapp: string
}) {
  const [copied, setCopied] = useState(false)
  const reduce = useReducedMotion() ?? false
  const shortId = orderId.slice(0, 8).toUpperCase()
  const totalFmt = grandTotal.toFixed(2).replace('.', ',')

  const handleCopy = () => {
    if (!pixKey) return
    navigator.clipboard.writeText(pixKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const whatsappMsg = encodeURIComponent(
    `Olá! Acabei de fazer um pedido na Store Fanatic 🎽\n\n` +
    `📦 Pedido: #${shortId}\n` +
    `💰 Total: R$ ${totalFmt}\n` +
    `📋 ${itemsSummary}\n\n` +
    `Segue o comprovante do PIX!`
  )
  const whatsappUrl = `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${whatsappMsg}`
  // QR preto no branco: é o que os apps de banco leem melhor.
  const qrUrl = pixKey
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixKey)}&bgcolor=ffffff&color=0b0e15&margin=10`
    : null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto w-full max-w-lg"
    >
      <div className="space-y-8 rounded-[2rem] border border-border bg-card px-6 py-10 text-center sm:px-10">
        {/* Momento raro (uma vez por compra): aqui cabe um pouco de festa. */}
        <div className="flex justify-center">
          <motion.span
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.8)' }}
            animate={{ opacity: 1, transform: 'scale(1)' }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.25, delay: 0.1 }}
            className="relative flex size-20 items-center justify-center rounded-full bg-success/15 text-success"
          >
            {!reduce && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full border-2 border-success"
                initial={{ opacity: 0.5, transform: 'scale(1)' }}
                animate={{ opacity: 0, transform: 'scale(1.7)' }}
                transition={{ duration: 0.8, delay: 0.45, ease: [0.23, 1, 0.32, 1] }}
              />
            )}
            <svg viewBox="0 0 24 24" className="size-10" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <motion.path
                d="M5 12.5l4.5 4.5L19 7.5"
                initial={reduce ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
              />
            </svg>
          </motion.span>
        </div>

        <div>
          <h1 className="display-title text-5xl">Pedido feito!</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Pedido <span className="font-mono font-semibold text-primary">#{shortId}</span> · total de{' '}
            <strong className="text-foreground">R$ {totalFmt}</strong>
          </p>
        </div>

        <ol className="grid gap-2 text-left text-sm">
          {PIX_STEPS.map((step, i) => (
            <motion.li
              key={step}
              initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ duration: 0.35, delay: 0.55 + i * 0.06, ease: [0.23, 1, 0.32, 1] }}
              className="flex items-center gap-3 rounded-xl bg-background/60 px-4 py-3"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground">
                {i + 1}
              </span>
              {step}
            </motion.li>
          ))}
        </ol>

        <div className="space-y-4 rounded-2xl border border-border bg-background/60 p-5 text-left sm:p-6">
          <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-primary">Pagamento via PIX</p>

          {pixKey ? (
            <>
              {qrUrl && (
                <div className="flex justify-center">
                  <img src={qrUrl} alt="QR Code da chave PIX" className="size-[200px] rounded-2xl bg-white" />
                </div>
              )}
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Chave PIX</p>
                <div className="flex items-center gap-2 rounded-xl border border-input bg-card py-2 pl-4 pr-2">
                  <span className="flex-1 truncate font-mono text-sm">{pixKey}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant={copied ? 'success' : 'default'}
                    onClick={handleCopy}
                    className="min-w-[7.25rem] overflow-hidden"
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={copied ? 'copied' : 'copy'}
                        initial={{ opacity: 0, filter: 'blur(2px)', transform: reduce ? 'none' : 'translateY(6px)' }}
                        animate={{ opacity: 1, filter: 'blur(0px)', transform: 'translateY(0px)' }}
                        exit={{ opacity: 0, filter: 'blur(2px)', transform: reduce ? 'none' : 'translateY(-6px)' }}
                        transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                        className="inline-flex items-center gap-1.5"
                      >
                        {copied ? <Check /> : <Copy />}
                        {copied ? 'Copiada!' : 'Copiar'}
                      </motion.span>
                    </AnimatePresence>
                  </Button>
                  <span className="sr-only" aria-live="polite">{copied ? 'Chave PIX copiada' : ''}</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Chame a gente no WhatsApp para receber os dados do PIX.
            </p>
          )}
        </div>

        <Button asChild size="xl" variant="success" className="w-full">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon />
            Enviar comprovante
          </a>
        </Button>

        <Link
          to="/meus-pedidos"
          className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ClipboardCheck className="size-4" />
          Ver meus pedidos
        </Link>
      </div>
    </motion.div>
  )
}

/** Rótulo ligado ao campo e erro anunciado para leitor de tela. */
function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string
  label: string
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function StepHeader({ step, title, icon: Icon }: { step: number; title: string; icon: typeof MapPin }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">{step}</span>
      <h2 className="text-xl font-extrabold">{title}</h2>
      <Icon className="ml-auto size-5 text-muted-foreground" aria-hidden />
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────
export function CheckoutPage() {
  const { items, clearCart } = useCartStore()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { toast } = useToast()
  const { user, loading: authLoading } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFetchingCep, setIsFetchingCep] = useState(false)
  const [completedOrder, setCompletedOrder] = useState<{ id: string; grandTotal: number } | null>(null)

  // Cupom
  const [couponCode, setCouponCode] = useState('')
  const [couponError, setCouponError] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string
    discount_value: number
    discount_type: string
  } | null>(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(checkoutSchema),
  })

  const total = items.reduce((acc, i) => acc + i.price * i.quantity, 0)
  const shippingFree = total >= settings.shipping_free_threshold
  const shipping = shippingFree ? 0 : settings.shipping_cost
  const grandTotal = total + shipping - couponDiscount

  useEffect(() => {
    if (items.length === 0 && !completedOrder) navigate('/carrinho')
  }, [items.length, completedOrder, navigate])

  useEffect(() => {
    if (!authLoading && !user) navigate('/login?next=/checkout')
  }, [user, authLoading, navigate])

  // ── CEP ──────────────────────────────────────────────────────────────────
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCep(e.target.value)
    setValue('cep', masked)
    const digits = masked.replace(/\D/g, '')
    if (digits.length !== 8) return
    setIsFetchingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const json = await res.json()
      if (!json.erro && json.logradouro) {
        setValue('address', json.logradouro, { shouldValidate: true })
      }
    } catch { /* usuário preenche manualmente */ }
    finally { setIsFetchingCep(false) }
  }

  // ── Cupom ─────────────────────────────────────────────────────────────────
  const validateCoupon = async () => {
    if (!couponCode.trim()) return
    setValidatingCoupon(true)
    setCouponError('')
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.trim().toUpperCase())
        .eq('active', true)
        .single()

      if (error || !data) { setCouponError('Cupom inválido ou expirado'); return }
      if (data.expires_at && new Date(data.expires_at) < new Date()) { setCouponError('Cupom expirado'); return }
      if (data.max_uses > 0 && data.used_count >= data.max_uses) { setCouponError('Cupom esgotado'); return }
      if (data.min_order_value > 0 && total < data.min_order_value) {
        setCouponError(`Valor mínimo: R$ ${data.min_order_value.toFixed(2).replace('.', ',')}`)
        return
      }

      let discount = data.discount_type === 'percentage'
        ? total * (data.discount_value / 100)
        : data.discount_value
      discount = Math.min(discount, total)

      setCouponDiscount(discount)
      setAppliedCoupon({ code: data.code, discount_value: data.discount_value, discount_type: data.discount_type })
      setCouponCode('')
    } catch {
      setCouponError('Erro ao validar cupom')
    } finally {
      setValidatingCoupon(false)
    }
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      // 1. Verificar estoque
      for (const item of items) {
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity,stock')
          .eq('id', item.id)
          .single()
        const available = (product as any)?.stock_quantity ?? (product as any)?.stock
        if (available !== null && available !== undefined && available < item.quantity) {
          throw new Error(`"${item.title}" tem apenas ${available} unidade(s) em estoque.`)
        }
      }

      // 2. Criar pedido
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user?.id ?? null,
          customer_name: data.fullName,
          customer_cpf: data.cpf,
          customer_email: data.email,
          customer_phone: data.phone,
          customer_address: `${data.address}, ${data.number}${data.complement ? ' - ' + data.complement : ''} - CEP: ${data.cep}`,
          total_amount: grandTotal,
          status: 'aguardando_pagamento',
          payment_method: 'pix',
          shipping_cost: shipping,
          discount_amount: couponDiscount,
          coupon_code: appliedCoupon?.code || null,
          personalization: items.filter(i => i.personalization).map(i => i.personalization),
        })
        .select()
        .single()

      if (orderError) throw new Error(orderError.message || 'Erro ao registrar pedido.')

      // 3. Criar itens do pedido
      const { error: itemsError } = await supabase.from('order_items').insert(
        items.map((item) => ({
          order_id: orderData.id,
          product_id: item.id ?? null,
          product_title: item.title,
          quantity: item.quantity,
          size: item.size,
          unit_price: item.price,
          personalization: item.personalization ? [item.personalization] : [],
        }))
      )
      if (itemsError) throw new Error(itemsError.message || 'Erro ao registrar itens do pedido.')

      // 4. Incrementar uso do cupom
      if (appliedCoupon) {
        await supabase.rpc('increment_coupon_usage', { coupon_code: appliedCoupon.code })
      }

      // 5. O banco recalcula o total a partir do catálogo (migration_013);
      // a tela do PIX mostra o valor gravado, não o calculado aqui.
      const { data: savedOrder } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('id', orderData.id)
        .single()
      const finalTotal = savedOrder?.total_amount != null ? Number(savedOrder.total_amount) : grandTotal

      // 6. Salvar ID para rastreio e limpar carrinho
      sessionStorage.setItem('last_order_id', orderData.id)
      clearCart()
      setCompletedOrder({ id: orderData.id, grandTotal: finalTotal })

    } catch (err) {
      console.error('Erro ao finalizar pedido:', err)
      toast((err as Error).message || 'Erro ao processar pedido. Tente novamente.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (items.length === 0 && !completedOrder) return null

  const watchCep = watch('cep')
  void watchCep

  const itemsSummary = items.map(i =>
    `${i.quantity}x ${i.title} (${i.size})${i.personalization?.name ? ` – ${i.personalization.name}` : ''}`
  ).join(', ')

  const inputProps = (name: keyof FormData) => ({
    id: `checkout-${name}`,
    'aria-invalid': Boolean(errors[name]) || undefined,
    'aria-describedby': errors[name] ? `checkout-${name}-error` : undefined,
  })

  return (
    <div className="pb-32 pt-[7.25rem] lg:pb-16 lg:pt-[8.25rem]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">

        {/* Confirmação PIX + WhatsApp */}
        <AnimatePresence>
          {completedOrder && (
            <motion.div
              key="pix-confirmation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center py-4"
            >
              <PixConfirmation
                orderId={completedOrder.id}
                grandTotal={completedOrder.grandTotal}
                itemsSummary={itemsSummary}
                pixKey={settings.pix_key}
                whatsapp={settings.whatsapp_number}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formulário de checkout */}
        {!completedOrder && (
          <>
            <div>
              <p className="eyebrow">
                <Lock className="size-3.5" aria-hidden />
                Compra segura
              </p>
              <h1 className="display-title mt-3 text-5xl sm:text-6xl lg:text-7xl">Finalizar pedido</h1>
              <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
                Preencha seus dados. Ao confirmar, você recebe a chave PIX e envia o comprovante pelo WhatsApp.
              </p>
            </div>

            <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
              <div className="space-y-6">

                {/* Identificação */}
                <motion.section
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.1 }}
                  className="rounded-3xl border border-border bg-card p-6 sm:p-8"
                >
                  <StepHeader step={1} title="Seus dados" icon={UserRound} />
                  <div className="grid gap-5 md:grid-cols-2">
                    <Field id="checkout-fullName" label="Nome completo" error={errors.fullName?.message} className="md:col-span-2">
                      <input {...register('fullName')} {...inputProps('fullName')} autoComplete="name" className="form-input" placeholder="Ex.: João da Silva" />
                    </Field>
                    <Field id="checkout-cpf" label="CPF" error={errors.cpf?.message}>
                      <input
                        {...register('cpf')}
                        {...inputProps('cpf')}
                        inputMode="numeric"
                        className="form-input"
                        placeholder="000.000.000-00"
                        maxLength={14}
                        onChange={(e) => setValue('cpf', maskCpf(e.target.value), { shouldValidate: false })}
                      />
                    </Field>
                    <Field id="checkout-email" label="E-mail" error={errors.email?.message}>
                      <input type="email" {...register('email')} {...inputProps('email')} autoComplete="email" className="form-input" placeholder="seuemail@exemplo.com" />
                    </Field>
                    <Field id="checkout-phone" label="Celular / WhatsApp" error={errors.phone?.message} className="md:col-span-2">
                      <input
                        {...register('phone')}
                        {...inputProps('phone')}
                        type="tel"
                        autoComplete="tel-national"
                        className="form-input"
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                        onChange={(e) => setValue('phone', maskPhone(e.target.value), { shouldValidate: false })}
                      />
                    </Field>
                  </div>
                </motion.section>

                {/* Endereço */}
                <motion.section
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.18 }}
                  className="rounded-3xl border border-border bg-card p-6 sm:p-8"
                >
                  <StepHeader step={2} title="Endereço de entrega" icon={MapPin} />
                  <div className="grid gap-5 md:grid-cols-3">
                    <Field id="checkout-cep" label="CEP" error={errors.cep?.message}>
                      <div className="relative">
                        <input
                          {...register('cep')}
                          {...inputProps('cep')}
                          inputMode="numeric"
                          autoComplete="postal-code"
                          className="form-input pr-10"
                          placeholder="00000-000"
                          maxLength={9}
                          onChange={handleCepChange}
                        />
                        {isFetchingCep && (
                          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="size-4 animate-spin text-primary" />
                          </div>
                        )}
                      </div>
                    </Field>
                    <Field id="checkout-address" label="Rua" error={errors.address?.message} className="md:col-span-2">
                      <input {...register('address')} {...inputProps('address')} autoComplete="address-line1" className="form-input" placeholder="Av. das Nações Unidas" />
                    </Field>
                    <Field id="checkout-number" label="Número" error={errors.number?.message}>
                      <input {...register('number')} {...inputProps('number')} className="form-input" placeholder="123" />
                    </Field>
                    <Field id="checkout-complement" label="Complemento (opcional)" className="md:col-span-2">
                      <input {...register('complement')} {...inputProps('complement')} autoComplete="address-line2" className="form-input" placeholder="Apto 42, Bloco B..." />
                    </Field>
                  </div>
                </motion.section>
              </div>

              {/* Resumo */}
              <aside className="h-fit rounded-3xl border border-border bg-card p-6 sm:p-8 lg:sticky lg:top-24">
                <div className="space-y-6">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="display-title text-3xl">Resumo</h2>
                    <span className="text-sm font-semibold text-muted-foreground">
                      {items.length} {items.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>

                  <ul className="custom-scrollbar max-h-72 space-y-4 overflow-y-auto border-y border-border py-5">
                    {items.map((item) => (
                      <li key={`${item.id}-${item.size}`} className="flex justify-between gap-4 text-sm">
                        <div className="flex min-w-0 gap-3">
                          <img src={optimizedImageUrl(item.imageUrl, 160)} alt="" className="aspect-[4/5] w-12 shrink-0 rounded-lg bg-muted object-cover" />
                          <div className="min-w-0">
                            <p className="line-clamp-1 font-semibold">{displayProductName(item.title)}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity}x · Tamanho {item.size}
                            </p>
                            {item.personalization && (
                              <p className="text-xs font-semibold text-primary">
                                {item.personalization.name && `${item.personalization.name}`}
                                {item.personalization.number && ` #${item.personalization.number}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 font-bold tabular-nums">{formatPrice(item.price * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Cupom */}
                  <div>
                    <label htmlFor="checkout-coupon" className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      <Tag className="size-4 text-primary" aria-hidden />
                      Cupom de desconto
                    </label>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between rounded-xl border border-success/25 bg-success/10 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Gift className="size-4 text-success" aria-hidden />
                          <span className="text-sm font-bold text-success">{appliedCoupon.code}</span>
                          <span className="text-xs text-success/80">
                            ({appliedCoupon.discount_type === 'percentage'
                              ? `${appliedCoupon.discount_value}%`
                              : formatPrice(appliedCoupon.discount_value)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setAppliedCoupon(null); setCouponDiscount(0) }}
                          className="text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Remover
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          id="checkout-coupon"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="CUPOM10"
                          className="form-input h-11 flex-1 py-0 font-semibold uppercase"
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), validateCoupon())}
                        />
                        <Button type="button" variant="outline" className="h-11" onClick={validateCoupon} disabled={validatingCoupon || !couponCode.trim()}>
                          {validatingCoupon ? <Loader2 className="animate-spin" /> : <Percent />}
                          Aplicar
                        </Button>
                      </div>
                    )}
                    {couponError && <p role="alert" className="mt-2 text-xs font-medium text-destructive">{couponError}</p>}
                  </div>

                  <dl className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Subtotal</dt>
                      <dd className="tabular-nums">{formatPrice(total)}</dd>
                    </div>
                    {couponDiscount > 0 && (
                      <div className="flex items-center justify-between text-success">
                        <dt>Desconto</dt>
                        <dd className="tabular-nums">- {formatPrice(couponDiscount)}</dd>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">Frete</dt>
                      <dd className={cn('tabular-nums', shippingFree && 'font-bold text-success')}>
                        {shippingFree ? 'Grátis' : formatPrice(shipping)}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between border-t border-border pt-4">
                      <dt className="font-bold">Total</dt>
                      <dd className="text-3xl font-black tabular-nums">{formatPrice(grandTotal)}</dd>
                    </div>
                  </dl>

                  <Button type="submit" size="xl" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <PackageCheck />}
                    {isSubmitting ? 'Salvando pedido…' : 'Confirmar pedido'}
                  </Button>

                  <p className="text-center text-xs leading-relaxed text-muted-foreground">
                    Depois de confirmar, você recebe a chave PIX e envia o comprovante pelo WhatsApp.
                  </p>

                  <Button type="button" variant="ghost" className="w-full" onClick={() => navigate(-1)}>
                    <ArrowLeft />
                    Voltar
                  </Button>
                </div>
              </aside>
            </form>
          </>
        )}
      </div>

      {/* Barra fixa no celular */}
      {!completedOrder && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-black tabular-nums">{formatPrice(grandTotal)}</p>
            </div>
            <Button type="submit" form="checkout-form" size="lg" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <PackageCheck />}
              Confirmar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
