import { useEffect, useState } from 'react'
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
  const [scheduleModalPlan, setScheduleModalPlan] = useState<InstallmentPlan | null>(null)

  if (!plans.length) {
    return (
      <EmptyState
        title="ยังไม่พบแผนผ่อน"
        description="เพิ่มแผนเพื่อดูรอบรายเดือน ยอดจ่ายแล้ว และยอดคงเหลือ"
      />
    )
  }

  return (
    <>
      <div className="grid gap-3">
        {plans.map((plan) => {
        const progress = calculateInstallmentProgress(plan)
        const paidMonthKeys = new Set(getPaidMonthKeys(plan))
        const visibleMonths = getInstallmentScheduleMonths(plan).slice(0, 3)
        const hiddenMonthCount = Math.max(0, progress.scheduleMonths.length - visibleMonths.length)
        const interestText = getInterestText(plan)
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

            <div className="grid grid-cols-2">
              <DetailRow label="เงินต้น" value={plan.principal ? formatMoney(plan.principal) : formatMoney(progress.totalAmount)} />
              <DetailRow label="จ่ายแล้ว" value={formatMoney(progress.totalPaid)} className="border-l border-slate-100" />
              <DetailRow label="ดอกเบี้ย" value={interestText} />
              <DetailRow label="เดือนคงเหลือ" value={`${progress.monthsRemaining}`} className="border-l border-slate-100" />
              <DetailRow label="วันครบกำหนด" value={`${plan.dueDay ?? plan.paymentDay ?? '-'}`} lastRow />
              <DetailRow label="หมายเหตุ" value={plan.note || '-'} className="border-l border-slate-100" lastRow />
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-extrabold text-slate-600">รอบชำระ</div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {visibleMonths.map((monthKey) => {
                  const isPaid = paidMonthKeys.has(monthKey)
                  return (
                    <ScheduleMonthChip
                      key={monthKey}
                      monthKey={monthKey}
                      isPaid={isPaid}
                      onClick={() => onToggleMonth(plan, monthKey, !isPaid)}
                    />
                  )
                })}
                {hiddenMonthCount > 0 && (
                  <button
                    type="button"
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => setScheduleModalPlan(plan)}
                  >
                    +{hiddenMonthCount} รอบ
                  </button>
                )}
                <span className="hidden flex-1 sm:block" aria-hidden="true" />
                <Button className="min-w-[5rem] flex-1 sm:flex-none" size="sm" onClick={() => onEdit(plan)}>{th.common.edit}</Button>
                <Button className="min-w-[5rem] flex-1 sm:flex-none" size="sm" variant="danger" onClick={() => onDelete(plan.id)}>{th.common.delete}</Button>
              </div>
            </div>
          </article>
        )
      })}
      </div>

      {scheduleModalPlan ? (
        <ScheduleModal
          plan={scheduleModalPlan}
          onClose={() => setScheduleModalPlan(null)}
          onToggleMonth={onToggleMonth}
        />
      ) : null}
    </>
  )
}

function ScheduleModal({
  plan,
  onClose,
  onToggleMonth,
}: {
  plan: InstallmentPlan
  onClose: () => void
  onToggleMonth: (plan: InstallmentPlan, monthKey: string, isPaid: boolean) => void
}) {
  const paidMonthKeys = new Set(getPaidMonthKeys(plan))
  const months = getInstallmentScheduleMonths(plan)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="finance-modal-backdrop">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <section className="finance-modal-panel relative z-10 max-w-2xl" role="dialog" aria-modal="true" aria-labelledby="installment-schedule-title">
        <div className="mx-auto -mt-1 mb-1 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="min-w-0">
            <h2 id="installment-schedule-title" className="text-lg font-bold tracking-tight text-slate-900">
              รอบชำระ {plan.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={th.common.close}
            className="grid size-8.5 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition active:scale-95"
          >
            <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>

        <div className="finance-modal-body">
          <div className="flex flex-wrap gap-2">
            {months.map((monthKey) => {
              const isPaid = paidMonthKeys.has(monthKey)
              return (
                <ScheduleMonthChip
                  key={monthKey}
                  monthKey={monthKey}
                  isPaid={isPaid}
                  onClick={() => onToggleMonth(plan, monthKey, !isPaid)}
                />
              )
            })}
          </div>
        </div>

        <footer className="finance-modal-footer">
          <Button type="button" variant="primary" onClick={onClose}>{th.common.close}</Button>
        </footer>
      </section>
    </div>
  )
}

function ScheduleMonthChip({
  monthKey,
  isPaid,
  onClick,
}: {
  monthKey: string
  isPaid: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
        isPaid
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-700'
      }`}
      type="button"
      onClick={onClick}
    >
      {monthKey} {isPaid ? th.transaction.paid : th.transaction.unpaid}
    </button>
  )
}

function getInterestText(plan: InstallmentPlan): string {
  if (!plan.interestType || plan.interestType === 'none') return plan.interestNote || 'ไม่มี'
  const typeLabel = plan.interestType === 'flat' ? 'คงที่' : 'ลดต้นลดดอก'
  const rate = Number(plan.interestRate || 0)
  const rateText = rate > 0 ? `${rate}% ` : ''
  return `${rateText}${typeLabel}${plan.interestNote ? ` · ${plan.interestNote}` : ''}`
}

function DetailRow({
  label,
  value,
  className = '',
  lastRow = false,
}: {
  label: string
  value: string
  className?: string
  lastRow?: boolean
}) {
  return (
    <div className={`flex min-w-0 items-center justify-between gap-2 px-2 py-1.5 ${lastRow ? '' : 'border-b border-slate-100'} ${className}`}>
      <span className="text-xs text-slate-400">{label}</span>
      <span className="min-w-0 truncate text-right text-sm font-medium text-slate-700" title={value}>{value}</span>
    </div>
  )
}
