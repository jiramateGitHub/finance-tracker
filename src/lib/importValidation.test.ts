import {
  assertValidFinanceImportPayload,
  FinanceImportValidationError,
  validateFinanceImportPayload,
} from './importValidation'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const emptyV2 = {
  schemaVersion: 2,
  transactions: [],
  recurringRules: [],
  installmentPlans: [],
  trips: [],
  budgets: [],
  goals: [],
}

assert(validateFinanceImportPayload(emptyV2).issues.length === 0, 'Schema v2 empty dataset should be valid')
assert(validateFinanceImportPayload([]).issues.some((issue) => issue.code === 'root'), 'Array root must be rejected')
assert(validateFinanceImportPayload({ ...emptyV2, schemaVersion: 999 }).issues.some((issue) => issue.code === 'version'), 'Future schema must be rejected')
assert(validateFinanceImportPayload({ ...emptyV2, transactions: 'not-an-array' }).issues.some((issue) => issue.code === 'collection'), 'Malformed collection must be rejected')
assert(validateFinanceImportPayload({ ...emptyV2, settings: { schemaVersion: 'unknown' } }).issues.some((issue) => issue.path === '$.settings.schemaVersion'), 'Invalid nested schema must be rejected even when root version is valid')
assert(validateFinanceImportPayload({ transactions: [], entries: [{ id: 'legacy-1', type: 'expense', date: '2026-03-01', amount: 100 }] }).issues.some((issue) => issue.code === 'collection'), 'Conflicting canonical/legacy aliases must be rejected')
assert(validateFinanceImportPayload({ ...emptyV2, settings: [] }).issues.some((issue) => issue.path === '$.settings'), 'Malformed singleton root must be rejected')
assert(validateFinanceImportPayload({ ...emptyV2, trips: [{ id: 'trip-1', startDate: '2026-04-10', endDate: '2026-04-01' }] }).issues.some((issue) => issue.path.endsWith('.endDate')), 'Reversed trip dates must be rejected')
assert(validateFinanceImportPayload({ ...emptyV2, meta: { schemaVersion: 1 } }).issues.some((issue) => issue.path === '$.meta.schemaVersion'), 'Root and metadata schema versions must agree')
assert(validateFinanceImportPayload({ ...emptyV2, transactions: [{ id: 'tx-conflict', type: 'expense', date: '2026-02-01', amount: 100, category: 'ของกิน', categoryId: 'เดินทาง' }] }).issues.some((issue) => issue.path.includes('transactions')), 'Conflicting entity aliases must be rejected before normalization')

const duplicateAndInvalid = {
  ...emptyV2,
  transactions: [
    { id: 'tx-1', type: 'expense', date: '2026-02-30', amount: 100 },
    { id: 'tx-1', type: 'income', date: '2026-02-01', amount: -1 },
  ],
}
const invalidResult = validateFinanceImportPayload(duplicateAndInvalid)
assert(invalidResult.issues.some((issue) => issue.code === 'duplicate-id'), 'Duplicate ids must be rejected')
assert(invalidResult.issues.some((issue) => issue.code === 'date'), 'Invalid calendar dates must be rejected')
assert(invalidResult.issues.some((issue) => issue.code === 'amount'), 'Negative amounts must be rejected')

const legacy = {
  entries: [{ id: 'legacy-1', type: 'expense', date: '2026-03-01', amount: '1,200', title: 'ค่าใช้จ่าย' }],
}
assert(validateFinanceImportPayload(legacy).issues.length === 0, 'Legacy entries alias should remain importable')
assert(validateFinanceImportPayload({ settings: { schemaVersion: 2 }, entries: legacy.entries }).issues.length === 0, 'Transition v2 payloads may use legacy aliases while canonical migration remains pending')

let didThrow = false
try {
  assertValidFinanceImportPayload(duplicateAndInvalid)
} catch (error) {
  didThrow = error instanceof FinanceImportValidationError
}
assert(didThrow, 'Invalid import should throw a typed validation error')

console.log('Testing strict import validation...')
console.log('✓ root/version/collection/id/date/amount validation passed')
