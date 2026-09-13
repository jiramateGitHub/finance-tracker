/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from 'react'
import { Button } from '../components/ui/Button'
import { createEmptyFinanceData, getDataSchemaVersion, migrateFinanceDataWithReport, normalizeFinanceData, type FinanceMigrationReport, withUpdatedMeta } from '../lib/dataMigration'
import { analyzeImportedFinanceData, type ImportDiagnostics } from '../lib/importDiagnostics'
import { assertValidFinanceImportPayload, FinanceImportValidationError } from '../lib/importValidation'
import { createJsonDownload } from '../lib/storage'
import { loadFinanceDataFromCloudWithReport } from '../services/firebase/firestoreFinanceRepository'
import type { Budget, FinanceData, Goal, InstallmentPlan, TransactionEntry, Trip } from '../types/finance'
import * as financeCommands from './financeCommands'

export type FinanceDataLoadState = 'loading' | 'ready' | 'error'

export type FinanceDataStatus = {
  loadState: FinanceDataLoadState
  saveState: 'idle' | 'pending' | 'saved' | 'error'
  importState: 'idle' | 'success' | 'error'
  message: string
  errorMessage: string | null
  lastImportDiagnostics: ImportDiagnostics | null
  lastReconciliation: FinanceMigrationReport | null
}

export type FinanceImportPreview = {
  fileName: string
  /** Keep the original JSON in memory so a failed save can be retried without re-reading the file. */
  sourceText: string
  schemaVersion: number | null
  data: FinanceData
  diagnostics: ImportDiagnostics
}

export type FinanceDataContextValue = {
  data: FinanceData
  status: FinanceDataStatus
  replaceData: (nextData: FinanceData, message?: string) => FinanceData
  previewImportDataFromJson: (file: File) => Promise<FinanceImportPreview | null>
  markImportSucceeded: (preview: FinanceImportPreview) => void
  markImportFailed: (preview: FinanceImportPreview, errorMessage: string) => void
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
  lastReconciliation: null,
}

function markLoaded(message: string): FinanceDataStatus {
  return {
    loadState: 'ready',
    saveState: 'idle',
    importState: 'idle',
    message,
    errorMessage: null,
    lastImportDiagnostics: null,
    lastReconciliation: null,
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
        if (userId === 'demo-user') {
          const sampleData = normalizeFinanceData({
            installmentPlans: [
              {
                id: 'p-shopee',
                name: 'ผ่อน Shopee',
                category: 'ผ่อนสินค้า',
                monthlyAmount: 943.46,
                monthsTotal: 10,
                monthsPaid: 9,
                startMonth: '2025-12',
                dueDay: 5,
                interestType: 'none',
                paidMonthKeys: ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'],
              },
              {
                id: 'p-iphone',
                name: 'iPhone 16 Pro Max 256GB',
                category: 'ผ่อนสินค้า',
                monthlyAmount: 4890.00,
                monthsTotal: 10,
                monthsPaid: 0,
                startMonth: '2026-09',
                dueDay: 25,
                interestType: 'none',
                paidMonthKeys: [],
              },
              {
                id: 'p-car',
                name: 'ผ่อนรถยนต์ Honda City',
                category: 'รถยนต์',
                monthlyAmount: 8500.00,
                monthsTotal: 48,
                monthsPaid: 5,
                startMonth: '2026-04',
                dueDay: 10,
                interestType: 'flat',
                interestRate: 2.39,
                paidMonthKeys: ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08'],
              },
              {
                id: 'p-appliance',
                name: 'เครื่องซักผ้า Electrolux',
                category: 'บ้านและที่อยู่อาศัย',
                monthlyAmount: 1800.00,
                monthsTotal: 12,
                monthsPaid: 2,
                startMonth: '2026-07',
                dueDay: 1,
                interestType: 'none',
                paidMonthKeys: ['2026-07', '2026-08'],
              },
            ],
          })
          if (cancelled) return
          setData(sampleData)
          setStatus(markLoaded('โหลดข้อมูลทดสอบแล้ว'))
          return
        }
        const cloudResult = await loadFinanceDataFromCloudWithReport(userId)
        if (cancelled) return
        setData(cloudResult?.data ?? createEmptyFinanceData())
        const reconciliation = cloudResult?.reconciliation ?? null
        const issueCount = reconciliation?.tripOwnership.issues.length ?? 0
        const loadedMessage = cloudResult
          ? 'โหลดข้อมูลจาก Cloud แล้ว'
          : 'ยังไม่มีข้อมูลบน Cloud เริ่มเพิ่มรายการแรกได้เลย'
        setStatus({
          ...markLoaded(loadedMessage),
          lastReconciliation: reconciliation,
          message: issueCount
            ? `โหลดข้อมูลจาก Cloud แล้ว พบ reconciliation ${issueCount} รายการที่ถูก hydrate จาก transaction owner`
            : loadedMessage,
        })
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
          lastReconciliation: null,
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
      const validation = assertValidFinanceImportPayload(parsed)
      const schemaVersion = validation.schemaVersion ?? getDataSchemaVersion(parsed)
      const migration = migrateFinanceDataWithReport(parsed)
      const importedData = withUpdatedMeta(migration.data)
      const diagnostics = analyzeImportedFinanceData(parsed, importedData, file.name, migration.report)
      const preview: FinanceImportPreview = {
        fileName: file.name,
        sourceText: rawText,
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
    } catch (error) {
      const errorMessage = error instanceof FinanceImportValidationError
        ? error.message
        : error instanceof Error
          ? `นำเข้าไม่สำเร็จ: ${error.message}`
          : 'นำเข้าไม่สำเร็จ กรุณาเลือกไฟล์ JSON ของแอปนี้'
      setStatus((current) => ({
        ...current,
        importState: 'error',
        message: errorMessage,
        errorMessage,
        lastImportDiagnostics: null,
      }))
      return null
    }
  }

  function markImportSucceeded(preview: FinanceImportPreview): void {
    setStatus((current) => ({
      ...current,
      loadState: 'ready',
      saveState: 'saved',
      importState: 'success',
      message: `นำเข้า ${preview.fileName} เป็น schema v${preview.schemaVersion || preview.data.schemaVersion} และบันทึกขึ้น Cloud แล้ว`,
      errorMessage: null,
      lastImportDiagnostics: preview.diagnostics,
    }))
  }

  function markImportFailed(preview: FinanceImportPreview, errorMessage: string): void {
    setStatus((current) => ({
      ...current,
      loadState: 'ready',
      saveState: 'error',
      importState: 'error',
      message: `นำเข้า ${preview.fileName} ยังไม่เสร็จ: ${errorMessage} สามารถลองยืนยันอีกครั้งได้`,
      errorMessage,
      lastImportDiagnostics: preview.diagnostics,
    }))
  }

  function exportDataAsJson(): void {
    createJsonDownload(data)
    setStatus((current) => ({
      ...current,
      message: 'ส่งออก JSON แล้ว',
    }))
  }

  const replaceData = useCallback((nextData: FinanceData, message = 'โหลดข้อมูลจาก Cloud แล้ว'): FinanceData => {
    const normalized = withUpdatedMeta(nextData)
    setData(normalized)
    setStatus({
      loadState: 'ready',
      saveState: 'saved',
      importState: 'idle',
      message,
      errorMessage: null,
      lastImportDiagnostics: null,
      lastReconciliation: null,
    })
    return normalized
  }, [])

  function applyCommand(command: financeCommands.FinanceCommand, message: string): void {
    setData((current) => withUpdatedMeta(command(current)))
    setStatus((current) => ({
      ...current,
      loadState: 'ready',
      saveState: 'pending',
      importState: 'idle',
      message,
      errorMessage: null,
    }))
  }

  function addTransaction(transaction: TransactionEntry): void {
    applyCommand((current) => financeCommands.addTransaction(current, transaction), 'เพิ่มรายการแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function updateTransaction(transactionId: string, patch: Partial<TransactionEntry>): void {
    applyCommand((current) => financeCommands.updateTransaction(current, transactionId, patch), 'แก้ไขรายการแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function deleteTransaction(transactionId: string): void {
    applyCommand((current) => financeCommands.deleteTransaction(current, transactionId), 'ลบรายการแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function addInstallmentPlan(plan: InstallmentPlan): void {
    applyCommand((current) => financeCommands.addInstallmentPlan(current, plan), 'เพิ่มแผนผ่อนแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function updateInstallmentPlan(planId: string, patch: Partial<InstallmentPlan>): void {
    applyCommand((current) => financeCommands.updateInstallmentPlan(current, planId, patch), 'แก้ไขแผนผ่อนแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function deleteInstallmentPlan(planId: string): void {
    applyCommand((current) => financeCommands.deleteInstallmentPlan(current, planId), 'ลบแผนผ่อนแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function addTrip(trip: Trip): void {
    applyCommand((current) => financeCommands.addTrip(current, trip), 'เพิ่มทริปแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function updateTrip(tripId: string, patch: Partial<Trip>): void {
    applyCommand((current) => financeCommands.updateTrip(current, tripId, patch), 'แก้ไขทริปแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function deleteTrip(tripId: string): void {
    applyCommand((current) => financeCommands.deleteTrip(current, tripId), 'ลบทริปแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function addOrUpdateTripBudgetLine(tripId: string, categoryId: string, amount: number, note?: string): void {
    applyCommand((current) => financeCommands.addOrUpdateTripBudgetLine(current, tripId, categoryId, amount, note), 'อัปเดตงบทริปแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function deleteTripBudgetLine(tripId: string, categoryId: string): void {
    applyCommand((current) => financeCommands.deleteTripBudgetLine(current, tripId, categoryId), 'ลบงบทริปแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function addBudget(budget: Budget): void {
    applyCommand((current) => financeCommands.addBudget(current, budget), 'เพิ่มงบรายเดือนแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function updateBudget(budgetId: string, patch: Partial<Budget>): void {
    applyCommand((current) => financeCommands.updateBudget(current, budgetId, patch), 'แก้ไขงบรายเดือนแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function deleteBudget(budgetId: string): void {
    applyCommand((current) => financeCommands.deleteBudget(current, budgetId), 'ลบงบรายเดือนแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function addGoal(goal: Goal): void {
    applyCommand((current) => financeCommands.addGoal(current, goal), 'เพิ่มเป้าหมายแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function updateGoal(goalId: string, patch: Partial<Goal>): void {
    applyCommand((current) => financeCommands.updateGoal(current, goalId, patch), 'แก้ไขเป้าหมายแล้ว กำลังรอบันทึกขึ้น Cloud')
  }

  function deleteGoal(goalId: string): void {
    applyCommand((current) => financeCommands.deleteGoal(current, goalId), 'ลบเป้าหมายแล้ว กำลังรอบันทึกขึ้น Cloud')
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
    replaceData,
    previewImportDataFromJson,
    markImportSucceeded,
    markImportFailed,
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
