import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

/** Cabeçalho de seção da vitrine: rótulo, título em Anton e ação à direita. */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string
  title: ReactNode
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="max-w-2xl space-y-3">
        {eyebrow && (
          <p className="eyebrow">
            <span className="h-0.5 w-6 rounded-full bg-primary" aria-hidden />
            {eyebrow}
          </p>
        )}
        <h2 className="display-title text-[2.5rem] sm:text-5xl lg:text-6xl">{title}</h2>
        {description && <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}
