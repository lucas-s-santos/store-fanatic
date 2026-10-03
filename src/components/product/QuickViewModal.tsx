import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Check, ShoppingBag, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { optimizedImageUrl, resolveAssetUrl } from '@/lib/assets'
import { displayProductName, productName, type ShowcaseProduct } from '@/lib/catalog'
import { cn, formatPrice } from '@/lib/utils'
import { useFocusTrap } from '@/lib/useFocusTrap'
import { useCartStore } from '@/store/cartStore'

const DEFAULT_SIZES = ['P', 'M', 'G', 'GG', 'XG']

/** Compra rápida a partir da grade: foto, tamanho e "adicionar", sem sair do catálogo. */
export function QuickViewModal({
  product,
  subtitle,
  onClose,
}: {
  product: ShowcaseProduct
  subtitle?: string
  onClose: () => void
}) {
  const addItem = useCartStore((state) => state.addItem)
  const [selectedSize, setSelectedSize] = useState('')
  const [added, setAdded] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef, true)

  const name = productName(product)
  const stock = product.stock_quantity ?? 0
  const sizes = product.sizes?.length ? product.sizes : DEFAULT_SIZES
  const images = [product.image_url, ...(product.images || [])]
    .filter((url, index, all) => url && all.indexOf(url) === index)
    .map((url) => optimizedImageUrl(url, 720))

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const handleAdd = () => {
    if (!selectedSize) return
    addItem({
      id: product.id,
      title: name,
      price: product.price,
      imageUrl: resolveAssetUrl(product.image_url),
      size: selectedSize,
      quantity: 1,
      stockQuantity: stock,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  // Portal: o <main> tem z-index próprio e prenderia o modal abaixo do cabeçalho.
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Compra rápida: ${name}`}
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        onClick={(event) => event.stopPropagation()}
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-border bg-card shadow-2xl sm:max-w-3xl sm:rounded-3xl"
      >
        <Button
          variant="glass"
          size="icon"
          onClick={onClose}
          className="absolute right-3 top-3 z-10"
          aria-label="Fechar"
        >
          <X />
        </Button>

        <div className="grid sm:grid-cols-2">
          <div className="relative bg-muted">
            {images.length > 0 && (
              <img src={images[imgIdx]} alt={name} className="aspect-[4/5] w-full object-cover sm:h-full" />
            )}
            {images.length > 1 && (
              <div className="absolute inset-x-0 bottom-1 flex justify-center">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setImgIdx(index)}
                    aria-label={`Foto ${index + 1}`}
                    aria-current={index === imgIdx}
                    className="flex h-8 items-center px-1.5"
                  >
                    <span className={cn('block h-1.5 rounded-full transition-all', index === imgIdx ? 'w-6 bg-paper' : 'w-1.5 bg-white/45')} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-5 p-6 sm:p-8">
            <div>
              {subtitle && <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{subtitle}</p>}
              <h3 className="mt-1.5 text-2xl font-extrabold leading-tight">{displayProductName(name)}</h3>
              <p className="mt-3 text-3xl font-black tabular-nums">{formatPrice(product.price)}</p>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Tamanho</p>
              <div className="mt-2.5 grid grid-cols-5 gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    disabled={stock === 0}
                    aria-pressed={selectedSize === size}
                    className={cn(
                      'h-11 rounded-xl border text-sm font-bold transition-colors',
                      selectedSize === size
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input text-foreground hover:border-foreground/50 disabled:cursor-not-allowed disabled:text-muted-foreground/40 disabled:line-through',
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <p className={cn('mt-3 text-sm font-semibold', stock > 0 ? 'text-success' : 'text-destructive')}>
                {stock > 5 ? 'Em estoque' : stock > 0 ? `Só ${stock} ${stock === 1 ? 'unidade' : 'unidades'}` : 'Esgotado'}
              </p>
            </div>

            <div className="mt-auto space-y-3">
              <Button size="lg" className="w-full" onClick={handleAdd} disabled={!selectedSize || stock === 0}>
                {added ? <Check /> : <ShoppingBag />}
                {added ? 'Adicionado à sacola' : selectedSize ? 'Adicionar à sacola' : 'Escolha um tamanho'}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to={`/produtos/${product.id}`} onClick={onClose}>
                  Ver detalhes e personalizar
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
