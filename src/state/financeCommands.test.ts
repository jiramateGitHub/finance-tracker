import { createEmptyFinanceData, withUpdatedMeta } from '../lib/dataMigration'
import type { Budget, Goal, InstallmentPlan, RecurringRule, TransactionEntry, Trip } from '../types/finance'
import {
  addRecurringRule,
  addTrip,
  deleteGoal,
  deleteRecurringRule,
  deleteTrip,
  payRecurringRule,
  unpayRecurringRule,
  updateRecurringRule,
  updateTransaction,
  updateTrip,
} from './financeCommands'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const transaction: TransactionEntry = {
  id: 'tx-command-1',
  type: 'expense',
  date: '2026-09-10',
  monthKey: '2026-09',
  category: 'อาหาร',
  categoryId: 'อาหาร',
  title: 'มื้อกลางวัน',
  amount: 120,
  currency: 'THB',
  status: 'cleared',
  source: 'manual',
  sourceModule: 'manual',
  sourceRefId: null,
  tripId: null,
  installmentPlanId: null,
  recurringRuleId: null,
  goalId: null,
  createdAt: '2026-09-10T00:00:00Z',
  updatedAt: '2026-09-10T00:00:00Z',
}

const plan: InstallmentPlan = {
  id: 'plan-command-1',
  name: 'โทรศัพท์',
  category: 'ผ่อนสินค้า',
  categoryId: 'ผ่อนสินค้า',
  monthlyAmount: 1000,
  monthsTotal: 3,
  installmentCount: 3,
  monthsPaid: 0,
  paidMonthKeys: [],
  startMonth: '2026-09',
  dueDay: 5,
  interestType: 'none',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
}

const budget: Budget = {
  id: 'budget-command-1',
  scope: 'monthly',
  month: '2026-09',
  category: 'อาหาร',
  categoryId: 'อาหาร',
  amount: 5000,
  enabled: true,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
}

const goal: Goal = {
  id: 'goal-command-1',
  name: 'เงินสำรอง',
  kind: 'savings',
  targetAmount: 10000,
  currentAmount: 1000,
  status: 'active',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
}

const trip: Trip = {
  id: 'trip-command-1',
  name: 'เชียงใหม่',
  destination: 'เชียงใหม่',
  startDate: '2026-10-01',
  endDate: '2026-10-03',
  items: [{
    id: 'trip-item-command-1',
    date: '2026-10-01',
    category: 'เดินทาง',
    categoryId: 'เดินทาง',
    title: 'ตั๋วรถไฟ',
    amount: 900,
    isPaid: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  }],
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
}

const base = {
  ...createEmptyFinanceData(),
  transactions: [transaction],
  installmentPlans: [plan],
  budgets: [budget],
  goals: [goal],
}

const touched = withUpdatedMeta(base)
assert(touched.transactions === base.transactions && touched.installmentPlans === base.installmentPlans && touched.budgets === base.budgets && touched.goals === base.goals, 'Metadata updates must preserve collection identity')

const updated = updateTransaction(base, transaction.id, { title: 'มื้อเย็น', amount: 180 }, '2026-09-11T00:00:00Z')
assert(updated.transactions !== base.transactions, 'Updating an entity should replace only its collection')
assert(updated.installmentPlans === base.installmentPlans, 'Transaction command must preserve installment collection identity')
assert(updated.budgets === base.budgets && updated.goals === base.goals, 'Transaction command must preserve unrelated collections')
assert(updated.transactions[0]?.id === transaction.id && updated.transactions[0]?.createdAt === transaction.createdAt, 'Commands must protect entity identity fields')
assert(updated.transactions[0]?.title === 'มื้อเย็น' && updated.transactions[0]?.updatedAt === '2026-09-11T00:00:00Z', 'Transaction command should apply editable fields')
const maliciousPatch = updateTransaction(base, transaction.id, { id: 'other-id', tripId: 'other-trip', createdAt: '1999-01-01T00:00:00Z' } as never, '2026-09-11T00:00:00Z')
assert(maliciousPatch.transactions[0]?.id === transaction.id && maliciousPatch.transactions[0]?.tripId === null && maliciousPatch.transactions[0]?.createdAt === transaction.createdAt, 'Commands must protect identity and foreign-key fields at runtime')

const withTrip = addTrip(base, trip)
assert(withTrip.transactions.length === 2, 'Adding a prefilled trip must materialize its owned transaction')
assert(withTrip.transactions.some((item) => item.tripId === trip.id && item.sourceRefId === 'trip-item-command-1'), 'Trip command must preserve source mapping')
assert(withTrip.transactions !== base.transactions, 'Trip command must return a new transaction collection when it materializes items')

const tripWithoutItems = updateTrip(withTrip, trip.id, { items: [] }, '2026-09-12T00:00:00Z')
assert(tripWithoutItems.transactions.length === 1 && !tripWithoutItems.transactions.some((item) => item.tripId === trip.id), 'Removing trip items must remove only owned transactions')
assert(tripWithoutItems.installmentPlans === base.installmentPlans, 'Trip command must preserve unrelated collection identity')

const deletedMissingTrip = deleteTrip(base, 'missing-trip')
assert(deletedMissingTrip === base, 'Deleting a missing trip should be a no-op')
const deletedGoal = deleteGoal(base, goal.id)
assert(deletedGoal.goals.length === 0 && deletedGoal.transactions === base.transactions, 'Goal command must preserve unrelated collections')

// Test Recurring Rule commands
const sampleRule: RecurringRule = {
  id: 'rule-test-1',
  isActive: true,
  type: 'utility',
  title: 'ค่าอินเทอร์เน็ต',
  name: 'ค่าอินเทอร์เน็ต',
  category: 'สาธารณูปโภค',
  categoryId: 'สาธารณูปโภค',
  amount: 599,
  amountType: 'fixed',
  currency: 'THB',
  cadence: 'monthly',
  interval: 1,
  dueDay: 15,
  paidMonthKeys: [],
  autoGenerateTransaction: true,
  startDate: '2026-09-01',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
}

const withRule = addRecurringRule(base, sampleRule)
assert(withRule.recurringRules.length === 1, 'addRecurringRule adds rule')
assert(withRule.recurringRules[0]?.id === 'rule-test-1', 'Rule id matches')

const updatedRuleData = updateRecurringRule(withRule, 'rule-test-1', { amount: 699 })
assert(updatedRuleData.recurringRules[0]?.amount === 699, 'updateRecurringRule updates amount')

// Pay recurring rule with auto-generated transaction
const paidRuleData = payRecurringRule(updatedRuleData, 'rule-test-1', '2026-09', { createTransaction: true })
assert(paidRuleData.recurringRules[0]?.paidMonthKeys?.includes('2026-09'), 'payRecurringRule records paidMonthKey')
const createdTx = paidRuleData.transactions.find((tx) => tx.sourceModule === 'recurring_bill' && tx.sourceRefId === 'rule-test-1')
assert(Boolean(createdTx), 'payRecurringRule creates cleared transaction')
assert(createdTx?.amount === 699, 'Created transaction has correct amount')
assert(createdTx?.status === 'cleared', 'Created transaction is cleared')

// Re-paying / adjusting existing transaction updates amount, date, and note
const rePaidData = payRecurringRule(paidRuleData, 'rule-test-1', '2026-09', { amount: 850, date: '2026-09-10', note: 'Adjusted bill' })
const adjustedTx = rePaidData.transactions.find((tx) => tx.id === createdTx?.id)
assert(adjustedTx?.amount === 850, 'Re-paying updates existing transaction amount')
assert(adjustedTx?.date === '2026-09-10', 'Re-paying updates existing transaction date')
assert(adjustedTx?.recurringMonthKey === '2026-09', 'Transaction tracks recurringMonthKey')
assert(adjustedTx?.note === 'Adjusted bill', 'Re-paying updates existing transaction note')

// Cross-month pay: bill for Sep 2026 paid on Oct 2 (tx has date in Oct, recurringMonthKey in Sep)
const crossMonthPaid = payRecurringRule(rePaidData, 'rule-test-1', '2026-09', { date: '2026-10-02' })
const crossTx = crossMonthPaid.transactions.find((tx) => tx.id === createdTx?.id)
assert(crossTx?.date === '2026-10-02', 'Cross-month pay records chosen date')
assert(crossTx?.monthKey === '2026-10', 'Cross-month pay records date-derived monthKey')
assert(crossTx?.recurringMonthKey === '2026-09', 'Cross-month pay preserves billing monthKey')

// Unpay recurring rule removes monthKey and cross-month auto-generated transaction
const unpaidRuleData = unpayRecurringRule(crossMonthPaid, 'rule-test-1', '2026-09')
assert(!unpaidRuleData.recurringRules[0]?.paidMonthKeys?.includes('2026-09'), 'unpayRecurringRule removes monthKey')
const removedTx = unpaidRuleData.transactions.find((tx) => tx.sourceModule === 'recurring_bill' && tx.sourceRefId === 'rule-test-1')
assert(!removedTx, 'unpayRecurringRule removes cross-month generated transaction')

// Delete recurring rule detaches existing linked transactions cleanly without deleting them
const withPaidAgain = payRecurringRule(unpaidRuleData, 'rule-test-1', '2026-09', { createTransaction: true })
const deletedRuleData = deleteRecurringRule(withPaidAgain, 'rule-test-1')
assert(deletedRuleData.recurringRules.length === 0, 'deleteRecurringRule deletes rule')
const detachedTx = deletedRuleData.transactions.find((tx) => tx.title === sampleRule.title)
assert(Boolean(detachedTx), 'deleteRecurringRule preserves transaction history')
assert(detachedTx?.sourceModule === 'manual', 'deleteRecurringRule detaches sourceModule to manual')
assert(detachedTx?.sourceRefId === null, 'deleteRecurringRule clears sourceRefId')
assert(detachedTx?.recurringRuleId === null, 'deleteRecurringRule clears recurringRuleId')

console.log('Testing domain finance commands...')
console.log('✓ command invariants and referential identity passed')
