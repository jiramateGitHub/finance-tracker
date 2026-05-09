import type { ReactNode } from 'react'

type SummaryTone = 'income' | 'expense' | 'balance' | 'due' | 'violet'

type SummaryCardProps = {
  label: string
  value: ReactNode
  icon: string
  tone: SummaryTone
}

const toneClassName: Record<SummaryTone, string> = {
  income: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  expense: 'border-rose-200 bg-rose-50 text-rose-700',
  balance: 'border-blue-200 bg-blue-50 text-blue-700',
  due: 'border-amber-200 bg-amber-50 text-amber-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
}

export function SummaryCard({ label, value, icon, tone }: SummaryCardProps) {
  return (
    <div className={`relative min-h-28 rounded-2xl border p-4 ${toneClassName[tone]}`}>
      <div className="absolute right-3 top-3 grid size-10 place-items-center rounded-xl bg-white/65 text-xl">{icon}</div>
      <div className="pr-12 text-xs font-extrabold uppercase tracking-wide opacity-85">{label}</div>
      <div className="mt-2 pr-12 text-2xl font-extrabold leading-tight">{value}</div>
    </div>
  )
}
