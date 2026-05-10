import { useCallback, useEffect, useRef, useState } from 'react'
import { createExportableFinanceData, normalizeFinanceData } from '../../lib/dataMigration'
import { th } from '../../i18n/th'
import { loadFinanceDataFromCloud, saveFinanceDataToCloud } from '../../services/firebase/firestoreFinanceRepository'
import type { FinanceData } from '../../types/finance'
import { currentIsoTimestamp } from '../../utils/formatters'
import { createFinanceDataFingerprint } from './syncData'
import type { SyncStatus } from './syncTypes'

type UseAutoFinanceSyncOptions = {
  userId: string
  data: FinanceData
  replaceData: (nextData: FinanceData, message?: string) => void
}

const AUTO_SAVE_DEBOUNCE_MS = 1800

function createInitialStatus(): SyncStatus {
  return {
    state: 'idle',
    message: th.sync.idle,
    lastSyncedAt: null,
    errorMessage: null,
  }
}

function validateNormalizedData(data: FinanceData): FinanceData {
  const normalized = normalizeFinanceData(data)
  const exportable = createExportableFinanceData(normalized)
  const collections = [
    exportable.transactions,
    exportable.recurringRules,
    exportable.installmentPlans,
    exportable.trips,
    exportable.budgets,
    exportable.goals,
  ]
  const hasInvalidItem = collections.some((items) => items.some((item) => typeof item.id !== 'string' || !item.id.trim()))
  if (hasInvalidItem) throw new Error('ไม่สามารถบันทึกขึ้น Cloud เพราะข้อมูลบางรายการไม่มี id')
  return normalized
}

export function useAutoFinanceSync({ userId, data, replaceData }: UseAutoFinanceSyncOptions) {
  const [status, setStatus] = useState<SyncStatus>(createInitialStatus)
  const lastSavedFingerprintRef = useRef<string | null>(createFinanceDataFingerprint(data))
  const saveTimerRef = useRef<number | null>(null)
  const skipNextSaveRef = useRef(true)

  const clearSaveTimer = useCallback(() => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = null
  }, [])

  const saveNow = useCallback(
    async (sourceData: FinanceData = data, message = th.sync.savedManual): Promise<boolean> => {
      clearSaveTimer()
      setStatus((current) => ({
        ...current,
        state: 'saving',
        message: th.sync.saving,
        errorMessage: null,
      }))
      try {
        const normalized = validateNormalizedData(sourceData)
        await saveFinanceDataToCloud(userId, normalized)
        const syncedAt = currentIsoTimestamp()
        lastSavedFingerprintRef.current = createFinanceDataFingerprint(normalized)
        setStatus({
          state: 'saved',
          message,
          lastSyncedAt: syncedAt,
          errorMessage: null,
        })
        return true
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'บันทึกขึ้น Cloud ไม่สำเร็จ'
        setStatus((current) => ({
          ...current,
          state: 'error',
          message: errorMessage,
          errorMessage,
        }))
        return false
      }
    },
    [clearSaveTimer, data, userId],
  )

  const loadNow = useCallback(async (): Promise<boolean> => {
    clearSaveTimer()
    setStatus((current) => ({
      ...current,
      state: 'loading',
      message: th.sync.loading,
      errorMessage: null,
    }))
    try {
      const cloudData = await loadFinanceDataFromCloud(userId)
      if (!cloudData) {
        setStatus((current) => ({
          ...current,
          state: 'idle',
          message: th.sync.noCloud,
          errorMessage: null,
        }))
        return false
      }
      skipNextSaveRef.current = true
      replaceData(cloudData, th.sync.loadManual)
      lastSavedFingerprintRef.current = createFinanceDataFingerprint(cloudData)
      setStatus({
        state: 'saved',
        message: th.sync.loadManual,
        lastSyncedAt: currentIsoTimestamp(),
        errorMessage: null,
      })
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'โหลดจาก Cloud ไม่สำเร็จ'
      setStatus((current) => ({
        ...current,
        state: 'error',
        message: errorMessage,
        errorMessage,
      }))
      return false
    }
  }, [clearSaveTimer, replaceData, userId])

  const enableAutoSave = useCallback((message = th.sync.enabled): void => {
    setStatus((current) => ({
      ...current,
      state: 'idle',
      message,
      errorMessage: null,
    }))
  }, [])

  useEffect(() => {
    lastSavedFingerprintRef.current = null
    skipNextSaveRef.current = true
    return clearSaveTimer
  }, [clearSaveTimer, userId])

  useEffect(() => {
    const fingerprint = createFinanceDataFingerprint(data)
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      lastSavedFingerprintRef.current = fingerprint
      return
    }
    if (fingerprint === lastSavedFingerprintRef.current || status.state === 'loading' || status.state === 'saving') return

    clearSaveTimer()
    setStatus((current) => ({
      ...current,
      state: 'idle',
      message: th.sync.pendingSave,
      errorMessage: null,
    }))
    saveTimerRef.current = window.setTimeout(() => {
      void saveNow(data, th.sync.autosaved)
    }, AUTO_SAVE_DEBOUNCE_MS)

    return clearSaveTimer
  }, [clearSaveTimer, data, saveNow, status.state])

  return {
    status,
    saveNow,
    loadNow,
    enableAutoSave,
  }
}
