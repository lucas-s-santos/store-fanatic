import { Children, useRef, type ReactNode } from 'react'
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion'

import { useFinePointer } from '@/lib/useFinePointer'
import { cn } from '@/lib/utils'

/** Até onde (px) o mouse ainda influencia um escudo. */
const REACH = 110

function DockItem({ mouseX, children }: { mouseX: MotionValue<number>; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const distance = useTransform(mouseX, (x) => {
    const rect = ref.current?.getBoundingClientRect()
    return rect ? x - (rect.left + rect.width / 2) : Infinity
  })
  // Só transform: cresce e sobe sem empurrar o layout (como a dock do Mac).
  const target = useTransform(distance, [-REACH, 0, REACH], [1, 1.45, 1])
  const scale = useSpring(target, { stiffness: 320, damping: 24, mass: 0.4 })
  const lift = useTransform(scale, [1, 1.45], [0, -6])
  const transform = useMotionTemplate`translateY(${lift}px) scale(${scale})`

  return (
    <motion.div ref={ref} style={{ transform, transformOrigin: 'bottom center' }} className="relative shrink-0 hover:z-10">
      {children}
    </motion.div>
  )
}

/**
 * Linha de escudos com efeito "dock" no hover. Sem mouse (toque) ou com
 * "reduzir movimento", vira uma linha comum.
 */
export function CrestDock({ children, className }: { children: ReactNode; className?: string }) {
  const fine = useFinePointer()
  const mouseX = useMotionValue(Infinity)
  const items = Children.toArray(children)

  if (!fine) return <div className={cn('flex items-center gap-1.5', className)}>{items}</div>

  return (
    <div
      onMouseMove={(event) => mouseX.set(event.clientX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn('flex items-end gap-1.5', className)}
    >
      {items.map((item, i) => (
        <DockItem key={i} mouseX={mouseX}>
          {item}
        </DockItem>
      ))}
    </div>
  )
}
