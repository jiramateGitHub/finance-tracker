/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type Dispatch, type PropsWithChildren, type SetStateAction } from 'react'
import { seedData } from '../data/seedData'
import { createEmptyFinanceData, getDataSchemaVersion, normalizeFinanceData, withUpdatedMeta } from '../lib/dataMigration'
import { createJsonDownload, loadStoredFinanceData, saveStoredFinanceData } from '../lib/storage'
import type { Budget, FinanceData, Goal, InstallmentPlan, TransactionEntry, Trip } from '../types/finance'

export type FinanceDataStatus = {
  saveState: 'idle' | 'saved' | 'error'
  importState: 'idle' | 'success' | 'error'
  message: string
}

export type FinanceDataContextValue = {
  data: FinanceData
  status: FinanceDataStatus
  setData: Dispatch<SetStateAction<FinanceData>>
  replaceData: (nextData: FinanceData, message?: string) => void
  resetData: () => void
  importDataFromJson: (file: File) => Promise<void>
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
  userId?: string
}>

function loadInitialData(userId?: string): FinanceData {
  return loadStoredFinanceData(userId) ?? createEmptyFinanceData()
}

export function FinanceDataProvider({ children, userId }: FinanceDataProviderProps) {
  const [data, setData] = useState<FinanceData>(() => loadInitialData(userId))
  const [status, setStatus] = useState<FinanceDataStatus>({
    saveState: 'idle',
    importState: 'idle',
    message: loadStoredFinanceData(userId) ? 'โหลด cache ของบัญชีนี้แล้ว ระหว่างตรวจสอบ Cloud' : 'กำลังตรวจสอบ Cloud สำหรับบัญชีนี้',
  })

  useEffect(() => {
    try {
      saveStoredFinanceData(data, userId)
    } catch {
      // The next explicit data action will surface a status message in the UI.
    }
  }, [data, userId])

  async function importDataFromJson(file: File): Promise<void> {
    try {
      const rawText = await file.text()
      const parsed = JSON.parse(rawText) as unknown
      const schemaVersion = getDataSchemaVersion(parsed)
      const importedData = normalizeFinanceData(parsed)
      setData(withUpdatedMeta(importedData))
      setStatus({
        saveState: 'saved',
        importState: 'success',
        message: `นำเข้า ${file.name} เป็น schema v${schemaVersion || importedData.schemaVersion} แล้ว`,
      })
    } catch {
      setStatus((current) => ({
        ...current,
        importState: 'error',
        message: 'นำเข้าไม่สำเร็จ กรุณาเลือกไฟล์ JSON ของแอปนี้',
      }))
    }
  }

  function exportDataAsJson(): void {
    createJsonDownload(data)
    setStatus((current) => ({
      ...current,
      message: 'ส่งออก JSON แล้ว',
    }))
  }

  function resetData(): void {
    setData(withUpdatedMeta(seedData))
    setStatus({
      saveState: 'saved',
      importState: 'idle',
      message: 'รีเซ็ตข้อมูลในเครื่องเป็นชุดตัวอย่างแล้ว',
    })
  }

  function replaceData(nextData: FinanceData, message = 'โหลดข้อมูลจาก Cloud ลงเครื่องแล้ว'): void {
    setData(withUpdatedMeta(nextData))
    setStatus({
      saveState: 'saved',
      importState: 'idle',
      message,
    })
  }

  function addTransaction(transaction: TransactionEntry): void {
    setData((current) => withUpdatedMeta({
      ...current,
      // Canonical v2 write target is transactions; entries mirrors it for older UI/helpers only.
      transactions: [transaction, ...current.transactions],
      entries: [transaction, ...current.transactions],
    }))
    setStatus({
      saveState: 'saved',
      importState: 'idle',
      message: 'เพิ่มรายการและบันทึกในเครื่องแล้ว',
    })
  }

  function updateTransaction(transactionId: string, patch: Partial<TransactionEntry>): void {
    setData((current) => {
      const transactions = current.transactions.map((transaction) => (
        transaction.id === transactionId ? { ...transaction, ...patch, updatedAt: new Date().toISOString() } : transaction
      ))
      return withUpdatedMeta({
        ...current,
        // Keep the compatibility alias synchronized, but do not treat it as the source of truth.
        transactions,
        entries: transactions,
      })
    })
    setStatus({
      saveState: 'saved',
      importState: 'idle',
      message: 'แก้ไขรายการและบันทึกในเครื่องแล้ว',
    })
  }

  function deleteTransaction(transactionId: string): void {
    setData((current) => {
      const transactions = current.transactions.filter((transaction) => transaction.id !== transactionId)
      return withUpdatedMeta({
        ...current,
        // Keep the compatibility alias synchronized, but do not treat it as the source of truth.
        transactions,
        entries: transactions,
      })
    })
    setStatus({
      saveState: 'saved',
      importState: 'idle',
      message: 'ลบรายการและบันทึกในเครื่องแล้ว',
    })
  }

  function addInstallmentPlan(plan: InstallmentPlan): void {
    setData((current) => withUpdatedMeta({
      ...current,
      // Canonical v2 write target is installmentPlans; installments mirrors it for legacy compatibility.
      installmentPlans: [plan, ...current.installmentPlans],
      installments: [plan, ...current.installmentPlans],
    }))
    setStatus({
      saveState: 'saved',
      importState: 'idle',
      message: 'เพิ่มแผนผ่อนและบันทึกในเครื่องแล้ว',
    })
  }

  function updateInstallmentPlan(planId: string, patch: Partial<InstallmentPlan>): void {
    setData((current) => {
      const installmentPlans = current.installmentPlans.map((plan) => (
        plan.id === planId ? { ...plan, ...patch, updatedAt: new Date().toISOString() } : plan
      ))
      return withUpdatedMeta({
        ...current,
        // Keep the compatibility alias synchronized, but do not treat it as the source of truth.
        installmentPlans,
        installments: installmentPlans,
      })
    })
    setStatus({
      saveState: 'saved',
      importState: 'idle',
      message: 'แก้ไขแผนผ่อนและบันทึกในเครื่องแล้ว',
    })
  }

  function deleteInstallmentPlan(planId: string): void {
    setData((current) => {
      const installmentPlans = current.installmentPlans.filter((plan) => plan.id !== planId)
      return withUpdatedMeta({
        ...current,
        // Keep the compatibility alias synchronized, but do not treat it as the source of truth.
        installmentPlans,
        installments: installmentPlans,
      })
    })
    setStatus({
      saveState: 'saved',
      importState: 'idle',
      message: 'ลบแผนผ่อนและบันทึกในเครื่องแล้ว',
    })
  }

  function addTrip(trip: Trip): void {
    setData((current) => withUpdatedMeta({
      ...current,
      trips: [trip, ...current.trips],
    }))
    setStatus({
      saveState: 'saved',
      importState: 'idle',
      message: 'เพิ่มทริปและบันทึกในเครื่องแล้ว',
    })
  }

  function updateTrip(tripId: string, patch: Partial<Trip>): void {
    setData((current) => withUpdatedMeta({
      ...current,
      trips: current.trips.map((trip) => (
        trip.id === tripId ? { ...trip, ...patch, updatedAt: new Date().toISOString() } : trip
      )),
    }))
    setStatus({
      saveState: 'saved',
      importState: 'idle',
      message: 'แก้ไขทริปและบันทึกในเครื่องแล้ว',
    })
  }

  function deleteTrip(tripId: string): void {
    setData((current) => withUpdatedMeta({
      ...current,
      trips: current.trips.filter((trip) => trip.id !== tripId),
      budgets: current.budgets.filter((budget) => budget.tripId !== tripId),
    }))
    setStatus({
      saveState: 'saved',
      importState: 'idle',
      message: 'ลบทริปและบันทึกในเครื่องแล้ว',
    })
  }

  function addOrUpdateTripBudgetLine(tripId: string, categoryId: string, amount: number, note?: string): void {
    const now = new Date().toISOString()
    setData((current) => {
      const existingBudget = current.budgets.find((budget) => budget.scope === 'trip' && budget.tripId === tripId)
      const existingLines = existingBudget?.lines?.length
        ? existingBudget.lines
        : existingBudget
          ? [{
            id: existingBudget.id,
            categoryId: existingBudget.categoryId || existingBudget.category || categoryId,
            amount: existingBudget.amount,
            note: existingBudget.note,
          }]
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
      return withUpdatedMeta({
        ...current,
        budgets: existingBudget
          ? current.budgets.map((budget) => budget.id === existingBudget.id ? nextBudget : budget)
          : [nextBudget, ...current.budgets],
      })
    })
    setStatus({
      saveState: 'saved',
      importState: 'idle',
      message: 'อัปเดตงบทริปและบันทึกในเครื่องแล้ว',
    })
  }

  function deleteTripBudgetLine(tripId: string, categoryId: string): void {
    const now = new Date().toISOString()
    setData((current) => {
      const existingBudget = current.budgets.find((budget) => budget.scope === 'trip' && budget.tripId === tripId)
      if (!existingBudget) return current
      const lines = (existingBudget.lines ?? []).filter((line) => line.categoryId !== categoryId)
      if (!lines.length) {
        return withUpdatedMeta({
          ...current,
          budgets: current.budgets.filter((budget) => budget.id !== existingBudget.id),
        })
      }
      const totalAmount = lines.reduce((total, line) => total + Number(line.amount || 0), 0)
      const nextBudget: Budget = {
        ...existingBudget,
        category: lines[0]?.categoryId ?? existingBudget.category,
        categoryId: lines[0]?.categoryId ?? existingBudget.categoryId,
        amount: totalAmount,
        lines,
        updatedAt: now,
      }
      return withUpdatedMeta({
        ...current,
        budgets: current.budgets.map((budget) => budget.id === existingBudget.id ? nextBudget : budget),
      })
    })
    setStatus({
      saveState: 'saved',
      importState: 'idle',
      message: 'ลบงบทริปและบันทึกในเครื่องแล้ว',
    })
  }

  function addBudget(budget: Budget): void {
    setData((current) => withUpdatedMeta({
      ...current,
      budgets: [budget, ...current.budgets],
    }))
    setStatus({
      saveState: 'saved',
      importState: 'idle',
      message: 'เพิ่มงบรายเดือนและบันทึกในเครื่องแล้ว',
    })
  }

  function updateBudget(budgetId: string, patch: Partial<Budget>): void {
    setData((current) => withUpdatedMeta({
      ...current,
      budgets: current.budgets.map((budget) => (
        budget.id === budgetId ? { ...budget, ...patch, updatedAt: new Date().toISOString() } : budget
      )),
    }))
    setStatus({
      saveState: 'saved',
      importState: 'idle',
      message: 'แก้ไขงบรายเดือนและบันทึกในเครื่องแล้ว',
    })
  }

  function deleteBudget(budgetId: string): void {
    setData((current) => withUpdatedMeta({
      ...current,
      budgets: current.budgets.filter((budget) => budget.id !== budgetId),
    }))
    setStatus({
      saveState: 'saved',
      importState: 'idle',
      message: 'ลบงบรายเดือนและบันทึกในเครื่องแล้ว',
    })
  }

  function addGoal(goal: Goal): void {
    setData((current) => withUpdatedMeta({
      ...current,
      goals: [goal, ...current.goals],
    }))
    setStatus({
      saveState: 'saved',
      importState: 'idle',
      message: 'เพิ่มเป้าหมายและบันทึกในเครื่องแล้ว',
    })
  }

  function updateGoal(goalId: string, patch: Partial<Goal>): void {
    setData((current) => withUpdatedMeta({
      ...current,
      goals: current.goals.map((goal) => (
        goal.id === goalId ? { ...goal, ...patch, updatedAt: new Date().toISOString() } : goal
      )),
    }))
    setStatus({
      saveState: 'saved',
      importState: 'idle',
      message: 'แก้ไขเป้าหมายและบันทึกในเครื่องแล้ว',
    })
  }

  function deleteGoal(goalId: string): void {
    setData((current) => withUpdatedMeta({
      ...current,
      goals: current.goals.filter((goal) => goal.id !== goalId),
    }))
    setStatus({
      saveState: 'saved',
      importState: 'idle',
      message: 'ลบเป้าหมายและบันทึกในเครื่องแล้ว',
    })
  }

  const value: FinanceDataContextValue = {
    data,
    status,
    setData,
    replaceData,
    resetData,
    importDataFromJson,
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
