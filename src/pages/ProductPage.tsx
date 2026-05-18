import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, MoveRight, AlertTriangle, ShieldCheck, Star, Zap, Shirt } from 'lucide-react'
import { resolveAssetUrl } from '../lib/assets'
import { supabase } from '../lib/supabase'
import { useCartStore } from '../store/cartStore'
import { useToast } from '../components/ui/Toast'

const PERSONALIZATION_PRICE = 20

interface Product {
  id: string
  name?: string
  title?: string
  description: string
  price: number
  category: string
  image_url: string
  sizes: string[]
  stock_quantity?: number
  stock?: number
  tech_specs?: Record<string, string>
  personalization_price?: number
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as const, delay: i * 0.07 },
  }),
}

export function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSize, setSelectedSize] = useState('')
  const [showSizeGuide, setShowSizeGuide] = useState(false)
  const [personalizedName, setPersonalizedName] = useState('')
  const [personalizedNumber, setPersonalizedNumber] = useState('')
  const addItem = useCartStore((state) => state.addItem)
  const cartItems = useCartStore((state) => state.items)
  const { toast } = useToast()

  useEffect(() => {
    async function fetchProduct() {
      if (!id) return
      setLoading(true)
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
      if (error) console.error('Error fetching product:', error)
      else if (data) setProduct(data)
      setLoading(false)
    }
    fetchProduct()
  }, [id])

  const productName = product?.name || product?.title || ''
  const stockQty = product?.stock_quantity ?? product?.stock ?? 0
  const isLowStock = stockQty > 0 && stockQty <= 5
  const hasPersonalization = personalizedName.trim().length > 0 || personalizedNumber.trim().length > 0
  const personalizationCost = hasPersonalization ? (product?.personalization_price ?? PERSONALIZATION_PRICE) : 0
  const finalPrice = (product?.price ?? 0) + personalizationCost

  const handleAddToCart = () => {
    if (!product || !selectedSize) return

    const existing = cartItems.find((i) => i.id === product.id && i.size === selectedSize)
    const currentQty = existing?.quantity ?? 0

    if (stockQty > 0 && currentQty >= stockQty) {
      toast(`Estoque esgotado para o tamanho ${selectedSize}. Máximo: ${stockQty} unidade(s).`, 'warning')
      return
    }

    addItem({
      id: product.id,
      title: productName,
      price: finalPrice,
      imageUrl: resolveAssetUrl(product.image_url) || 'https://via.placeholder.com/600x800?text=Sem+Foto',
      size: selectedSize,
      quantity: 1,
      stockQuantity: stockQty,
      personalization: hasPersonalization
        ? { name: personalizedName.trim(), number: personalizedNumber.trim() }
        : undefined,
    })
    toast(`${productName} adicionado ao carrinho!`, 'success')
  }

  if (loading) {
    return (
      <div className="px-3 pt-28 pb-12 sm:px-6 sm:pt-32">
        <div className="mx-auto flex min-h-[60vh] max-w-[1440px] flex-col items-center justify-center gap-6">
          <div className="w-full max-w-4xl grid gap-6 xl:grid-cols-2">
            <div className="aspect-[4/5] w-full animate-pulse bg-white/5 rounded-sm" />
            <div className="space-y-6">
              <div className="h-6 w-24 animate-pulse bg-white/5 rounded-sm" />
              <div className="h-12 w-3/4 animate-pulse bg-white/5 rounded-sm" />
              <div className="h-4 w-1/2 animate-pulse bg-white/5 rounded-sm" />
              <div className="grid grid-cols-4 gap-4 mt-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 animate-pulse bg-white/5 rounded-sm" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="px-3 pt-28 pb-12 sm:px-6 sm:pt-32">
        <div className="mx-auto flex min-h-[60vh] max-w-[1440px] flex-col items-center justify-center gap-6 text-center">
          <h2 className="text-4xl font-display uppercase text-white">Produto não encontrado</h2>
          <button
            onClick={() => navigate('/produtos')}
            className="btn-outline"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar ao catálogo
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 pt-28 pb-16 sm:px-6 sm:pt-32 bg-background min-h-screen">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <motion.button
          onClick={() => navigate(-1)}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-5 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </motion.button>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          {/* ─── Image panel ─── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-[2rem] bg-card border border-border shadow-2xl"
          >
            <div className="relative aspect-[4/5] min-h-[360px] overflow-hidden group sm:min-h-[480px]">
              <img
                src={resolveAssetUrl(product.image_url) || 'https://via.placeholder.com/600x800?text=Sem+Foto'}
                alt={productName}
                fetchPriority="high"
                className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/30 to-transparent opacity-90" />

              <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12 z-10">
                <div className="chip w-fit shadow-lg backdrop-blur-md">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Garantia Premium
                </div>
                <h1 className="mt-5 text-4xl font-display font-bold uppercase text-white sm:text-5xl lg:text-6xl tracking-tight leading-none">
                  {productName}
                </h1>
              </div>
            </div>
          </motion.div>

          {/* ─── Right column ─── */}
          <div className="space-y-5">
            {/* Info panel */}
            <motion.div
              custom={0}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="glass-card rounded-[1.5rem] px-6 py-8 sm:p-10"
            >
              <div className="space-y-6">
                <div className="flex flex-wrap gap-3">
                  <span className="chip border-primary/30 bg-primary/10 text-primary">
                    <Star className="h-3.5 w-3.5 fill-current mr-1" />
                    {product.category || 'Linha premium'}
                  </span>
                  {isLowStock && (
                    <span className="chip border-[#FF453A]/30 bg-[#FF453A]/10 text-[#FF453A]">
                      Últimas {stockQty} unidades
                    </span>
                  )}
                  {!isLowStock && stockQty > 0 && (
                    <span className="chip border-[#25D366]/30 bg-[#25D366]/10 text-[#25D366]">
                      Em estoque
                    </span>
                  )}
                  {stockQty === 0 && (
                    <span className="chip border-destructive/30 bg-destructive/10 text-destructive">
                      Esgotado
                    </span>
                  )}
                </div>

                  <div>
                    <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Valor da peça
                    </p>
                    <p className="mt-2 text-4xl font-display font-bold text-white sm:text-5xl tracking-tight">
                      R$ {finalPrice.toFixed(2).replace('.', ',')}
                    </p>
                    {hasPersonalization && personalizationCost > 0 && (
                      <p className="text-xs text-primary mt-1">
                        +R$ {personalizationCost.toFixed(2).replace('.', ',')} personalização
                      </p>
                    )}
                  </div>

                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base font-medium">
                  {product.description || 'Camiseta oficial com qualidade premium. Sinta o peso do manto. Escolha seu tamanho e peça pelo WhatsApp com exclusividade.'}
                </p>

                {/* Tech Specs */}
                {product.tech_specs && Object.keys(product.tech_specs).length > 0 && (
                  <div className="border-t border-border pt-6">
                    <p className="mb-4 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Especificações Premium
                    </p>
                    <dl className="grid gap-3">
                      {Object.entries(product.tech_specs).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4 text-sm bg-white/[0.02] p-3 rounded-lg border border-white/[0.05]">
                          <dt className="text-muted-foreground capitalize">{k}</dt>
                          <dd className="font-semibold text-white">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Size + WhatsApp panel */}
            <motion.div
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="glass-card rounded-[1.5rem] px-6 py-8 sm:p-10"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-display font-bold uppercase text-white tracking-tight">
                      Escolha o tamanho
                    </h2>
                    <button 
                      onClick={() => setShowSizeGuide(true)}
                      className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors underline decoration-white/20 underline-offset-4 hover:decoration-primary/50"
                    >
                      Guia de Medidas
                    </button>
                  </div>
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                    Passo 1
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {(product.sizes?.length ? product.sizes : ['P', 'M', 'G', 'GG', 'XG']).map((size) => (
                    <motion.button
                      key={size}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedSize(size)}
                      className={`rounded-xl border px-2 py-4 text-center font-display text-lg font-bold uppercase transition-all ${
                        selectedSize === size
                          ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_20px_rgba(229,192,123,0.3)]'
                          : 'border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-primary/40 hover:text-white'
                      }`}
                    >
                      {size}
                    </motion.button>
                  ))}
                </div>

                {/* Personalization Section */}
                <div className="border-t border-border pt-6">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <Shirt className="h-4 w-4 text-primary" />
                      <h2 className="text-xl font-display font-bold uppercase text-white tracking-tight">
                        Personalização
                      </h2>
                    </div>
                    <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                      Opcional
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1">
                        Nome
                      </label>
                      <input
                        type="text"
                        maxLength={15}
                        value={personalizedName}
                        onChange={(e) => setPersonalizedName(e.target.value.toUpperCase())}
                        placeholder="EX: MESSI"
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white uppercase placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground block mb-1">
                        Número
                      </label>
                      <input
                        type="text"
                        maxLength={2}
                        value={personalizedNumber}
                        onChange={(e) => setPersonalizedNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                        placeholder="10"
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  {hasPersonalization && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                      <span className="text-xs text-primary font-semibold">+R$ {(product?.personalization_price ?? PERSONALIZATION_PRICE).toFixed(2).replace('.', ',')}</span>
                      <span className="text-xs text-muted-foreground">adicional por personalização</span>
                    </div>
                  )}
                </div>

                {/* Separator */}
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-border" />
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Finalizar</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <AnimatePresence mode="wait">
                  <motion.button
                    key="cart-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    disabled={!selectedSize || stockQty === 0}
                    whileHover={selectedSize && stockQty > 0 ? { scale: 1.02 } : {}}
                    whileTap={selectedSize && stockQty > 0 ? { scale: 0.98 } : {}}
                    onClick={handleAddToCart}
                    className={`group flex h-14 w-full items-center justify-center gap-3 rounded-full font-display text-sm font-bold uppercase tracking-wider transition-all ${
                      stockQty === 0
                        ? 'cursor-not-allowed bg-white/[0.05] text-muted-foreground'
                        : !selectedSize
                          ? 'bg-white/[0.05] text-muted-foreground cursor-not-allowed'
                          : 'bg-primary text-primary-foreground shadow-[0_10px_20px_rgba(229,192,123,0.2)] hover:shadow-[0_15px_30px_rgba(229,192,123,0.3)] hover:-translate-y-1'
                    }`}
                  >
                    {stockQty === 0 ? (
                      <>
                        <AlertTriangle className="h-5 w-5" />
                        Sem estoque
                      </>
                    ) : !selectedSize ? (
                      <>
                        <Zap className="h-5 w-5 opacity-40" />
                        Selecione um tamanho
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="9" cy="21" r="1"></circle>
                          <circle cx="20" cy="21" r="1"></circle>
                          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        Adicionar ao carrinho
                        <MoveRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </motion.button>
                </AnimatePresence>


              </div>
            </motion.div>

            {/* Stats */}
            <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="grid gap-5 sm:grid-cols-2">
              <div className="glass-card rounded-[1.5rem] px-6 py-6">
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Qualidade
                </p>
                <p className="mt-2 text-2xl font-display font-bold uppercase text-white tracking-tight">
                  Premium
                </p>
              </div>
              <div className="glass-card rounded-[1.5rem] px-6 py-6">
                <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Estoque
                </p>
                <p className={`mt-2 text-2xl font-display font-bold uppercase tracking-tight ${isLowStock ? 'text-[#FF453A]' : stockQty === 0 ? 'text-destructive' : 'text-white'}`}>
                  {stockQty > 0 ? `${stockQty} un.` : 'Esgotado'}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Size Guide Modal */}
      <AnimatePresence>
        {showSizeGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={() => setShowSizeGuide(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-[2rem] border border-white/10 bg-[#0a0a0a] p-8 shadow-2xl"
            >
              <button
                onClick={() => setShowSizeGuide(false)}
                className="absolute right-6 top-6 text-white/50 hover:text-white transition-colors"
              >
                ✕
              </button>
              <h3 className="text-2xl font-display font-bold uppercase text-white mb-6">Guia de Medidas</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-white/70">
                  <thead>
                    <tr className="border-b border-white/10 text-primary font-display uppercase tracking-wider">
                      <th className="pb-3 font-medium">Tamanho</th>
                      <th className="pb-3 font-medium">Largura (cm)</th>
                      <th className="pb-3 font-medium">Altura (cm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                      <td className="py-3 font-bold text-white px-2">P</td>
                      <td className="py-3 px-2">50</td>
                      <td className="py-3 px-2">69</td>
                    </tr>
                    <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                      <td className="py-3 font-bold text-white px-2">M</td>
                      <td className="py-3 px-2">52</td>
                      <td className="py-3 px-2">71</td>
                    </tr>
                    <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                      <td className="py-3 font-bold text-white px-2">G</td>
                      <td className="py-3 px-2">54</td>
                      <td className="py-3 px-2">73</td>
                    </tr>
                    <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                      <td className="py-3 font-bold text-white px-2">GG</td>
                      <td className="py-3 px-2">56</td>
                      <td className="py-3 px-2">75</td>
                    </tr>
                    <tr className="transition-colors hover:bg-white/[0.02]">
                      <td className="py-3 font-bold text-white px-2">XG</td>
                      <td className="py-3 px-2">58</td>
                      <td className="py-3 px-2">77</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-6 text-xs text-white/40 text-center">
                * As medidas podem variar de 1 a 2 cm.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
