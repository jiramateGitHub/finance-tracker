import type { PropsWithChildren, ReactNode } from 'react'

type CardProps = PropsWithChildren<{
  title?: string
  description?: string
  actions?: ReactNode
  className?: string
}>

export function Card({ title, description, actions, className = '', children }: CardProps) {
  return (
    <section className={`rounded-[18px] border border-finance-line bg-white p-4 shadow-finance-sm ${className}`}>
      {(title || description || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-lg font-extrabold text-finance-text">{title}</h2>}
            {description && <p className="mt-1 text-sm leading-6 text-finance-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
