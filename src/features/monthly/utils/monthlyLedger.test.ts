import {
  calculateMonthlyTotals,
  createMemoizedLedgerSelector,
  filterMonthlyTransactions,
  groupTransactionsByMonth,
  isInstallmentTransaction,
  isTripTransaction,
  isManualTransaction,
  selectPersistedLedgerTransactions,
  addMonthsToMonthKey,
  createEmptyMonthlyFilters,
  getMonthKeysInRange,
  resolveMonthlyFilterRange,
  selectLedgerTransactionsForRange,
} from './monthlyLedger'
import { parseMonthlySmartKeyword } from './monthlySmartFilter'
import { deriveInstallmentTransactions, deriveInstallmentTransactionsForMonths } from '../../installments/utils/installmentPlans'
import { deriveTripTransactions, deriveTripTransactionsForMonths } from '../../trips/utils/tripUtils'
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

const cashOnlyTotals = calculateMonthlyTotals(sampleTransactions, { includePending: false })
assert.equal(cashOnlyTotals.income, 50000, 'Cash-only income calculation')
assert.equal(cashOnlyTotals.expense, 500, 'Cash-only totals exclude pending expense')
assert.equal(cashOnlyTotals.balance, 49500, 'Cash-only balance calculation')
assert.equal(cashOnlyTotals.pendingExpense, 1200, 'Pending amount remains visible when excluded from totals')
assert.equal(calculateEntryTotals(sampleTransactions, { includePending: false }).expense, 500, 'Shared totals helper follows the pending policy')
console.log('✓ Pending totals policy passed')

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
const inclusiveMax = parseMonthlySmartKeyword('ไม่เกิน 500')
assert.equal(inclusiveMax.text, '', 'ไม่เกิน should be consumed as one operator')
assert.equal(inclusiveMax.maxInclusive, true, 'ไม่เกิน should include the boundary')
assert.equal(filterMonthlyTransactions(sampleTransactions, { ...defaultFilters, keyword: 'ไม่เกิน 500' }).length, 1, 'ไม่เกิน keeps amount equal to the boundary')
assert.equal(filterMonthlyTransactions(sampleTransactions, { ...defaultFilters, keyword: 'เกิน 500' }).length, 2, 'เกิน excludes amount equal to the boundary')
const previousMonth = addMonthsToMonthKey(defaultFilters.rangeStartMonth, -1)
assert.equal(resolveMonthlyFilterRange({ ...defaultFilters, keyword: 'เดือนก่อน' })[0], previousMonth, 'เดือนก่อน resolves the derived range')
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
assert.equal(isManualTransaction({ ...sampleTransactions[0], tripId: 'trip-1', sourceModule: 'manual' }), true)
assert.equal(isManualTransaction({ ...sampleTransactions[0], tripId: 'trip-1', sourceModule: 'trip' }), false)
assert.equal(selectPersistedLedgerTransactions([
  sampleTransactions[0],
  { ...sampleTransactions[1], sourceModule: 'installment' },
  { ...sampleTransactions[2], tripId: 'trip-1', sourceModule: 'manual' },
]).length, 2, 'Linked manual transactions stay in the persisted ledger')
const linkedManualExpense = { ...sampleTransactions[1], id: 'linked-manual-expense', tripId: 'trip-1', sourceModule: 'manual' }
assert.equal(filterMonthlyTransactions([linkedManualExpense], { ...defaultFilters, type: 'expense' }).length, 1, 'Expense filter keeps linked manual records')
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

const selectorData = {
  transactions: sampleTransactions,
  installmentPlans: testPlans,
  trips: testTrips,
}
const selectedRangeLedger = selectLedgerTransactionsForRange(selectorData, {
  startMonth: '2026-10',
  endMonth: '2026-09',
})
assert.equal(selectedRangeLedger.length, 6, 'Shared selector normalizes reversed range and includes all October/September rows')
assert.equal(selectedRangeLedger.filter((tx) => tx.sourceModule === 'installment').length, 2, 'Shared selector derives installment rows for every month in range')
assert.equal(selectedRangeLedger.filter((tx) => tx.sourceModule === 'trip').length, 1, 'Shared selector derives trip rows for every month in range')
assert(selectedRangeLedger.every((tx) => tx.date.startsWith('2026-09') || tx.date.startsWith('2026-10')), 'Shared selector keeps rows inside the normalized range')
const memoizedLedger = createMemoizedLedgerSelector()
const memoizedFirst = memoizedLedger(selectorData, { startMonth: '2026-09', endMonth: '2026-10' })
const memoizedSecond = memoizedLedger(selectorData, { startMonth: '2026-10', endMonth: '2026-09' })
assert(memoizedFirst === memoizedSecond, 'Memoized ledger selector should reuse rows for equivalent references and ranges')
assert.equal(memoizedLedger.getStats().computations, 1, 'Memoized ledger selector should compute once for equivalent ranges')
const memoizedChanged = memoizedLedger({ ...selectorData, transactions: [...sampleTransactions] }, { startMonth: '2026-09', endMonth: '2026-10' })
assert(memoizedChanged !== memoizedFirst, 'Memoized ledger selector should invalidate when a source collection changes')
assert.equal(memoizedLedger.getStats().computations, 2, 'Memoized ledger selector should count one new computation after source changes')
const orphanInstallment = {
  ...sampleTransactions[1],
  id: 'orphan-installment',
  sourceModule: 'installment',
  installmentId: 'missing-plan',
  installmentPlanId: 'missing-plan',
}
const orphanLedger = selectLedgerTransactionsForRange({ ...selectorData, transactions: [orphanInstallment] }, {
  startMonth: '2026-09',
  endMonth: '2026-09',
})
assert.equal(orphanLedger.some((tx) => tx.id === orphanInstallment.id), true, 'Orphan installment references remain visible instead of being silently dropped')
const persistedDerivedInstallment = deriveInstallmentTransactions(testPlans, '2026-09')[0]
const deduplicatedLedger = selectLedgerTransactionsForRange({ ...selectorData, transactions: [persistedDerivedInstallment] }, {
  startMonth: '2026-09',
  endMonth: '2026-09',
})
assert.equal(deduplicatedLedger.filter((tx) => tx.id === persistedDerivedInstallment.id).length, 1, 'Known installment rows are derived once instead of duplicated')
const canonicalTripTransaction: TransactionEntry = {
  id: 'tx-trip-trip-1-item-1',
  type: 'expense',
  date: '2026-10-11',
  category: 'transport',
  categoryId: 'transport',
  title: 'Shinkansen ticket',
  amount: 4500,
  currency: 'THB',
  status: 'cleared',
  source: 'import',
  sourceModule: 'trip',
  sourceRefId: 'item-1',
  tripId: 'trip-1',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
}
const canonicalTripLedger = selectLedgerTransactionsForRange({ ...selectorData, transactions: [canonicalTripTransaction] }, {
  startMonth: '2026-10',
  endMonth: '2026-10',
})
assert.equal(canonicalTripLedger.filter((tx) => tx.sourceModule === 'trip').length, 1, 'Canonical trip transaction must be counted once when nested item remains as a compatibility read model')
assert.equal(canonicalTripLedger.find((tx) => tx.sourceModule === 'trip')?.amount, 4500, 'Trip cashflow policy keeps canonical transaction amount')
const tripInstallmentPurchase: TransactionEntry = {
  ...canonicalTripTransaction,
  id: 'tx-trip-trip-1-installment-item',
  sourceRefId: 'installment-item',
  amount: 12000,
  installmentPlanId: 'plan-1',
  installmentId: 'plan-1',
}
const tripInstallmentLedger = selectLedgerTransactionsForRange({ ...selectorData, transactions: [tripInstallmentPurchase] }, {
  startMonth: '2026-01',
  endMonth: '2026-01',
})
assert.equal(tripInstallmentLedger.some((tx) => tx.id === tripInstallmentPurchase.id), false, 'Cashflow must use installment occurrences when a trip purchase is explicitly linked to a known plan')
assert.equal(tripInstallmentLedger.filter((tx) => tx.sourceModule === 'installment').length, 1, 'Linked trip purchase should keep one installment cashflow occurrence')
console.log('✓ Shared Monthly/Yearly ledger selector passed')

// For the full year 2026, 12 months:
const yearMonths = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, '0')}`)

// Build yearly unified transactions
const yearlyLedger = [
  ...sampleTransactions.filter((tx) => tx.date.startsWith('2026')),
  ...yearMonths.flatMap((m) => deriveInstallmentTransactions(testPlans, m)),
  ...yearMonths.flatMap((m) => deriveTripTransactions(testTrips, m)),
]

const sharedYearlyLedger = selectLedgerTransactionsForRange(selectorData, {
  startMonth: '2026-01',
  endMonth: '2026-12',
})
const sharedMonthlyLedger = yearMonths.flatMap((month) => selectLedgerTransactionsForRange(selectorData, {
  startMonth: month,
  endMonth: month,
}))
assert.equal(calculateEntryTotals(sharedYearlyLedger).expense, calculateEntryTotals(sharedMonthlyLedger).expense, 'Shared selector yearly and monthly expense totals must match')
assert.equal(calculateEntryTotals(sharedYearlyLedger).income, calculateEntryTotals(sharedMonthlyLedger).income, 'Shared selector yearly and monthly income totals must match')
const derivationStats = { scheduleLookups: 0 }
deriveInstallmentTransactionsForMonths(testPlans, yearMonths, derivationStats)
assert.equal(derivationStats.scheduleLookups, testPlans.length, 'Range derivation should calculate each installment schedule once per plan')
const naiveScheduleLookups = testPlans.length * yearMonths.length
assert(derivationStats.scheduleLookups < naiveScheduleLookups, `Range derivation benchmark should reduce schedule lookups (${naiveScheduleLookups} -> ${derivationStats.scheduleLookups})`)
const tripDerivationStats = { itemLookups: 0 }
deriveTripTransactionsForMonths(testTrips, yearMonths, [], tripDerivationStats)
assert.equal(tripDerivationStats.itemLookups, testTrips.reduce((total, trip) => total + trip.items.length, 0), 'Range derivation should inspect each trip item once')

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
