import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateEntryTotals } from '../lib/finance-calculations'
import { createMemoizedFinanceTotalsSelector } from '../state/financeSelectors'
import { useFinanceData, type FinanceDataStatus, type FinanceImportPreview } from '../state/FinanceDataProvider'
import type { AppData, Budget, FinanceData, Goal, InstallmentPlan, TransactionEntry, Trip, ViewId } from '../types/finance'
import { currentMonthInputValue } from '../utils/formatters'
import { isViewId, resolveInitialView } from '../lib/viewSettings'

export interface FinanceStore {
  activeView: ViewId
  data: AppData
  dataStatus: FinanceDataStatus
  selectedMonth: string
  totals: ReturnType<typeof calculateEntryTotals>
  setActiveView: (viewId: ViewId) => void
  setSelectedMonth: (monthKey: string) => void
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
  markImportSucceeded: (preview: FinanceImportPreview) => void
  markImportFailed: (preview: FinanceImportPreview, errorMessage: string) => void
  replaceData: (data: AppData, message?: string) => FinanceData
}

export function useFinanceStore(): FinanceStore {
  const financeData = useFinanceData()
  const hasUrlView = typeof window !== 'undefined' && isViewId(new URLSearchParams(window.location.search).get('view'))
  const userSelectedView = useRef(hasUrlView)
  const [activeView, setActiveViewState] = useState<ViewId>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const v = params.get('view') as ViewId | null
      return resolveInitialView(v, financeData.data.settings.defaultView)
    }
    return resolveInitialView(null, financeData.data.settings.defaultView)
  })

  useEffect(() => {
    if (userSelectedView.current) return
    const configuredView = resolveInitialView(null, financeData.data.settings.defaultView)
    setActiveViewState((current) => current === configuredView ? current : configuredView)
  }, [financeData.data.settings.defaultView])

  const setActiveView = (viewId: ViewId) => {
    userSelectedView.current = true
    setActiveViewState(viewId)
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location.href)
      url.searchParams.set('view', viewId)
      window.history.replaceState(null, '', url.toString())
    }
  }

  const [selectedMonth, setSelectedMonth] = useState(() => currentMonthInputValue())
  const { data } = financeData

  const selectTotals = useMemo(() => createMemoizedFinanceTotalsSelector(), [])
  const totals = useMemo(
    () => selectTotals(data),
    [data, selectTotals],
  )

  async function previewImportJson(file: File): Promise<FinanceImportPreview | null> {
    return financeData.previewImportDataFromJson(file)
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
    markImportSucceeded: financeData.markImportSucceeded,
    markImportFailed: financeData.markImportFailed,
    replaceData: financeData.replaceData,
  }
}
