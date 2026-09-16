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
import { currentDateInputValue, currentIsoTimestamp, currentMonthInputValue, getMonthKey } from '../utils/formatters'
import { isViewId } from './viewSettings'

const validTransactionTypes = new Set<TransactionType>(['income', 'expense'])
const validTransactionStatuses = new Set<TransactionStatus>(['cleared', 'pending'])
const validInterestTypes = new Set<InterestType>(['none', 'flat', 'reducing'])
const validGoalStatuses = new Set<GoalStatus>(['active', 'paused', 'completed'])
const validCategoryKinds = new Set<CategoryKind>(['income', 'expense', 'mixed'])

type RawRecord = Record<string, unknown>
type KindHintMap = Map<string, Set<CategoryKind>>

export type FinanceMigrationConflict = {
  path: string
  fields: string[]
  message: string
}

export class FinanceMigrationConflictError extends Error {
  readonly conflicts: FinanceMigrationConflict[]

  constructor(conflicts: FinanceMigrationConflict[]) {
    const detail = conflicts
      .slice(0, 4)
      .map((conflict) => `${conflict.path}: ${conflict.message}`)
      .join(' · ')
    super(`ข้อมูลมี field aliases ที่ขัดแย้งกัน${detail ? ` (${detail})` : ''}`)
    this.name = 'FinanceMigrationConflictError'
    this.conflicts = conflicts
  }
}

export type TripMigrationIssue = {
  tripId: string
  itemId: string
  transactionId?: string
  code: 'duplicate-source' | 'field-mismatch' | 'orphan-transaction'
  message: string
  /** Values captured at reconciliation time so the report can be reviewed without guessing. */
  nestedItem?: TripMigrationSnapshot
  transaction?: TripMigrationSnapshot
}

export type TripMigrationSnapshot = {
  date: string
  categoryId: string
  title: string
  amount: number
  status: TransactionStatus
  note: string | null
  destination: string | null
  country: string | null
  installmentPlanId: string | null
}

export type TripMigrationReport = {
  createdTransactionIds: string[]
  reusedTransactionIds: string[]
  hydratedItemIds: string[]
  orphanTransactionIds: string[]
  issues: TripMigrationIssue[]
}

export type FinanceMigrationReport = {
  tripOwnership: TripMigrationReport
  money: {
    converted: boolean
    rounding: 'none'
    message: string
  }
}

function createEmptyTripMigrationReport(): TripMigrationReport {
  return {
    createdTransactionIds: [],
    reusedTransactionIds: [],
    hydratedItemIds: [],
    orphanTransactionIds: [],
    issues: [],
  }
}

function assertTripMigrationSafe(report: TripMigrationReport): void {
  const blockingIssues = report.issues.filter((issue) => issue.code !== 'orphan-transaction')
  if (blockingIssues.length) {
    throw new Error(`ไม่สามารถย้ายรายการทริปอัตโนมัติได้ ${blockingIssues.length} รายการ กรุณาตรวจ reconciliation report ก่อนบันทึก`)
  }
}

function isRecord(value: unknown): value is RawRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function readRecord(value: unknown): RawRecord {
  return isRecord(value) ? value : {}
}

function hasMeaningfulValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== ''
}

function canonicalComparable(value: unknown): unknown {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) return value.map(canonicalComparable)
  if (isRecord(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalComparable(value[key])]))
  return value
}

function valuesConflict(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonicalComparable(left)) !== JSON.stringify(canonicalComparable(right))
}

function collectFieldConflict(
  record: RawRecord,
  path: string,
  fields: string[],
  conflicts: FinanceMigrationConflict[],
  normalize?: (value: unknown) => unknown,
): void {
  const present = fields.filter((field) => hasMeaningfulValue(record[field]))
  if (present.length < 2) return
  const first = normalize ? normalize(record[present[0]]) : canonicalComparable(record[present[0]])
  if (present.slice(1).some((field) => {
    const next = normalize ? normalize(record[field]) : canonicalComparable(record[field])
    return valuesConflict(first, next)
  })) {
    conflicts.push({
      path,
      fields: present,
      message: `ค่า ${present.join(', ')} ไม่ตรงกัน; ต้องแก้ให้เหลือค่าที่สอดคล้องก่อนนำเข้า`,
    })
  }
}

function collectCollectionConflict(record: RawRecord, canonical: string, alias: string, conflicts: FinanceMigrationConflict[]): void {
  if (!Array.isArray(record[canonical]) || !Array.isArray(record[alias])) return
  if (valuesConflict(record[canonical], record[alias])) {
    conflicts.push({
      path: `$.${alias}`,
      fields: [canonical, alias],
      message: `collection ขัดแย้งกับ ${canonical}; ไม่เลือกชุดข้อมูลใดชุดหนึ่งโดยอัตโนมัติ`,
    })
  }
}

function collectMigrationConflicts(data: unknown): FinanceMigrationConflict[] {
  const record = readRecord(data)
  const conflicts: FinanceMigrationConflict[] = []
  collectCollectionConflict(record, 'transactions', 'entries', conflicts)
  collectCollectionConflict(record, 'installmentPlans', 'installments', conflicts)

  const inspect = (values: unknown, collection: string, checks: Array<{ fields: string[]; normalize?: (value: unknown) => unknown }>) => {
    asArray(values).forEach((value, index) => {
      const item = readRecord(value)
      checks.forEach(({ fields, normalize }) => collectFieldConflict(item, `$.${collection}[${index}]`, fields, conflicts, normalize))
    })
  }
  const normalizeCategory = (value: unknown) => normalizeCategoryId(value, '')
  inspect(record.transactions ?? record.entries, 'transactions', [
    { fields: ['categoryId', 'category'], normalize: normalizeCategory },
    { fields: ['installmentPlanId', 'installmentId'], normalize: (value) => readNullableString({ value }, 'value') },
  ])
  inspect(record.recurringRules, 'recurringRules', [
    { fields: ['categoryId', 'category'], normalize: normalizeCategory },
  ])
  inspect(record.installmentPlans ?? record.installments, 'installmentPlans', [
    { fields: ['categoryId', 'category'], normalize: normalizeCategory },
    { fields: ['monthlyAmount', 'paymentAmount'], normalize: (value) => readNumber({ value }, 'value', Number.NaN) },
    { fields: ['monthsTotal', 'totalMonths', 'installmentCount'], normalize: (value) => readNumber({ value }, 'value', Number.NaN) },
    { fields: ['dueDay', 'paymentDay'], normalize: (value) => value == null || value === '' ? null : Number(value) },
    { fields: ['principalAmount', 'principal'], normalize: (value) => readNumber({ value }, 'value', Number.NaN) },
  ])
  asArray(record.installmentPlans ?? record.installments).forEach((value, index) => {
    const plan = readRecord(value)
    if (Array.isArray(plan.paidMonthKeys)) {
      const keyCount = plan.paidMonthKeys.length
      const paidCountFields = ['monthsPaid', 'paidMonths']
      paidCountFields.forEach((field) => {
        if (!hasMeaningfulValue(plan[field])) return
        const count = Number(plan[field])
        // An explicit empty array is a supported legacy signal meaning that
        // no installments are paid, even when an old count says otherwise.
        if (keyCount > 0 && Number.isFinite(count) && count !== keyCount) {
          conflicts.push({
            path: `$.installmentPlans[${index}]`,
            fields: ['paidMonthKeys', field],
            message: `จำนวน ${field} ไม่ตรงกับ paidMonthKeys.length`,
          })
        }
      })
    }
    const snapshot = readRecord(plan.balanceSnapshot)
    if (hasMeaningfulValue(snapshot.amountMinor) && hasMeaningfulValue(plan.balanceSnapshotAmount)) {
      if (valuesConflict(snapshot.amountMinor, plan.balanceSnapshotAmount)) {
        conflicts.push({
          path: `$.installmentPlans[${index}]`,
          fields: ['balanceSnapshot.amountMinor', 'balanceSnapshotAmount'],
          message: 'ยอด snapshot ไม่ตรงกัน',
        })
      }
    }
  })
  inspect(record.budgets, 'budgets', [
    { fields: ['categoryId', 'category'], normalize: normalizeCategory },
  ])
  asArray(record.budgets).forEach((value, index) => {
    const budget = readRecord(value)
    if (budget.scope !== 'monthly' || !Array.isArray(budget.lines) || budget.lines.length === 0 || !hasMeaningfulValue(budget.amount)) return
    const amount = readNumber(budget, 'amount', Number.NaN)
    const lineTotal = budget.lines.reduce((sum, line) => sum + readNumber(readRecord(line), 'amount', 0), 0)
    if (Number.isFinite(amount) && Math.abs(amount - lineTotal) > 1e-9) {
      conflicts.push({
        path: `$.budgets[${index}]`,
        fields: ['amount', 'lines[].amount'],
        message: 'ยอดรวม monthly budget ไม่ตรงกับผลรวม lines',
      })
    }
  })
  inspect(record.goals, 'goals', [
    { fields: ['kind', 'type'], normalize: (value) => typeof value === 'string' ? value.trim() : value },
  ])
  asArray(record.trips).forEach((tripValue, tripIndex) => {
    const trip = readRecord(tripValue)
    inspect(trip.items, `trips[${tripIndex}].items`, [
      { fields: ['categoryId', 'category'], normalize: normalizeCategory },
      { fields: ['installmentPlanId', 'installmentId'], normalize: (value) => readNullableString({ value }, 'value') },
    ])
  })
  const rootVersion = record.schemaVersion
  const metaVersion = readRecord(record.meta).schemaVersion
  const settingsVersion = readRecord(record.settings).schemaVersion
  const versions = [rootVersion, metaVersion, settingsVersion]
    .filter(hasMeaningfulValue)
    .map((version) => typeof version === 'string' ? Number(version) : version)
  if (versions.length > 1 && versions.some((version) => valuesConflict(version, versions[0]))) {
    conflicts.push({
      path: '$.schemaVersion',
      fields: ['schemaVersion', 'meta.schemaVersion', 'settings.schemaVersion'],
      message: 'schemaVersion ใน envelope, meta และ settings ไม่ตรงกัน',
    })
  }
  return conflicts
}

export function getMigrationConflicts(data: unknown): FinanceMigrationConflict[] {
  return collectMigrationConflicts(data)
}

function assertNoMigrationConflicts(data: unknown): void {
  const conflicts = getMigrationConflicts(data)
  if (conflicts.length) throw new FinanceMigrationConflictError(conflicts)
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
  if (rawId) return rawId
  // Import validation rejects missing IDs. This deterministic fallback only
  // protects legacy in-memory callers and must never create a new ID on every
  // normalization pass.
  const source = JSON.stringify(canonicalComparable(Object.fromEntries(Object.entries(record).filter(([key]) => key !== 'id'))))
  let hash = 2166136261
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `${fallbackPrefix}-${(hash >>> 0).toString(36)}`
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

function normalizeMonth(value: unknown, fallback = currentMonthInputValue()): string {
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
  return isViewId(value) ? value : 'monthly'
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
    defaultView: normalizeDefaultView(settings.defaultView),
    // Keep an explicit zero. The setting is reserved until a calendar consumer
    // is implemented, but normalization must not silently change its value.
    monthStartsOn: Math.max(0, Math.min(6, Math.floor(readNumber(settings, 'monthStartsOn', 1)))),
    includePendingInMonthlyTotals: readBoolean(settings, 'includePendingInMonthlyTotals', true),
  }
}

function normalizeMeta(rawMeta: unknown, schemaVersion = FINANCE_SCHEMA_VERSION): FinanceMeta {
  const now = currentIsoTimestamp()
  const meta = readRecord(rawMeta)
  const revision = Math.max(0, Math.floor(readNumber(meta, 'revision', 0)))
  return {
    schemaVersion,
    createdAt: normalizeTimestamp(meta.createdAt, now),
    updatedAt: normalizeTimestamp(meta.updatedAt, now),
    exportedAt: typeof meta.exportedAt === 'string' && meta.exportedAt.trim() ? meta.exportedAt.trim() : null,
    revision,
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
  const travelDetails = readRecord(record.travelDetails)
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
    travelDetails: (travelDetails.destination || travelDetails.country)
      ? {
          destination: readNullableString(travelDetails, 'destination'),
          country: readNullableString(travelDetails, 'country'),
        }
      : null,
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
  const monthsTotal = Math.max(1, Math.floor(readNumber(record, 'installmentCount', readNumber(record, 'monthsTotal', readNumber(record, 'totalMonths', 1)))))
  const monthsPaid = Math.max(0, Math.min(monthsTotal, Math.floor(readNumber(record, 'monthsPaid', readNumber(record, 'paidMonths', 0)))))
  const category = normalizeCategoryId(record.categoryId ?? record.category, 'ผ่อนสินค้า')
  const hasPaidMonthKeys = Array.isArray(record.paidMonthKeys)
  const paidMonthKeys = hasPaidMonthKeys
    ? asArray(record.paidMonthKeys).filter((item): item is string => typeof item === 'string' && isValidMonth(item))
    : undefined
  const dueDay = record.dueDay ?? record.paymentDay
  const parsedDueDay = Number(dueDay)
  const normalizedDueDay = dueDay == null || dueDay === ''
    ? undefined
    : Number.isInteger(parsedDueDay) && parsedDueDay >= 1 && parsedDueDay <= 31
      ? parsedDueDay
      : undefined
  const balanceSnapshotRecord = readRecord(record.balanceSnapshot)
  const rawSnapshotAmount = record.balanceSnapshotAmount ?? balanceSnapshotRecord.amountMinor
  const rawSnapshotMonth = record.balanceSnapshotMonth ?? balanceSnapshotRecord.asOfMonth
  const remainingOverride = record.remainingOverride == null && balanceSnapshotRecord.basis === 'override'
    ? Math.max(0, readNumber({ value: rawSnapshotAmount }, 'value', 0))
    : record.remainingOverride == null
      ? undefined
      : Math.max(0, readNumber(record, 'remainingOverride', 0))
  const normalizedMonthsPaid = paidMonthKeys ? paidMonthKeys.length : monthsPaid
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
    monthsPaid: normalizedMonthsPaid,
    paidMonths: normalizedMonthsPaid,
    paidMonthKeys,
    startMonth: normalizeMonth(record.startMonth),
    dueDay: normalizedDueDay,
    paymentDay: normalizedDueDay ?? null,
    principal: Math.max(0, readNumber(record, 'principal', readNumber(record, 'principalAmount', monthlyAmount * monthsTotal))),
    principalAmount: Math.max(0, readNumber(record, 'principalAmount', readNumber(record, 'principal', monthlyAmount * monthsTotal))),
    remainingOverride,
    balanceSnapshotAmount: rawSnapshotAmount == null ? remainingOverride ?? null : Math.max(0, readNumber({ value: rawSnapshotAmount }, 'value', 0)),
    balanceSnapshotMonth: typeof rawSnapshotMonth === 'string' ? rawSnapshotMonth.trim() || null : null,
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
  const now = currentIsoTimestamp()
  const category = normalizeCategoryId(record.categoryId ?? record.category, 'ท่องเที่ยว')
  return {
    id: readId(record, 'trip-item'),
    date: normalizeDate(record.date),
    category,
    categoryId: category,
    title: readString(record, 'title') || readString(record, 'name') || 'รายการทริปนำเข้า',
    amount: Math.max(0, readNumber(record, 'amount', 0)),
    destination: readNullableString(record, 'destination') ?? undefined,
    country: readNullableString(record, 'country') ?? undefined,
    note: readNullableString(record, 'note') ?? undefined,
    installmentId: readNullableString(record, 'installmentId') ?? undefined,
    installmentPlanId: readNullableString(record, 'installmentPlanId') ?? readNullableString(record, 'installmentId'),
    isPaid: readBoolean(record, 'isPaid', true),
    createdAt: normalizeTimestamp(record.createdAt, now),
    updatedAt: normalizeTimestamp(record.updatedAt, now),
  }
}


function createTripItemFromTripTransaction(transaction: TransactionEntry): TripItem | null {
  const now = currentIsoTimestamp()
  if (!transaction.tripId) return null
  const looksLikeTripTransaction = transaction.sourceModule === 'trip' || transaction.id.startsWith('tx-trip-')
  if (!looksLikeTripTransaction || transaction.type !== 'expense') return null
  const travelDetails = transaction.travelDetails ?? {}
  return {
    id: transaction.sourceRefId || transaction.id,
    date: normalizeDate(transaction.date),
    category: normalizeCategoryId(transaction.categoryId ?? transaction.category, 'ท่องเที่ยว'),
    categoryId: normalizeCategoryId(transaction.categoryId ?? transaction.category, 'ท่องเที่ยว'),
    title: transaction.title || 'รายการทริปนำเข้า',
    amount: Math.max(0, Number(transaction.amount || 0)),
    destination: travelDetails.destination ?? undefined,
    country: travelDetails.country ?? undefined,
    note: transaction.note,
    installmentId: transaction.installmentPlanId ?? transaction.installmentId ?? undefined,
    installmentPlanId: transaction.installmentPlanId ?? transaction.installmentId ?? null,
    isPaid: transaction.status !== 'pending',
    createdAt: normalizeTimestamp(transaction.createdAt, now),
    updatedAt: normalizeTimestamp(transaction.updatedAt, now),
  }
}

function extractTripNameFromTransactionNote(note: string | undefined): string {
  const cleaned = String(note ?? '').trim()
  const match = cleaned.match(/^Imported from trip\.json:\s*(.+)$/i)
  return match?.[1]?.trim() || 'ทริปนำเข้า'
}

function tripSourceKey(tripId: string, itemId: string): string {
  return `${tripId}:${itemId}`
}

function isTripOwnedTransaction(transaction: TransactionEntry): boolean {
  return Boolean(transaction.tripId)
    && transaction.type === 'expense'
    && (transaction.sourceModule === 'trip' || transaction.id.startsWith('tx-trip-'))
}

function createTripTransactionFromItem(trip: Trip, item: TripItem): TransactionEntry {
  const now = currentIsoTimestamp()
  const date = normalizeDate(item.date, trip.startDate)
  const categoryId = normalizeCategoryId(item.categoryId ?? item.category, 'ท่องเที่ยว')
  const installmentPlanId = item.installmentPlanId ?? item.installmentId ?? null
  return {
    id: `tx-trip-${trip.id}-${item.id}`,
    type: 'expense',
    date,
    monthKey: getMonthKey(date),
    category: categoryId,
    categoryId,
    title: item.title || 'รายการทริปนำเข้า',
    amount: Math.max(0, Number(item.amount || 0)),
    currency: 'THB',
    note: item.note,
    status: item.isPaid === false ? 'pending' : 'cleared',
    source: 'import',
    sourceModule: 'trip',
    sourceRefId: item.id,
    tripId: trip.id,
    installmentId: installmentPlanId ?? undefined,
    installmentPlanId,
    recurringRuleId: null,
    goalId: null,
    travelDetails: {
      destination: item.destination ?? null,
      country: item.country ?? null,
    },
    createdAt: item.createdAt ?? trip.createdAt ?? now,
    updatedAt: item.updatedAt ?? trip.updatedAt ?? now,
  }
}

function createTripItemSnapshot(item: TripItem): TripMigrationSnapshot {
  return {
    date: normalizeDate(item.date),
    categoryId: normalizeCategoryId(item.categoryId ?? item.category, 'ท่องเที่ยว'),
    title: item.title,
    amount: Math.max(0, Number(item.amount || 0)),
    status: item.isPaid === false ? 'pending' : 'cleared',
    note: item.note ?? null,
    destination: item.destination ?? null,
    country: item.country ?? null,
    installmentPlanId: item.installmentPlanId ?? item.installmentId ?? null,
  }
}

function createTripTransactionSnapshot(transaction: TransactionEntry): TripMigrationSnapshot {
  const travelDetails = transaction.travelDetails ?? {}
  return {
    date: normalizeDate(transaction.date),
    categoryId: normalizeCategoryId(transaction.categoryId ?? transaction.category, 'ท่องเที่ยว'),
    title: transaction.title,
    amount: Math.max(0, Number(transaction.amount || 0)),
    status: transaction.status,
    note: transaction.note ?? null,
    destination: travelDetails.destination ?? null,
    country: travelDetails.country ?? null,
    installmentPlanId: transaction.installmentPlanId ?? transaction.installmentId ?? null,
  }
}

function tripItemMatchesTransaction(item: TripItem, transaction: TransactionEntry): boolean {
  const itemCategoryId = normalizeCategoryId(item.categoryId ?? item.category, 'ท่องเที่ยว')
  const transactionCategoryId = normalizeCategoryId(transaction.categoryId ?? transaction.category, 'ท่องเที่ยว')
  const travelDetails = transaction.travelDetails ?? {}
  const optionalFieldMatches = (left: unknown, right: unknown): boolean => {
    // Legacy derived trip rows did not persist note/travel metadata. Missing
    // optional values are therefore compatible; core cashflow fields below
    // still require an exact match before a migration can proceed.
    if (!hasMeaningfulValue(left) || !hasMeaningfulValue(right)) return true
    return valuesConflict(left, right) === false
  }
  return normalizeDate(item.date) === normalizeDate(transaction.date)
    && itemCategoryId === transactionCategoryId
    && item.title === transaction.title
    && Math.abs(Number(item.amount || 0) - Number(transaction.amount || 0)) < 1e-9
    && (item.isPaid === false ? 'pending' : 'cleared') === transaction.status
    && optionalFieldMatches(item.note, transaction.note)
    && optionalFieldMatches(item.destination, travelDetails.destination)
    && optionalFieldMatches(item.country, travelDetails.country)
    && optionalFieldMatches(
      item.installmentPlanId ?? item.installmentId,
      transaction.installmentPlanId ?? transaction.installmentId,
    )
}

function enrichTripTransactionFromItem(transaction: TransactionEntry, item: TripItem): TransactionEntry {
  const existingTravelDetails = transaction.travelDetails ?? {}
  const destination = existingTravelDetails.destination ?? item.destination ?? null
  const country = existingTravelDetails.country ?? item.country ?? null
  const travelDetails = destination || country
    ? { destination, country }
    : transaction.travelDetails ?? null
  const installmentPlanId = transaction.installmentPlanId ?? item.installmentPlanId ?? item.installmentId ?? null
  return {
    ...transaction,
    note: transaction.note ?? item.note,
    travelDetails,
    installmentId: transaction.installmentId ?? item.installmentId ?? item.installmentPlanId ?? undefined,
    installmentPlanId,
  }
}

function materializeTripTransactions(
  trips: Trip[],
  transactions: TransactionEntry[],
  report: TripMigrationReport,
): TransactionEntry[] {
  const tripIds = new Set(trips.map((trip) => trip.id))
  const bySource = new Map<string, TransactionEntry[]>()
  transactions.forEach((transaction) => {
    if (!isTripOwnedTransaction(transaction) || !transaction.tripId) return
    const sourceId = transaction.sourceRefId || transaction.id
    const key = tripSourceKey(transaction.tripId, sourceId)
    bySource.set(key, [...(bySource.get(key) ?? []), transaction])
    if (!tripIds.has(transaction.tripId)) {
      report.orphanTransactionIds.push(transaction.id)
      report.issues.push({
        tripId: transaction.tripId,
        itemId: sourceId,
        transactionId: transaction.id,
        code: 'orphan-transaction',
        message: 'transaction อ้างอิงทริปที่ไม่มีอยู่ในชุดข้อมูล',
      })
    }
  })

  const nextTransactions = [...transactions]
  const nestedSourceKeys = new Set<string>()
  const materializedBySource = new Map<string, string>()
  trips.forEach((trip) => {
    trip.items.forEach((item) => {
      const key = tripSourceKey(trip.id, item.id)
      if (nestedSourceKeys.has(key)) {
        report.issues.push({
          tripId: trip.id,
          itemId: item.id,
          transactionId: materializedBySource.get(key),
          code: 'duplicate-source',
          message: 'มี nested trip item มากกว่าหนึ่งรายการสำหรับ source เดียวกัน',
        })
        return
      }
      nestedSourceKeys.add(key)
      const matches = bySource.get(key) ?? []
      if (matches.length > 1) {
        report.issues.push({
          tripId: trip.id,
          itemId: item.id,
          transactionId: matches[0]?.id,
          code: 'duplicate-source',
          message: 'มี transaction มากกว่าหนึ่งรายการสำหรับ trip item เดียวกัน',
        })
      }
      const existing = matches[0]
      if (existing) {
        report.reusedTransactionIds.push(existing.id)
        materializedBySource.set(key, existing.id)
        report.hydratedItemIds.push(item.id)
        const enrichedExisting = enrichTripTransactionFromItem(existing, item)
        const existingIndex = nextTransactions.findIndex((transaction) => transaction.id === existing.id)
        if (existingIndex >= 0) nextTransactions[existingIndex] = enrichedExisting
        if (!tripItemMatchesTransaction(item, enrichedExisting)) {
          report.issues.push({
            tripId: trip.id,
            itemId: item.id,
            transactionId: existing.id,
            code: 'field-mismatch',
            message: 'ข้อมูล nested trip item ไม่ตรงกับ transaction เจ้าของ; ใช้ transaction เป็น source หลัก',
            nestedItem: createTripItemSnapshot(item),
            transaction: createTripTransactionSnapshot(enrichedExisting),
          })
        }
        return
      }
      const created = createTripTransactionFromItem(trip, item)
      nextTransactions.push(created)
      report.createdTransactionIds.push(created.id)
      materializedBySource.set(key, created.id)
      report.hydratedItemIds.push(item.id)
    })
  })
  return nextTransactions
}

function hydrateTripsFromTripTransactions(
  trips: Trip[],
  transactions: TransactionEntry[],
  report?: TripMigrationReport,
): Trip[] {
  const tripMap = new Map<string, Trip>()
  trips.forEach((trip) => tripMap.set(trip.id, { ...trip, items: [...trip.items] }))

  const itemsByTripId = new Map<string, TripItem[]>()
  const transactionByTripId = new Map<string, TransactionEntry[]>()

  transactions.forEach((transaction) => {
    if (!transaction.tripId) return
    const tripItem = createTripItemFromTripTransaction(transaction)
    if (!tripItem) return
    if (report && !report.hydratedItemIds.includes(tripItem.id)) report.hydratedItemIds.push(tripItem.id)
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
    const transactionItemIds = new Set(items.map((item) => item.id))
    const mergedItems = [
      ...existingItems.filter((item) => !transactionItemIds.has(item.id)),
      ...items,
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
    alertThresholds: asArray(record.alertThresholds)
      .map(Number)
      .filter((threshold) => Number.isFinite(threshold) && threshold >= 0 && threshold <= 1)
      .slice(0, 2),
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

function splitMonthlyBudgetLines(budgets: Budget[]): Budget[] {
  return budgets.flatMap((budget) => {
    if (budget.scope !== 'monthly' || !budget.lines || budget.lines.length <= 1) return [budget]
    return budget.lines.map((line, index) => ({
      ...budget,
      id: index === 0 ? budget.id : `${budget.id}--${line.id}`,
      category: line.categoryId,
      categoryId: line.categoryId,
      amount: line.amount,
      lines: [{ ...line }],
    }))
  })
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
  const schemaVersion = record.schemaVersion ?? readRecord(record.meta).schemaVersion ?? readRecord(record.settings).schemaVersion
  const parsed = typeof schemaVersion === 'number' ? schemaVersion : typeof schemaVersion === 'string' ? Number(schemaVersion) : Number.NaN
  return Number.isFinite(parsed) ? parsed : null
}

export function assertSupportedFinanceDataSchema(data: unknown): void {
  const schemaVersion = getDataSchemaVersion(data)
  if (schemaVersion !== null && (!Number.isInteger(schemaVersion) || schemaVersion < 1 || schemaVersion > FINANCE_SCHEMA_VERSION)) {
    throw new Error(schemaVersion > FINANCE_SCHEMA_VERSION
      ? `ยังไม่รองรับ schema v${schemaVersion}`
      : `ไม่รองรับ schema v${schemaVersion}`)
  }
}

export function normalizeFinanceData(data: unknown): FinanceData {
  assertNoMigrationConflicts(data)
  assertSupportedFinanceDataSchema(data)
  const record = readRecord(data)
  const transactions = asArray(record.transactions ?? record.entries).map(normalizeTransaction)
  const recurringRules = asArray(record.recurringRules).map(normalizeRecurringRule)
  const installmentPlans = asArray(record.installmentPlans ?? record.installments).map(normalizeInstallmentPlan)
  // Legacy trip transactions are hydrated by `migrateFinanceData` at an
  // import/load boundary. Runtime normalization must stay side-effect free:
  // otherwise deleting a trip or item would recreate it on the next mutation.
  const trips = asArray(record.trips).map(normalizeTrip)
  const budgets = asArray(record.budgets).map(normalizeBudget)
  const goals = asArray(record.goals).map(normalizeGoal)
  const masters = createDefaultMasters(record.masters, { transactions, recurringRules, installmentPlans, trips, budgets, goals })
  const normalized: FinanceData = {
    schemaVersion: FINANCE_SCHEMA_VERSION,
    profile: normalizeProfile(record.profile),
    settings: normalizeSettings(record.settings),
    masters,
    meta: normalizeMeta(record.meta, FINANCE_SCHEMA_VERSION),
    transactions,
    recurringRules,
    installmentPlans,
    trips,
    budgets,
    goals,
  }
  return normalized
}

/**
 * Apply one-time compatibility transforms before data enters the runtime
 * store. This is deliberately separate from normalizeFinanceData so every
 * CRUD mutation cannot re-hydrate deleted legacy entities.
 */
export function migrateFinanceDataWithReport(data: unknown): { data: FinanceData; report: FinanceMigrationReport } {
  assertNoMigrationConflicts(data)
  const schemaVersion = getDataSchemaVersion(data)
  assertSupportedFinanceDataSchema(data)

  // Keep the dispatch explicit even while v1 and v2 share the same
  // compatibility transforms. Future schema versions must never be silently
  // downgraded by the normalizer.
  switch (schemaVersion) {
    case null:
    case 1:
    case FINANCE_SCHEMA_VERSION: {
      const normalized = normalizeFinanceData(data)
      const tripOwnership = createEmptyTripMigrationReport()
      const transactions = materializeTripTransactions(normalized.trips, normalized.transactions, tripOwnership)
      const migratedTrips = hydrateTripsFromTripTransactions(normalized.trips, transactions, tripOwnership)
      return {
        data: {
          ...normalized,
          transactions,
          budgets: splitMonthlyBudgetLines(normalized.budgets),
          trips: migratedTrips,
        },
        report: {
          tripOwnership,
          money: {
            converted: false,
            rounding: 'none',
            message: 'PR-10 เพิ่ม safe minor-unit utilities แต่ยังไม่เปลี่ยนหน่วยเงินของข้อมูลเดิมจนกว่า money release จะผ่าน dry-run',
          },
        },
      }
    }
    default:
      throw new Error(`ไม่รองรับ schema v${schemaVersion}`)
  }
}

export function migrateFinanceData(data: unknown): FinanceData {
  const migration = migrateFinanceDataWithReport(data)
  assertTripMigrationSafe(migration.report.tripOwnership)
  return migration.data
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
  const now = currentIsoTimestamp()
  return {
    ...data,
    meta: {
      ...data.meta,
      createdAt: data.meta.createdAt || now,
      updatedAt: now,
    },
  }
}

function serializeTransaction(transaction: TransactionEntry) {
  return {
    id: transaction.id,
    type: transaction.type,
    date: transaction.date,
    categoryId: transaction.categoryId ?? normalizeCategoryId(transaction.category, 'อื่นๆ'),
    title: transaction.title,
    amount: transaction.amount,
    currency: transaction.currency,
    note: transaction.note,
    status: transaction.status,
    source: transaction.source,
    sourceModule: transaction.sourceModule,
    sourceRefId: transaction.sourceRefId,
    tripId: transaction.tripId,
    installmentPlanId: transaction.installmentPlanId ?? transaction.installmentId ?? null,
    recurringRuleId: transaction.recurringRuleId,
    goalId: transaction.goalId,
    travelDetails: transaction.travelDetails,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  }
}

function serializeRecurringRule(rule: RecurringRule) {
  return {
    id: rule.id,
    isActive: rule.isActive,
    type: rule.type,
    title: rule.title,
    categoryId: rule.categoryId ?? normalizeCategoryId(rule.category, 'อื่นๆ'),
    amount: rule.amount,
    currency: rule.currency,
    cadence: rule.cadence,
    interval: rule.interval,
    dayOfMonth: rule.dayOfMonth,
    startDate: rule.startDate,
    endDate: rule.endDate,
    note: rule.note,
    tripId: rule.tripId,
    goalId: rule.goalId,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  }
}

function serializeInstallmentPlan(plan: InstallmentPlan) {
  const paidMonthKeys = plan.paidMonthKeys ?? []
  const installmentCount = plan.installmentCount ?? plan.monthsTotal ?? plan.totalMonths ?? 1
  const principalAmount = plan.principalAmount ?? plan.principal ?? plan.monthlyAmount * installmentCount
  const balanceAmount = plan.balanceSnapshotAmount ?? plan.remainingOverride ?? null
  const balanceMonth = plan.balanceSnapshotMonth ?? null
  const snapshotBasis: 'override' | 'reported' = plan.remainingOverride != null ? 'override' : 'reported'
  const balanceSnapshot = balanceAmount === null && balanceMonth === null
    ? null
    : { amountMinor: Math.max(0, Number(balanceAmount ?? 0)), asOfMonth: balanceMonth, basis: snapshotBasis }
  return {
    id: plan.id,
    name: plan.name,
    categoryId: plan.categoryId ?? normalizeCategoryId(plan.category, 'ผ่อนสินค้า'),
    monthlyAmount: plan.monthlyAmount,
    installmentCount,
    paidMonthKeys,
    startMonth: plan.startMonth,
    dueDay: plan.dueDay ?? plan.paymentDay ?? null,
    principalAmount,
    balanceSnapshot,
    interestType: plan.interestType,
    interestRate: plan.interestRate ?? null,
    interestNote: plan.interestNote ?? null,
    note: plan.note ?? null,
    tripId: plan.tripId ?? null,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  }
}

function serializeTrip(trip: Trip) {
  return {
    id: trip.id,
    name: trip.name,
    destination: trip.destination,
    budget: trip.budget,
    startDate: trip.startDate,
    endDate: trip.endDate,
    note: trip.note,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt,
  }
}

function serializeBudget(budget: Budget) {
  return {
    id: budget.id,
    scope: budget.scope,
    name: budget.name,
    month: budget.month,
    tripId: budget.tripId,
    categoryId: budget.categoryId ?? normalizeCategoryId(budget.category, budget.scope === 'trip' ? 'ท่องเที่ยว' : 'อื่นๆ'),
    amount: budget.amount,
    lines: budget.lines?.map((line) => ({
      id: line.id,
      categoryId: line.categoryId,
      amount: line.amount,
      note: line.note,
    })),
    alertThresholds: budget.alertThresholds,
    enabled: budget.enabled,
    note: budget.note,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
  }
}

function serializeGoal(goal: Goal) {
  return {
    id: goal.id,
    name: goal.name,
    kind: goal.kind ?? goal.type ?? 'savings',
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    targetDate: goal.targetDate,
    linkedCategoryId: goal.linkedCategoryId,
    status: goal.status,
    note: goal.note,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  }
}

function createSerializedFinanceData(
  normalized: FinanceData,
  transactions: TransactionEntry[],
  budgets: Budget[],
) {
  return {
    schemaVersion: normalized.schemaVersion,
    profile: normalized.profile,
    settings: {
      baseCurrency: normalized.settings.baseCurrency,
      locale: normalized.settings.locale,
      timezone: normalized.settings.timezone,
      defaultView: normalized.settings.defaultView,
      monthStartsOn: normalized.settings.monthStartsOn,
      includePendingInMonthlyTotals: normalized.settings.includePendingInMonthlyTotals,
    },
    masters: normalized.masters,
    meta: {
      ...normalized.meta,
      schemaVersion: normalized.schemaVersion,
      exportedAt: currentIsoTimestamp(),
    },
    transactions: transactions.map(serializeTransaction),
    recurringRules: normalized.recurringRules.map(serializeRecurringRule),
    installmentPlans: normalized.installmentPlans.map(serializeInstallmentPlan),
    trips: normalized.trips.map(serializeTrip),
    budgets: budgets.map(serializeBudget),
    goals: normalized.goals.map(serializeGoal),
  }
}

export function createExportableFinanceData(data: FinanceData) {
  assertNoMigrationConflicts(data)
  const normalized = normalizeFinanceData(data)
  const exportTripReport = createEmptyTripMigrationReport()
  const transactions = materializeTripTransactions(normalized.trips, normalized.transactions, exportTripReport)
  assertTripMigrationSafe(exportTripReport)
  const budgets = splitMonthlyBudgetLines(normalized.budgets)
  return createSerializedFinanceData(normalized, transactions, budgets)
}

/**
 * Serialize a baseline using the document identities that were read from
 * Firestore. Unlike an export, this must not materialize trip transactions or
 * split legacy multi-line budget documents before changed-write planning.
 */
export function createPersistedFinanceData(data: FinanceData) {
  const normalized = normalizeFinanceData(data)
  return createSerializedFinanceData(normalized, normalized.transactions, normalized.budgets)
}
