import { getCanonicalCategoryOptions, normalizeCategoryId } from '../../../data/categories'
import type { AppData, InstallmentPlan, InterestType, TransactionEntry } from '../../../types/finance'
import { currentIsoTimestamp, currentMonthInputValue, getMonthKey, parseAmountSafe } from '../../../utils/formatters'

export type InstallmentViewMode = 'list' | 'table' | 'calendar'
export type InstallmentStatusFilter = 'all' | 'dueThisMonth' | 'unpaid' | 'paid' | 'completed' | 'active'
export type InstallmentSortOrder =
  | 'dueDay'
  | 'amountDesc'
  | 'amountAsc'
  | 'remainingDesc'
  | 'remainingAsc'
  | 'progressDesc'
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
  category?: string
  startMonth: string
  endMonth: string
  sortOrder: InstallmentSortOrder
  selectedMonth?: string
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

export function monthDiff(ym1: string, ym2: string): number {
  if (!ym1 || !ym2) return 0
  const [y1, m1] = ym1.split('-').map(Number)
  const [y2, m2] = ym2.split('-').map(Number)
  return (y2 - y1) * 12 + (m2 - m1)
}

export function currentMonthKey(): string {
  return currentMonthInputValue()
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

export type InstallmentMonthlyInfo = {
  progress: InstallmentProgress
  startYM: string
  endYM: string
  totalMonths: number
  paidCount: number
  remainingMonths: number
  monthlyPayment: number
  remainingBalance: number
  progressPercent: number
  isActiveInMonth: boolean
  isPaidInMonth: boolean
  isCompleted: boolean
  termInMonth: number
  dueDay: number
  actualDueDay: number
  isOverdue: boolean
  isDueSoon: boolean
  daysUntilDue: number | null
}

export function calculateInstallmentMonthlyInfo(
  plan: InstallmentPlan,
  selectedMonth: string,
  today: Date = new Date(),
): InstallmentMonthlyInfo {
  const progress = calculateInstallmentProgress(plan)
  const startYM = plan.startMonth || currentMonthKey()
  const totalMonths = progress.scheduleMonths.length
  const endYM = progress.endMonth || startYM
  const paidCount = progress.monthsPaid
  const remainingMonths = progress.monthsRemaining
  const isCompleted = remainingMonths === 0
  const monthlyPayment = Math.max(0, Number(plan.monthlyAmount || plan.paymentAmount || 0))
  const remainingBalance = progress.remainingAmount
  const progressPercent = progress.progressPercent

  const diff = monthDiff(startYM, selectedMonth)
  const isActiveInMonth = diff >= 0 && diff < totalMonths
  const termInMonth = diff + 1
  const isPaidInMonth = progress.paidMonthKeys.includes(selectedMonth)

  const rawDueDay = Number(plan.dueDay ?? plan.paymentDay ?? 25)
  const dueDay = Number.isFinite(rawDueDay) && rawDueDay >= 1 && rawDueDay <= 31 ? Math.floor(rawDueDay) : 25

  const [vYear, vMonth] = (selectedMonth || currentMonthKey()).split('-').map(Number)
  const daysInMonth = Number.isFinite(vYear) && Number.isFinite(vMonth) ? new Date(vYear, vMonth, 0).getDate() : 31
  const actualDueDay = Math.min(dueDay, daysInMonth)

  const todayYear = today.getFullYear()
  const todayMonthNum = today.getMonth() + 1
  const todayDate = today.getDate()
  const todayMonthStr = `${todayYear}-${String(todayMonthNum).padStart(2, '0')}`
  const todayStr = `${todayMonthStr}-${String(todayDate).padStart(2, '0')}`
  const dueDateStr = `${selectedMonth}-${String(actualDueDay).padStart(2, '0')}`

  let isOverdue = false
  let isDueSoon = false
  let daysUntilDue: number | null = null

  if (isActiveInMonth && !isPaidInMonth && !isCompleted) {
    if (dueDateStr < todayStr) {
      isOverdue = true
      daysUntilDue = actualDueDay - todayDate
    } else if (selectedMonth === todayMonthStr) {
      daysUntilDue = actualDueDay - todayDate
      if (daysUntilDue >= 0 && daysUntilDue <= 3) {
        isDueSoon = true
      }
    }
  }

  return {
    progress,
    startYM,
    endYM,
    totalMonths,
    paidCount,
    remainingMonths,
    monthlyPayment,
    remainingBalance,
    progressPercent,
    isActiveInMonth,
    isPaidInMonth,
    isCompleted,
    termInMonth,
    dueDay,
    actualDueDay,
    isOverdue,
    isDueSoon,
    daysUntilDue,
  }
}

export type InstallmentDashboardMetrics = {
  selectedMonth: string
  totalDueThisMonth: number
  totalPaidThisMonth: number
  remainingThisMonth: number
  paidMonthPercent: number
  totalLifetimeDebt: number
  totalLifetimePaid: number
  totalLifetimeOriginal: number
  lifetimePercent: number
  activeCountThisMonth: number
  paidCountThisMonth: number
  pendingCountThisMonth: number
  overdueCountThisMonth: number
  dueSoonCountThisMonth: number
  nextPayoffCandidate: {
    plan: InstallmentPlan
    remainingMonths: number
    endMonth: string
    monthlyAmount: number
  } | null
  urgentPlans: Array<{
    plan: InstallmentPlan
    type: 'overdue' | 'dueSoon'
    actualDueDay: number
    monthlyAmount: number
  }>
}

export function getInstallmentDashboardMetrics(
  plans: InstallmentPlan[],
  selectedMonth: string = currentMonthKey(),
  today: Date = new Date(),
): InstallmentDashboardMetrics {
  let totalDueThisMonth = 0
  let totalPaidThisMonth = 0
  let activeCountThisMonth = 0
  let paidCountThisMonth = 0
  let pendingCountThisMonth = 0
  let overdueCountThisMonth = 0
  let dueSoonCountThisMonth = 0

  let totalLifetimeDebt = 0
  let totalLifetimePaid = 0
  let totalLifetimeOriginal = 0

  let nextPayoffCandidate: InstallmentDashboardMetrics['nextPayoffCandidate'] = null
  const urgentPlans: InstallmentDashboardMetrics['urgentPlans'] = []

  plans.forEach((plan) => {
    const info = calculateInstallmentMonthlyInfo(plan, selectedMonth, today)
    const { progress } = info

    totalLifetimeOriginal += progress.totalAmount
    totalLifetimePaid += progress.totalPaid
    totalLifetimeDebt += progress.remainingAmount

    // Next payoff milestone (earliest completion date among active non-completed items)
    if (!info.isCompleted && info.remainingMonths > 0) {
      if (
        !nextPayoffCandidate ||
        info.endYM < nextPayoffCandidate.endMonth ||
        (info.endYM === nextPayoffCandidate.endMonth && info.remainingMonths < nextPayoffCandidate.remainingMonths)
      ) {
        nextPayoffCandidate = {
          plan,
          remainingMonths: info.remainingMonths,
          endMonth: info.endYM,
          monthlyAmount: info.monthlyPayment,
        }
      }
    }

    if (info.isActiveInMonth) {
      activeCountThisMonth += 1
      totalDueThisMonth += info.monthlyPayment

      if (info.isPaidInMonth) {
        paidCountThisMonth += 1
        totalPaidThisMonth += info.monthlyPayment
      } else if (!info.isCompleted) {
        pendingCountThisMonth += 1
        if (info.isOverdue) {
          overdueCountThisMonth += 1
          urgentPlans.push({
            plan,
            type: 'overdue',
            actualDueDay: info.actualDueDay,
            monthlyAmount: info.monthlyPayment,
          })
        } else if (info.isDueSoon) {
          dueSoonCountThisMonth += 1
          urgentPlans.push({
            plan,
            type: 'dueSoon',
            actualDueDay: info.actualDueDay,
            monthlyAmount: info.monthlyPayment,
          })
        }
      }
    }
  })

  const remainingThisMonth = Math.max(0, totalDueThisMonth - totalPaidThisMonth)
  const paidMonthPercent = totalDueThisMonth > 0 ? Math.round((totalPaidThisMonth / totalDueThisMonth) * 100) : (totalPaidThisMonth > 0 ? 100 : 0)
  const lifetimePercent = totalLifetimeOriginal > 0 ? Math.round((totalLifetimePaid / totalLifetimeOriginal) * 100) : 0

  return {
    selectedMonth,
    totalDueThisMonth,
    totalPaidThisMonth,
    remainingThisMonth,
    paidMonthPercent,
    totalLifetimeDebt,
    totalLifetimePaid,
    totalLifetimeOriginal,
    lifetimePercent,
    activeCountThisMonth,
    paidCountThisMonth,
    pendingCountThisMonth,
    overdueCountThisMonth,
    dueSoonCountThisMonth,
    nextPayoffCandidate,
    urgentPlans,
  }
}

export type InstallmentProjectionMonth = {
  monthKey: string
  label: string
  totalDue: number
  finishingPlans: string[]
}

export type Installment12MonthProjection = {
  months: InstallmentProjectionMonth[]
  maxMonthlyDue: number
  firstMilestone: {
    monthKey: string
    label: string
    finishingPlans: string[]
  } | null
}

export function getInstallment12MonthProjection(
  plans: InstallmentPlan[],
  startMonth: string = currentMonthKey(),
): Installment12MonthProjection {
  const months: InstallmentProjectionMonth[] = []
  let maxMonthlyDue = 0
  let firstMilestone: Installment12MonthProjection['firstMilestone'] = null

  for (let i = 0; i < 12; i++) {
    const targetYM = addMonths(startMonth, i)
    let totalDue = 0
    const finishingPlans: string[] = []

    plans.forEach((plan) => {
      const progress = calculateInstallmentProgress(plan)
      if (progress.monthsRemaining === 0) return

      const startYM = plan.startMonth || currentMonthKey()
      const diff = monthDiff(startYM, targetYM)
      if (diff >= 0 && diff < progress.scheduleMonths.length) {
        const isTargetPaid = progress.paidMonthKeys.includes(targetYM)
        if (!isTargetPaid) {
          totalDue += Math.max(0, Number(plan.monthlyAmount || plan.paymentAmount || 0))
        }
        if (targetYM === progress.endMonth) {
          finishingPlans.push(plan.name)
        }
      }
    })

    if (totalDue > maxMonthlyDue) {
      maxMonthlyDue = totalDue
    }

    const monthData: InstallmentProjectionMonth = {
      monthKey: targetYM,
      label: targetYM,
      totalDue: Math.round(totalDue),
      finishingPlans,
    }

    if (finishingPlans.length > 0 && !firstMilestone) {
      firstMilestone = {
        monthKey: targetYM,
        label: targetYM,
        finishingPlans,
      }
    }

    months.push(monthData)
  }

  return {
    months,
    maxMonthlyDue: Math.max(maxMonthlyDue, 1),
    firstMilestone,
  }
}

export type InstallmentCategorySlice = {
  category: string
  totalAmount: number
  planCount: number
  percentage: number
  color: string
}

export type InstallmentCategoryDistribution = {
  slices: InstallmentCategorySlice[]
  totalMonthlyDue: number
}

const CATEGORY_CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#64748b', // slate
]

export function getInstallmentCategoryDistribution(
  plans: InstallmentPlan[],
  selectedMonth: string = currentMonthKey(),
): InstallmentCategoryDistribution {
  const catMap = new Map<string, { totalAmount: number; planCount: number }>()
  let totalMonthlyDue = 0

  plans.forEach((plan) => {
    const info = calculateInstallmentMonthlyInfo(plan, selectedMonth)
    if (info.isActiveInMonth && (!info.isCompleted || info.isPaidInMonth)) {
      const cat = plan.category || 'ผ่อนสินค้า'
      const current = catMap.get(cat) ?? { totalAmount: 0, planCount: 0 }
      current.totalAmount += info.monthlyPayment
      current.planCount += 1
      catMap.set(cat, current)
      totalMonthlyDue += info.monthlyPayment
    }
  })

  const sortedCategories = Array.from(catMap.entries()).sort((a, b) => b[1].totalAmount - a[1].totalAmount)

  const slices: InstallmentCategorySlice[] = sortedCategories.map(([category, data], idx) => {
    const percentage = totalMonthlyDue > 0 ? Math.round((data.totalAmount / totalMonthlyDue) * 100) : 0
    const color = CATEGORY_CHART_COLORS[idx % CATEGORY_CHART_COLORS.length]
    return {
      category,
      totalAmount: data.totalAmount,
      planCount: data.planCount,
      percentage,
      color,
    }
  })

  return {
    slices,
    totalMonthlyDue,
  }
}

export function filterInstallmentPlans(plans: InstallmentPlan[], filters: InstallmentFilters): InstallmentPlan[] {
  const keyword = filters.keyword.trim().toLocaleLowerCase()
  const [rangeStart, rangeEnd] = normalizeMonthRange(filters.startMonth, filters.endMonth)
  const currentMonth = filters.selectedMonth || currentMonthKey()

  return plans
    .filter((plan) => {
      const info = calculateInstallmentMonthlyInfo(plan, currentMonth)
      if (filters.status === 'dueThisMonth') return info.isActiveInMonth
      if (filters.status === 'unpaid') return info.isActiveInMonth && !info.isPaidInMonth && !info.isCompleted
      if (filters.status === 'paid') return info.isActiveInMonth && info.isPaidInMonth
      if (filters.status === 'completed') return info.isCompleted
      if (filters.status === 'active') return info.remainingMonths > 0
      return true
    })
    .filter((plan) => {
      if (!filters.category || filters.category === 'all') return true
      const cat = String(plan.categoryId || plan.category || '')
      return cat === filters.category
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
  const monthlyAmount = Math.max(0, parseAmountSafe(values.monthlyAmount, 0))
  const parsedTotal = parseAmountSafe(values.totalAmount, 0)
  const parsedPrincipal = parseAmountSafe(values.principal, 0)
  const principal = Math.max(0, parsedPrincipal || parsedTotal || monthlyAmount * monthsTotal)
  const totalAmount = Math.max(monthlyAmount * monthsTotal, parsedTotal || principal || 0)
  const paidMonths = Math.max(0, Math.min(monthsTotal, Math.floor(Number(values.paidMonths || 0))))
  const startMonth = values.startMonth || currentMonthKey()
  const scheduleMonths = Array.from({ length: monthsTotal }, (_, index) => addMonths(startMonth, index))
  const paidMonthKeys = scheduleMonths.slice(0, paidMonths)
  const category = normalizeCategoryId(values.category, 'ผ่อนสินค้า')
  const dueDay = values.dueDay ? Math.min(31, Math.max(1, Math.floor(Number(values.dueDay)))) : undefined
  const interestRate = values.interestRate ? Math.max(0, parseAmountSafe(values.interestRate, 0)) : null
  const interestType: InterestType = values.interestType
  const remainingOverride = values.remainingOverride.trim() === '' ? undefined : Math.max(0, parseAmountSafe(values.remainingOverride, 0))

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
  const monthlyAmount = parseAmountSafe(values.monthlyAmount, Number.NaN)
  if (!Number.isFinite(monthlyAmount) || monthlyAmount <= 0) return 'กรอกยอดผ่อนต่อเดือนมากกว่า 0'
  const monthsTotal = Number(values.monthsTotal)
  if (!Number.isFinite(monthsTotal) || !Number.isInteger(monthsTotal) || monthsTotal <= 0) return 'จำนวนเดือนต้องเป็นจำนวนเต็มอย่างน้อย 1 เดือน'
  if (values.paidMonths.trim()) {
    const paidMonths = Number(values.paidMonths)
    if (!Number.isFinite(paidMonths) || !Number.isInteger(paidMonths) || paidMonths < 0) {
      return 'จำนวนเดือนที่จ่ายแล้วต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป'
    }
    if (paidMonths > monthsTotal) {
      return 'จำนวนเดือนที่จ่ายแล้วต้องไม่เกินจำนวนเดือนทั้งหมด'
    }
  }
  if (values.totalAmount.trim()) {
    const total = parseAmountSafe(values.totalAmount, Number.NaN)
    if (!Number.isFinite(total) || total <= 0) return 'ยอดรวมต้องมากกว่า 0'
  }
  if (values.principal.trim()) {
    const principal = parseAmountSafe(values.principal, Number.NaN)
    if (!Number.isFinite(principal) || principal <= 0) return 'เงินต้นต้องมากกว่า 0'
  }
  if (values.remainingOverride.trim()) {
    const remaining = parseAmountSafe(values.remainingOverride, Number.NaN)
    if (!Number.isFinite(remaining) || remaining < 0) return 'ยอดคงเหลือที่กำหนดเองต้องเป็น 0 หรือมากกว่า'
  }
  if (values.dueDay.trim()) {
    const due = Number(values.dueDay)
    if (!Number.isFinite(due) || !Number.isInteger(due) || due < 1 || due > 31) return 'วันครบกำหนดต้องเป็นวันที่ 1 ถึง 31'
  }
  if (values.interestRate.trim()) {
    const rate = parseAmountSafe(values.interestRate, Number.NaN)
    if (!Number.isFinite(rate) || rate < 0) return 'อัตราดอกเบี้ยต้องเป็น 0 หรือมากกว่า'
  }
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

export function setAllMonthsPaid(plan: InstallmentPlan, isPaid: boolean): InstallmentPlan {
  const scheduleMonths = getInstallmentScheduleMonths(plan)
  const paidMonthKeys = isPaid ? [...scheduleMonths] : []
  return {
    ...plan,
    paidMonthKeys,
    monthsPaid: paidMonthKeys.length,
    paidMonths: paidMonthKeys.length,
    remainingOverride: isPaid ? 0 : undefined,
    balanceSnapshotAmount: isPaid ? 0 : null,
    updatedAt: currentIsoTimestamp(),
  }
}

export function createDefaultInstallmentFilters(selectedMonth = currentMonthKey()): InstallmentFilters {
  return {
    keyword: '',
    status: 'all',
    category: 'all',
    startMonth: '',
    endMonth: '',
    sortOrder: 'dueDay',
    selectedMonth,
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
  const aMonthly = Number(a.monthlyAmount || 0)
  const bMonthly = Number(b.monthlyAmount || 0)
  const aDueDay = Number(a.dueDay ?? a.paymentDay ?? 25)
  const bDueDay = Number(b.dueDay ?? b.paymentDay ?? 25)

  if (sortOrder === 'dueDay') return aDueDay - bDueDay || baseCompare
  if (sortOrder === 'amountDesc' || sortOrder === 'monthly-desc') return bMonthly - aMonthly || baseCompare
  if (sortOrder === 'amountAsc') return aMonthly - bMonthly || baseCompare
  if (sortOrder === 'remainingDesc' || sortOrder === 'remaining-desc') return bProgress.remainingAmount - aProgress.remainingAmount || baseCompare
  if (sortOrder === 'remainingAsc' || sortOrder === 'remaining-asc') return aProgress.remainingAmount - bProgress.remainingAmount || baseCompare
  if (sortOrder === 'progressDesc') return bProgress.progressPercent - aProgress.progressPercent || baseCompare
  if (sortOrder === 'start-desc') return String(b.startMonth).localeCompare(String(a.startMonth)) || String(a.name).localeCompare(String(b.name))
  if (sortOrder === 'start-asc') return String(a.startMonth).localeCompare(String(b.startMonth)) || String(a.name).localeCompare(String(b.name))
  if (sortOrder === 'name-asc') return String(a.name).localeCompare(String(b.name)) || String(a.startMonth).localeCompare(String(b.startMonth))
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

export function getSafeDateInMonth(monthKey: string, dayText: string): string {
  const [yearText, monthText] = monthKey.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const requestedDay = Number(dayText)
  const day = Number.isFinite(requestedDay) && requestedDay >= 1 ? Math.floor(requestedDay) : 1
  const lastDay = Number.isFinite(year) && Number.isFinite(month)
    ? new Date(year, month, 0).getDate()
    : 1
  return `${monthKey}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
}

export function deriveInstallmentTransactions(plans: InstallmentPlan[], monthKey?: string): TransactionEntry[] {
  return plans.flatMap((plan) => {
    const paidMonthKeys = new Set(getPaidMonthKeys(plan))
    return getInstallmentScheduleMonths(plan)
      .filter((scheduleMonth) => !monthKey || scheduleMonth === monthKey)
      .map((scheduleMonth) => {
        const date = getSafeDateInMonth(scheduleMonth, String(plan.dueDay ?? plan.paymentDay ?? 1))
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
