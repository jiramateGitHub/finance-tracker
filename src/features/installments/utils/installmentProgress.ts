import type { InstallmentPlan } from '../../../types/finance'
import {
  currentMonthKey,
  getInstallmentDueDate,
  getInstallmentDueDay,
  getInstallmentScheduleMonths,
  getPaidMonthKeys,
  monthDiff,
} from './installmentSchedule'

export type InstallmentProgress = {
  totalAmount: number
  principalAmount: number | null
  totalPaid: number
  remainingAmount: number
  snapshotRemainingAmount: number | null
  snapshotMonth: string | null
  progressPercent: number
  monthsPaid: number
  monthsRemaining: number
  scheduleMonths: string[]
  paidMonthKeys: string[]
  endMonth: string
}

export function calculateInstallmentProgress(plan: InstallmentPlan): InstallmentProgress {
  const scheduleMonths = getInstallmentScheduleMonths(plan)
  const paidMonthKeys = getPaidMonthKeys(plan, scheduleMonths)
  const monthlyAmount = Math.max(0, Number(plan.monthlyAmount || plan.paymentAmount || 0))
  const principalTotal = Number(plan.principal ?? plan.principalAmount)
  const principalAmount = Number.isFinite(principalTotal) && principalTotal > 0 ? principalTotal : null
  const contractualTotal = monthlyAmount * scheduleMonths.length
  // The schedule is the source of truth for payable cashflow. Principal is
  // retained as a separate reference and only fills an empty schedule.
  const totalAmount = contractualTotal > 0 ? contractualTotal : principalAmount ?? 0
  const monthsPaid = paidMonthKeys.length
  const totalPaid = Math.min(totalAmount, monthlyAmount * monthsPaid)
  const computedRemaining = Math.max(0, totalAmount - totalPaid)
  const rawSnapshot = plan.balanceSnapshotAmount ?? plan.remainingOverride
  const snapshotRemainingAmount = typeof rawSnapshot === 'number' && Number.isFinite(rawSnapshot)
    ? Math.max(0, rawSnapshot)
    : null
  const progressPercent = totalAmount > 0 ? Math.min(100, Math.round((totalPaid / totalAmount) * 100)) : 0

  return {
    totalAmount,
    principalAmount,
    totalPaid,
    remainingAmount: computedRemaining,
    snapshotRemainingAmount,
    snapshotMonth: plan.balanceSnapshotMonth ?? null,
    progressPercent,
    monthsPaid,
    monthsRemaining: Math.max(0, scheduleMonths.length - monthsPaid),
    scheduleMonths,
    paidMonthKeys,
    endMonth: scheduleMonths.at(-1) ?? '',
  }
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
  const effectiveMonth = selectedMonth || currentMonthKey()
  const totalMonths = progress.scheduleMonths.length
  const endYM = progress.endMonth || startYM
  const paidCount = progress.monthsPaid
  const remainingMonths = progress.monthsRemaining
  const isCompleted = remainingMonths === 0
  const monthlyPayment = Math.max(0, Number(plan.monthlyAmount || plan.paymentAmount || 0))
  const remainingBalance = progress.remainingAmount
  const progressPercent = progress.progressPercent

  const diff = monthDiff(startYM, effectiveMonth)
  const isActiveInMonth = diff >= 0 && diff < totalMonths
  const termInMonth = diff + 1
  const isPaidInMonth = progress.paidMonthKeys.includes(effectiveMonth)

  const dueDay = getInstallmentDueDay(plan)
  const dueDateStr = getInstallmentDueDate(plan, effectiveMonth)
  const actualDueDay = Number(dueDateStr.slice(-2))

  const todayYear = today.getFullYear()
  const todayMonthNum = today.getMonth() + 1
  const todayDate = today.getDate()
  const todayMonthStr = `${todayYear}-${String(todayMonthNum).padStart(2, '0')}`
  const todayStr = `${todayMonthStr}-${String(todayDate).padStart(2, '0')}`
  let isOverdue = false
  let isDueSoon = false
  let daysUntilDue: number | null = null

  if (isActiveInMonth && !isPaidInMonth && !isCompleted) {
    if (dueDateStr < todayStr) {
      isOverdue = true
      daysUntilDue = getDateDifferenceInDays(todayStr, dueDateStr)
    } else if (effectiveMonth === todayMonthStr) {
      daysUntilDue = getDateDifferenceInDays(todayStr, dueDateStr)
      if (daysUntilDue >= 0 && daysUntilDue <= 3) isDueSoon = true
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

function getDateDifferenceInDays(fromDate: string, toDate: string): number {
  const [fromYear, fromMonth, fromDay] = fromDate.split('-').map(Number)
  const [toYear, toMonth, toDay] = toDate.split('-').map(Number)
  const from = new Date(fromYear, fromMonth - 1, fromDay).getTime()
  const to = new Date(toYear, toMonth - 1, toDay).getTime()
  if (![from, to].every(Number.isFinite)) return 0
  return Math.round((to - from) / (24 * 60 * 60 * 1000))
}

