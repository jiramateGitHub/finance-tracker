import type { InstallmentPlan } from '../../../types/finance'
import { addMonths as addMonthsToMonthKey, currentMonthInputValue, getSafeDateInMonth } from '../../../utils/formatters'

export const DEFAULT_INSTALLMENT_DUE_DAY = 25

/** Keep installment schedule arithmetic on the shared month-key utility. */
export const addMonths = addMonthsToMonthKey

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

export function getInstallmentDueDay(plan: InstallmentPlan): number {
  const rawDueDay = Number(plan.dueDay ?? plan.paymentDay)
  return Number.isInteger(rawDueDay) && rawDueDay >= 1 && rawDueDay <= 31
    ? rawDueDay
    : DEFAULT_INSTALLMENT_DUE_DAY
}

export function getPaidMonthKeys(plan: InstallmentPlan, scheduleMonths = getInstallmentScheduleMonths(plan)): string[] {
  if (Array.isArray(plan.paidMonthKeys)) {
    const explicitKeys = Array.from(new Set(plan.paidMonthKeys.filter((monthKey) => scheduleMonths.includes(monthKey))))
    const keySet = new Set(explicitKeys)
    return scheduleMonths.filter((monthKey) => keySet.has(monthKey))
  }
  const paidCount = Math.max(0, Math.min(scheduleMonths.length, Number(plan.monthsPaid ?? plan.paidMonths ?? 0)))
  return scheduleMonths.slice(0, paidCount)
}

export { getSafeDateInMonth }

export function getInstallmentDueDate(plan: InstallmentPlan, monthKey: string): string {
  return getSafeDateInMonth(monthKey, String(getInstallmentDueDay(plan)))
}

