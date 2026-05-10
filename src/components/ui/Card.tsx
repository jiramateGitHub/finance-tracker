import type { PropsWithChildren, ReactNode } from 'react'

type CardProps = PropsWithChildren<{
  title?: string
  description?: string
  actions?: ReactNode
  className?: string
  compact?: boolean
}>

export function Card({ title, description, actions, className = '', compact = false, children }: CardProps) {
  return (
    <section className={`rounded-[18px] border border-finance-line bg-white shadow-finance-sm ${compact ? 'p-3' : 'p-4'} ${className}`}>
      {(title || description || actions) && (
        <header className={`${compact ? 'mb-3' : 'mb-4'} flex min-w-0 flex-wrap items-start justify-between gap-3`}>
          <div className="min-w-0">
            {title && <h2 className="break-words text-lg font-extrabold leading-tight text-finance-text">{title}</h2>}
            {description && <p className="mt-1 text-sm leading-6 text-finance-muted">{description}</p>}
          </div>
          {actions && <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
