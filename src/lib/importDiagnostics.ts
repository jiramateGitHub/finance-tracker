import { CATEGORY_ALIAS_MAP, LEGACY_CATEGORY_OPTIONS, normalizeCategoryId } from '../data/categories'
import type { FinanceData } from '../types/finance'
import { getDataSchemaVersion } from './dataMigration'

export type ImportDiagnostics = {
  fileName?: string
  schemaVersion: number | null
  counts: {
    entries: number
    transactions: number
    recurringRules: number
    installmentPlans: number
    trips: number
    tripItems: number
    budgets: number
    goals: number
  }
  categorySummary: {
    rawCategories: string[]
    normalizedCategories: string[]
    aliasMappingsApplied: Array<{ from: string; to: string; count: number }>
    unknownCategories: string[]
  }
  warnings: string[]
}

type RawRecord = Record<string, unknown>

function isRecord(value: unknown): value is RawRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function readRawRecord(value: unknown): RawRecord {
  return isRecord(value) ? value : {}
}

function addRawCategory(categories: Map<string, number>, value: unknown): void {
  if (typeof value !== 'string') return
  const trimmed = value.trim()
  if (!trimmed) return
  categories.set(trimmed, (categories.get(trimmed) ?? 0) + 1)
}

function isMissingCategory(record: RawRecord): boolean {
  return !String(record.categoryId ?? record.category ?? '').trim()
}

function isInvalidDate(value: unknown): boolean {
  if (typeof value !== 'string' || !value.trim()) return true
  const dateText = value.trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) return true
  return !Number.isFinite(new Date(`${dateText}T00:00:00`).getTime())
}

function isZeroAmount(value: unknown): boolean {
  const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isFinite(amount) && amount === 0
}

function collectRawDiagnostics(raw: unknown) {
  const record = readRawRecord(raw)
  const rawCategories = new Map<string, number>()
  let missingCategoryCount = 0
  let legacyIsPaidCount = 0
  let invalidDateCount = 0
  let zeroAmountCount = 0
  let tripTransactionItemCount = 0

  function inspectMoneyRecord(value: unknown, options: { hasStatus?: boolean; defaultCategory?: string } = {}): void {
    const item = readRawRecord(value)
    addRawCategory(rawCategories, item.categoryId ?? item.category)
    if (!options.defaultCategory && isMissingCategory(item)) missingCategoryCount += 1
    if (typeof item.isPaid === 'boolean' && !options.hasStatus && typeof item.status !== 'string') legacyIsPaidCount += 1
    if ('date' in item && isInvalidDate(item.date)) invalidDateCount += 1
    if ('amount' in item && isZeroAmount(item.amount)) zeroAmountCount += 1
  }

  asArray(record.entries).forEach((entry) => inspectMoneyRecord(entry))
  asArray(record.transactions).forEach((transaction) => {
    const transactionRecord = readRawRecord(transaction)
    inspectMoneyRecord(transaction)
    const hasTripLink = typeof transactionRecord.tripId === 'string' && transactionRecord.tripId.trim()
    const isTripSource = transactionRecord.sourceModule === 'trip' || String(transactionRecord.id ?? '').startsWith('tx-trip-')
    if (hasTripLink && isTripSource) tripTransactionItemCount += 1
  })
  asArray(record.recurringRules).forEach((rule) => inspectMoneyRecord(rule))
  asArray(record.installments).forEach((plan) => inspectMoneyRecord(plan, { defaultCategory: 'ผ่อนสินค้า' }))
  asArray(record.installmentPlans).forEach((plan) => inspectMoneyRecord(plan, { defaultCategory: 'ผ่อนสินค้า' }))
  asArray(record.budgets).forEach((budget) => {
    const budgetRecord = readRawRecord(budget)
    const hasBudgetLines = asArray(budgetRecord.lines).length > 0
    inspectMoneyRecord(budget, hasBudgetLines ? { defaultCategory: 'budget-line' } : {})
    asArray(budgetRecord.lines).forEach((line) => inspectMoneyRecord(line))
  })
  asArray(record.trips).forEach((trip) => {
    const tripRecord = readRawRecord(trip)
    asArray(tripRecord.items).forEach((item) => inspectMoneyRecord(item, { defaultCategory: 'ท่องเที่ยว' }))
  })
  asArray(record.goals).forEach((goal) => {
    const goalRecord = readRawRecord(goal)
    addRawCategory(rawCategories, goalRecord.linkedCategoryId)
  })

  return { rawCategories, missingCategoryCount, legacyIsPaidCount, invalidDateCount, zeroAmountCount, tripTransactionItemCount }
}

function getImportCounts(raw: unknown, normalized: FinanceData): ImportDiagnostics['counts'] {
  const record = readRawRecord(raw)
  return {
    entries: asArray(record.entries).length,
    transactions: asArray(record.transactions).length,
    recurringRules: asArray(record.recurringRules).length,
    installmentPlans: asArray(record.installmentPlans ?? record.installments).length,
    trips: normalized.trips.length,
    tripItems: normalized.trips.reduce<number>((total, trip) => total + trip.items.length, 0),
    budgets: asArray(record.budgets).length,
    goals: asArray(record.goals).length,
  }
}

function createAliasSummary(rawCategories: Map<string, number>): Array<{ from: string; to: string; count: number }> {
  return Array.from(rawCategories.entries())
    .map(([category, count]) => ({ from: category, to: normalizeCategoryId(category), count }))
    .filter((item) => item.from !== item.to || CATEGORY_ALIAS_MAP[item.from] === item.to)
    .sort((a, b) => a.from.localeCompare(b.from, 'th-TH'))
}

export function analyzeImportedFinanceData(raw: unknown, normalized: FinanceData, fileName?: string): ImportDiagnostics {
  const rawSummary = collectRawDiagnostics(raw)
  const normalizedCategories = new Set<string>()
  normalized.masters.categories.forEach((category) => normalizedCategories.add(category.id))
  normalized.transactions.forEach((transaction) => normalizedCategories.add(transaction.categoryId || transaction.category))
  normalized.recurringRules.forEach((rule) => normalizedCategories.add(rule.categoryId || rule.category))
  normalized.installmentPlans.forEach((plan) => normalizedCategories.add(plan.categoryId || plan.category))
  normalized.budgets.forEach((budget) => {
    normalizedCategories.add(budget.categoryId || budget.category)
    budget.lines?.forEach((line) => normalizedCategories.add(line.categoryId))
  })
  normalized.trips.forEach((trip) => trip.items.forEach((item) => normalizedCategories.add(item.category)))
  normalized.goals.forEach((goal) => {
    if (goal.linkedCategoryId) normalizedCategories.add(goal.linkedCategoryId)
  })

  const legacySet = new Set<string>(LEGACY_CATEGORY_OPTIONS)
  const unknownCategories = Array.from(normalizedCategories)
    .filter((category) => category && !legacySet.has(normalizeCategoryId(category)))
    .sort((a, b) => a.localeCompare(b, 'th-TH'))

  const aliasMappingsApplied = createAliasSummary(rawSummary.rawCategories)
  const warnings: string[] = []
  if (rawSummary.legacyIsPaidCount > 0) warnings.push(`แปลงสถานะ isPaid เดิมเป็น status แล้ว ${rawSummary.legacyIsPaidCount} รายการ`)
  if (aliasMappingsApplied.length > 0) warnings.push(`แปลงชื่อหมวดหมู่ alias แล้ว ${aliasMappingsApplied.reduce((sum, item) => sum + item.count, 0)} จุด`)
  if (rawSummary.missingCategoryCount > 0) warnings.push(`พบรายการไม่มีหมวดหมู่ ใช้ค่า fallback แล้ว ${rawSummary.missingCategoryCount} จุด`)
  if (rawSummary.invalidDateCount > 0) warnings.push(`พบวันที่ไม่ถูกต้อง ใช้วันที่ fallback แล้ว ${rawSummary.invalidDateCount} จุด`)
  if (rawSummary.zeroAmountCount > 0) warnings.push(`พบรายการยอด 0 บาท ระบบยังเก็บไว้ตามพฤติกรรมปัจจุบัน ${rawSummary.zeroAmountCount} จุด`)
  if (rawSummary.tripTransactionItemCount > 0) warnings.push(`แปลง transaction ของทริปกลับเป็นรายการทริปแล้ว ${rawSummary.tripTransactionItemCount} รายการ`)
  if (unknownCategories.length > 0) warnings.push(`พบหมวดหมู่นอก master เดิม ${unknownCategories.length} หมวด ระบบเก็บไว้ไม่ลบทิ้ง`)
  if (warnings.length === 0) warnings.push('ไม่พบความเสี่ยงสำคัญจากไฟล์นำเข้า')

  return {
    fileName,
    schemaVersion: getDataSchemaVersion(raw),
    counts: getImportCounts(raw, normalized),
    categorySummary: {
      rawCategories: Array.from(rawSummary.rawCategories.keys()).sort((a, b) => a.localeCompare(b, 'th-TH')),
      normalizedCategories: Array.from(normalizedCategories).filter(Boolean).sort((a, b) => a.localeCompare(b, 'th-TH')),
      aliasMappingsApplied,
      unknownCategories,
    },
    warnings,
  }
}
