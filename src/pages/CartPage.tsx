import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, Minus, MoveRight, Plus, Receipt, Trash2 } from 'lucide-react'
import { useCartStore } from '../store/cartStore'

export function CartPage() {
  const { items, removeItem, updateQuantity } = useCartStore()
  const navigate = useNavigate()

  const total = items.reduce((accumulator, item) => accumulator + item.price * item.quantity, 0)

  if (items.length === 0) {
    return (
      <div className="section-shell px-3 sm:px-5">
        <div className="panel clip-path-panel mx-auto flex min-h-[65vh] max-w-[1440px] flex-col items-center justify-center gap-8 text-center">
          <AlertCircle className="h-16 w-16 text-primary" />
          <div>
            <h2 className="text-4xl font-black uppercase tracking-[0.16em] text-white">
              Carrinho vazio
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
              Nenhum item foi acoplado ao sistema ainda. Entre no catalogo para montar a sua selecao.
            </p>
          </div>
          <Link to="/produtos" className="data-chip">
            Ir para o catalogo
            <MoveRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="section-shell px-3 sm:px-5">
      <div className="mx-auto max-w-[1440px] space-y-8">
        <div className="panel clip-path-panel px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="data-chip">
                <span className="data-dot" />
                Cart chamber
              </span>
              <h1 className="mt-5 text-4xl font-black uppercase tracking-[0.16em] text-white sm:text-5xl">
                Seu carrinho em modo tatico.
              </h1>
            </div>
            <div className="data-chip">
              <Receipt className="h-4 w-4" />
              {items.length} sinais ativos
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            {items.map((item) => (
              <div key={`${item.id}-${item.size}`} className="panel clip-path-panel px-5 py-5 sm:px-6">
                <div className="grid gap-5 md:grid-cols-[140px_1fr]">
                  <div className="clip-path-card overflow-hidden border border-white/10">
                    <img src={item.imageUrl} alt={item.title} loading="lazy" className="h-full w-full object-cover" />
                  </div>

                  <div className="flex flex-col justify-between gap-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-display text-[10px] uppercase tracking-[0.35em] text-primary/70">
                          Size {item.size}
                        </p>
                        <h3 className="mt-3 text-2xl font-black uppercase tracking-[0.14em] text-white">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-3xl font-black text-white">
                        R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                      </p>
                    </div>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center border border-white/10 bg-white/5">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.size, Math.max(1, item.quantity - 1))
                          }
                          className="px-4 py-3 text-white"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-14 text-center font-display text-sm uppercase tracking-[0.2em] text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                          className="px-4 py-3 text-white"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id, item.size)}
                        className="data-chip border-white/10 bg-white/5 text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="panel clip-path-panel h-fit px-6 py-8 sm:px-8 xl:sticky xl:top-28">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-black uppercase tracking-[0.16em] text-white">
                  Resumo
                </h2>
                <span className="font-display text-[10px] uppercase tracking-[0.35em] text-primary/70">
                  Final layer
                </span>
              </div>

              <div className="space-y-4 border-y border-white/10 py-6 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="text-white">R$ {total.toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Entrega</span>
                  <span className="text-white">Gratis</span>
                </div>
              </div>

              <div className="flex items-end justify-between gap-4">
                <span className="font-display text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
                  Total
                </span>
                <span className="text-4xl font-black text-white">
                  R$ {total.toFixed(2).replace('.', ',')}
                </span>
              </div>

              <button
                onClick={() => navigate('/checkout')}
                className="group flex h-16 w-full items-center justify-center gap-3 bg-primary font-display text-sm uppercase tracking-[0.32em] text-primary-foreground transition-all hover:shadow-[0_0_45px_rgba(60,247,255,0.3)]"
              >
                Abrir checkout
                <MoveRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
