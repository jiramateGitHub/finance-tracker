import { useState } from 'react'
import type { InstallmentPlan } from '../../../types/finance'
import { formatMoney } from '../../../utils/formatters'
import type { InstallmentDashboardMetrics } from '../utils/installmentPlans'

type InstallmentAlertBannerProps = {
  urgentPlans: InstallmentDashboardMetrics['urgentPlans']
  selectedMonth: string
  onPay: (plan: InstallmentPlan, monthKey: string, isPaid: boolean) => void
}

export function InstallmentAlertBanner({
  urgentPlans,
  selectedMonth,
  onPay,
}: InstallmentAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || !urgentPlans.length) return null

  const overdueItems = urgentPlans.filter((p) => p.type === 'overdue')
  const dueSoonItems = urgentPlans.filter((p) => p.type === 'dueSoon')
  const isOverdue = overdueItems.length > 0

  const containerClass = isOverdue
    ? 'border-rose-200 bg-rose-50/95 text-rose-900'
    : 'border-amber-200 bg-amber-50/95 text-amber-900'

  const title =
    overdueItems.length > 0 && dueSoonItems.length > 0
      ? `⚠️ มีรายการผ่อนค้างชำระเลยกำหนด ${overdueItems.length} รายการ และใกล้ครบกำหนด ${dueSoonItems.length} รายการในเดือนนี้`
      : overdueItems.length > 0
      ? `⚠️ มีรายการผ่อนค้างชำระเลยกำหนด ${overdueItems.length} รายการในเดือนนี้!`
      : `⏰ มีรายการผ่อนใกล้ครบกำหนด (1-3 วัน) ${dueSoonItems.length} รายการ`

  return (
    <div className={`rounded-2xl border p-3.5 sm:p-4 shadow-xs transition-all min-w-0 w-full max-w-full ${containerClass}`}>
      <div className="flex items-start justify-between gap-2 min-w-0">
        <h4 className="font-bold text-xs sm:text-sm tracking-tight leading-snug min-w-0 flex-1">{title}</h4>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-slate-600 text-xs min-h-9 min-w-9 flex items-center justify-center rounded-lg hover:bg-black/5 transition cursor-pointer shrink-0"
          title="ซ่อนการแจ้งเตือน"
        >
          ✕
        </button>
      </div>

      <div className="mt-2.5 space-y-2 min-w-0">
        {urgentPlans.map(({ plan, type, actualDueDay, monthlyAmount }) => {
          const statusLabel =
            type === 'overdue'
              ? `เลยกำหนดวันที่ ${actualDueDay}`
              : `ครบกำหนดวันที่ ${actualDueDay}`

          return (
            <div
              key={plan.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-white/85 p-2.5 sm:px-3 sm:py-2 border border-black/5 text-xs shadow-xs min-w-0 w-full max-w-full"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="font-bold text-slate-900 truncate max-w-full sm:max-w-xs" title={plan.name}>{plan.name}</span>
                  <span className="text-slate-600 font-semibold tabular-nums shrink-0">({formatMoney(monthlyAmount)})</span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${type === 'overdue' ? 'bg-rose-100/90 text-rose-800' : 'bg-amber-100/90 text-amber-800'}`}>
                    {statusLabel}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onPay(plan, selectedMonth, true)}
                className="w-full sm:w-auto shrink-0 min-h-10 sm:min-h-8 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition cursor-pointer inline-flex items-center justify-center gap-1"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>บันทึกจ่าย</span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
