import type { InstallmentPlan } from '../../../types/finance'
import {
  addMonths,
  calculateInstallmentMonthlyInfo,
  calculateInstallmentProgress,
  deriveInstallmentTransactions,
  filterInstallmentPlans,
  getInstallment12MonthProjection,
  getInstallmentDashboardMetrics,
  monthDiff,
  setAllMonthsPaid,
  setPaidMonth,
} from './installmentPlans'

function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) throw new Error(message || 'Assertion failed')
}
assert.equal = function(actual: unknown, expected: unknown, message?: string) {
  if (actual !== expected) throw new Error(`${message ? message + ': ' : ''}Expected ${expected} but got ${actual}`)
}
assert.ok = function(val: unknown, message?: string) {
  if (!val) throw new Error(message || 'Expected truthy value')
}

console.log('Testing Installment Plan utilities and calculations...')

// Test 1: monthDiff
assert.equal(monthDiff('2026-01', '2026-03'), 2)
assert.equal(monthDiff('2025-11', '2026-02'), 3)
assert.equal(monthDiff('2026-05', '2026-01'), -4)
assert.equal(monthDiff('2026-03', '2026-03'), 0)
console.log('✓ monthDiff passed')

// Test 2: addMonths
assert.equal(addMonths('2026-01', 3), '2026-04')
assert.equal(addMonths('2025-11', 2), '2026-01')
assert.equal(addMonths('2026-03', -2), '2026-01')
console.log('✓ addMonths passed')

// Sample plans
const plan1: InstallmentPlan = {
  id: 'p1',
  name: 'iPhone 16 Pro',
  category: 'ผ่อนสินค้า',
  monthlyAmount: 4890,
  monthsTotal: 10,
  monthsPaid: 2,
  startMonth: '2026-01',
  dueDay: 25,
  interestType: 'none',
  paidMonthKeys: ['2026-01', '2026-02'],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const plan2: InstallmentPlan = {
  id: 'p2',
  name: 'ผ่อนรถยนต์',
  category: 'รถยนต์',
  monthlyAmount: 12000,
  monthsTotal: 48,
  monthsPaid: 10,
  startMonth: '2025-05',
  dueDay: 5,
  interestType: 'flat',
  interestRate: 2.5,
  paidMonthKeys: Array.from({ length: 10 }, (_, i) => addMonths('2025-05', i)),
  createdAt: '2025-05-01T00:00:00Z',
  updatedAt: '2025-05-01T00:00:00Z',
}

const plan3Completed: InstallmentPlan = {
  id: 'p3',
  name: 'เครื่องฟอกอากาศ',
  category: 'ผ่อนสินค้า',
  monthlyAmount: 1500,
  monthsTotal: 6,
  monthsPaid: 6,
  startMonth: '2025-08',
  dueDay: 15,
  interestType: 'none',
  paidMonthKeys: ['2025-08', '2025-09', '2025-10', '2025-11', '2025-12', '2026-01'],
  createdAt: '2025-08-01T00:00:00Z',
  updatedAt: '2026-01-15T00:00:00Z',
}

// Test 3: calculateInstallmentProgress
const p1Progress = calculateInstallmentProgress(plan1)
assert.equal(p1Progress.totalAmount, 48900)
assert.equal(p1Progress.totalPaid, 9780)
assert.equal(p1Progress.remainingAmount, 39120)
assert.equal(p1Progress.monthsPaid, 2)
assert.equal(p1Progress.monthsRemaining, 8)
assert.equal(p1Progress.progressPercent, 20)
assert.equal(p1Progress.endMonth, '2026-10')
console.log('✓ calculateInstallmentProgress passed')

// Test 4: calculateInstallmentMonthlyInfo for selectedMonth
const infoP1InMarch = calculateInstallmentMonthlyInfo(plan1, '2026-03')
assert.equal(infoP1InMarch.isActiveInMonth, true)
assert.equal(infoP1InMarch.isPaidInMonth, false)
assert.equal(infoP1InMarch.isCompleted, false)
assert.equal(infoP1InMarch.dueDay, 25)

const infoP3InMarch = calculateInstallmentMonthlyInfo(plan3Completed, '2026-03')
assert.equal(infoP3InMarch.isCompleted, true)
assert.equal(infoP3InMarch.isActiveInMonth, false)
console.log('✓ calculateInstallmentMonthlyInfo passed')

// Test 5: Overdue and Due-soon detection
const fixedToday = new Date(2026, 2, 28) // March 28, 2026
const infoOverdue = calculateInstallmentMonthlyInfo(plan2, '2026-03', fixedToday)
// plan2 has dueDay: 5, and not paid in 2026-03, today is March 28th -> must be overdue!
assert.equal(infoOverdue.dueDay, 5)
assert.equal(infoOverdue.isPaidInMonth, false)
assert.equal(infoOverdue.isOverdue, true, 'plan2 should be overdue on March 28')
assert.equal(infoOverdue.isDueSoon, false)

// Past month overdue check (plan1 paid only month 1, month 2 2026-02 is unpaid)
const planUnpaidPast: InstallmentPlan = { ...plan1, paidMonthKeys: ['2026-01'] }
const infoPastOverdue = calculateInstallmentMonthlyInfo(planUnpaidPast, '2026-02', fixedToday)
assert.equal(infoPastOverdue.isPaidInMonth, false)
assert.equal(infoPastOverdue.isOverdue, true, 'unpaid plan in past month 2026-02 should be overdue')

// Due-soon check
const fixedMarch3 = new Date(2026, 2, 3)
const infoDueSoon = calculateInstallmentMonthlyInfo(plan2, '2026-03', fixedMarch3)
assert.equal(infoDueSoon.isDueSoon, true, 'plan2 on March 3 should be due soon')
assert.equal(infoDueSoon.daysUntilDue, 2)

// Due today check (daysUntilDue = 0)
const fixedMarch5 = new Date(2026, 2, 5)
const infoDueToday = calculateInstallmentMonthlyInfo(plan2, '2026-03', fixedMarch5)
assert.equal(infoDueToday.isDueSoon, true, 'plan2 on March 5 should be due today')
assert.equal(infoDueToday.daysUntilDue, 0)

// Leap year and month end day clamping
const planLeapYear: InstallmentPlan = { ...plan1, id: 'leap', startMonth: '2024-02', dueDay: 31 }
const infoLeap = calculateInstallmentMonthlyInfo(planLeapYear, '2024-02')
assert.equal(infoLeap.actualDueDay, 29, 'dueDay 31 in leap year Feb 2024 should clamp to 29')
const infoNonLeap = calculateInstallmentMonthlyInfo(planLeapYear, '2025-02')
assert.equal(infoNonLeap.actualDueDay, 28, 'dueDay 31 in non-leap year Feb 2025 should clamp to 28')
console.log('✓ Overdue, Due-soon, and Leap-year date clamping passed')

// Test 6: getInstallmentDashboardMetrics
const metrics = getInstallmentDashboardMetrics([plan1, plan2, plan3Completed], '2026-03')
assert.equal(metrics.activeCountThisMonth, 2) // plan1 and plan2 active in March 2026
assert.equal(metrics.totalDueThisMonth, 4890 + 12000)
assert.equal(metrics.nextPayoffCandidate?.plan.id, 'p1') // plan1 finishes in Oct 2026, earlier than plan2 in 2029
assert.equal(metrics.nextPayoffCandidate?.remainingMonths, 8)
console.log('✓ getInstallmentDashboardMetrics passed')

// Test 7: getInstallment12MonthProjection
const proj = getInstallment12MonthProjection([plan1, plan2, plan3Completed], '2026-03')
assert.equal(proj.months.length, 12)
assert.equal(proj.months[0].totalDue, 4890 + 12000)
// In 2026-10 (month index 7), plan1 finishes!
const octMonth = proj.months.find((m) => m.monthKey === '2026-10')
assert.ok(octMonth && octMonth.finishingPlans.includes('iPhone 16 Pro'))
// In 2026-11, plan1 is gone, so totalDue should be only plan2 (12000)
const novMonth = proj.months.find((m) => m.monthKey === '2026-11')
assert.ok(novMonth && novMonth.totalDue === 12000)
console.log('✓ getInstallment12MonthProjection passed')

// Test 8: setPaidMonth & setAllMonthsPaid with balance override clearance
const paidMarch = setPaidMonth(plan1, '2026-03', true)
assert.ok(paidMarch.paidMonthKeys?.includes('2026-03'))
assert.equal(paidMarch.monthsPaid, 3)

const allPaid = setAllMonthsPaid(plan1, true)
assert.equal(allPaid.monthsPaid, 10)
assert.equal(allPaid.paidMonthKeys?.length, 10)

const planWithOverride: InstallmentPlan = { ...plan1, remainingOverride: 15000 }
const settledPlan = setAllMonthsPaid(planWithOverride, true)
assert.equal(settledPlan.remainingOverride, 0, 'early settlement should clear remainingOverride to 0')
assert.equal(calculateInstallmentProgress(settledPlan).remainingAmount, 0, 'settled plan progress remainingAmount should be 0')

const resetPaid = setAllMonthsPaid(plan1, false)
assert.equal(resetPaid.monthsPaid, 0)
assert.equal(resetPaid.paidMonthKeys?.length, 0)
console.log('✓ setPaidMonth and setAllMonthsPaid passed')

// Test 9: filterInstallmentPlans with rigorous status checks
const filteredDue = filterInstallmentPlans([plan1, plan2, plan3Completed], {
  keyword: '',
  status: 'dueThisMonth',
  startMonth: '',
  endMonth: '',
  sortOrder: 'dueDay',
  selectedMonth: '2026-03',
})
assert.equal(filteredDue.length, 2)
assert.equal(filteredDue[0].id, 'p2') // dueDay 5 comes before dueDay 25!
assert.equal(filteredDue[1].id, 'p1')

// Status: paid (must NOT include historically completed plans like plan3Completed in 2026-03!)
const filteredPaid = filterInstallmentPlans([plan1, plan2, plan3Completed], {
  keyword: '',
  status: 'paid',
  startMonth: '',
  endMonth: '',
  sortOrder: 'dueDay',
  selectedMonth: '2026-03',
})
assert.equal(filteredPaid.length, 0, 'no plans paid in 2026-03')

const filteredPaidWithPlan1 = filterInstallmentPlans([paidMarch, plan2, plan3Completed], {
  keyword: '',
  status: 'paid',
  startMonth: '',
  endMonth: '',
  sortOrder: 'dueDay',
  selectedMonth: '2026-03',
})
assert.equal(filteredPaidWithPlan1.length, 1, 'only paidMarch is paid in 2026-03; plan3Completed is not included')
assert.equal(filteredPaidWithPlan1[0].id, 'p1')

const filteredCompleted = filterInstallmentPlans([plan1, plan2, plan3Completed], {
  keyword: '',
  status: 'completed',
  startMonth: '',
  endMonth: '',
  sortOrder: 'dueDay',
  selectedMonth: '2026-03',
})
assert.equal(filteredCompleted.length, 1)
assert.equal(filteredCompleted[0].id, 'p3')
console.log('✓ filterInstallmentPlans passed')

// Test 10: deriveInstallmentTransactions backward compatibility
const txs = deriveInstallmentTransactions([plan1], '2026-01')
assert.equal(txs.length, 1)
assert.equal(txs[0].amount, 4890)
assert.equal(txs[0].status, 'cleared') // paid in 2026-01
const txsMarch = deriveInstallmentTransactions([plan1], '2026-03')
assert.equal(txsMarch[0].status, 'pending') // not paid in 2026-03
console.log('✓ deriveInstallmentTransactions passed')

// Test 11: getInstallmentCategoryDistribution
import { getInstallmentCategoryDistribution } from './installmentPlans'
const catDist = getInstallmentCategoryDistribution([plan1, plan2, plan3Completed], '2026-03')
assert.equal(catDist.totalMonthlyDue, 4890 + 12000)
assert.equal(catDist.slices.length, 2)
assert.equal(catDist.slices[0].category, 'รถยนต์') // 12,000 > 4,890
assert.equal(catDist.slices[0].totalAmount, 12000)
assert.equal(catDist.slices[1].category, 'ผ่อนสินค้า')
assert.equal(catDist.slices[1].totalAmount, 4890)
console.log('✓ getInstallmentCategoryDistribution passed')

console.log('ALL 11 TESTS PASSED SUCCESSFULLY! 🎉')
