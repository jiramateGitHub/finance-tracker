import { getCanonicalCategoryOptions, normalizeCategoryId } from '../../data/categories'
import type { Budget, FinanceData, Goal, GoalStatus, TransactionEntry } from '../../types/finance'
import { clampPercent, currentIsoTimestamp, currentMonthInputValue, getMonthKey, parseAmountSafe } from '../../utils/formatters'

export type BudgetStatus = 'safe' | 'near-limit' | 'over-budget'
export type InsightTone = 'neutral' | 'income' | 'expense' | 'warning' | 'active'

export type BudgetFormValues = {
  month: string
  category: string
  amount: string
  note: string
  enabled: boolean
}

export type GoalFormValues = {
  name: string
  targetAmount: string
  currentAmount: string
  targetDate: string
  status: GoalStatus
  note: string
}

export type BudgetProgress = {
  amount: number
  used: number
  remaining: number
  percent: number
  status: BudgetStatus
}

export type GoalProgress = {
  targetAmount: number
  currentAmount: number
  remaining: number
  percent: number
  displayStatus: GoalStatus
  isCompleted: boolean
}

export type BudgetGoalInsight = {
  id: string
  tone: InsightTone
  text: string
}

function normalizeKey(value: string | null | undefined): string {
  return normalizeCategoryId(value ?? '', 'อื่นๆ').toLocaleLowerCase('th-TH')
}

export function getBudgetCategoryKey(budget: Budget): string {
  return normalizeCategoryId(budget.categoryId || budget.category || budget.lines?.[0]?.categoryId, 'อื่นๆ')
}

export function getTransactionCategoryKey(transaction: TransactionEntry): string {
  return normalizeCategoryId(transaction.categoryId || transaction.category, 'อื่นๆ')
}

export function getMonthlyBudgets(budgets: Budget[], month: string): Budget[] {
  return budgets
    .filter((budget) => budget.scope === 'monthly' && budget.month === month && budget.enabled !== false)
    .sort((a, b) => getBudgetCategoryKey(a).localeCompare(getBudgetCategoryKey(b)) || a.id.localeCompare(b.id))
}

export function calculateBudgetUsage(budget: Budget, transactions: TransactionEntry[]): number {
  const budgetCategory = normalizeKey(getBudgetCategoryKey(budget))
  return transactions
    .filter((transaction) => transaction.type === 'expense')
    .filter((transaction) => getMonthKey(transaction.date) === budget.month)
    .filter((transaction) => normalizeKey(getTransactionCategoryKey(transaction)) === budgetCategory)
    .reduce((sum, transaction) => sum + transaction.amount, 0)
}

export function getBudgetStatus(used: number, amount: number): BudgetStatus {
  if (amount <= 0 || used >= amount) return 'over-budget'
  if (used / amount >= 0.8) return 'near-limit'
  return 'safe'
}

export function calculateBudgetProgress(budget: Budget, transactions: TransactionEntry[]): BudgetProgress {
  const amount = Math.max(0, budget.amount)
  const used = calculateBudgetUsage(budget, transactions)
  const remaining = amount - used
  return {
    amount,
    used,
    remaining,
    percent: amount > 0 ? clampPercent((used / amount) * 100) : 100,
    status: getBudgetStatus(used, amount),
  }
}

export function createBudgetFormValues(budget?: Budget, selectedMonth = currentMonthInputValue()): BudgetFormValues {
  return {
    month: budget?.month ?? selectedMonth,
    category: budget ? getBudgetCategoryKey(budget) : '',
    amount: budget ? String(budget.amount) : '',
    note: budget?.note ?? '',
    enabled: budget?.enabled !== false,
  }
}

export function hasDuplicateMonthlyBudget(budgets: Budget[], values: BudgetFormValues, editingBudgetId?: string): boolean {
  const categoryKey = normalizeKey(values.category)
  return budgets.some((budget) => (
    budget.scope === 'monthly'
      && budget.month === values.month
      && normalizeKey(getBudgetCategoryKey(budget)) === categoryKey
      && budget.id !== editingBudgetId
  ))
}

export function validateBudgetForm(values: BudgetFormValues, budgets: Budget[], editingBudgetId?: string): string | null {
  if (!values.month) return 'เลือกเดือนของงบประมาณ'
  if (!values.category.trim()) return 'กรอกหมวดหมู่'
  const parsedAmount = parseAmountSafe(values.amount, Number.NaN)
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return 'กรอกจำนวนงบประมาณมากกว่า 0'
  if (hasDuplicateMonthlyBudget(budgets, values, editingBudgetId)) return 'มีงบรายเดือนของเดือนและหมวดหมู่นี้แล้ว'
  return null
}

export function buildBudgetFromForm(values: BudgetFormValues, existing?: Budget): Budget {
  const now = currentIsoTimestamp()
  const category = normalizeCategoryId(values.category, 'อื่นๆ')
  const amount = Math.max(0, parseAmountSafe(values.amount, 0))
  const lineId = existing?.lines?.[0]?.id ?? crypto.randomUUID()
  return {
    id: existing?.id ?? crypto.randomUUID(),
    scope: 'monthly',
    name: `งบรายเดือน ${category}`,
    month: values.month,
    category,
    categoryId: category,
    amount,
    lines: [{ id: lineId, categoryId: category, amount }],
    alertThresholds: existing?.alertThresholds?.length ? existing.alertThresholds : [0.8, 1],
    enabled: values.enabled,
    note: values.note.trim() || undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

export function createGoalFormValues(goal?: Goal): GoalFormValues {
  return {
    name: goal?.name ?? '',
    targetAmount: goal ? String(goal.targetAmount) : '',
    currentAmount: goal ? String(goal.currentAmount) : '0',
    targetDate: goal?.targetDate ?? '',
    status: goal?.status ?? 'active',
    note: goal?.note ?? '',
  }
}

export function validateGoalForm(values: GoalFormValues): string | null {
  if (!values.name.trim()) return 'กรอกชื่อเป้าหมาย'
  const parsedTarget = parseAmountSafe(values.targetAmount, Number.NaN)
  if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) return 'กรอกยอดเป้าหมายมากกว่า 0'
  const parsedCurrent = parseAmountSafe(values.currentAmount, Number.NaN)
  if (!Number.isFinite(parsedCurrent) || parsedCurrent < 0) return 'กรอกยอดปัจจุบันตั้งแต่ 0 ขึ้นไป'
  return null
}

export function buildGoalFromForm(values: GoalFormValues, existing?: Goal): Goal {
  const now = currentIsoTimestamp()
  const targetAmount = Math.max(0, parseAmountSafe(values.targetAmount, 0))
  const currentAmount = Math.max(0, parseAmountSafe(values.currentAmount, 0))
  return {
    id: existing?.id ?? crypto.randomUUID(),
    name: values.name.trim(),
    type: existing?.type ?? 'savings',
    kind: existing?.kind ?? 'savings',
    targetAmount,
    currentAmount,
    targetDate: values.targetDate || undefined,
    linkedCategoryId: existing?.linkedCategoryId ? normalizeCategoryId(existing.linkedCategoryId) : null,
    status: values.status,
    note: values.note.trim() || undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

export function calculateGoalProgress(goal: Goal): GoalProgress {
  const targetAmount = Math.max(0, goal.targetAmount)
  const currentAmount = Math.max(0, goal.currentAmount)
  const isCompleted = targetAmount > 0 && currentAmount >= targetAmount
  return {
    targetAmount,
    currentAmount,
    remaining: Math.max(0, targetAmount - currentAmount),
    percent: targetAmount > 0 ? clampPercent((currentAmount / targetAmount) * 100) : 0,
    displayStatus: isCompleted ? 'completed' : goal.status,
    isCompleted,
  }
}

export function getBudgetGoalCategoryOptions(data: FinanceData): string[] {
  return getCanonicalCategoryOptions(data)
}

export function buildBudgetGoalInsights(
  budgets: Budget[],
  goals: Goal[],
  transactions: TransactionEntry[],
  month: string,
): BudgetGoalInsight[] {
  const insights: BudgetGoalInsight[] = []

  for (const budget of getMonthlyBudgets(budgets, month)) {
    const progress = calculateBudgetProgress(budget, transactions)
    const category = getBudgetCategoryKey(budget)
    if (progress.status === 'over-budget') {
      insights.push({
        id: `budget-over-${budget.id}`,
        tone: 'expense',
        text: `${category} เกินงบไป ${Math.abs(progress.remaining).toLocaleString('th-TH')} บาท`,
      })
    } else if (progress.status === 'near-limit') {
      insights.push({
        id: `budget-near-${budget.id}`,
        tone: 'warning',
        text: `${category} ใช้งบเดือนนี้ไปแล้ว ${progress.percent}%`,
      })
    }
  }

  for (const goal of goals) {
    const progress = calculateGoalProgress(goal)
    if (progress.isCompleted) {
      insights.push({
        id: `goal-complete-${goal.id}`,
        tone: 'income',
        text: `${goal.name} สำเร็จแล้ว`,
      })
    } else if (goal.status === 'active') {
      insights.push({
        id: `goal-active-${goal.id}`,
        tone: 'active',
        text: `${goal.name} เก็บได้แล้ว ${progress.percent}%`,
      })
    }
  }

  return insights.slice(0, 5)
}

