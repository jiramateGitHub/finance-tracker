import { useMemo, useState } from 'react'
import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import type { InstallmentPlan, RecurringRule } from '../../../types/finance'
import { formatMoney, formatMonth } from '../../../utils/formatters'
import {
  getUnifiedObligationsCalendar,
  RECURRING_TYPE_CONFIG,
} from '../utils/recurringBills'
import { QuickPayBillModal } from './QuickPayBillModal'

export type ObligationsMasterCalendarProps = {
  rules: RecurringRule[]
  plans: InstallmentPlan[]
  selectedMonth: string
  onPayRule: (
    ruleId: string,
    monthKey: string,
    options?: {
      createTransaction: boolean
      amount: number
      date: string
      note?: string
    },
  ) => void
  onUnpayRule: (ruleId: string, monthKey: string) => void
  onToggleInstallmentMonth: (plan: InstallmentPlan, monthKey: string, isPaid: boolean) => void
}

const WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

export function ObligationsMasterCalendar({
  rules,
  plans,
  selectedMonth,
  onPayRule,
  onUnpayRule,
  onToggleInstallmentMonth,
}: ObligationsMasterCalendarProps) {
  const [quickPayRule, setQuickPayRule] = useState<RecurringRule | null>(null)

  const calendarData = useMemo(
    () => getUnifiedObligationsCalendar(rules, plans, selectedMonth),
    [rules, plans, selectedMonth],
  )

  const { days, daysInMonth, monthSummary } = calendarData

  // Determine leading blank days for the first day of the month
  const firstDayOfWeek = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    return new Date(year, month - 1, 1).getDay()
  }, [selectedMonth])

  const todayStr = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }, [])

  function handleBillPay(rule: RecurringRule, isPaid: boolean): void {
    if (isPaid) {
      onUnpayRule(rule.id, selectedMonth)
    } else {
      if (rule.amountType === 'variable') {
        setQuickPayRule(rule)
      } else {
        onPayRule(rule.id, selectedMonth, {
          createTransaction: rule.autoGenerateTransaction !== false,
          amount: rule.amount,
          date: '',
        })
      }
    }
  }

  const percentPaid = monthSummary.totalObligations > 0
    ? Math.round((monthSummary.paidObligations / monthSummary.totalObligations) * 100)
    : monthSummary.paidItemsCount > 0
      ? 100
      : 0

  return (
    <div className="space-y-4">
      {/* ==================== SUMMARY HEADER ==================== */}
      <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>📅</span>
              <span>ปฏิทินรวมภาระหนี้ & บิลประจำ</span>
              <Badge tone="primary">
                {formatMonth(selectedMonth)}
              </Badge>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              รวมทุกยอดชำระ: ทั้งบิลประจำ บัตรเครดิต และยอดผ่อนสินค้าในแต่ละวัน
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <div>
              ภาระรวม: <strong className="text-blue-700 font-extrabold text-sm">{formatMoney(monthSummary.totalObligations)}</strong>
            </div>
            <div>
              ชำระแล้ว: <strong className="text-emerald-700 font-extrabold text-sm">{formatMoney(monthSummary.paidObligations)}</strong>
            </div>
            <div>
              คงค้าง: <strong className="text-amber-700 font-extrabold text-sm">{formatMoney(monthSummary.unpaidObligations)}</strong>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
            style={{ width: `${percentPaid}%` }}
          />
        </div>
      </div>

      {/* ==================== CALENDAR GRID ==================== */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <span>ตารางปฏิทินรายวัน</span>
            <span className="text-xs font-semibold text-slate-500">
              (แสดงวันตัดรอบบิลและวันครบกำหนดจ่าย)
            </span>
          </div>
        }
      >
        <div className="w-full overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center text-xs font-bold text-slate-500">
              {WEEKDAYS.map((day, idx) => (
                <div
                  key={day}
                  className={`py-1.5 rounded-lg ${idx === 0 || idx === 6 ? 'text-rose-500 bg-rose-50/40' : 'bg-slate-50'}`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Day Cells */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Leading blanks */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`blank-${idx}`} className="min-h-[110px] rounded-xl bg-slate-50/40 border border-transparent" />
              ))}

              {/* Days 1..daysInMonth */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1
                const item = days[dayNum]
                const isToday = item?.dateStr === todayStr
                const hasDue = item && (item.bills.length > 0 || item.installments.length > 0)
                const hasStatements = item && item.statements.length > 0

                return (
                  <div
                    key={dayNum}
                    className={`min-h-[110px] rounded-xl border p-1.5 flex flex-col justify-between transition-all ${
                      isToday
                        ? 'border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/20 shadow-xs'
                        : hasDue && !item.isAllPaid
                          ? 'border-slate-300 bg-white hover:border-slate-400'
                          : hasDue && item.isAllPaid
                            ? 'border-emerald-200 bg-emerald-50/15'
                            : 'border-slate-200/70 bg-white/80'
                    }`}
                  >
                    {/* Day Number Header */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span
                        className={`text-xs font-bold size-5 flex items-center justify-center rounded-full ${
                          isToday ? 'bg-blue-600 text-white' : 'text-slate-700'
                        }`}
                      >
                        {dayNum}
                      </span>

                      {hasDue && (
                        <span
                          className={`text-[10px] font-extrabold px-1 rounded ${
                            item.isAllPaid ? 'text-emerald-700 bg-emerald-50' : 'text-slate-800'
                          }`}
                        >
                          {item.totalDueAmount > 0
                            ? `฿${Math.round(item.totalDueAmount).toLocaleString('th-TH')}`
                            : 'มีนัดจ่าย'}
                        </span>
                      )}
                    </div>

                    {/* Day Items List */}
                    <div className="space-y-1 flex-1 overflow-y-auto max-h-[120px] text-[11px]">
                      {/* Statements info */}
                      {hasStatements &&
                        item.statements.map(({ rule }) => (
                          <div
                            key={`stmt-${rule.id}`}
                            className="rounded bg-blue-50 border border-blue-200/80 px-1 py-0.5 text-[10px] font-semibold text-blue-700 truncate"
                            title={`วันตัดรอบบิล: ${rule.name || rule.title}`}
                          >
                            ✂️ ตัดรอบ: {rule.name || rule.title}
                          </div>
                        ))}

                      {/* Recurring bills due */}
                      {item?.bills.map(({ rule, info }) => {
                        const typeConfig = rule.type && rule.type in RECURRING_TYPE_CONFIG
                          ? RECURRING_TYPE_CONFIG[rule.type as keyof typeof RECURRING_TYPE_CONFIG]
                          : RECURRING_TYPE_CONFIG.other

                        return (
                          <button
                            type="button"
                            key={`bill-${rule.id}`}
                            onClick={() => handleBillPay(rule, info.isPaid)}
                            title={info.isPaid ? 'จ่ายแล้ว (คลิกเพื่อยกเลิก)' : 'คลิกเพื่อชำระบิล'}
                            className={`w-full text-left rounded px-1.5 py-0.5 font-medium flex items-center justify-between gap-1 border transition cursor-pointer ${
                              info.isPaid
                                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-700 line-through'
                                : info.isOverdue
                                  ? 'bg-rose-50 border-rose-200 text-rose-700 font-bold'
                                  : info.isDueSoon
                                    ? 'bg-amber-50 border-amber-200 text-amber-800 font-bold'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span className="truncate flex items-center gap-1">
                              <span>{typeConfig.icon}</span>
                              <span className="truncate">{rule.name || rule.title}</span>
                            </span>
                            <span className="shrink-0 text-[10px] font-bold">
                              {info.isPaid ? '✓' : Math.round(info.effectiveAmount).toLocaleString('th-TH')}
                            </span>
                          </button>
                        )
                      })}

                      {/* Installments due */}
                      {item?.installments.map(({ plan, info }) => (
                        <button
                          type="button"
                          key={`inst-${plan.id}`}
                          onClick={() => onToggleInstallmentMonth(plan, selectedMonth, !info.isPaidInMonth)}
                          title={info.isPaidInMonth ? 'จ่ายงวดนี้แล้ว (คลิกเพื่อยกเลิก)' : 'คลิกเพื่อติ๊กจ่ายค่างวด'}
                          className={`w-full text-left rounded px-1.5 py-0.5 font-medium flex items-center justify-between gap-1 border transition cursor-pointer ${
                            info.isPaidInMonth
                              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-700 line-through'
                              : info.isOverdue
                                ? 'bg-rose-50 border-rose-200 text-rose-700 font-bold'
                                : info.isDueSoon
                                  ? 'bg-amber-50 border-amber-200 text-amber-800 font-bold'
                                  : 'bg-blue-50/60 border-blue-200 text-blue-800 hover:bg-blue-100'
                          }`}
                        >
                          <span className="truncate flex items-center gap-1">
                            <span>💳</span>
                            <span className="truncate">{plan.name}</span>
                          </span>
                          <span className="shrink-0 text-[10px] font-bold">
                            {info.isPaidInMonth ? '✓' : Math.round(info.monthlyPayment).toLocaleString('th-TH')}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Bottom Status Dot */}
                    {hasDue && (
                      <div className="pt-1 flex items-center justify-between text-[10px]">
                        <span className={`inline-block size-1.5 rounded-full ${item.isAllPaid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className="text-[10px] text-slate-400">
                          {item.isAllPaid ? 'ครบ' : 'ค้าง'}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      {quickPayRule && (
        <QuickPayBillModal
          key={quickPayRule.id}
          open={Boolean(quickPayRule)}
          rule={quickPayRule}
          selectedMonth={selectedMonth}
          onClose={() => setQuickPayRule(null)}
          onPay={onPayRule}
        />
      )}
    </div>
  )
}
