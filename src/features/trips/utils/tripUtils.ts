import { getCanonicalCategoryOptions, normalizeCategoryId } from '../../../data/categories'
import { getBudgetAllocatedAmount, getBudgetStatus, getBudgetThresholds } from '../../budgetGoals/budgetGoalCalculations'
import { createId } from '../../../lib/id'
import type { AppData, Budget, BudgetLine, InstallmentPlan, TransactionEntry, Trip, TripItem, TripStatus } from '../../../types/finance'
import { currentDateInputValue, currentIsoTimestamp, currentMonthInputValue, getMonthKey, parseAmountSafe } from '../../../utils/formatters'

export type TripStatusFilter = 'all' | TripStatus
export type TripSortOrder = 'start-desc' | 'start-asc' | 'name-asc' | 'actual-desc' | 'budget-desc'
export type TripDetailTab = 'overview' | 'actual' | 'plan'
export type TripBudgetStatus = 'safe' | 'near-limit' | 'over-budget'

export const tripStatusLabel: Record<TripStatus, string> = {
  upcoming: 'ยังไม่เริ่ม',
  ongoing: 'กำลังเดินทาง',
  completed: 'จบทริปแล้ว',
}

export const tripBudgetStatusLabel: Record<TripBudgetStatus, string> = {
  safe: 'ยังปลอดภัย',
  'near-limit': 'ใกล้เต็มงบ',
  'over-budget': 'เกินงบ',
}

export type TripFilters = {
  keyword: string
  rangeStartMonth: string
  rangeEndMonth: string
  status: TripStatusFilter
  sortOrder: TripSortOrder
}

export type TripFormValues = {
  id?: string
  name: string
  destination: string
  budget: string
  startDate: string
  endDate: string
  note: string
}

export type TripItemFormValues = {
  id?: string
  title: string
  amount: string
  date: string
  category: string
  destination: string
  country: string
  installmentId: string
  isPaid: boolean
  note: string
}

export type TripTotals = {
  plannedBudget: number
  actualSpending: number
  paidTotal: number
  unpaidTotal: number
  remaining: number
  itemCount: number
  usagePercent: number
}

export type TripBudgetLineView = {
  line: BudgetLine
  categoryId: string
  planned: number
  actual: number
  remaining: number
  usagePercent: number
  status: TripBudgetStatus
}

export type TripBudgetLineFormValues = {
  categoryId: string
  amount: string
  note: string
}

function optionalAmount(value: unknown): number | null {
  if (value == null || (typeof value === 'string' && !value.trim())) return null
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

export function createEmptyTripFilters(): TripFilters {
  const currentYear = currentMonthInputValue().slice(0, 4)
  return {
    keyword: '',
    rangeStartMonth: `${currentYear}-01`,
    rangeEndMonth: `${currentYear}-12`,
    status: 'all',
    sortOrder: 'start-desc',
  }
}

export function getTripStatus(trip: Trip, today = currentDateInputValue()): TripStatus {
  if (trip.startDate && today < trip.startDate) return 'upcoming'
  if (trip.endDate && today > trip.endDate) return 'completed'
  return 'ongoing'
}

export function getTripDayCount(trip: Trip): number {
  const startTime = new Date(trip.startDate).getTime()
  const endTime = new Date(trip.endDate).getTime()
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return 1
  return Math.max(1, Math.round((endTime - startTime) / 86400000) + 1)
}

export function getTripBudgetRecord(data: Pick<AppData, 'budgets'>, tripId: string): Budget | null {
  return data.budgets.find((budget) => budget.scope === 'trip' && budget.tripId === tripId && budget.enabled !== false) ?? null
}

export function getTripBudgetLines(data: Pick<AppData, 'budgets'>, tripId: string): BudgetLine[] {
  const budget = getTripBudgetRecord(data, tripId)
  if (!budget) return []
  if (budget.lines?.length) return budget.lines
  return [{
    id: budget.id,
    categoryId: normalizeCategoryId(budget.categoryId || budget.category, 'ท่องเที่ยว'),
    amount: Math.max(0, optionalAmount(budget.amount) ?? 0),
    note: budget.note,
  }]
}

export function getTripPlannedBudget(data: Pick<AppData, 'budgets'>, trip: Trip): number {
  const budget = getTripBudgetRecord(data, trip.id)
  if (!budget) return Math.max(0, optionalAmount(trip.budget) ?? 0)
  return getBudgetAllocatedAmount(budget)
}

export function getTripActualByCategory(trip: Trip): Map<string, number> {
  const actualByCategory = new Map<string, number>()
  for (const item of trip.items) {
    const category = normalizeCategoryId(item.category, 'ท่องเที่ยว')
    actualByCategory.set(category, (actualByCategory.get(category) ?? 0) + Number(item.amount || 0))
  }
  return actualByCategory
}

export function getTripBudgetLineViews(data: AppData, trip: Trip): TripBudgetLineView[] {
  const actualByCategory = getTripActualByCategory(trip)
  const budgetRecord = getTripBudgetRecord(data, trip.id)
  const thresholds = getBudgetThresholds(budgetRecord ?? undefined)
  return getTripBudgetLines(data, trip.id)
    .map((line) => {
      const planned = Number.isFinite(Number(line.amount)) ? Math.max(0, Number(line.amount)) : 0
      const actual = actualByCategory.get(normalizeCategoryId(line.categoryId, 'ท่องเที่ยว')) ?? 0
      const remaining = planned - actual
      const usagePercent = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : actual > 0 ? 100 : 0
      const status = getBudgetStatus(actual, planned, thresholds) as TripBudgetStatus
      return {
        line,
        categoryId: normalizeCategoryId(line.categoryId, 'ท่องเที่ยว'),
        planned,
        actual,
        remaining,
        usagePercent,
        status,
      }
    })
    .sort((a, b) => a.categoryId.localeCompare(b.categoryId))
}

export function calculateTripTotals(data: AppData, trip: Trip): TripTotals {
  const plannedBudget = getTripPlannedBudget(data, trip)
  const actualSpending = trip.items.reduce((total, item) => total + Number(item.amount || 0), 0)
  const paidTotal = trip.items.filter((item) => item.isPaid !== false).reduce((total, item) => total + Number(item.amount || 0), 0)
  const unpaidTotal = actualSpending - paidTotal
  const remaining = plannedBudget - actualSpending
  const usagePercent = plannedBudget > 0 ? Math.min(100, Math.round((actualSpending / plannedBudget) * 100)) : 0
  return {
    plannedBudget,
    actualSpending,
    paidTotal,
    unpaidTotal,
    remaining,
    itemCount: trip.items.length,
    usagePercent,
  }
}

export function summarizeTrips(data: AppData, trips: Trip[]): TripTotals & { tripCount: number; dayCount: number } {
  return trips.reduce(
    (summary, trip) => {
      const totals = calculateTripTotals(data, trip)
      summary.tripCount += 1
      summary.dayCount += getTripDayCount(trip)
      summary.plannedBudget += totals.plannedBudget
      summary.actualSpending += totals.actualSpending
      summary.paidTotal += totals.paidTotal
      summary.unpaidTotal += totals.unpaidTotal
      summary.itemCount += totals.itemCount
      summary.remaining = summary.plannedBudget - summary.actualSpending
      summary.usagePercent = summary.plannedBudget > 0 ? Math.min(100, Math.round((summary.actualSpending / summary.plannedBudget) * 100)) : 0
      return summary
    },
    {
      tripCount: 0,
      dayCount: 0,
      plannedBudget: 0,
      actualSpending: 0,
      paidTotal: 0,
      unpaidTotal: 0,
      remaining: 0,
      itemCount: 0,
      usagePercent: 0,
    },
  )
}

function tripMatchesMonthRange(trip: Trip, rangeStartMonth: string, rangeEndMonth: string): boolean {
  if (!rangeStartMonth && !rangeEndMonth) return true
  const start = rangeStartMonth || rangeEndMonth
  const end = rangeEndMonth || rangeStartMonth
  const [fromMonth, toMonth] = start <= end ? [start, end] : [end, start]
  const tripStartMonth = getMonthKey(trip.startDate)
  const tripEndMonth = getMonthKey(trip.endDate)
  const tripOverlapsRange = Boolean(tripStartMonth && tripEndMonth && tripStartMonth <= toMonth && tripEndMonth >= fromMonth)
  const itemMatches = trip.items.some((item) => {
    const itemMonth = getMonthKey(item.date)
    return itemMonth >= fromMonth && itemMonth <= toMonth
  })
  return tripOverlapsRange || itemMatches
}

export function filterTrips(trips: Trip[], filters: TripFilters, data?: Pick<AppData, 'budgets'>): Trip[] {
  const keyword = filters.keyword.trim().toLocaleLowerCase()
  return trips
    .filter((trip) => filters.status === 'all' || getTripStatus(trip) === filters.status)
    .filter((trip) => tripMatchesMonthRange(trip, filters.rangeStartMonth, filters.rangeEndMonth))
    .filter((trip) => {
      if (!keyword) return true
      return [
        trip.name,
        trip.destination,
        trip.note,
        ...trip.items.flatMap((item) => [item.title, item.category, item.destination, item.country, item.note]),
      ].some((value) => String(value ?? '').toLocaleLowerCase().includes(keyword))
    })
    .sort((a, b) => compareTrips(a, b, filters.sortOrder, data))
}

function compareTrips(a: Trip, b: Trip, sortOrder: TripSortOrder, data?: Pick<AppData, 'budgets'>): number {
  if (sortOrder === 'start-asc') return String(a.startDate).localeCompare(String(b.startDate)) || String(a.name).localeCompare(String(b.name), 'th-TH')
  if (sortOrder === 'name-asc') return String(a.name).localeCompare(String(b.name), 'th-TH') || String(b.startDate).localeCompare(String(a.startDate))
  if (sortOrder === 'actual-desc') {
    const aActual = a.items.reduce((total, item) => total + Number(item.amount || 0), 0)
    const bActual = b.items.reduce((total, item) => total + Number(item.amount || 0), 0)
    return bActual - aActual || String(b.startDate).localeCompare(String(a.startDate))
  }
  if (sortOrder === 'budget-desc') {
    const aBudget = data ? getTripPlannedBudget(data, a) : Number(a.budget ?? 0)
    const bBudget = data ? getTripPlannedBudget(data, b) : Number(b.budget ?? 0)
    return bBudget - aBudget || String(b.startDate).localeCompare(String(a.startDate))
  }
  return String(b.startDate).localeCompare(String(a.startDate)) || String(a.name).localeCompare(String(b.name), 'th-TH')
}

export function getCategoryOptions(data: AppData): string[] {
  return getCanonicalCategoryOptions(data)
}

export function getTripYearOptions(trips: Trip[]): string[] {
  return Array.from(new Set(trips.flatMap((trip) => [
    trip.startDate.slice(0, 4),
    trip.endDate.slice(0, 4),
    ...trip.items.map((item) => item.date.slice(0, 4)),
  ]).filter(Boolean))).sort((a, b) => b.localeCompare(a))
}

export function createTripFormValues(trip?: Trip): TripFormValues {
  return {
    id: trip?.id,
    name: trip?.name ?? '',
    destination: trip?.destination ?? '',
    budget: trip?.budget ? String(trip.budget) : '',
    startDate: trip?.startDate ?? currentDateInputValue(),
    endDate: trip?.endDate ?? currentDateInputValue(),
    note: trip?.note ?? '',
  }
}

export function buildTripFromForm(values: TripFormValues, existing?: Trip): Trip {
  const now = currentIsoTimestamp()
  return {
    id: existing?.id ?? createId(),
    name: values.name.trim(),
    destination: values.destination.trim() || undefined,
    budget: values.budget.trim() ? Math.max(0, parseAmountSafe(values.budget, 0)) : undefined,
    startDate: values.startDate,
    endDate: values.endDate,
    note: values.note.trim() || undefined,
    items: existing?.items ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

export function validateTripForm(values: TripFormValues): string | null {
  if (!values.name.trim()) return 'กรอกชื่อทริป'
  if (!values.startDate || !values.endDate) return 'เลือกวันเริ่มต้นและวันสิ้นสุด'
  if (values.endDate < values.startDate) return 'วันสิ้นสุดต้องไม่มาก่อนวันเริ่มต้น'
  if (values.budget.trim()) {
    const parsedBudget = parseAmountSafe(values.budget, Number.NaN)
    if (!Number.isFinite(parsedBudget) || parsedBudget < 0) return 'งบประมาณต้องเป็น 0 หรือมากกว่า'
  }
  return null
}

export function createTripItemFormValues(item?: TripItem, trip?: Trip): TripItemFormValues {
  return {
    id: item?.id,
    title: item?.title ?? '',
    amount: item?.amount ? String(item.amount) : '',
    date: item?.date ?? trip?.startDate ?? currentDateInputValue(),
    category: normalizeCategoryId(item?.category || '', 'ท่องเที่ยว'),
    destination: item?.destination ?? trip?.destination ?? '',
    country: item?.country ?? '',
    installmentId: item?.installmentPlanId ?? item?.installmentId ?? '',
    isPaid: item?.isPaid ?? false,
    note: item?.note ?? '',
  }
}

export function buildTripItemFromForm(values: TripItemFormValues, existing?: TripItem): TripItem {
  const now = currentIsoTimestamp()
  return {
    id: existing?.id ?? createId(),
    title: values.title.trim(),
    amount: Math.max(0, parseAmountSafe(values.amount, 0)),
    date: values.date,
    category: normalizeCategoryId(values.category, 'ท่องเที่ยว'),
    categoryId: normalizeCategoryId(values.category, 'ท่องเที่ยว'),
    destination: values.destination.trim() || undefined,
    country: values.country.trim() || undefined,
    isPaid: values.isPaid,
    note: values.note.trim() || undefined,
    installmentId: values.installmentId || undefined,
    installmentPlanId: values.installmentId || null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

export function validateTripItemForm(values: TripItemFormValues): string | null {
  if (!values.title.trim()) return 'กรอกชื่อรายการ'
  if (!values.date) return 'เลือกวันที่'
  const parsedAmount = parseAmountSafe(values.amount, Number.NaN)
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return 'กรอกจำนวนเงินมากกว่า 0'
  return null
}

export function upsertTripItem(trip: Trip, item: TripItem): Trip {
  const exists = trip.items.some((current) => current.id === item.id)
  const items = exists
    ? trip.items.map((current) => current.id === item.id ? item : current)
    : [item, ...trip.items]
  return {
    ...trip,
    items: items.sort(compareTripItemsByDateAndCreatedAt),
    updatedAt: currentIsoTimestamp(),
  }
}

export function deleteTripItem(trip: Trip, itemId: string): Trip {
  return {
    ...trip,
    items: trip.items.filter((item) => item.id !== itemId),
    updatedAt: currentIsoTimestamp(),
  }
}

export function toggleTripItemPaid(trip: Trip, itemId: string): Trip {
  const now = currentIsoTimestamp()
  return {
    ...trip,
    items: trip.items.map((item) => item.id === itemId ? { ...item, isPaid: !item.isPaid, updatedAt: now } : item),
    updatedAt: now,
  }
}

export function compareTripItemsByDateAndCreatedAt(a: TripItem, b: TripItem): number {
  return String(a.date).localeCompare(String(b.date))
    || String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? ''))
    || String(a.title).localeCompare(String(b.title), 'th-TH')
}

export function createTripBudgetLineFormValues(line?: BudgetLine): TripBudgetLineFormValues {
  return {
    categoryId: normalizeCategoryId(line?.categoryId || '', 'ท่องเที่ยว'),
    amount: line ? String(line.amount) : '',
    note: line?.note ?? '',
  }
}

export function buildTripBudgetLineFromForm(values: TripBudgetLineFormValues): Pick<BudgetLine, 'categoryId' | 'amount' | 'note'> {
  return {
    categoryId: normalizeCategoryId(values.categoryId, 'ท่องเที่ยว'),
    amount: Math.max(0, parseAmountSafe(values.amount, 0)),
    note: values.note.trim() || undefined,
  }
}

export function validateTripBudgetLineForm(values: TripBudgetLineFormValues): string | null {
  if (!values.categoryId.trim()) return 'กรอกหมวดหมู่งบประมาณ'
  const parsedAmount = parseAmountSafe(values.amount, Number.NaN)
  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return 'กรอกจำนวนงบประมาณมากกว่า 0'
  return null
}

export function getInstallmentOptionsForTrip(items: InstallmentPlan[]): Array<{ id: string; label: string }> {
  return items
    .map((plan) => ({ id: plan.id, label: `${plan.name} - ${plan.monthlyAmount.toLocaleString('th-TH')} THB` }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

function isTripOwnedTransaction(transaction: TransactionEntry, tripId: string): boolean {
  return transaction.type === 'expense'
    && transaction.tripId === tripId
    && (transaction.sourceModule === 'trip' || transaction.id.startsWith('tx-trip-'))
}

function getTripItemReference(transaction: TransactionEntry): string {
  return transaction.sourceRefId || transaction.id
}

/**
 * Keep one persisted legacy trip transaction in sync with its nested item.
 * Manual transactions that merely reference a trip are intentionally left
 * alone because they are not owned by the trip item migration.
 */
export function reconcileTripTransactions(
  transactions: TransactionEntry[],
  previousTrip: Trip,
  nextTrip: Trip,
  updatedAt = currentIsoTimestamp(),
): TransactionEntry[] {
  const nextItems = new Map(nextTrip.items.map((item) => [item.id, item]))
  const reconciledItemIds = new Set<string>()
  const reconciled = transactions.flatMap((transaction): TransactionEntry[] => {
    if (!isTripOwnedTransaction(transaction, previousTrip.id)) return [transaction]
    const item = nextItems.get(getTripItemReference(transaction))
    if (!item) return []
    reconciledItemIds.add(item.id)
    const category = normalizeCategoryId(item.categoryId ?? item.category, 'ท่องเที่ยว')
    const installmentPlanId = item.installmentPlanId ?? item.installmentId ?? null
    return [{
      ...transaction,
      date: item.date,
      monthKey: getMonthKey(item.date),
      category,
      categoryId: category,
      title: item.title,
      amount: Math.max(0, Number(item.amount || 0)),
      note: item.note,
      status: item.isPaid === false ? 'pending' : 'cleared',
      source: transaction.source ?? 'manual',
      sourceModule: 'trip',
      sourceRefId: item.id,
      tripId: nextTrip.id,
      installmentId: installmentPlanId ?? undefined,
      installmentPlanId,
      travelDetails: {
        destination: item.destination ?? null,
        country: item.country ?? null,
      },
      updatedAt,
    } satisfies TransactionEntry]
  })
  const createdTransactions = nextTrip.items
    .filter((item) => !reconciledItemIds.has(item.id))
    .map((item): TransactionEntry => {
      const date = item.date || nextTrip.startDate
      const category = normalizeCategoryId(item.categoryId ?? item.category, 'ท่องเที่ยว')
      const installmentPlanId = item.installmentPlanId ?? item.installmentId ?? null
      return {
        id: `tx-trip-${nextTrip.id}-${item.id}`,
        type: 'expense',
        date,
        monthKey: getMonthKey(date),
        category,
        categoryId: category,
        title: item.title,
        amount: Math.max(0, Number(item.amount || 0)),
        currency: 'THB',
        note: item.note,
        status: item.isPaid === false ? 'pending' : 'cleared',
        source: 'manual',
        sourceModule: 'trip',
        sourceRefId: item.id,
        tripId: nextTrip.id,
        installmentId: installmentPlanId ?? undefined,
        installmentPlanId,
        recurringRuleId: null,
        goalId: null,
        travelDetails: {
          destination: item.destination ?? null,
          country: item.country ?? null,
        },
        createdAt: item.createdAt ?? nextTrip.createdAt,
        updatedAt,
      }
    })
  return [...reconciled, ...createdTransactions]
}

/**
 * Remove transactions created from trip items with the trip. A transaction
 * that only has a manual trip relation is retained and detached, preventing
 * deleting a trip from deleting an independent cashflow record.
 */
export function detachTripTransactions(
  transactions: TransactionEntry[],
  tripId: string,
  updatedAt = currentIsoTimestamp(),
): TransactionEntry[] {
  let changed = false
  const nextTransactions = transactions.flatMap((transaction) => {
    if (transaction.tripId !== tripId) return [transaction]
    if (isTripOwnedTransaction(transaction, tripId)) {
      changed = true
      return []
    }
    changed = true
    return [{
      ...transaction,
      tripId: null,
      sourceRefId: null,
      updatedAt,
    }]
  })
  return changed ? nextTransactions : transactions
}

export type TripDerivationStats = {
  itemLookups: number
}

export function deriveTripTransactionsForMonths(
  trips: Trip[],
  monthKeys?: string[],
  persistedTransactions: TransactionEntry[] = [],
  stats?: TripDerivationStats,
): TransactionEntry[] {
  const persistedTripItems = new Set(
    persistedTransactions
      .filter((transaction) => transaction.tripId && isTripOwnedTransaction(transaction, transaction.tripId))
      .map((transaction) => `${transaction.tripId}:${getTripItemReference(transaction)}`),
  )
  const allowedMonths = monthKeys === undefined ? null : new Set(monthKeys)
  const rowsByMonth = new Map<string, TransactionEntry[]>()
  const derived = trips.flatMap((trip) => trip.items.flatMap((item) => {
    if (stats) stats.itemLookups += 1
    const itemMonth = getMonthKey(item.date)
    if (allowedMonths && !allowedMonths.has(itemMonth)) return []
    if (persistedTripItems.has(`${trip.id}:${item.id}`)) return []
    const installmentPlanId = item.installmentPlanId ?? item.installmentId ?? null
    return [{
      id: `trip-${trip.id}-${item.id}`,
      type: 'expense',
      date: item.date,
      monthKey: itemMonth,
      category: normalizeCategoryId(item.categoryId ?? item.category, 'ท่องเที่ยว'),
      categoryId: normalizeCategoryId(item.categoryId ?? item.category, 'ท่องเที่ยว'),
      title: item.title,
      amount: Math.max(0, Number(item.amount || 0)),
      currency: 'THB',
      note: item.note || `รายการทริปจาก ${trip.name} แก้ไขได้จากหน้าทริป`,
      status: item.isPaid === false ? 'pending' : 'cleared',
      source: 'manual',
      sourceModule: 'trip',
      sourceRefId: item.id,
      tripId: trip.id,
      installmentId: installmentPlanId ?? undefined,
      installmentPlanId,
      travelDetails: {
        destination: item.destination ?? null,
        country: item.country ?? null,
      },
      recurringRuleId: null,
      goalId: null,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
    } satisfies TransactionEntry]
  }))

  if (monthKeys === undefined) return derived
  derived.forEach((row) => {
    const monthRows = rowsByMonth.get(row.monthKey) ?? []
    monthRows.push(row)
    rowsByMonth.set(row.monthKey, monthRows)
  })
  return monthKeys.flatMap((monthKey) => rowsByMonth.get(monthKey) ?? [])
}

export function deriveTripTransactions(
  trips: Trip[],
  monthKey?: string,
  persistedTransactions: TransactionEntry[] = [],
): TransactionEntry[] {
  return deriveTripTransactionsForMonths(trips, monthKey ? [monthKey] : undefined, persistedTransactions)
}
