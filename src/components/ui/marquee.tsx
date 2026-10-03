import type { CSSProperties, ReactNode } from 'react'
import { useReducedMotion } from 'framer-motion'

import { cn } from '@/lib/utils'

/**
 * Faixa que rola sem fim: o conteúdo é renderizado duas vezes e a trilha anda
 * -50%. O espaço entre itens precisa estar em `itemsClassName` como gap + pr
 * iguais (ex.: "gap-8 pr-8") para a emenda não aparecer.
 *
 * Com "reduzir movimento" ligado a faixa para; `reducedMotion="scroll"` deixa
 * o usuário rolar na mão em vez de esconder o que não cabe.
 */
export function Marquee({
  children,
  duration = 40,
  reverse = false,
  paused = false,
  pauseOnHover = true,
  reducedMotion = 'static',
  className,
  itemsClassName,
}: {
  children: ReactNode
  /** Segundos para percorrer uma cópia inteira do conteúdo. */
  duration?: number
  reverse?: boolean
  paused?: boolean
  pauseOnHover?: boolean
  reducedMotion?: 'static' | 'scroll'
  className?: string
  itemsClassName?: string
}) {
  const reduce = useReducedMotion() ?? false

  if (reduce) {
    return (
      <div className={cn('flex', reducedMotion === 'scroll' ? 'shelf overflow-x-auto' : 'overflow-hidden', className)}>
        <div className={cn('flex shrink-0', itemsClassName)}>{children}</div>
      </div>
    )
  }

  return (
    <div className={cn('group/marquee flex overflow-hidden', className)}>
      <div
        className={cn(
          'flex w-max shrink-0 will-change-transform',
          reverse ? 'animate-marquee-reverse' : 'animate-marquee',
          pauseOnHover && 'group-hover/marquee:[animation-play-state:paused]',
          paused && '[animation-play-state:paused]',
        )}
        style={{ '--marquee-duration': `${duration}s` } as CSSProperties}
      >
        <div className={cn('flex shrink-0', itemsClassName)}>{children}</div>
        <div className={cn('flex shrink-0', itemsClassName)} aria-hidden inert>
          {children}
        </div>
      </div>
    </div>
  )
}
