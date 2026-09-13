import type { FinanceRepository, FinanceRepositorySaveOptions } from '../../services/financeRepository'
import { FinanceDataConflictError } from '../../services/financeRepository'
import { normalizeFinanceData } from '../../lib/dataMigration'
import type { FinanceData } from '../../types/finance'
import { makeFinanceData, makeTransaction } from '../../test/fixtures/financeFixtures'

function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) throw new Error(message || 'Assertion failed')
}

assert.equal = function (actual: unknown, expected: unknown, message?: string) {
  if (actual !== expected) throw new Error(`${message ? message + ': ' : ''}Expected ${expected} but got ${actual}`)
}

function cloneData(data: FinanceData): FinanceData {
  return normalizeFinanceData(JSON.parse(JSON.stringify(data)) as unknown)
}

/**
 * Small contract fake for deterministic two-client tests. It mirrors the
 * repository's write contract: revision is checked first, ordinary writes
 * preserve cloud-only IDs, and replace explicitly removes stale IDs.
 */
class InMemoryFinanceRepository implements FinanceRepository {
  private cloudData: FinanceData

  constructor(initialData: FinanceData) {
    this.cloudData = cloneData(initialData)
  }

  async load(userId: string): Promise<FinanceData> {
    void userId
    return cloneData(this.cloudData)
  }

  async save(userId: string, data: FinanceData, options: FinanceRepositorySaveOptions = {}): Promise<number> {
    void userId
    const expectedRevision = options.expectedRevision ?? data.meta.revision
    const actualRevision = this.cloudData.meta.revision
    if (expectedRevision !== actualRevision) throw new FinanceDataConflictError(expectedRevision, actualRevision)

    const nextData = cloneData(data)
    if (!options.replace) {
      const baselineIds = new Set((options.baseData?.transactions ?? []).map((item) => item.id))
      const localIds = new Set(data.transactions.map((item) => item.id))
      const cloudItems = new Map(this.cloudData.transactions.map((item) => [item.id, item]))
      baselineIds.forEach((id) => {
        if (!localIds.has(id)) cloudItems.delete(id)
      })
      data.transactions.forEach((item) => cloudItems.set(item.id, item))
      nextData.transactions = Array.from(cloudItems.values())
    }

    const revision = actualRevision + 1
    this.cloudData = cloneData({
      ...nextData,
      meta: { ...nextData.meta, revision },
    })
    return revision
  }
}

console.log('Testing sync repository contract...')

const initial = makeFinanceData({
  transactions: [makeTransaction({ id: 'existing-transaction' })],
})
const repository = new InMemoryFinanceRepository(initial)
const clientA = await repository.load('user-a')
const clientB = await repository.load('user-b')
const clientBBase = cloneData(clientB)

clientB.transactions = [
  ...clientB.transactions,
  makeTransaction({ id: 'added-by-client-b', title: 'ข้อมูลจากอีกอุปกรณ์' }),
]
const revisionAfterB = await repository.save('user-b', clientB, {
  expectedRevision: clientB.meta.revision,
  baseData: clientBBase,
})
assert.equal(revisionAfterB, 1)

clientA.transactions = clientA.transactions.map((transaction) => (
  transaction.id === 'existing-transaction' ? { ...transaction, title: 'แก้ไขจาก client A' } : transaction
))
let conflictWasRaised = false
try {
  await repository.save('user-a', clientA, { expectedRevision: clientA.meta.revision, baseData: clientA })
} catch (error) {
  conflictWasRaised = error instanceof FinanceDataConflictError
}
assert(conflictWasRaised, 'stale client write must raise a conflict')
const afterConflict = await repository.load('user-a')
assert(afterConflict.transactions.some((transaction) => transaction.id === 'added-by-client-b'), 'conflict must preserve client B data')
assert.equal(afterConflict.transactions.find((transaction) => transaction.id === 'existing-transaction')?.title, 'รายการทดสอบ')

const refreshedA = await repository.load('user-a')
const refreshedABase = cloneData(refreshedA)
refreshedA.transactions = refreshedA.transactions.filter((transaction) => transaction.id !== 'added-by-client-b')
const revisionAfterDelete = await repository.save('user-a', refreshedA, {
  expectedRevision: refreshedA.meta.revision,
  baseData: refreshedABase,
})
assert.equal(revisionAfterDelete, 2)
assert(!(await repository.load('user-a')).transactions.some((transaction) => transaction.id === 'added-by-client-b'))

const imported = makeFinanceData({ transactions: [makeTransaction({ id: 'imported-only' })] })
const revisionAfterReplace = await repository.save('user-a', imported, {
  expectedRevision: (await repository.load('user-a')).meta.revision,
  baseData: refreshedA,
  replace: true,
})
assert.equal(revisionAfterReplace, 3)
const afterReplace = await repository.load('user-a')
assert.equal(afterReplace.transactions.length, 1)
assert.equal(afterReplace.transactions[0]?.id, 'imported-only')

console.log('✓ Sync repository contract passed')
