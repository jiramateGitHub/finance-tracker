import type { ReactNode } from 'react'

type SummaryTone = 'income' | 'expense' | 'balance' | 'due' | 'violet'

type SummaryCardProps = {
  label: string
  value: ReactNode
  icon: string
  tone: SummaryTone
  compact?: boolean
}

const toneClassName: Record<SummaryTone, string> = {
  income: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  expense: 'border-rose-200 bg-rose-50 text-rose-700',
  balance: 'border-blue-200 bg-blue-50 text-blue-700',
  due: 'border-amber-200 bg-amber-50 text-amber-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
}

export function SummaryCard({ label, value, icon, tone, compact = false }: SummaryCardProps) {
  return (
    <div className={`relative min-w-0 rounded-2xl border ${compact ? 'min-h-24 p-3' : 'min-h-28 p-4'} ${toneClassName[tone]}`}>
      <div className={`absolute right-3 top-3 grid place-items-center rounded-xl bg-white/65 ${compact ? 'size-8 text-base' : 'size-10 text-xl'}`}>{icon}</div>
      <div className="min-w-0 break-words pr-10 text-xs font-extrabold uppercase leading-5 tracking-wide opacity-85">{label}</div>
      <div className={`mt-2 min-w-0 break-words pr-10 font-extrabold leading-tight ${compact ? 'text-xl' : 'text-2xl'}`}>{value}</div>
    </div>
  )
}
