import { createExportableFinanceData, migrateFinanceData, migrateFinanceDataWithReport, normalizeFinanceData } from './dataMigration'
import { detachTripTransactions } from '../features/trips/utils/tripUtils'
import { createPersistedFinanceBaseline } from '../services/firebase/firestoreWritePlan'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const legacyTripTransaction = {
  id: 'tx-trip-legacy-item-1',
  type: 'expense',
  date: '2026-11-01',
  category: 'flight',
  title: 'ตั๋วเครื่องบิน',
  amount: 4000,
  status: 'cleared',
  sourceModule: 'trip',
  sourceRefId: 'legacy-item-1',
  tripId: 'legacy-trip',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
}

const rawData = { transactions: [legacyTripTransaction] }
const runtimeNormalized = normalizeFinanceData(rawData)
assert(runtimeNormalized.trips.length === 0, 'Runtime normalization must not hydrate legacy trips')

const migrated = migrateFinanceData(rawData)
assert(migrated.trips.length === 1, 'Migration should create a legacy trip once')
assert(migrated.trips[0].id === 'legacy-trip', 'Migrated trip should preserve the transaction trip id')
assert(migrated.trips[0].items.length === 1, 'Migration should create the legacy trip item')
assert(migrated.trips[0].items[0].id === 'legacy-item-1', 'Migrated item should preserve sourceRefId')

const deletedTripState = normalizeFinanceData({ ...migrated, trips: [] })
assert(deletedTripState.trips.length === 0, 'Deleting a trip must not be undone by normalization')
const deletedTripData = {
  ...migrated,
  trips: [],
  transactions: detachTripTransactions(migrated.transactions, 'legacy-trip'),
}
const reimportedAfterDelete = migrateFinanceData(createExportableFinanceData(deletedTripData))
assert(reimportedAfterDelete.trips.length === 0, 'Deleted trip must stay deleted after export/import')

const explicitEmptyPlan = normalizeFinanceData({
  installmentPlans: [{
    id: 'empty-paid-keys',
    name: 'แผนที่ยังไม่จ่าย',
    monthlyAmount: 100,
    monthsTotal: 3,
    monthsPaid: 2,
    paidMonthKeys: [],
    startMonth: '2026-01',
  }],
}).installmentPlans[0]
assert(explicitEmptyPlan.monthsPaid === 0, 'Explicit empty paidMonthKeys should override legacy paid count')

const missingPaidKeysPlan = normalizeFinanceData({
  installmentPlans: [{
    id: 'missing-paid-keys',
    name: 'แผน legacy',
    monthlyAmount: 100,
    monthsTotal: 3,
    monthsPaid: 2,
    startMonth: '2026-01',
  }],
}).installmentPlans[0]
assert(missingPaidKeysPlan.monthsPaid === 2, 'Missing paidMonthKeys should preserve legacy paid count')

const normalizedSettings = normalizeFinanceData({
  settings: {
    defaultView: 'trips',
    monthStartsOn: 0,
    includePendingInMonthlyTotals: false,
  },
}).settings
assert(normalizedSettings.defaultView === 'trips', 'Supported defaultView should survive normalization')
assert(normalizedSettings.monthStartsOn === 0, 'Explicit monthStartsOn zero should not be replaced')
assert(normalizedSettings.includePendingInMonthlyTotals === false, 'Pending policy should survive normalization')

const normalizedBudgetThresholds = normalizeFinanceData({
  budgets: [{
    id: 'threshold-budget',
    scope: 'monthly',
    month: '2026-09',
    category: 'อาหาร',
    amount: 1000,
    alertThresholds: [-1, 0.7, 0.95, 2],
  }],
}).budgets[0].alertThresholds
assert(normalizedBudgetThresholds?.join(',') === '0.7,0.95', 'Invalid thresholds should be removed at migration boundary')

const canonicalExport = createExportableFinanceData(normalizeFinanceData({
  transactions: [{
    id: 'canonical-transaction',
    type: 'expense',
    date: '2026-09-01',
    category: 'อาหาร',
    categoryId: 'ของกิน',
    title: 'มื้อเที่ยง',
    amount: 120,
    status: 'cleared',
    installmentId: 'legacy-plan',
  }],
  installmentPlans: [{
    id: 'canonical-plan',
    name: 'แผน canonical',
    category: 'ผ่อนสินค้า',
    monthlyAmount: 100,
    paymentAmount: 100,
    monthsTotal: 3,
    totalMonths: 3,
    monthsPaid: 1,
    paidMonths: 1,
    paidMonthKeys: ['2026-09'],
    paymentDay: 5,
    principal: 300,
    principalAmount: 300,
    remainingOverride: 200,
    balanceSnapshotAmount: 200,
    balanceSnapshotMonth: '2026-09',
    startMonth: '2026-09',
    interestType: 'none',
  }],
  goals: [{
    id: 'canonical-goal',
    name: 'เงินสำรอง',
    type: 'savings',
    kind: 'savings',
    targetAmount: 1000,
    currentAmount: 100,
    status: 'active',
  }],
}))
const exportedTransaction = canonicalExport.transactions[0] as Record<string, unknown>
const exportedPlan = canonicalExport.installmentPlans[0] as Record<string, unknown>
const exportedGoal = canonicalExport.goals[0] as Record<string, unknown>
assert(!('entries' in canonicalExport) && !('installments' in canonicalExport), 'Canonical export must not include top-level aliases')
assert(!('category' in exportedTransaction) && exportedTransaction.categoryId === 'ของกิน', 'Transaction export must use categoryId only')
assert(!('monthKey' in exportedTransaction) && !('installmentId' in exportedTransaction), 'Derived and legacy transaction fields must not be exported')
assert(exportedPlan.installmentCount === 3 && Array.isArray(exportedPlan.paidMonthKeys), 'Installment export must use canonical count and paid keys')
assert(!('paymentAmount' in exportedPlan) && !('monthsTotal' in exportedPlan) && !('monthsPaid' in exportedPlan), 'Installment aliases must not be exported')
assert(typeof exportedPlan.balanceSnapshot === 'object' && !('remainingOverride' in exportedPlan), 'Balance snapshot must use the canonical object')
assert(exportedGoal.kind === 'savings' && !('type' in exportedGoal), 'Goal export must use kind only')
assert(canonicalExport.meta.schemaVersion === canonicalExport.schemaVersion && !('schemaVersion' in canonicalExport.settings), 'Schema version must be in envelope/meta, not settings')
const canonicalRoundTrip = migrateFinanceData(canonicalExport)
assert(canonicalRoundTrip.transactions[0]?.categoryId === 'ของกิน' && canonicalRoundTrip.transactions[0]?.monthKey === '2026-09', 'Canonical transaction export/import must preserve category and derive month')
assert(canonicalRoundTrip.installmentPlans[0]?.paidMonthKeys?.length === 1 && canonicalRoundTrip.installmentPlans[0]?.balanceSnapshotAmount === 200, 'Canonical installment snapshot must survive export/import')
assert(canonicalRoundTrip.goals[0]?.kind === 'savings', 'Canonical goal kind must survive export/import')

let aliasConflictRejected = false
try {
  migrateFinanceData({ transactions: [{ id: 'conflict', type: 'expense', date: '2026-09-01', category: 'ของกิน', categoryId: 'เดินทาง', amount: 1 }] })
} catch (error) {
  aliasConflictRejected = error instanceof Error && error.message.includes('ขัดแย้ง')
}
assert(aliasConflictRejected, 'Conflicting canonical and legacy fields must be rejected')

const splitBudgets = migrateFinanceData({ budgets: [{
  id: 'monthly-budget',
  scope: 'monthly',
  month: '2026-09',
  amount: 300,
  lines: [
    { id: 'food-line', categoryId: 'ของกิน', amount: 100 },
    { id: 'travel-line', categoryId: 'เดินทาง', amount: 200 },
  ],
}] }).budgets
assert(splitBudgets.length === 2 && splitBudgets[0]?.id === 'monthly-budget' && splitBudgets[1]?.id === 'monthly-budget--travel-line', 'Monthly multi-line budgets must migrate to deterministic records')
assert(splitBudgets.reduce((sum, budget) => sum + budget.amount, 0) === 300, 'Split budget amounts must preserve the line total')
let budgetConflictRejected = false
try {
  migrateFinanceData({ budgets: [{
    id: 'mismatched-budget',
    scope: 'monthly',
    month: '2026-09',
    amount: 999,
    lines: [{ id: 'line', categoryId: 'ของกิน', amount: 100 }],
  }] })
} catch (error) {
  budgetConflictRejected = error instanceof Error
}
assert(budgetConflictRejected, 'Monthly budget amount and line total conflicts must be reported')

const tripWithNestedItems = {
  trips: [{
    id: 'trip-owner',
    name: 'ทริป canonical',
    destination: 'เชียงใหม่',
    startDate: '2026-10-01',
    endDate: '2026-10-03',
    items: [{
      id: 'trip-item-1',
      date: '2026-10-01',
      category: 'เดินทาง',
      title: 'ตั๋วรถไฟ',
      amount: 900,
      destination: 'เชียงใหม่',
      country: 'TH',
      isPaid: true,
    }],
  }],
}
const tripMigration = migrateFinanceDataWithReport(tripWithNestedItems)
assert(tripMigration.report.tripOwnership.createdTransactionIds.length === 1, 'Nested trip items must produce one owned transaction')
assert(tripMigration.report.tripOwnership.hydratedItemIds.includes('trip-item-1'), 'Trip migration report must list every hydrated nested item')
assert(tripMigration.data.transactions[0]?.sourceModule === 'trip' && tripMigration.data.transactions[0]?.sourceRefId === 'trip-item-1', 'Trip transaction must retain source mapping')
assert(tripMigration.data.transactions[0]?.travelDetails?.country === 'TH', 'Trip travel details must move to the transaction')
const tripExport = createExportableFinanceData(tripMigration.data)
const exportedTrip = tripExport.trips[0] as Record<string, unknown>
assert(!('items' in exportedTrip), 'Canonical trip export must not duplicate money items')
assert((tripExport.transactions[0] as Record<string, unknown>).tripId === 'trip-owner', 'Canonical trip transaction must retain trip relation')
const tripRoundTrip = migrateFinanceData(tripExport)
assert(tripRoundTrip.trips[0]?.items.length === 1 && tripRoundTrip.transactions.length === 1, 'Canonical trip export/import must reconstruct the UI read model without duplicating transactions')
const canonicalTripMigration = migrateFinanceDataWithReport(tripExport)
assert(canonicalTripMigration.report.tripOwnership.hydratedItemIds.includes('trip-item-1'), 'Canonical trip transaction hydration must be included in the migration report')
const directTripExport = createExportableFinanceData(normalizeFinanceData(tripWithNestedItems))
assert(directTripExport.transactions.length === 1 && !('items' in (directTripExport.trips[0] as Record<string, unknown>)), 'Export boundary must materialize nested trip items even when callers skipped migration')

const existingTripTransaction = {
  ...tripWithNestedItems,
  transactions: [{
    id: 'existing-trip-tx',
    type: 'expense',
    date: '2026-10-01',
    category: 'เดินทาง',
    title: 'ตั๋วรถไฟ',
    amount: 900,
    status: 'cleared',
    sourceModule: 'trip',
    sourceRefId: 'trip-item-1',
    tripId: 'trip-owner',
  }],
}
const reusedTrip = migrateFinanceDataWithReport(existingTripTransaction)
assert(reusedTrip.report.tripOwnership.createdTransactionIds.length === 0 && reusedTrip.report.tripOwnership.reusedTransactionIds[0] === 'existing-trip-tx', 'Existing mapped trip transaction must be reused rather than duplicated')

const legacyDerivedTripTransaction = {
  ...tripWithNestedItems,
  transactions: [{
    ...existingTripTransaction.transactions[0],
    note: 'รายการทริปจาก ทริป canonical แก้ไขได้จากหน้าทริป',
  }],
}
const legacyDerivedTrip = migrateFinanceData(legacyDerivedTripTransaction)
assert(legacyDerivedTrip.transactions[0]?.travelDetails?.destination === 'เชียงใหม่', 'Legacy trip transaction should inherit missing travel metadata from the nested item')
assert(legacyDerivedTrip.trips[0]?.items[0]?.destination === 'เชียงใหม่', 'Legacy trip hydration should preserve nested travel metadata')

const mismatchedTrip = migrateFinanceDataWithReport({
  ...tripWithNestedItems,
  transactions: [{
    ...existingTripTransaction.transactions[0],
    amount: 999,
  }],
})
assert(mismatchedTrip.report.tripOwnership.issues.some((issue) => issue.code === 'field-mismatch'), 'Trip field mismatch must be included in the reconciliation report')
const mismatchIssue = mismatchedTrip.report.tripOwnership.issues.find((issue) => issue.code === 'field-mismatch')
assert(mismatchIssue?.nestedItem?.amount === 900 && mismatchIssue.transaction?.amount === 999, 'Reconciliation report must retain both nested and transaction owner values')
assert(mismatchedTrip.data.trips[0]?.items[0]?.amount === 999, 'Transaction owner must win when hydrating a mismatched trip item')
assert(migrateFinanceData(mismatchedTrip.data).transactions[0]?.amount === 999, 'A reconciled load result must be safe for the strict persistence boundary')
let mismatchBlocked = false
try {
  migrateFinanceData({
    ...tripWithNestedItems,
    transactions: [{
      ...existingTripTransaction.transactions[0],
      amount: 999,
    }],
  })
} catch (error) {
  mismatchBlocked = error instanceof Error
}
assert(mismatchBlocked, 'Blocking trip mismatches must not be persisted by the default migration')

const duplicateNestedTrip = migrateFinanceDataWithReport({
  trips: [{
    ...tripWithNestedItems.trips[0],
    items: [tripWithNestedItems.trips[0].items[0], tripWithNestedItems.trips[0].items[0]],
  }],
})
assert(duplicateNestedTrip.report.tripOwnership.issues.some((issue) => issue.code === 'duplicate-source'), 'Duplicate nested trip sources must be reported')

const orphanTrip = migrateFinanceDataWithReport({
  transactions: [{
    id: 'orphan-trip-tx',
    type: 'expense',
    date: '2026-10-01',
    category: 'ท่องเที่ยว',
    title: 'รายการ orphan',
    amount: 50,
    status: 'cleared',
    sourceModule: 'trip',
    sourceRefId: 'orphan-item',
    tripId: 'missing-trip',
  }],
})
assert(orphanTrip.report.tripOwnership.orphanTransactionIds.includes('orphan-trip-tx'), 'Orphan trip transactions must be reported')
assert(orphanTrip.data.transactions.some((transaction) => transaction.id === 'orphan-trip-tx'), 'Orphan trip transactions must be preserved')

const persistedBaseline = createPersistedFinanceBaseline(normalizeFinanceData(tripWithNestedItems))
assert(persistedBaseline.trips[0]?.items.length === 0, 'Persisted Cloud baseline must exclude runtime trip read-model items')
assert(persistedBaseline.transactions.length === 0, 'Persisted Cloud baseline must not materialize nested trip transactions')

const missingIdInput = { transactions: [{ type: 'expense', date: '2026-09-01', amount: 1 }] }
assert(normalizeFinanceData(missingIdInput).transactions[0]?.id === normalizeFinanceData(missingIdInput).transactions[0]?.id, 'Missing IDs must be repaired deterministically')

let futureSchemaRejected = false
try {
  migrateFinanceData({ schemaVersion: 999, transactions: [] })
} catch (error) {
  futureSchemaRejected = error instanceof Error && error.message.includes('schema v999')
}
assert(futureSchemaRejected, 'Migration dispatch must reject future schema versions')

console.log('Testing migration boundary behavior...')
console.log('✓ Legacy trip hydration runs only at migration boundary')
