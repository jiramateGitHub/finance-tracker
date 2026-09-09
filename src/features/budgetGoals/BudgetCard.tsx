import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { th } from '../../i18n/th'
import type { Budget, TransactionEntry } from '../../types/finance'
import { formatMoney } from '../../utils/formatters'
import { calculateBudgetProgress, getBudgetCategoryKey, type BudgetStatus } from './budgetGoalCalculations'

type BudgetCardProps = {
  budget: Budget
  transactions: TransactionEntry[]
  onEdit: (budget: Budget) => void
  onDelete: (budgetId: string) => void
}

const statusLabel: Record<BudgetStatus, string> = {
  safe: 'ยังปลอดภัย',
  'near-limit': 'ใกล้เต็มงบ',
  'over-budget': 'เกินงบ',
}

const statusTone: Record<BudgetStatus, 'income' | 'warning' | 'expense'> = {
  safe: 'income',
  'near-limit': 'warning',
  'over-budget': 'expense',
}

const progressClassName: Record<BudgetStatus, string> = {
  safe: 'bg-emerald-500',
  'near-limit': 'bg-amber-500',
  'over-budget': 'bg-rose-500',
}

export function BudgetCard({ budget, transactions, onEdit, onDelete }: BudgetCardProps) {
  const progress = calculateBudgetProgress(budget, transactions)
  const category = getBudgetCategoryKey(budget)

  return (
    <article className="grid gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs hover:border-slate-300 hover:shadow-md transition-all">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-extrabold text-slate-900">{category}</h3>
            <Badge tone={statusTone[progress.status]}>{statusLabel[progress.status]}</Badge>
            {budget.enabled === false && <Badge tone="neutral">ปิดใช้งาน</Badge>}
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500">{budget.note || 'งบประมาณรายเดือนตามหมวดหมู่'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => onEdit(budget)}>{th.common.edit}</Button>
          <Button type="button" size="sm" variant="danger" onClick={() => onDelete(budget.id)}>{th.common.delete}</Button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2 sm:p-3">
          <div className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">งบประมาณ</div>
          <div className="mt-1 text-xs sm:text-sm md:text-base font-extrabold text-slate-900 break-words tabular-nums">{formatMoney(progress.amount)}</div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2 sm:p-3">
          <div className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">ใช้ไป</div>
          <div className="mt-1 text-xs sm:text-sm md:text-base font-extrabold text-rose-700 break-words tabular-nums">{formatMoney(progress.used)}</div>
        </div>
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2 sm:p-3">
          <div className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">คงเหลือ</div>
          <div className={`mt-1 text-xs sm:text-sm md:text-base font-extrabold break-words tabular-nums ${progress.remaining < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
            {formatMoney(progress.remaining)}
          </div>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
          <span>ใช้ไป {progress.percent}%</span>
          <span>{budget.month}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${progressClassName[progress.status]}`} style={{ width: `${progress.percent}%` }} />
        </div>
      </div>
    </article>
  )
}
