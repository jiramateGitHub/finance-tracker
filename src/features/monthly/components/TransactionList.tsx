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
  onEdit: (transaction: TransactionEntry) => void
  onDelete: (transactionId: string) => void
  onTogglePaid: (transaction: TransactionEntry) => void
}

export function TransactionList({ groups, onEdit, onDelete, onTogglePaid }: TransactionListProps) {
  if (!groups.length) {
    return (
      <EmptyState
        title={th.transaction.noTransactions}
        description={th.transaction.noTransactionsDescription}
      />
    )
  }

  return (
    <div className="grid gap-4">
      {groups.map((group) => (
        <section key={group.monthKey} className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <h3 className="font-extrabold">{formatMonth(group.monthKey)}</h3>
              <p className="text-sm text-slate-500">{group.transactions.length} รายการ</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{formatMoney(group.totals.income)} {th.transaction.income}</span>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">{formatMoney(group.totals.expense)} {th.transaction.expense}</span>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{formatMoney(group.totals.balance)} {th.transaction.balance}</span>
            </div>
          </div>

          <div className="grid gap-2">
            {group.transactions.map((transaction) => {
              const linkedInstallment = isInstallmentTransaction(transaction)
              const linkedTrip = Boolean(transaction.tripId || transaction.sourceModule === 'trip')
              const manual = isManualTransaction(transaction)
              const isIncome = transaction.type === 'income'
              return (
                <article
                  key={transaction.id}
                  className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[112px_minmax(0,1fr)_auto] md:items-center"
                >
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">{formatDate(transaction.date)}</div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate font-extrabold">{transaction.title}</h4>
                      <Badge tone={isIncome ? 'income' : linkedInstallment || linkedTrip ? 'warning' : 'expense'}>
                        {linkedInstallment ? th.transaction.installment : linkedTrip ? th.transaction.trip : isIncome ? th.transaction.income : th.transaction.expense}
                      </Badge>
                      <Badge tone={transaction.status === 'pending' ? 'warning' : 'active'}>{getPaymentLabel(transaction)}</Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
                      <span>{transaction.category}</span>
                      <span>{th.transaction.source}: {getSourceLabel(transaction)}</span>
                      {transaction.note && <span className="truncate">{th.transaction.note}: {transaction.note}</span>}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[auto_auto] md:flex md:items-center md:justify-end">
                    <div className={`text-right text-lg font-extrabold ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {isIncome ? '+' : '-'}{formatMoney(transaction.amount)}
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {!isIncome && manual && (
                        <Button size="sm" onClick={() => onTogglePaid(transaction)}>
                          {transaction.status === 'pending' ? th.transaction.markPaid : th.transaction.markUnpaid}
                        </Button>
                      )}
                      {manual ? (
                        <>
                          <Button size="sm" onClick={() => onEdit(transaction)}>{th.common.edit}</Button>
                          <Button size="sm" variant="danger" onClick={() => onDelete(transaction.id)}>{th.common.delete}</Button>
                        </>
                      ) : (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                          {th.transaction.readonly}
                        </span>
                      )}
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
