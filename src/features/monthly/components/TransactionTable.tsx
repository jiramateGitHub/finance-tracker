import { useSyncExternalStore } from 'react'
import { ActionButton } from '../../../components/ui/ActionButton'
import { Badge } from '../../../components/ui/Badge'
import { EmptyState } from '../../../components/ui/EmptyState'
import { th } from '../../../i18n/th'
import type { TransactionEntry } from '../../../types/finance'
import { formatDate, formatMoney } from '../../../utils/formatters'
import { getPaymentLabel, getSourceLabel, isInstallmentTransaction, isManualTransaction } from '../utils/monthlyLedger'

type TransactionTableProps = {
  transactions: TransactionEntry[]
  highlightedIds?: string[]
  onEdit: (transaction: TransactionEntry) => void
  onDelete: (transactionId: string) => void
  onDuplicate: (transaction: TransactionEntry) => void
  onUseTemplate: (transaction: TransactionEntry) => void
  onTogglePaid: (transaction: TransactionEntry) => void
}

const desktopTableMediaQuery = '(min-width: 768px)'

function subscribeToDesktopTableLayout(onStoreChange: () => void): () => void {
  const mediaQueryList = window.matchMedia(desktopTableMediaQuery)
  mediaQueryList.addEventListener('change', onStoreChange)
  return () => mediaQueryList.removeEventListener('change', onStoreChange)
}

function getDesktopTableLayoutSnapshot(): boolean {
  return window.matchMedia(desktopTableMediaQuery).matches
}

function getServerTableLayoutSnapshot(): boolean {
  return false
}

function useDesktopTableLayout(): boolean {
  return useSyncExternalStore(
    subscribeToDesktopTableLayout,
    getDesktopTableLayoutSnapshot,
    getServerTableLayoutSnapshot,
  )
}

export function TransactionTable({
  transactions,
  highlightedIds = [],
  onEdit,
  onDelete,
  onDuplicate,
  onUseTemplate,
  onTogglePaid,
}: TransactionTableProps) {
  const isDesktopLayout = useDesktopTableLayout()

  if (!transactions.length) {
    return (
      <EmptyState
        title={th.transaction.noTransactions}
        description={th.transaction.noTransactionsDescription}
      />
    )
  }

  return (
    <>
      {!isDesktopLayout && <div className="space-y-3">
        {transactions.map((transaction) => {
          const linkedInstallment = isInstallmentTransaction(transaction)
          const linkedTrip = Boolean(transaction.tripId || transaction.sourceModule === 'trip')
          const manual = isManualTransaction(transaction)
          const isIncome = transaction.type === 'income'
          const highlighted = highlightedIds.includes(transaction.id)

          return (
            <article
              key={transaction.id}
              className={`rounded-2xl border p-3.5 shadow-xs transition-all duration-150 ${
                highlighted
                  ? 'border-amber-300 bg-amber-50/70 shadow-sm'
                  : 'border-slate-200/90 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-1">
                    <span className="font-semibold text-slate-700">{formatDate(transaction.date)}</span>
                    <span>•</span>
                    <span>{transaction.category}</span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{transaction.title}</h4>
                  {transaction.note && (
                    <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{transaction.note}</p>
                  )}
                </div>
                <div className={`text-right text-base font-extrabold tabular-nums shrink-0 ${isIncome ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {isIncome ? '+' : '-'}{formatMoney(transaction.amount)}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge tone={isIncome ? 'income' : linkedInstallment || linkedTrip ? 'warning' : 'expense'}>
                  {linkedInstallment ? th.transaction.installment : linkedTrip ? th.transaction.trip : isIncome ? th.transaction.income : th.transaction.expense}
                </Badge>
                <Badge tone={transaction.status === 'pending' ? 'warning' : 'active'}>{getPaymentLabel(transaction)}</Badge>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                {!isIncome && manual ? (
                  <ActionButton
                    action="pay"
                    isPaid={transaction.status === 'cleared'}
                    label={transaction.status === 'pending' ? th.transaction.markPaid : th.transaction.markUnpaid}
                    onClick={() => onTogglePaid(transaction)}
                  />
                ) : (
                  <span className="text-sm text-slate-500 font-medium">
                    {isIncome ? 'รายรับ' : th.transaction.readonly}
                  </span>
                )}

                {manual ? (
                  <div className="flex items-center gap-1">
                    <ActionButton action="duplicate" iconOnly title="ทำซ้ำ" onClick={() => onDuplicate(transaction)} />
                    <ActionButton action="template" iconOnly title="ต้นแบบ" onClick={() => onUseTemplate(transaction)} />
                    <ActionButton action="edit" iconOnly title={th.common.edit} onClick={() => onEdit(transaction)} />
                    <ActionButton action="delete" iconOnly title={th.common.delete} onClick={() => onDelete(transaction.id)} />
                  </div>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>}

      {isDesktopLayout && <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">วันที่</th>
                <th className="py-3 px-4">รายการ / หมายเหตุ</th>
                <th className="py-3 px-3">หมวดหมู่</th>
                <th className="py-3 px-3">ที่มา</th>
                <th className="py-3 px-3">สถานะ</th>
                <th className="py-3 px-4 text-right">จำนวนเงิน</th>
                <th className="py-3 px-4 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((transaction) => {
                const manual = isManualTransaction(transaction)
                const isIncome = transaction.type === 'income'
                const highlighted = highlightedIds.includes(transaction.id)

                return (
                  <tr
                    key={transaction.id}
                    className={`transition-colors ${
                      highlighted ? 'bg-amber-50/80' : 'hover:bg-blue-50/30'
                    }`}
                  >
                    {/* Date */}
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {formatDate(transaction.date)}
                    </td>

                    {/* Title & Note */}
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="font-bold truncate max-w-[220px]" title={transaction.title}>
                        {transaction.title}
                      </div>
                      {transaction.note && (
                        <div className="text-sm text-slate-500 font-normal truncate max-w-[220px]" title={transaction.note}>
                          {transaction.note}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <Badge tone="neutral">
                        {transaction.category}
                      </Badge>
                    </td>

                    {/* Source */}
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500">
                      {getSourceLabel(transaction)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <Badge tone={transaction.status === 'pending' ? 'warning' : 'active'}>
                        {getPaymentLabel(transaction)}
                      </Badge>
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-sm tabular-nums">
                      <span className={isIncome ? 'text-emerald-700' : 'text-rose-700'}>
                        {isIncome ? '+' : '-'}{formatMoney(transaction.amount)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {!isIncome && manual && (
                          <ActionButton
                            action="pay"
                            size="sm"
                            isPaid={transaction.status === 'cleared'}
                            label={transaction.status === 'pending' ? th.transaction.markPaid : th.transaction.markUnpaid}
                            onClick={() => onTogglePaid(transaction)}
                          />
                        )}
                        {manual ? (
                          <>
                            <ActionButton action="duplicate" iconOnly title="ทำซ้ำ" onClick={() => onDuplicate(transaction)} />
                            <ActionButton action="template" iconOnly title="ใช้เป็นต้นแบบ" onClick={() => onUseTemplate(transaction)} />
                            <ActionButton action="edit" iconOnly title={th.common.edit} onClick={() => onEdit(transaction)} />
                            <ActionButton action="delete" iconOnly title={th.common.delete} onClick={() => onDelete(transaction.id)} />
                          </>
                        ) : (
                          <Badge tone="neutral" className="text-slate-500">
                            {th.transaction.readonly}
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>}
    </>
  )
}
