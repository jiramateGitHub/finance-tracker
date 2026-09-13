import { useCallback, useEffect, useRef, useState } from 'react'
import { createExportableFinanceData, normalizeFinanceData } from '../../lib/dataMigration'
import { th } from '../../i18n/th'
import { loadFinanceDataFromCloudWithReport, saveFinanceDataToCloud } from '../../services/firebase/firestoreFinanceRepository'
import { FinanceDataConflictError } from '../../services/financeRepository'
import type { FinanceData } from '../../types/finance'
import { currentIsoTimestamp } from '../../utils/formatters'
import { FinanceSyncCoordinator, runWithBoundedRetry } from './syncCoordinator'
import { createFinanceDataFingerprint } from './syncData'
import type { SyncStatus } from './syncTypes'

type UseAutoFinanceSyncOptions = {
  userId: string
  data: FinanceData
  replaceData: (nextData: FinanceData, message?: string) => FinanceData
}

type SaveOptions = {
  replace?: boolean
}

type LoadOptions = {
  /** Explicit conflict recovery may discard dirty local edits after backup. */
  discardDirty?: boolean
}

export type FinanceSaveResult = {
  ok: boolean
  errorMessage?: string
}

const AUTO_SAVE_DEBOUNCE_MS = 1800
const RETRY_OPTIONS = {
  maxRetries: 2,
  initialDelayMs: 250,
  shouldRetry: (error: unknown) => !(error instanceof FinanceDataConflictError),
}

function createInitialStatus(): SyncStatus {
  return {
    state: 'idle',
    message: th.sync.idle,
    lastSyncedAt: null,
    errorMessage: null,
    operationId: null,
    dirty: false,
    reconciliation: null,
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
  const lastSavedDataRef = useRef<FinanceData>(data)
  const latestDataRef = useRef<FinanceData>(data)
  const saveTimerRef = useRef<number | null>(null)
  const skipNextSaveRef = useRef(true)
  const coordinatorRef = useRef<FinanceSyncCoordinator | null>(null)
  const sessionGenerationRef = useRef(0)
  if (!coordinatorRef.current) coordinatorRef.current = new FinanceSyncCoordinator()

  const isDemo = userId === 'demo-user'

  const clearSaveTimer = useCallback(() => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = null
  }, [])

  function hasUnsavedChanges(): boolean {
    const baselineFingerprint = lastSavedFingerprintRef.current
    return Boolean(
      baselineFingerprint
      && createFinanceDataFingerprint(latestDataRef.current) !== baselineFingerprint,
    )
  }

  function setOperationStatus(operationId: string, update: (current: SyncStatus) => SyncStatus): void {
    setStatus((current) => current.operationId === operationId ? update(current) : current)
  }

  const saveNow = useCallback(
    async (sourceData: FinanceData = data, message = th.sync.savedManual, options: SaveOptions = {}): Promise<FinanceSaveResult> => {
      clearSaveTimer()
      const generation = sessionGenerationRef.current
      const operation = coordinatorRef.current!.enqueue('save', async ({ operationId }) => {
        if (generation !== sessionGenerationRef.current) return { ok: false, errorMessage: 'ยกเลิก operation จาก session เดิม' }
        setOperationStatus(operationId, (current) => ({
          ...current,
          state: 'saving',
          message: isDemo ? th.sync.demoLocal : th.sync.saving,
          errorMessage: null,
          dirty: true,
        }))
        try {
          if (generation !== sessionGenerationRef.current) return { ok: false, errorMessage: 'ยกเลิก operation จาก session เดิม' }
          const normalized = validateNormalizedData(sourceData)
          const expectedRevision = lastSavedDataRef.current.meta.revision
          const nextRevision = isDemo
            ? expectedRevision + 1
            : await runWithBoundedRetry(
                () => saveFinanceDataToCloud(userId, normalized, {
                  // Always compare against the latest acknowledged baseline.
                  // A queued save may have been created before a prior save ack.
                  expectedRevision,
                  baseData: lastSavedDataRef.current,
                  replace: options.replace,
                }),
                RETRY_OPTIONS,
              )
          if (generation !== sessionGenerationRef.current) return { ok: false, errorMessage: 'ยกเลิก operation จาก session เดิม' }
          const syncedAt = currentIsoTimestamp()
          const savedData: FinanceData = {
            ...normalized,
            meta: {
              ...normalized.meta,
              revision: nextRevision,
            },
          }
          const latestData = latestDataRef.current
          const latestMatchesSource = createFinanceDataFingerprint(latestData) === createFinanceDataFingerprint(sourceData)
          // Keep a newer local edit when it arrived while the request was in flight.
          const nextLocalData = latestMatchesSource
            ? savedData
            : {
                ...latestData,
                meta: {
                  ...latestData.meta,
                  revision: nextRevision,
                },
              }
          const storedData = replaceData(nextLocalData, isDemo ? th.sync.demoLocal : message)
          lastSavedDataRef.current = savedData
          lastSavedFingerprintRef.current = createFinanceDataFingerprint(savedData)
          skipNextSaveRef.current = latestMatchesSource
          latestDataRef.current = storedData
          setOperationStatus(operationId, (current) => ({
            ...current,
            state: latestMatchesSource ? 'saved' : 'pending',
            message: latestMatchesSource
              ? (isDemo ? th.sync.demoLocal : message)
              : (isDemo ? th.sync.demoLocal : th.sync.pendingSave),
            lastSyncedAt: syncedAt,
            errorMessage: null,
            dirty: !latestMatchesSource,
            reconciliation: null,
          }))
          return { ok: true }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'บันทึกขึ้น Cloud ไม่สำเร็จ'
          if (generation !== sessionGenerationRef.current) return { ok: false, errorMessage: 'ยกเลิก operation จาก session เดิม' }
          setOperationStatus(operationId, (current) => ({
            ...current,
            state: error instanceof FinanceDataConflictError ? 'conflict' : 'error',
            message: errorMessage,
            errorMessage,
            dirty: true,
          }))
          return { ok: false, errorMessage }
        }
      })
      setStatus((current) => ({
        ...current,
        state: 'pending',
        message: isDemo ? th.sync.demoLocal : th.sync.pendingSave,
        errorMessage: null,
        operationId: operation.operationId,
        dirty: true,
      }))
      return operation.promise
    },
    [clearSaveTimer, data, isDemo, replaceData, userId],
  )

  const loadNow = useCallback(async (options: LoadOptions = {}): Promise<boolean> => {
    clearSaveTimer()
    const generation = sessionGenerationRef.current
    const operation = coordinatorRef.current!.enqueue('load', async ({ operationId }) => {
      if (generation !== sessionGenerationRef.current) return false
      setOperationStatus(operationId, (current) => ({
        ...current,
        state: 'loading',
        message: isDemo ? th.sync.demoLocal : th.sync.loading,
        errorMessage: null,
      }))
      if (generation !== sessionGenerationRef.current) return false
      if (isDemo) {
        setOperationStatus(operationId, (current) => ({
          ...current,
          state: 'saved',
          message: th.sync.demoLocal,
          errorMessage: null,
        }))
        return false
      }
      if (hasUnsavedChanges() && !options.discardDirty) {
        const errorMessage = 'มีการแก้ไขที่ยังไม่ซิงก์ กรุณาบันทึกขึ้น Cloud ก่อนโหลดข้อมูล'
        setOperationStatus(operationId, (current) => ({
          ...current,
          state: 'error',
          message: errorMessage,
          errorMessage,
          dirty: true,
        }))
        return false
      }
      try {
        const cloudResult = await runWithBoundedRetry(() => loadFinanceDataFromCloudWithReport(userId), RETRY_OPTIONS)
        if (generation !== sessionGenerationRef.current) return false
        if (!cloudResult) {
          setOperationStatus(operationId, (current) => ({
            ...current,
            state: 'idle',
            message: th.sync.noCloud,
            errorMessage: null,
            reconciliation: null,
            // A forced recovery load must not claim that local data was
            // acknowledged when Cloud has no dataset to replace it with.
            dirty: hasUnsavedChanges(),
          }))
          return false
        }
        skipNextSaveRef.current = true
        const loadedData = replaceData(cloudResult.data, th.sync.loadManual)
        lastSavedDataRef.current = loadedData
        latestDataRef.current = loadedData
        lastSavedFingerprintRef.current = createFinanceDataFingerprint(loadedData)
        setOperationStatus(operationId, (current) => ({
          ...current,
          state: 'saved',
          message: th.sync.loadManual,
          lastSyncedAt: currentIsoTimestamp(),
          errorMessage: null,
          dirty: false,
          reconciliation: cloudResult.reconciliation,
        }))
        return true
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'โหลดจาก Cloud ไม่สำเร็จ'
        if (generation !== sessionGenerationRef.current) return false
        setOperationStatus(operationId, (current) => ({
          ...current,
          state: 'error',
          message: errorMessage,
          errorMessage,
        }))
        return false
      }
    })
    setStatus((current) => ({
      ...current,
      state: 'pending',
      message: isDemo ? th.sync.demoLocal : th.sync.loading,
      errorMessage: null,
      operationId: operation.operationId,
    }))
    return operation.promise
  }, [clearSaveTimer, isDemo, replaceData, userId])

  const enableAutoSave = useCallback((message = th.sync.enabled): void => {
    setStatus((current) => ({
      ...current,
      state: current.dirty ? 'pending' : 'idle',
      message,
      errorMessage: null,
    }))
  }, [])

  useEffect(() => {
    sessionGenerationRef.current += 1
    coordinatorRef.current = new FinanceSyncCoordinator()
    lastSavedFingerprintRef.current = null
    lastSavedDataRef.current = data
    latestDataRef.current = data
    skipNextSaveRef.current = true
    setStatus(createInitialStatus())
    return () => {
      clearSaveTimer()
      // Invalidate queued/in-flight work when the user session changes or
      // the hook unmounts so stale results cannot update state afterward.
      sessionGenerationRef.current += 1
    }
  // `data` is intentionally read from the render that starts a user session.
  // Adding it as a dependency would reset the saved baseline after every edit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearSaveTimer, userId])

  useEffect(() => {
    latestDataRef.current = data
    const fingerprint = createFinanceDataFingerprint(data)
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      lastSavedDataRef.current = data
      lastSavedFingerprintRef.current = fingerprint
      setStatus((current) => ({ ...current, dirty: false }))
      return
    }
    if (fingerprint === lastSavedFingerprintRef.current) return

    clearSaveTimer()
    setStatus((current) => ({
      ...current,
      state: 'pending',
      message: isDemo ? th.sync.demoLocal : th.sync.pendingSave,
      errorMessage: null,
      // A queued operation keeps its identity; an in-flight save is invalidated
      // by this newer edit and must not publish a stale `saved` status.
      operationId: current.state === 'saving' ? null : current.operationId,
      dirty: true,
    }))
    saveTimerRef.current = window.setTimeout(() => {
      void saveNow(data, th.sync.autosaved)
    }, AUTO_SAVE_DEBOUNCE_MS)

    return clearSaveTimer
  }, [clearSaveTimer, data, isDemo, saveNow])

  return {
    status,
    saveNow,
    loadNow,
    enableAutoSave,
  }
}
