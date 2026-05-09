import {
  DEFAULT_BASE_CURRENCY,
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  FINANCE_SCHEMA_VERSION,
  type Budget,
  type BudgetLine,
  type FinanceData,
  type FinanceMasters,
  type FinanceMeta,
  type FinanceProfile,
  type FinanceSettings,
  type Goal,
  type GoalStatus,
  type InstallmentPlan,
  type InterestType,
  type MasterCategory,
  type RecurringRule,
  type TransactionEntry,
  type TransactionStatus,
  type TransactionType,
  type Trip,
  type TripItem,
} from '../types/finance'

const DEFAULT_CATEGORY_NAMES = [
  'เงินเดือน',
  'อาหาร',
  'ท่องเที่ยว',
  'บ้าน',
  'ช้อปปิ้ง',
  'ยอดผ่อน',
  'ทริป',
  'สุขภาพ',
  'อื่น ๆ',
]

function nowIso(): string {
  return new Date().toISOString()
}

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function positiveNumber(value: unknown, fallback = 0): number {
  return Math.max(0, numberValue(value, fallback))
}

function positiveInteger(value: unknown, fallback = 0): number {
  return Math.max(0, Math.floor(numberValue(value, fallback)))
}

function dateValue(value: unknown, fallback: string): string {
  const candidate = text(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : fallback
}

function monthValue(value: unknown, fallback: string): string {
  const candidate = text(value)
  return /^\d{4}-\d{2}$/.test(candidate) ? candidate : fallback
}

function timestampValue(value: unknown, fallback: string): string {
  const candidate = text(value)
  return Number.isNaN(Date.parse(candidate)) ? fallback : candidate
}

function enumValue<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

function uniqueStrings(value: unknown): string[] {
  return Array.from(new Set(asArray(value).map((item) => text(item)).filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

function currentDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function currentMonth(): string {
  return currentDate().slice(0, 7)
}

function normalizeCategoryName(input: Record<string, unknown>, fallback = 'Other'): string {
  return text(input.category ?? input.categoryId, fallback)
}

function createMasterCategory(input: unknown): MasterCategory {
  const record = asRecord(input)
  const id = text(record.id, text(record.name, text(input, 'Other')))
  const kind = enumValue(record.kind, ['income', 'expense', 'mixed'] as const, 'mixed')
  return {
    id,
    label: text(record.label ?? record.name, id),
    kind,
    isArchived: record.isArchived === true,
  }
}

function createDefaultProfile(input: unknown): FinanceProfile {
  const record = asRecord(input)
  return {
    id: 'primary',
    displayName: nullableText(record.displayName),
    baseCurrency: DEFAULT_BASE_CURRENCY,
    locale: DEFAULT_LOCALE,
    timezone: DEFAULT_TIMEZONE,
  }
}

function createDefaultSettings(input: unknown): FinanceSettings {
  const record = asRecord(input)
  return {
    baseCurrency: DEFAULT_BASE_CURRENCY,
    locale: DEFAULT_LOCALE,
    timezone: DEFAULT_TIMEZONE,
    schemaVersion: FINANCE_SCHEMA_VERSION,
    defaultView: enumValue(record.defaultView, ['monthly', 'yearly', 'installments', 'trips', 'more'] as const, 'monthly'),
    monthStartsOn: Math.min(31, Math.max(1, positiveInteger(record.monthStartsOn, 1))),
    includePendingInMonthlyTotals: record.includePendingInMonthlyTotals !== false,
  }
}

function createDefaultMasters(input: unknown, referencedCategories: string[]): FinanceMasters {
  const record = asRecord(input)
  const categorySeed = asArray(record.categories).length ? asArray(record.categories) : DEFAULT_CATEGORY_NAMES
  const categories = new Map<string, MasterCategory>()
  for (const category of categorySeed) {
    const normalized = createMasterCategory(category)
    categories.set(normalized.id, normalized)
  }
  for (const category of referencedCategories) {
    if (!categories.has(category)) categories.set(category, createMasterCategory(category))
  }
  return {
    categories: Array.from(categories.values()).sort((a, b) => a.label.localeCompare(b.label)),
    tags: uniqueStrings(record.tags),
  }
}

function createDefaultMeta(input: unknown): FinanceMeta {
  const record = asRecord(input)
  const now = nowIso()
  return {
    createdAt: timestampValue(record.createdAt, now),
    updatedAt: timestampValue(record.updatedAt, now),
    exportedAt: nullableText(record.exportedAt),
  }
}

function normalizeTransaction(input: unknown): TransactionEntry {
  const record = asRecord(input)
  const now = nowIso()
  const type = enumValue<TransactionType>(record.type, ['income', 'expense'], 'expense')
  const date = dateValue(record.date, currentDate())
  const category = normalizeCategoryName(record)
  const statusFallback: TransactionStatus = type === 'expense' ? 'cleared' : 'cleared'
  return {
    id: text(record.id, createId('transaction')),
    type,
    date,
    monthKey: monthValue(record.monthKey, date.slice(0, 7)),
    category,
    categoryId: text(record.categoryId, category),
    title: text(record.title, 'Untitled transaction'),
    amount: positiveNumber(record.amount),
    currency: DEFAULT_BASE_CURRENCY,
    note: text(record.note) || undefined,
    status: enumValue<TransactionStatus>(record.status, ['cleared', 'pending'], statusFallback),
    source: enumValue(record.source, ['manual', 'quick-add', 'installment', 'import'] as const, 'manual'),
    sourceModule: text(record.sourceModule, 'manual'),
    sourceRefId: nullableText(record.sourceRefId),
    tripId: nullableText(record.tripId),
    installmentId: text(record.installmentId) || text(record.installmentPlanId) || undefined,
    installmentPlanId: nullableText(record.installmentPlanId ?? record.installmentId),
    recurringRuleId: nullableText(record.recurringRuleId),
    goalId: nullableText(record.goalId),
    createdAt: timestampValue(record.createdAt, now),
    updatedAt: timestampValue(record.updatedAt, now),
  }
}

function normalizeRecurringRule(input: unknown): RecurringRule {
  const record = asRecord(input)
  const now = nowIso()
  const type = enumValue<TransactionType>(record.type, ['income', 'expense'], 'expense')
  const category = normalizeCategoryName(record)
  return {
    id: text(record.id, createId('recurring-rule')),
    isActive: record.isActive !== false,
    type,
    title: text(record.title, 'Untitled recurring rule'),
    category,
    categoryId: text(record.categoryId, category),
    amount: positiveNumber(record.amount),
    currency: DEFAULT_BASE_CURRENCY,
    cadence: text(record.cadence, 'monthly'),
    interval: Math.max(1, positiveInteger(record.interval, 1)),
    dayOfMonth: record.dayOfMonth == null ? null : Math.min(31, Math.max(1, positiveInteger(record.dayOfMonth, 1))),
    startDate: dateValue(record.startDate, currentDate()),
    endDate: nullableText(record.endDate),
    note: nullableText(record.note),
    tripId: nullableText(record.tripId),
    goalId: nullableText(record.goalId),
    createdAt: timestampValue(record.createdAt, now),
    updatedAt: timestampValue(record.updatedAt, now),
  }
}

function normalizeInstallmentPlan(input: unknown): InstallmentPlan {
  const record = asRecord(input)
  const now = nowIso()
  const category = normalizeCategoryName(record, 'ยอดผ่อน')
  const monthlyAmount = positiveNumber(record.monthlyAmount ?? record.paymentAmount)
  const monthsTotal = Math.max(1, positiveInteger(record.monthsTotal ?? record.installmentCount ?? record.totalMonths, 1))
  const balanceSnapshotAmount = record.balanceSnapshotAmount ?? record.remainingOverride
  const dueDay = positiveInteger(record.dueDay ?? record.paymentDay, 0)
  const paidMonthKeys = uniqueStrings(record.paidMonthKeys)
  const paidMonths = Math.min(monthsTotal, paidMonthKeys.length ? paidMonthKeys.length : positiveInteger(record.monthsPaid ?? record.paidMonths, 0))
  return {
    id: text(record.id, createId('installment')),
    name: text(record.name, 'Untitled installment'),
    category,
    categoryId: text(record.categoryId, category),
    monthlyAmount,
    paymentAmount: monthlyAmount,
    monthsTotal,
    totalMonths: monthsTotal,
    installmentCount: monthsTotal,
    monthsPaid: paidMonths,
    paidMonths,
    paidMonthKeys,
    startMonth: monthValue(record.startMonth, currentMonth()),
    dueDay: dueDay ? Math.min(31, dueDay) : undefined,
    paymentDay: dueDay ? Math.min(31, dueDay) : null,
    principal: record.principal == null ? undefined : positiveNumber(record.principal),
    principalAmount: record.principalAmount == null ? null : positiveNumber(record.principalAmount),
    remainingOverride: balanceSnapshotAmount == null ? undefined : positiveNumber(balanceSnapshotAmount),
    balanceSnapshotAmount: balanceSnapshotAmount == null ? null : positiveNumber(balanceSnapshotAmount),
    balanceSnapshotMonth: record.balanceSnapshotMonth == null ? null : monthValue(record.balanceSnapshotMonth, currentMonth()),
    interestType: enumValue<InterestType>(record.interestType, ['none', 'flat', 'reducing'], 'none'),
    interestRate: record.interestRate == null ? null : positiveNumber(record.interestRate),
    interestNote: text(record.interestNote) || undefined,
    note: text(record.note ?? record.interestNote) || undefined,
    tripId: nullableText(record.tripId),
    createdAt: timestampValue(record.createdAt, now),
    updatedAt: timestampValue(record.updatedAt, now),
  }
}

function normalizeTripItem(input: unknown): TripItem {
  const record = asRecord(input)
  return {
    id: text(record.id, createId('trip-item')),
    date: dateValue(record.date, currentDate()),
    category: normalizeCategoryName(record, 'Trips'),
    title: text(record.title, 'Untitled trip item'),
    amount: positiveNumber(record.amount),
    destination: text(record.destination) || undefined,
    country: text(record.country) || undefined,
    note: text(record.note) || undefined,
    installmentId: text(record.installmentId ?? record.installmentPlanId) || undefined,
    isPaid: record.isPaid !== false,
  }
}

function normalizeTrip(input: unknown): Trip {
  const record = asRecord(input)
  const now = nowIso()
  const startDate = dateValue(record.startDate, currentDate())
  return {
    id: text(record.id, createId('trip')),
    name: text(record.name, 'Untitled trip'),
    destination: text(record.destination) || undefined,
    budget: record.budget == null ? undefined : positiveNumber(record.budget),
    startDate,
    endDate: dateValue(record.endDate, startDate),
    note: text(record.note) || undefined,
    items: asArray(record.items).map(normalizeTripItem),
    createdAt: timestampValue(record.createdAt, now),
    updatedAt: timestampValue(record.updatedAt, now),
  }
}

function normalizeBudgetLine(input: unknown, fallbackCategory: string): BudgetLine {
  const record = asRecord(input)
  return {
    id: text(record.id, createId('budget-line')),
    categoryId: text(record.categoryId ?? record.category, fallbackCategory),
    amount: positiveNumber(record.amount),
    note: text(record.note) || undefined,
  }
}

function normalizeBudget(input: unknown): Budget {
  const record = asRecord(input)
  const now = nowIso()
  const scope = enumValue(record.scope, ['monthly', 'trip'] as const, 'monthly')
  const category = normalizeCategoryName(record)
  const lines = asArray(record.lines).map((line) => normalizeBudgetLine(line, category))
  const firstLine = lines[0]
  const lineTotal = lines.reduce((total, line) => total + Number(line.amount || 0), 0)
  const amount = positiveNumber(record.amount ?? lineTotal, firstLine?.amount ?? 0)
  const alertThresholds = asArray(record.alertThresholds).map((value) => positiveNumber(value)).filter(Boolean)
  return {
    id: text(record.id, createId('budget')),
    scope,
    name: text(record.name, scope === 'trip' ? 'งบทริป' : 'งบรายเดือน'),
    month: scope === 'monthly' ? monthValue(record.month, currentMonth()) : undefined,
    tripId: scope === 'trip' ? text(record.tripId) || undefined : undefined,
    category: firstLine?.categoryId ?? category,
    categoryId: text(record.categoryId, firstLine?.categoryId ?? category),
    amount,
    lines: lines.length ? lines : [{ id: text(record.lineId, createId('budget-line')), categoryId: category, amount }],
    alertThresholds: alertThresholds.length ? alertThresholds : [0.8, 1],
    enabled: record.enabled !== false,
    note: text(record.note) || undefined,
    createdAt: timestampValue(record.createdAt, now),
    updatedAt: timestampValue(record.updatedAt, now),
  }
}

function normalizeGoal(input: unknown): Goal {
  const record = asRecord(input)
  const now = nowIso()
  return {
    id: text(record.id, createId('goal')),
    name: text(record.name, 'Untitled goal'),
    type: enumValue(record.type ?? record.kind ?? record.goalType, ['savings'] as const, 'savings'),
    kind: enumValue(record.kind ?? record.type ?? record.goalType, ['savings'] as const, 'savings'),
    targetAmount: positiveNumber(record.targetAmount),
    currentAmount: positiveNumber(record.currentAmount),
    targetDate: text(record.targetDate) || undefined,
    linkedCategoryId: nullableText(record.linkedCategoryId),
    status: enumValue<GoalStatus>(record.status, ['active', 'paused', 'completed'], 'active'),
    note: text(record.note) || undefined,
    createdAt: timestampValue(record.createdAt, now),
    updatedAt: timestampValue(record.updatedAt, now),
  }
}

function referencedCategories(data: {
  transactions: TransactionEntry[]
  recurringRules: RecurringRule[]
  installmentPlans: InstallmentPlan[]
  budgets: Budget[]
  trips: Trip[]
}): string[] {
  return Array.from(
    new Set([
      ...data.transactions.map((item) => item.category),
      ...data.recurringRules.map((item) => item.category),
      ...data.installmentPlans.map((item) => item.category),
      ...data.budgets.map((item) => item.category),
      ...data.budgets.flatMap((item) => item.lines?.map((line) => line.categoryId) ?? []),
      ...data.trips.flatMap((trip) => trip.items.map((item) => item.category)),
    ].filter(Boolean)),
  )
}

export function getDataSchemaVersion(input: unknown): number {
  const record = asRecord(input)
  const settings = asRecord(record.settings)
  const parsed = Number(record.schemaVersion ?? settings.schemaVersion)
  return Number.isFinite(parsed) ? parsed : 0
}

export function createEmptyFinanceData(input: unknown = {}): FinanceData {
  return normalizeFinanceData({
    ...asRecord(input),
    schemaVersion: FINANCE_SCHEMA_VERSION,
    transactions: [],
    recurringRules: [],
    installmentPlans: [],
    trips: [],
    budgets: [],
    goals: [],
  })
}

export function normalizeFinanceData(input: unknown): FinanceData {
  const record = asRecord(input)
  const rawTransactions = asArray(record.transactions).length ? asArray(record.transactions) : asArray(record.entries)
  const transactions = rawTransactions.map(normalizeTransaction)
  const recurringRules = asArray(record.recurringRules).map(normalizeRecurringRule)
  const rawInstallmentPlans = asArray(record.installmentPlans).length ? asArray(record.installmentPlans) : asArray(record.installments)
  const installmentPlans = rawInstallmentPlans.map(normalizeInstallmentPlan)
  const trips = asArray(record.trips).map(normalizeTrip)
  const budgets = asArray(record.budgets).map(normalizeBudget)
  const goals = asArray(record.goals).map(normalizeGoal)
  const categoryNames = referencedCategories({ transactions, recurringRules, installmentPlans, budgets, trips })
  const settings = createDefaultSettings(record.settings)
  const profile = createDefaultProfile(record.profile)
  const masters = createDefaultMasters(record.masters, categoryNames)
  const meta = createDefaultMeta(record.meta)

  return {
    schemaVersion: FINANCE_SCHEMA_VERSION,
    profile,
    settings,
    masters,
    meta,
    transactions,
    recurringRules,
    installmentPlans,
    trips,
    budgets,
    goals,
    entries: transactions,
    installments: installmentPlans,
  }
}

export function createExportableFinanceData(data: FinanceData, exportedAt = nowIso()): Omit<FinanceData, 'entries' | 'installments'> {
  const normalized = normalizeFinanceData({
    ...data,
    meta: {
      ...data.meta,
      exportedAt,
    },
  })
  return {
    schemaVersion: normalized.schemaVersion,
    profile: normalized.profile,
    settings: normalized.settings,
    masters: normalized.masters,
    meta: normalized.meta,
    transactions: normalized.transactions,
    recurringRules: normalized.recurringRules,
    installmentPlans: normalized.installmentPlans,
    trips: normalized.trips,
    budgets: normalized.budgets,
    goals: normalized.goals,
  }
}

export function withUpdatedMeta(data: FinanceData): FinanceData {
  return normalizeFinanceData({
    ...data,
    meta: {
      ...data.meta,
      updatedAt: nowIso(),
    },
  })
}

export type FinanceDataImportResult = {
  data: FinanceData
  schemaVersion: number
}
