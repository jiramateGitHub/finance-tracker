import { SummaryCard } from '../../../components/ui/SummaryCard'
import { th } from '../../../i18n/th'
import { formatMoney } from '../../../utils/formatters'
import type { MonthlyTotals } from '../utils/monthlyLedger'

type MonthlySummaryCardsProps = {
  totals: MonthlyTotals
}

export function MonthlySummaryCards({ totals }: MonthlySummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard label={th.transaction.income} value={formatMoney(totals.income)} icon="+" tone="income" />
      <SummaryCard label={th.transaction.expense} value={formatMoney(totals.expense)} icon="-" tone="expense" />
      <SummaryCard label={th.transaction.balance} value={formatMoney(totals.balance)} icon="=" tone="balance" />
      <SummaryCard label={th.transaction.unpaid} value={formatMoney(totals.pendingExpense)} icon="!" tone="due" />
    </div>
  )
}
