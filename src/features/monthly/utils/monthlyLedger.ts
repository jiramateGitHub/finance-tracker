import { getCanonicalCategoryOptions, normalizeCategoryId } from '../../../data/categories'
import { createId } from '../../../lib/id'
import type { FinanceData, InstallmentPlan, TransactionEntry, TransactionStatus, TransactionType } from '../../../types/finance'
import { th } from '../../../i18n/th'
import { currentDateInputValue, currentIsoTimestamp, currentMonthInputValue, getMonthKey, parseAmountSafe, addMonths } from '../../../utils/formatters'
import { deriveInstallmentTransactionsForMonths } from '../../installments/utils/installmentPlans'
import { deriveTripTransactionsForMonths } from '../../trips/utils/tripUtils'
import { parseMonthlySmartKeyword } from './monthlySmartFilter'

export type MonthlySortOrder = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'title-asc'
export type MonthlyTypeFilter = 'all' | 'income' | 'expense' | 'installment' | 'trip'
export type MonthlyStatusFilter = 'all' | 'paid' | 'unpaid'

export type MonthlyFilters = {
  month?: string
  rangeStartMonth: string
  rangeEndMonth: string
  keyword: string
  sortOrder: MonthlySortOrder
  category: string
  type: MonthlyTypeFilter
  status: MonthlyStatusFilter
  minAmount: string
  maxAmount: string
}

export type TransactionFormValues = {
  id?: string
  type: TransactionType
  date: string
  category: string
  title: string
  amount: string
  status: TransactionStatus
  note: string
  sourceModule: string
  repeatEnabled: boolean
  repeatCount: string
}

export type MonthlyGroup = {
  monthKey: string
  transactions: TransactionEntry[]
  totals: MonthlyTotals
}

export type MonthlyTotals = {
  income: number
  expense: number
  balance: number
  pendingExpense: number
  count: number
}

export type LedgerRange = {
  startMonth?: string
  endMonth?: string
}

type LedgerSourceData = Pick<FinanceData, 'transactions' | 'installmentPlans' | 'trips'>

export function createEmptyMonthlyFilters(month = currentMonthInputValue()): MonthlyFilters {
  return {
    rangeStartMonth: month,
    rangeEndMonth: month,
    keyword: '',
    sortOrder: 'date-desc',
    category: '',
    type: 'all',
    status: 'all',
    minAmount: '',
    maxAmount: '',
  }
}

export function normalizeMonthlyFilters(filters: MonthlyFilters): Required<MonthlyFilters> {
  const fallbackMonth = filters.month || currentMonthInputValue()
  return {
    ...filters,
    month: fallbackMonth,
    rangeStartMonth: filters.rangeStartMonth || fallbackMonth,
    rangeEndMonth: filters.rangeEndMonth || fallbackMonth,
    keyword: filters.keyword ?? '',
    sortOrder: filters.sortOrder ?? 'date-desc',
    category: filters.category ?? '',
    type: filters.type ?? 'all',
    status: filters.status ?? 'all',
    minAmount: filters.minAmount ?? '',
    maxAmount: filters.maxAmount ?? '',
  }
}

export function normalizeMonthRange(startMonth: string, endMonth: string): [string, string] {
  if (startMonth && endMonth && startMonth > endMonth) return [endMonth, startMonth]
  return [startMonth, endMonth]
}

/** Resolve form and smart-keyword month filters before deriving ledger rows. */
export function resolveMonthlyFilterRange(filters: MonthlyFilters): [string, string] {
  const normalizedFilters = normalizeMonthlyFilters(filters)
  const smartFilter = parseMonthlySmartKeyword(normalizedFilters.keyword)
  if (smartFilter.monthOffset === undefined) {
    return normalizeMonthRange(normalizedFilters.rangeStartMonth, normalizedFilters.rangeEndMonth)
  }
  const effectiveMonth = addMonthsToMonthKey(currentMonthInputValue(), smartFilter.monthOffset)
  return [effectiveMonth, effectiveMonth]
}

export const addMonthsToMonthKey = addMonths

export function getMonthKeysInRange(startMonth: string, endMonth: string): string[] {
  const [start, end] = normalizeMonthRange(startMonth, endMonth)
  if (!start || !end) return []
  const months: string[] = []
  for (let cursor = start; cursor <= end; cursor = addMonthsToMonthKey(cursor, 1)) {
    months.push(cursor)
  }
  return months
}

export function createTransactionFormValues(transaction?: TransactionEntry, defaults?: Partial<TransactionFormValues>): TransactionFormValues {
  return {
    id: transaction?.id,
    type: transaction?.type ?? defaults?.type ?? 'expense',
    date: transaction?.date ?? defaults?.date ?? currentDateInputValue(),
    category: normalizeCategoryId(transaction?.categoryId || transaction?.category || defaults?.category || '', ''),
    title: transaction?.title ?? defaults?.title ?? '',
    amount: transaction?.amount ? String(transaction.amount) : defaults?.amount ?? '',
    status: transaction?.status ?? defaults?.status ?? 'cleared',
    note: transaction?.note ?? defaults?.note ?? '',
    sourceModule: transaction?.sourceModule ?? defaults?.sourceModule ?? 'manual',
    repeatEnabled: defaults?.repeatEnabled ?? false,
    repeatCount: defaults?.repeatCount ?? '1',
  }
}

export function isInstallmentTransaction(transaction: TransactionEntry): boolean {
  return Boolean(
    transaction.installmentId
      || transaction.installmentPlanId
      || transaction.source === 'installment'
      || transaction.sourceModule === 'installment',
  )
}

function isTripOwnedTransaction(transaction: TransactionEntry): boolean {
  return transaction.sourceModule === 'trip' || transaction.id.startsWith('tx-trip-')
}

export function isManualTransaction(transaction: TransactionEntry): boolean {
  return !isInstallmentTransaction(transaction) && !isTripOwnedTransaction(transaction)
}

export function isTripTransaction(transaction: TransactionEntry): boolean {
  return Boolean(transaction.tripId || transaction.sourceModule === 'trip')
}

/**
 * Return stored transactions that belong in the cashflow ledger.
 * Installment rows are derived from plans; all other persisted rows,
 * including manual transactions linked to a trip, remain visible.
 */
export function selectPersistedLedgerTransactions(
  transactions: TransactionEntry[],
  installmentPlans?: InstallmentPlan[],
): TransactionEntry[] {
  if (!installmentPlans) return transactions.filter((transaction) => !isInstallmentTransaction(transaction))
  const knownPlanIds = new Set(installmentPlans.map((plan) => plan.id))
  return transactions.filter((transaction) => {
    if (!isInstallmentTransaction(transaction)) return true
    const references = [transaction.installmentPlanId, transaction.installmentId, transaction.sourceRefId]
      .filter((value): value is string => Boolean(value))
    // Keep orphan/ambiguous installment rows visible. Only suppress a stored
    // row when it clearly maps to a plan that will be derived below.
    return !references.some((reference) => knownPlanIds.has(reference))
  })
}

function monthInRange(monthKey: string, startMonth: string, endMonth: string): boolean {
  return (!startMonth || monthKey >= startMonth) && (!endMonth || monthKey <= endMonth)
}

/**
 * Build the cashflow ledger for a bounded month range.
 *
 * Persisted transactions are the source of truth for manual and linked
 * records. Installment and trip rows are derived only for the requested
 * months, so Monthly and Yearly cannot drift by constructing different
 * subsets. Trip-cost recognition remains a separate policy for a later PR.
 */
export function selectLedgerTransactionsForRange(
  data: LedgerSourceData,
  range: LedgerRange = {},
): TransactionEntry[] {
  const [startMonth, endMonth] = normalizeMonthRange(range.startMonth ?? '', range.endMonth ?? '')
  const hasBound = Boolean(startMonth || endMonth)
  const rangeMonths = getMonthKeysInRange(startMonth, endMonth)
  const persistedTransactions = selectPersistedLedgerTransactions(data.transactions, data.installmentPlans)
    .filter((transaction) => !hasBound || monthInRange(getMonthKey(transaction.date), startMonth, endMonth))

  return [
    ...persistedTransactions,
    ...deriveInstallmentTransactionsForMonths(data.installmentPlans, rangeMonths),
    ...deriveTripTransactionsForMonths(data.trips, rangeMonths, data.transactions),
  ]
}

export type MemoizedLedgerSelector = {
  (data: LedgerSourceData, range?: LedgerRange): TransactionEntry[]
  getStats: () => { computations: number }
}

/**
 * Memoize the shared ledger selector by the collection references and the
 * effective range. Commands preserve untouched collection references, so a
 * component re-render caused by unrelated state can reuse the same read model.
 */
export function createMemoizedLedgerSelector(): MemoizedLedgerSelector {
  let previousTransactions: TransactionEntry[] | undefined
  let previousInstallmentPlans: InstallmentPlan[] | undefined
  let previousTrips: FinanceData['trips'] | undefined
  let previousStartMonth = ''
  let previousEndMonth = ''
  let previousResult: TransactionEntry[] | undefined
  let computations = 0

  const select = ((data: LedgerSourceData, range: LedgerRange = {}): TransactionEntry[] => {
    const [startMonth, endMonth] = normalizeMonthRange(range.startMonth ?? '', range.endMonth ?? '')
    if (
      previousResult
      && previousTransactions === data.transactions
      && previousInstallmentPlans === data.installmentPlans
      && previousTrips === data.trips
      && previousStartMonth === startMonth
      && previousEndMonth === endMonth
    ) {
      return previousResult
    }
    previousTransactions = data.transactions
    previousInstallmentPlans = data.installmentPlans
    previousTrips = data.trips
    previousStartMonth = startMonth
    previousEndMonth = endMonth
    computations += 1
    previousResult = selectLedgerTransactionsForRange(data, { startMonth, endMonth })
    return previousResult
  }) as MemoizedLedgerSelector
  select.getStats = () => ({ computations })
  return select
}

export function getPaymentLabel(transaction: TransactionEntry): string {
  if (transaction.type === 'income') return th.transaction.paid
  return transaction.status === 'pending' ? th.transaction.unpaid : th.transaction.paid
}

export function getSourceLabel(transaction: TransactionEntry): string {
  if (isInstallmentTransaction(transaction)) return th.transaction.installment
  if (transaction.tripId || transaction.sourceModule === 'trip') return th.transaction.trip
  return th.transaction.manual
}

export function calculateMonthlyTotals(
  transactions: TransactionEntry[],
  options: { includePending?: boolean } = {},
): MonthlyTotals {
  const includePending = options.includePending ?? true
  return transactions.reduce<MonthlyTotals>(
    (totals, transaction) => {
      if (transaction.type === 'income') {
        totals.income += transaction.amount
      } else {
        if (transaction.status === 'pending') totals.pendingExpense += transaction.amount
        if (includePending || transaction.status !== 'pending') totals.expense += transaction.amount
      }
      totals.balance = totals.income - totals.expense
      totals.count += 1
      return totals
    },
    { income: 0, expense: 0, balance: 0, pendingExpense: 0, count: 0 },
  )
}

export function filterMonthlyTransactions(transactions: TransactionEntry[], filters: MonthlyFilters): TransactionEntry[] {
  const normalizedFilters = normalizeMonthlyFilters(filters)
  const smartFilter = parseMonthlySmartKeyword(normalizedFilters.keyword)
  const keyword = smartFilter.text.trim().toLocaleLowerCase('th-TH')
  const category = normalizeCategoryId(normalizedFilters.category, '')
  const [rangeStart, rangeEnd] = resolveMonthlyFilterRange(normalizedFilters)
  const minAmount = smartFilter.minAmount ?? (normalizedFilters.minAmount ? parseAmountSafe(normalizedFilters.minAmount, Number.NaN) : Number.NaN)
  const maxAmount = smartFilter.maxAmount ?? (normalizedFilters.maxAmount ? parseAmountSafe(normalizedFilters.maxAmount, Number.NaN) : Number.NaN)
  return transactions
    .filter((transaction) => {
      const monthKey = getMonthKey(transaction.date)
      return (!rangeStart || monthKey >= rangeStart) && (!rangeEnd || monthKey <= rangeEnd)
    })
    .filter((transaction) => {
      const type = smartFilter.type ?? normalizedFilters.type
      if (type === 'all') return true
      if (type === 'installment') return isInstallmentTransaction(transaction)
      if (type === 'trip') return isTripTransaction(transaction)
      return transaction.type === type && !isInstallmentTransaction(transaction) && !isTripOwnedTransaction(transaction)
    })
    .filter((transaction) => {
      const status = smartFilter.status ?? normalizedFilters.status
      if (status === 'all') return true
      if (status === 'paid') return transaction.status === 'cleared'
      return transaction.type === 'expense' && transaction.status === 'pending'
    })
    .filter((transaction) => !category || normalizeCategoryId(transaction.categoryId || transaction.category, '') === category)
    .filter((transaction) => !Number.isFinite(minAmount) || (smartFilter.minInclusive === false ? transaction.amount > minAmount : transaction.amount >= minAmount))
    .filter((transaction) => !Number.isFinite(maxAmount) || (smartFilter.maxInclusive === false ? transaction.amount < maxAmount : transaction.amount <= maxAmount))
    .filter((transaction) => smartFilter.exactAmount === undefined || transaction.amount === smartFilter.exactAmount)
    .filter((transaction) => {
      if (!keyword) return true
      return [
        transaction.title,
        transaction.category,
        transaction.note,
        transaction.sourceModule,
        transaction.source,
      ].some((value) => String(value ?? '').toLocaleLowerCase().includes(keyword))
    })
    .sort((a, b) => sortMonthlyTransactions(a, b, normalizedFilters.sortOrder))
}

function sortMonthlyTransactions(a: TransactionEntry, b: TransactionEntry, sortOrder: MonthlySortOrder): number {
  if (sortOrder === 'date-asc') return String(a.date).localeCompare(String(b.date)) || String(a.title).localeCompare(String(b.title), 'th-TH')
  if (sortOrder === 'amount-desc') return b.amount - a.amount || String(b.date).localeCompare(String(a.date))
  if (sortOrder === 'amount-asc') return a.amount - b.amount || String(b.date).localeCompare(String(a.date))
  if (sortOrder === 'title-asc') return String(a.title).localeCompare(String(b.title), 'th-TH') || String(b.date).localeCompare(String(a.date))
  return String(b.date).localeCompare(String(a.date)) || String(a.title).localeCompare(String(b.title), 'th-TH')
}

export function groupTransactionsByMonth(
  transactions: TransactionEntry[],
  options: { includePending?: boolean } = {},
): MonthlyGroup[] {
  const grouped = new Map<string, TransactionEntry[]>()
  for (const transaction of transactions) {
    const monthKey = getMonthKey(transaction.date)
    grouped.set(monthKey, [...(grouped.get(monthKey) ?? []), transaction])
  }
  return Array.from(grouped.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, groupTransactions]) => ({
      monthKey,
      transactions: groupTransactions,
      totals: calculateMonthlyTotals(groupTransactions, options),
    }))
}

export function getSafeDateInMonth(monthKey: string, dayText: string): string {
  const [yearText, monthText] = monthKey.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return `${monthKey}-01`

  const parsedDay = Math.floor(Number(dayText))
  const lastDay = new Date(year, month, 0).getDate()
  const safeDay = Number.isFinite(parsedDay) ? Math.min(lastDay, Math.max(1, parsedDay)) : 1
  return `${monthKey}-${String(safeDay).padStart(2, '0')}`
}

function getSafeRepeatCount(repeatCountText: string): number {
  const parsedRepeatCount = Math.floor(Number(repeatCountText || 1))
  if (!Number.isFinite(parsedRepeatCount)) return 1
  return Math.min(60, Math.max(1, parsedRepeatCount))
}

export function buildRepeatedTransactionsFromForm(values: TransactionFormValues, existing?: TransactionEntry): TransactionEntry[] {
  const baseTransaction = buildTransactionFromForm(values, existing)
  if (existing || !values.repeatEnabled) return [baseTransaction]
  const repeatCount = getSafeRepeatCount(values.repeatCount)
  const originalDay = baseTransaction.date.slice(8, 10) || '01'

  return Array.from({ length: repeatCount }, (_, index) => {
    const monthKey = addMonthsToMonthKey(getMonthKey(baseTransaction.date), index)
    const date = getSafeDateInMonth(monthKey, originalDay)
    return {
      ...baseTransaction,
      id: index === 0 ? baseTransaction.id : createId(),
      date,
      monthKey,
      createdAt: index === 0 ? baseTransaction.createdAt : currentIsoTimestamp(),
      updatedAt: currentIsoTimestamp(),
    }
  })
}

export function getCategoryOptions(data: FinanceData): string[] {
  return getCanonicalCategoryOptions(data)
}

export function buildTransactionFromForm(values: TransactionFormValues, existing?: TransactionEntry): TransactionEntry {
  const now = currentIsoTimestamp()
  const category = normalizeCategoryId(values.category, 'อื่นๆ')
  const amount = Math.max(0, parseAmountSafe(values.amount, 0))
  const status: TransactionStatus = values.type === 'income' ? 'cleared' : values.status
  return {
      id: existing?.id ?? createId(),
    type: values.type,
    date: values.date,
    monthKey: getMonthKey(values.date),
    category,
    categoryId: category,
    title: values.title.trim(),
    amount,
    currency: 'THB',
    note: values.note.trim() || undefined,
    status,
    source: existing?.source ?? 'manual',
    sourceModule: 'manual',
    sourceRefId: existing?.sourceRefId ?? null,
    tripId: existing?.tripId ?? null,
    installmentId: existing?.installmentId,
    installmentPlanId: existing?.installmentPlanId ?? null,
    recurringRuleId: existing?.recurringRuleId ?? null,
    goalId: existing?.goalId ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

function isValidTransactionDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year < 1 || month < 1 || month > 12 || day < 1) return false

  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day
}

export function validateTransactionForm(values: TransactionFormValues): string | null {
  if (!values.date) return 'เลือกวันที่'
  if (!isValidTransactionDate(values.date)) return 'เลือกวันที่ที่ถูกต้อง'
  if (!values.title.trim()) return 'กรอกชื่อรายการ'
  const parsedAmount = parseAmountSafe(values.amount, Number.NaN)
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return 'กรอกจำนวนเงินมากกว่า 0'
  if (values.repeatEnabled) {
    const repeatCountText = values.repeatCount.trim()
    const repeatCount = Number(repeatCountText)
    if (!repeatCountText || !Number.isFinite(repeatCount) || !Number.isInteger(repeatCount) || repeatCount < 1 || repeatCount > 60) {
      return 'จำนวนเดือนที่สร้างต้องอยู่ระหว่าง 1 ถึง 60'
    }
  }
  return null
}
