import { SummaryCard } from '../../../components/ui/SummaryCard'
import { formatMoney } from '../../../utils/formatters'
import type { summarizeTrips } from '../utils/tripUtils'

type TripSummary = ReturnType<typeof summarizeTrips>

type TripSummaryCardsProps = {
  summary: TripSummary
}

export function TripSummaryCards({ summary }: TripSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
      <SummaryCard compact label="จำนวนทริป" value={summary.tripCount} icon="#" tone="violet" />
      <SummaryCard compact label="งบที่วางไว้" value={formatMoney(summary.plannedBudget)} icon="P" tone="balance" />
      <SummaryCard compact label="ใช้จริง" value={formatMoney(summary.actualSpending)} icon="A" tone="expense" />
      <SummaryCard compact label="จ่ายแล้ว" value={formatMoney(summary.paidTotal)} icon="+" tone="income" />
      <SummaryCard compact label="ยังไม่จ่าย" value={formatMoney(summary.unpaidTotal)} icon="!" tone="due" />
    </div>
  )
}
