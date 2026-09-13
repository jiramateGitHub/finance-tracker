import type { SummaryTotals, TransactionEntry } from '../types/finance'

export function calculateEntryTotals(
  entries: TransactionEntry[],
  options: { includePending?: boolean } = {},
): SummaryTotals {
  const includePending = options.includePending ?? true
  return entries.reduce<SummaryTotals>(
    (totals, entry) => {
      if (entry.type === 'income') {
        totals.income += entry.amount
      } else {
        if (entry.status === 'pending') totals.pendingExpense += entry.amount
        if (includePending || entry.status !== 'pending') totals.expense += entry.amount
      }
      totals.balance = totals.income - totals.expense
      totals.entryCount += 1
      return totals
    },
    { income: 0, expense: 0, balance: 0, entryCount: 0, pendingExpense: 0 },
  )
}
