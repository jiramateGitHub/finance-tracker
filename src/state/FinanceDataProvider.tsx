/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState, type Dispatch, type PropsWithChildren, type SetStateAction } from 'react'
import { Button } from '../components/ui/Button'
import { createEmptyFinanceData, getDataSchemaVersion, normalizeFinanceData, withUpdatedMeta } from '../lib/dataMigration'
import { analyzeImportedFinanceData, type ImportDiagnostics } from '../lib/importDiagnostics'
import { createJsonDownload } from '../lib/storage'
import { loadFinanceDataFromCloud } from '../services/firebase/firestoreFinanceRepository'
import type { Budget, FinanceData, Goal, InstallmentPlan, TransactionEntry, Trip } from '../types/finance'

export type FinanceDataLoadState = 'loading' | 'ready' | 'error'

export type FinanceDataStatus = {
  loadState: FinanceDataLoadState
  saveState: 'idle' | 'saved' | 'error'
  importState: 'idle' | 'success' | 'error'
  message: string
  errorMessage: string | null
  lastImportDiagnostics: ImportDiagnostics | null
}

export type FinanceImportPreview = {
  fileName: string
  schemaVersion: number | null
  data: FinanceData
  diagnostics: ImportDiagnostics
}

export type FinanceDataContextValue = {
  data: FinanceData
  status: FinanceDataStatus
  setData: Dispatch<SetStateAction<FinanceData>>
  replaceData: (nextData: FinanceData, message?: string) => FinanceData
  previewImportDataFromJson: (file: File) => Promise<FinanceImportPreview | null>
  applyImportedData: (preview: FinanceImportPreview) => FinanceData
  exportDataAsJson: () => void
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
}

const FinanceDataContext = createContext<FinanceDataContextValue | null>(null)

type FinanceDataProviderProps = PropsWithChildren<{
  userId: string
}>

const loadingStatus: FinanceDataStatus = {
  loadState: 'loading',
  saveState: 'idle',
  importState: 'idle',
  message: 'กำลังโหลดข้อมูลจาก Cloud...',
  errorMessage: null,
  lastImportDiagnostics: null,
}

function markLoaded(message: string): FinanceDataStatus {
  return {
    loadState: 'ready',
    saveState: 'idle',
    importState: 'idle',
    message,
    errorMessage: null,
    lastImportDiagnostics: null,
  }
}

export function FinanceDataProvider({ children, userId }: FinanceDataProviderProps) {
  const [data, setData] = useState<FinanceData>(() => createEmptyFinanceData())
  const [status, setStatus] = useState<FinanceDataStatus>(loadingStatus)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadCloudData(): Promise<void> {
      setStatus(loadingStatus)
      try {
        const cloudData = await loadFinanceDataFromCloud(userId)
        if (cancelled) return
        setData(cloudData ? normalizeFinanceData(cloudData) : createEmptyFinanceData())
        setStatus(markLoaded(cloudData ? 'โหลดข้อมูลจาก Cloud แล้ว' : 'ยังไม่มีข้อมูลบน Cloud เริ่มเพิ่มรายการแรกได้เลย'))
      } catch (error) {
        if (cancelled) return
        const errorMessage = error instanceof Error ? error.message : 'โหลดข้อมูลจาก Cloud ไม่สำเร็จ'
        setData(createEmptyFinanceData())
        setStatus({
          loadState: 'error',
          saveState: 'error',
          importState: 'idle',
          message: errorMessage,
          errorMessage,
          lastImportDiagnostics: null,
        })
      }
    }

    void loadCloudData()
    return () => {
      cancelled = true
    }
  }, [reloadToken, userId])

  const retryLoad = useCallback(() => setReloadToken((current) => current + 1), [])

  async function previewImportDataFromJson(file: File): Promise<FinanceImportPreview | null> {
    try {
      const rawText = await file.text()
      const parsed = JSON.parse(rawText) as unknown
      const schemaVersion = getDataSchemaVersion(parsed)
      const importedData = withUpdatedMeta(normalizeFinanceData(parsed))
      const diagnostics = analyzeImportedFinanceData(parsed, importedData, file.name)
      const preview: FinanceImportPreview = {
        fileName: file.name,
        schemaVersion,
        data: importedData,
        diagnostics,
      }
      setStatus((current) => ({
        ...current,
        loadState: 'ready',
        importState: 'idle',
        message: `ตรวจสอบไฟล์ ${file.name} แล้ว โปรดยืนยันก่อนนำเข้าและบันทึกขึ้น Cloud`,
        errorMessage: null,
        lastImportDiagnostics: diagnostics,
      }))
      return preview
    } catch {
      setStatus((current) => ({
        ...current,
        importState: 'error',
        message: 'นำเข้าไม่สำเร็จ กรุณาเลือกไฟล์ JSON ของแอปนี้',
        errorMessage: 'นำเข้าไม่สำเร็จ กรุณาเลือกไฟล์ JSON ของแอปนี้',
        lastImportDiagnostics: null,
      }))
      return null
    }
  }

  function applyImportedData(preview: FinanceImportPreview): FinanceData {
    setData(preview.data)
    setStatus({
      loadState: 'ready',
      saveState: 'saved',
      importState: 'success',
      message: `นำเข้า ${preview.fileName} เป็น schema v${preview.schemaVersion || preview.data.schemaVersion} แล้ว`,
      errorMessage: null,
      lastImportDiagnostics: preview.diagnostics,
    })
    return preview.data
  }

  function exportDataAsJson(): void {
    createJsonDownload(data)
    setStatus((current) => ({
      ...current,
      message: 'ส่งออก JSON แล้ว',
    }))
  }

  function replaceData(nextData: FinanceData, message = 'โหลดข้อมูลจาก Cloud แล้ว'): FinanceData {
    const normalized = withUpdatedMeta(nextData)
    setData(normalized)
    setStatus({
      loadState: 'ready',
      saveState: 'saved',
      importState: 'idle',
      message,
      errorMessage: null,
      lastImportDiagnostics: null,
    })
    return normalized
  }

  function updateData(updater: (current: FinanceData) => FinanceData, message: string): void {
    setData((current) => withUpdatedMeta(updater(current)))
    setStatus((current) => ({
      ...current,
      loadState: 'ready',
      saveState: 'saved',
      importState: 'idle',
      message,
      errorMessage: null,
    }))
  }

  function addTransaction(transaction: TransactionEntry): void {
    updateData((current) => ({
      ...current,
      transactions: [transaction, ...current.transactions],
      entries: [transaction, ...current.transactions],
    }), 'เพิ่มรายการแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function updateTransaction(transactionId: string, patch: Partial<TransactionEntry>): void {
    updateData((current) => {
      const transactions = current.transactions.map((transaction) => (
        transaction.id === transactionId ? { ...transaction, ...patch, updatedAt: new Date().toISOString() } : transaction
      ))
      return { ...current, transactions, entries: transactions }
    }, 'แก้ไขรายการแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function deleteTransaction(transactionId: string): void {
    updateData((current) => {
      const transactions = current.transactions.filter((transaction) => transaction.id !== transactionId)
      return { ...current, transactions, entries: transactions }
    }, 'ลบรายการแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function addInstallmentPlan(plan: InstallmentPlan): void {
    updateData((current) => ({
      ...current,
      installmentPlans: [plan, ...current.installmentPlans],
      installments: [plan, ...current.installmentPlans],
    }), 'เพิ่มแผนผ่อนแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function updateInstallmentPlan(planId: string, patch: Partial<InstallmentPlan>): void {
    updateData((current) => {
      const installmentPlans = current.installmentPlans.map((plan) => (
        plan.id === planId ? { ...plan, ...patch, updatedAt: new Date().toISOString() } : plan
      ))
      return { ...current, installmentPlans, installments: installmentPlans }
    }, 'แก้ไขแผนผ่อนแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function deleteInstallmentPlan(planId: string): void {
    updateData((current) => {
      const installmentPlans = current.installmentPlans.filter((plan) => plan.id !== planId)
      return { ...current, installmentPlans, installments: installmentPlans }
    }, 'ลบแผนผ่อนแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function addTrip(trip: Trip): void {
    updateData((current) => ({ ...current, trips: [trip, ...current.trips] }), 'เพิ่มทริปแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function updateTrip(tripId: string, patch: Partial<Trip>): void {
    updateData((current) => ({
      ...current,
      trips: current.trips.map((trip) => trip.id === tripId ? { ...trip, ...patch, updatedAt: new Date().toISOString() } : trip),
    }), 'แก้ไขทริปแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function deleteTrip(tripId: string): void {
    updateData((current) => ({
      ...current,
      trips: current.trips.filter((trip) => trip.id !== tripId),
      budgets: current.budgets.filter((budget) => budget.tripId !== tripId),
    }), 'ลบทริปแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function addOrUpdateTripBudgetLine(tripId: string, categoryId: string, amount: number, note?: string): void {
    const now = new Date().toISOString()
    updateData((current) => {
      const existingBudget = current.budgets.find((budget) => budget.scope === 'trip' && budget.tripId === tripId)
      const existingLines = existingBudget?.lines?.length
        ? existingBudget.lines
        : existingBudget
          ? [{ id: existingBudget.id, categoryId: existingBudget.categoryId || existingBudget.category || categoryId, amount: existingBudget.amount, note: existingBudget.note }]
          : []
      const lineExists = existingLines.some((line) => line.categoryId === categoryId)
      const lines = lineExists
        ? existingLines.map((line) => line.categoryId === categoryId ? { ...line, amount, note } : line)
        : [...existingLines, { id: crypto.randomUUID(), categoryId, amount, note }]
      const totalAmount = lines.reduce((total, line) => total + Number(line.amount || 0), 0)
      const nextBudget: Budget = {
        id: existingBudget?.id ?? crypto.randomUUID(),
        scope: 'trip',
        name: 'งบทริป',
        tripId,
        category: lines[0]?.categoryId ?? categoryId,
        categoryId: lines[0]?.categoryId ?? categoryId,
        amount: totalAmount,
        lines,
        alertThresholds: existingBudget?.alertThresholds?.length ? existingBudget.alertThresholds : [0.8, 1],
        enabled: existingBudget?.enabled !== false,
        note: existingBudget?.note,
        createdAt: existingBudget?.createdAt ?? now,
        updatedAt: now,
      }
      return {
        ...current,
        budgets: existingBudget
          ? current.budgets.map((budget) => budget.id === existingBudget.id ? nextBudget : budget)
          : [nextBudget, ...current.budgets],
      }
    }, 'อัปเดตงบทริปแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function deleteTripBudgetLine(tripId: string, categoryId: string): void {
    const now = new Date().toISOString()
    updateData((current) => {
      const existingBudget = current.budgets.find((budget) => budget.scope === 'trip' && budget.tripId === tripId)
      if (!existingBudget) return current
      const lines = (existingBudget.lines ?? []).filter((line) => line.categoryId !== categoryId)
      if (!lines.length) return { ...current, budgets: current.budgets.filter((budget) => budget.id !== existingBudget.id) }
      const totalAmount = lines.reduce((total, line) => total + Number(line.amount || 0), 0)
      const nextBudget: Budget = {
        ...existingBudget,
        category: lines[0]?.categoryId ?? existingBudget.category,
        categoryId: lines[0]?.categoryId ?? existingBudget.categoryId,
        amount: totalAmount,
        lines,
        updatedAt: now,
      }
      return { ...current, budgets: current.budgets.map((budget) => budget.id === existingBudget.id ? nextBudget : budget) }
    }, 'ลบงบทริปแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function addBudget(budget: Budget): void {
    updateData((current) => ({ ...current, budgets: [budget, ...current.budgets] }), 'เพิ่มงบรายเดือนแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function updateBudget(budgetId: string, patch: Partial<Budget>): void {
    updateData((current) => ({
      ...current,
      budgets: current.budgets.map((budget) => budget.id === budgetId ? { ...budget, ...patch, updatedAt: new Date().toISOString() } : budget),
    }), 'แก้ไขงบรายเดือนแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function deleteBudget(budgetId: string): void {
    updateData((current) => ({ ...current, budgets: current.budgets.filter((budget) => budget.id !== budgetId) }), 'ลบงบรายเดือนแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function addGoal(goal: Goal): void {
    updateData((current) => ({ ...current, goals: [goal, ...current.goals] }), 'เพิ่มเป้าหมายแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function updateGoal(goalId: string, patch: Partial<Goal>): void {
    updateData((current) => ({
      ...current,
      goals: current.goals.map((goal) => goal.id === goalId ? { ...goal, ...patch, updatedAt: new Date().toISOString() } : goal),
    }), 'แก้ไขเป้าหมายแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function deleteGoal(goalId: string): void {
    updateData((current) => ({ ...current, goals: current.goals.filter((goal) => goal.id !== goalId) }), 'ลบเป้าหมายแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  if (status.loadState === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-finance-bg px-4 text-center">
        <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-finance-sm">
          <div className="text-lg font-extrabold text-slate-900">กำลังโหลดข้อมูลจาก Cloud...</div>
          <p className="mt-2 text-sm font-bold text-slate-500">ระบบกำลังดึงข้อมูลของบัญชีนี้จาก Firestore</p>
        </div>
      </div>
    )
  }

  if (status.loadState === 'error') {
    return (
      <div className="grid min-h-screen place-items-center bg-finance-bg px-4 text-center">
        <div className="max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-finance-sm">
          <div className="text-lg font-extrabold text-rose-700">โหลดข้อมูลจาก Cloud ไม่สำเร็จ</div>
          <p className="mt-2 text-sm font-bold text-slate-500">{status.errorMessage}</p>
          <Button type="button" variant="primary" className="mt-4" onClick={retryLoad}>ลองอีกครั้ง</Button>
        </div>
      </div>
    )
  }

  const value: FinanceDataContextValue = {
    data,
    status,
    setData,
    replaceData,
    previewImportDataFromJson,
    applyImportedData,
    exportDataAsJson,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addInstallmentPlan,
    updateInstallmentPlan,
    deleteInstallmentPlan,
    addTrip,
    updateTrip,
    deleteTrip,
    addOrUpdateTripBudgetLine,
    deleteTripBudgetLine,
    addBudget,
    updateBudget,
    deleteBudget,
    addGoal,
    updateGoal,
    deleteGoal,
  }

  return <FinanceDataContext.Provider value={value}>{children}</FinanceDataContext.Provider>
}

export function useFinanceData(): FinanceDataContextValue {
  const context = useContext(FinanceDataContext)
  if (!context) throw new Error('useFinanceData must be used within FinanceDataProvider')
  return context
}


