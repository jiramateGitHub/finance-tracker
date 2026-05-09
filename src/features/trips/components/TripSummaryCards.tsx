import { SummaryCard } from '../../../components/ui/SummaryCard'
import { formatMoney } from '../../../utils/formatters'
import type { summarizeTrips } from '../utils/tripUtils'

type TripSummary = ReturnType<typeof summarizeTrips>

type TripSummaryCardsProps = {
  summary: TripSummary
}

export function TripSummaryCards({ summary }: TripSummaryCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <SummaryCard label="ทริป" value={summary.tripCount} icon="#" tone="violet" />
      <SummaryCard label="วางแผน" value={formatMoney(summary.plannedBudget)} icon="P" tone="balance" />
      <SummaryCard label="ใช้จริง" value={formatMoney(summary.actualSpending)} icon="A" tone="expense" />
      <SummaryCard label="จ่ายแล้ว" value={formatMoney(summary.paidTotal)} icon="+" tone="income" />
      <SummaryCard label="ยังไม่จ่าย" value={formatMoney(summary.unpaidTotal)} icon="!" tone="due" />
    </div>
  )
}
