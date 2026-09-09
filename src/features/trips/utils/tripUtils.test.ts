import {
  calculateTripTotals,
  deriveTripTransactions,
  filterTrips,
  getTripDayCount,
  getTripStatus,
  summarizeTrips,
} from './tripUtils'
import type { AppData, Trip } from '../../../types/finance'

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

console.log('ALL TRIP UTILS TESTS PASSED! 🎉')
