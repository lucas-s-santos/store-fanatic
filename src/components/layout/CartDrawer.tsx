import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShoppingBag, Trash2, Plus, Minus, MoveRight, Package } from 'lucide-react'
import { useCartStore } from '../../store/cartStore'
import { resolveAssetUrl } from '../../lib/assets'
import { useSettings } from '../../lib/useSettings'

export function CartDrawer() {
  const { settings } = useSettings()
  const { items, isDrawerOpen, closeDrawer, removeItem, updateQuantity, getTotalPrice, getTotalItems } = useCartStore()
  const navigate = useNavigate()
  const total = getTotalPrice()
  const totalItems = getTotalItems()
  const shippingFree = total >= settings.shipping_free_threshold
  const progressPct = Math.min((total / settings.shipping_free_threshold) * 100, 100)

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isDrawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isDrawerOpen])

  const handleCheckout = () => {
    closeDrawer()
    navigate('/checkout')
  }

  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeDrawer}
            className="fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed inset-y-0 right-0 z-[1000] flex w-full max-w-md flex-col"
            style={{
              background: 'linear-gradient(180deg, rgba(10,14,24,0.98), rgba(6,10,18,0.99))',
              borderLeft: '1px solid rgba(255,170,0,0.1)',
              boxShadow: '-20px 0 80px rgba(0,0,0,0.5)',
            }}
          >
            {/* Scanline effect */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="scanline opacity-40" />
            </div>

            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-white/10 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/30 blur-md" />
                  <ShoppingBag className="relative h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-mono-styled text-[10px] uppercase tracking-[0.3em] text-primary/50">
                    Carrinho
                  </p>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-white">
                    {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeDrawer}
                className="data-chip border-white/10 bg-white/5 px-3 py-3 text-white hover:border-primary/30 hover:bg-primary/10"
                aria-label="Fechar carrinho"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Frete Progress Bar */}
            {items.length > 0 && (
              <div className="border-b border-white/10 px-6 py-4">
                <div className="mb-2 flex justify-between">
                  <span className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                    {shippingFree ? '✓ Frete grátis ativado!' : `Faltam R$ ${(settings.shipping_free_threshold - total).toFixed(2).replace('.', ',')} para frete grátis`}
                  </span>
                  {!shippingFree && (
                    <span className="font-display text-[10px] uppercase tracking-[0.3em] text-primary/70">
                      + R$ {settings.shipping_cost.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
              </div>
            )}

            {/* Items List */}
            <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex h-full flex-col items-center justify-center gap-6 text-center"
                >
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl" />
                    <Package className="relative h-16 w-16 text-primary/40" />
                  </div>
                  <div>
                    <p className="font-display text-xs uppercase tracking-[0.38em] text-primary/60">
                      Carrinho vazio
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Nenhum item adicionado ao sistema.
                    </p>
                  </div>
                  <button
                    onClick={() => { closeDrawer() }}
                    className="data-chip border-primary/30 bg-primary/10 text-white"
                  >
                    Explorar catálogo
                    <MoveRight className="h-4 w-4" />
                  </button>
                </motion.div>
              ) : (
                <AnimatePresence>
                  <div className="space-y-4">
                    {items.map((item) => (
                      <motion.div
                        key={`${item.id}-${item.size}`}
                        layout
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 30, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.25 }}
                        className="group relative flex gap-4 rounded-sm border border-white/8 bg-white/3 p-4 hover:border-primary/20 transition-colors"
                        style={{
                          background: 'rgba(10,18,35,0.7)',
                          border: '1px solid rgba(255,255,255,0.07)',
                        }}
                      >
                        {/* Image */}
                        <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-sm border border-white/10">
                          <img
                            src={resolveAssetUrl(item.imageUrl) || 'https://via.placeholder.com/80x100'}
                            alt={item.title}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                        </div>

                        {/* Info */}
                        <div className="flex min-w-0 flex-1 flex-col justify-between">
                          <div>
                            <h4 className="line-clamp-1 text-sm font-bold text-white">{item.title}</h4>
                            <p className="mt-1 font-display text-[10px] uppercase tracking-[0.28em] text-primary/70">
                              Tam. {item.size}
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2 border border-white/10 bg-white/5">
                              <button
                                onClick={() => {
                                  if (item.quantity <= 1) {
                                    removeItem(item.id, item.size)
                                  } else {
                                    updateQuantity(item.id, item.size, item.quantity - 1)
                                  }
                                }}
                                className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:text-white"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-center font-display text-xs font-bold text-white">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                                className="flex h-7 w-7 items-center justify-center text-muted-foreground transition-colors hover:text-white"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <span className="font-bold text-white">
                              R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => removeItem(item.id, item.size)}
                          className="absolute right-3 top-3 p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-white/10 px-6 py-6 space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="font-display text-[10px] uppercase tracking-[0.38em] text-muted-foreground">
                      {shippingFree ? 'Frete grátis' : `Frete estimado`}
                    </p>
                    <p className="mt-0.5 font-display text-[10px] uppercase tracking-[0.38em] text-muted-foreground">
                      Total
                    </p>
                  </div>
                  <div className="text-right">
                    {shippingFree ? (
                      <p className="font-display text-[10px] uppercase tracking-[0.3em] text-accent">
                        Grátis ✓
                      </p>
                    ) : (
                      <p className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                        R$ {settings.shipping_cost.toFixed(2).replace('.', ',')}
                      </p>
                    )}
                    <p className="text-3xl font-black text-white">
                      R$ {(total + (shippingFree ? 0 : settings.shipping_cost)).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  className="btn-primary group w-full"
                >
                  Finalizar pedido
                  <MoveRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </button>

                <Link
                  to="/carrinho"
                  onClick={closeDrawer}
                  className="block text-center font-mono-styled text-[10px] uppercase tracking-[0.25em] text-white/30 transition-colors hover:text-primary"
                >
                  Ver carrinho completo
                </Link>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
