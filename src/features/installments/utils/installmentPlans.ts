import { getCanonicalCategoryOptions, normalizeCategoryId } from '../../../data/categories'
import type { AppData, InstallmentPlan, InterestType, TransactionEntry } from '../../../types/finance'
import { currentIsoTimestamp, getMonthKey } from '../../../utils/formatters'

export type InstallmentViewMode = 'list' | 'calendar'
export type InstallmentStatusFilter = 'all' | 'active' | 'paid'
export type InstallmentSortOrder =
  | 'start-asc'
  | 'start-desc'
  | 'name-asc'
  | 'remaining-desc'
  | 'remaining-asc'
  | 'monthly-desc'
  | 'status-active'

export type InstallmentFilters = {
  keyword: string
  status: InstallmentStatusFilter
  startMonth: string
  endMonth: string
  sortOrder: InstallmentSortOrder
}

export type InstallmentFormValues = {
  id?: string
  name: string
  totalAmount: string
  monthlyAmount: string
  startMonth: string
  monthsTotal: string
  category: string
  note: string
  paidMonths: string
  principal: string
  remainingOverride: string
  dueDay: string
  interestType: InterestType
  interestRate: string
  interestNote: string
}

export type InstallmentProgress = {
  totalAmount: number
  totalPaid: number
  remainingAmount: number
  progressPercent: number
  monthsPaid: number
  monthsRemaining: number
  scheduleMonths: string[]
  paidMonthKeys: string[]
  endMonth: string
}

export type InstallmentSummary = {
  planCount: number
  totalPaid: number
  totalRemaining: number
  totalMonthly: number
  monthsRemaining: number
}

export function addMonths(monthKey: string, count: number): string {
  const [yearText, monthText] = monthKey.split('-')
  const date = new Date(Number(yearText), Number(monthText) - 1 + count, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7)
}

export function getInstallmentScheduleMonths(plan: InstallmentPlan): string[] {
  const totalMonths = Math.max(0, Number(plan.monthsTotal ?? plan.totalMonths ?? plan.installmentCount ?? 0))
  if (!plan.startMonth || !totalMonths) return []
  return Array.from({ length: totalMonths }, (_, index) => addMonths(plan.startMonth, index))
}

export function getInstallmentEndMonth(plan: InstallmentPlan): string {
  const scheduleMonths = getInstallmentScheduleMonths(plan)
  return scheduleMonths.at(-1) ?? ''
}

export function getPaidMonthKeys(plan: InstallmentPlan): string[] {
  const scheduleMonths = getInstallmentScheduleMonths(plan)
  const explicitKeys = Array.isArray(plan.paidMonthKeys)
    ? Array.from(new Set(plan.paidMonthKeys.filter((monthKey) => scheduleMonths.includes(monthKey))))
    : []
  if (explicitKeys.length) {
    const keySet = new Set(explicitKeys)
    return scheduleMonths.filter((monthKey) => keySet.has(monthKey))
  }
  const paidCount = Math.max(0, Math.min(scheduleMonths.length, Number(plan.monthsPaid ?? plan.paidMonths ?? 0)))
  return scheduleMonths.slice(0, paidCount)
}

export function calculateInstallmentProgress(plan: InstallmentPlan): InstallmentProgress {
  const scheduleMonths = getInstallmentScheduleMonths(plan)
  const paidMonthKeys = getPaidMonthKeys(plan)
  const monthlyAmount = Math.max(0, Number(plan.monthlyAmount || plan.paymentAmount || 0))
  const principalTotal = Number(plan.principal ?? plan.principalAmount)
  const totalAmount = Number.isFinite(principalTotal) && principalTotal > 0
    ? principalTotal
    : monthlyAmount * scheduleMonths.length
  const monthsPaid = paidMonthKeys.length
  const totalPaid = Math.min(totalAmount || monthlyAmount * monthsPaid, monthlyAmount * monthsPaid)
  const bySchedule = Math.max(0, (scheduleMonths.length - monthsPaid) * monthlyAmount)
  const hasInterest = Number(plan.interestRate || 0) > 0 && plan.interestType !== 'none'
  const byPrincipal = !hasInterest && totalAmount > 0 ? Math.max(0, totalAmount - totalPaid) : null
  const computedRemaining = byPrincipal ?? bySchedule
  const remainingSnapshot = plan.remainingOverride ?? plan.balanceSnapshotAmount
  const remainingAmount = typeof remainingSnapshot === 'number' ? Math.max(0, remainingSnapshot) : computedRemaining
  const progressPercent = totalAmount > 0 ? Math.min(100, Math.round((totalPaid / totalAmount) * 100)) : 0

  return {
    totalAmount,
    totalPaid,
    remainingAmount,
    progressPercent,
    monthsPaid,
    monthsRemaining: Math.max(0, scheduleMonths.length - monthsPaid),
    scheduleMonths,
    paidMonthKeys,
    endMonth: scheduleMonths.at(-1) ?? '',
  }
}

export function summarizeInstallmentPlans(plans: InstallmentPlan[]): InstallmentSummary {
  return plans.reduce<InstallmentSummary>(
    (summary, plan) => {
      const progress = calculateInstallmentProgress(plan)
      summary.planCount += 1
      summary.totalPaid += progress.totalPaid
      summary.totalRemaining += progress.remainingAmount
      summary.totalMonthly += Math.max(0, Number(plan.monthlyAmount || 0))
      summary.monthsRemaining += progress.monthsRemaining
      return summary
    },
    { planCount: 0, totalPaid: 0, totalRemaining: 0, totalMonthly: 0, monthsRemaining: 0 },
  )
}

export function filterInstallmentPlans(plans: InstallmentPlan[], filters: InstallmentFilters): InstallmentPlan[] {
  const keyword = filters.keyword.trim().toLocaleLowerCase()
  const [rangeStart, rangeEnd] = normalizeMonthRange(filters.startMonth, filters.endMonth)
  return plans
    .filter((plan) => {
      const progress = calculateInstallmentProgress(plan)
      if (filters.status === 'active') return progress.monthsRemaining > 0
      if (filters.status === 'paid') return progress.monthsRemaining === 0
      return true
    })
    .filter((plan) => {
      if (!rangeStart && !rangeEnd) return true
      const planStart = plan.startMonth || ''
      const planEnd = getInstallmentEndMonth(plan)
      if (rangeStart && planEnd && planEnd < rangeStart) return false
      if (rangeEnd && planStart && planStart > rangeEnd) return false
      return true
    })
    .filter((plan) => {
      if (!keyword) return true
      return [plan.name, plan.category, plan.note, plan.interestNote].some((value) => String(value ?? '').toLocaleLowerCase().includes(keyword))
    })
    .sort((a, b) => compareInstallmentPlans(a, b, filters.sortOrder))
}

export function createInstallmentFormValues(plan?: InstallmentPlan): InstallmentFormValues {
  const totalAmount = plan ? calculateInstallmentProgress(plan).totalAmount : 0
  const remainingSnapshot = plan?.remainingOverride ?? plan?.balanceSnapshotAmount
  const principal = plan?.principal ?? plan?.principalAmount ?? totalAmount
  return {
    id: plan?.id,
    name: plan?.name ?? '',
    totalAmount: totalAmount ? String(totalAmount) : '',
    monthlyAmount: plan?.monthlyAmount ? String(plan.monthlyAmount) : '',
    startMonth: plan?.startMonth ?? currentMonthKey(),
    monthsTotal: String(plan?.monthsTotal ?? plan?.totalMonths ?? plan?.installmentCount ?? 12),
    category: normalizeCategoryId(plan?.categoryId || plan?.category || '', ''),
    note: plan?.note ?? '',
    paidMonths: String(plan ? calculateInstallmentProgress(plan).monthsPaid : 0),
    principal: principal ? String(principal) : '',
    remainingOverride: typeof remainingSnapshot === 'number' ? String(remainingSnapshot) : '',
    dueDay: plan?.dueDay || plan?.paymentDay ? String(plan.dueDay ?? plan.paymentDay) : '',
    interestType: plan?.interestType ?? 'none',
    interestRate: plan?.interestRate ? String(plan.interestRate) : '',
    interestNote: plan?.interestNote ?? '',
  }
}

export function getCategoryOptions(data: AppData): string[] {
  return getCanonicalCategoryOptions(data)
}

export function buildInstallmentPlanFromForm(values: InstallmentFormValues, existing?: InstallmentPlan): InstallmentPlan {
  const now = currentIsoTimestamp()
  const monthsTotal = Math.max(1, Math.floor(Number(values.monthsTotal || 1)))
  const monthlyAmount = Math.max(0, Number(values.monthlyAmount || 0))
  const principal = Math.max(0, Number(values.principal || values.totalAmount || monthlyAmount * monthsTotal))
  const totalAmount = Math.max(monthlyAmount * monthsTotal, Number(values.totalAmount || principal || 0))
  const paidMonths = Math.max(0, Math.min(monthsTotal, Math.floor(Number(values.paidMonths || 0))))
  const startMonth = values.startMonth || currentMonthKey()
  const scheduleMonths = Array.from({ length: monthsTotal }, (_, index) => addMonths(startMonth, index))
  const paidMonthKeys = scheduleMonths.slice(0, paidMonths)
  const category = normalizeCategoryId(values.category, 'ผ่อนสินค้า')
  const dueDay = values.dueDay ? Math.min(31, Math.max(1, Math.floor(Number(values.dueDay)))) : undefined
  const interestRate = values.interestRate ? Math.max(0, Number(values.interestRate)) : null
  const interestType: InterestType = values.interestType
  const remainingOverride = values.remainingOverride === '' ? undefined : Math.max(0, Number(values.remainingOverride || 0))

  return {
    id: existing?.id ?? crypto.randomUUID(),
    name: values.name.trim(),
    category,
    categoryId: category,
    monthlyAmount,
    paymentAmount: monthlyAmount,
    monthsTotal,
    totalMonths: monthsTotal,
    installmentCount: monthsTotal,
    monthsPaid: paidMonths,
    paidMonths,
    paidMonthKeys,
    startMonth,
    dueDay,
    paymentDay: dueDay ?? null,
    principal,
    principalAmount: principal || totalAmount,
    remainingOverride,
    balanceSnapshotAmount: remainingOverride ?? null,
    balanceSnapshotMonth: remainingOverride == null ? null : currentMonthKey(),
    interestType,
    interestRate,
    interestNote: values.interestNote.trim() || undefined,
    note: values.note.trim() || undefined,
    tripId: existing?.tripId ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
}

export function validateInstallmentForm(values: InstallmentFormValues): string | null {
  if (!values.name.trim()) return 'กรอกชื่อแผนผ่อน'
  if (!values.startMonth) return 'เลือกเดือนเริ่มต้น'
  if (!Number.isFinite(Number(values.monthlyAmount)) || Number(values.monthlyAmount) <= 0) return 'กรอกยอดผ่อนต่อเดือนมากกว่า 0'
  if (!Number.isFinite(Number(values.monthsTotal)) || Number(values.monthsTotal) <= 0) return 'กรอกจำนวนเดือนอย่างน้อย 1 เดือน'
  if (values.totalAmount && (!Number.isFinite(Number(values.totalAmount)) || Number(values.totalAmount) <= 0)) return 'ยอดรวมต้องมากกว่า 0'
  if (values.principal && (!Number.isFinite(Number(values.principal)) || Number(values.principal) <= 0)) return 'เงินต้นต้องมากกว่า 0'
  if (values.remainingOverride && (!Number.isFinite(Number(values.remainingOverride)) || Number(values.remainingOverride) < 0)) return 'ยอดคงเหลือที่กำหนดเองต้องเป็น 0 หรือมากกว่า'
  if (values.dueDay && (!Number.isFinite(Number(values.dueDay)) || Number(values.dueDay) < 1 || Number(values.dueDay) > 31)) return 'วันครบกำหนดต้องอยู่ระหว่าง 1 ถึง 31'
  if (values.interestRate && (!Number.isFinite(Number(values.interestRate)) || Number(values.interestRate) < 0)) return 'อัตราดอกเบี้ยต้องเป็น 0 หรือมากกว่า'
  return null
}

export function setPaidMonth(plan: InstallmentPlan, monthKey: string, isPaid: boolean): InstallmentPlan {
  const scheduleMonths = getInstallmentScheduleMonths(plan)
  const paidSet = new Set(getPaidMonthKeys(plan))
  if (isPaid) paidSet.add(monthKey)
  else paidSet.delete(monthKey)
  const paidMonthKeys = scheduleMonths.filter((scheduleMonth) => paidSet.has(scheduleMonth))
  return {
    ...plan,
    paidMonthKeys,
    monthsPaid: paidMonthKeys.length,
    paidMonths: paidMonthKeys.length,
    updatedAt: currentIsoTimestamp(),
  }
}

export function createDefaultInstallmentFilters(): InstallmentFilters {
  return {
    keyword: '',
    status: 'all',
    startMonth: '',
    endMonth: '',
    sortOrder: 'start-asc',
  }
}

export function normalizeMonthRange(startMonth: string, endMonth: string): [string, string] {
  if (startMonth && endMonth && startMonth > endMonth) return [endMonth, startMonth]
  return [startMonth, endMonth]
}

export function compareInstallmentPlans(a: InstallmentPlan, b: InstallmentPlan, sortOrder: InstallmentSortOrder): number {
  const baseCompare = String(a.startMonth).localeCompare(String(b.startMonth)) || String(a.name).localeCompare(String(b.name))
  const aProgress = calculateInstallmentProgress(a)
  const bProgress = calculateInstallmentProgress(b)
  if (sortOrder === 'start-desc') return String(b.startMonth).localeCompare(String(a.startMonth)) || String(a.name).localeCompare(String(b.name))
  if (sortOrder === 'name-asc') return String(a.name).localeCompare(String(b.name)) || String(a.startMonth).localeCompare(String(b.startMonth))
  if (sortOrder === 'remaining-desc') return bProgress.remainingAmount - aProgress.remainingAmount || baseCompare
  if (sortOrder === 'remaining-asc') return aProgress.remainingAmount - bProgress.remainingAmount || baseCompare
  if (sortOrder === 'monthly-desc') return Number(b.monthlyAmount || 0) - Number(a.monthlyAmount || 0) || baseCompare
  if (sortOrder === 'status-active') {
    const aRank = aProgress.monthsRemaining > 0 ? 0 : 1
    const bRank = bProgress.monthsRemaining > 0 ? 0 : 1
    return aRank - bRank || baseCompare
  }
  return baseCompare
}

export function getInstallmentCalendarMonths(plans: InstallmentPlan[], filters?: InstallmentFilters): string[] {
  const [rangeStart, rangeEnd] = normalizeMonthRange(filters?.startMonth ?? '', filters?.endMonth ?? '')
  if (rangeStart && rangeEnd) {
    const months: string[] = []
    for (let cursor = rangeStart; cursor <= rangeEnd; cursor = addMonths(cursor, 1)) {
      months.push(cursor)
    }
    return months
  }

  const monthSet = new Set<string>()
  for (const plan of plans) {
    getInstallmentScheduleMonths(plan).forEach((monthKey) => monthSet.add(monthKey))
  }
  return Array.from(monthSet).sort().slice(0, 12)
}

export function deriveInstallmentTransactions(plans: InstallmentPlan[], monthKey?: string): TransactionEntry[] {
  return plans.flatMap((plan) => {
    const paidMonthKeys = new Set(getPaidMonthKeys(plan))
    return getInstallmentScheduleMonths(plan)
      .filter((scheduleMonth) => !monthKey || scheduleMonth === monthKey)
      .map((scheduleMonth) => {
        const dueDay = Math.min(31, Math.max(1, Number(plan.dueDay ?? plan.paymentDay ?? 1)))
        const date = `${scheduleMonth}-${String(dueDay).padStart(2, '0')}`
        return {
          id: `installment-${plan.id}-${scheduleMonth}`,
          type: 'expense',
          date,
          monthKey: getMonthKey(date),
          category: normalizeCategoryId(plan.categoryId || plan.category, 'ผ่อนสินค้า'),
          categoryId: normalizeCategoryId(plan.categoryId || plan.category, 'ผ่อนสินค้า'),
          title: plan.name,
          amount: Math.max(0, Number(plan.monthlyAmount || plan.paymentAmount || 0)),
          currency: 'THB',
          note: plan.interestNote || plan.note || 'รายการยอดผ่อน แก้ไขได้จากหน้ายอดผ่อน',
          status: paidMonthKeys.has(scheduleMonth) ? 'cleared' : 'pending',
          source: 'installment',
          sourceModule: 'installment',
          sourceRefId: plan.id,
          installmentId: plan.id,
          installmentPlanId: plan.id,
          recurringRuleId: null,
          goalId: null,
          createdAt: plan.createdAt,
          updatedAt: plan.updatedAt,
        } satisfies TransactionEntry
      })
  })
}


