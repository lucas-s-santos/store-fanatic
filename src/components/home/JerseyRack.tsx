import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Pause, Play } from 'lucide-react'

import { Marquee } from '@/components/ui/marquee'
import { optimizedImageUrl } from '@/lib/assets'
import { formatPrice } from '@/lib/utils'

export interface RackItem {
  id: string
  name: string
  caption: string
  image: string
  price: number
}

/** Gancho do cabide: o laço de cima passa por trás do trilho. */
function Hook() {
  return (
    <svg
      viewBox="0 0 40 46"
      aria-hidden
      className="mx-auto block h-[46px] w-10 text-[#c9ced8] drop-shadow-[0_2px_2px_rgb(0_0_0/0.5)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    >
      <path d="M20 46 V27 C20 21 21 17 25 13 C29 9 27 3 20 3 C14 3 12 7 13 10" />
      <rect x="11" y="38" width="18" height="8" rx="2" fill="currentColor" stroke="none" />
    </svg>
  )
}

function HangingJersey({ item, index, eager }: { item: RackItem; index: number; eager: boolean }) {
  // Cada camisa balança num ritmo próprio para a arara não parecer robótica.
  const sway = {
    '--sway-duration': `${4.2 + (index % 5) * 0.55}s`,
    '--sway-from': `${-1.6 - (index % 3) * 0.5}deg`,
    '--sway-to': `${1.6 + (index % 4) * 0.4}deg`,
    animationDelay: `-${(index * 0.83) % 5}s`,
  } as CSSProperties

  return (
    <div className="w-[150px] shrink-0 sm:w-[184px] lg:w-[212px]">
      <div className="origin-[50%_8px] motion-safe:animate-sway" style={sway}>
        <Hook />
        <Link
          to={`/produtos/${item.id}`}
          className="group/jersey relative -mt-1 block rounded-[1.25rem] outline-offset-4"
          aria-label={`${item.name}, ${formatPrice(item.price)}`}
        >
          <div className="overflow-hidden rounded-[1.25rem] bg-muted shadow-[0_34px_50px_-24px_rgb(0_0_0/0.9)] ring-1 ring-white/10 transition-transform duration-500 ease-out group-hover/jersey:-translate-y-1.5 group-hover/jersey:scale-[1.03]">
            <img
              src={optimizedImageUrl(item.image, 440)}
              alt=""
              loading={eager ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              className="aspect-[4/5] w-full object-cover"
            />
          </div>

          {/* Etiqueta de preço presa no ombro. */}
          <span className="absolute -right-2 top-5 origin-top-left rotate-[9deg] rounded-md bg-paper py-1.5 pl-[18px] pr-2.5 text-paper-foreground shadow-lg [clip-path:polygon(10px_0,100%_0,100%_100%,10px_100%,0_50%)]">
            <span aria-hidden className="absolute left-[7px] top-1/2 size-[5px] -translate-y-1/2 rounded-full bg-background/70" />
            <span className="block text-[11px] font-black leading-none tabular-nums sm:text-xs">{formatPrice(item.price)}</span>
          </span>

          <span className="mt-3 block truncate px-1 text-center text-xs font-semibold text-foreground/85 sm:text-sm">
            {item.caption}
          </span>
        </Link>
      </div>
    </div>
  )
}

function RackSkeleton() {
  return (
    <div className="flex gap-6 overflow-hidden px-6 sm:gap-8" aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="w-[150px] shrink-0 sm:w-[184px] lg:w-[212px]">
          <Hook />
          <div className="-mt-1 aspect-[4/5] animate-pulse rounded-[1.25rem] bg-muted" />
        </div>
      ))}
    </div>
  )
}

/**
 * Arara de camisas: trilho cromado fixo e camisas penduradas passando sem fim.
 * Para no hover; o botão de pausa atende quem precisa parar o movimento.
 */
export function JerseyRack({
  items,
  loading,
  backdropWords = [],
}: {
  items: RackItem[]
  loading?: boolean
  /** Letreiro gigante atrás da arara, andando ao contrário dela. */
  backdropWords?: string[]
}) {
  const [paused, setPaused] = useState(false)

  return (
    <div className="relative isolate">
      {backdropWords.length > 0 && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[22%] -z-10">
          <Marquee reverse duration={120} paused={paused} pauseOnHover={false} itemsClassName="gap-10 pr-10">
            {backdropWords.map((word) => (
              <span key={word} className="display-title whitespace-nowrap text-[7rem] leading-none text-outline sm:text-[11rem] lg:text-[14rem]">
                {word} <span className="text-primary/20">✦</span>
              </span>
            ))}
          </Marquee>
        </div>
      )}

      {/* Trilho: fica na frente dos ganchos, que parecem passar por trás dele. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[5px] z-20 h-[7px] rounded-full bg-[linear-gradient(180deg,#f1f3f7_0%,#a7aebb_45%,#5d6573_100%)] shadow-[0_6px_12px_rgb(0_0_0/0.55)] [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]"
      />

      {loading || items.length === 0 ? (
        <RackSkeleton />
      ) : (
        <Marquee
          duration={Math.max(items.length * 4.5, 40)}
          paused={paused}
          reducedMotion="scroll"
          className="fade-x pb-6"
          itemsClassName="gap-6 pr-6 sm:gap-8 sm:pr-8"
        >
          {items.map((item, index) => (
            <HangingJersey key={item.id} item={item} index={index} eager={index < 6} />
          ))}
        </Marquee>
      )}

      {!loading && items.length > 0 && (
        <button
          type="button"
          onClick={() => setPaused((v) => !v)}
          aria-pressed={paused}
          className="absolute -bottom-3 right-4 z-30 inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur transition-colors hover:text-foreground motion-reduce:hidden sm:right-6"
        >
          {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          {paused ? 'Continuar vitrine' : 'Pausar vitrine'}
        </button>
      )}
    </div>
  )
}
