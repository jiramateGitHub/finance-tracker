import type { FinanceMigrationReport } from '../../lib/dataMigration'

export type SyncState = 'idle' | 'pending' | 'loading' | 'saving' | 'saved' | 'conflict' | 'error'

export type SyncStatus = {
  state: SyncState
  message: string
  lastSyncedAt: string | null
  errorMessage: string | null
  operationId: string | null
  dirty: boolean
  reconciliation?: FinanceMigrationReport | null
}
