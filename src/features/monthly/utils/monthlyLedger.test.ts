import {
  calculateMonthlyTotals,
  filterMonthlyTransactions,
  groupTransactionsByMonth,
  isInstallmentTransaction,
  isTripTransaction,
  isManualTransaction,
  addMonthsToMonthKey,
  createEmptyMonthlyFilters,
  getMonthKeysInRange,
} from './monthlyLedger'
import { deriveInstallmentTransactions } from '../../installments/utils/installmentPlans'
import { deriveTripTransactions } from '../../trips/utils/tripUtils'
import { calculateEntryTotals } from '../../../lib/finance-calculations'
import type { InstallmentPlan, TransactionEntry, Trip } from '../../../types/finance'

function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) throw new Error(message || 'Assertion failed')
}
assert.equal = function (actual: unknown, expected: unknown, message?: string) {
  if (actual !== expected) throw new Error(`${message ? message + ': ' : ''}Expected ${expected} but got ${actual}`)
}

console.log('Testing monthlyLedger utilities and yearly-monthly consistency...')

// 1. calculateMonthlyTotals
const sampleTransactions: TransactionEntry[] = [
  {
    id: 'tx-1',
    type: 'income',
    date: '2026-09-01',
    category: 'salary',
    title: 'เงินเดือน',
    amount: 50000,
    status: 'cleared',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'tx-2',
    type: 'expense',
    date: '2026-09-05',
    category: 'food',
    title: 'อาหาร',
    amount: 500,
    status: 'cleared',
    createdAt: '2026-09-05T00:00:00Z',
    updatedAt: '2026-09-05T00:00:00Z',
  },
  {
    id: 'tx-3',
    type: 'expense',
    date: '2026-09-25',
    category: 'utilities',
    title: 'ค่าไฟ',
    amount: 1200,
    status: 'pending',
    createdAt: '2026-09-25T00:00:00Z',
    updatedAt: '2026-09-25T00:00:00Z',
  },
]

const totals = calculateMonthlyTotals(sampleTransactions)
assert.equal(totals.income, 50000, 'Income calculation')
assert.equal(totals.expense, 1700, 'Expense calculation')
assert.equal(totals.balance, 48300, 'Balance calculation')
assert.equal(totals.pendingExpense, 1200, 'Pending expense calculation')
assert.equal(totals.count, 3, 'Count calculation')
console.log('✓ calculateMonthlyTotals passed')

// 2. filterMonthlyTransactions
const defaultFilters = createEmptyMonthlyFilters('2026-09')
const allFiltered = filterMonthlyTransactions(sampleTransactions, defaultFilters)
assert.equal(allFiltered.length, 3, 'All filtered length')

// Filter by status: unpaid
const unpaidFiltered = filterMonthlyTransactions(sampleTransactions, {
  ...defaultFilters,
  status: 'unpaid',
})
assert.equal(unpaidFiltered.length, 1, 'Unpaid filter count')
assert.equal(unpaidFiltered[0].id, 'tx-3', 'Unpaid item id')

// Filter by keyword
const searchFiltered = filterMonthlyTransactions(sampleTransactions, {
  ...defaultFilters,
  keyword: 'อาหาร',
})
assert.equal(searchFiltered.length, 1, 'Keyword filter count')
assert.equal(searchFiltered[0].id, 'tx-2')
console.log('✓ filterMonthlyTransactions passed')

// 3. groupTransactionsByMonth
const groups = groupTransactionsByMonth(sampleTransactions)
assert.equal(groups.length, 1)
assert.equal(groups[0].monthKey, '2026-09')
assert.equal(groups[0].transactions.length, 3)
console.log('✓ groupTransactionsByMonth passed')

// 4. Source identification
assert.equal(isManualTransaction(sampleTransactions[0]), true)
assert.equal(isInstallmentTransaction({ ...sampleTransactions[0], sourceModule: 'installment' }), true)
assert.equal(isTripTransaction({ ...sampleTransactions[0], tripId: 'trip-1' }), true)
console.log('✓ Transaction source identification passed')

// 5. addMonthsToMonthKey and getMonthKeysInRange
assert.equal(addMonthsToMonthKey('2026-09', 2), '2026-11')
assert.equal(addMonthsToMonthKey('2026-12', 1), '2027-01')
const range = getMonthKeysInRange('2026-01', '2026-03')
assert.equal(range.length, 3)
assert.equal(range[0], '2026-01')
assert.equal(range[1], '2026-02')
assert.equal(range[2], '2026-03')
console.log('✓ addMonthsToMonthKey and getMonthKeysInRange passed')

// 6. Cross-feature ledger consistency test (Yearly vs Monthly)
const testPlans: InstallmentPlan[] = [
  {
    id: 'plan-1',
    name: 'MacBook Pro',
    category: 'gadget',
    monthlyAmount: 3000,
    monthsTotal: 10,
    monthsPaid: 2,
    startMonth: '2026-01',
    dueDay: 15,
    interestType: 'none',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]

const testTrips: Trip[] = [
  {
    id: 'trip-1',
    name: 'Japan Autumn',
    destination: 'Tokyo',
    startDate: '2026-10-10',
    endDate: '2026-10-15',
    items: [
      {
        id: 'item-1',
        title: 'Shinkansen ticket',
        category: 'transport',
        amount: 4500,
        date: '2026-10-11',
        isPaid: true,
      },
    ],
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
]

// For the full year 2026, 12 months:
const yearMonths = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`)

// Build yearly unified transactions
const yearlyLedger = [
  ...sampleTransactions.filter((tx) => tx.date.startsWith('2026')),
  ...yearMonths.flatMap((m) => deriveInstallmentTransactions(testPlans, m)),
  ...yearMonths.flatMap((m) => deriveTripTransactions(testTrips, m)),
]

// Plan runs 10 months from 2026-01 to 2026-10 (each month 3000 -> 30,000)
// Trip has 1 item in 2026-10 (4500)
// Manual transactions have 1700 expense
const yearlyTotals = calculateEntryTotals(yearlyLedger)
assert.equal(yearlyTotals.income, 50000, 'Yearly income must equal monthly sum')
assert.equal(yearlyTotals.expense, 1700 + 30000 + 4500, 'Yearly expense must include installments and trips')

// Sum of each individual month must exactly equal full year totals
let sumMonthlyExpense = 0
let sumMonthlyIncome = 0
for (const month of yearMonths) {
  const monthTxs = yearlyLedger.filter((tx) => tx.date.startsWith(month))
  const mTotals = calculateMonthlyTotals(monthTxs)
  sumMonthlyIncome += mTotals.income
  sumMonthlyExpense += mTotals.expense
}
assert.equal(sumMonthlyIncome, yearlyTotals.income, 'Sum of 12 months income equals yearly income')
assert.equal(sumMonthlyExpense, yearlyTotals.expense, 'Sum of 12 months expense equals yearly expense')
console.log('✓ Yearly-Monthly Ledger Consistency verification passed!')

console.log('ALL MONTHLY LEDGER TESTS PASSED! 🎉')
