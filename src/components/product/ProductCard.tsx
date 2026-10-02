import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Eye, Shirt } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { optimizedImageSrcSet, optimizedImageUrl } from '@/lib/assets'
import { cn, formatPrice } from '@/lib/utils'

export interface ProductCardData {
  id: string
  name?: string | null
  title?: string | null
  price: number
  image_url: string
  stock_quantity?: number | null
  stock?: number | null
}

const LOW_STOCK_LIMIT = 5

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
  const name = product.name || product.title || ''
  const stock = product.stock_quantity ?? product.stock ?? 0
  const outOfStock = stock === 0
  const lowStock = stock > 0 && stock <= LOW_STOCK_LIMIT

  return (
    <article className={cn('group relative h-full', className)}>
      <Link
        to={`/produtos/${product.id}`}
        className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card sm:rounded-2xl transition-[translate,border-color,box-shadow] duration-300 hover:border-primary/40 hover:shadow-[0_24px_48px_-24px_rgb(229_192_123/0.35)] motion-safe:hover:-translate-y-1"
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-muted">
          {imageFailed ? (
            <div className="flex h-full items-center justify-center">
              <Shirt className="size-10 text-white/15" strokeWidth={1.5} aria-hidden />
            </div>
          ) : (
            <img
              src={optimizedImageUrl(product.image_url, 640)}
              srcSet={optimizedImageSrcSet(product.image_url, [320, 480, 640, 960])}
              sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              alt={name}
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
              className={cn(
                'h-full w-full object-cover transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.04]',
                outOfStock && 'opacity-50 grayscale',
              )}
            />
          )}

          {lowStock && (
            <Badge variant="destructive" className="absolute left-2.5 top-2.5 bg-black/70 backdrop-blur-md sm:left-3 sm:top-3">
              Últimas unidades
            </Badge>
          )}

          {outOfStock && (
            <Badge variant="glass" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              Esgotado
            </Badge>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
          {eyebrow && <p className="truncate text-xs text-muted-foreground">{eyebrow}</p>}
          <h3 className="line-clamp-2 font-display text-sm font-semibold leading-snug tracking-normal text-foreground transition-colors group-hover:text-primary sm:text-base">
            {name}
          </h3>

          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <p className="font-display text-base font-bold text-foreground sm:text-lg">{formatPrice(product.price)}</p>
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground sm:size-9"
            >
              <ArrowRight className="size-4" />
            </span>
          </div>
        </div>
      </Link>

      {onQuickView && (
        // No celular fica sempre visível; com mouse, aparece no hover ou no foco.
        <Button
          type="button"
          variant="glass"
          size="icon-sm"
          onClick={onQuickView}
          aria-label={`Ver ${name} rapidamente`}
          className="absolute right-2.5 top-2.5 sm:right-3 sm:top-3 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
        >
          <Eye />
        </Button>
      )}
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card sm:rounded-2xl">
      <Skeleton className="aspect-[4/5] rounded-none" />
      <div className="space-y-2 p-3 sm:p-4">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="size-8 rounded-full sm:size-9" />
        </div>
      </div>
    </div>
  )
}
