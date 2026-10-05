import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion'

import { cn } from '@/lib/utils'

export type RevealPart = string | { text: string; highlight?: boolean } | { br: true }

interface Token {
  word: string
  highlight: boolean
  index: number
}

function tokenize(parts: RevealPart[]) {
  const tokens: (Token | 'br')[] = []
  let index = 0
  for (const part of parts) {
    if (typeof part !== 'string' && 'br' in part) {
      tokens.push('br')
      continue
    }
    const text = typeof part === 'string' ? part : part.text
    const highlight = typeof part !== 'string' && Boolean(part.highlight)
    for (const word of text.split(/\s+/).filter(Boolean)) tokens.push({ word, highlight, index: index++ })
  }
  return { tokens, count: index }
}

function Word({ token, count, progress }: { token: Token; count: number; progress: MotionValue<number> }) {
  const start = token.index / count
  const opacity = useTransform(progress, [start, start + 1 / count], [0.16, 1])
  return (
    <>
      <motion.span style={{ opacity }} className={cn(token.highlight && 'text-highlight')}>
        {token.word}
      </motion.span>{' '}
    </>
  )
}

/**
 * Título que "acende" palavra por palavra conforme a rolagem, como letreiro
 * de estádio (ScrollReveal do React Bits / Skiper UI #31). O texto continua
 * normal para leitor de tela; com "reduzir movimento" aparece inteiro.
 */
export function ScrollRevealText({ parts, className }: { parts: RevealPart[]; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion() ?? false
  // Começa quando o título entra por baixo e termina perto do meio da tela.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.92', 'start 0.45'] })
  const { tokens, count } = tokenize(parts)

  return (
    <span ref={ref} className={className}>
      {tokens.map((token, k) =>
        token === 'br' ? (
          <br key={`br-${k}`} />
        ) : reduce ? (
          <span key={k}>
            <span className={cn(token.highlight && 'text-highlight')}>{token.word}</span>{' '}
          </span>
        ) : (
          <Word key={k} token={token} count={count} progress={scrollYProgress} />
        ),
      )}
    </span>
  )
}
