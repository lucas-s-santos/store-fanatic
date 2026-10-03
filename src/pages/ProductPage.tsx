import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, ChevronDown, ChevronRight, QrCode, Ruler, Shirt, ShoppingBag, Truck, X } from 'lucide-react'

import { ProductShelf } from '../components/home/ProductShelf'
import { JerseyPreview } from '../components/product/JerseyPreview'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Skeleton } from '../components/ui/skeleton'
import { useToast } from '../components/ui/Toast'
import { WhatsAppIcon, whatsappUrl } from '../components/ui/whatsapp-icon'
import { optimizedImageSrcSet, optimizedImageUrl, resolveAssetUrl } from '../lib/assets'
import {
  displayProductName,
  fetchLeaguesAndTeams,
  fetchShowcaseProducts,
  shuffle,
  type ShowcaseLeague,
  type ShowcaseProduct,
  type ShowcaseTeam,
} from '../lib/catalog'
import { supabase } from '../lib/supabase'
import { useSettings } from '../lib/useSettings'
import { cn, formatPrice } from '../lib/utils'
import { useFocusTrap } from '../lib/useFocusTrap'
import { useCartStore } from '../store/cartStore'

interface Product {
  id: string
  name?: string
  title?: string
  description: string
  price: number
  category: string
  league?: string
  team?: string
  image_url: string
  images?: string[] | null
  sizes: string[]
  stock_quantity?: number
  stock?: number
  tech_specs?: Record<string, string>
  personalization_price?: number | null
}

const DEFAULT_SIZES = ['P', 'M', 'G', 'GG', 'XG']

const SIZE_GUIDE = [
  { size: 'P', width: 50, height: 69 },
  { size: 'M', width: 52, height: 71 },
  { size: 'G', width: 54, height: 73 },
  { size: 'GG', width: 56, height: 75 },
  { size: 'XG', width: 58, height: 77 },
]

function SizeGuideTable() {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-border text-xs uppercase tracking-[0.12em] text-muted-foreground">
          <th className="py-3 pr-2 font-bold">Tamanho</th>
          <th className="py-3 pr-2 font-bold">Largura (cm)</th>
          <th className="py-3 font-bold">Altura (cm)</th>
        </tr>
      </thead>
      <tbody>
        {SIZE_GUIDE.map((row) => (
          <tr key={row.size} className="border-b border-border/60 last:border-0">
            <td className="py-3 pr-2 font-bold">{row.size}</td>
            <td className="py-3 pr-2 tabular-nums text-foreground/85">{row.width}</td>
            <td className="py-3 tabular-nums text-foreground/85">{row.height}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Disclosure({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group border-b border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-sm font-bold uppercase tracking-[0.1em] [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="pb-5 text-sm leading-7 text-muted-foreground">{children}</div>
    </details>
  )
}

function ProductSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1440px] gap-10 px-4 pb-16 pt-[7.25rem] sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:pt-[8.25rem]">
      <Skeleton className="aspect-[4/5] rounded-3xl" />
      <div className="space-y-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-10 w-40" />
        <div className="grid grid-cols-5 gap-2 pt-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-14 rounded-full" />
      </div>
    </div>
  )
}

export function ProductPage() {
  const { id } = useParams<{ id: string }>()
  const { settings } = useSettings()
  const { toast } = useToast()
  const addItem = useCartStore((state) => state.addItem)
  const cartItems = useCartStore((state) => state.items)

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [leagues, setLeagues] = useState<ShowcaseLeague[]>([])
  const [teams, setTeams] = useState<ShowcaseTeam[]>([])
  const [showcase, setShowcase] = useState<ShowcaseProduct[]>([])
  const [imageIndex, setImageIndex] = useState(0)
  const [selectedSize, setSelectedSize] = useState('')
  const [sizeError, setSizeError] = useState(false)
  const [showSizeGuide, setShowSizeGuide] = useState(false)
  const [personalize, setPersonalize] = useState(false)
  const [personalizedName, setPersonalizedName] = useState('')
  const [personalizedNumber, setPersonalizedNumber] = useState('')
  const sizesRef = useRef<HTMLDivElement>(null)
  const galleryRef = useRef<HTMLDivElement>(null)
  const sizeGuideRef = useRef<HTMLDivElement>(null)
  useFocusTrap(sizeGuideRef, showSizeGuide)

  useEffect(() => {
    let active = true
    async function fetchProduct() {
      if (!id) return
      setLoading(true)
      setImageIndex(0)
      setSelectedSize('')
      setPersonalize(false)
      setPersonalizedName('')
      setPersonalizedNumber('')
      const { data, error } = await supabase.from('products').select('*').eq('id', id).single()
      if (!active) return
      if (error) console.error('Error fetching product:', error)
      setProduct(data ?? null)
      setLoading(false)
      window.scrollTo({ top: 0 })
    }
    fetchProduct()
    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    fetchLeaguesAndTeams()
      .then(({ leagues, teams }) => {
        setLeagues(leagues)
        setTeams(teams)
      })
      .catch(() => {})
    fetchShowcaseProducts()
      .then(setShowcase)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!showSizeGuide) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setShowSizeGuide(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [showSizeGuide])

  const related = useMemo(() => {
    if (!product) return []
    const sameTeam = showcase.filter((p) => p.id !== product.id && p.league === product.league && p.team === product.team)
    const sameLeague = shuffle(showcase.filter((p) => p.league === product.league && p.team !== product.team))
    return [...sameTeam, ...sameLeague].slice(0, 12)
  }, [showcase, product])

  if (loading) return <ProductSkeleton />

  if (!product) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-[1440px] flex-col items-center justify-center gap-6 px-4 pt-28 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Shirt className="size-9" aria-hidden />
        </span>
        <h1 className="display-title text-5xl">Camisa não encontrada</h1>
        <p className="max-w-sm text-muted-foreground">Ela pode ter saído do catálogo. Que tal ver os outros modelos?</p>
        <Button asChild size="lg">
          <Link to="/produtos">
            <ArrowLeft />
            Ver todas as camisas
          </Link>
        </Button>
      </div>
    )
  }

  const rawName = product.name || product.title || ''
  const name = displayProductName(rawName)
  const league = leagues.find((l) => l.id === product.league)
  const team = teams.find((t) => t.league_id === product.league && t.id === product.team)
  const stockQty = product.stock_quantity ?? product.stock ?? 0
  const isLowStock = stockQty > 0 && stockQty <= 5
  const sizes = product.sizes?.length ? product.sizes : DEFAULT_SIZES
  const images = [product.image_url, ...(product.images || [])].filter(
    (url, index, all) => url && all.indexOf(url) === index,
  )
  // 0 no produto é o valor padrão da coluna: vale o preço da configuração da loja.
  const personalizationPrice = product.personalization_price || settings.personalization_price
  const hasPersonalization = personalize && (personalizedName.trim().length > 0 || personalizedNumber.trim().length > 0)
  const finalPrice = product.price + (hasPersonalization ? personalizationPrice : 0)

  const goToImage = (index: number) => {
    setImageIndex(index)
    const el = galleryRef.current
    if (el) el.scrollTo({ left: el.clientWidth * index, behavior: 'smooth' })
  }

  const handleAddToCart = () => {
    if (stockQty === 0) return
    if (!selectedSize) {
      setSizeError(true)
      sizesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    const existing = cartItems.find((item) => item.id === product.id && item.size === selectedSize)
    if (stockQty > 0 && (existing?.quantity ?? 0) >= stockQty) {
      toast(`Estoque esgotado para o tamanho ${selectedSize}. Máximo: ${stockQty} unidade(s).`, 'warning')
      return
    }

    addItem({
      id: product.id,
      title: rawName,
      price: finalPrice,
      imageUrl: resolveAssetUrl(product.image_url),
      size: selectedSize,
      quantity: 1,
      stockQuantity: stockQty,
      personalization: hasPersonalization
        ? { name: personalizedName.trim(), number: personalizedNumber.trim() }
        : undefined,
    })
  }

  const ctaLabel = stockQty === 0 ? 'Esgotado' : 'Adicionar à sacola'

  return (
    <div className="pb-28 pt-[7.25rem] lg:pb-8 lg:pt-[8.25rem]">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <nav aria-label="Você está em" className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Início
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
          <Link to="/produtos" className="hover:text-foreground">
            Camisas
          </Link>
          {league && (
            <>
              <ChevronRight className="size-3.5" aria-hidden />
              <Link to={`/produtos?liga=${league.id}`} className="hover:text-foreground">
                {league.name}
              </Link>
            </>
          )}
          {team && (
            <>
              <ChevronRight className="size-3.5" aria-hidden />
              <Link to={`/produtos?liga=${team.league_id}&time=${team.id}`} className="hover:text-foreground">
                {team.name}
              </Link>
            </>
          )}
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
          {/* ── Galeria ── */}
          <div className="lg:grid lg:grid-cols-[84px_1fr] lg:items-start lg:gap-4">
            {images.length > 1 && (
              <div className="hidden flex-col gap-3 lg:flex">
                {images.map((url, index) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => goToImage(index)}
                    aria-label={`Ver foto ${index + 1}`}
                    aria-current={index === imageIndex}
                    className={cn(
                      'overflow-hidden rounded-xl ring-2 transition-[box-shadow,opacity]',
                      index === imageIndex ? 'ring-primary' : 'opacity-60 ring-transparent hover:opacity-100',
                    )}
                  >
                    <img src={optimizedImageUrl(url, 168)} alt="" className="aspect-[4/5] w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className={cn('relative', images.length <= 1 && 'lg:col-span-2')}>
              <div
                ref={galleryRef}
                onScroll={(event) => {
                  const el = event.currentTarget
                  setImageIndex(Math.round(el.scrollLeft / el.clientWidth))
                }}
                className="shelf auto-cols-[100%] overflow-x-auto rounded-3xl bg-muted ring-1 ring-inset ring-white/[0.06]"
              >
                {images.map((url, index) => (
                  <img
                    key={url}
                    src={optimizedImageUrl(url, 1280)}
                    srcSet={optimizedImageSrcSet(url, [640, 960, 1280])}
                    sizes="(min-width: 1024px) 55vw, 100vw"
                    alt={index === 0 ? name : `${name}, foto ${index + 1}`}
                    fetchPriority={index === 0 ? 'high' : undefined}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    className="aspect-[4/5] w-full object-cover"
                  />
                ))}
              </div>

              {isLowStock && (
                <Badge variant="flame" className="absolute left-4 top-4">
                  Últimas {stockQty} unidades
                </Badge>
              )}

              {images.length > 1 && (
                <div className="absolute inset-x-0 bottom-2 flex justify-center lg:hidden">
                  {images.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => goToImage(index)}
                      aria-label={`Ver foto ${index + 1}`}
                      aria-current={index === imageIndex}
                      className="flex h-8 items-center px-1.5"
                    >
                      <span className={cn('block h-1.5 rounded-full transition-all', index === imageIndex ? 'w-6 bg-paper' : 'w-1.5 bg-white/50')} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Informações e compra ── */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
              <div className="flex items-center gap-3">
                {team?.logo_url && <img src={optimizedImageUrl(team.logo_url, 80)} alt="" className="size-9 object-contain" />}
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {[team?.name, league?.name].filter(Boolean).join(' · ') || 'Camisa'}
                </p>
              </div>

              <h1 className="display-title mt-4 text-5xl sm:text-6xl">{name}</h1>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <p className="text-4xl font-black tabular-nums">{formatPrice(finalPrice)}</p>
                {stockQty === 0 ? (
                  <Badge variant="destructive">Esgotado</Badge>
                ) : (
                  <Badge variant="success">Em estoque</Badge>
                )}
              </div>
              {hasPersonalization && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Inclui {formatPrice(personalizationPrice)} de personalização
                </p>
              )}

              {/* Tamanho */}
              <div ref={sizesRef} className="mt-8">
                <div className="flex items-center justify-between">
                  <p id="size-label" className="text-sm font-bold uppercase tracking-[0.1em]">
                    Tamanho{selectedSize && <span className="text-muted-foreground"> · {selectedSize}</span>}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSizeGuide(true)}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  >
                    <Ruler className="size-4" aria-hidden />
                    Guia de medidas
                  </button>
                </div>
                <div
                  role="radiogroup"
                  aria-labelledby="size-label"
                  className="mt-3 grid grid-cols-5 gap-2"
                  onKeyDown={(event) => {
                    // Setas trocam o tamanho, como num grupo de rádio nativo.
                    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown'
                    const back = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
                    if (!forward && !back) return
                    event.preventDefault()
                    // Sem tamanho escolhido, a seta parte do botão que está com foco.
                    const focusedSize = (event.target as HTMLElement).dataset.size ?? ''
                    const current = sizes.indexOf(selectedSize || focusedSize)
                    const next = sizes[(current + (forward ? 1 : -1) + sizes.length) % sizes.length]
                    setSelectedSize(next)
                    setSizeError(false)
                    event.currentTarget.querySelector<HTMLButtonElement>(`[data-size="${next}"]`)?.focus()
                  }}
                >
                  {sizes.map((size, index) => (
                    <button
                      key={size}
                      type="button"
                      role="radio"
                      data-size={size}
                      aria-checked={selectedSize === size}
                      tabIndex={(selectedSize ? selectedSize === size : index === 0) ? 0 : -1}
                      disabled={stockQty === 0}
                      onClick={() => {
                        setSelectedSize(size)
                        setSizeError(false)
                      }}
                      className={cn(
                        'h-12 rounded-xl border text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:text-muted-foreground/40 disabled:line-through',
                        selectedSize === size
                          ? 'border-primary bg-primary text-primary-foreground'
                          : sizeError
                            ? 'border-destructive/60 text-foreground'
                            : 'border-input text-foreground hover:border-foreground/50',
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                {sizeError && (
                  <p role="alert" className="mt-2 text-sm font-semibold text-destructive">
                    Escolha um tamanho para continuar.
                  </p>
                )}
              </div>

              {/* Personalização */}
              <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
                <button
                  type="button"
                  onClick={() => setPersonalize((v) => !v)}
                  aria-expanded={personalize}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left"
                >
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                      personalize ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
                    )}
                  >
                    {personalize && <Check className="size-4" strokeWidth={3} />}
                  </span>
                  <span className="flex-1">
                    <span className="block font-bold">Personalizar com nome e número</span>
                    <span className="block text-sm text-muted-foreground">+ {formatPrice(personalizationPrice)}</span>
                  </span>
                  <Shirt className="size-5 text-primary" aria-hidden />
                </button>

                <AnimatePresence initial={false}>
                  {personalize && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="grid grid-cols-[1fr_7rem] items-center gap-4 border-t border-border p-4 sm:grid-cols-[1fr_8.5rem]">
                        <div className="grid gap-3">
                          <label className="space-y-1.5">
                            <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Nome</span>
                            <input
                              type="text"
                              maxLength={15}
                              value={personalizedName}
                              onChange={(e) => setPersonalizedName(e.target.value.toUpperCase())}
                              placeholder="EX.: GABIGOL"
                              className="form-input h-11 py-0 font-bold uppercase"
                            />
                          </label>
                          <label className="space-y-1.5">
                            <span className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Número</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              maxLength={2}
                              value={personalizedNumber}
                              onChange={(e) => setPersonalizedNumber(e.target.value.replace(/\D/g, '').slice(0, 2))}
                              placeholder="10"
                              className="form-input h-11 py-0 font-bold"
                            />
                          </label>
                        </div>
                        <JerseyPreview name={personalizedName} number={personalizedNumber} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-6 grid gap-3">
                <Button size="xl" className="w-full" onClick={handleAddToCart} disabled={stockQty === 0}>
                  <ShoppingBag />
                  {ctaLabel}
                </Button>
                {settings.whatsapp_number && (
                  <Button asChild size="lg" variant="outline" className="w-full">
                    <a
                      href={whatsappUrl(settings.whatsapp_number, `Olá! Tenho uma dúvida sobre a camisa "${rawName}".`)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <WhatsAppIcon className="size-4 text-success" />
                      Tirar dúvida no WhatsApp
                    </a>
                  </Button>
                )}
              </div>

              <ul className="mt-6 grid gap-3 rounded-2xl border border-border p-4 text-sm">
                <li className="flex items-center gap-3">
                  <Truck className="size-5 shrink-0 text-primary" aria-hidden />
                  <span>
                    <strong className="font-semibold">Frete grátis</strong> acima de {formatPrice(settings.shipping_free_threshold)} · envio para todo o Brasil
                  </span>
                </li>
                <li className="flex items-center gap-3">
                  <QrCode className="size-5 shrink-0 text-primary" aria-hidden />
                  <span>
                    <strong className="font-semibold">Pagamento via PIX</strong>, confirmação pelo WhatsApp
                  </span>
                </li>
              </ul>

              <div className="mt-4">
                <Disclosure title="Descrição" defaultOpen>
                  {product.description || 'Camisa com acabamento de qualidade. Escolha seu tamanho e, se quiser, personalize com nome e número.'}
                </Disclosure>
                {product.tech_specs && Object.keys(product.tech_specs).length > 0 && (
                  <Disclosure title="Especificações">
                    <dl className="grid gap-2">
                      {Object.entries(product.tech_specs).map(([key, value]) => (
                        <div key={key} className="flex justify-between gap-4">
                          <dt className="capitalize">{key}</dt>
                          <dd className="font-semibold text-foreground">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </Disclosure>
                )}
                <Disclosure title="Guia de medidas">
                  <SizeGuideTable />
                  <p className="mt-3 text-xs">As medidas podem variar de 1 a 2 cm.</p>
                </Disclosure>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <ProductShelf
          eyebrow={team ? `Mais do ${team.name}` : 'Combina com você'}
          title={
            <>
              Você também <span className="text-highlight">vai curtir</span>
            </>
          }
          href={team ? `/produtos?liga=${team.league_id}&time=${team.id}` : '/produtos'}
          products={related}
        />
      )}

      {/* Barra de compra fixa no celular. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">{selectedSize ? `Tamanho ${selectedSize}` : 'Escolha o tamanho'}</p>
            <p className="text-lg font-black tabular-nums">{formatPrice(finalPrice)}</p>
          </div>
          <Button size="lg" onClick={handleAddToCart} disabled={stockQty === 0} className="px-6">
            <ShoppingBag />
            {stockQty === 0 ? 'Esgotado' : 'Adicionar'}
          </Button>
        </div>
      </div>

      {/* Guia de medidas (portal: fica acima do cabeçalho) */}
      {createPortal(
      <AnimatePresence>
        {showSizeGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => setShowSizeGuide(false)}
          >
            <motion.div
              ref={sizeGuideRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="size-guide-title"
              initial={{ scale: 0.96, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl sm:p-8"
            >
              <Button variant="ghost" size="icon" onClick={() => setShowSizeGuide(false)} className="absolute right-4 top-4" aria-label="Fechar">
                <X />
              </Button>
              <h2 id="size-guide-title" className="display-title text-4xl">
                Guia de medidas
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">Meça uma camisa sua deitada e compare.</p>
              <div className="mt-5">
                <SizeGuideTable />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">As medidas podem variar de 1 a 2 cm.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
