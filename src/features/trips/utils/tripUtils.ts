import { getCanonicalCategoryOptions, normalizeCategoryId } from '../../../data/categories'
import type { AppData, Budget, BudgetLine, InstallmentPlan, TransactionEntry, Trip, TripItem, TripStatus } from '../../../types/finance'
import { currentDateInputValue, currentIsoTimestamp, getMonthKey } from '../../../utils/formatters'

export type TripStatusFilter = 'all' | TripStatus
export type TripDetailTab = 'overview' | 'actual' | 'plan'
export type TripBudgetStatus = 'safe' | 'near-limit' | 'over-budget'

export type TripFilters = {
  keyword: string
  year: string
  month: string
  category: string
  status: TripStatusFilter
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

export function createEmptyTripFilters(): TripFilters {
  return {
    keyword: '',
    year: '',
    month: '',
    category: '',
    status: 'all',
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

export function getTripBudgetRecord(data: AppData, tripId: string): Budget | null {
  return data.budgets.find((budget) => budget.scope === 'trip' && budget.tripId === tripId && budget.enabled !== false) ?? null
}

export function getTripBudgetLines(data: AppData, tripId: string): BudgetLine[] {
  const budget = getTripBudgetRecord(data, tripId)
  if (!budget) return []
  if (budget.lines?.length) return budget.lines
  return [{
    id: budget.id,
    categoryId: normalizeCategoryId(budget.categoryId || budget.category, 'ท่องเที่ยว'),
    amount: Number(budget.amount || 0),
    note: budget.note,
  }]
}

export function getTripPlannedBudget(data: AppData, trip: Trip): number {
  const budgetLines = getTripBudgetLines(data, trip.id)
  const budgetLineTotal = budgetLines.reduce((total, line) => total + Number(line.amount || 0), 0)
  return budgetLineTotal || Number(trip.budget || 0)
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
  return getTripBudgetLines(data, trip.id)
    .map((line) => {
      const planned = Math.max(0, Number(line.amount || 0))
      const actual = actualByCategory.get(normalizeCategoryId(line.categoryId, 'ท่องเที่ยว')) ?? 0
      const remaining = planned - actual
      const usagePercent = planned > 0 ? Math.min(100, Math.round((actual / planned) * 100)) : 0
      const status: TripBudgetStatus = actual >= planned ? 'over-budget' : actual / planned >= 0.8 ? 'near-limit' : 'safe'
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

function tripMatchesMonth(trip: Trip, month: string): boolean {
  if (!month) return true
  const itemMatches = trip.items.some((item) => getMonthKey(item.date) === month)
  return itemMatches || getMonthKey(trip.startDate) === month || getMonthKey(trip.endDate) === month
}

export function filterTrips(trips: Trip[], filters: TripFilters): Trip[] {
  const keyword = filters.keyword.trim().toLocaleLowerCase()
  return trips
    .filter((trip) => filters.status === 'all' || getTripStatus(trip) === filters.status)
    .filter((trip) => {
      if (!filters.year) return true
      return trip.startDate.startsWith(filters.year)
        || trip.endDate.startsWith(filters.year)
        || trip.items.some((item) => item.date.startsWith(filters.year))
    })
    .filter((trip) => tripMatchesMonth(trip, filters.month))
    .filter((trip) => !filters.category || trip.items.some((item) => normalizeCategoryId(item.category, 'ท่องเที่ยว') === normalizeCategoryId(filters.category, 'ท่องเที่ยว')))
    .filter((trip) => {
      if (!keyword) return true
      return [
        trip.name,
        trip.destination,
        trip.note,
        ...trip.items.flatMap((item) => [item.title, item.category, item.destination, item.country, item.note]),
      ].some((value) => String(value ?? '').toLocaleLowerCase().includes(keyword))
    })
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)) || String(a.name).localeCompare(String(b.name)))
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
    id: existing?.id ?? crypto.randomUUID(),
    name: values.name.trim(),
    destination: values.destination.trim() || undefined,
    budget: values.budget ? Math.max(0, Number(values.budget)) : undefined,
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
  if (values.budget && (!Number.isFinite(Number(values.budget)) || Number(values.budget) < 0)) return 'งบประมาณต้องเป็น 0 หรือมากกว่า'
  return null
}

export function createTripItemFormValues(item?: TripItem, trip?: Trip): TripItemFormValues {
  return {
    id: item?.id,
    title: item?.title ?? '',
    amount: item?.amount ? String(item.amount) : '',
    date: item?.date ?? trip?.startDate ?? currentDateInputValue(),
    category: normalizeCategoryId(item?.category || '', ''),
    destination: item?.destination ?? trip?.destination ?? '',
    country: item?.country ?? '',
    installmentId: item?.installmentId ?? '',
    isPaid: item?.isPaid ?? false,
    note: item?.note ?? '',
  }
}

export function buildTripItemFromForm(values: TripItemFormValues, existing?: TripItem): TripItem {
  return {
    id: existing?.id ?? crypto.randomUUID(),
    title: values.title.trim(),
    amount: Math.max(0, Number(values.amount || 0)),
    date: values.date,
    category: normalizeCategoryId(values.category, 'ท่องเที่ยว'),
    destination: values.destination.trim() || undefined,
    country: values.country.trim() || undefined,
    isPaid: values.isPaid,
    note: values.note.trim() || undefined,
    installmentId: values.installmentId || undefined,
  }
}

export function validateTripItemForm(values: TripItemFormValues): string | null {
  if (!values.title.trim()) return 'กรอกชื่อรายการ'
  if (!values.date) return 'เลือกวันที่'
  if (!Number.isFinite(Number(values.amount)) || Number(values.amount) <= 0) return 'กรอกจำนวนเงินมากกว่า 0'
  return null
}

export function upsertTripItem(trip: Trip, item: TripItem): Trip {
  const exists = trip.items.some((current) => current.id === item.id)
  const items = exists
    ? trip.items.map((current) => current.id === item.id ? item : current)
    : [item, ...trip.items]
  return {
    ...trip,
    items: items.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.title).localeCompare(String(b.title))),
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
  return {
    ...trip,
    items: trip.items.map((item) => item.id === itemId ? { ...item, isPaid: !item.isPaid } : item),
    updatedAt: currentIsoTimestamp(),
  }
}

export function createTripBudgetLineFormValues(line?: BudgetLine): TripBudgetLineFormValues {
  return {
    categoryId: normalizeCategoryId(line?.categoryId || '', ''),
    amount: line ? String(line.amount) : '',
    note: line?.note ?? '',
  }
}

export function buildTripBudgetLineFromForm(values: TripBudgetLineFormValues): Pick<BudgetLine, 'categoryId' | 'amount' | 'note'> {
  return {
    categoryId: normalizeCategoryId(values.categoryId, 'ท่องเที่ยว'),
    amount: Math.max(0, Number(values.amount || 0)),
    note: values.note.trim() || undefined,
  }
}

export function validateTripBudgetLineForm(values: TripBudgetLineFormValues): string | null {
  if (!values.categoryId.trim()) return 'กรอกหมวดหมู่งบประมาณ'
  if (!Number.isFinite(Number(values.amount)) || Number(values.amount) <= 0) return 'กรอกจำนวนงบประมาณมากกว่า 0'
  return null
}

export function getInstallmentOptionsForTrip(items: InstallmentPlan[]): Array<{ id: string; label: string }> {
  return items
    .map((plan) => ({ id: plan.id, label: `${plan.name} - ${plan.monthlyAmount.toLocaleString('th-TH')} THB` }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function deriveTripTransactions(trips: Trip[], monthKey?: string): TransactionEntry[] {
  return trips.flatMap((trip) => trip.items
    .filter((item) => !monthKey || getMonthKey(item.date) === monthKey)
    .map((item) => ({
      id: `trip-${trip.id}-${item.id}`,
      type: 'expense',
      date: item.date,
      monthKey: getMonthKey(item.date),
      category: normalizeCategoryId(item.category, 'ท่องเที่ยว'),
      categoryId: normalizeCategoryId(item.category, 'ท่องเที่ยว'),
      title: item.title,
      amount: Math.max(0, Number(item.amount || 0)),
      currency: 'THB',
      note: item.note || `รายการทริปจาก ${trip.name} แก้ไขได้จากหน้าทริป`,
      status: item.isPaid === false ? 'pending' : 'cleared',
      source: 'manual',
      sourceModule: 'trip',
      sourceRefId: item.id,
      tripId: trip.id,
      installmentId: item.installmentId,
      installmentPlanId: item.installmentId ?? null,
      recurringRuleId: null,
      goalId: null,
      createdAt: trip.createdAt,
      updatedAt: trip.updatedAt,
    } satisfies TransactionEntry)))
}


