import type { FinanceData, TransactionEntry, TransactionStatus, TransactionType } from '../../../types/finance'
import { th } from '../../../i18n/th'
import { currentDateInputValue, currentIsoTimestamp, getMonthKey } from '../../../utils/formatters'

export type MonthlyTypeFilter = 'all' | 'income' | 'expense' | 'installment'
export type MonthlyStatusFilter = 'all' | 'paid' | 'unpaid'

export type MonthlyFilters = {
  month: string
  keyword: string
  type: MonthlyTypeFilter
  status: MonthlyStatusFilter
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
    month,
    keyword: '',
    type: 'all',
    status: 'all',
  }
}

export function createTransactionFormValues(transaction?: TransactionEntry, defaults?: Partial<TransactionFormValues>): TransactionFormValues {
  return {
    id: transaction?.id,
    type: transaction?.type ?? defaults?.type ?? 'expense',
    date: transaction?.date ?? defaults?.date ?? currentDateInputValue(),
    category: transaction?.category ?? defaults?.category ?? '',
    title: transaction?.title ?? defaults?.title ?? '',
    amount: transaction?.amount ? String(transaction.amount) : defaults?.amount ?? '',
    status: transaction?.status ?? defaults?.status ?? 'cleared',
    note: transaction?.note ?? defaults?.note ?? '',
    sourceModule: transaction?.sourceModule ?? defaults?.sourceModule ?? 'manual',
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
  const keyword = filters.keyword.trim().toLocaleLowerCase()
  return transactions
    .filter((transaction) => getMonthKey(transaction.date) === filters.month)
    .filter((transaction) => {
      if (filters.type === 'all') return true
      if (filters.type === 'installment') return isInstallmentTransaction(transaction)
      return transaction.type === filters.type && !isInstallmentTransaction(transaction)
    })
    .filter((transaction) => {
      if (filters.status === 'all') return true
      if (filters.status === 'paid') return transaction.status === 'cleared'
      return transaction.type === 'expense' && transaction.status === 'pending'
    })
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
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.title).localeCompare(String(b.title)))
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

export function getCategoryOptions(data: FinanceData): string[] {
  return Array.from(
    new Set([
      ...data.masters.categories.map((category) => category.label || category.id),
      ...data.transactions.map((transaction) => transaction.category),
    ].filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b))
}

export function buildTransactionFromForm(values: TransactionFormValues, existing?: TransactionEntry): TransactionEntry {
  const now = currentIsoTimestamp()
  const category = values.category.trim() || 'อื่น ๆ'
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
