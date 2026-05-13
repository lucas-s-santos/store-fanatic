import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Lock, ShieldCheck, Zap, CreditCard,
  Copy, Check, Loader2, ArrowLeft, Tag, Percent, Gift
} from 'lucide-react'
import { resolveAssetUrl } from '../lib/assets'
import { supabase } from '../lib/supabase'
import { createPixPayment } from '../lib/mercadoPago'
import { useSettings } from '../lib/useSettings'

const baseSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido (000.000.000-00)'),
  cep: z.string().regex(/^\d{5}-\d{3}$/, 'CEP inválido (00000-000)'),
  address: z.string().min(5, 'Endereço obrigatório'),
  number: z.string().min(1, 'Número obrigatório'),
  complement: z.string().optional(),
  paymentMethod: z.enum(['pix', 'credit_card']),
  couponCode: z.string().optional(),
})

const cardSchema = baseSchema.extend({
  cardNumber: z.string().regex(/^\d{4} \d{4} \d{4} \d{4}$/, 'Número do cartão inválido'),
  cardName: z.string().min(3, 'Nome no cartão obrigatório'),
  cardExpiry: z.string().regex(/^\d{2}\/\d{2}$/, 'Validade inválida (MM/AA)'),
  cardCvv: z.string().regex(/^\d{3,4}$/, 'CVV inválido'),
})

type FormData = z.infer<typeof cardSchema>

const maskCpf = (v: string) =>
  v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')

const maskCep = (v: string) =>
  v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2')

const maskPhone = (v: string) =>
  v.replace(/\D/g, '').slice(0, 11).replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3')

const maskCard = (v: string) =>
  v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ')

const maskExpiry = (v: string) =>
  v.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d)/, '$1/$2')

export function CheckoutPage() {
  const { items, clearCart } = useCartStore()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const [isSuccess, setIsSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pixData, setPixData] = useState<{
    qr_code: string
    qr_code_base64: string
    payment_id: string
  } | null>(null)
  const [pixCopied, setPixCopied] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponCode, setCouponCode] = useState('')
  const [couponError, setCouponError] = useState('')
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
    resolver: zodResolver(cardSchema),
    defaultValues: { paymentMethod: 'pix' },
  })

  const paymentMethod = watch('paymentMethod')
  const total = items.reduce((acc, i) => acc + i.price * i.quantity, 0)
  const shippingFree = total >= settings.shipping_free_threshold
  const shipping = shippingFree ? 0 : settings.shipping_cost
  const grandTotal = total + shipping - couponDiscount

  useEffect(() => {
    if (items.length === 0 && !isSuccess) navigate('/carrinho')
  }, [items.length, isSuccess, navigate])

  const copyPix = () => {
    if (!pixData?.qr_code) return
    navigator.clipboard.writeText(pixData.qr_code)
    setPixCopied(true)
    setTimeout(() => setPixCopied(false), 2500)
  }

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

      if (error || !data) {
        setCouponError('Cupom inválido ou expirado')
        return
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setCouponError('Cupom expirado')
        return
      }

      if (data.max_uses > 0 && data.used_count >= data.max_uses) {
        setCouponError('Cupom esgotado')
        return
      }

      if (data.min_order_value > 0 && total < data.min_order_value) {
        setCouponError(`Valor mínimo do pedido: R$ ${data.min_order_value.toFixed(2).replace('.', ',')}`)
        return
      }

      let discount = 0
      if (data.discount_type === 'percentage') {
        discount = total * (data.discount_value / 100)
      } else {
        discount = data.discount_value
      }
      discount = Math.min(discount, total)

      setCouponDiscount(discount)
      setAppliedCoupon({
        code: data.code,
        discount_value: data.discount_value,
        discount_type: data.discount_type,
      })
      setCouponCode('')
    } catch {
      setCouponError('Erro ao validar cupom')
    } finally {
      setValidatingCoupon(false)
    }
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      const orderItems = items.map((item) => ({
        product_title: item.title,
        quantity: item.quantity,
        size: item.size,
        price: item.price,
        personalization: item.personalization ? [item.personalization] : [],
      }))

      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: data.fullName,
          customer_cpf: data.cpf,
          customer_email: data.email,
          customer_phone: data.phone,
          customer_address: `${data.address}, ${data.number} - ${data.complement || ''} - CEP: ${data.cep}`,
          total_amount: grandTotal,
          status: 'aguardando_pagamento',
          payment_method: data.paymentMethod,
          shipping_cost: shipping,
          discount_amount: couponDiscount,
          coupon_code: appliedCoupon?.code || null,
          personalization: orderItems.filter(i => i.personalization.length > 0).map(i => i.personalization[0]),
        })
        .select()
        .single()

      if (orderError) throw orderError

      const { error: itemsError } = await supabase.from('order_items').insert(
        items.map((item) => ({
          order_id: orderData.id,
          product_title: item.title,
          quantity: item.quantity,
          size: item.size,
          price: item.price,
          personalization: item.personalization ? [item.personalization] : [],
        }))
      )
      if (itemsError) throw itemsError

      // Atualizar uso do cupom
      if (appliedCoupon) {
        await supabase.rpc('increment_coupon_usage', { coupon_code: appliedCoupon.code })
      }

      if (data.paymentMethod === 'pix') {
        const paymentResult = await createPixPayment(
          items.map((i) => ({
            title: i.title + (i.personalization?.name ? ` (${i.personalization.name})` : ''),
            quantity: i.quantity,
            unit_price: i.price,
          })),
          { email: data.email, first_name: data.fullName.split(' ')[0] },
          orderData.id
        )

        if (paymentResult) {
          setPixData({
            qr_code: paymentResult.qr_code || '',
            qr_code_base64: paymentResult.qr_code_base64 || '',
            payment_id: paymentResult.id?.toString() || '',
          })

          await supabase.from('payment_records').insert({
            order_id: orderData.id,
            mp_preference_id: paymentResult.preference_id || '',
            mp_payment_id: paymentResult.id?.toString() || '',
            mp_status: paymentResult.status || 'pending',
            qr_code: paymentResult.qr_code || '',
            qr_code_base64: paymentResult.qr_code_base64 || '',
          })
        }
      }

      setOrderId(orderData.id)
      setIsSuccess(true)
      clearCart()
    } catch (err) {
      console.error('Erro ao finalizar pedido:', err)
      alert('Ocorreu um erro ao processar o pedido. Verifique o console.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    const phone = settings.whatsapp_number || "5511999999999"
    const itemsText = items.map(i => {
      const personalization = i.personalization
        ? ` (${i.personalization.name || ''}${i.personalization.number ? ' #' + i.personalization.number : ''})`
        : ''
      return `${i.quantity}x ${i.title} - Tam. ${i.size}${personalization}`
    }).join('%0A')
    const msg = `Olá! Acabei de fazer o pedido #${orderId?.slice(0,8) || ''}. Gostaria de acompanhar o envio!%0A%0A*Resumo do Pedido:*%0A${itemsText}%0A%0A*Total:* R$ ${grandTotal.toFixed(2).replace('.', ',')}`
    const waLink = `https://wa.me/${phone}?text=${msg}`

    return (
      <div className="section-shell px-3 sm:px-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card rounded-[2rem] mx-auto flex min-h-[65vh] max-w-[1440px] flex-col items-center justify-center gap-8 text-center p-8"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[#25D366]/20 blur-3xl" />
            <CheckCircle2 className="relative h-20 w-20 text-[#25D366]" />
          </div>
          <div>
            <h1 className="text-4xl font-display font-bold uppercase tracking-tight text-white">
              Pedido confirmado
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              O sistema recebeu seu pedido. Seu código é <strong className="text-white">#{orderId?.slice(0, 8)}</strong>
            </p>
          </div>

          {pixData?.qr_code && (
            <div className="w-full max-w-md space-y-4">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary mb-4 text-center">
                  Pagamento PIX
                </p>
                {pixData.qr_code_base64 ? (
                  <img
                    src={`data:image/png;base64,${pixData.qr_code_base64}`}
                    alt="QR Code PIX"
                    className="mx-auto w-48 h-48"
                  />
                ) : (
                  <div className="flex justify-center">
                    <svg width="160" height="160" viewBox="0 0 160 160" className="block">
                      <rect width="160" height="160" fill="transparent" />
                      <rect x="10" y="10" width="40" height="40" rx="6" fill="rgba(229,192,123,0.9)" />
                      <rect x="17" y="17" width="26" height="26" rx="4" fill="rgba(3,3,3,1)" />
                      <rect x="22" y="22" width="16" height="16" rx="2" fill="rgba(229,192,123,0.9)" />
                      <rect x="110" y="10" width="40" height="40" rx="6" fill="rgba(229,192,123,0.9)" />
                      <rect x="117" y="17" width="26" height="26" rx="4" fill="rgba(3,3,3,1)" />
                      <rect x="122" y="22" width="16" height="16" rx="2" fill="rgba(229,192,123,0.9)" />
                      <rect x="10" y="110" width="40" height="40" rx="6" fill="rgba(229,192,123,0.9)" />
                      <rect x="17" y="117" width="26" height="26" rx="4" fill="rgba(3,3,3,1)" />
                      <rect x="22" y="122" width="16" height="16" rx="2" fill="rgba(229,192,123,0.9)" />
                      {[
                        [58,10],[65,10],[72,10],[86,10],[93,10],[100,10],
                        [58,17],[72,17],[79,17],[93,17],
                        [58,24],[65,24],[79,24],[86,24],[100,24],
                        [58,31],[65,31],[72,31],[86,31],[93,31],
                        [58,38],[72,38],[79,38],[86,38],[100,38],
                        [10,58],[17,58],[31,58],[38,58],[52,58],[58,58],[65,58],[79,58],[86,58],[93,58],[100,58],[107,58],[121,58],[128,58],[142,58],
                        [10,65],[24,65],[38,65],[52,65],[65,65],[79,65],[93,65],[107,65],[121,65],[135,65],
                        [10,72],[17,72],[24,72],[38,72],[52,72],[58,72],[72,72],[86,72],[100,72],[107,72],[121,72],[135,72],[142,72],
                        [10,79],[24,79],[45,79],[58,79],[65,79],[79,79],[93,79],[107,79],[128,79],[142,79],
                        [10,86],[17,86],[31,86],[45,86],[58,86],[72,86],[86,86],[100,86],[114,86],[128,86],[142,86],
                        [10,93],[24,93],[38,93],[52,93],[65,93],[79,93],[93,93],[114,93],[135,93],
                        [10,100],[17,100],[31,100],[52,100],[65,100],[86,100],[100,100],[107,100],[121,100],[142,100],
                        [58,110],[65,110],[79,110],[100,110],[107,110],[121,110],[135,110],[142,110],
                        [58,117],[72,117],[86,117],[107,117],[128,117],[142,117],
                        [58,124],[65,124],[72,124],[79,124],[100,124],[114,124],[121,124],[135,124],
                        [58,131],[79,131],[93,131],[107,131],[128,131],[142,131],
                        [58,138],[65,138],[72,138],[86,138],[93,138],[107,138],[114,138],[128,138],[142,138],
                      ].map(([x, y], idx) => (
                        <rect key={idx} x={x} y={y} width="7" height="7" fill="rgba(229,192,123,0.7)" rx="1.5" />
                      ))}
                    </svg>
                  </div>
                )}
                <div className="mt-4 space-y-2">
                  <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground text-center">
                    Código PIX (copia e cola)
                  </p>
                  <div className="flex gap-3">
                    <div className="min-w-0 flex-1 border border-white/10 rounded-lg bg-black/30 px-4 py-3">
                      <p className="truncate font-mono text-xs text-muted-foreground">{pixData.qr_code.slice(0, 44)}...</p>
                    </div>
                    <button
                      type="button"
                      onClick={copyPix}
                      className={`flex shrink-0 items-center gap-2 rounded-lg border px-5 font-sans text-xs font-semibold uppercase tracking-wider transition-all ${
                        pixCopied
                          ? 'border-[#25D366]/30 bg-[#25D366]/10 text-[#25D366]'
                          : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                      }`}
                    >
                      {pixCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {pixCopied ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <span className="chip border-[#25D366]/30 bg-[#25D366]/10 text-[#25D366]">
            <ShieldCheck className="h-4 w-4" />
            Operação registrada
          </span>

          <div className="flex flex-col sm:flex-row gap-4 mt-6">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-8 py-4 font-sans text-xs font-bold uppercase tracking-[0.2em] text-white transition-all hover:bg-[#20bd5a] hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(37,211,102,0.3)]"
            >
              Acompanhar pelo WhatsApp
            </a>
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 font-sans text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/10"
            >
              Voltar para a Loja
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (items.length === 0) return null

  const Err = ({ msg }: { msg?: string }) =>
    msg ? <p className="mt-1.5 text-xs text-destructive">{msg}</p> : null

  return (
    <div className="section-shell px-3 sm:px-5">
      <div className="mx-auto max-w-[1440px] space-y-8">
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
                Pagamento
              </h1>
            </div>
            <span className="chip border-white/10 bg-white/[0.03] text-white/50">
              <ShieldCheck className="h-4 w-4" />
              Sessão criptografada
            </span>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            {/* Identification */}
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
                    onChange={(e) => setValue('cpf', maskCpf(e.target.value))}
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
                    onChange={(e) => setValue('phone', maskPhone(e.target.value))}
                  />
                  <Err msg={errors.phone?.message} />
                </div>
              </div>
            </motion.section>

            {/* Address */}
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.18 }}
              className="glass-card rounded-[1.5rem] px-6 py-8 sm:px-8"
            >
              <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white">Endereço</h2>
                <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Passo 02</span>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">CEP</label>
                  <input
                    {...register('cep')}
                    className="form-input"
                    placeholder="00000-000"
                    onChange={(e) => setValue('cep', maskCep(e.target.value))}
                  />
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

            {/* Payment Method */}
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.26 }}
              className="glass-card rounded-[1.5rem] px-6 py-8 sm:px-8"
            >
              <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white">Método de Pagamento</h2>
                <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Passo 03</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 mb-6">
                {(['pix', 'credit_card'] as const).map((method) => (
                  <label
                    key={method}
                    className={`rounded-xl flex cursor-pointer items-center gap-5 border px-6 py-5 transition-all ${
                      paymentMethod === method
                        ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(229,192,123,0.1)]'
                        : 'border-white/10 bg-white/5 hover:border-primary/20'
                    }`}
                  >
                    <input type="radio" value={method} {...register('paymentMethod')} className="sr-only" />
                    {method === 'pix' ? (
                      <Zap className={`h-8 w-8 ${paymentMethod === 'pix' ? 'text-primary' : 'text-muted-foreground'}`} />
                    ) : (
                      <CreditCard className={`h-8 w-8 ${paymentMethod === 'credit_card' ? 'text-primary' : 'text-muted-foreground'}`} />
                    )}
                    <div>
                      <p className="font-display font-bold text-sm uppercase tracking-wide text-white">
                        {method === 'pix' ? 'PIX' : 'Cartão de crédito'}
                      </p>
                      {method === 'pix' && (
                        <p className="text-xs text-muted-foreground mt-1">Aprovação instantânea</p>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {paymentMethod === 'pix' && (
                  <motion.div
                    key="pix"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
                      <p className="text-sm text-muted-foreground text-center">
                        Após confirmar o pedido, o QR Code PIX será gerado automaticamente para pagamento.
                      </p>
                    </div>
                  </motion.div>
                )}

                {paymentMethod === 'credit_card' && (
                  <motion.div
                    key="card"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-5 mt-4">
                      <div>
                        <label className="mb-2 block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Número do cartão
                        </label>
                        <input
                          {...register('cardNumber')}
                          className="form-input font-mono tracking-widest"
                          placeholder="0000 0000 0000 0000"
                          maxLength={19}
                          onChange={(e) => setValue('cardNumber', maskCard(e.target.value))}
                        />
                        <Err msg={errors.cardNumber?.message} />
                      </div>
                      <div>
                        <label className="mb-2 block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Nome no cartão
                        </label>
                        <input
                          {...register('cardName')}
                          className="form-input uppercase"
                          placeholder="NOME COMO NO CARTÃO"
                          onChange={(e) => setValue('cardName', e.target.value.toUpperCase())}
                        />
                        <Err msg={errors.cardName?.message} />
                      </div>
                      <div className="grid grid-cols-2 gap-5">
                        <div>
                          <label className="mb-2 block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            Validade
                          </label>
                          <input
                            {...register('cardExpiry')}
                            className="form-input font-mono"
                            placeholder="MM/AA"
                            maxLength={5}
                            onChange={(e) => setValue('cardExpiry', maskExpiry(e.target.value))}
                          />
                          <Err msg={errors.cardExpiry?.message} />
                        </div>
                        <div>
                          <label className="mb-2 block font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            CVV
                          </label>
                          <input
                            {...register('cardCvv')}
                            className="form-input font-mono"
                            placeholder="000"
                            maxLength={4}
                            type="password"
                            onChange={(e) => setValue('cardCvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                          />
                          <Err msg={errors.cardCvv?.message} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          </div>

          {/* Order Summary sidebar */}
          <aside className="glass-card rounded-[1.5rem] h-fit px-6 py-8 sm:px-8 xl:sticky xl:top-28">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-2xl font-display font-bold uppercase tracking-tight text-white">
                  Resumo
                </h3>
                <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                  {items.length} {items.length === 1 ? 'item' : 'itens'}
                </span>
              </div>

              <ul className="custom-scrollbar max-h-72 space-y-4 overflow-y-auto border-y border-white/10 py-5">
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
                            {item.personalization.name && `Nº ${item.personalization.name}`}
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

              {/* Coupon */}
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
                        ({appliedCoupon.discount_type === 'percentage' ? `${appliedCoupon.discount_value}%` : `R$ ${appliedCoupon.discount_value.toFixed(2).replace('.', ',')}`})
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
                  {shippingFree ? (
                    <span className="font-bold text-accent">Grátis ✓</span>
                  ) : (
                    <span className="text-white">R$ {shipping.toFixed(2).replace('.', ',')}</span>
                  )}
                </div>
                <div className="border-t border-white/10 pt-4 flex items-end justify-between">
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Total
                  </span>
                  <span className="text-4xl font-display font-bold text-white tracking-tight">
                    R$ {grandTotal.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-glow-primary group w-full justify-center h-14"
              >
                <span className="relative z-10 flex items-center justify-center gap-3">
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="h-5 w-5" />
                      Confirmar pedido
                    </>
                  )}
                </span>
              </button>

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
      </div>
    </div>
  )
}
