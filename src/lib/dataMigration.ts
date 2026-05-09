import {
  CATEGORY_LABELS,
  LEGACY_CATEGORY_OPTIONS,
  createLegacyMasterCategory,
  inferLegacyCategoryKind,
  normalizeCategoryId,
} from '../data/categories'
import type {
  Budget,
  BudgetLine,
  CategoryKind,
  FinanceData,
  FinanceMasters,
  FinanceMeta,
  FinanceProfile,
  FinanceSettings,
  Goal,
  GoalStatus,
  InstallmentPlan,
  InterestType,
  MasterCategory,
  RecurringRule,
  TransactionEntry,
  TransactionStatus,
  TransactionType,
  Trip,
  TripItem,
  ViewId,
} from '../types/finance'
import {
  DEFAULT_BASE_CURRENCY,
  DEFAULT_LOCALE,
  DEFAULT_TIMEZONE,
  FINANCE_SCHEMA_VERSION,
} from '../types/finance'
import { currentDateInputValue, currentIsoTimestamp, getMonthKey } from '../utils/formatters'

const validTransactionTypes = new Set<TransactionType>(['income', 'expense'])
const validTransactionStatuses = new Set<TransactionStatus>(['cleared', 'pending'])
const validInterestTypes = new Set<InterestType>(['none', 'flat', 'reducing'])
const validGoalStatuses = new Set<GoalStatus>(['active', 'paused', 'completed'])
const validViews = new Set<ViewId>(['monthly', 'yearly', 'installments', 'trips', 'more'])
const validCategoryKinds = new Set<CategoryKind>(['income', 'expense', 'mixed'])

type RawRecord = Record<string, unknown>
type KindHintMap = Map<string, Set<CategoryKind>>

function isRecord(value: unknown): value is RawRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function readRecord(value: unknown): RawRecord {
  return isRecord(value) ? value : {}
}

function readString(record: RawRecord, key: string, fallback = ''): string {
  const value = record[key]
  return typeof value === 'string' ? value.trim() : fallback
}

function readNullableString(record: RawRecord, key: string): string | null {
  const value = record[key]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function readNumber(record: RawRecord, key: string, fallback = 0): number {
  const value = record[key]
  const numberValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function readBoolean(record: RawRecord, key: string, fallback = false): boolean {
  const value = record[key]
  return typeof value === 'boolean' ? value : fallback
}

function readId(record: RawRecord, fallbackPrefix: string): string {
  const rawId = readString(record, 'id')
  return rawId || `${fallbackPrefix}-${crypto.randomUUID()}`
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isFinite(parsed.getTime())
}

function isValidMonth(value: string): boolean {
  return /^\d{4}-\d{2}$/.test(value)
}

function normalizeDate(value: unknown, fallback = currentDateInputValue()): string {
  const text = typeof value === 'string' ? value.trim().slice(0, 10) : ''
  return isValidDate(text) ? text : fallback
}

function normalizeMonth(value: unknown, fallback = currentDateInputValue().slice(0, 7)): string {
  const text = typeof value === 'string' ? value.trim().slice(0, 7) : ''
  return isValidMonth(text) ? text : fallback
}

function normalizeTimestamp(value: unknown, fallback: string): string {
  const text = typeof value === 'string' ? value.trim() : ''
  return Number.isFinite(Date.parse(text)) ? text : fallback
}

function normalizeTransactionType(value: unknown): TransactionType {
  return typeof value === 'string' && validTransactionTypes.has(value as TransactionType) ? value as TransactionType : 'expense'
}

function normalizeTransactionStatus(record: RawRecord, type: TransactionType): TransactionStatus {
  const status = record.status
  if (typeof status === 'string' && validTransactionStatuses.has(status as TransactionStatus)) return status as TransactionStatus
  if (typeof record.isPaid === 'boolean') return record.isPaid ? 'cleared' : 'pending'
  return type === 'income' ? 'cleared' : 'cleared'
}

function normalizeInterestType(value: unknown): InterestType {
  return typeof value === 'string' && validInterestTypes.has(value as InterestType) ? value as InterestType : 'none'
}

function normalizeGoalStatus(value: unknown): GoalStatus {
  return typeof value === 'string' && validGoalStatuses.has(value as GoalStatus) ? value as GoalStatus : 'active'
}

function normalizeDefaultView(value: unknown): ViewId {
  return typeof value === 'string' && validViews.has(value as ViewId) ? value as ViewId : 'monthly'
}

function normalizeCategoryKind(value: unknown, fallback: CategoryKind): CategoryKind {
  return typeof value === 'string' && validCategoryKinds.has(value as CategoryKind) ? value as CategoryKind : fallback
}

function addKindHint(hints: KindHintMap, categoryId: string | null | undefined, kind: CategoryKind): void {
  if (!categoryId) return
  const canonical = normalizeCategoryId(categoryId)
  const existing = hints.get(canonical) ?? new Set<CategoryKind>()
  existing.add(kind)
  hints.set(canonical, existing)
}

function resolveKind(defaultKind: CategoryKind, hints?: Set<CategoryKind>): CategoryKind {
  if (!hints || hints.size === 0) return defaultKind
  if (hints.size > 1) return 'mixed'
  return Array.from(hints)[0] ?? defaultKind
}

function normalizeProfile(rawProfile: unknown): FinanceProfile {
  const profile = readRecord(rawProfile)
  return {
    id: 'primary',
    displayName: readNullableString(profile, 'displayName'),
    baseCurrency: DEFAULT_BASE_CURRENCY,
    locale: DEFAULT_LOCALE,
    timezone: DEFAULT_TIMEZONE,
  }
}

function normalizeSettings(rawSettings: unknown): FinanceSettings {
  const settings = readRecord(rawSettings)
  return {
    baseCurrency: DEFAULT_BASE_CURRENCY,
    locale: DEFAULT_LOCALE,
    timezone: DEFAULT_TIMEZONE,
    schemaVersion: FINANCE_SCHEMA_VERSION,
    defaultView: normalizeDefaultView(settings.defaultView),
    monthStartsOn: Math.max(0, Math.min(6, Math.floor(readNumber(settings, 'monthStartsOn', 1)))) || 1,
    includePendingInMonthlyTotals: readBoolean(settings, 'includePendingInMonthlyTotals', true),
  }
}

function normalizeMeta(rawMeta: unknown): FinanceMeta {
  const now = currentIsoTimestamp()
  const meta = readRecord(rawMeta)
  return {
    createdAt: normalizeTimestamp(meta.createdAt, now),
    updatedAt: normalizeTimestamp(meta.updatedAt, now),
    exportedAt: typeof meta.exportedAt === 'string' && meta.exportedAt.trim() ? meta.exportedAt.trim() : null,
  }
}

function normalizeMasterCategory(value: unknown): MasterCategory | null {
  const record = readRecord(value)
  const canonicalId = normalizeCategoryId(record.id ?? record.categoryId ?? record.name ?? record.label, '')
  if (!canonicalId) return null
  const label = readString(record, 'label') || CATEGORY_LABELS[canonicalId] || canonicalId
  return {
    id: canonicalId,
    label,
    kind: normalizeCategoryKind(record.kind, inferLegacyCategoryKind(canonicalId)),
    isArchived: readBoolean(record, 'isArchived', false),
  }
}

function normalizeTransaction(value: unknown): TransactionEntry {
  const record = readRecord(value)
  const now = currentIsoTimestamp()
  const type = normalizeTransactionType(record.type)
  const date = normalizeDate(record.date)
  const category = normalizeCategoryId(record.categoryId ?? record.category, 'อื่นๆ')
  return {
    id: readId(record, 'transaction'),
    type,
    date,
    monthKey: getMonthKey(date),
    category,
    categoryId: category,
    title: readString(record, 'title') || readString(record, 'name') || 'รายการนำเข้า',
    amount: Math.max(0, readNumber(record, 'amount', 0)),
    currency: 'THB',
    note: readNullableString(record, 'note') ?? undefined,
    status: normalizeTransactionStatus(record, type),
    source: record.source === 'manual' || record.source === 'quick-add' || record.source === 'installment' ? record.source : 'import',
    sourceModule: readString(record, 'sourceModule') || 'import',
    sourceRefId: readNullableString(record, 'sourceRefId'),
    tripId: readNullableString(record, 'tripId'),
    installmentId: readNullableString(record, 'installmentId') ?? undefined,
    installmentPlanId: readNullableString(record, 'installmentPlanId'),
    recurringRuleId: readNullableString(record, 'recurringRuleId'),
    goalId: readNullableString(record, 'goalId'),
    createdAt: normalizeTimestamp(record.createdAt, now),
    updatedAt: normalizeTimestamp(record.updatedAt, now),
  }
}

function normalizeRecurringRule(value: unknown): RecurringRule {
  const record = readRecord(value)
  const now = currentIsoTimestamp()
  const type = normalizeTransactionType(record.type)
  const category = normalizeCategoryId(record.categoryId ?? record.category, 'อื่นๆ')
  return {
    id: readId(record, 'recurring-rule'),
    isActive: readBoolean(record, 'isActive', true),
    type,
    title: readString(record, 'title') || 'รายการประจำ',
    category,
    categoryId: category,
    amount: Math.max(0, readNumber(record, 'amount', 0)),
    currency: 'THB',
    cadence: readString(record, 'cadence') || 'monthly',
    interval: Math.max(1, Math.floor(readNumber(record, 'interval', 1))),
    dayOfMonth: record.dayOfMonth == null ? null : Math.max(1, Math.min(31, Math.floor(readNumber(record, 'dayOfMonth', 1)))),
    startDate: normalizeDate(record.startDate ?? record.date),
    endDate: readNullableString(record, 'endDate'),
    note: readNullableString(record, 'note'),
    tripId: readNullableString(record, 'tripId'),
    goalId: readNullableString(record, 'goalId'),
    createdAt: normalizeTimestamp(record.createdAt, now),
    updatedAt: normalizeTimestamp(record.updatedAt, now),
  }
}

function normalizeInstallmentPlan(value: unknown): InstallmentPlan {
  const record = readRecord(value)
  const now = currentIsoTimestamp()
  const monthlyAmount = Math.max(0, readNumber(record, 'monthlyAmount', readNumber(record, 'paymentAmount', 0)))
  const monthsTotal = Math.max(1, Math.floor(readNumber(record, 'monthsTotal', readNumber(record, 'totalMonths', readNumber(record, 'installmentCount', 1)))))
  const monthsPaid = Math.max(0, Math.min(monthsTotal, Math.floor(readNumber(record, 'monthsPaid', readNumber(record, 'paidMonths', 0)))))
  const category = normalizeCategoryId(record.categoryId ?? record.category, 'ผ่อนสินค้า')
  const paidMonthKeys = asArray(record.paidMonthKeys).filter((item): item is string => typeof item === 'string' && isValidMonth(item))
  const dueDay = record.dueDay ?? record.paymentDay
  const normalizedDueDay = dueDay == null ? undefined : Math.max(1, Math.min(31, Math.floor(Number(dueDay) || 1)))
  const remainingOverride = record.remainingOverride == null ? undefined : Math.max(0, readNumber(record, 'remainingOverride', 0))
  return {
    id: readId(record, 'installment-plan'),
    name: readString(record, 'name') || readString(record, 'title') || 'แผนผ่อนนำเข้า',
    category,
    categoryId: category,
    monthlyAmount,
    paymentAmount: monthlyAmount,
    monthsTotal,
    totalMonths: monthsTotal,
    installmentCount: monthsTotal,
    monthsPaid,
    paidMonths: monthsPaid,
    paidMonthKeys,
    startMonth: normalizeMonth(record.startMonth),
    dueDay: normalizedDueDay,
    paymentDay: normalizedDueDay ?? null,
    principal: Math.max(0, readNumber(record, 'principal', readNumber(record, 'principalAmount', monthlyAmount * monthsTotal))),
    principalAmount: Math.max(0, readNumber(record, 'principalAmount', readNumber(record, 'principal', monthlyAmount * monthsTotal))),
    remainingOverride,
    balanceSnapshotAmount: record.balanceSnapshotAmount == null ? remainingOverride ?? null : Math.max(0, readNumber(record, 'balanceSnapshotAmount', 0)),
    balanceSnapshotMonth: readNullableString(record, 'balanceSnapshotMonth'),
    interestType: normalizeInterestType(record.interestType),
    interestRate: record.interestRate == null ? null : Math.max(0, readNumber(record, 'interestRate', 0)),
    interestNote: readNullableString(record, 'interestNote') ?? undefined,
    note: readNullableString(record, 'note') ?? undefined,
    tripId: readNullableString(record, 'tripId'),
    createdAt: normalizeTimestamp(record.createdAt, now),
    updatedAt: normalizeTimestamp(record.updatedAt, now),
  }
}

function normalizeTripItem(value: unknown): TripItem {
  const record = readRecord(value)
  const category = normalizeCategoryId(record.categoryId ?? record.category, 'ท่องเที่ยว')
  return {
    id: readId(record, 'trip-item'),
    date: normalizeDate(record.date),
    category,
    title: readString(record, 'title') || readString(record, 'name') || 'รายการทริปนำเข้า',
    amount: Math.max(0, readNumber(record, 'amount', 0)),
    destination: readNullableString(record, 'destination') ?? undefined,
    country: readNullableString(record, 'country') ?? undefined,
    note: readNullableString(record, 'note') ?? undefined,
    installmentId: readNullableString(record, 'installmentId') ?? undefined,
    isPaid: readBoolean(record, 'isPaid', true),
  }
}


function createTripItemFromTripTransaction(transaction: TransactionEntry): TripItem | null {
  if (!transaction.tripId) return null
  const looksLikeTripTransaction = transaction.sourceModule === 'trip' || transaction.id.startsWith('tx-trip-')
  if (!looksLikeTripTransaction || transaction.type !== 'expense') return null
  return {
    id: transaction.sourceRefId || transaction.id,
    date: normalizeDate(transaction.date),
    category: normalizeCategoryId(transaction.categoryId ?? transaction.category, 'ท่องเที่ยว'),
    title: transaction.title || 'รายการทริปนำเข้า',
    amount: Math.max(0, Number(transaction.amount || 0)),
    note: transaction.note,
    installmentId: transaction.installmentPlanId ?? transaction.installmentId ?? undefined,
    isPaid: transaction.status !== 'pending',
  }
}

function extractTripNameFromTransactionNote(note: string | undefined): string {
  const cleaned = String(note ?? '').trim()
  const match = cleaned.match(/^Imported from trip\.json:\s*(.+)$/i)
  return match?.[1]?.trim() || 'ทริปนำเข้า'
}

function hydrateTripsFromTripTransactions(trips: Trip[], transactions: TransactionEntry[]): Trip[] {
  const tripMap = new Map<string, Trip>()
  trips.forEach((trip) => tripMap.set(trip.id, { ...trip, items: [...trip.items] }))

  const itemsByTripId = new Map<string, TripItem[]>()
  const transactionByTripId = new Map<string, TransactionEntry[]>()

  transactions.forEach((transaction) => {
    if (!transaction.tripId) return
    const tripItem = createTripItemFromTripTransaction(transaction)
    if (!tripItem) return
    const items = itemsByTripId.get(transaction.tripId) ?? []
    items.push(tripItem)
    itemsByTripId.set(transaction.tripId, items)
    const sourceTransactions = transactionByTripId.get(transaction.tripId) ?? []
    sourceTransactions.push(transaction)
    transactionByTripId.set(transaction.tripId, sourceTransactions)
  })

  itemsByTripId.forEach((items, tripId) => {
    const existingTrip = tripMap.get(tripId)
    const existingItems = existingTrip?.items ?? []
    const existingIds = new Set(existingItems.map((item) => item.id))
    const mergedItems = [
      ...existingItems,
      ...items.filter((item) => !existingIds.has(item.id)),
    ].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.title || '').localeCompare(String(b.title || ''), 'th-TH'))

    if (existingTrip) {
      tripMap.set(tripId, {
        ...existingTrip,
        items: mergedItems,
      })
      return
    }

    const sourceTransactions = transactionByTripId.get(tripId) ?? []
    const dates = mergedItems.map((item) => item.date).filter(Boolean).sort()
    const firstTransaction = sourceTransactions[0]
    const fallbackDate = dates[0] ?? currentDateInputValue()
    const now = currentIsoTimestamp()
    tripMap.set(tripId, {
      id: tripId,
      name: extractTripNameFromTransactionNote(firstTransaction?.note),
      destination: extractTripNameFromTransactionNote(firstTransaction?.note),
      budget: undefined,
      startDate: dates[0] ?? fallbackDate,
      endDate: dates[dates.length - 1] ?? fallbackDate,
      note: firstTransaction?.note,
      items: mergedItems,
      createdAt: firstTransaction?.createdAt ?? now,
      updatedAt: firstTransaction?.updatedAt ?? now,
    })
  })

  return Array.from(tripMap.values()).sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)) || String(a.name).localeCompare(String(b.name), 'th-TH'))
}

function normalizeTrip(value: unknown): Trip {
  const record = readRecord(value)
  const now = currentIsoTimestamp()
  const startDate = normalizeDate(record.startDate)
  const endDate = normalizeDate(record.endDate, startDate)
  return {
    id: readId(record, 'trip'),
    name: readString(record, 'name') || 'ทริปนำเข้า',
    destination: readNullableString(record, 'destination') ?? undefined,
    budget: record.budget == null || record.budget === '' ? undefined : Math.max(0, readNumber(record, 'budget', 0)),
    startDate,
    endDate: endDate < startDate ? startDate : endDate,
    note: readNullableString(record, 'note') ?? undefined,
    items: asArray(record.items).map(normalizeTripItem),
    createdAt: normalizeTimestamp(record.createdAt, now),
    updatedAt: normalizeTimestamp(record.updatedAt, now),
  }
}

function normalizeBudgetLine(value: unknown, fallbackCategory: string): BudgetLine {
  const record = readRecord(value)
  const categoryId = normalizeCategoryId(record.categoryId ?? record.category, fallbackCategory)
  return {
    id: readId(record, 'budget-line'),
    categoryId,
    amount: Math.max(0, readNumber(record, 'amount', 0)),
    note: readNullableString(record, 'note') ?? undefined,
  }
}

function normalizeBudget(value: unknown): Budget {
  const record = readRecord(value)
  const now = currentIsoTimestamp()
  const scope = record.scope === 'trip' ? 'trip' : 'monthly'
  const fallbackCategory = scope === 'trip' ? 'ท่องเที่ยว' : 'อื่นๆ'
  const category = normalizeCategoryId(record.categoryId ?? record.category, fallbackCategory)
  const lines = asArray(record.lines).map((line) => normalizeBudgetLine(line, category))
  const amount = Math.max(0, readNumber(record, 'amount', lines.reduce((sum, line) => sum + line.amount, 0)))
  const budgetId = readId(record, 'budget')
  return {
    id: budgetId,
    scope,
    name: readNullableString(record, 'name') ?? undefined,
    month: scope === 'monthly' ? normalizeMonth(record.month) : readNullableString(record, 'month') ?? undefined,
    tripId: readNullableString(record, 'tripId') ?? undefined,
    category,
    categoryId: category,
    amount,
    lines: lines.length ? lines : [{ id: `${budgetId}-line`, categoryId: category, amount, note: readNullableString(record, 'note') ?? undefined }],
    alertThresholds: asArray(record.alertThresholds).map(Number).filter(Number.isFinite),
    enabled: readBoolean(record, 'enabled', true),
    note: readNullableString(record, 'note') ?? undefined,
    createdAt: normalizeTimestamp(record.createdAt, now),
    updatedAt: normalizeTimestamp(record.updatedAt, now),
  }
}

function normalizeGoal(value: unknown): Goal {
  const record = readRecord(value)
  const now = currentIsoTimestamp()
  const linkedCategoryId = record.linkedCategoryId == null || record.linkedCategoryId === ''
    ? null
    : normalizeCategoryId(record.linkedCategoryId)
  return {
    id: readId(record, 'goal'),
    name: readString(record, 'name') || 'เป้าหมายนำเข้า',
    type: 'savings',
    kind: 'savings',
    targetAmount: Math.max(0, readNumber(record, 'targetAmount', 0)),
    currentAmount: Math.max(0, readNumber(record, 'currentAmount', 0)),
    targetDate: readNullableString(record, 'targetDate') ?? undefined,
    linkedCategoryId,
    status: normalizeGoalStatus(record.status),
    note: readNullableString(record, 'note') ?? undefined,
    createdAt: normalizeTimestamp(record.createdAt, now),
    updatedAt: normalizeTimestamp(record.updatedAt, now),
  }
}

function createDefaultMasters(rawMasters: unknown, normalized: {
  transactions: TransactionEntry[]
  recurringRules: RecurringRule[]
  installmentPlans: InstallmentPlan[]
  trips: Trip[]
  budgets: Budget[]
  goals: Goal[]
}): FinanceMasters {
  const hints: KindHintMap = new Map()
  const categories = new Map<string, MasterCategory>()

  LEGACY_CATEGORY_OPTIONS.forEach((categoryId) => {
    const master = createLegacyMasterCategory(categoryId)
    categories.set(master.id, master)
  })

  const mastersRecord = readRecord(rawMasters)
  asArray(mastersRecord.categories).map(normalizeMasterCategory).forEach((category) => {
    if (!category) return
    const existing = categories.get(category.id)
    categories.set(category.id, {
      ...createLegacyMasterCategory(category.id, existing?.kind ?? category.kind),
      ...existing,
      ...category,
      id: category.id,
      label: category.label || existing?.label || CATEGORY_LABELS[category.id] || category.id,
      isArchived: category.isArchived,
    })
    addKindHint(hints, category.id, category.kind)
  })

  normalized.transactions.forEach((transaction) => addKindHint(hints, transaction.categoryId || transaction.category, transaction.type))
  normalized.recurringRules.forEach((rule) => addKindHint(hints, rule.categoryId || rule.category, rule.type))
  normalized.installmentPlans.forEach((plan) => addKindHint(hints, plan.categoryId || plan.category, 'expense'))
  normalized.trips.forEach((trip) => trip.items.forEach((item) => addKindHint(hints, item.category, 'expense')))
  normalized.budgets.forEach((budget) => {
    addKindHint(hints, budget.categoryId || budget.category, budget.scope === 'trip' ? 'expense' : 'expense')
    budget.lines?.forEach((line) => addKindHint(hints, line.categoryId, 'expense'))
  })
  normalized.goals.forEach((goal) => addKindHint(hints, goal.linkedCategoryId, 'mixed'))

  hints.forEach((categoryKinds, categoryId) => {
    const existing = categories.get(categoryId)
    const defaultKind = existing?.kind ?? inferLegacyCategoryKind(categoryId)
    categories.set(categoryId, {
      ...(existing ?? createLegacyMasterCategory(categoryId, defaultKind)),
      kind: resolveKind(defaultKind, categoryKinds),
    })
  })

  return {
    categories: Array.from(categories.values()).sort((a, b) => a.id.localeCompare(b.id, 'th-TH')),
    tags: asArray(mastersRecord.tags).filter((tag): tag is string => typeof tag === 'string' && Boolean(tag.trim())).map((tag) => tag.trim()),
  }
}

export function getDataSchemaVersion(data: unknown): number | null {
  const record = readRecord(data)
  const schemaVersion = record.schemaVersion ?? readRecord(record.settings).schemaVersion
  const parsed = typeof schemaVersion === 'number' ? schemaVersion : typeof schemaVersion === 'string' ? Number(schemaVersion) : Number.NaN
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizeFinanceData(data: unknown): FinanceData {
  const record = readRecord(data)
  const transactions = asArray(record.transactions ?? record.entries).map(normalizeTransaction)
  const recurringRules = asArray(record.recurringRules).map(normalizeRecurringRule)
  const installmentPlans = asArray(record.installmentPlans ?? record.installments).map(normalizeInstallmentPlan)
  const trips = hydrateTripsFromTripTransactions(asArray(record.trips).map(normalizeTrip), transactions)
  const budgets = asArray(record.budgets).map(normalizeBudget)
  const goals = asArray(record.goals).map(normalizeGoal)
  const masters = createDefaultMasters(record.masters, { transactions, recurringRules, installmentPlans, trips, budgets, goals })
  const normalized: FinanceData = {
    schemaVersion: FINANCE_SCHEMA_VERSION,
    profile: normalizeProfile(record.profile),
    settings: normalizeSettings(record.settings),
    masters,
    meta: normalizeMeta(record.meta),
    transactions,
    recurringRules,
    installmentPlans,
    trips,
    budgets,
    goals,
    entries: transactions,
    installments: installmentPlans,
  }
  return normalized
}

export function createEmptyFinanceData(): FinanceData {
  return normalizeFinanceData({
    schemaVersion: FINANCE_SCHEMA_VERSION,
    profile: {},
    settings: {},
    masters: { categories: LEGACY_CATEGORY_OPTIONS.map((category) => createLegacyMasterCategory(category)), tags: [] },
    transactions: [],
    recurringRules: [],
    installmentPlans: [],
    trips: [],
    budgets: [],
    goals: [],
    meta: {},
  })
}

export function withUpdatedMeta(data: FinanceData): FinanceData {
  const normalized = normalizeFinanceData(data)
  const now = currentIsoTimestamp()
  return {
    ...normalized,
    meta: {
      ...normalized.meta,
      createdAt: normalized.meta.createdAt || now,
      updatedAt: now,
    },
  }
}

export function createExportableFinanceData(data: FinanceData) {
  const normalized = normalizeFinanceData(data)
  return {
    schemaVersion: normalized.schemaVersion,
    profile: normalized.profile,
    settings: normalized.settings,
    masters: normalized.masters,
    meta: {
      ...normalized.meta,
      exportedAt: currentIsoTimestamp(),
    },
    transactions: normalized.transactions,
    recurringRules: normalized.recurringRules,
    installmentPlans: normalized.installmentPlans,
    trips: normalized.trips,
    budgets: normalized.budgets,
    goals: normalized.goals,
  }
}
