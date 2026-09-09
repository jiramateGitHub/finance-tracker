import { useEffect } from 'react'
import { Button } from '../../../components/ui/Button'
import { th } from '../../../i18n/th'
import type { InstallmentPlan } from '../../../types/finance'
import { formatMoney, formatMonth } from '../../../utils/formatters'
import {
  calculateInstallmentProgress,
  getInstallmentScheduleMonths,
  getPaidMonthKeys,
  setAllMonthsPaid,
} from '../utils/installmentPlans'

type InstallmentScheduleModalProps = {
  plan: InstallmentPlan
  onClose: () => void
  onToggleMonth: (plan: InstallmentPlan, monthKey: string, isPaid: boolean) => void
  onSettleAll?: (plan: InstallmentPlan, isPaid: boolean) => void
}

export function InstallmentScheduleModal({
  plan,
  onClose,
  onToggleMonth,
  onSettleAll,
}: InstallmentScheduleModalProps) {
  const progress = calculateInstallmentProgress(plan)
  const paidMonthKeys = new Set(getPaidMonthKeys(plan))
  const months = getInstallmentScheduleMonths(plan)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleSettleAll(isPaid: boolean) {
    if (onSettleAll) {
      onSettleAll(plan, isPaid)
    } else {
      const updated = setAllMonthsPaid(plan, isPaid)
      // If parent doesn't provide onSettleAll directly, simulate by updating all
      for (const m of months) {
        onToggleMonth(updated, m, isPaid)
      }
    }
  }

  const isAllPaid = progress.monthsRemaining === 0

  return (
    <div className="finance-modal-backdrop">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <section
        className="finance-modal-panel relative z-10 max-w-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="installment-schedule-title"
      >
        <div className="mx-auto -mt-1 mb-1 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />

        {/* Modal Header */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" y1="21" x2="21" y2="21" />
              </svg>
            </div>
            <div>
              <h2 id="installment-schedule-title" className="text-base font-bold text-slate-900 leading-tight">
                ตารางผ่อนชำระ: {plan.name}
              </h2>
              <p className="text-xs text-slate-500">
                งวดทั้งหมด {months.length} งวด และการบันทึกชำระ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={th.common.close}
            className="grid min-h-10 min-w-10 sm:min-h-9 sm:min-w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition active:scale-95 cursor-pointer"
          >
            <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* Modal Body */}
        <div className="finance-modal-body space-y-3">
          {/* Summary Strip (from installment_tracker.html line 697) */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-slate-50 p-2.5 sm:p-3 rounded-2xl border border-slate-200/70 text-center">
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block truncate">ค่างวดต่อเดือน</span>
              <div className="text-[11px] sm:text-base font-extrabold text-slate-900 mt-0.5 truncate tabular-nums tracking-tight" title={formatMoney(plan.monthlyAmount)}>
                {formatMoney(plan.monthlyAmount)}
              </div>
            </div>
            <div className="min-w-0 border-x border-slate-200/60 px-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block truncate">ผ่อนแล้ว</span>
              <div className="text-[11px] sm:text-base font-extrabold text-emerald-600 mt-0.5 truncate tabular-nums tracking-tight">
                {progress.monthsPaid}/{progress.scheduleMonths.length} งวด
              </div>
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block truncate">คงเหลือ</span>
              <div className="text-[11px] sm:text-base font-extrabold text-rose-600 mt-0.5 truncate tabular-nums tracking-tight" title={formatMoney(progress.remainingAmount)}>
                {formatMoney(progress.remainingAmount)}
              </div>
            </div>
          </div>

          {/* 1. Mobile Schedule List (sm:hidden - naturally scrolls inside modal body) */}
          <div className="space-y-2 sm:hidden pr-0.5">
            {months.map((monthKey, idx) => {
              const isPaid = paidMonthKeys.has(monthKey)
              return (
                <div
                  key={monthKey}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50/80 transition shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-500">#{idx + 1}</span>
                      <span className="text-xs font-bold text-slate-900">{formatMonth(monthKey)}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isPaid ? 'จ่ายแล้ว ✓' : 'รอชำระ'}
                      </span>
                    </div>
                    <div className="text-xs font-extrabold text-blue-700 mt-0.5 tabular-nums">
                      {formatMoney(plan.monthlyAmount)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleMonth(plan, monthKey, !isPaid)}
                    className={`shrink-0 min-h-10 px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center transition cursor-pointer ${
                      isPaid
                        ? 'border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                    }`}
                  >
                    {isPaid ? 'ยกเลิก' : 'บันทึกจ่าย'}
                  </button>
                </div>
              )
            })}
          </div>

          {/* 2. Desktop Schedule Table (hidden sm:block) */}
          <div className="hidden sm:block border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="max-h-72 overflow-y-auto overflow-x-auto">
              <table className="w-full min-w-[460px] text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-100 z-10 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">งวดที่</th>
                    <th className="py-2.5 px-3">เดือนที่ครบกำหนด</th>
                    <th className="py-2.5 px-3">ยอดชำระ</th>
                    <th className="py-2.5 px-3">สถานะ</th>
                    <th className="py-2.5 px-3 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {months.map((monthKey, idx) => {
                    const isPaid = paidMonthKeys.has(monthKey)
                    return (
                      <tr key={monthKey} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-slate-500">
                          #{idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {formatMonth(monthKey)}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700 tabular-nums">
                          {formatMoney(plan.monthlyAmount)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              isPaid
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isPaid ? 'จ่ายแล้ว ✓' : 'รอชำระ'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => onToggleMonth(plan, monthKey, !isPaid)}
                            className={`min-h-9 sm:min-h-8 px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center justify-center transition cursor-pointer ${
                              isPaid
                                ? 'border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                            }`}
                          >
                            {isPaid ? 'ยกเลิก' : 'บันทึกจ่าย'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <footer className="finance-modal-footer">
          {!isAllPaid ? (
            <Button
              type="button"
              variant="success"
              onClick={() => handleSettleAll(true)}
              className="min-h-11 sm:min-h-9 justify-center"
            >
              <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
                <polyline points="15 6 4 17 1 14" />
              </svg>
              <span>ปิดยอดทั้งหมด</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="danger"
              onClick={() => handleSettleAll(false)}
              className="min-h-11 sm:min-h-9 justify-center"
            >
              ยกเลิกชำระทั้งหมด
            </Button>
          )}
          <Button type="button" variant="primary" onClick={onClose} className="min-h-11 sm:min-h-9 justify-center">
            {th.common.close}
          </Button>
        </footer>
      </section>
    </div>
  )
}
