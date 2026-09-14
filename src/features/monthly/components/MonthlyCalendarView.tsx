import { useMemo, useState } from 'react'
import { ActionButton } from '../../../components/ui/ActionButton'
import { Badge } from '../../../components/ui/Badge'
import { EmptyState } from '../../../components/ui/EmptyState'
import { th } from '../../../i18n/th'
import type { TransactionEntry } from '../../../types/finance'
import { formatDate, formatMoney, formatMonth } from '../../../utils/formatters'
import { getPaymentLabel, isInstallmentTransaction, isManualTransaction } from '../utils/monthlyLedger'

type MonthlyCalendarViewProps = {
  transactions: TransactionEntry[]
  selectedMonth: string
  highlightedIds?: string[]
  onEdit: (transaction: TransactionEntry) => void
  onDelete: (transactionId: string) => void
  onDuplicate: (transaction: TransactionEntry) => void
  onUseTemplate: (transaction: TransactionEntry) => void
  onTogglePaid: (transaction: TransactionEntry) => void
}

const WEEKDAY_NAMES = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

export function MonthlyCalendarView({
  transactions,
  selectedMonth,
  highlightedIds = [],
  onEdit,
  onDelete,
  onDuplicate,
  onUseTemplate,
  onTogglePaid,
}: MonthlyCalendarViewProps) {
  const [activeDate, setActiveDate] = useState<string | null>(null)

  // Map transactions by YYYY-MM-DD
  const transactionsByDate = useMemo(() => {
    const map = new Map<string, TransactionEntry[]>()
    for (const tx of transactions) {
      const date = tx.date.slice(0, 10)
      map.set(date, [...(map.get(date) ?? []), tx])
    }
    return map
  }, [transactions])

  // Calculate calendar grid days
  const calendarDays = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-')
    const year = Number(yearStr) || new Date().getFullYear()
    const month = Number(monthStr) || (new Date().getMonth() + 1)

    const firstDayIndex = new Date(year, month - 1, 1).getDay()
    const daysInMonth = new Date(year, month, 0).getDate()

    const days: Array<{
      dateStr: string
      dayNum: number
      isCurrentMonth: boolean
      transactions: TransactionEntry[]
      income: number
      expense: number
    }> = []

    // Padding for previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({
        dateStr: `prev-${i}`,
        dayNum: 0,
        isCurrentMonth: false,
        transactions: [],
        income: 0,
        expense: 0,
      })
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, '0')
      const dateStr = `${selectedMonth}-${dayStr}`
      const dayTxs = transactionsByDate.get(dateStr) ?? []
      let income = 0
      let expense = 0
      for (const tx of dayTxs) {
        if (tx.type === 'income') income += Number(tx.amount || 0)
        else expense += Number(tx.amount || 0)
      }

      days.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: true,
        transactions: dayTxs,
        income,
        expense,
      })
    }

    return days
  }, [selectedMonth, transactionsByDate])

  const selectedDateTransactions = activeDate ? (transactionsByDate.get(activeDate) ?? []) : []

  if (!transactions.length) {
    return (
      <EmptyState
        title={th.transaction.noTransactions}
        description={th.transaction.noTransactionsDescription}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* 1. Month Calendar Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h3 className="text-sm sm:text-base font-bold text-slate-800">
          ปฏิทินรายรับ-รายจ่าย {formatMonth(selectedMonth)}
        </h3>
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1 text-emerald-700">
            <span className="size-2 rounded-full bg-emerald-500" />
            รายรับ
          </span>
          <span className="flex items-center gap-1 text-rose-700">
            <span className="size-2 rounded-full bg-rose-500" />
            รายจ่าย
          </span>
        </div>
      </div>

      {/* 2. 7-Column Calendar Grid */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-slate-200/80 bg-slate-50/90 text-center text-xs font-bold text-slate-600">
          {WEEKDAY_NAMES.map((weekday, idx) => (
            <div
              key={weekday}
              className={`py-2.5 ${idx === 0 ? 'text-rose-600' : idx === 6 ? 'text-blue-600' : ''}`}
            >
              {weekday}
            </div>
          ))}
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {calendarDays.map((day, idx) => {
            if (!day.isCurrentMonth) {
              return (
                <div
                  key={`pad-${idx}`}
                  className="min-h-[72px] sm:min-h-[90px] bg-slate-50/40 p-1 sm:p-1.5 opacity-40"
                />
              )
            }

            const isSelected = activeDate === day.dateStr
            const hasData = day.transactions.length > 0

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setActiveDate(isSelected ? null : day.dateStr)}
                className={`min-h-[72px] sm:min-h-[90px] p-1 sm:p-1.5 text-left transition flex flex-col justify-between cursor-pointer group ${
                  isSelected
                    ? 'bg-blue-50/80 ring-2 ring-blue-500/40'
                    : hasData
                    ? 'hover:bg-slate-50/90 bg-white'
                    : 'bg-white hover:bg-slate-50/40'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-bold size-5 sm:size-6 flex items-center justify-center rounded-full transition ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : hasData
                        ? 'text-slate-800 group-hover:bg-slate-200/60'
                        : 'text-slate-400'
                    }`}
                  >
                    {day.dayNum}
                  </span>
                  {hasData && (
                    <span className="text-[10px] font-bold px-1 rounded-md bg-slate-100 text-slate-500">
                      {day.transactions.length}
                    </span>
                  )}
                </div>

                {hasData && (
                  <div className="mt-1 space-y-0.5 w-full overflow-hidden text-[10px] sm:text-[11px] font-bold tabular-nums leading-tight">
                    {day.income > 0 && (
                      <div className="truncate text-emerald-700 bg-emerald-50/80 rounded px-1 py-0.5 border border-emerald-200/40">
                        +{formatMoney(day.income)}
                      </div>
                    )}
                    {day.expense > 0 && (
                      <div className="truncate text-rose-700 bg-rose-50/80 rounded px-1 py-0.5 border border-rose-200/40">
                        -{formatMoney(day.expense)}
                      </div>
                    )}
                  </div>
                )}

                {!hasData && <div className="h-4" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. Selected Day Detailed Items Drawer */}
      {activeDate && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50/30 p-3.5 sm:p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-blue-100 pb-2.5">
            <div>
              <h4 className="font-bold text-sm sm:text-base text-slate-900">
                รายการวันที่ {formatDate(activeDate)}
              </h4>
              <p className="text-xs text-slate-500 font-medium">
                พบ {selectedDateTransactions.length} รายการในวันนี้
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveDate(null)}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            >
              ปิด
            </button>
          </div>

          <div className="grid gap-2">
            {selectedDateTransactions.map((transaction) => {
              const linkedInstallment = isInstallmentTransaction(transaction)
              const manual = isManualTransaction(transaction)
              const isIncome = transaction.type === 'income'
              const highlighted = highlightedIds.includes(transaction.id)

              return (
                <article
                  key={transaction.id}
                  className={`rounded-xl border p-3 bg-white transition shadow-xs ${
                    highlighted ? 'border-amber-300 bg-amber-50/70' : 'border-slate-200/80'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="font-bold text-sm text-slate-900 truncate">{transaction.title}</h5>
                        <Badge tone={isIncome ? 'income' : linkedInstallment ? 'warning' : 'expense'}>
                          {transaction.category}
                        </Badge>
                        <Badge tone={transaction.status === 'pending' ? 'warning' : 'active'}>
                          {getPaymentLabel(transaction)}
                        </Badge>
                      </div>
                      {transaction.note && (
                        <p className="text-xs text-slate-500 mt-0.5">{transaction.note}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className={`font-bold text-base tabular-nums ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isIncome ? '+' : '-'}{formatMoney(transaction.amount)}
                      </div>

                      <div className="flex items-center gap-1">
                        {!isIncome && manual && (
                          <ActionButton
                            action="pay"
                            size="sm"
                            isPaid={transaction.status === 'cleared'}
                            label={transaction.status === 'pending' ? 'จ่าย' : 'ยกเลิก'}
                            onClick={() => onTogglePaid(transaction)}
                          />
                        )}
                        {manual && (
                          <>
                            <ActionButton action="duplicate" iconOnly title="ทำซ้ำ" onClick={() => onDuplicate(transaction)} />
                            <ActionButton action="template" iconOnly title="ต้นแบบ" onClick={() => onUseTemplate(transaction)} />
                            <ActionButton action="edit" iconOnly title={th.common.edit} onClick={() => onEdit(transaction)} />
                            <ActionButton action="delete" iconOnly title={th.common.delete} onClick={() => onDelete(transaction.id)} />
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
