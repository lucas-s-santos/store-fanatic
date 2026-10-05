import type { HTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

import { optimizedImageUrl } from '@/lib/assets'
import { cn } from '@/lib/utils'

/**
 * Linha de liga (logo, nome, quantidade): a mesma no mega menu, na vitrine da
 * home e na barra lateral do catálogo. Vira <Link> com `to`, senão <button>.
 */
export function LeagueRow({
  to,
  active,
  logoUrl,
  icon,
  name,
  count,
  className,
  ...rest
}: {
  to?: string
  active: boolean
  logoUrl?: string | null
  /** Ícone no lugar da logo (ex.: "Todas as camisas"). */
  icon?: ReactNode
  name: string
  count?: number
  className?: string
} & Omit<HTMLAttributes<HTMLElement>, 'className'>) {
  const classes = cn(
    'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors duration-150',
    active ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-white/[0.04] hover:text-foreground',
    className,
  )

  const content = (
    <>
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl p-1.5', icon ? 'bg-primary/15 text-primary' : 'bg-paper')}>
        {icon ?? (logoUrl && <img src={optimizedImageUrl(logoUrl, 80)} alt="" className="size-full object-contain" />)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{name}</span>
        {count ? <span className="block text-xs text-muted-foreground">{count} camisas</span> : null}
      </span>
      <ChevronRight className={cn('size-4 shrink-0 transition-opacity duration-150', active ? 'opacity-100' : 'opacity-0')} aria-hidden />
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" className={classes} {...rest}>
      {content}
    </button>
  )
}
