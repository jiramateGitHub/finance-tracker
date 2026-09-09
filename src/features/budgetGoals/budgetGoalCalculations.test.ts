import {
  calculateBudgetProgress,
  calculateBudgetUsage,
  calculateGoalProgress,
  getBudgetStatus,
  getMonthlyBudgets,
  hasDuplicateMonthlyBudget,
  validateBudgetForm,
  buildBudgetFromForm,
  validateGoalForm,
  buildGoalFromForm,
  buildBudgetGoalInsights,
} from './budgetGoalCalculations'
import type { Budget, Goal, TransactionEntry } from '../../types/finance'

function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) throw new Error(message || 'Assertion failed')
}
assert.equal = function (actual: unknown, expected: unknown, message?: string) {
  if (actual !== expected) throw new Error(`${message ? message + ': ' : ''}Expected ${expected} but got ${actual}`)
}

console.log('Testing budgetGoalCalculations utilities and insights...')

// 1. getMonthlyBudgets
const sampleBudgets: Budget[] = [
  {
    id: 'b-1',
    scope: 'monthly',
    name: 'อาหาร',
    month: '2026-09',
    category: 'อาหาร',
    amount: 10000,
    enabled: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'b-2',
    scope: 'monthly',
    name: 'ช้อปปิ้ง',
    month: '2026-09',
    category: 'ช้อปปิ้ง',
    amount: 5000,
    enabled: false, // disabled
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'b-3',
    scope: 'trip',
    tripId: 'trip-1',
    name: 'งบทริป',
    category: 'ท่องเที่ยว',
    amount: 20000,
    enabled: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'b-4',
    scope: 'monthly',
    name: 'เดินทาง',
    month: '2026-10', // different month
    category: 'เดินทาง',
    amount: 3000,
    enabled: true,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
]

const septBudgets = getMonthlyBudgets(sampleBudgets, '2026-09')
assert.equal(septBudgets.length, 1, 'Only enabled monthly budgets for 2026-09 should be returned')
assert.equal(septBudgets[0].id, 'b-1')
console.log('✓ getMonthlyBudgets passed')

// 2. calculateBudgetUsage & getBudgetStatus & calculateBudgetProgress
const sampleTransactions: TransactionEntry[] = [
  {
    id: 'tx-1',
    type: 'expense',
    date: '2026-09-05',
    category: 'อาหาร',
    title: 'มื้อเที่ยง',
    amount: 8500,
    status: 'cleared',
    createdAt: '2026-09-05T00:00:00Z',
    updatedAt: '2026-09-05T00:00:00Z',
  },
  {
    id: 'tx-2',
    type: 'income',
    date: '2026-09-01',
    category: 'อาหาร',
    title: 'เงินคืนอาหาร',
    amount: 1000, // Income must NOT count toward budget usage
    status: 'cleared',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'tx-3',
    type: 'expense',
    date: '2026-10-01',
    category: 'อาหาร',
    title: 'อาหารเดือนหน้า',
    amount: 2000, // Oct expense must NOT count toward Sep budget
    status: 'cleared',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
]

const usage = calculateBudgetUsage(sampleBudgets[0], sampleTransactions)
assert.equal(usage, 8500, 'Usage should only include Sept expense transactions for category')

const progress = calculateBudgetProgress(sampleBudgets[0], sampleTransactions)
assert.equal(progress.amount, 10000)
assert.equal(progress.used, 8500)
assert.equal(progress.remaining, 1500)
assert.equal(progress.percent, 85)
assert.equal(progress.status, 'near-limit', '85% usage should be near-limit (>=80%)')

assert.equal(getBudgetStatus(5000, 10000), 'safe')
assert.equal(getBudgetStatus(8000, 10000), 'near-limit')
assert.equal(getBudgetStatus(10000, 10000), 'over-budget')
assert.equal(getBudgetStatus(12000, 10000), 'over-budget')
console.log('✓ calculateBudgetProgress & getBudgetStatus passed')

// 3. hasDuplicateMonthlyBudget & validateBudgetForm
assert.equal(hasDuplicateMonthlyBudget(sampleBudgets, {
  month: '2026-09',
  category: 'อาหาร',
  amount: '5000',
  note: '',
  enabled: true,
}), true, 'Should detect duplicate category for same month')

assert.equal(hasDuplicateMonthlyBudget(sampleBudgets, {
  month: '2026-09',
  category: 'อาหาร',
  amount: '5000',
  note: '',
  enabled: true,
}, 'b-1'), false, 'Should not detect duplicate when editing existing budget b-1')

assert.equal(validateBudgetForm({
  month: '',
  category: 'อาหาร',
  amount: '1000',
  note: '',
  enabled: true,
}, sampleBudgets), 'เลือกเดือนของงบประมาณ')

assert.equal(validateBudgetForm({
  month: '2026-09',
  category: '',
  amount: '1000',
  note: '',
  enabled: true,
}, sampleBudgets), 'กรอกหมวดหมู่')

assert.equal(validateBudgetForm({
  month: '2026-09',
  category: 'อาหาร',
  amount: '0',
  note: '',
  enabled: true,
}, sampleBudgets), 'กรอกจำนวนงบประมาณมากกว่า 0')

const builtBudget = buildBudgetFromForm({
  month: '2026-11',
  category: 'ของใช้',
  amount: '4500',
  note: 'งบของใช้ในบ้าน',
  enabled: true,
})
assert.equal(builtBudget.amount, 4500)
assert.equal(builtBudget.month, '2026-11')
assert.equal(builtBudget.category, 'ของใช้')
console.log('✓ Budget validation and build passed')

// 4. Goal progress & validation
const sampleGoal: Goal = {
  id: 'goal-1',
  name: 'กองทุนฉุกเฉิน',
  targetAmount: 100000,
  currentAmount: 60000,
  status: 'active',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const goalProg = calculateGoalProgress(sampleGoal)
assert.equal(goalProg.percent, 60)
assert.equal(goalProg.remaining, 40000)
assert.equal(goalProg.isCompleted, false)

const completedGoalProg = calculateGoalProgress({
  ...sampleGoal,
  currentAmount: 100000,
})
assert.equal(completedGoalProg.percent, 100)
assert.equal(completedGoalProg.remaining, 0)
assert.equal(completedGoalProg.isCompleted, true)
assert.equal(completedGoalProg.displayStatus, 'completed')

assert.equal(validateGoalForm({
  name: '',
  targetAmount: '1000',
  currentAmount: '0',
  targetDate: '',
  status: 'active',
  note: '',
}), 'กรอกชื่อเป้าหมาย')

assert.equal(validateGoalForm({
  name: 'รถใหม่',
  targetAmount: '0',
  currentAmount: '0',
  targetDate: '',
  status: 'active',
  note: '',
}), 'กรอกยอดเป้าหมายมากกว่า 0')

const builtGoal = buildGoalFromForm({
  name: 'ไปญี่ปุ่น',
  targetAmount: '50000',
  currentAmount: '10000',
  targetDate: '2026-12-31',
  status: 'active',
  note: '',
})
assert.equal(builtGoal.name, 'ไปญี่ปุ่น')
assert.equal(builtGoal.targetAmount, 50000)
assert.equal(builtGoal.currentAmount, 10000)
console.log('✓ Goal validation and calculations passed')

// 5. buildBudgetGoalInsights
const insights = buildBudgetGoalInsights(
  [sampleBudgets[0]], // อาหาร: 85% near-limit
  [sampleGoal],       // กองทุนฉุกเฉิน: 60% active
  sampleTransactions,
  '2026-09',
)
assert.equal(insights.length, 2)
assert.equal(insights[0].tone, 'warning')
assert.equal(insights[1].tone, 'active')
console.log('✓ buildBudgetGoalInsights passed')

console.log('ALL BUDGET & GOAL TESTS PASSED! 🎉')
