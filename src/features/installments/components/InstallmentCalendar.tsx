import { Badge } from '../../../components/ui/Badge'
import { EmptyState } from '../../../components/ui/EmptyState'
import { th } from '../../../i18n/th'
import type { InstallmentPlan } from '../../../types/finance'
import { formatMoney, formatMonth } from '../../../utils/formatters'
import {
  calculateInstallmentProgress,
  getInstallmentCalendarMonths,
  getInstallmentScheduleMonths,
  getPaidMonthKeys,
  type InstallmentFilters,
} from '../utils/installmentPlans'

type InstallmentCalendarProps = {
  plans: InstallmentPlan[]
  filters: InstallmentFilters
}

export function InstallmentCalendar({ plans, filters }: InstallmentCalendarProps) {
  const monthMap = new Map<string, InstallmentPlan[]>()
  for (const plan of plans) {
    for (const monthKey of getInstallmentScheduleMonths(plan)) {
      monthMap.set(monthKey, [...(monthMap.get(monthKey) ?? []), plan])
    }
  }

  const months = getInstallmentCalendarMonths(plans, filters)

  if (!months.length) {
    return <EmptyState title="ยังไม่มีรอบในปฏิทิน" description="แผนที่มีเดือนเริ่มและจำนวนเดือนจะแสดงที่นี่" />
  }

  return (
    <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
      {months.map((monthKey) => {
        const monthPlans = monthMap.get(monthKey) ?? []
        const monthTotal = monthPlans.reduce((total, plan) => total + Number(plan.monthlyAmount || 0), 0)
        return (
          <section key={monthKey} className="grid content-start gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs transition hover:shadow-md">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="font-extrabold text-slate-900">{formatMonth(monthKey)}</h3>
                <p className="text-xs font-semibold text-slate-500">{monthPlans.length} รอบในเดือนนี้</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">ยอดรวมงวด</span>
                <span className="font-extrabold text-blue-700 tabular-nums text-sm sm:text-base">{formatMoney(monthTotal)}</span>
              </div>
            </div>

            <div className="grid content-start gap-2">
              {monthPlans.map((plan) => {
                const isPaid = getPaidMonthKeys(plan).includes(monthKey)
                const progress = calculateInstallmentProgress(plan)
                return (
                  <div key={`${plan.id}-${monthKey}`} className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 transition hover:bg-slate-100/70">
                    <div className="flex justify-between gap-3 items-center">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-bold text-slate-800" title={plan.name}>{plan.name}</div>
                        <div className="text-[11px] font-medium text-slate-500 mt-0.5">จ่ายแล้ว {progress.monthsPaid}/{progress.scheduleMonths.length} งวด</div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <div className="text-xs font-extrabold text-rose-700 tabular-nums">{formatMoney(plan.monthlyAmount)}</div>
                        <Badge tone={isPaid ? 'income' : 'warning'}>
                          {isPaid ? th.transaction.paid : th.transaction.unpaid}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
