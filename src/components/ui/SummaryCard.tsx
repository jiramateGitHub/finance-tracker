import type { ReactNode } from 'react'

type SummaryTone = 'income' | 'expense' | 'balance' | 'due' | 'violet'

type SummaryCardProps = {
  label: string
  value: ReactNode
  icon: string
  tone: SummaryTone
  compact?: boolean
}

const toneClassName: Record<SummaryTone, { card: string; iconBg: string; text: string; iconColor: string }> = {
  income: {
    card: 'border-emerald-100/90 bg-emerald-50/40 hover:bg-emerald-50/60',
    iconBg: 'bg-emerald-100/80',
    text: 'text-emerald-700',
    iconColor: 'text-emerald-700',
  },
  expense: {
    card: 'border-rose-100/90 bg-rose-50/40 hover:bg-rose-50/60',
    iconBg: 'bg-rose-100/80',
    text: 'text-rose-700',
    iconColor: 'text-rose-700',
  },
  balance: {
    card: 'border-blue-100/90 bg-blue-50/40 hover:bg-blue-50/60',
    iconBg: 'bg-blue-100/80',
    text: 'text-blue-700',
    iconColor: 'text-blue-700',
  },
  due: {
    card: 'border-amber-100/90 bg-amber-50/40 hover:bg-amber-50/60',
    iconBg: 'bg-amber-100/80',
    text: 'text-amber-700',
    iconColor: 'text-amber-700',
  },
  violet: {
    card: 'border-violet-100/90 bg-violet-50/40 hover:bg-violet-50/60',
    iconBg: 'bg-violet-100/80',
    text: 'text-violet-700',
    iconColor: 'text-violet-700',
  },
}

export function SummaryCard({ label, value, icon, tone, compact = false }: SummaryCardProps) {
  const theme = toneClassName[tone]
  return (
    <div className={`relative min-w-0 rounded-2xl border bg-white shadow-xs transition duration-150 ${compact ? 'p-3' : 'p-4 sm:p-5'} ${theme.card}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        <div className={`grid place-items-center rounded-xl font-bold shadow-xs ${compact ? 'size-7 text-xs' : 'size-8.5 text-sm'} ${theme.iconBg} ${theme.iconColor}`}>
          {icon}
        </div>
      </div>
      <div className={`mt-2 min-w-0 break-words font-bold tracking-tight ${compact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'} ${theme.text}`}>
        {value}
      </div>
    </div>
  )
}
