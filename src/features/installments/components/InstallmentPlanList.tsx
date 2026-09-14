import { useState } from 'react'
import { ActionButton } from '../../../components/ui/ActionButton'
import { CATEGORY_ICONS } from '../../../data/categories'
import type { InstallmentPlan } from '../../../types/finance'
import { currentMonthInputValue, formatMoney, formatMonth } from '../../../utils/formatters'
import {
  calculateInstallmentMonthlyInfo,
} from '../utils/installmentPlans'
import { InstallmentScheduleModal } from './InstallmentScheduleModal'

type InstallmentPlanListProps = {
  plans: InstallmentPlan[]
  selectedMonth?: string
  totalPlansCount?: number
  onOpenAdd?: () => void
  onClearFilters?: () => void
  onEdit: (plan: InstallmentPlan) => void
  onDelete: (planId: string) => void
  onToggleMonth: (plan: InstallmentPlan, monthKey: string, isPaid: boolean) => void
  onSettleAll?: (plan: InstallmentPlan, isPaid: boolean) => void
}

export function InstallmentPlanList({
  plans,
  selectedMonth = currentMonthInputValue(),
  totalPlansCount,
  onOpenAdd,
  onClearFilters,
  onEdit,
  onDelete,
  onToggleMonth,
  onSettleAll,
}: InstallmentPlanListProps) {
  const [schedulePlanId, setSchedulePlanId] = useState<string | null>(null)
  const scheduleModalPlan = plans.find((p) => p.id === schedulePlanId) ?? null

  if (!plans.length) {
    if (totalPlansCount === 0) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 text-center max-w-lg mx-auto my-4 shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-xs">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1.5">ยังไม่มีรายการผ่อนในระบบ</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5 leading-relaxed">
            เริ่มต้นบันทึกยอดผ่อนสินค้า บัตรเครดิต หรือสินเชื่อ เพื่อให้ระบบช่วยคำนวณและสรุปภาระรายจ่ายรายเดือนให้อัตโนมัติ
          </p>
          {onOpenAdd && (
            <button
              type="button"
              onClick={onOpenAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              <span>เพิ่มรายการผ่อนแรก</span>
            </button>
          )}
        </div>
      )
    }

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center max-w-md mx-auto my-4 shadow-xs">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">ไม่พบแผนผ่อนที่ตรงกับเงื่อนไข</h3>
        <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
          ลองปรับตัวกรองสถานะ หมวดหมู่ หรือคำค้นหาใหม่อีกครั้ง
        </p>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const info = calculateInstallmentMonthlyInfo(plan, selectedMonth)
          const categoryIcon = CATEGORY_ICONS[plan.category] || '🧾'
          const interestText = getInterestText(plan)

          let statusBadge: React.ReactNode
          if (info.isCompleted) {
            statusBadge = (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                ผ่อนหมดแล้ว 🎉
              </span>
            )
          } else if (!info.isActiveInMonth) {
            statusBadge = (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                ไม่มีงวดเดือนนี้
              </span>
            )
          } else if (info.isPaidInMonth) {
            statusBadge = (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                จ่ายงวดนี้แล้ว
              </span>
            )
          } else if (info.isOverdue) {
            statusBadge = (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                <svg className="w-3.5 h-3.5 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                เกินกำหนดชำระ!
              </span>
            )
          } else if (info.isDueSoon) {
            statusBadge = (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                <svg className="w-3.5 h-3.5 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                {info.daysUntilDue === 0 ? 'ครบกำหนดวันนี้!' : `ครบกำหนดในอีก ${info.daysUntilDue} วัน`}
              </span>
            )
          } else {
            statusBadge = (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                รอชำระ (วันที่ {info.actualDueDay})
              </span>
            )
          }

          return (
            <article
              key={plan.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* 1. Top Strip: Category & Month Status Badge */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-xl bg-slate-100 text-slate-700 truncate max-w-[140px] sm:max-w-none">
                    <span>{categoryIcon}</span>
                    <span className="truncate">{plan.category}</span>
                  </span>
                  {statusBadge}
                </div>

                {/* 2. Title & Metadata */}
                <div className="mb-3">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 line-clamp-2 leading-snug" title={plan.name}>
                    {plan.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-3 h-3 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                        <line x1="16" x2="16" y1="2" y2="6" />
                        <line x1="8" x2="8" y1="2" y2="6" />
                      </svg>
                      ตัดวันที่ {info.dueDay}
                    </span>
                    {interestText && (
                      <span className="text-slate-400">· {interestText}</span>
                    )}
                  </div>
                </div>

                {/* 3. 3-Column Financial Mini Stats */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-slate-50/90 rounded-xl p-2 sm:p-3 border border-slate-100 mb-3 text-center sm:text-left">
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block truncate">ค่างวด/เดือน</span>
                    <span className="text-[11px] sm:text-sm font-extrabold text-blue-700 block truncate tabular-nums mt-0.5 tracking-tight" title={formatMoney(info.monthlyPayment)}>
                      {formatMoney(info.monthlyPayment)}
                    </span>
                  </div>
                  <div className="min-w-0 border-x border-slate-200/60 px-1 sm:px-2">
                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block truncate">ยอดคงเหลือ</span>
                    <span className="text-[11px] sm:text-sm font-bold text-slate-700 block truncate tabular-nums mt-0.5 tracking-tight" title={formatMoney(info.remainingBalance)}>
                      {formatMoney(info.remainingBalance)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block truncate">ยอดรวมแผน</span>
                    <span className="text-[11px] sm:text-sm font-bold text-slate-900 block truncate tabular-nums mt-0.5 tracking-tight" title={formatMoney(plan.principal || info.monthlyPayment * info.totalMonths)}>
                      {formatMoney(plan.principal || info.monthlyPayment * info.totalMonths)}
                    </span>
                  </div>
                </div>

                {/* 4. Progress Section */}
                <div className="space-y-1.5 mb-3.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 font-medium truncate pr-1">
                      งวดที่ <strong>{info.paidCount}</strong> / {info.totalMonths}
                      <span className="text-slate-400 ml-1">
                        ({info.remainingMonths > 0 ? `เหลือ ${info.remainingMonths} งวด` : 'ครบแล้ว'})
                      </span>
                    </span>
                    <span className="font-bold text-blue-600 shrink-0">{info.progressPercent}%</span>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        info.isCompleted ? 'bg-emerald-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${info.progressPercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] sm:text-[11px] text-slate-400 pt-0.5">
                    <span>เริ่ม {formatMonth(info.startYM)}</span>
                    <span>ผ่อนหมด {formatMonth(info.endYM)}</span>
                  </div>
                </div>

                {/* 5. Note if any */}
                {plan.note && (
                  <div className="text-[11px] text-slate-500 bg-slate-50/80 px-2.5 py-1.5 rounded-lg mb-3 line-clamp-1 italic border border-slate-100">
                    "{plan.note}"
                  </div>
                )}
              </div>

              {/* 6. Card Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5 sm:gap-2">
                {/* Quick Pay Action for this month */}
                {info.isActiveInMonth ? (
                  <ActionButton
                    action="pay"
                    className="flex-1 min-h-9"
                    isPaid={info.isPaidInMonth}
                    label={info.isPaidInMonth ? 'จ่ายแล้ว' : 'จ่ายงวดนี้'}
                    onClick={() => onToggleMonth(plan, selectedMonth, !info.isPaidInMonth)}
                  />
                ) : (
                  <div className="flex-1 text-[11px] text-slate-400 italic py-1 truncate">
                    {info.isCompleted ? 'ปลอดหนี้แล้ว' : 'ไม่อยู่ในรอบเดือนนี้'}
                  </div>
                )}

                {/* Secondary Actions Cluster */}
                <div className="flex items-center gap-1 shrink-0">
                  <ActionButton
                    action="view"
                    iconOnly
                    title="ดูตารางงวดทั้งหมด"
                    onClick={() => setSchedulePlanId(plan.id)}
                  />
                  <ActionButton
                    action="edit"
                    iconOnly
                    title="แก้ไขแผนผ่อน"
                    onClick={() => onEdit(plan)}
                  />
                  <ActionButton
                    action="delete"
                    iconOnly
                    title="ลบแผนผ่อนนี้"
                    onClick={() => onDelete(plan.id)}
                  />
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* Schedule Modal */}
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

function getInterestText(plan: InstallmentPlan): string {
  if (!plan.interestType || plan.interestType === 'none') return plan.interestNote || ''
  const typeLabel = plan.interestType === 'flat' ? 'คงที่' : 'ลดต้นลดดอก'
  const rate = Number(plan.interestRate || 0)
  const rateText = rate > 0 ? `${rate}% ` : ''
  return `${rateText}${typeLabel}${plan.interestNote ? ` · ${plan.interestNote}` : ''}`
}
