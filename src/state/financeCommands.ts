import { detachTripTransactions, reconcileTripTransactions } from '../features/trips/utils/tripUtils'
import { createId } from '../lib/id'
import type { Budget, FinanceData, Goal, InstallmentPlan, RecurringRule, TransactionEntry, Trip } from '../types/finance'
import { currentDateInputValue, currentIsoTimestamp, getMonthKey, getSafeDateInMonth } from '../utils/formatters'

/**
 * Commands are pure state transitions. They keep persistence, migration and
 * React lifecycle concerns out of the domain mutation path.
 */
export type FinanceCommand = (data: FinanceData) => FinanceData

type TransactionPatch = Omit<Partial<TransactionEntry>, 'id' | 'createdAt' | 'updatedAt' | 'sourceModule' | 'sourceRefId' | 'tripId' | 'installmentId' | 'installmentPlanId' | 'recurringRuleId' | 'goalId'>
type InstallmentPlanPatch = Omit<Partial<InstallmentPlan>, 'id' | 'createdAt' | 'updatedAt'>
type RecurringRulePatch = Omit<Partial<RecurringRule>, 'id' | 'createdAt' | 'updatedAt'>
type TripPatch = Omit<Partial<Trip>, 'id' | 'createdAt' | 'updatedAt'>
type BudgetPatch = Omit<Partial<Budget>, 'id' | 'createdAt' | 'updatedAt'>
type GoalPatch = Omit<Partial<Goal>, 'id' | 'createdAt' | 'updatedAt'>

function withoutKeys<T extends object>(value: T, keys: string[]): Partial<T> {
  const copy = { ...value } as Record<string, unknown>
  keys.forEach((key) => delete copy[key])
  return copy as Partial<T>
}

function updateById<T extends { id: string; updatedAt: string }>(
  items: T[],
  id: string,
  patch: Partial<T>,
  updatedAt: string,
): T[] {
  let changed = false
  const nextItems = items.map((item) => {
    if (item.id !== id) return item
    changed = true
    return { ...item, ...patch, updatedAt }
  })
  return changed ? nextItems : items
}

export function addTransaction(data: FinanceData, transaction: TransactionEntry): FinanceData {
  return { ...data, transactions: [transaction, ...data.transactions] }
}

export function updateTransaction(data: FinanceData, transactionId: string, patch: TransactionPatch, updatedAt = currentIsoTimestamp()): FinanceData {
  const editablePatch = withoutKeys(patch, ['id', 'createdAt', 'updatedAt', 'sourceModule', 'sourceRefId', 'tripId', 'installmentId', 'installmentPlanId', 'recurringRuleId', 'goalId']) as Partial<TransactionEntry>
  const transactions = updateById(data.transactions, transactionId, editablePatch, updatedAt)
  if (transactions === data.transactions) return data
  return { ...data, transactions }
}

export function deleteTransaction(data: FinanceData, transactionId: string): FinanceData {
  const transactions = data.transactions.filter((transaction) => transaction.id !== transactionId)
  if (transactions.length === data.transactions.length) return data
  return { ...data, transactions }
}

export function addInstallmentPlan(data: FinanceData, plan: InstallmentPlan): FinanceData {
  return { ...data, installmentPlans: [plan, ...data.installmentPlans] }
}

export function updateInstallmentPlan(data: FinanceData, planId: string, patch: InstallmentPlanPatch, updatedAt = currentIsoTimestamp()): FinanceData {
  const installmentPlans = updateById(data.installmentPlans, planId, withoutKeys(patch, ['id', 'createdAt', 'updatedAt', 'tripId']) as Partial<InstallmentPlan>, updatedAt)
  if (installmentPlans === data.installmentPlans) return data
  return { ...data, installmentPlans }
}

export function deleteInstallmentPlan(data: FinanceData, planId: string): FinanceData {
  const installmentPlans = data.installmentPlans.filter((plan) => plan.id !== planId)
  if (installmentPlans.length === data.installmentPlans.length) return data
  return { ...data, installmentPlans }
}

export function addRecurringRule(data: FinanceData, rule: RecurringRule): FinanceData {
  return { ...data, recurringRules: [rule, ...data.recurringRules] }
}

export function updateRecurringRule(
  data: FinanceData,
  ruleId: string,
  patch: RecurringRulePatch,
  updatedAt = currentIsoTimestamp(),
): FinanceData {
  const recurringRules = updateById(
    data.recurringRules,
    ruleId,
    withoutKeys(patch, ['id', 'createdAt', 'updatedAt']) as Partial<RecurringRule>,
    updatedAt,
  )
  if (recurringRules === data.recurringRules) return data
  return { ...data, recurringRules }
}

export function deleteRecurringRule(
  data: FinanceData,
  ruleId: string,
  updatedAt = currentIsoTimestamp(),
): FinanceData {
  const recurringRules = data.recurringRules.filter((rule) => rule.id !== ruleId)
  if (recurringRules.length === data.recurringRules.length) return data
  const transactions = data.transactions.map((tx) =>
    tx.sourceModule === 'recurring_bill' && (tx.sourceRefId === ruleId || tx.recurringRuleId === ruleId)
      ? {
          ...tx,
          sourceModule: 'manual' as const,
          sourceRefId: null,
          recurringRuleId: null,
          recurringMonthKey: null,
          updatedAt,
        }
      : tx,
  )
  return { ...data, recurringRules, transactions }
}

export interface PayRecurringRuleOptions {
  createTransaction?: boolean
  amount?: number
  date?: string
  note?: string
}

export function payRecurringRule(
  data: FinanceData,
  ruleId: string,
  monthKey: string,
  options: PayRecurringRuleOptions = {},
  updatedAt = currentIsoTimestamp(),
): FinanceData {
  const rule = data.recurringRules.find((r) => r.id === ruleId)
  if (!rule) return data

  const currentPaid = rule.paidMonthKeys ?? []
  const nextPaidMonthKeys = currentPaid.includes(monthKey) ? currentPaid : [...currentPaid, monthKey]

  const shouldCreateTx = options.createTransaction ?? (rule.autoGenerateTransaction !== false)
  let nextTransactions = data.transactions

  if (shouldCreateTx) {
    const existingTx = data.transactions.find(
      (tx) =>
        tx.sourceModule === 'recurring_bill' &&
        (tx.sourceRefId === ruleId || tx.recurringRuleId === ruleId) &&
        (tx.recurringMonthKey === monthKey || tx.monthKey === monthKey || tx.date.startsWith(monthKey)),
    )

    const day = rule.dueDay ?? rule.dayOfMonth ?? 1
    const today = currentDateInputValue()
    const payDate = options.date || (today.startsWith(monthKey) ? today : getSafeDateInMonth(monthKey, String(day)))
    const txMonthKey = getMonthKey(payDate)
    const payAmount = Math.max(0, options.amount ?? (existingTx ? existingTx.amount : rule.amount))

    if (!existingTx) {
      const newTx: TransactionEntry = {
        id: createId(),
        type: 'expense',
        date: payDate,
        monthKey: txMonthKey,
        category: rule.category,
        categoryId: rule.categoryId || rule.category,
        title: rule.name || rule.title,
        amount: payAmount,
        currency: 'THB',
        status: 'cleared',
        source: 'manual',
        sourceModule: 'recurring_bill',
        sourceRefId: rule.id,
        recurringRuleId: rule.id,
        recurringMonthKey: monthKey,
        note: options.note ?? rule.note ?? undefined,
        createdAt: updatedAt,
        updatedAt,
      }
      nextTransactions = [newTx, ...data.transactions]
    } else if (options.amount !== undefined || options.date || options.note !== undefined) {
      nextTransactions = data.transactions.map((tx) =>
        tx.id === existingTx.id
          ? {
              ...tx,
              amount: payAmount,
              date: payDate,
              monthKey: txMonthKey,
              recurringMonthKey: monthKey,
              note: options.note !== undefined ? (options.note || undefined) : tx.note,
              updatedAt,
            }
          : tx,
      )
    }
  }

  const updatedRule: RecurringRule = {
    ...rule,
    paidMonthKeys: nextPaidMonthKeys,
    updatedAt,
  }

  return {
    ...data,
    recurringRules: data.recurringRules.map((r) => (r.id === ruleId ? updatedRule : r)),
    transactions: nextTransactions,
  }
}

export function unpayRecurringRule(
  data: FinanceData,
  ruleId: string,
  monthKey: string,
  updatedAt = currentIsoTimestamp(),
): FinanceData {
  const rule = data.recurringRules.find((r) => r.id === ruleId)
  if (!rule) return data

  const currentPaid = rule.paidMonthKeys ?? []
  const nextPaidMonthKeys = currentPaid.filter((m) => m !== monthKey)

  const nextTransactions = data.transactions.filter(
    (tx) =>
      !(
        tx.sourceModule === 'recurring_bill' &&
        (tx.sourceRefId === ruleId || tx.recurringRuleId === ruleId) &&
        (tx.recurringMonthKey === monthKey || tx.monthKey === monthKey || tx.date.startsWith(monthKey))
      ),
  )

  const updatedRule: RecurringRule = {
    ...rule,
    paidMonthKeys: nextPaidMonthKeys,
    updatedAt,
  }

  return {
    ...data,
    recurringRules: data.recurringRules.map((r) => (r.id === ruleId ? updatedRule : r)),
    transactions: nextTransactions,
  }
}

export function addTrip(data: FinanceData, trip: Trip): FinanceData {
  const transactions = trip.items.length
    ? reconcileTripTransactions(data.transactions, { ...trip, items: [] }, trip)
    : data.transactions
  return { ...data, trips: [trip, ...data.trips], transactions }
}

export function updateTrip(data: FinanceData, tripId: string, patch: TripPatch, updatedAt = currentIsoTimestamp()): FinanceData {
  const existingTrip = data.trips.find((trip) => trip.id === tripId)
  if (!existingTrip) return data
  const nextTrip = { ...existingTrip, ...withoutKeys(patch, ['id', 'createdAt', 'updatedAt']), updatedAt }
  const transactions = patch.items
    ? reconcileTripTransactions(data.transactions, existingTrip, nextTrip, updatedAt)
    : data.transactions
  return {
    ...data,
    trips: data.trips.map((trip) => trip.id === tripId ? nextTrip : trip),
    transactions,
  }
}

export function deleteTrip(data: FinanceData, tripId: string, updatedAt = currentIsoTimestamp()): FinanceData {
  const trips = data.trips.filter((trip) => trip.id !== tripId)
  if (trips.length === data.trips.length) return data
  return {
    ...data,
    trips,
    budgets: data.budgets.filter((budget) => budget.tripId !== tripId),
    transactions: detachTripTransactions(data.transactions, tripId, updatedAt),
  }
}

export function addOrUpdateTripBudgetLine(
  data: FinanceData,
  tripId: string,
  categoryId: string,
  amount: number,
  note?: string,
  updatedAt = currentIsoTimestamp(),
): FinanceData {
  const existingBudget = data.budgets.find((budget) => budget.scope === 'trip' && budget.tripId === tripId)
  const existingLines = existingBudget?.lines?.length
    ? existingBudget.lines
    : existingBudget
      ? [{ id: existingBudget.id, categoryId: existingBudget.categoryId || existingBudget.category || categoryId, amount: existingBudget.amount, note: existingBudget.note }]
      : []
  const lineExists = existingLines.some((line) => line.categoryId === categoryId)
  const lines = lineExists
    ? existingLines.map((line) => line.categoryId === categoryId ? { ...line, amount, note } : line)
    : [...existingLines, { id: createId(), categoryId, amount, note }]
  const totalAmount = lines.reduce((total, line) => total + Number(line.amount || 0), 0)
  const nextBudget: Budget = {
    id: existingBudget?.id ?? createId(),
    scope: 'trip',
    name: 'งบทริป',
    tripId,
    category: lines[0]?.categoryId ?? categoryId,
    categoryId: lines[0]?.categoryId ?? categoryId,
    amount: totalAmount,
    lines,
    alertThresholds: existingBudget?.alertThresholds?.length ? existingBudget.alertThresholds : [0.8, 1],
    enabled: existingBudget?.enabled !== false,
    note: existingBudget?.note,
    createdAt: existingBudget?.createdAt ?? updatedAt,
    updatedAt,
  }
  const budgets = existingBudget
    ? data.budgets.map((budget) => budget.id === existingBudget.id ? nextBudget : budget)
    : [nextBudget, ...data.budgets]
  return { ...data, budgets }
}

export function deleteTripBudgetLine(data: FinanceData, tripId: string, categoryId: string, updatedAt = currentIsoTimestamp()): FinanceData {
  const existingBudget = data.budgets.find((budget) => budget.scope === 'trip' && budget.tripId === tripId)
  if (!existingBudget) return data
  const lines = (existingBudget.lines ?? []).filter((line) => line.categoryId !== categoryId)
  if (!lines.length) return { ...data, budgets: data.budgets.filter((budget) => budget.id !== existingBudget.id) }
  const totalAmount = lines.reduce((total, line) => total + Number(line.amount || 0), 0)
  const nextBudget: Budget = {
    ...existingBudget,
    category: lines[0]?.categoryId ?? existingBudget.category,
    categoryId: lines[0]?.categoryId ?? existingBudget.categoryId,
    amount: totalAmount,
    lines,
    updatedAt,
  }
  return { ...data, budgets: data.budgets.map((budget) => budget.id === existingBudget.id ? nextBudget : budget) }
}

export function addBudget(data: FinanceData, budget: Budget): FinanceData {
  return { ...data, budgets: [budget, ...data.budgets] }
}

export function updateBudget(data: FinanceData, budgetId: string, patch: BudgetPatch, updatedAt = currentIsoTimestamp()): FinanceData {
  const budgets = updateById(data.budgets, budgetId, withoutKeys(patch, ['id', 'createdAt', 'updatedAt', 'scope', 'tripId']) as Partial<Budget>, updatedAt)
  if (budgets === data.budgets) return data
  return { ...data, budgets }
}

export function deleteBudget(data: FinanceData, budgetId: string): FinanceData {
  const budgets = data.budgets.filter((budget) => budget.id !== budgetId)
  if (budgets.length === data.budgets.length) return data
  return { ...data, budgets }
}

export function addGoal(data: FinanceData, goal: Goal): FinanceData {
  return { ...data, goals: [goal, ...data.goals] }
}

export function updateGoal(data: FinanceData, goalId: string, patch: GoalPatch, updatedAt = currentIsoTimestamp()): FinanceData {
  const goals = updateById(data.goals, goalId, withoutKeys(patch, ['id', 'createdAt', 'updatedAt', 'linkedCategoryId']) as Partial<Goal>, updatedAt)
  if (goals === data.goals) return data
  return { ...data, goals }
}

export function deleteGoal(data: FinanceData, goalId: string): FinanceData {
  const goals = data.goals.filter((goal) => goal.id !== goalId)
  if (goals.length === data.goals.length) return data
  return { ...data, goals }
}
