import type { FinanceData } from '../../../types/finance'
import { getInstallmentDueDate, getInstallmentScheduleMonths } from '../../installments/utils/installmentSchedule'
import { getRecurringRuleDueDate } from '../../recurring/utils/recurringBills'
import type { ExportOptions, ExportPeriod } from '../exportTypes'

export const EXPORT_CATEGORIES = ['income', 'expense', 'debt', 'bill', 'trip'] as const

export function getBangkokDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function isReportDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01') return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function validateExportOptions(options: ExportOptions): string | null {
  if (!isReportDate(options.startDate) || !isReportDate(options.endDate)) return 'เลือกวันที่เริ่มและวันที่สิ้นสุดที่ถูกต้อง'
  if (options.startDate > options.endDate) return 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่ม'
  const months = (Number(options.endDate.slice(0, 4)) - Number(options.startDate.slice(0, 4))) * 12
    + Number(options.endDate.slice(5, 7)) - Number(options.startDate.slice(5, 7)) + 1
  if (months > 1200) return 'เลือกช่วงเวลาไม่เกิน 100 ปีต่อไฟล์'
  if (!options.categories.length || options.categories.some((category) => !EXPORT_CATEGORIES.includes(category))) return 'เลือกอย่างน้อยหนึ่งหมวดข้อมูล'
  if (!Number.isFinite(new Date(options.exportedAt).getTime())) return 'วันที่ส่งออกไม่ถูกต้อง'
  return null
}

export function getExportDateRange(data: FinanceData, period: Exclude<ExportPeriod, 'custom'>, today = getBangkokDate()): [string, string] {
  const year = today.slice(0, 4)
  if (period === 'year') return [`${year}-01-01`, `${year}-12-31`]
  if (period === 'month') {
    const month = today.slice(0, 7)
    const lastDay = new Date(Date.UTC(Number(year), Number(today.slice(5, 7)), 0)).getUTCDate()
    return [`${month}-01`, `${month}-${lastDay}`]
  }
  const dates = [
    ...data.transactions.map((entry) => entry.date),
    ...data.trips.flatMap((trip) => [trip.startDate, trip.endDate, ...trip.items.map((item) => item.date)]),
    ...data.installmentPlans.flatMap((plan) => {
      const months = getInstallmentScheduleMonths(plan)
      return [months[0], months.at(-1)].filter((month): month is string => Boolean(month))
        .map((month) => getInstallmentDueDate(plan, month))
    }),
    ...data.recurringRules.flatMap((rule) => [
      rule.startDate ?? today,
      rule.endDate ?? today,
      ...(rule.paidMonthKeys ?? []).map((month) => getRecurringRuleDueDate(rule, month)),
    ]),
  ].filter((date): date is string => typeof date === 'string' && isReportDate(date)).sort()
  return dates.length ? [dates[0], dates.at(-1)!] : getExportDateRange(data, 'month', today)
}
