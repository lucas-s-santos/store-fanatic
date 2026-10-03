import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Shirt } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { optimizedImageSrcSet, optimizedImageUrl } from '@/lib/assets'
import { displayProductName } from '@/lib/catalog'
import { cn, formatPrice } from '@/lib/utils'

export interface ProductCardData {
  id: string
  name?: string | null
  title?: string | null
  price: number
  image_url: string
  images?: string[] | null
  featured?: boolean | null
  stock_quantity?: number | null
  stock?: number | null
  league?: string
  team?: string
}

const LOW_STOCK_LIMIT = 5
const IMAGE_SIZES = '(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw'

export function ProductCard({
  product,
  eyebrow,
  onQuickView,
  className,
}: {
  product: ProductCardData
  /** Linha pequena acima do nome, ex.: o time. */
  eyebrow?: string
  onQuickView?: () => void
  className?: string
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const name = displayProductName(product.name || product.title || '')
  const stock = product.stock_quantity ?? product.stock ?? 0
  const outOfStock = stock === 0
  const lowStock = stock > 0 && stock <= LOW_STOCK_LIMIT
  // Segunda foto (costas, detalhe) aparece no hover, como em loja de roupa.
  const altImage = product.images?.find((url) => url && url !== product.image_url)

  return (
    <article className={cn('group relative h-full', className)}>
      <Link to={`/produtos/${product.id}`} className="flex h-full flex-col gap-3 rounded-2xl outline-offset-4">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted ring-1 ring-white/[0.06] ring-inset">
          {imageFailed ? (
            <div className="flex h-full items-center justify-center">
              <Shirt className="size-10 text-white/15" strokeWidth={1.5} aria-hidden />
            </div>
          ) : (
            <>
              <img
                src={optimizedImageUrl(product.image_url, 640)}
                srcSet={optimizedImageSrcSet(product.image_url, [320, 480, 640, 960])}
                sizes={IMAGE_SIZES}
                alt={name}
                loading="lazy"
                decoding="async"
                onError={() => setImageFailed(true)}
                className={cn(
                  'absolute inset-0 h-full w-full object-cover transition-[transform,opacity] duration-700 ease-out motion-safe:group-hover:scale-[1.05]',
                  altImage && '[@media(hover:hover)]:group-hover:opacity-0',
                  outOfStock && 'opacity-50 grayscale',
                )}
              />
              {altImage && (
                <img
                  src={optimizedImageUrl(altImage, 640)}
                  srcSet={optimizedImageSrcSet(altImage, [320, 480, 640, 960])}
                  sizes={IMAGE_SIZES}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 hidden h-full w-full object-cover opacity-0 transition-opacity duration-700 ease-out [@media(hover:hover)]:block [@media(hover:hover)]:group-hover:opacity-100"
                />
              )}
            </>
          )}

          <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5 sm:left-3 sm:top-3">
            {lowStock && <Badge variant="flame">Últimas unidades</Badge>}
          </div>

          {outOfStock && (
            <Badge variant="glass" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 uppercase tracking-wider">
              Esgotado
            </Badge>
          )}

          {/* Faixa "ver camisa" que sobe no hover (só com mouse). */}
          {!outOfStock && !onQuickView && (
            <span
              aria-hidden
              className="absolute inset-x-3 bottom-3 hidden translate-y-3 items-center justify-center rounded-full bg-paper py-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-paper-foreground opacity-0 transition-all duration-300 [@media(hover:hover)]:flex [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-hover:opacity-100"
            >
              Ver camisa
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 px-0.5">
          {eyebrow && <p className="truncate text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">{eyebrow}</p>}
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground sm:text-[0.9375rem]">{name}</h3>
          <p className="mt-auto pt-1 text-base font-extrabold tabular-nums text-foreground sm:text-lg">{formatPrice(product.price)}</p>
        </div>
      </Link>

      {onQuickView && !outOfStock && (
        // No celular fica sempre visível; com mouse, aparece no hover ou no foco.
        <button
          type="button"
          onClick={onQuickView}
          aria-label={`Compra rápida: ${name}`}
          className="absolute right-2.5 top-2.5 flex size-9 items-center justify-center rounded-full bg-paper text-paper-foreground shadow-lg transition-[opacity,transform] hover:scale-105 sm:right-3 sm:top-3 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
        >
          <Plus className="size-4" strokeWidth={2.5} />
        </button>
      )}
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[4/5] rounded-2xl" />
      <div className="space-y-2 px-0.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  )
}
