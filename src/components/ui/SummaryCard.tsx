import type { ReactNode } from 'react'

export type SummaryTone = 'income' | 'expense' | 'balance' | 'due' | 'violet' | 'sky' | 'indigo' | 'slate'

export type SummaryCardProps = {
  label: string
  value: ReactNode
  icon: ReactNode
  tone: SummaryTone
  compact?: boolean
  subValue?: ReactNode
  progress?: number
  className?: string
}

const toneClassName: Record<
  SummaryTone,
  {
    iconBg: string
    iconColor: string
    bar: string
  }
> = {
  income: {
    iconBg: 'bg-emerald-50 text-emerald-600',
    iconColor: 'text-emerald-600',
    bar: 'bg-emerald-500',
  },
  expense: {
    iconBg: 'bg-rose-50 text-rose-600',
    iconColor: 'text-rose-600',
    bar: 'bg-rose-500',
  },
  balance: {
    iconBg: 'bg-blue-50 text-blue-600',
    iconColor: 'text-blue-600',
    bar: 'bg-blue-600',
  },
  due: {
    iconBg: 'bg-amber-50 text-amber-600',
    iconColor: 'text-amber-600',
    bar: 'bg-amber-500',
  },
  violet: {
    iconBg: 'bg-violet-50 text-violet-600',
    iconColor: 'text-violet-600',
    bar: 'bg-violet-500',
  },
  sky: {
    iconBg: 'bg-sky-50 text-sky-600',
    iconColor: 'text-sky-600',
    bar: 'bg-sky-500',
  },
  indigo: {
    iconBg: 'bg-indigo-50 text-indigo-600',
    iconColor: 'text-indigo-600',
    bar: 'bg-indigo-500',
  },
  slate: {
    iconBg: 'bg-slate-100 text-slate-600',
    iconColor: 'text-slate-600',
    bar: 'bg-slate-500',
  },
}

export function SummaryCard({
  label,
  value,
  icon,
  tone,
  compact = false,
  subValue,
  progress,
  className = '',
}: SummaryCardProps) {
  const theme = toneClassName[tone] ?? toneClassName.balance

  return (
    <div
      className={`min-w-0 rounded-2xl border border-slate-200/80 bg-white shadow-xs transition hover:shadow-md ${
        compact ? 'p-3 sm:p-3.5' : 'p-4 sm:p-5'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <div
          className={`shrink-0 rounded-xl flex items-center justify-center font-bold shadow-xs ${
            compact ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm'
          } ${theme.iconBg}`}
        >
          {icon}
        </div>
      </div>

      <div
        className={`mt-2 min-w-0 break-words font-extrabold tracking-tight text-slate-900 ${
          compact ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'
        }`}
      >
        {value}
      </div>

      {subValue && (
        <div className="mt-2 text-xs font-medium text-slate-500">
          {subValue}
        </div>
      )}

      {typeof progress === 'number' && (
        <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 sm:h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${theme.bar}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  )
}
