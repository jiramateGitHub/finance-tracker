import {
  FIXTURE_TIMESTAMP,
  makeFinanceData,
  makeInstallmentPlan,
  makeTransaction,
  makeTrip,
  makeTripItem,
} from './financeFixtures'

function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) throw new Error(message || 'Assertion failed')
}

assert.equal = function (actual: unknown, expected: unknown, message?: string) {
  if (actual !== expected) throw new Error(`${message ? message + ': ' : ''}Expected ${expected} but got ${actual}`)
}

console.log('Testing shared finance fixtures...')

const expense = makeTransaction()
assert.equal(expense.id, 'transaction-fixture')
assert.equal(expense.monthKey, '2026-01')
assert.equal(expense.createdAt, FIXTURE_TIMESTAMP)

const income = makeTransaction({ id: 'income-fixture', type: 'income', date: '2026-02-01' })
assert.equal(income.categoryId, 'เงินเดือน')
assert.equal(income.monthKey, '2026-02')

const plan = makeInstallmentPlan({ id: 'plan-fixture', monthsTotal: 6 })
assert.equal(plan.id, 'plan-fixture')
assert.equal(plan.monthsTotal, 6)

const tripItem = makeTripItem({ id: 'item-fixture', amount: 125 })
const trip = makeTrip({ id: 'trip-fixture-2', items: [tripItem] })
assert.equal(trip.items[0]?.id, 'item-fixture')
assert.equal(trip.items[0]?.amount, 125)

const data = makeFinanceData({ transactions: [expense], installmentPlans: [plan], trips: [trip] })
assert(!('entries' in data), 'Runtime data must not expose the legacy entries alias')
assert(!('installments' in data), 'Runtime data must not expose the legacy installments alias')
assert.equal(data.trips[0]?.id, 'trip-fixture-2')

console.log('✓ Shared finance fixtures passed')
