import { getCanonicalCategoryOptions, normalizeCategoryId } from '../../../data/categories'
import type { FinanceData, TransactionEntry, TransactionStatus, TransactionType } from '../../../types/finance'
import { th } from '../../../i18n/th'
import { currentDateInputValue, currentIsoTimestamp, getMonthKey } from '../../../utils/formatters'
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

export function createEmptyMonthlyFilters(month = currentDateInputValue().slice(0, 7)): MonthlyFilters {
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
  const fallbackMonth = filters.month || currentDateInputValue().slice(0, 7)
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

export function addMonthsToMonthKey(monthKey: string, amount: number): string {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, (month || 1) - 1 + amount, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

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

export function isManualTransaction(transaction: TransactionEntry): boolean {
  return !isInstallmentTransaction(transaction) && !transaction.tripId
}

export function isTripTransaction(transaction: TransactionEntry): boolean {
  return Boolean(transaction.tripId || transaction.sourceModule === 'trip')
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

export function calculateMonthlyTotals(transactions: TransactionEntry[]): MonthlyTotals {
  return transactions.reduce<MonthlyTotals>(
    (totals, transaction) => {
      if (transaction.type === 'income') {
        totals.income += transaction.amount
      } else {
        totals.expense += transaction.amount
        if (transaction.status === 'pending') totals.pendingExpense += transaction.amount
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
  const [rangeStart, rangeEnd] = normalizeMonthRange(
    smartFilter.monthOffset === undefined ? normalizedFilters.rangeStartMonth : addMonthsToMonthKey(currentDateInputValue().slice(0, 7), smartFilter.monthOffset),
    smartFilter.monthOffset === undefined ? normalizedFilters.rangeEndMonth : addMonthsToMonthKey(currentDateInputValue().slice(0, 7), smartFilter.monthOffset),
  )
  const minAmount = smartFilter.minAmount ?? Number(normalizedFilters.minAmount || Number.NaN)
  const maxAmount = smartFilter.maxAmount ?? Number(normalizedFilters.maxAmount || Number.NaN)
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
      return transaction.type === type && !isInstallmentTransaction(transaction) && !isTripTransaction(transaction)
    })
    .filter((transaction) => {
      const status = smartFilter.status ?? normalizedFilters.status
      if (status === 'all') return true
      if (status === 'paid') return transaction.status === 'cleared'
      return transaction.type === 'expense' && transaction.status === 'pending'
    })
    .filter((transaction) => !category || normalizeCategoryId(transaction.categoryId || transaction.category, '') === category)
    .filter((transaction) => !Number.isFinite(minAmount) || transaction.amount >= minAmount)
    .filter((transaction) => !Number.isFinite(maxAmount) || transaction.amount <= maxAmount)
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

export function groupTransactionsByMonth(transactions: TransactionEntry[]): MonthlyGroup[] {
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
      totals: calculateMonthlyTotals(groupTransactions),
    }))
}

export function buildRepeatedTransactionsFromForm(values: TransactionFormValues, existing?: TransactionEntry): TransactionEntry[] {
  const baseTransaction = buildTransactionFromForm(values, existing)
  if (existing || !values.repeatEnabled) return [baseTransaction]
  const repeatCount = Math.min(60, Math.max(1, Number(values.repeatCount || 1)))
  return Array.from({ length: repeatCount }, (_, index) => {
    const monthKey = addMonthsToMonthKey(getMonthKey(baseTransaction.date), index)
    const day = baseTransaction.date.slice(8, 10) || '01'
    const date = `${monthKey}-${day}`
    return {
      ...baseTransaction,
      id: index === 0 ? baseTransaction.id : crypto.randomUUID(),
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
  const amount = Math.max(0, Number(values.amount || 0))
  const status: TransactionStatus = values.type === 'income' ? 'cleared' : values.status
  return {
    id: existing?.id ?? crypto.randomUUID(),
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
    sourceModule: values.sourceModule.trim() || 'manual',
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

export function validateTransactionForm(values: TransactionFormValues): string | null {
  if (!values.date) return 'เลือกวันที่'
  if (!values.title.trim()) return 'กรอกชื่อรายการ'
  if (!Number.isFinite(Number(values.amount)) || Number(values.amount) <= 0) return 'กรอกจำนวนเงินมากกว่า 0'
  return null
}

