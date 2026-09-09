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
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {months.map((monthKey) => {
        const monthPlans = monthMap.get(monthKey) ?? []
        const monthTotal = monthPlans.reduce((total, plan) => total + Number(plan.monthlyAmount || 0), 0)
        return (
          <section key={monthKey} className="grid content-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-extrabold">{formatMonth(monthKey)}</h3>
                <p className="text-sm text-slate-500">{monthPlans.length} รอบ</p>
              </div>
              <div className="font-extrabold text-blue-700 tabular-nums shrink-0">{formatMoney(monthTotal)}</div>
            </div>

            <div className="grid content-start gap-2">
              {monthPlans.map((plan) => {
                const isPaid = getPaidMonthKeys(plan).includes(monthKey)
                const progress = calculateInstallmentProgress(plan)
                return (
                  <div key={`${plan.id}-${monthKey}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-extrabold text-slate-700">{plan.name}</div>
                        <div className="text-xs text-slate-500">จ่ายแล้ว {progress.monthsPaid}/{progress.scheduleMonths.length}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-extrabold text-rose-700 tabular-nums">{formatMoney(plan.monthlyAmount)}</div>
                        <div className={`text-xs font-bold ${isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {isPaid ? th.transaction.paid : th.transaction.unpaid}
                        </div>
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
