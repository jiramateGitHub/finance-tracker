import { SummaryCard } from '../../../components/ui/SummaryCard'
import { clampPercent, formatMoney } from '../../../utils/formatters'
import type { summarizeTrips } from '../utils/tripUtils'

type TripSummary = ReturnType<typeof summarizeTrips>

type TripSummaryCardsProps = {
  summary: TripSummary
}

export function TripSummaryCards({ summary }: TripSummaryCardsProps) {
  const usage = clampPercent(summary.usagePercent)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      {/* 1. จำนวนทริป */}
      <SummaryCard
        label="จำนวนทริป"
        value={`${summary.tripCount} ทริป`}
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
        }
        tone="violet"
        subValue={<span className="text-violet-700 font-semibold">ทริปทั้งหมดในระบบ</span>}
      />

      {/* 2. งบที่วางไว้ */}
      <SummaryCard
        label="งบที่วางไว้"
        value={formatMoney(summary.plannedBudget)}
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
            <line x1="16" x2="16" y1="2" y2="6" />
            <line x1="8" x2="8" y1="2" y2="6" />
            <line x1="3" x2="21" y1="10" y2="10" />
          </svg>
        }
        tone="balance"
        subValue={<span className="text-blue-700 font-semibold">แผนงบรวม</span>}
      />

      {/* 3. ใช้จริง */}
      <SummaryCard
        label="ใช้จ่ายจริง"
        value={formatMoney(summary.actualSpending)}
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
          </svg>
        }
        tone="expense"
        subValue={<span>ใช้ไปแล้ว {usage}% ของงบ</span>}
        progress={usage}
      />

      {/* 4. จ่ายแล้ว */}
      <SummaryCard
        label="จ่ายแล้ว"
        value={formatMoney(summary.paidTotal)}
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        }
        tone="income"
        subValue={<span className="text-emerald-700 font-semibold">ชำระเรียบร้อย</span>}
      />

      {/* 5. ยังไม่จ่าย / ค้างชำระ */}
      <SummaryCard
        label="ยังไม่จ่าย"
        value={formatMoney(summary.unpaidTotal)}
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
        }
        tone={summary.unpaidTotal > 0 ? 'due' : 'income'}
        subValue={
          <span className={summary.unpaidTotal > 0 ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
            {summary.unpaidTotal > 0 ? 'มียอดรอชำระ' : 'ไม่มีค้างชำระ 🎉'}
          </span>
        }
      />
    </div>
  )
}
