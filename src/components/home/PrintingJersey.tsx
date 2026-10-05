import { useRef, useState } from 'react'
import { motion, useMotionTemplate, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'framer-motion'

import { JerseyFront, JerseyPreview } from '@/components/product/JerseyPreview'

const clamp = (value: number) => Math.min(Math.max(value, 0), 1)

/**
 * Camisa "estampada" pela rolagem: gira da frente para as costas, depois o
 * nome aparece letra por letra e o número é carimbado. Se a pessoa já digitou
 * (`typed`), mostra tudo na hora: o que ela escreveu vale mais que o efeito.
 */
export function PrintingJersey({ name, number, typed }: { name: string; number: string; typed: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion() ?? false
  // 0 quando a camisa entra por baixo da tela, 1 quando chega ao meio.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const rotate = useTransform(scrollYProgress, [0.05, 0.45], [180, 0])
  const transform = useMotionTemplate`perspective(1400px) rotateY(${rotate}deg)`

  // Passos de 2%: suficiente para a estampa e evita renderizar a cada pixel.
  const [progress, setProgress] = useState(0)
  useMotionValueEvent(scrollYProgress, 'change', (value) => setProgress(Math.round(value * 50) / 50))

  const done = typed || reduce
  const nameProgress = done ? 1 : clamp((progress - 0.5) / 0.3)
  const numberProgress = done ? 1 : clamp((progress - 0.8) / 0.18)

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[400px]">
      <div aria-hidden className="absolute inset-[12%] rounded-full bg-primary/50 blur-[70px]" />
      <div className="relative origin-[50%_0] motion-safe:animate-sway [--sway-duration:6s]">
        <motion.div style={reduce ? undefined : { transform, transformStyle: 'preserve-3d' }} className="relative">
          <div style={{ backfaceVisibility: 'hidden' }}>
            <JerseyPreview
              name={name}
              number={number}
              nameProgress={nameProgress}
              numberProgress={numberProgress}
              className="drop-shadow-[0_30px_30px_rgb(11_14_21/0.25)]"
            />
          </div>
          {!reduce && (
            <div aria-hidden className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <JerseyFront className="drop-shadow-[0_30px_30px_rgb(11_14_21/0.25)]" />
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
