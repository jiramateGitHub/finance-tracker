import type { PropsWithChildren } from 'react'

type BadgeTone = 'neutral' | 'income' | 'expense' | 'warning' | 'active'

type BadgeProps = PropsWithChildren<{
  tone?: BadgeTone
  className?: string
}>

const toneClassName: Record<BadgeTone, string> = {
  neutral: 'border-slate-200/80 bg-slate-100/80 text-slate-600',
  income: 'border-emerald-200/60 bg-emerald-50/90 text-emerald-700',
  expense: 'border-rose-200/60 bg-rose-50/90 text-rose-700',
  warning: 'border-amber-200/60 bg-amber-50/90 text-amber-700',
  active: 'border-blue-200/60 bg-blue-50/90 text-blue-700',
}

export function Badge({ tone = 'neutral', className = '', children }: BadgeProps) {
  return (
    <span className={`inline-flex min-h-6.5 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${toneClassName[tone]} ${className}`}>
      {children}
    </span>
  )
}
