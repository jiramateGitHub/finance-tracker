export type SyncState = 'idle' | 'loading' | 'saving' | 'saved' | 'error'

export type SyncStatus = {
  state: SyncState
  message: string
  lastSyncedAt: string | null
  errorMessage: string | null
}
