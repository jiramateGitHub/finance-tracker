import type { PropsWithChildren, ReactNode } from 'react'

type CardProps = PropsWithChildren<{
  title?: ReactNode
  actions?: ReactNode
  className?: string
  compact?: boolean
}>

export function Card({ title, actions, className = '', compact = false, children }: CardProps) {
  return (
    <section className={`min-w-0 rounded-2xl sm:rounded-3xl border border-slate-200/75 bg-white shadow-xs transition-shadow duration-200 ${compact ? 'p-3.5' : 'p-4 sm:p-5 md:p-6'} ${className}`}>
      {(title || actions) && (
        <header className={`${compact ? 'mb-3' : 'mb-4'} flex min-w-0 flex-wrap items-center justify-between gap-3`}>
          <div className="min-w-0">
            {title && <h2 className="break-words text-base sm:text-lg font-bold tracking-tight text-slate-900">{title}</h2>}
          </div>
          {actions && <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}
