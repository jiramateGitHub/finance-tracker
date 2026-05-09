import type { AppData, Budget, InstallmentPlan, SummaryTotals, TransactionEntry, Trip, TripStatus } from '../types/finance'
import { getMonthKey } from '../utils/formatters'

export function calculateEntryTotals(entries: TransactionEntry[]): SummaryTotals {
  return entries.reduce<SummaryTotals>(
    (totals, entry) => {
      if (entry.type === 'income') {
        totals.income += entry.amount
      } else {
        totals.expense += entry.amount
        if (entry.status === 'pending') totals.pendingExpense += entry.amount
      }
      totals.balance = totals.income - totals.expense
      totals.entryCount += 1
      return totals
    },
    { income: 0, expense: 0, balance: 0, entryCount: 0, pendingExpense: 0 },
  )
}

export function filterEntriesByMonth(entries: TransactionEntry[], monthKey: string): TransactionEntry[] {
  return entries.filter((entry) => getMonthKey(entry.date) === monthKey)
}

export function getInstallmentRemaining(plan: InstallmentPlan): number {
  if (typeof plan.remainingOverride === 'number') return plan.remainingOverride
  return Math.max(0, plan.monthsTotal - plan.monthsPaid) * plan.monthlyAmount
}

export function getInstallmentProgress(plan: InstallmentPlan): number {
  if (!plan.monthsTotal) return 0
  return Math.min(100, Math.round((plan.monthsPaid / plan.monthsTotal) * 100))
}

export function getTripActualTotal(trip: Trip): number {
  return trip.items.reduce((total, item) => total + item.amount, 0)
}

export function getTripBudgetTotal(data: AppData, tripId: string): number {
  const trip = data.trips.find((item) => item.id === tripId)
  const categoryBudgets = data.budgets
    .filter((budget) => budget.scope === 'trip' && budget.tripId === tripId)
    .reduce((total, budget) => total + budget.amount, 0)
  return categoryBudgets || trip?.budget || 0
}

export function getTripStatus(trip: Trip, today = new Date()): TripStatus {
  const startDate = new Date(trip.startDate)
  const endDate = new Date(trip.endDate)
  if (today < startDate) return 'upcoming'
  if (today > endDate) return 'completed'
  return 'ongoing'
}

export function getBudgetUsed(entries: TransactionEntry[], budget: Budget): number {
  if (budget.scope !== 'monthly' || !budget.month) return 0
  return entries
    .filter((entry) => entry.type === 'expense')
    .filter((entry) => getMonthKey(entry.date) === budget.month)
    .filter((entry) => entry.category === budget.category)
    .reduce((total, entry) => total + entry.amount, 0)
}
