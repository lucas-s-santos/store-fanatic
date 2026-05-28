import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import { useAuth } from '../lib/useAuth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock, ShieldCheck, Loader2, ArrowLeft,
  Tag, Percent, Gift, Copy, Check,
  MessageCircle, ClipboardCheck, PackageCheck,
} from 'lucide-react'
import { resolveAssetUrl } from '../lib/assets'
import { supabase } from '../lib/supabase'
import { useSettings } from '../lib/useSettings'
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
  const qrUrl = pixKey
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixKey)}&bgcolor=0c0c0c&color=ffffff&margin=8`
    : null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-lg w-full"
    >
      <div className="glass-card rounded-[2rem] px-6 py-10 sm:px-10 text-center space-y-8">
        {/* Ícone de sucesso */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
            <PackageCheck className="h-9 w-9 text-primary" />
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-display font-bold uppercase tracking-tight text-white">
            Pedido realizado!
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pedido <span className="font-mono text-primary">#{shortId}</span> — R$ {totalFmt}
          </p>
        </div>

        {/* PIX */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-4 text-left">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary text-center">
            Pague via PIX
          </p>

          {pixKey ? (
            <>
              {qrUrl && (
                <div className="flex justify-center">
                  <img
                    src={qrUrl}
                    alt="QR Code PIX"
                    className="h-[180px] w-[180px] rounded-xl border border-white/10"
                  />
                </div>
              )}
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Chave PIX
                </p>
                <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <span className="flex-1 truncate font-mono text-sm text-white">{pixKey}</span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              Entre em contato via WhatsApp para receber os dados do PIX.
            </p>
          )}

          <p className="text-center text-xs text-muted-foreground leading-relaxed">
            Após o pagamento, envie o comprovante pelo WhatsApp para confirmarmos seu pedido.
          </p>
        </div>

        {/* Botão WhatsApp */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-3 rounded-full bg-[#25D366] py-4 text-sm font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90"
        >
          <MessageCircle className="h-5 w-5" />
          Enviar comprovante no WhatsApp
        </a>

        <Link
          to="/meus-pedidos"
          className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-primary"
        >
          <ClipboardCheck className="h-4 w-4" />
          Ver meus pedidos
        </Link>
      </div>
    </motion.div>
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

      // 5. Salvar ID para rastreio e limpar carrinho
      sessionStorage.setItem('last_order_id', orderData.id)
      clearCart()
      setCompletedOrder({ id: orderData.id, grandTotal })

    } catch (err) {
      console.error('Erro ao finalizar pedido:', err)
      toast((err as Error).message || 'Erro ao processar pedido. Tente novamente.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (items.length === 0 && !completedOrder) return null

  const Err = ({ msg }: { msg?: string }) =>
    msg ? <p className="mt-1.5 text-xs text-destructive">{msg}</p> : null

  const watchCep = watch('cep')
  void watchCep

  const itemsSummary = items.map(i =>
    `${i.quantity}x ${i.title} (${i.size})${i.personalization?.name ? ` – ${i.personalization.name}` : ''}`
  ).join(', ')

  return (
    <div className="section-shell px-3 sm:px-5">
      <div className="mx-auto max-w-[1440px] space-y-8 pb-32 lg:pb-0">

        {/* Confirmação PIX + WhatsApp */}
        <AnimatePresence>
          {completedOrder && (
            <motion.div
              key="pix-confirmation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center py-8"
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
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="glass-card rounded-[1.5rem] px-6 py-8 sm:px-8"
            >
              <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <span className="chip border-primary/20 bg-primary/5 text-primary">
                    <Lock className="h-4 w-4" />
                    Checkout Seguro
                  </span>
                  <h1 className="mt-5 text-4xl font-display font-bold uppercase tracking-tight text-white sm:text-5xl">
                    Finalizar Pedido
                  </h1>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Preencha seus dados. Após confirmar, você receberá a chave PIX para pagamento.
                  </p>
                </div>
                <span className="chip border-white/10 bg-white/[0.03] text-white/50">
                  <ShieldCheck className="h-4 w-4" />
                  Sessão criptografada
                </span>
              </div>
            </motion.div>

            <form id="checkout-form" onSubmit={handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-6">

                {/* Identificação */}
                <motion.section
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.1 }}
                  className="glass-card rounded-[1.5rem] px-6 py-8 sm:px-8"
                >
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white">Identificação</h2>
                    <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Passo 01</span>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-2 block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Nome completo</label>
                      <input {...register('fullName')} className="form-input" placeholder="Ex: João da Silva" />
                      <Err msg={errors.fullName?.message} />
                    </div>
                    <div>
                      <label className="mb-2 block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">CPF</label>
                      <input
                        {...register('cpf')}
                        className="form-input"
                        placeholder="000.000.000-00"
                        maxLength={14}
                        onChange={(e) => setValue('cpf', maskCpf(e.target.value), { shouldValidate: false })}
                      />
                      <Err msg={errors.cpf?.message} />
                    </div>
                    <div>
                      <label className="mb-2 block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">E-mail</label>
                      <input type="email" {...register('email')} className="form-input" placeholder="seuemail@exemplo.com" />
                      <Err msg={errors.email?.message} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Telefone / WhatsApp</label>
                      <input
                        {...register('phone')}
                        className="form-input"
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                        onChange={(e) => setValue('phone', maskPhone(e.target.value), { shouldValidate: false })}
                      />
                      <Err msg={errors.phone?.message} />
                    </div>
                  </div>
                </motion.section>

                {/* Endereço */}
                <motion.section
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.18 }}
                  className="glass-card rounded-[1.5rem] px-6 py-8 sm:px-8"
                >
                  <div className="mb-6 flex items-center justify-between gap-4">
                    <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white">Endereço de Entrega</h2>
                    <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Passo 02</span>
                  </div>
                  <div className="grid gap-5 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">CEP</label>
                      <div className="relative">
                        <input
                          {...register('cep')}
                          className="form-input pr-10"
                          placeholder="00000-000"
                          maxLength={9}
                          onChange={handleCepChange}
                        />
                        {isFetchingCep && (
                          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          </div>
                        )}
                      </div>
                      <Err msg={errors.cep?.message} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Rua</label>
                      <input {...register('address')} className="form-input" placeholder="Av. das Nações Unidas" />
                      <Err msg={errors.address?.message} />
                    </div>
                    <div>
                      <label className="mb-2 block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Número</label>
                      <input {...register('number')} className="form-input" placeholder="123" />
                      <Err msg={errors.number?.message} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="mb-2 block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Complemento (opcional)</label>
                      <input {...register('complement')} className="form-input" placeholder="Apto 42, Bloco B..." />
                    </div>
                  </div>
                </motion.section>
              </div>

              {/* Sidebar — Resumo */}
              <aside className="glass-card rounded-[1.5rem] h-fit px-6 py-8 sm:px-8 lg:sticky lg:top-28">
                <div className="space-y-6">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white">Resumo</h3>
                    <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                      {items.length} {items.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>

                  {/* Lista de itens */}
                  <ul className="custom-scrollbar max-h-64 space-y-4 overflow-y-auto border-y border-white/10 py-5">
                    {items.map((item) => (
                      <li key={`${item.id}-${item.size}`} className="flex justify-between gap-4 text-sm">
                        <div className="flex gap-3 min-w-0">
                          <div className="h-12 w-10 shrink-0 overflow-hidden border border-white/10">
                            <img src={resolveAssetUrl(item.imageUrl)} alt={item.title} className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-1 text-white font-medium">{item.title}</p>
                            <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                              {item.quantity}x · Tam. {item.size}
                            </p>
                            {item.personalization && (
                              <p className="font-sans text-[9px] text-primary">
                                {item.personalization.name && `${item.personalization.name}`}
                                {item.personalization.number && ` #${item.personalization.number}`}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 font-bold text-white">
                          R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Cupom */}
                  <div className="border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="h-4 w-4 text-primary" />
                      <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Cupom de desconto
                      </span>
                    </div>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-green-400" />
                          <span className="text-sm font-semibold text-green-400">{appliedCoupon.code}</span>
                          <span className="text-xs text-green-400/70">
                            ({appliedCoupon.discount_type === 'percentage'
                              ? `${appliedCoupon.discount_value}%`
                              : `R$ ${appliedCoupon.discount_value.toFixed(2).replace('.', ',')}`})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setAppliedCoupon(null); setCouponDiscount(0) }}
                          className="text-xs text-muted-foreground hover:text-white transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="CUPOM10"
                          className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary"
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), validateCoupon())}
                        />
                        <button
                          type="button"
                          onClick={validateCoupon}
                          disabled={validatingCoupon || !couponCode.trim()}
                          className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                          {validatingCoupon ? <Loader2 className="h-3 w-3 animate-spin" /> : <Percent className="h-3 w-3" />}
                          Aplicar
                        </button>
                      </div>
                    )}
                    {couponError && <p className="mt-2 text-xs text-destructive">{couponError}</p>}
                  </div>

                  {/* Totais */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="text-white">R$ {total.toFixed(2).replace('.', ',')}</span>
                    </div>
                    {couponDiscount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-400">Desconto</span>
                        <span className="text-green-400">- R$ {couponDiscount.toFixed(2).replace('.', ',')}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Frete</span>
                      {shippingFree
                        ? <span className="font-bold text-accent">Grátis ✓</span>
                        : <span className="text-white">R$ {shipping.toFixed(2).replace('.', ',')}</span>}
                    </div>
                    <div className="border-t border-white/10 pt-4 flex items-end justify-between">
                      <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Total</span>
                      <span className="text-4xl font-display font-bold text-white tracking-tight">
                        R$ {grandTotal.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  </div>

                  {/* Botão Finalizar */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-glow-primary w-full h-14 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Salvando pedido...
                        </>
                      ) : (
                        <>
                          <PackageCheck className="h-5 w-5" />
                          Confirmar Pedido
                        </>
                      )}
                    </span>
                  </button>

                  <p className="text-center text-[10px] text-muted-foreground leading-relaxed">
                    Após confirmar, você receberá a chave PIX para pagamento e poderá enviar o comprovante pelo WhatsApp.
                  </p>

                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex w-full items-center justify-center gap-2 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                  </button>
                </div>
              </aside>
            </form>
          </>
        )}
      </div>

      {/* Barra flutuante mobile */}
      {!completedOrder && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-[1440px] items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Total</p>
              <p className="text-xl font-display font-bold text-white">R$ {grandTotal.toFixed(2).replace('.', ',')}</p>
            </div>
            <button
              type="submit"
              form="checkout-form"
              disabled={isSubmitting}
              className="btn-glow-primary shrink-0 h-12 px-6 text-xs disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
