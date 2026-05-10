import { useMemo, useState } from 'react'
import { calculateEntryTotals } from '../lib/finance-calculations'
import { useFinanceData, type FinanceDataStatus, type FinanceImportPreview } from '../state/FinanceDataProvider'
import type { AppData, Budget, FinanceData, Goal, InstallmentPlan, TransactionEntry, Trip, ViewId } from '../types/finance'
import { currentDateInputValue, currentIsoTimestamp } from '../utils/formatters'

export interface FinanceStore {
  activeView: ViewId
  data: AppData
  dataStatus: FinanceDataStatus
  selectedMonth: string
  totals: ReturnType<typeof calculateEntryTotals>
  setActiveView: (viewId: ViewId) => void
  setSelectedMonth: (monthKey: string) => void
  addDraftExpense: () => void
  addTransaction: (transaction: TransactionEntry) => void
  updateTransaction: (transactionId: string, patch: Partial<TransactionEntry>) => void
  deleteTransaction: (transactionId: string) => void
  addInstallmentPlan: (plan: InstallmentPlan) => void
  updateInstallmentPlan: (planId: string, patch: Partial<InstallmentPlan>) => void
  deleteInstallmentPlan: (planId: string) => void
  addTrip: (trip: Trip) => void
  updateTrip: (tripId: string, patch: Partial<Trip>) => void
  deleteTrip: (tripId: string) => void
  addOrUpdateTripBudgetLine: (tripId: string, categoryId: string, amount: number, note?: string) => void
  deleteTripBudgetLine: (tripId: string, categoryId: string) => void
  addBudget: (budget: Budget) => void
  updateBudget: (budgetId: string, patch: Partial<Budget>) => void
  deleteBudget: (budgetId: string) => void
  addGoal: (goal: Goal) => void
  updateGoal: (goalId: string, patch: Partial<Goal>) => void
  deleteGoal: (goalId: string) => void
  exportJson: () => void
  previewImportJson: (file: File) => Promise<FinanceImportPreview | null>
  applyImportedJson: (preview: FinanceImportPreview) => FinanceData
  replaceData: (data: AppData, message?: string) => FinanceData
}

function createExpenseDraft(): TransactionEntry {
  const now = currentIsoTimestamp()
  return {
    id: crypto.randomUUID(),
    type: 'expense',
    date: currentDateInputValue(),
    monthKey: currentDateInputValue().slice(0, 7),
    category: 'อื่นๆ',
    categoryId: 'อื่นๆ',
    title: 'Draft expense from React scaffold',
    amount: 100,
    currency: 'THB',
    note: 'Real add/edit transaction logic belongs in a later phase.',
    status: 'pending',
    source: 'manual',
    sourceModule: 'manual',
    createdAt: now,
    updatedAt: now,
  }
}

export function useFinanceStore(): FinanceStore {
  const financeData = useFinanceData()
  const [activeView, setActiveView] = useState<ViewId>('monthly')
  const [selectedMonth, setSelectedMonth] = useState(() => currentDateInputValue().slice(0, 7))
  const { data } = financeData

  const totals = useMemo(() => calculateEntryTotals(data.entries), [data.entries])

  function addDraftExpense(): void {
    financeData.addTransaction(createExpenseDraft())
  }

  async function previewImportJson(file: File): Promise<FinanceImportPreview | null> {
    return financeData.previewImportDataFromJson(file)
  }

  function applyImportedJson(preview: FinanceImportPreview): FinanceData {
    return financeData.applyImportedData(preview)
  }

  function exportJson(): void {
    financeData.exportDataAsJson()
  }

  return {
    activeView,
    data,
    dataStatus: financeData.status,
    selectedMonth,
    totals,
    setActiveView,
    setSelectedMonth,
    addDraftExpense,
    addTransaction: financeData.addTransaction,
    updateTransaction: financeData.updateTransaction,
    deleteTransaction: financeData.deleteTransaction,
    addInstallmentPlan: financeData.addInstallmentPlan,
    updateInstallmentPlan: financeData.updateInstallmentPlan,
    deleteInstallmentPlan: financeData.deleteInstallmentPlan,
    addTrip: financeData.addTrip,
    updateTrip: financeData.updateTrip,
    deleteTrip: financeData.deleteTrip,
    addOrUpdateTripBudgetLine: financeData.addOrUpdateTripBudgetLine,
    deleteTripBudgetLine: financeData.deleteTripBudgetLine,
    addBudget: financeData.addBudget,
    updateBudget: financeData.updateBudget,
    deleteBudget: financeData.deleteBudget,
    addGoal: financeData.addGoal,
    updateGoal: financeData.updateGoal,
    deleteGoal: financeData.deleteGoal,
    exportJson,
    previewImportJson,
    applyImportedJson,
    replaceData: financeData.replaceData,
  }
}


