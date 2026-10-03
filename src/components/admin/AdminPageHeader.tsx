import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

/** Cabeçalho padrão das telas do admin: título em Anton, resumo e ações à direita. */
export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between"
    >
      <div>
        <h1 className="display-title text-4xl sm:text-5xl">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{actions}</div>}
    </motion.header>
  )
}
