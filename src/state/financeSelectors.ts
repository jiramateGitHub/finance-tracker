import { calculateEntryTotals } from '../lib/finance-calculations'
import type { FinanceData } from '../types/finance'

/** Pure selectors for data that is already in the runtime store. */
export function selectFinanceTotals(data: FinanceData): ReturnType<typeof calculateEntryTotals> {
  return calculateEntryTotals(data.transactions, {
    includePending: data.settings.includePendingInMonthlyTotals,
  })
}

export function createMemoizedFinanceTotalsSelector() {
  let previousTransactions: FinanceData['transactions'] | undefined
  let previousIncludePending: boolean | undefined
  let previousResult: ReturnType<typeof calculateEntryTotals> | undefined

  return (data: FinanceData): ReturnType<typeof calculateEntryTotals> => {
    if (
      previousResult
      && previousTransactions === data.transactions
      && previousIncludePending === data.settings.includePendingInMonthlyTotals
    ) {
      return previousResult
    }
    previousTransactions = data.transactions
    previousIncludePending = data.settings.includePendingInMonthlyTotals
    previousResult = selectFinanceTotals(data)
    return previousResult
  }
}
