import type { InstallmentPlan, RecurringRule } from '../../../types/finance'
import {
  calculateRecurringMonthlyInfo,
  filterRecurringRules,
  getDateDifferenceInDays,
  getRecurringDashboardMetrics,
  getRecurringRuleDueDate,
  getRecurringRuleDueDay,
  getRecurringRuleStatementDate,
  getUnifiedObligationsCalendar,
  isRecurringRuleActiveInMonth,
  RECURRING_TYPE_CONFIG,
} from './recurringBills'

function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) throw new Error(message || 'Assertion failed')
}

assert.equal = function (actual: unknown, expected: unknown, message?: string) {
  if (actual !== expected) throw new Error(`${message ? message + ': ' : ''}Expected ${expected} but got ${actual}`)
}

console.log('Testing Recurring Bills utilities and obligations calendar...')

// 1. Due day and Date Clamping
const rule31: RecurringRule = {
  id: 'r1',
  title: 'บิลสิ้นเดือน',
  type: 'utility',
  category: 'สาธารณูปโภค',
  amount: 500,
  currency: 'THB',
  cadence: 'monthly',
  interval: 1,
  dueDay: 31,
  startDate: '2026-01-01',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

assert.equal(getRecurringRuleDueDay(rule31), 31, 'Due day should be 31')
assert.equal(getRecurringRuleDueDate(rule31, '2026-02'), '2026-02-28', 'Clamps to Feb 28 in non-leap year')
assert.equal(getRecurringRuleDueDate(rule31, '2024-02'), '2024-02-29', 'Clamps to Feb 29 in leap year')
assert.equal(getRecurringRuleDueDate(rule31, '2026-04'), '2026-04-30', 'Clamps to Apr 30 in 30-day month')
assert.equal(getRecurringRuleDueDate(rule31, '2026-05'), '2026-05-31', 'Stays 31 on 31-day month')

// Statement day
const cardRule: RecurringRule = {
  id: 'r-card',
  title: 'บัตรเครดิต',
  type: 'credit_card',
  category: 'หนี้สินและการเงิน',
  amount: 5000,
  currency: 'THB',
  cadence: 'monthly',
  interval: 1,
  statementDay: 20,
  dueDay: 5,
  startDate: '2026-01-01',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

assert.equal(getRecurringRuleStatementDate(cardRule, '2026-09'), '2026-09-20', 'Statement date resolved')
assert.equal(getRecurringRuleStatementDate(rule31, '2026-09'), null, 'Null statement day returns null')
assert.equal(getDateDifferenceInDays('2026-09-10', '2026-09-15'), 5, 'Date difference in days')

// 2. Status Calculation: Overdue, Due Soon, Paid, Upcoming
// Reference date: 2026-09-16
const mockToday = new Date('2026-09-16T10:00:00')

// Overdue: due on Sep 5 and unpaid
const overdueInfo = calculateRecurringMonthlyInfo(cardRule, '2026-09', mockToday)
assert.equal(overdueInfo.isPaid, false, 'Card rule is unpaid')
assert.equal(overdueInfo.isOverdue, true, 'Sep 5 < Sep 16 is overdue')
assert.equal(overdueInfo.status, 'overdue', 'Status is overdue')

// Due soon: due on Sep 18 (2 days away)
const dueSoonRule: RecurringRule = {
  ...rule31,
  id: 'r-due-soon',
  dueDay: 18,
}
const dueSoonInfo = calculateRecurringMonthlyInfo(dueSoonRule, '2026-09', mockToday)
assert.equal(dueSoonInfo.isOverdue, false, 'Not overdue')
assert.equal(dueSoonInfo.isDueSoon, true, 'Due in 2 days is due soon')
assert.equal(dueSoonInfo.status, 'dueSoon', 'Status is dueSoon')

// Upcoming: due on Sep 28 (> 3 days)
const upcomingRule: RecurringRule = {
  ...rule31,
  id: 'r-upcoming',
  dueDay: 28,
}
const upcomingInfo = calculateRecurringMonthlyInfo(upcomingRule, '2026-09', mockToday)
assert.equal(upcomingInfo.status, 'upcoming', 'Status is upcoming')
assert.equal(upcomingInfo.isDueSoon, false, 'Not due soon')

// Paid: month in paidMonthKeys
const paidRule: RecurringRule = {
  ...cardRule,
  id: 'r-paid',
  paidMonthKeys: ['2026-09'],
}
const paidInfo = calculateRecurringMonthlyInfo(paidRule, '2026-09', mockToday)
assert.equal(paidInfo.isPaid, true, 'Rule is paid')
assert.equal(paidInfo.isOverdue, false, 'Paid rule is not overdue')
assert.equal(paidInfo.status, 'paid', 'Status is paid')

console.log('✓ Overdue, Due-soon, Paid, and Date clamping passed')

// 3. Dashboard Metrics
const allRules = [cardRule, dueSoonRule, upcomingRule, paidRule]
const metrics = getRecurringDashboardMetrics(allRules, '2026-09', mockToday)
assert.equal(metrics.totalCount, 4, 'Total count 4')
assert.equal(metrics.activeCount, 4, 'Active count 4')
assert.equal(metrics.paidCount, 1, '1 paid')
assert.equal(metrics.unpaidCount, 3, '3 unpaid')
assert.equal(metrics.overdueCount, 1, '1 overdue')
assert.equal(metrics.dueSoonCount, 1, '1 due soon')
assert.equal(metrics.paidAmount, 5000, 'Paid amount 5000')
assert.equal(metrics.unpaidAmount, 6000, 'Unpaid amount 5000 + 500 + 500 = 6000')
assert.equal(metrics.urgentBills.length, 2, '2 urgent bills (overdue + dueSoon)')

console.log('✓ Recurring dashboard metrics calculation passed')

// 4. Filtering and Sorting
const filteredOverdue = filterRecurringRules(allRules, { keyword: '', type: 'all', status: 'overdue' }, '2026-09', mockToday)
assert.equal(filteredOverdue.length, 1, 'Filtered overdue count 1')
assert.equal(filteredOverdue[0]?.rule.id, 'r-card', 'First overdue is r-card')

const filteredPaid = filterRecurringRules(allRules, { keyword: '', type: 'all', status: 'paid' }, '2026-09', mockToday)
assert.equal(filteredPaid.length, 1, 'Filtered paid count 1')
assert.equal(filteredPaid[0]?.rule.id, 'r-paid', 'Paid is r-paid')

const filteredKeyword = filterRecurringRules(allRules, { keyword: 'สิ้นเดือน', type: 'all', status: 'all' }, '2026-09', mockToday)
assert.equal(filteredKeyword.length, 2, 'Keyword filtered 2 rules')

console.log('✓ Recurring filtering and natural sorting passed')

// 5. Unified Obligations Calendar
const samplePlan: InstallmentPlan = {
  id: 'plan-cal-1',
  name: 'ผ่อนทีวี',
  category: 'ผ่อนสินค้า',
  monthlyAmount: 2000,
  monthsTotal: 10,
  monthsPaid: 2,
  paidMonthKeys: [],
  startMonth: '2026-08',
  dueDay: 15,
  interestType: 'none',
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
}

const cal = getUnifiedObligationsCalendar(allRules, [samplePlan], '2026-09', mockToday)
assert.equal(cal.daysInMonth, 30, 'Sep has 30 days')
assert.equal(cal.days[5]?.bills.length, 2, 'Day 5 has 2 bills (cardRule and paidRule)')
assert.equal(cal.days[15]?.installments.length, 1, 'Day 15 has 1 installment')
assert.equal(cal.days[20]?.statements.length, 2, 'Day 20 has credit card statement cut-offs')
assert(cal.monthSummary.totalObligations > 0, 'Total obligations aggregated')

// RECURRING_TYPE_CONFIG
assert.equal(RECURRING_TYPE_CONFIG.credit_card.label, 'บัตรเครดิต', 'Type config credit_card')
assert.equal(RECURRING_TYPE_CONFIG.utility.tone, 'warning', 'Utility tone is warning')

// 6. Edge Cases: startDate, endDate, and disabled isActive
// Case 6.1: Future startDate (starts in Nov 2026, evaluated in Sep 2026 with dueDay: 5)
const futureRule: RecurringRule = {
  ...rule31,
  id: 'r-future',
  dueDay: 5,
  startDate: '2026-11-01',
}
assert.equal(isRecurringRuleActiveInMonth(futureRule, '2026-09'), false, 'Future rule is not active in Sep')
assert.equal(isRecurringRuleActiveInMonth(futureRule, '2026-11'), true, 'Future rule is active in Nov')
const futureInfoSep = calculateRecurringMonthlyInfo(futureRule, '2026-09', mockToday)
assert.equal(futureInfoSep.isOverdue, false, 'Future bill must NOT be marked overdue in past months')
assert.equal(futureInfoSep.status, 'inactive', 'Future bill status is inactive in Sep')

// Case 6.2: Expired endDate (ended in Jul 2026, evaluated in Sep 2026 with dueDay: 5)
const expiredRule: RecurringRule = {
  ...rule31,
  id: 'r-expired',
  dueDay: 5,
  startDate: '2026-01-01',
  endDate: '2026-07-31',
}
assert.equal(isRecurringRuleActiveInMonth(expiredRule, '2026-09'), false, 'Expired rule is not active in Sep')
assert.equal(isRecurringRuleActiveInMonth(expiredRule, '2026-07'), true, 'Expired rule was active in Jul')
const expiredInfoSep = calculateRecurringMonthlyInfo(expiredRule, '2026-09', mockToday)
assert.equal(expiredInfoSep.isOverdue, false, 'Expired bill must NOT be marked overdue')
assert.equal(expiredInfoSep.status, 'inactive', 'Expired bill status is inactive in Sep')

// Case 6.3: Disabled rule (isActive: false)
const disabledRule: RecurringRule = {
  ...rule31,
  id: 'r-disabled',
  dueDay: 5,
  isActive: false,
}
assert.equal(isRecurringRuleActiveInMonth(disabledRule, '2026-09'), false, 'Disabled rule is not active')
const disabledInfo = calculateRecurringMonthlyInfo(disabledRule, '2026-09', mockToday)
assert.equal(disabledInfo.isOverdue, false, 'Disabled rule is not overdue')
assert.equal(disabledInfo.status, 'inactive', 'Disabled rule status is inactive, not upcoming')

// Case 6.4: Metrics must ignore inactive rules
const metricsWithInactive = getRecurringDashboardMetrics([cardRule, futureRule, expiredRule, disabledRule], '2026-09', mockToday)
assert.equal(metricsWithInactive.activeCount, 1, 'Only cardRule is active in Sep')
assert.equal(metricsWithInactive.overdueCount, 1, 'Only cardRule is overdue in Sep, not future/expired/disabled')

// Case 6.5: Filtering by inactive and unpaid
const filteredInactive = filterRecurringRules([cardRule, disabledRule, expiredRule], { keyword: '', type: 'all', status: 'inactive' }, '2026-09', mockToday)
assert.equal(filteredInactive.length, 2, 'Filtered inactive returns disabled and expired rules')

const filteredUnpaidWithDisabled = filterRecurringRules([cardRule, disabledRule], { keyword: '', type: 'all', status: 'unpaid' }, '2026-09', mockToday)
assert.equal(filteredUnpaidWithDisabled.length, 1, 'Unpaid filter excludes disabled rules')
assert.equal(filteredUnpaidWithDisabled[0]?.rule.id, 'r-card', 'Only active unpaid cardRule returned')

console.log('✓ Inactive, Future startDate, and Expired endDate edge cases passed')
console.log('ALL RECURRING BILL TESTS PASSED! 🎉')
