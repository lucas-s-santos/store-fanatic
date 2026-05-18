import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowLeft, Minus, MoveRight, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { resolveAssetUrl } from '../lib/assets'
import { useCartStore } from '../store/cartStore'
import { useSettings } from '../lib/useSettings'

export function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore()
  const { settings } = useSettings()
  const navigate = useNavigate()

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0)
  const shippingFree = subtotal >= settings.shipping_free_threshold
  const shipping = shippingFree ? 0 : settings.shipping_cost
  const total = subtotal + shipping
  const progressPct = Math.min((subtotal / settings.shipping_free_threshold) * 100, 100)

  if (items.length === 0) {
    return (
      <div className="section-shell px-3 sm:px-5">
        <div className="glass-card rounded-[2rem] mx-auto flex min-h-[65vh] max-w-[1440px] flex-col items-center justify-center gap-8 text-center p-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />
            <AlertCircle className="relative h-16 w-16 text-primary/60" />
          </div>
          <div>
            <h2 className="text-4xl font-display font-bold uppercase tracking-tight text-white">
              Carrinho vazio
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
              Nenhum item adicionado ainda. Explore o catálogo e escolha seu manto.
            </p>
          </div>
          <Link
            to="/produtos"
            className="flex items-center gap-2 rounded-full bg-primary px-8 py-4 font-sans text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground transition-all hover:scale-105 active:scale-95"
          >
            Ir para o catálogo
            <MoveRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="section-shell px-3 sm:px-5">
      <div className="mx-auto max-w-[1440px] space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card rounded-[1.5rem] px-6 py-8 sm:px-8"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="chip border-primary/20 bg-primary/5 text-primary">
                <ShoppingBag className="h-4 w-4" />
                Meu carrinho
              </span>
              <h1 className="mt-5 text-4xl font-display font-bold uppercase tracking-tight text-white sm:text-5xl">
                Revisão do pedido
              </h1>
            </div>
            <span className="chip border-white/10 bg-white/[0.03] text-white/50">
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          {/* Items */}
          <div className="space-y-4">
            {items.map((item, index) => (
              <motion.div
                key={`${item.id}-${item.size}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="glass-card rounded-[1.5rem] p-4 sm:p-5"
              >
                <div className="flex gap-4">
                  {/* Imagem */}
                  <div className="h-28 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 sm:h-32 sm:w-24">
                    <img
                      src={resolveAssetUrl(item.imageUrl)}
                      alt={item.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                          Tamanho {item.size}
                        </p>
                        <h3 className="mt-1 line-clamp-2 text-base font-display font-bold uppercase tracking-tight text-white sm:text-lg">
                          {item.title}
                        </h3>
                        {item.personalization && (item.personalization.name || item.personalization.number) && (
                          <p className="mt-1 text-[10px] text-primary">
                            Personalização: {item.personalization.name}{item.personalization.number ? ` #${item.personalization.number}` : ''}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 text-xl font-display font-bold text-white sm:text-2xl">
                        R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      {/* Quantidade */}
                      <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.size, Math.max(1, item.quantity - 1))}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-10 text-center font-display text-sm font-bold text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                          disabled={item.stockQuantity !== undefined && item.quantity >= item.stockQuantity}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                            item.stockQuantity !== undefined && item.quantity >= item.stockQuantity
                              ? 'cursor-not-allowed text-white/20'
                              : 'text-muted-foreground hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Remover */}
                      <button
                        onClick={() => removeItem(item.id, item.size)}
                        className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 font-sans text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Resumo */}
          <aside className="glass-card rounded-[1.5rem] h-fit px-6 py-8 sm:px-8 xl:sticky xl:top-28">
            <div className="space-y-6">
              <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white">
                Resumo
              </h2>

              {/* Barra de progresso do frete */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    {shippingFree
                      ? '✓ Frete grátis ativado!'
                      : `Faltam R$ ${(settings.shipping_free_threshold - subtotal).toFixed(2).replace('.', ',')} para frete grátis`}
                  </span>
                  {!shippingFree && (
                    <span className="text-primary/70">
                      + R$ {settings.shipping_cost.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </div>

              {/* Totais */}
              <div className="space-y-3 border-y border-white/10 py-5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="text-white">R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Frete</span>
                  {shippingFree
                    ? <span className="font-bold text-accent">Grátis ✓</span>
                    : <span className="text-white">R$ {shipping.toFixed(2).replace('.', ',')}</span>}
                </div>
              </div>

              <div className="flex items-end justify-between">
                <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Total
                </span>
                <span className="text-4xl font-display font-bold text-white tracking-tight">
                  R$ {total.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <button
                onClick={() => navigate('/checkout')}
                className="group flex h-14 w-full items-center justify-center gap-3 rounded-full bg-primary font-display text-sm font-bold uppercase tracking-wider text-primary-foreground transition-all hover:shadow-[0_0_30px_rgba(229,192,123,0.3)] hover:-translate-y-0.5"
              >
                Finalizar pedido
                <MoveRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => navigate('/produtos')}
                className="flex w-full items-center justify-center gap-2 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Continuar comprando
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
