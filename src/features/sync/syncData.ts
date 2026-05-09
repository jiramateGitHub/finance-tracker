import { normalizeFinanceData } from '../../lib/dataMigration'
import type { Budget, FinanceData, Goal, InstallmentPlan, MasterCategory, RecurringRule, TransactionEntry, Trip } from '../../types/finance'

type SyncableItem = TransactionEntry | RecurringRule | InstallmentPlan | Trip | Budget | Goal

function itemTimestamp(item: SyncableItem): number {
  const parsed = Date.parse(item.updatedAt || item.createdAt)
  return Number.isFinite(parsed) ? parsed : 0
}

function mergeItems<T extends SyncableItem>(localItems: T[], cloudItems: T[]): T[] {
  const merged = new Map<string, T>()
  cloudItems.forEach((item) => merged.set(item.id, item))
  localItems.forEach((item) => {
    const existing = merged.get(item.id)
    if (!existing || itemTimestamp(item) >= itemTimestamp(existing)) merged.set(item.id, item)
  })
  return Array.from(merged.values()).sort((a, b) => itemTimestamp(b) - itemTimestamp(a))
}

function mergeCategories(localCategories: MasterCategory[], cloudCategories: MasterCategory[]): MasterCategory[] {
  const categories = new Map<string, MasterCategory>()
  cloudCategories.forEach((category) => categories.set(category.id, category))
  localCategories.forEach((category) => categories.set(category.id, category))
  return Array.from(categories.values()).sort((a, b) => a.label.localeCompare(b.label))
}

export function mergeFinanceData(localData: FinanceData, cloudData: FinanceData): FinanceData {
  return normalizeFinanceData({
    ...cloudData,
    profile: localData.profile,
    settings: localData.settings,
    masters: {
      categories: mergeCategories(localData.masters.categories, cloudData.masters.categories),
      tags: Array.from(new Set([...cloudData.masters.tags, ...localData.masters.tags])).sort((a, b) => a.localeCompare(b)),
    },
    transactions: mergeItems(localData.transactions, cloudData.transactions),
    recurringRules: mergeItems(localData.recurringRules, cloudData.recurringRules),
    installmentPlans: mergeItems(localData.installmentPlans, cloudData.installmentPlans),
    trips: mergeItems(localData.trips, cloudData.trips),
    budgets: mergeItems(localData.budgets, cloudData.budgets),
    goals: mergeItems(localData.goals, cloudData.goals),
  })
}

export function createFinanceDataFingerprint(data: FinanceData): string {
  return JSON.stringify({
    schemaVersion: data.schemaVersion,
    profile: data.profile,
    settings: data.settings,
    masters: data.masters,
    transactions: data.transactions,
    recurringRules: data.recurringRules,
    installmentPlans: data.installmentPlans,
    trips: data.trips,
    budgets: data.budgets,
    goals: data.goals,
  })
}
