import { getCanonicalCategoryOptions, normalizeCategoryId } from '../../data/categories'
import { createId } from '../../lib/id'
import type { Budget, BudgetLine, FinanceData, Goal, GoalStatus, TransactionEntry } from '../../types/finance'
import { clampPercent, currentIsoTimestamp, currentMonthInputValue, getMonthKey, parseAmountSafe } from '../../utils/formatters'

export type BudgetStatus = 'safe' | 'near-limit' | 'over-budget'
export type InsightTone = 'neutral' | 'income' | 'expense' | 'warning' | 'active'

export type BudgetCalculationOptions = {
  includePending?: boolean
}

export type BudgetThresholds = {
  nearLimit: number
  overBudget: number
}

export const DEFAULT_BUDGET_THRESHOLDS: BudgetThresholds = {
  nearLimit: 0.8,
  overBudget: 1,
}

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

function finiteAmount(value: unknown, fallback = 0): number {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : fallback
}

function optionalAmount(value: unknown): number | null {
  if (value == null || (typeof value === 'string' && !value.trim())) return null
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

function getLegacyBudgetLine(budget: Budget): BudgetLine {
  return {
    id: `${budget.id}-line`,
    categoryId: normalizeCategoryId(budget.categoryId || budget.category, budget.scope === 'trip' ? 'ท่องเที่ยว' : 'อื่นๆ'),
    amount: Math.max(0, finiteAmount(budget.amount)),
    note: budget.note,
  }
}

export function getBudgetLines(budget: Budget): BudgetLine[] {
  return budget.lines?.length ? budget.lines : [getLegacyBudgetLine(budget)]
}

export function getBudgetCategoryKeys(budget: Budget): string[] {
  const categories = getBudgetLines(budget)
    .map((line) => normalizeCategoryId(line.categoryId, budget.scope === 'trip' ? 'ท่องเที่ยว' : 'อื่นๆ'))
    .filter(Boolean)
  return Array.from(new Set(categories.length ? categories : [normalizeCategoryId(budget.categoryId || budget.category, 'อื่นๆ')]))
}

export function getBudgetCategoryKey(budget: Budget): string {
  return getBudgetCategoryKeys(budget)[0] ?? 'อื่นๆ'
}

export function getBudgetCategoryLabel(budget: Budget): string {
  return getBudgetCategoryKeys(budget).join(', ')
}

/**
 * `amount` is the explicit budget total. A line sum is only a legacy fallback
 * for malformed records that have no finite total at all; an explicit zero is
 * meaningful and must never fall back to a non-zero line or trip budget.
 */
export function getBudgetAmount(budget: Budget): number {
  const explicitAmount = optionalAmount(budget.amount)
  if (explicitAmount !== null) return Math.max(0, explicitAmount)
  return getBudgetLines(budget).reduce((sum, line) => sum + Math.max(0, finiteAmount(line.amount)), 0)
}

/** Sum of allocations, used by trip line views. This intentionally differs
 * from the explicit monthly/overall limit returned by `getBudgetAmount`.
 */
export function getBudgetAllocatedAmount(budget: Budget): number {
  return getBudgetLines(budget).reduce((sum, line) => sum + Math.max(0, finiteAmount(line.amount)), 0)
}

export function getBudgetThresholds(budget?: Pick<Budget, 'alertThresholds'> | number[]): BudgetThresholds {
  const raw = Array.isArray(budget) ? budget : budget?.alertThresholds
  const values = (raw ?? [])
    .map(Number)
    .filter((value) => Number.isFinite(value) && value >= 0 && value <= 1)
    .slice(0, 2)
  if (!values.length) return DEFAULT_BUDGET_THRESHOLDS
  const sorted = values.slice().sort((a, b) => a - b)
  const overBudget = sorted[1] ?? 1
  return {
    nearLimit: Math.min(sorted[0] ?? DEFAULT_BUDGET_THRESHOLDS.nearLimit, overBudget),
    overBudget: Math.max(sorted[0] ?? DEFAULT_BUDGET_THRESHOLDS.overBudget, overBudget),
  }
}

export function getTransactionCategoryKey(transaction: TransactionEntry): string {
  return normalizeCategoryId(transaction.categoryId || transaction.category, 'อื่นๆ')
}

export function getMonthlyBudgets(budgets: Budget[], month: string): Budget[] {
  return budgets
    .filter((budget) => budget.scope === 'monthly' && budget.month === month && budget.enabled !== false)
    .sort((a, b) => getBudgetCategoryKey(a).localeCompare(getBudgetCategoryKey(b)) || a.id.localeCompare(b.id))
}

export function calculateBudgetUsage(
  budget: Budget,
  transactions: TransactionEntry[],
  options: BudgetCalculationOptions = {},
): number {
  const budgetCategories = new Set(getBudgetCategoryKeys(budget).map((category) => normalizeKey(category)))
  return transactions
    .filter((transaction) => transaction.type === 'expense')
    .filter((transaction) => options.includePending !== false || transaction.status !== 'pending')
    .filter((transaction) => getMonthKey(transaction.date) === budget.month)
    .filter((transaction) => budgetCategories.has(normalizeKey(getTransactionCategoryKey(transaction))))
    .reduce((sum, transaction) => sum + Math.max(0, finiteAmount(transaction.amount)), 0)
}

export function getBudgetStatus(
  used: number,
  amount: number,
  thresholds: BudgetThresholds | number[] = DEFAULT_BUDGET_THRESHOLDS,
): BudgetStatus {
  const resolvedThresholds = Array.isArray(thresholds) ? getBudgetThresholds(thresholds) : thresholds
  if (amount <= 0 || used / amount >= resolvedThresholds.overBudget) return 'over-budget'
  if (used / amount >= resolvedThresholds.nearLimit) return 'near-limit'
  return 'safe'
}

export function calculateBudgetProgress(
  budget: Budget,
  transactions: TransactionEntry[],
  options: BudgetCalculationOptions = {},
): BudgetProgress {
  const amount = getBudgetAmount(budget)
  const used = calculateBudgetUsage(budget, transactions, options)
  const remaining = amount - used
  const thresholds = getBudgetThresholds(budget)
  return {
    amount,
    used,
    remaining,
    percent: amount > 0 ? clampPercent((used / amount) * 100) : 100,
    status: getBudgetStatus(used, amount, thresholds),
  }
}

export function createBudgetFormValues(budget?: Budget, selectedMonth = currentMonthInputValue()): BudgetFormValues {
  return {
    month: budget?.month ?? selectedMonth,
    category: budget ? getBudgetCategoryKey(budget) : '',
    amount: budget ? String(getBudgetAmount(budget)) : '',
    note: budget?.note ?? '',
    enabled: budget?.enabled !== false,
  }
}

export function hasDuplicateMonthlyBudget(budgets: Budget[], values: BudgetFormValues, editingBudgetId?: string): boolean {
  const categoryKey = normalizeKey(values.category)
  return budgets.some((budget) => (
    budget.scope === 'monthly'
      && budget.month === values.month
      && getBudgetCategoryKeys(budget).some((category) => normalizeKey(category) === categoryKey)
      && budget.id !== editingBudgetId
  ))
}

export function hasBudgetLineCategoryCollision(budget: Budget | undefined, category: string): boolean {
  if (!budget?.lines || budget.lines.length < 2) return false
  const categoryKey = normalizeKey(category)
  return budget.lines.slice(1).some((line) => normalizeKey(line.categoryId) === categoryKey)
}

export function validateBudgetForm(values: BudgetFormValues, budgets: Budget[], editingBudgetId?: string): string | null {
  if (!values.month) return 'เลือกเดือนของงบประมาณ'
  if (!values.category.trim()) return 'กรอกหมวดหมู่'
  const parsedAmount = parseAmountSafe(values.amount, Number.NaN)
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return 'กรอกจำนวนงบประมาณมากกว่า 0'
  if (hasDuplicateMonthlyBudget(budgets, values, editingBudgetId)) return 'มีงบรายเดือนของเดือนและหมวดหมู่นี้แล้ว'
  const editingBudget = budgets.find((budget) => budget.id === editingBudgetId)
  if (hasBudgetLineCategoryCollision(editingBudget, values.category)) return 'หมวดหมู่ซ้ำกับรายการย่อยเดิมของงบนี้'
  return null
}

export function buildBudgetFromForm(values: BudgetFormValues, existing?: Budget): Budget {
  const now = currentIsoTimestamp()
  const category = normalizeCategoryId(values.category, 'อื่นๆ')
  const amount = Math.max(0, parseAmountSafe(values.amount, 0))
  const existingLines = existing?.lines ?? []
  const lineId = existingLines[0]?.id ?? createId()
  const lines = existingLines.length > 1
    ? existingLines.map((line, index) => index === 0 ? { ...line, categoryId: category } : { ...line })
    : [{ id: lineId, categoryId: category, amount }]
  return {
    id: existing?.id ?? createId(),
    scope: 'monthly',
    name: `งบรายเดือน ${category}`,
    month: values.month,
    category,
    categoryId: category,
    amount,
    lines,
    alertThresholds: existing?.alertThresholds?.length ? existing.alertThresholds : [DEFAULT_BUDGET_THRESHOLDS.nearLimit, DEFAULT_BUDGET_THRESHOLDS.overBudget],
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
    id: existing?.id ?? createId(),
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
  options: BudgetCalculationOptions = {},
): BudgetGoalInsight[] {
  const insights: BudgetGoalInsight[] = []

  for (const budget of getMonthlyBudgets(budgets, month)) {
    const progress = calculateBudgetProgress(budget, transactions, options)
    const category = getBudgetCategoryLabel(budget)
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
