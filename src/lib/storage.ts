import { createExportableFinanceData, normalizeFinanceData } from './dataMigration'
import type { FinanceData } from '../types/finance'

export const FINANCE_STORAGE_KEY = 'finance-tracker-data-v2'

export function createFinanceStorageKey(userId = 'anonymous'): string {
  return `${FINANCE_STORAGE_KEY}:${userId}`
}

export function loadStoredFinanceData(storageKey = FINANCE_STORAGE_KEY): FinanceData | null {
  try {
    const raw = window.localStorage.getItem(storageKey)
    return raw ? normalizeFinanceData(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function saveStoredFinanceData(data: FinanceData, storageKey = FINANCE_STORAGE_KEY): void {
  window.localStorage.setItem(storageKey, JSON.stringify(createExportableFinanceData(data)))
}

export function clearStoredFinanceData(storageKey = FINANCE_STORAGE_KEY): void {
  window.localStorage.removeItem(storageKey)
}

export function createJsonDownload(data: FinanceData): void {
  const exportableData = createExportableFinanceData(data)
  const blob = new Blob([JSON.stringify(exportableData, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  anchor.href = url
  anchor.download = `finance-data-${timestamp}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
