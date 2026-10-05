import type { CSSProperties } from 'react'

import { cn } from '@/lib/utils'

/**
 * Texto que "rola" no hover do elemento pai com a classe `roll-trigger`.
 * O leitor de tela lê o texto uma vez só; as letras animadas ficam escondidas dele.
 * Técnica inspirada no Skiper UI #58 (https://skiper-ui.com).
 */
export function TextRoll({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn('relative inline-flex', className)}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="text-roll-track">
        {Array.from(text).map((char, i) => (
          <span key={i} className="text-roll-char" data-char={char} style={{ '--i': i } as CSSProperties}>
            {char}
          </span>
        ))}
      </span>
    </span>
  )
}
