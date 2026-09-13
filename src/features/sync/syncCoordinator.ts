export type SyncOperationKind = 'save' | 'load'

export type SyncOperationContext = {
  operationId: string
  kind: SyncOperationKind
}

export type EnqueuedSyncOperation<T> = {
  operationId: string
  promise: Promise<T>
}

/**
 * Serialize persistence operations while allowing callers to enqueue work
 * without awaiting the previous request. Rejected operations do not poison
 * the queue, so a retry can always run afterward.
 */
export class FinanceSyncCoordinator {
  private queue: Promise<void> = Promise.resolve()
  private sequence = 0

  enqueue<T>(kind: SyncOperationKind, task: (context: SyncOperationContext) => Promise<T>): EnqueuedSyncOperation<T> {
    const operationId = `sync-${++this.sequence}`
    const run = async (): Promise<T> => task({ operationId, kind })
    const promise = this.queue.then(run, run)
    this.queue = promise.then(() => undefined, () => undefined)
    return { operationId, promise }
  }
}

export type RetryOptions = {
  maxRetries?: number
  initialDelayMs?: number
  delay?: (delayMs: number) => Promise<void>
  shouldRetry?: (error: unknown, attempt: number) => boolean
}

const defaultDelay = (delayMs: number): Promise<void> => new Promise((resolve) => {
  globalThis.setTimeout(resolve, delayMs)
})

/** Run transient persistence work with a small, bounded exponential backoff. */
export async function runWithBoundedRetry<T>(task: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxRetries = Math.max(0, Math.floor(options.maxRetries ?? 2))
  const initialDelayMs = Math.max(0, Math.floor(options.initialDelayMs ?? 250))
  const delay = options.delay ?? defaultDelay
  const shouldRetry = options.shouldRetry ?? (() => true)

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await task()
    } catch (error) {
      if (attempt >= maxRetries || !shouldRetry(error, attempt)) throw error
      await delay(initialDelayMs * (2 ** attempt))
    }
  }
}
