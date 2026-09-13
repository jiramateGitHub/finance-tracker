import {
  calculateTripTotals,
  deriveTripTransactions,
  filterTrips,
  getTripDayCount,
  getTripStatus,
  getTripBudgetLineViews,
  getTripPlannedBudget,
  detachTripTransactions,
  reconcileTripTransactions,
  summarizeTrips,
} from './tripUtils'
import type { AppData, Budget, TransactionEntry, Trip } from '../../../types/finance'

function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) throw new Error(message || 'Assertion failed')
}
assert.equal = function (actual: unknown, expected: unknown, message?: string) {
  if (actual !== expected) throw new Error(`${message ? message + ': ' : ''}Expected ${expected} but got ${actual}`)
}

console.log('Testing Trip utilities and calculations...')

const mockData = {
  budgets: [],
  installmentPlans: [],
} as unknown as AppData

const sampleTrip: Trip = {
  id: 'trip-test',
  name: 'Chiang Mai Workation',
  destination: 'Chiang Mai',
  budget: 15000,
  startDate: '2026-11-01',
  endDate: '2026-11-05',
  items: [
    {
      id: 'item-1',
      title: 'Plane ticket',
      category: 'flight',
      amount: 4000,
      date: '2026-11-01',
      isPaid: true,
    },
    {
      id: 'item-2',
      title: 'Hotel',
      category: 'hotel',
      amount: 6000,
      date: '2026-11-02',
      isPaid: false,
    },
  ],
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
}

// 1. getTripDayCount & getTripStatus
const days = getTripDayCount(sampleTrip)
assert.equal(days, 5, 'Trip days calculation (Nov 1 to Nov 5 inclusive = 5 days)')
const status = getTripStatus(sampleTrip)
assert.equal(status, 'upcoming', 'Trip status for future date should be upcoming')
console.log('✓ getTripDayCount & getTripStatus passed')

// 2. calculateTripTotals
const totals = calculateTripTotals(mockData, sampleTrip)
assert.equal(totals.plannedBudget, 15000)
assert.equal(totals.actualSpending, 10000)
assert.equal(totals.paidTotal, 4000)
assert.equal(totals.unpaidTotal, 6000)
assert.equal(totals.remaining, 5000)
assert.equal(totals.itemCount, 2)
assert.equal(totals.usagePercent, Math.round((10000 / 15000) * 100))
console.log('✓ calculateTripTotals passed')

// 3. deriveTripTransactions
const derivedNov = deriveTripTransactions([sampleTrip], '2026-11')
assert.equal(derivedNov.length, 2, 'Should derive 2 transactions for 2026-11')
assert.equal(derivedNov[0].amount, 4000)
assert.equal(derivedNov[0].status, 'cleared')
assert.equal(derivedNov[1].amount, 6000)
assert.equal(derivedNov[1].status, 'pending')

const derivedDec = deriveTripTransactions([sampleTrip], '2026-12')
assert.equal(derivedDec.length, 0, 'Should derive 0 transactions for 2026-12')
const planLinkedTrip = {
  ...sampleTrip,
  items: [{ ...sampleTrip.items[0], id: 'item-plan', installmentId: undefined, installmentPlanId: 'plan-1' }],
}
const derivedPlanLinked = deriveTripTransactions([planLinkedTrip], '2026-11')
assert.equal(derivedPlanLinked[0]?.installmentPlanId, 'plan-1', 'Trip derivation must preserve the canonical installmentPlanId')
console.log('✓ deriveTripTransactions passed')

// 4. summarizeTrips
const summary = summarizeTrips(mockData, [sampleTrip])
assert.equal(summary.tripCount, 1)
assert.equal(summary.plannedBudget, 15000)
assert.equal(summary.actualSpending, 10000)
assert.equal(summary.paidTotal, 4000)
assert.equal(summary.unpaidTotal, 6000)
console.log('✓ summarizeTrips passed')

// 5. filterTrips
const filteredByKeyword = filterTrips([sampleTrip], {
  keyword: 'Chiang Mai',
  status: 'all',
  rangeStartMonth: '',
  rangeEndMonth: '',
  sortOrder: 'start-desc',
})
assert.equal(filteredByKeyword.length, 1)

const filteredByWrongKeyword = filterTrips([sampleTrip], {
  keyword: 'Phuket',
  status: 'all',
  rangeStartMonth: '',
  rangeEndMonth: '',
  sortOrder: 'start-desc',
})
assert.equal(filteredByWrongKeyword.length, 0)
console.log('✓ filterTrips passed')

// 5b. PR-08 budget selector parity: explicit zero, line totals and sorting.
const tripBudget: Budget = {
  id: 'trip-budget-1',
  scope: 'trip',
  tripId: sampleTrip.id,
  category: 'ท่องเที่ยว',
  amount: 20000,
  lines: [
    { id: 'trip-line-flight', categoryId: 'flight', amount: 7000 },
    { id: 'trip-line-hotel', categoryId: 'hotel', amount: 3000 },
  ],
  alertThresholds: [0.75, 0.9],
  enabled: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
}
const tripData = { ...mockData, budgets: [tripBudget] } as AppData
assert.equal(getTripPlannedBudget(tripData, sampleTrip), 10000, 'Trip planned total should use line allocations')
const lineViews = getTripBudgetLineViews(tripData, sampleTrip)
assert.equal(lineViews.find((view) => view.categoryId === 'flight')?.status, 'safe')
assert.equal(lineViews.find((view) => view.categoryId === 'hotel')?.status, 'over-budget', 'Custom over threshold should apply to line view')

const zeroTripBudget: Budget = {
  ...tripBudget,
  id: 'trip-budget-zero',
  lines: [{ id: 'trip-line-zero', categoryId: 'ท่องเที่ยว', amount: 0 }],
  amount: 0,
}
assert.equal(getTripPlannedBudget({ ...mockData, budgets: [zeroTripBudget] } as AppData, sampleTrip), 0, 'Explicit zero trip budget must not fall back to trip.budget')

const largerTrip = { ...sampleTrip, id: 'trip-larger', name: 'Larger trip', budget: 1 }
const sortedByDisplayedBudget = filterTrips([sampleTrip, largerTrip], {
  keyword: '',
  status: 'all',
  rangeStartMonth: '',
  rangeEndMonth: '',
  sortOrder: 'budget-desc',
}, tripData)
assert.equal(sortedByDisplayedBudget[0]?.id, sampleTrip.id, 'Budget sorting should use displayed planned budget')
console.log('✓ PR-08 trip budget selector regressions passed')

// 6. Legacy trip transaction reconciliation and deletion ownership
const legacyTripTransaction: TransactionEntry = {
  id: 'tx-trip-trip-test-item-1',
  type: 'expense',
  date: '2026-11-01',
  monthKey: '2026-11',
  category: 'flight',
  categoryId: 'flight',
  title: 'Plane ticket',
  amount: 4000,
  currency: 'THB',
  status: 'cleared',
  source: 'import',
  sourceModule: 'trip',
  sourceRefId: 'item-1',
  tripId: sampleTrip.id,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
}
const dedupedDerived = deriveTripTransactions([sampleTrip], '2026-11', [legacyTripTransaction])
assert.equal(dedupedDerived.length, 1, 'Persisted legacy item should not be derived twice')
assert.equal(dedupedDerived[0].sourceRefId, 'item-2', 'Only the non-persisted trip item should remain derived')
const editedTrip = {
  ...sampleTrip,
  items: sampleTrip.items.map((item) => item.id === 'item-1' ? { ...item, title: 'Train ticket', amount: 1200, isPaid: false } : item),
}
const reconciled = reconcileTripTransactions([legacyTripTransaction], sampleTrip, editedTrip, '2026-09-02T00:00:00Z')
assert.equal(reconciled.length, 2, 'Reconciliation should materialize the previously derived item too')
assert.equal(reconciled.find((transaction) => transaction.sourceRefId === 'item-1')?.title, 'Train ticket')
assert.equal(reconciled.find((transaction) => transaction.sourceRefId === 'item-1')?.amount, 1200)
assert.equal(reconciled.find((transaction) => transaction.sourceRefId === 'item-1')?.status, 'pending')
assert.equal(reconciled.find((transaction) => transaction.sourceRefId === 'item-1')?.updatedAt, '2026-09-02T00:00:00Z')
assert.equal(reconciled.find((transaction) => transaction.sourceRefId === 'item-2')?.id, 'tx-trip-trip-test-item-2')

const removedItemTrip = { ...sampleTrip, items: sampleTrip.items.filter((item) => item.id !== 'item-1') }
assert.equal(reconcileTripTransactions([legacyTripTransaction], sampleTrip, removedItemTrip).length, 1)
assert.equal(reconcileTripTransactions([legacyTripTransaction], sampleTrip, removedItemTrip)[0]?.sourceRefId, 'item-2')

const manualLinkedTransaction = { ...legacyTripTransaction, id: 'manual-linked', sourceModule: 'manual' }
const detached = detachTripTransactions([legacyTripTransaction, manualLinkedTransaction], sampleTrip.id, '2026-09-03T00:00:00Z')
assert.equal(detached.length, 1)
assert.equal(detached[0].id, 'manual-linked')
assert.equal(detached[0].tripId, null)
console.log('✓ trip transaction ownership and reconciliation passed')

console.log('ALL TRIP UTILS TESTS PASSED! 🎉')
