import { useState } from 'react'
import { ActionButton } from '../../../components/ui/ActionButton'
import { CATEGORY_ICONS } from '../../../data/categories'
import type { InstallmentPlan } from '../../../types/finance'
import { currentMonthInputValue, formatMoney } from '../../../utils/formatters'
import { calculateInstallmentMonthlyInfo } from '../utils/installmentPlans'
import { InstallmentScheduleModal } from './InstallmentScheduleModal'

type InstallmentPlanTableProps = {
  plans: InstallmentPlan[]
  selectedMonth?: string
  onEdit: (plan: InstallmentPlan) => void
  onDelete: (planId: string) => void
  onToggleMonth: (plan: InstallmentPlan, monthKey: string, isPaid: boolean) => void
  onSettleAll?: (plan: InstallmentPlan, isPaid: boolean) => void
}

export function InstallmentPlanTable({
  plans,
  selectedMonth = currentMonthInputValue(),
  onEdit,
  onDelete,
  onToggleMonth,
  onSettleAll,
}: InstallmentPlanTableProps) {
  const [schedulePlanId, setSchedulePlanId] = useState<string | null>(null)
  const scheduleModalPlan = plans.find((p) => p.id === schedulePlanId) ?? null

  if (!plans.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
        ยังไม่พบแผนผ่อนตามเงื่อนไข
      </div>
    )
  }

  return (
    <>
      {/* 1. Mobile Card Fallback (md:hidden) */}
      <div className="space-y-3 md:hidden">
        {plans.map((plan) => {
          const info = calculateInstallmentMonthlyInfo(plan, selectedMonth)
          const categoryIcon = CATEGORY_ICONS[plan.category] || '🧾'
          const statusBadge = getStatusBadge(info)

          return (
            <div
              key={plan.id}
              className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-3"
            >
              {/* Top: Name, Category & Status Badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug" title={plan.name}>
                    {plan.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <span>{categoryIcon}</span>
                    <span className="truncate">{plan.category}</span>
                    <span className="shrink-0">· ตัดวันที่ {info.dueDay}</span>
                  </div>
                </div>
                <div className="shrink-0">{statusBadge}</div>
              </div>

              {/* Middle: 3-column stats */}
              <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 font-medium block truncate">ค่างวด/ด.</span>
                  <span className="text-[11px] sm:text-xs font-bold text-blue-700 block truncate tabular-nums tracking-tight" title={formatMoney(info.monthlyPayment)}>
                    {formatMoney(info.monthlyPayment)}
                  </span>
                </div>
                <div className="min-w-0 border-x border-slate-200/60 px-1">
                  <span className="text-[10px] text-slate-400 font-medium block truncate">ยอดคงเหลือ</span>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-700 block truncate tabular-nums tracking-tight" title={formatMoney(info.remainingBalance)}>
                    {formatMoney(info.remainingBalance)}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 font-medium block truncate">คืบหน้า</span>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-900 block truncate tabular-nums tracking-tight">
                    {info.paidCount}/{info.totalMonths}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full ${info.isCompleted ? 'bg-emerald-500' : 'bg-blue-600'}`}
                  style={{ width: `${info.progressPercent}%` }}
                />
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                {info.isActiveInMonth && !info.isCompleted ? (
                  <ActionButton
                    action="pay"
                    className="flex-1 min-h-9"
                    isPaid={info.isPaidInMonth}
                    label={info.isPaidInMonth ? '✓ จ่ายแล้ว' : 'จ่ายงวดนี้'}
                    onClick={() => onToggleMonth(plan, selectedMonth, !info.isPaidInMonth)}
                  />
                ) : (
                  <div className="flex-1 text-[11px] text-slate-400 italic py-1 truncate">
                    {info.isCompleted ? 'ปลอดหนี้แล้ว' : 'ไม่อยู่ในรอบเดือนนี้'}
                  </div>
                )}

                <div className="flex items-center gap-1 shrink-0">
                  <ActionButton
                    action="view"
                    iconOnly
                    title="ดูตารางงวด"
                    onClick={() => setSchedulePlanId(plan.id)}
                  />
                  <ActionButton
                    action="edit"
                    iconOnly
                    title="แก้ไข"
                    onClick={() => onEdit(plan)}
                  />
                  <ActionButton
                    action="delete"
                    iconOnly
                    title="ลบ"
                    onClick={() => onDelete(plan.id)}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 2. Full Table View for md+ (hidden md:block) */}
      <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">ชื่อแผน / หมวด</th>
                <th className="py-3 px-3">ค่างวด / เดือน</th>
                <th className="py-3 px-3">ความคืบหน้างวด</th>
                <th className="py-3 px-3">ครบกำหนด</th>
                <th className="py-3 px-3">สถานะเดือนนี้</th>
                <th className="py-3 px-3 text-right">ยอดคงเหลือ</th>
                <th className="py-3 px-4 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map((plan) => {
                const info = calculateInstallmentMonthlyInfo(plan, selectedMonth)
                const categoryIcon = CATEGORY_ICONS[plan.category] || '🧾'
                const statusBadge = getStatusBadge(info)

                return (
                  <tr key={plan.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Name & Category */}
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="font-bold truncate max-w-[200px]" title={plan.name}>
                        {plan.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal flex items-center gap-1 mt-0.5">
                        <span>{categoryIcon}</span>
                        <span>{plan.category}</span>
                      </div>
                    </td>

                    {/* Monthly payment */}
                    <td className="py-3 px-3 font-bold text-blue-700 whitespace-nowrap tabular-nums">
                      {formatMoney(info.monthlyPayment)}
                    </td>

                    {/* Progress */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center justify-between text-[11px] mb-1 font-medium tabular-nums">
                        <span>{info.paidCount}/{info.totalMonths} งวด</span>
                        <span className="font-bold text-slate-700">{info.progressPercent}%</span>
                      </div>
                      <div className="w-24 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${info.isCompleted ? 'bg-emerald-500' : 'bg-blue-600'}`}
                          style={{ width: `${info.progressPercent}%` }}
                        />
                      </div>
                    </td>

                    {/* Due Day */}
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      วันที่ {info.dueDay}
                    </td>

                    {/* Status this month */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {statusBadge}
                    </td>

                    {/* Remaining */}
                    <td className="py-3 px-3 text-right font-bold text-slate-800 whitespace-nowrap tabular-nums">
                      {formatMoney(info.remainingBalance)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {/* Quick Pay */}
                        {info.isActiveInMonth && !info.isCompleted && (
                          <ActionButton
                            action="pay"
                            size="sm"
                            isPaid={info.isPaidInMonth}
                            label={info.isPaidInMonth ? 'จ่ายแล้ว' : 'จ่ายงวดนี้'}
                            onClick={() => onToggleMonth(plan, selectedMonth, !info.isPaidInMonth)}
                          />
                        )}

                        <ActionButton
                          action="view"
                          size="sm"
                          iconOnly
                          title="ดูตารางงวด"
                          onClick={() => setSchedulePlanId(plan.id)}
                        />
                        <ActionButton
                          action="edit"
                          size="sm"
                          iconOnly
                          title="แก้ไข"
                          onClick={() => onEdit(plan)}
                        />
                        <ActionButton
                          action="delete"
                          size="sm"
                          iconOnly
                          title="ลบ"
                          onClick={() => onDelete(plan.id)}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {scheduleModalPlan && (
        <InstallmentScheduleModal
          plan={scheduleModalPlan}
          onClose={() => setSchedulePlanId(null)}
          onToggleMonth={onToggleMonth}
          onSettleAll={onSettleAll}
        />
      )}
    </>
  )
}

function getStatusBadge(info: ReturnType<typeof calculateInstallmentMonthlyInfo>): React.ReactNode {
  if (info.isCompleted) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
        ผ่อนหมดแล้ว 🎉
      </span>
    )
  }
  if (!info.isActiveInMonth) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
        ไม่มีงวด
      </span>
    )
  }
  if (info.isPaidInMonth) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        จ่ายแล้ว
      </span>
    )
  }
  if (info.isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
        เกินกำหนด!
      </span>
    )
  }
  if (info.isDueSoon) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        {info.daysUntilDue === 0 ? 'วันนี้' : `อีก ${info.daysUntilDue} วัน`}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
      รอชำระ
    </span>
  )
}
