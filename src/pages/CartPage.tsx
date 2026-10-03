import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, Trash2, Truck } from 'lucide-react'

import { Button } from '../components/ui/button'
import { optimizedImageUrl } from '../lib/assets'
import { displayProductName } from '../lib/catalog'
import { useCartStore } from '../store/cartStore'
import { useSettings } from '../lib/useSettings'
import { cn, formatPrice } from '../lib/utils'

export function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore()
  const { settings } = useSettings()
  const navigate = useNavigate()

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0)
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0)
  const shippingFree = subtotal >= settings.shipping_free_threshold
  const shipping = shippingFree ? 0 : settings.shipping_cost
  const total = subtotal + shipping
  const missing = Math.max(settings.shipping_free_threshold - subtotal, 0)
  const progressPct = Math.min((subtotal / settings.shipping_free_threshold) * 100, 100)

  if (items.length === 0) {
    return (
      <div className="mx-auto flex min-h-[80vh] max-w-[1440px] flex-col items-center justify-center gap-6 px-4 pb-16 pt-32 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShoppingBag className="size-9" aria-hidden />
        </span>
        <div>
          <h1 className="display-title text-5xl sm:text-6xl">Sua sacola está vazia</h1>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">Escolha o manto do seu time e ele aparece aqui.</p>
        </div>
        <Button asChild size="xl">
          <Link to="/produtos">
            Ver camisas
            <ArrowRight />
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="pb-32 pt-[7.25rem] lg:pb-16 lg:pt-[8.25rem]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Sacola</p>
            <h1 className="display-title mt-3 text-5xl sm:text-6xl lg:text-7xl">Revise seu pedido</h1>
          </div>
          <p className="text-sm font-semibold text-muted-foreground">
            {totalItems} {totalItems === 1 ? 'item' : 'itens'}
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:gap-12">
          <ul className="divide-y divide-border border-y border-border">
            {items.map((item, index) => {
              const atMax = item.stockQuantity !== undefined && item.quantity >= item.stockQuantity
              return (
                <motion.li
                  key={`${item.id}-${item.size}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.05 }}
                  className="flex gap-4 py-5 sm:gap-6"
                >
                  <Link to={`/produtos/${item.id}`} className="shrink-0">
                    <img
                      src={optimizedImageUrl(item.imageUrl, 280)}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/5] w-24 rounded-2xl bg-muted object-cover sm:w-32"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link to={`/produtos/${item.id}`} className="line-clamp-2 text-base font-bold leading-snug hover:text-primary sm:text-lg">
                          {displayProductName(item.title)}
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground">Tamanho {item.size}</p>
                        {item.personalization && (item.personalization.name || item.personalization.number) && (
                          <p className="mt-0.5 text-sm font-semibold text-primary">
                            Personalizada: {[item.personalization.name, item.personalization.number && `#${item.personalization.number}`].filter(Boolean).join(' ')}
                          </p>
                        )}
                      </div>
                      <p className="shrink-0 text-lg font-black tabular-nums sm:text-xl">{formatPrice(item.price * item.quantity)}</p>
                    </div>

                    <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                      <div className="flex items-center rounded-full border border-input">
                        <button
                          aria-label="Diminuir quantidade"
                          onClick={() => updateQuantity(item.id, item.size, Math.max(1, item.quantity - 1))}
                          disabled={item.quantity <= 1}
                          className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="w-8 text-center font-bold tabular-nums" aria-live="polite">
                          {item.quantity}
                        </span>
                        <button
                          aria-label="Aumentar quantidade"
                          onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                          disabled={atMax}
                          className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Plus className="size-4" />
                        </button>
                      </div>

                      <Button variant="ghost" size="sm" onClick={() => removeItem(item.id, item.size)} className="hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 />
                        Remover
                      </Button>
                    </div>
                  </div>
                </motion.li>
              )
            })}
          </ul>

          <aside className="h-fit rounded-3xl border border-border bg-card p-6 sm:p-8 lg:sticky lg:top-24">
            <h2 className="display-title text-3xl">Resumo</h2>

            <div className="mt-5 rounded-2xl bg-background/60 px-4 py-3.5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Truck className={cn('size-4', shippingFree ? 'text-success' : 'text-primary')} aria-hidden />
                {shippingFree ? (
                  <span className="text-success">Você ganhou frete grátis!</span>
                ) : (
                  <span>
                    Faltam <strong className="text-primary">{formatPrice(missing)}</strong> para o frete grátis
                  </span>
                )}
              </p>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <motion.div
                  className={cn('h-full rounded-full', shippingFree ? 'bg-success' : 'bg-primary')}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>

            <dl className="mt-6 space-y-3 border-b border-border pb-5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd className="tabular-nums text-foreground">{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>Frete</dt>
                <dd className={cn('tabular-nums', shippingFree ? 'font-bold text-success' : 'text-foreground')}>
                  {shippingFree ? 'Grátis' : formatPrice(shipping)}
                </dd>
              </div>
            </dl>

            <div className="mt-5 flex items-baseline justify-between">
              <span className="font-bold">Total</span>
              <span className="text-3xl font-black tabular-nums">{formatPrice(total)}</span>
            </div>

            <Button size="xl" className="group mt-6 w-full" onClick={() => navigate('/checkout')}>
              Finalizar pedido
              <ArrowRight className="transition-transform group-hover:translate-x-1" />
            </Button>
            <Button asChild variant="ghost" className="mt-2 w-full">
              <Link to="/produtos">
                <ArrowLeft />
                Continuar comprando
              </Link>
            </Button>
          </aside>
        </div>
      </div>

      {/* Barra fixa no celular */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-black tabular-nums">{formatPrice(total)}</p>
          </div>
          <Button size="lg" onClick={() => navigate('/checkout')}>
            Finalizar pedido
            <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
