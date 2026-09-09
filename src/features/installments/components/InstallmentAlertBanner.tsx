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
    <div className={`rounded-2xl border p-4 shadow-xs transition-all ${containerClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-sm tracking-tight">{title}</h4>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-slate-400 hover:text-slate-600 text-xs px-1.5 py-0.5 rounded-md hover:bg-black/5 transition"
              title="ซ่อนการแจ้งเตือน"
            >
              ✕
            </button>
          </div>

          <div className="mt-2.5 space-y-2">
            {urgentPlans.map(({ plan, type, actualDueDay, monthlyAmount }) => {
              const statusLabel =
                type === 'overdue'
                  ? `เลยกำหนดวันที่ ${actualDueDay}`
                  : `ครบกำหนดวันที่ ${actualDueDay}`

              return (
                <div
                  key={plan.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/75 px-3 py-2 border border-black/5 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-900 truncate block sm:inline">{plan.name}</span>
                    <span className="text-slate-500 sm:ml-2 font-medium">({formatMoney(monthlyAmount)})</span>
                    <span className="inline-block ml-2 text-[11px] font-semibold text-slate-600 bg-black/5 px-2 py-0.5 rounded-full">
                      {statusLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPay(plan, selectedMonth, true)}
                    className="shrink-0 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition"
                  >
                    บันทึกจ่าย
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
