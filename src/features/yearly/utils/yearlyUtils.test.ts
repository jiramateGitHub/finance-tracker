import type { TransactionEntry } from '../../../types/finance'
import {
  calculateYearlyCategoryDistribution,
  calculateYearlyMonthlyTrend,
  findYearlyHighlights,
  THAI_MONTH_LABELS,
} from './yearlyUtils'

console.log('Testing yearlyUtils calculations and helpers...')

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const mockTransactions: TransactionEntry[] = [
  {
    id: 'tx-1',
    type: 'income',
    date: '2026-01-15',
    category: 'เงินเดือน',
    title: 'เงินเดือน ม.ค.',
    amount: 50000,
    status: 'cleared',
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'tx-2',
    type: 'expense',
    date: '2026-01-20',
    category: 'ของกิน',
    title: 'ค่าอาหาร',
    amount: 5000,
    status: 'cleared',
    createdAt: '2026-01-20T00:00:00Z',
    updatedAt: '2026-01-20T00:00:00Z',
  },
  {
    id: 'tx-3',
    type: 'expense',
    date: '2026-01-25',
    category: 'บ้าน/เช่า',
    title: 'ค่าเช่าห้อง',
    amount: 10000,
    status: 'cleared',
    createdAt: '2026-01-25T00:00:00Z',
    updatedAt: '2026-01-25T00:00:00Z',
  },
  {
    id: 'tx-4',
    type: 'expense',
    date: '2026-02-10',
    category: 'ช้อปปิ้ง',
    title: 'ซื้อของใช้',
    amount: 3000,
    status: 'pending',
    createdAt: '2026-02-10T00:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
  },
  {
    id: 'tx-5',
    type: 'income',
    date: '2026-02-28',
    category: 'เงินเดือน',
    title: 'เงินเดือน ก.พ.',
    amount: 52000,
    status: 'cleared',
    createdAt: '2026-02-28T00:00:00Z',
    updatedAt: '2026-02-28T00:00:00Z',
  },
]

// 1. THAI_MONTH_LABELS
assert(THAI_MONTH_LABELS.length === 12, 'Must have 12 month labels')
assert(THAI_MONTH_LABELS[0].short === 'ม.ค.', 'First month must be ม.ค.')
assert(THAI_MONTH_LABELS[11].short === 'ธ.ค.', 'Last month must be ธ.ค.')
console.log('✓ THAI_MONTH_LABELS passed')

// 2. calculateYearlyMonthlyTrend
const trend = calculateYearlyMonthlyTrend(mockTransactions, 2026)
assert(trend.length === 12, 'Trend must produce 12 months')
assert(trend[0].monthKey === '2026-01', 'First month is 2026-01')
assert(trend[0].income === 50000, 'Jan income must be 50000')
assert(trend[0].expense === 15000, 'Jan expense must be 15000')
assert(trend[0].balance === 35000, 'Jan balance must be 35000')
assert(trend[0].transactionCount === 3, 'Jan transaction count must be 3')

// Feb pending handling
assert(trend[1].monthKey === '2026-02', 'Second month is 2026-02')
assert(trend[1].income === 52000, 'Feb income must be 52000')
assert(trend[1].expense === 3000, 'Feb expense with pending must be 3000')

const trendNoPending = calculateYearlyMonthlyTrend(mockTransactions, 2026, { includePending: false })
assert(trendNoPending[1].expense === 0, 'Feb expense without pending must be 0')
console.log('✓ calculateYearlyMonthlyTrend passed')

// 3. calculateYearlyCategoryDistribution
const dist = calculateYearlyCategoryDistribution(mockTransactions)
assert(dist.totalExpense === 18000, 'Total expense must be 18000')
assert(dist.categoryCount === 3, 'There are 3 unique expense categories')
assert(dist.slices.length === 3, 'There should be 3 slices')
assert(dist.slices[0].category === 'บ้าน/เช่า', 'Top category is บ้าน/เช่า (10000)')
assert(dist.slices[0].totalAmount === 10000, 'Amount is 10000')
assert(dist.slices[0].percentage === 56, 'Percentage is 56% (10000/18000 = 55.5%)')

// Empty transactions distribution
const emptyDist = calculateYearlyCategoryDistribution([])
assert(emptyDist.slices.length === 0, 'Empty transactions yield empty slices')
assert(emptyDist.totalExpense === 0, 'Empty transactions yield 0 total')
console.log('✓ calculateYearlyCategoryDistribution passed')

// 4. findYearlyHighlights
const highlights = findYearlyHighlights(trend)
assert(highlights.highestIncomeMonth?.monthKey === '2026-02', 'Highest income month is Feb (52000)')
assert(highlights.highestExpenseMonth?.monthKey === '2026-01', 'Highest expense month is Jan (15000)')
assert(highlights.totalIncome === 102000, 'Total income is 102000')
assert(highlights.totalExpense === 18000, 'Total expense is 18000')
assert(highlights.savingsRate !== null && highlights.savingsRate > 0, 'Savings rate should be positive')
console.log('✓ findYearlyHighlights passed')

console.log('ALL YEARLY UTILS TESTS PASSED! 🎉')
