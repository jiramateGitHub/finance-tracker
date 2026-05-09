export type SyncState = 'idle' | 'loading' | 'saving' | 'saved' | 'conflict' | 'error' | 'local-only'

export type SyncStatus = {
  state: SyncState
  message: string
  lastSyncedAt: string | null
  errorMessage: string | null
}

export type ImportSyncMode = 'local-only' | 'cloud'
