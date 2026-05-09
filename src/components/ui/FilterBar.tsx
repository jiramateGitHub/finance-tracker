import type { ReactNode } from 'react'

type FilterBarProps = {
  children: ReactNode
  actions?: ReactNode
  resultText?: ReactNode
  className?: string
}

export function FilterBar({ children, actions, resultText, className = '' }: FilterBarProps) {
  return (
    <div className={`grid gap-3 ${className}`}>
      <div className="finance-filter-grid">{children}</div>
      {(resultText || actions) && (
        <div className="finance-filter-actions">
          <div className="min-w-0 text-sm font-bold text-slate-500">{resultText}</div>
          {actions && <div className="flex min-w-0 flex-wrap gap-2">{actions}</div>}
        </div>
      )}
    </div>
  )
}
