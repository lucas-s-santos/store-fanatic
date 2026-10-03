import { useId } from 'react'

import { cn } from '@/lib/utils'

const NAME_MAX_WIDTH = 150

/**
 * Costas de uma camisa em SVG com nome e número, para mostrar a personalização
 * ao vivo enquanto a pessoa digita. Cores vêm dos tokens da marca.
 */
export function JerseyPreview({
  name,
  number,
  className,
}: {
  name: string
  number: string
  className?: string
}) {
  const displayName = (name.trim() || 'SEU NOME').toUpperCase()
  const displayNumber = number.trim() || '10'
  // Nomes longos são comprimidos para caber entre os ombros.
  const squeezeName = displayName.length > 9
  // useId traz ":" ou "«»", que quebram a referência url(#...) do SVG.
  const id = `jersey${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const fabric = `${id}-fabric`
  const shade = `${id}-shade`

  return (
    <svg
      viewBox="0 0 300 320"
      role="img"
      aria-label={`Prévia da camisa com o nome ${displayName} e o número ${displayNumber}`}
      className={cn('h-auto w-full', className)}
    >
      <defs>
        <linearGradient id={fabric} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd23f" />
          <stop offset="1" stopColor="#ffb800" />
        </linearGradient>
        <linearGradient id={shade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.12" />
        </linearGradient>
      </defs>

      <path
        d="M110 18 Q150 34 190 18 L262 40 L298 118 L258 138 L246 112 L246 300 Q150 314 54 300 L54 112 L42 138 L2 118 L38 40 Z"
        fill={`url(#${fabric})`}
      />
      <path
        d="M110 18 Q150 34 190 18 L262 40 L298 118 L258 138 L246 112 L246 300 Q150 314 54 300 L54 112 L42 138 L2 118 L38 40 Z"
        fill={`url(#${shade})`}
      />
      {/* Gola e punhos em azul-marinho. */}
      <path d="M110 18 Q150 34 190 18" fill="none" stroke="#14213d" strokeWidth="7" strokeLinecap="round" />
      <path d="M298 118 L258 138" stroke="#14213d" strokeWidth="9" />
      <path d="M2 118 L42 138" stroke="#14213d" strokeWidth="9" />
      <path d="M54 112 L54 300 M246 112 L246 300" stroke="#e8a500" strokeWidth="2" opacity="0.6" />

      <text
        x="150"
        y="92"
        textAnchor="middle"
        fill="#14213d"
        fontFamily="Anton, Impact, sans-serif"
        fontSize="30"
        letterSpacing="3"
        {...(squeezeName ? { textLength: NAME_MAX_WIDTH, lengthAdjust: 'spacingAndGlyphs' } : {})}
      >
        {displayName}
      </text>
      <text
        x="150"
        y="250"
        textAnchor="middle"
        fill="#14213d"
        fontFamily="Anton, Impact, sans-serif"
        fontSize="138"
      >
        {displayNumber}
      </text>
    </svg>
  )
}
