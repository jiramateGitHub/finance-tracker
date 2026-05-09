import { createExportableFinanceData, normalizeFinanceData } from './dataMigration'
import type { FinanceData } from '../types/finance'

export const FINANCE_STORAGE_KEY = 'finance-tracker:data:v2'

export function createFinanceStorageKey(userId?: string): string {
  return userId ? `finance-tracker:${userId}:cache:v2` : FINANCE_STORAGE_KEY
}

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

export function loadStoredFinanceData(userId?: string): FinanceData | null {
  const storage = getLocalStorage()
  const storageKey = createFinanceStorageKey(userId)
  const rawValue = storage?.getItem(storageKey)
  if (!rawValue) return null

  try {
    return normalizeFinanceData(JSON.parse(rawValue))
  } catch {
    storage?.removeItem(storageKey)
    return null
  }
}

export function saveStoredFinanceData(data: FinanceData, userId?: string): void {
  const storage = getLocalStorage()
  if (!storage) return

  // Firebase remains the source of truth after login; localStorage is only a per-user cache/offline fallback.
  storage.setItem(createFinanceStorageKey(userId), JSON.stringify(createExportableFinanceData(data), null, 2))
}

export function clearStoredFinanceData(userId?: string): void {
  getLocalStorage()?.removeItem(createFinanceStorageKey(userId))
}

export function createJsonDownload(data: FinanceData): void {
  const exportData = createExportableFinanceData(data)
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `finance-tracker-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
