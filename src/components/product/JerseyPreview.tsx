import { useId } from 'react'

import { cn } from '@/lib/utils'

const NAME_MAX_WIDTH = 150
const SILHOUETTE = 'M110 18 Q150 34 190 18 L262 40 L298 118 L258 138 L246 112 L246 300 Q150 314 54 300 L54 112 L42 138 L2 118 L38 40 Z'
const INK = '#14213d'

/** Gradientes do tecido; ids únicos porque pode haver mais de uma camisa na página. */
function useFabric() {
  // useId traz ":" ou "«»", que quebram a referência url(#...) do SVG.
  const id = `jersey${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const fabric = `${id}-fabric`
  const shade = `${id}-shade`
  const defs = (
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
  )
  return { defs, fabric: `url(#${fabric})`, shade: `url(#${shade})` }
}

/**
 * Costas de uma camisa em SVG com nome e número, para mostrar a personalização
 * ao vivo enquanto a pessoa digita. `nameProgress` e `numberProgress` (0 a 1)
 * deixam "estampar" aos poucos, ligados à rolagem.
 */
export function JerseyPreview({
  name,
  number,
  nameProgress = 1,
  numberProgress = 1,
  className,
}: {
  name: string
  number: string
  nameProgress?: number
  numberProgress?: number
  className?: string
}) {
  const displayName = (name.trim() || 'SEU NOME').toUpperCase()
  const displayNumber = number.trim() || '10'
  // Nomes longos são comprimidos para caber entre os ombros.
  const squeezeName = displayName.length > 9
  const { defs, fabric, shade } = useFabric()
  const chars = Array.from(displayName)
  const printed = Math.ceil(chars.length * Math.min(Math.max(nameProgress, 0), 1))
  const stamp = Math.min(Math.max(numberProgress, 0), 1)

  return (
    <svg
      viewBox="0 0 300 320"
      role="img"
      aria-label={`Prévia da camisa com o nome ${displayName} e o número ${displayNumber}`}
      className={cn('h-auto w-full', className)}
    >
      {defs}
      <path d={SILHOUETTE} fill={fabric} />
      <path d={SILHOUETTE} fill={shade} />
      {/* Gola e punhos em azul-marinho. */}
      <path d="M110 18 Q150 34 190 18" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
      <path d="M298 118 L258 138" stroke={INK} strokeWidth="9" />
      <path d="M2 118 L42 138" stroke={INK} strokeWidth="9" />
      <path d="M54 112 L54 300 M246 112 L246 300" stroke="#e8a500" strokeWidth="2" opacity="0.6" />

      <text
        x="150"
        y="92"
        textAnchor="middle"
        fill={INK}
        fontFamily="Anton, Impact, sans-serif"
        fontSize="30"
        letterSpacing="3"
        {...(squeezeName ? { textLength: NAME_MAX_WIDTH, lengthAdjust: 'spacingAndGlyphs' } : {})}
      >
        {/* Letras ainda não estampadas ficam invisíveis, mas ocupam o lugar (o nome não "anda"). */}
        {chars.map((char, i) => (
          <tspan key={i} fillOpacity={i < printed ? 1 : 0}>
            {char}
          </tspan>
        ))}
      </text>
      <text
        x="150"
        y="250"
        textAnchor="middle"
        fill={INK}
        fontFamily="Anton, Impact, sans-serif"
        fontSize="138"
        opacity={stamp}
        style={{ transformBox: 'fill-box', transformOrigin: 'center', transform: `scale(${1.35 - 0.35 * stamp})` }}
      >
        {displayNumber}
      </text>
    </svg>
  )
}

/** Frente da camisa (gola V e escudo da loja), para o giro antes da estampa. */
export function JerseyFront({ className }: { className?: string }) {
  const { defs, fabric, shade } = useFabric()
  return (
    <svg viewBox="0 0 300 320" aria-hidden className={cn('h-auto w-full', className)}>
      {defs}
      <path d={SILHOUETTE} fill={fabric} />
      <path d={SILHOUETTE} fill={shade} />
      <path d="M110 18 L150 62 L190 18" fill="none" stroke={INK} strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M298 118 L258 138" stroke={INK} strokeWidth="9" />
      <path d="M2 118 L42 138" stroke={INK} strokeWidth="9" />
      <path d="M54 112 L54 300 M246 112 L246 300" stroke="#e8a500" strokeWidth="2" opacity="0.6" />
      {/* Escudo da loja no peito. */}
      <path d="M186 96 h34 v22 q0 18 -17 26 q-17 -8 -17 -26 Z" fill={INK} />
      <text x="203" y="122" textAnchor="middle" fill="#ffc21a" fontFamily="Anton, Impact, sans-serif" fontSize="15">
        SF
      </text>
    </svg>
  )
}
