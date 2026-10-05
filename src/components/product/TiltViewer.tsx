import { useRef, useState, type ReactNode, type PointerEvent } from 'react'
import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion'

import { useFinePointer } from '@/lib/useFinePointer'

/** Inclinação máxima, em graus. Pouca: é foto de produto, não brinquedo. */
const MAX_TILT = 7
const SPRING = { stiffness: 220, damping: 22, mass: 0.5 }

/**
 * Foto que inclina em 3D na direção do mouse, com brilho acompanhando, e um
 * cursor "Ver" que segue o ponteiro (TiltedCard do React Bits + Skiper UI #61).
 * Só com mouse e sem "reduzir movimento"; no toque devolve a foto como está.
 */
export function TiltViewer({ children, label = 'Ver' }: { children: ReactNode; label?: string }) {
  const fine = useFinePointer()
  const ref = useRef<HTMLDivElement>(null)
  const [hovering, setHovering] = useState(false)

  // Posição do mouse na foto, de 0 a 1 (0.5 = centro).
  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(py, [0, 1], [MAX_TILT, -MAX_TILT]), SPRING)
  const rotateY = useSpring(useTransform(px, [0, 1], [-MAX_TILT, MAX_TILT]), SPRING)
  const transform = useMotionTemplate`perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
  const glareX = useTransform(px, (v) => `${v * 100}%`)
  const glareY = useTransform(py, (v) => `${v * 100}%`)
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgb(255 255 255 / 0.28), transparent 55%)`

  // Cursor "Ver" em pixels, com mola para não grudar seco no ponteiro.
  const cx = useSpring(0, { stiffness: 500, damping: 40 })
  const cy = useSpring(0, { stiffness: 500, damping: 40 })
  const cursor = useMotionTemplate`translate(${cx}px, ${cy}px) translate(-50%, -50%)`

  if (!fine) return <>{children}</>

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    px.set(x / rect.width)
    py.set(y / rect.height)
    cx.set(x)
    cy.set(y)
  }

  const onEnter = (event: PointerEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect()
    if (rect) {
      // O cursor nasce onde o mouse entrou, sem atravessar a foto.
      cx.jump(event.clientX - rect.left)
      cy.jump(event.clientY - rect.top)
    }
    setHovering(true)
  }

  const onLeave = () => {
    px.set(0.5)
    py.set(0.5)
    setHovering(false)
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      style={{ transform }}
      className="relative cursor-none will-change-transform"
    >
      {children}
      <motion.span
        aria-hidden
        style={{ backgroundImage: glare }}
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 mix-blend-soft-light transition-opacity duration-200 group-hover:opacity-100"
      />
      <AnimatePresence>
        {hovering && (
          <motion.span
            aria-hidden
            style={{ transform: cursor }}
            className="pointer-events-none absolute left-0 top-0 z-10"
          >
            <motion.span
              initial={{ opacity: 0, transform: 'scale(0.6)' }}
              animate={{ opacity: 1, transform: 'scale(1)' }}
              exit={{ opacity: 0, transform: 'scale(0.6)', transition: { duration: 0.12 } }}
              transition={{ type: 'spring', duration: 0.3, bounce: 0.2 }}
              className="flex size-16 items-center justify-center rounded-full bg-primary text-xs font-black uppercase tracking-[0.12em] text-primary-foreground shadow-[0_10px_30px_-8px_rgb(0_0_0/0.6)]"
            >
              {label}
            </motion.span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
