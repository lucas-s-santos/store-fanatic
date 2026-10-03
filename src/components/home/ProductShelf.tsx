import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

import { ProductCard, ProductCardSkeleton, type ProductCardData } from '@/components/product/ProductCard'
import { Button } from '@/components/ui/button'
import { SectionHeading } from './SectionHeading'

/**
 * Prateleira horizontal: rola com o dedo/trackpad e com as setas, que desligam
 * nas pontas. Nada se move sozinho.
 */
export function ProductShelf({
  eyebrow,
  title,
  description,
  href,
  products,
  loading,
  eyebrowFor,
}: {
  eyebrow?: string
  title: ReactNode
  description?: string
  href: string
  products: ProductCardData[]
  loading?: boolean
  eyebrowFor?: (product: ProductCardData) => string | undefined
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: true, end: false })

  const updateEdges = () => {
    const el = trackRef.current
    if (!el) return
    setEdges({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    })
  }

  useEffect(() => {
    updateEdges()
    window.addEventListener('resize', updateEdges)
    return () => window.removeEventListener('resize', updateEdges)
  }, [products.length])

  const scrollBy = (direction: 1 | -1) => {
    const el = trackRef.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  if (!loading && products.length === 0) return null

  return (
    <section className="section-shell">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={eyebrow}
          title={title}
          description={description}
          action={
            <>
              <Button asChild variant="outline" className="font-bold">
                <Link to={href}>
                  Ver tudo
                  <ArrowRight />
                </Link>
              </Button>
              <div className="hidden gap-2 md:flex">
                <Button variant="outline" size="icon" onClick={() => scrollBy(-1)} disabled={edges.start} aria-label="Ver anteriores">
                  <ChevronLeft />
                </Button>
                <Button variant="outline" size="icon" onClick={() => scrollBy(1)} disabled={edges.end} aria-label="Ver próximas">
                  <ChevronRight />
                </Button>
              </div>
            </>
          }
        />
      </div>

      <div
        ref={trackRef}
        onScroll={updateEdges}
        className="shelf mx-auto max-w-[1440px] auto-cols-[46%] gap-3 scroll-px-4 px-4 sm:auto-cols-[31%] sm:gap-5 sm:scroll-px-6 sm:px-6 lg:auto-cols-[calc((100%-3*1.25rem)/4.3)] lg:scroll-px-8 lg:px-8 2xl:auto-cols-[calc((100%-4*1.25rem)/5.3)]"
      >
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
          : products.map((product) => (
              <ProductCard key={product.id} product={product} eyebrow={eyebrowFor?.(product)} />
            ))}
      </div>
    </section>
  )
}
