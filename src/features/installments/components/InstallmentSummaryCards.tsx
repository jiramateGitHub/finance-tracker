import { SummaryCard } from '../../../components/ui/SummaryCard'
import { formatMoney } from '../../../utils/formatters'
import type { InstallmentSummary } from '../utils/installmentPlans'

type InstallmentSummaryCardsProps = {
  summary: InstallmentSummary
}

export function InstallmentSummaryCards({ summary }: InstallmentSummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard label="จำนวนแผน" value={summary.planCount} icon="#" tone="violet" />
      <SummaryCard label="จ่ายแล้วทั้งหมด" value={formatMoney(summary.totalPaid)} icon="+" tone="income" />
      <SummaryCard label="คงเหลือ" value={formatMoney(summary.totalRemaining)} icon="-" tone="expense" />
      <SummaryCard label="ยอดต่อเดือน" value={formatMoney(summary.totalMonthly)} icon="=" tone="balance" />
    </div>
  )
}
