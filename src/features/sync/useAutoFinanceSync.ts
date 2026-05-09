import { useCallback, useEffect, useRef, useState } from 'react'
import { createExportableFinanceData, normalizeFinanceData } from '../../lib/dataMigration'
import { th } from '../../i18n/th'
import { loadFinanceDataFromCloud, saveFinanceDataToCloud } from '../../services/firebase/firestoreFinanceRepository'
import type { FinanceData } from '../../types/finance'
import { createFinanceDataFingerprint, mergeFinanceData } from './syncData'
import type { SyncStatus } from './syncTypes'

type ConflictResolution = 'use-cloud' | 'keep-local' | 'merge'

type UseAutoFinanceSyncOptions = {
  userId: string
  data: FinanceData
  replaceData: (nextData: FinanceData, message?: string) => void
}

const AUTO_SAVE_DEBOUNCE_MS = 1800

function createInitialStatus(): SyncStatus {
  return {
    state: 'loading',
    message: th.sync.checking,
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
  const [pendingCloudData, setPendingCloudData] = useState<FinanceData | null>(null)
  const autoSaveEnabledRef = useRef(false)
  const initializedRef = useRef(false)
  const skipNextSaveRef = useRef(false)
  const lastSavedFingerprintRef = useRef<string | null>(null)
  const saveTimerRef = useRef<number | null>(null)
  const latestDataRef = useRef(data)

  useEffect(() => {
    latestDataRef.current = data
  }, [data])

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
        const syncedAt = new Date().toISOString()
        lastSavedFingerprintRef.current = createFinanceDataFingerprint(normalized)
        autoSaveEnabledRef.current = true
        setPendingCloudData(null)
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
        autoSaveEnabledRef.current = true
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
      autoSaveEnabledRef.current = true
      const syncedAt = new Date().toISOString()
      setPendingCloudData(null)
      setStatus({
        state: 'saved',
        message: th.sync.loadManual,
        lastSyncedAt: syncedAt,
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

  const resolveConflict = useCallback(
    async (resolution: ConflictResolution): Promise<void> => {
      if (!pendingCloudData) return

      if (resolution === 'use-cloud') {
        skipNextSaveRef.current = true
        replaceData(pendingCloudData, th.sync.loadManual)
        lastSavedFingerprintRef.current = createFinanceDataFingerprint(pendingCloudData)
        autoSaveEnabledRef.current = true
        setPendingCloudData(null)
        setStatus({
          state: 'saved',
          message: th.sync.usingCloud,
          lastSyncedAt: new Date().toISOString(),
          errorMessage: null,
        })
        return
      }

      const nextData = resolution === 'merge' ? mergeFinanceData(data, pendingCloudData) : data
      if (resolution === 'merge') {
        skipNextSaveRef.current = true
        replaceData(nextData, 'รวมข้อมูล Cloud กับข้อมูลในเครื่องแล้ว')
      }
      await saveNow(nextData, resolution === 'merge' ? th.sync.merged : th.sync.keptLocal)
    },
    [data, pendingCloudData, replaceData, saveNow],
  )

  const markLocalOnly = useCallback((message = th.sync.localPaused): void => {
    clearSaveTimer()
    autoSaveEnabledRef.current = false
    setPendingCloudData(null)
    setStatus((current) => ({
      ...current,
      state: 'local-only',
      message,
      errorMessage: null,
    }))
  }, [clearSaveTimer])

  const enableAutoSave = useCallback((message = th.sync.enabled): void => {
    autoSaveEnabledRef.current = true
    setPendingCloudData(null)
    setStatus((current) => ({
      ...current,
      state: 'idle',
      message,
      errorMessage: null,
    }))
  }, [])

  useEffect(() => {
    let cancelled = false

    async function initializeCloudState(): Promise<void> {
      setStatus(createInitialStatus())
      try {
        const cloudData = await loadFinanceDataFromCloud(userId)
        if (cancelled) return

        initializedRef.current = true
        if (cloudData) {
          const localFingerprint = createFinanceDataFingerprint(latestDataRef.current)
          const cloudFingerprint = createFinanceDataFingerprint(cloudData)
          lastSavedFingerprintRef.current = cloudFingerprint
          if (localFingerprint === cloudFingerprint) {
            autoSaveEnabledRef.current = true
            setPendingCloudData(null)
            setStatus({
              state: 'saved',
              message: th.sync.sameData,
              lastSyncedAt: cloudData.meta.updatedAt,
              errorMessage: null,
            })
            return
          }
          setPendingCloudData(cloudData)
          autoSaveEnabledRef.current = false
          setStatus({
            state: 'conflict',
            message: th.sync.cloudExists,
            lastSyncedAt: cloudData.meta.updatedAt,
            errorMessage: null,
          })
          return
        }

        autoSaveEnabledRef.current = true
        setStatus({
          state: 'idle',
          message: th.sync.noCloud,
          lastSyncedAt: null,
          errorMessage: null,
        })
      } catch (error) {
        if (cancelled) return
        initializedRef.current = true
        autoSaveEnabledRef.current = false
        const errorMessage = error instanceof Error ? error.message : 'ซิงก์ Cloud ไม่สำเร็จ'
        setStatus({
          state: 'error',
          message: errorMessage,
          lastSyncedAt: null,
          errorMessage,
        })
      }
    }

    initializedRef.current = false
    autoSaveEnabledRef.current = false
    lastSavedFingerprintRef.current = null
    clearSaveTimer()
    void initializeCloudState()

    return () => {
      cancelled = true
      clearSaveTimer()
    }
  }, [clearSaveTimer, userId])

  useEffect(() => {
    if (!initializedRef.current || !autoSaveEnabledRef.current || status.state === 'loading' || status.state === 'saving') return

    const fingerprint = createFinanceDataFingerprint(data)
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      lastSavedFingerprintRef.current = fingerprint
      return
    }
    if (fingerprint === lastSavedFingerprintRef.current) return

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
    pendingCloudData,
    saveNow,
    loadNow,
    resolveConflict,
    markLocalOnly,
    enableAutoSave,
  }
}
