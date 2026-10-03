import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight, Truck } from 'lucide-react'

import { useCartStore } from '../../store/cartStore'
import { Button } from '../ui/button'
import { optimizedImageUrl } from '../../lib/assets'
import { displayProductName } from '../../lib/catalog'
import { useFocusTrap } from '../../lib/useFocusTrap'
import { useSettings } from '../../lib/useSettings'
import { cn, formatPrice } from '../../lib/utils'

export function CartDrawer() {
  const { settings } = useSettings()
  const { items, isDrawerOpen, closeDrawer, removeItem, updateQuantity, getTotalPrice, getTotalItems } = useCartStore()
  const navigate = useNavigate()
  const drawerRef = useRef<HTMLElement>(null)
  useFocusTrap(drawerRef, isDrawerOpen)
  const total = getTotalPrice()
  const totalItems = getTotalItems()
  const shippingFree = total >= settings.shipping_free_threshold
  const missing = Math.max(settings.shipping_free_threshold - total, 0)
  const progressPct = Math.min((total / settings.shipping_free_threshold) * 100, 100)

  // Trava a rolagem do fundo e fecha com Esc.
  useEffect(() => {
    if (!isDrawerOpen) return
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && closeDrawer()
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [isDrawerOpen, closeDrawer])

  const handleCheckout = () => {
    closeDrawer()
    navigate('/checkout')
  }

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeDrawer}
            className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm"
          />

          <motion.aside
            key="drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Sacola de compras"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="fixed inset-y-0 right-0 z-[1000] flex w-full max-w-md flex-col border-l border-border bg-background shadow-[-30px_0_80px_rgb(0_0_0/0.5)]"
          >
            <div className="flex items-center justify-between px-5 py-4 sm:px-6">
              <div className="flex items-baseline gap-3">
                <h2 className="display-title text-3xl">Sua sacola</h2>
                <span className="text-sm font-semibold text-muted-foreground">
                  {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={closeDrawer} aria-label="Fechar sacola">
                <X className="size-5" />
              </Button>
            </div>

            {items.length > 0 && (
              <div className="mx-5 rounded-2xl border border-border bg-card px-4 py-3.5 sm:mx-6">
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
            )}

            <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-6 px-4 text-center">
                  <span className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ShoppingBag className="size-9" aria-hidden />
                  </span>
                  <div className="space-y-2">
                    <p className="display-title text-3xl">Sua sacola está vazia</p>
                    <p className="mx-auto max-w-[260px] text-sm leading-relaxed text-muted-foreground">
                      Escolha o manto do seu time e ele aparece aqui.
                    </p>
                  </div>
                  <Button asChild size="lg" className="w-full">
                    <Link to="/produtos" onClick={closeDrawer}>
                      Ver camisas
                      <ArrowRight />
                    </Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  <AnimatePresence initial={false}>
                    {items.map((item) => {
                      const atMax = item.stockQuantity !== undefined && item.quantity >= item.stockQuantity
                      return (
                        <motion.li
                          key={`${item.id}-${item.size}`}
                          layout
                          initial={{ opacity: 0, x: 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 24 }}
                          transition={{ duration: 0.22 }}
                          className="flex gap-4 py-4"
                        >
                          <Link to={`/produtos/${item.id}`} onClick={closeDrawer} className="shrink-0">
                            <img
                              src={optimizedImageUrl(item.imageUrl, 200)}
                              alt=""
                              loading="lazy"
                              className="aspect-[4/5] w-20 rounded-xl bg-muted object-cover"
                            />
                          </Link>

                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-start justify-between gap-2">
                              <Link
                                to={`/produtos/${item.id}`}
                                onClick={closeDrawer}
                                className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary"
                              >
                                {displayProductName(item.title)}
                              </Link>
                              <button
                                onClick={() => removeItem(item.id, item.size)}
                                aria-label={`Remover ${item.title}`}
                                className="-mr-1 -mt-1 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Tamanho {item.size}
                              {item.personalization && (item.personalization.name || item.personalization.number) && (
                                <>
                                  {' · '}
                                  <span className="font-semibold text-primary">
                                    {[item.personalization.name, item.personalization.number && `#${item.personalization.number}`]
                                      .filter(Boolean)
                                      .join(' ')}
                                  </span>
                                </>
                              )}
                            </p>

                            <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                              <div className="flex items-center rounded-full border border-input">
                                <button
                                  aria-label={item.quantity <= 1 ? `Remover ${item.title}` : 'Diminuir quantidade'}
                                  onClick={() =>
                                    item.quantity <= 1
                                      ? removeItem(item.id, item.size)
                                      : updateQuantity(item.id, item.size, item.quantity - 1)
                                  }
                                  className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                                >
                                  <Minus className="size-3.5" />
                                </button>
                                <span className="w-6 text-center text-sm font-bold tabular-nums" aria-live="polite">
                                  {item.quantity}
                                </span>
                                <button
                                  aria-label="Aumentar quantidade"
                                  onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                                  disabled={atMax}
                                  className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                                >
                                  <Plus className="size-3.5" />
                                </button>
                              </div>
                              <span className="font-extrabold tabular-nums">{formatPrice(item.price * item.quantity)}</span>
                            </div>
                          </div>
                        </motion.li>
                      )
                    })}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="space-y-4 border-t border-border bg-card px-5 py-5 sm:px-6">
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Subtotal</dt>
                    <dd className="tabular-nums">{formatPrice(total)}</dd>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Frete</dt>
                    <dd className={cn('tabular-nums', shippingFree && 'font-semibold text-success')}>
                      {shippingFree ? 'Grátis' : formatPrice(settings.shipping_cost)}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between pt-2">
                    <dt className="font-bold">Total</dt>
                    <dd className="text-2xl font-black tabular-nums">
                      {formatPrice(total + (shippingFree ? 0 : settings.shipping_cost))}
                    </dd>
                  </div>
                </dl>

                <Button size="xl" className="group w-full" onClick={handleCheckout}>
                  Finalizar pedido
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </Button>

                <Link
                  to="/carrinho"
                  onClick={closeDrawer}
                  className="block text-center text-sm font-semibold text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                >
                  Ver sacola completa
                </Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
