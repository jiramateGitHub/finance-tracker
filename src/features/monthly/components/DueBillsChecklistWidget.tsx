import { useMemo, useState } from 'react'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type { RecurringRule } from '../../../types/finance'
import { formatMoney, formatMonth } from '../../../utils/formatters'
import { QuickPayBillModal } from '../../recurring/components/QuickPayBillModal'
import {
  calculateRecurringMonthlyInfo,
  compareRecurringBills,
  getRecurringDashboardMetrics,
  isRecurringRuleActiveInMonth,
  RECURRING_TYPE_CONFIG,
} from '../../recurring/utils/recurringBills'

export type DueBillsChecklistWidgetProps = {
  rules: RecurringRule[]
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
  onNavigateToObligations?: () => void
  onAddRule?: () => void
}

export function DueBillsChecklistWidget({
  rules,
  selectedMonth,
  onPayRule,
  onUnpayRule,
  onNavigateToObligations,
  onAddRule,
}: DueBillsChecklistWidgetProps) {
  const [quickPayRule, setQuickPayRule] = useState<RecurringRule | null>(null)

  const activeRules = useMemo(
    () => rules.filter((r) => isRecurringRuleActiveInMonth(r, selectedMonth) || (r.paidMonthKeys ?? []).includes(selectedMonth)),
    [rules, selectedMonth],
  )

  const metrics = useMemo(
    () => getRecurringDashboardMetrics(activeRules, selectedMonth),
    [activeRules, selectedMonth],
  )

  const sortedBills = useMemo(() => {
    return activeRules
      .map((rule) => ({
        rule,
        info: calculateRecurringMonthlyInfo(rule, selectedMonth),
      }))
      .sort(compareRecurringBills)
  }, [activeRules, selectedMonth])

  const percentPaid = metrics.totalAmount > 0
    ? Math.round((metrics.paidAmount / metrics.totalAmount) * 100)
    : metrics.paidCount > 0
      ? 100
      : 0

  function handleCheckClick(rule: RecurringRule, isPaid: boolean): void {
    if (isPaid) {
      onUnpayRule(rule.id, selectedMonth)
    } else {
      // If bill is variable amount, prompt quick pay modal so user can input actual bill
      if (rule.amountType === 'variable') {
        setQuickPayRule(rule)
      } else {
        // 1-Click Pay for fixed amounts
        onPayRule(rule.id, selectedMonth, {
          createTransaction: rule.autoGenerateTransaction !== false,
          amount: rule.amount,
          date: '',
        })
      }
    }
  }

  if (activeRules.length === 0) {
    return (
      <Card
        title={
          <div className="flex items-center gap-2">
            <span className="text-blue-600">📋</span>
            <span>บิลที่ต้องชำระเดือนนี้</span>
          </div>
        }
        actions={
          onAddRule && (
            <button
              type="button"
              onClick={onAddRule}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
            >
              + เพิ่มบิลประจำ
            </button>
          )
        }
      >
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-center">
          <div className="text-2xl mb-1.5">⚡</div>
          <p className="text-sm font-bold text-slate-700">ยังไม่มีรายการบิลประจำหรือบัตรเครดิต</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            บันทึกบิลที่จ่ายทุกเดือน เช่น ค่าไฟ, อินเทอร์เน็ต, ค่าบัตรเครดิต เพื่อติดตามวันตัดรอบและติ๊กจ่ายแบบ 1-Click
          </p>
          {onAddRule && (
            <Button
              type="button"
              variant="primary"
              onClick={onAddRule}
              className="mt-3 text-xs"
            >
              เริ่มเพิ่มบิลแรก
            </Button>
          )}
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card
        title={
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-blue-600">📋</span>
            <span className="font-bold text-slate-900">บิลที่ต้องชำระเดือนนี้</span>
            <Badge tone="neutral">
              {formatMonth(selectedMonth)}
            </Badge>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {metrics.overdueCount > 0 && (
              <Badge tone="expense">เกินกำหนด {metrics.overdueCount}</Badge>
            )}
            {metrics.dueSoonCount > 0 && (
              <Badge tone="warning">ใกล้ถึง {metrics.dueSoonCount}</Badge>
            )}
            {onNavigateToObligations && (
              <button
                type="button"
                onClick={onNavigateToObligations}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 transition cursor-pointer hover:underline"
              >
                จัดการภาระทั้งหมด →
              </button>
            )}
          </div>
        }
      >
        {/* Progress & Summary Bar */}
        <div className="mb-4 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
          <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-600 mb-1.5 flex-wrap">
            <div>
              ชำระแล้ว <strong className="text-emerald-700 font-bold">{metrics.paidCount}/{metrics.activeCount} บิล</strong> ({formatMoney(metrics.paidAmount)})
            </div>
            <div>
              ค้างชำระ <strong className="text-slate-900 font-bold">{metrics.unpaidCount} บิล</strong> ({formatMoney(metrics.unpaidAmount)})
            </div>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${percentPaid}%` }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-2.5">
          {sortedBills.map(({ rule, info }) => {
            const typeConfig = rule.type && rule.type in RECURRING_TYPE_CONFIG
              ? RECURRING_TYPE_CONFIG[rule.type as keyof typeof RECURRING_TYPE_CONFIG]
              : RECURRING_TYPE_CONFIG.other

            const isPaid = info.isPaid

            let cardBorder = 'border-slate-200/80 bg-white hover:border-slate-300'
            if (isPaid) {
              cardBorder = 'border-emerald-200/70 bg-emerald-50/20 opacity-80'
            } else if (info.isOverdue) {
              cardBorder = 'border-rose-300 bg-rose-50/40'
            } else if (info.isDueSoon) {
              cardBorder = 'border-amber-300 bg-amber-50/40'
            }

            return (
              <div
                key={rule.id}
                className={`flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-xl border transition-all ${cardBorder}`}
              >
                {/* Left: Checkbox & Info */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleCheckClick(rule, isPaid)}
                    title={isPaid ? 'คลิกเพื่อยกเลิกการจ่าย' : '1-Click Pay ติ๊กจ่ายทันที'}
                    className={`size-7 sm:size-8 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      isPaid
                        ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                        : info.isOverdue
                          ? 'border-2 border-rose-400 bg-white text-rose-600 hover:bg-rose-50'
                          : info.isDueSoon
                            ? 'border-2 border-amber-400 bg-white text-amber-600 hover:bg-amber-50'
                            : 'border-2 border-slate-300 bg-white text-slate-400 hover:border-blue-500 hover:text-blue-500'
                    }`}
                  >
                    {isPaid ? (
                      <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="text-xs font-bold">{info.actualDueDay}</span>
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base shrink-0">{typeConfig.icon}</span>
                      <span className={`text-sm font-bold truncate ${isPaid ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {rule.name || rule.title}
                      </span>
                      {info.isOverdue && <Badge tone="expense">เกินกำหนด {Math.abs(info.daysUntilDue ?? 0)} วัน</Badge>}
                      {info.isDueSoon && (
                        <Badge tone="warning">
                          {info.daysUntilDue === 0 ? 'ครบกำหนดวันนี้' : `อีก ${info.daysUntilDue} วัน`}
                        </Badge>
                      )}
                      {isPaid && <Badge tone="income">จ่ายแล้ว ✓</Badge>}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                      <span>ครบกำหนดวันที่ {info.actualDueDay}</span>
                      {info.actualStatementDay && (
                        <span>• ตัดรอบวันที่ {info.actualStatementDay}</span>
                      )}
                      {rule.category && <span>• {rule.category}</span>}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Quick Pay action */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className={`text-sm font-extrabold tracking-tight ${isPaid ? 'text-slate-500' : 'text-slate-900'}`}>
                      {formatMoney(rule.amount)}
                    </div>
                    {rule.amountType === 'variable' && (
                      <span className="text-[10px] font-semibold text-amber-600 block">
                        ยอดผันแปร
                      </span>
                    )}
                  </div>

                  {!isPaid && (
                    <button
                      type="button"
                      onClick={() => setQuickPayRule(rule)}
                      title="ระบุยอดจริง / ชำระด่วน"
                      className="size-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-blue-600 flex items-center justify-center transition cursor-pointer shrink-0"
                    >
                      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
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
    </>
  )
}
