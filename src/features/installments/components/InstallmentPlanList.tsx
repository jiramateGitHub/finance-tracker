import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { th } from '../../../i18n/th'
import type { InstallmentPlan } from '../../../types/finance'
import { formatMoney, formatMonth } from '../../../utils/formatters'
import { calculateInstallmentProgress, getPaidMonthKeys, getInstallmentScheduleMonths } from '../utils/installmentPlans'

type InstallmentPlanListProps = {
  plans: InstallmentPlan[]
  onEdit: (plan: InstallmentPlan) => void
  onDelete: (planId: string) => void
  onToggleMonth: (plan: InstallmentPlan, monthKey: string, isPaid: boolean) => void
}

export function InstallmentPlanList({ plans, onEdit, onDelete, onToggleMonth }: InstallmentPlanListProps) {
  if (!plans.length) {
    return (
      <EmptyState
        title="ยังไม่พบแผนผ่อน"
        description="เพิ่มแผนเพื่อดูรอบรายเดือน ยอดจ่ายแล้ว และยอดคงเหลือ"
      />
    )
  }

  return (
    <div className="grid gap-3">
      {plans.map((plan) => {
        const progress = calculateInstallmentProgress(plan)
        const paidMonthKeys = new Set(getPaidMonthKeys(plan))
        const visibleMonths = getInstallmentScheduleMonths(plan).slice(0, 18)
        return (
          <article key={plan.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-extrabold">{plan.name}</h3>
                  <Badge tone={progress.monthsRemaining > 0 ? 'active' : 'income'}>
                    {progress.monthsRemaining > 0 ? 'กำลังผ่อน' : 'จ่ายครบแล้ว'}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  เริ่ม {formatMonth(plan.startMonth)} · {plan.category} · จ่ายแล้ว {progress.monthsPaid}/{progress.scheduleMonths.length} รอบ
                </p>
              </div>
              <div className="text-right">
                <div className="text-lg font-extrabold text-blue-700">{formatMoney(plan.monthlyAmount)}</div>
                <div className="text-xs font-bold text-slate-500">ต่อเดือน</div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between gap-3 text-xs font-bold text-slate-500">
                <span>สำเร็จ {progress.progressPercent}%</span>
                <span>คงเหลือ {formatMoney(progress.remainingAmount)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${progress.progressPercent}%` }} />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-bold text-slate-500">ยอดรวม</div>
                <div className="font-extrabold">{formatMoney(progress.totalAmount)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-bold text-slate-500">จ่ายแล้ว</div>
                <div className="font-extrabold text-emerald-700">{formatMoney(progress.totalPaid)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-bold text-slate-500">เดือนคงเหลือ</div>
                <div className="font-extrabold">{progress.monthsRemaining}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-bold text-slate-500">หมายเหตุ</div>
                <div className="truncate font-extrabold">{plan.note || '-'}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-bold text-slate-500">วันครบกำหนด</div>
                <div className="font-extrabold">{plan.dueDay ?? plan.paymentDay ?? '-'}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-bold text-slate-500">เงินต้น</div>
                <div className="font-extrabold">{plan.principal ? formatMoney(plan.principal) : '-'}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-bold text-slate-500">ดอกเบี้ย</div>
                <div className="truncate font-extrabold">
                  {plan.interestType === 'none' ? 'ไม่มี' : `${plan.interestRate ?? 0}% ${plan.interestType}`}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-bold text-slate-500">หมายเหตุดอกเบี้ย</div>
                <div className="truncate font-extrabold">{plan.interestNote || '-'}</div>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-extrabold text-slate-600">รอบชำระ</div>
              <div className="flex flex-wrap gap-2">
                {visibleMonths.map((monthKey) => {
                  const isPaid = paidMonthKeys.has(monthKey)
                  return (
                    <button
                      key={monthKey}
                      className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
                        isPaid
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                      type="button"
                      onClick={() => onToggleMonth(plan, monthKey, !isPaid)}
                    >
                      {monthKey} {isPaid ? th.transaction.paid : th.transaction.unpaid}
                    </button>
                  )
                })}
                {progress.scheduleMonths.length > visibleMonths.length && (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">
                    +{progress.scheduleMonths.length - visibleMonths.length} รอบ
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
              <Button onClick={() => onEdit(plan)}>{th.common.edit}</Button>
              <Button variant="danger" onClick={() => onDelete(plan.id)}>{th.common.delete}</Button>
            </div>
          </article>
        )
      })}
    </div>
  )
}
