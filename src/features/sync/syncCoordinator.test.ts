import { FinanceSyncCoordinator, runWithBoundedRetry } from './syncCoordinator'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const coordinator = new FinanceSyncCoordinator()
const events: string[] = []
let releaseFirst!: () => void
const firstGate = new Promise<void>((resolve) => {
  releaseFirst = resolve
})

const first = coordinator.enqueue('save', async ({ operationId }) => {
  events.push(`start:${operationId}`)
  await firstGate
  events.push(`end:${operationId}`)
  return 'first'
})
const second = coordinator.enqueue('load', async ({ operationId }) => {
  events.push(`start:${operationId}`)
  events.push(`end:${operationId}`)
  return 'second'
})

await Promise.resolve()
assert(events.join(',') === 'start:sync-1', 'Second operation must wait for the first operation')
releaseFirst()
assert(await first.promise === 'first', 'First operation result should be preserved')
assert(await second.promise === 'second', 'Second operation result should be preserved')
assert(events.join(',') === 'start:sync-1,end:sync-1,start:sync-2,end:sync-2', 'Operations must run in order')
assert(first.operationId === 'sync-1' && second.operationId === 'sync-2', 'Operation ids must be unique and ordered')

const recoveryCoordinator = new FinanceSyncCoordinator()
const failedOperation = recoveryCoordinator.enqueue('save', async () => {
  throw new Error('failed')
})
const afterFailure = recoveryCoordinator.enqueue('save', async () => 'recovered')
let failedOperationRejected = false
try {
  await failedOperation.promise
} catch {
  failedOperationRejected = true
}
assert(failedOperationRejected, 'Failed operations should reject to their caller')
assert(await afterFailure.promise === 'recovered', 'Queue must remain usable after a rejected operation')

let attempts = 0
const retryResult = await runWithBoundedRetry(
  async () => {
    attempts += 1
    if (attempts < 3) throw new Error('temporary')
    return 'ok'
  },
  { maxRetries: 2, initialDelayMs: 0, delay: async () => undefined },
)
assert(retryResult === 'ok' && attempts === 3, 'Transient operations should retry up to the bound')

let skippedAttempts = 0
let skipped = false
try {
  await runWithBoundedRetry(
    async () => {
      skippedAttempts += 1
      throw new Error('conflict')
    },
    {
      maxRetries: 2,
      initialDelayMs: 0,
      delay: async () => undefined,
      shouldRetry: () => false,
    },
  )
} catch {
  skipped = true
}
assert(skipped && skippedAttempts === 1, 'Non-retryable errors should surface immediately')

console.log('Testing sync coordinator queue and bounded retry...')
console.log('✓ serialized operations and retry policy passed')
