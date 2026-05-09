import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { th } from '../../../i18n/th'
import type { Budget, Goal, TransactionEntry } from '../../../types/finance'
import { formatMoney } from '../../../utils/formatters'
import { calculateBudgetProgress, calculateGoalProgress, getMonthlyBudgets } from '../../budgetGoals/budgetGoalCalculations'
import type { SyncStatus } from '../../sync/syncTypes'

type ActionNeededPanelProps = {
  month: string
  transactions: TransactionEntry[]
  budgets: Budget[]
  goals: Goal[]
  syncStatus?: SyncStatus
}

export function ActionNeededPanel({ month, transactions, budgets, goals, syncStatus }: ActionNeededPanelProps) {
  const unpaid = transactions
    .filter((transaction) => transaction.type === 'expense' && transaction.status === 'pending')
    .slice(0, 5)
  const budgetAlerts = getMonthlyBudgets(budgets, month)
    .map((budget) => ({ budget, progress: calculateBudgetProgress(budget, transactions) }))
    .filter((item) => item.progress.status !== 'safe')
    .slice(0, 4)
  const goalAlerts = goals
    .map((goal) => ({ goal, progress: calculateGoalProgress(goal) }))
    .filter((item) => item.goal.status === 'active' && !item.progress.isCompleted && item.progress.percent >= 80)
    .slice(0, 3)
  const syncNeedsAction = syncStatus?.state === 'conflict' || syncStatus?.state === 'error'
  const hasItems = unpaid.length || budgetAlerts.length || goalAlerts.length || syncNeedsAction

  return (
    <Card title={th.monthly.actionNeeded}>
      {hasItems ? (
        <div className="grid gap-2">
          {syncNeedsAction ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
              {syncStatus.message}
            </div>
          ) : null}
          {unpaid.map((transaction) => (
            <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">{transaction.title}</p>
                <p className="text-xs font-semibold text-slate-500">{transaction.category}</p>
              </div>
              <Badge tone="warning">{th.transaction.unpaid} {formatMoney(transaction.amount)}</Badge>
            </div>
          ))}
          {budgetAlerts.map(({ budget, progress }) => (
            <div key={budget.id} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
              {budget.category}: {progress.status === 'over-budget' ? th.budget.over : th.budget.near} ({progress.percent}%)
            </div>
          ))}
          {goalAlerts.map(({ goal, progress }) => (
            <div key={goal.id} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
              {goal.name}: ใกล้ถึงเป้าหมาย {progress.percent}%
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500">
          ไม่มีรายการที่ต้องดูแลเป็นพิเศษในเดือนนี้
        </div>
      )}
    </Card>
  )
}
