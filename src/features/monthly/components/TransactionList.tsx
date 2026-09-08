import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { th } from '../../../i18n/th'
import type { TransactionEntry } from '../../../types/finance'
import { formatDate, formatMoney, formatMonth } from '../../../utils/formatters'
import type { MonthlyGroup } from '../utils/monthlyLedger'
import { getPaymentLabel, getSourceLabel, isInstallmentTransaction, isManualTransaction } from '../utils/monthlyLedger'

type TransactionListProps = {
  groups: MonthlyGroup[]
  highlightedIds?: string[]
  onEdit: (transaction: TransactionEntry) => void
  onDelete: (transactionId: string) => void
  onDuplicate: (transaction: TransactionEntry) => void
  onUseTemplate: (transaction: TransactionEntry) => void
  onTogglePaid: (transaction: TransactionEntry) => void
}

export function TransactionList({ groups, highlightedIds = [], onEdit, onDelete, onDuplicate, onUseTemplate, onTogglePaid }: TransactionListProps) {
  if (!groups.length) {
    return (
      <EmptyState
        title={th.transaction.noTransactions}
        description={th.transaction.noTransactionsDescription}
      />
    )
  }

  return (
    <div className="grid gap-5">
      {groups.map((group) => (
        <section key={group.monthKey} className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">{formatMonth(group.monthKey)}</h3>
              <p className="text-xs font-medium text-slate-500">{group.transactions.length} รายการ</p>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs sm:text-sm font-semibold">
              <span className="rounded-xl bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 text-emerald-700">
                +{formatMoney(group.totals.income)}
              </span>
              <span className="rounded-xl bg-rose-50 border border-rose-200/60 px-2.5 py-1 text-rose-700">
                -{formatMoney(group.totals.expense)}
              </span>
              <span className="rounded-xl bg-blue-50 border border-blue-200/60 px-2.5 py-1 text-blue-700">
                {formatMoney(group.totals.balance)}
              </span>
            </div>
          </div>

          <div className="grid gap-2">
            {group.transactions.map((transaction) => {
              const linkedInstallment = isInstallmentTransaction(transaction)
              const linkedTrip = Boolean(transaction.tripId || transaction.sourceModule === 'trip')
              const manual = isManualTransaction(transaction)
              const isIncome = transaction.type === 'income'
              const highlighted = highlightedIds.includes(transaction.id)
              return (
                <article
                  key={transaction.id}
                  className={`group rounded-2xl border p-3 sm:p-3.5 transition-all duration-150 ${
                    highlighted
                      ? 'border-amber-300 bg-amber-50/70 shadow-sm'
                      : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="shrink-0 rounded-xl bg-slate-50 border border-slate-200/60 px-2.5 py-1.5 text-center">
                        <div className="text-[11px] font-semibold text-slate-500">{formatDate(transaction.date)}</div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="truncate text-sm sm:text-base font-bold text-slate-900">{transaction.title}</h4>
                          <Badge tone={isIncome ? 'income' : linkedInstallment || linkedTrip ? 'warning' : 'expense'}>
                            {linkedInstallment ? th.transaction.installment : linkedTrip ? th.transaction.trip : isIncome ? th.transaction.income : th.transaction.expense}
                          </Badge>
                          <Badge tone={transaction.status === 'pending' ? 'warning' : 'active'}>{getPaymentLabel(transaction)}</Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-500">
                          <span className="font-medium text-slate-600">{transaction.category}</span>
                          <span>•</span>
                          <span>{getSourceLabel(transaction)}</span>
                          {transaction.note && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px] sm:max-w-xs">{transaction.note}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-slate-100 pt-2 md:border-t-0 md:pt-0 md:justify-end">
                      <div className={`text-right text-base sm:text-lg font-bold tracking-tight ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {isIncome ? '+' : '-'}{formatMoney(transaction.amount)}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {!isIncome && manual && (
                          <Button size="sm" onClick={() => onTogglePaid(transaction)}>
                            {transaction.status === 'pending' ? th.transaction.markPaid : th.transaction.markUnpaid}
                          </Button>
                        )}
                        {manual ? (
                          <>
                            <Button size="sm" onClick={() => onDuplicate(transaction)}>ทำซ้ำ</Button>
                            <Button size="sm" onClick={() => onUseTemplate(transaction)}>ต้นแบบ</Button>
                            <Button size="sm" onClick={() => onEdit(transaction)}>{th.common.edit}</Button>
                            <Button size="sm" variant="danger" onClick={() => onDelete(transaction.id)}>{th.common.delete}</Button>
                          </>
                        ) : (
                          <span className="rounded-xl border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-400">
                            {th.transaction.readonly}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
