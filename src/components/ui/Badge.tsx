import type { PropsWithChildren } from 'react'

type BadgeTone = 'neutral' | 'income' | 'expense' | 'warning' | 'active'

type BadgeProps = PropsWithChildren<{
  tone?: BadgeTone
  className?: string
}>

const toneClassName: Record<BadgeTone, string> = {
  neutral: 'border-slate-200 bg-slate-50 text-slate-600',
  income: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  expense: 'border-rose-200 bg-rose-50 text-rose-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  active: 'border-blue-200 bg-blue-50 text-blue-700',
}

export function Badge({ tone = 'neutral', className = '', children }: BadgeProps) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${toneClassName[tone]} ${className}`}>
      {children}
    </span>
  )
}
