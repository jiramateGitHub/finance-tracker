import { createEmptyFinanceData, withUpdatedMeta } from '../lib/dataMigration'
import type { Budget, Goal, InstallmentPlan, TransactionEntry, Trip } from '../types/finance'
import {
  addTrip,
  deleteGoal,
  deleteTrip,
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

console.log('Testing domain finance commands...')
console.log('✓ command invariants and referential identity passed')
