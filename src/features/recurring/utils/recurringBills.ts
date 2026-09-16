import type { InstallmentPlan, RecurringBillType, RecurringRule } from '../../../types/finance'
import { currentMonthInputValue, getSafeDateInMonth } from '../../../utils/formatters'
import type { SemanticTone } from '../../../constants/theme'
import { calculateInstallmentMonthlyInfo, type InstallmentMonthlyInfo } from '../../installments/utils/installmentPlans'

export type RecurringBillStatus = 'overdue' | 'dueSoon' | 'upcoming' | 'paid' | 'inactive'

export interface RecurringMonthlyInfo {
  dueDateStr: string
  actualDueDay: number
  statementDateStr: string | null
  actualStatementDay: number | null
  isActiveInMonth: boolean
  isPaid: boolean
  isOverdue: boolean
  isDueSoon: boolean
  daysUntilDue: number | null
  status: RecurringBillStatus
  effectiveAmount: number
}

export const RECURRING_TYPE_CONFIG: Record<
  RecurringBillType,
  { label: string; icon: string; defaultCategory: string; tone: SemanticTone }
> = {
  credit_card: {
    label: 'บัตรเครดิต',
    icon: '💳',
    defaultCategory: 'หนี้สินและการเงิน',
    tone: 'primary',
  },
  utility: {
    label: 'สาธารณูปโภค / บิลบ้าน',
    icon: '⚡',
    defaultCategory: 'สาธารณูปโภค',
    tone: 'warning',
  },
  subscription: {
    label: 'สมาชิก / บริการรายเดือน',
    icon: '🍿',
    defaultCategory: 'บันเทิง',
    tone: 'neutral',
  },
  loan: {
    label: 'สินเชื่อ / ผ่อนชำระ',
    icon: '🏦',
    defaultCategory: 'หนี้สินและการเงิน',
    tone: 'expense',
  },
  insurance: {
    label: 'ประกันชีวิต / สุขภาพ',
    icon: '🛡️',
    defaultCategory: 'ประกัน',
    tone: 'income',
  },
  other: {
    label: 'บิลอื่นๆ',
    icon: '📄',
    defaultCategory: 'อื่นๆ',
    tone: 'neutral',
  },
}

export function getDateDifferenceInDays(fromDate: string, toDate: string): number {
  const [fromYear, fromMonth, fromDay] = fromDate.split('-').map(Number)
  const [toYear, toMonth, toDay] = toDate.split('-').map(Number)
  const from = new Date(fromYear, fromMonth - 1, fromDay).getTime()
  const to = new Date(toYear, toMonth - 1, toDay).getTime()
  if (![from, to].every(Number.isFinite)) return 0
  return Math.round((to - from) / (24 * 60 * 60 * 1000))
}

export function getRecurringRuleDueDay(rule: RecurringRule): number {
  const rawDueDay = Number(rule.dueDay ?? rule.dayOfMonth)
  return Number.isInteger(rawDueDay) && rawDueDay >= 1 && rawDueDay <= 31
    ? rawDueDay
    : 1
}

export function getRecurringRuleDueDate(rule: RecurringRule, monthKey: string): string {
  return getSafeDateInMonth(monthKey, String(getRecurringRuleDueDay(rule)))
}

export function getRecurringRuleStatementDate(rule: RecurringRule, monthKey: string): string | null {
  const statementDay = Number(rule.statementDay)
  if (!Number.isInteger(statementDay) || statementDay < 1 || statementDay > 31) {
    return null
  }
  return getSafeDateInMonth(monthKey, String(statementDay))
}

export function isRecurringRuleActiveInMonth(
  rule: RecurringRule,
  monthKey: string = currentMonthInputValue(),
): boolean {
  if (rule.isActive === false) return false
  if (rule.startDate && monthKey < rule.startDate.slice(0, 7)) return false
  if (rule.endDate && monthKey > rule.endDate.slice(0, 7)) return false
  return true
}

export function calculateRecurringMonthlyInfo(
  rule: RecurringRule,
  selectedMonth: string = currentMonthInputValue(),
  today: Date = new Date(),
): RecurringMonthlyInfo {
  const effectiveMonth = selectedMonth || currentMonthInputValue()
  const dueDateStr = getRecurringRuleDueDate(rule, effectiveMonth)
  const actualDueDay = Number(dueDateStr.slice(-2))
  const statementDateStr = getRecurringRuleStatementDate(rule, effectiveMonth)
  const actualStatementDay = statementDateStr ? Number(statementDateStr.slice(-2)) : null

  const isPaid = Array.isArray(rule.paidMonthKeys) && rule.paidMonthKeys.includes(effectiveMonth)
  const effectiveAmount = Math.max(0, Number(rule.amount || 0))
  const isActiveInMonth = isRecurringRuleActiveInMonth(rule, effectiveMonth)

  const todayYear = today.getFullYear()
  const todayMonthNum = today.getMonth() + 1
  const todayDate = today.getDate()
  const todayMonthStr = `${todayYear}-${String(todayMonthNum).padStart(2, '0')}`
  const todayStr = `${todayMonthStr}-${String(todayDate).padStart(2, '0')}`

  let isOverdue = false
  let isDueSoon = false
  let daysUntilDue: number | null = null

  if (isActiveInMonth && !isPaid) {
    daysUntilDue = getDateDifferenceInDays(todayStr, dueDateStr)
    if (dueDateStr < todayStr) {
      isOverdue = true
    } else if (effectiveMonth === todayMonthStr) {
      if (daysUntilDue >= 0 && daysUntilDue <= 3) {
        isDueSoon = true
      }
    }
  }

  const status: RecurringBillStatus = isPaid
    ? 'paid'
    : !isActiveInMonth
      ? 'inactive'
      : isOverdue
        ? 'overdue'
        : isDueSoon
          ? 'dueSoon'
          : 'upcoming'

  return {
    dueDateStr,
    actualDueDay,
    statementDateStr,
    actualStatementDay,
    isActiveInMonth,
    isPaid,
    isOverdue,
    isDueSoon,
    daysUntilDue,
    status,
    effectiveAmount,
  }
}

export interface RecurringDashboardMetrics {
  selectedMonth: string
  totalCount: number
  activeCount: number
  totalAmount: number
  paidAmount: number
  unpaidAmount: number
  paidCount: number
  unpaidCount: number
  overdueCount: number
  dueSoonCount: number
  urgentBills: Array<{
    rule: RecurringRule
    type: 'overdue' | 'dueSoon'
    info: RecurringMonthlyInfo
  }>
}

export function getRecurringDashboardMetrics(
  rules: RecurringRule[],
  selectedMonth: string = currentMonthInputValue(),
  today: Date = new Date(),
): RecurringDashboardMetrics {
  let totalAmount = 0
  let paidAmount = 0
  let activeCount = 0
  let paidCount = 0
  let unpaidCount = 0
  let overdueCount = 0
  let dueSoonCount = 0
  const urgentBills: RecurringDashboardMetrics['urgentBills'] = []

  rules.forEach((rule) => {
    const info = calculateRecurringMonthlyInfo(rule, selectedMonth, today)
    if (!info.isActiveInMonth && !info.isPaid) return
    activeCount += 1
    totalAmount += info.effectiveAmount

    if (info.isPaid) {
      paidCount += 1
      paidAmount += info.effectiveAmount
    } else {
      unpaidCount += 1
      if (info.isOverdue) {
        overdueCount += 1
        urgentBills.push({ rule, type: 'overdue', info })
      } else if (info.isDueSoon) {
        dueSoonCount += 1
        urgentBills.push({ rule, type: 'dueSoon', info })
      }
    }
  })

  // Sort urgent bills: overdue by days first, then dueSoon by days
  urgentBills.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'overdue' ? -1 : 1
    return (a.info.daysUntilDue ?? 0) - (b.info.daysUntilDue ?? 0)
  })

  const unpaidAmount = Math.max(0, totalAmount - paidAmount)

  return {
    selectedMonth,
    totalCount: rules.length,
    activeCount,
    totalAmount,
    paidAmount,
    unpaidAmount,
    paidCount,
    unpaidCount,
    overdueCount,
    dueSoonCount,
    urgentBills,
  }
}

export type RecurringFilterStatus = 'all' | 'unpaid' | 'paid' | 'overdue' | 'dueSoon' | 'upcoming' | 'inactive'

export interface RecurringFilters {
  keyword: string
  type: string
  status: RecurringFilterStatus
}

export function createDefaultRecurringFilters(): RecurringFilters {
  return {
    keyword: '',
    type: 'all',
    status: 'all',
  }
}

export function compareRecurringBills(
  a: { rule: RecurringRule; info: RecurringMonthlyInfo },
  b: { rule: RecurringRule; info: RecurringMonthlyInfo },
): number {
  const statusWeight: Record<RecurringBillStatus, number> = {
    overdue: 1,
    dueSoon: 2,
    upcoming: 3,
    paid: 4,
    inactive: 5,
  }
  const weightA = statusWeight[a.info.status] ?? 99
  const weightB = statusWeight[b.info.status] ?? 99
  if (weightA !== weightB) return weightA - weightB
  return a.info.actualDueDay - b.info.actualDueDay
}

export function filterRecurringRules(
  rules: RecurringRule[],
  filters: RecurringFilters,
  selectedMonth: string = currentMonthInputValue(),
  today: Date = new Date(),
): Array<{ rule: RecurringRule; info: RecurringMonthlyInfo }> {
  const normalizedKeyword = filters.keyword.trim().toLowerCase()

  const items = rules.map((rule) => ({
    rule,
    info: calculateRecurringMonthlyInfo(rule, selectedMonth, today),
  }))

  const filtered = items.filter(({ rule, info }) => {
    if (normalizedKeyword) {
      const matchTitle = (rule.title || rule.name || '').toLowerCase().includes(normalizedKeyword)
      const matchCategory = (rule.category || '').toLowerCase().includes(normalizedKeyword)
      const matchNote = (rule.note || '').toLowerCase().includes(normalizedKeyword)
      if (!matchTitle && !matchCategory && !matchNote) return false
    }

    if (filters.type !== 'all' && rule.type !== filters.type) {
      return false
    }

    if (filters.status !== 'all') {
      if (filters.status === 'unpaid' && (!info.isActiveInMonth || info.isPaid)) return false
      if (filters.status === 'paid' && !info.isPaid) return false
      if (filters.status === 'overdue' && !info.isOverdue) return false
      if (filters.status === 'dueSoon' && !info.isDueSoon) return false
      if (filters.status === 'upcoming' && info.status !== 'upcoming') return false
      if (filters.status === 'inactive' && info.status !== 'inactive') return false
    }

    return true
  })

  filtered.sort(compareRecurringBills)

  return filtered
}

export interface DayObligationsItem {
  day: number
  dateStr: string
  bills: Array<{ rule: RecurringRule; info: RecurringMonthlyInfo }>
  statements: Array<{ rule: RecurringRule; info: RecurringMonthlyInfo }>
  installments: Array<{ plan: InstallmentPlan; info: InstallmentMonthlyInfo }>
  totalDueAmount: number
  paidDueAmount: number
  unpaidDueAmount: number
  isAllPaid: boolean
}

export function getUnifiedObligationsCalendar(
  rules: RecurringRule[],
  plans: InstallmentPlan[],
  selectedMonth: string = currentMonthInputValue(),
  today: Date = new Date(),
): {
  days: Record<number, DayObligationsItem>
  daysInMonth: number
  monthSummary: {
    totalObligations: number
    paidObligations: number
    unpaidObligations: number
    totalItemsCount: number
    paidItemsCount: number
    unpaidItemsCount: number
  }
} {
  const [yearStr, monthStr] = selectedMonth.split('-')
  const year = Number(yearStr) || new Date().getFullYear()
  const month = Number(monthStr) || new Date().getMonth() + 1
  const daysInMonth = new Date(year, month, 0).getDate()

  const days: Record<number, DayObligationsItem> = {}

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`
    days[day] = {
      day,
      dateStr,
      bills: [],
      statements: [],
      installments: [],
      totalDueAmount: 0,
      paidDueAmount: 0,
      unpaidDueAmount: 0,
      isAllPaid: true,
    }
  }

  // Populate Recurring Rules
  rules.forEach((rule) => {
    const info = calculateRecurringMonthlyInfo(rule, selectedMonth, today)
    if (!info.isActiveInMonth && !info.isPaid) return
    const dueDay = info.actualDueDay
    if (days[dueDay]) {
      days[dueDay].bills.push({ rule, info })
      days[dueDay].totalDueAmount += info.effectiveAmount
      if (info.isPaid) {
        days[dueDay].paidDueAmount += info.effectiveAmount
      } else {
        days[dueDay].unpaidDueAmount += info.effectiveAmount
        days[dueDay].isAllPaid = false
      }
    }

    if (info.actualStatementDay && days[info.actualStatementDay]) {
      days[info.actualStatementDay].statements.push({ rule, info })
    }
  })

  // Populate Installment Plans
  plans.forEach((plan) => {
    const info = calculateInstallmentMonthlyInfo(plan, selectedMonth, today)
    if (!info.isActiveInMonth) return
    const dueDay = info.actualDueDay
    if (days[dueDay]) {
      days[dueDay].installments.push({ plan, info })
      days[dueDay].totalDueAmount += info.monthlyPayment
      if (info.isPaidInMonth) {
        days[dueDay].paidDueAmount += info.monthlyPayment
      } else {
        days[dueDay].unpaidDueAmount += info.monthlyPayment
        days[dueDay].isAllPaid = false
      }
    }
  })

  let totalObligations = 0
  let paidObligations = 0
  let totalItemsCount = 0
  let paidItemsCount = 0

  Object.values(days).forEach((item) => {
    totalObligations += item.totalDueAmount
    paidObligations += item.paidDueAmount
    totalItemsCount += item.bills.length + item.installments.length
    paidItemsCount += item.bills.filter((b) => b.info.isPaid).length + item.installments.filter((i) => i.info.isPaidInMonth).length
  })

  return {
    days,
    daysInMonth,
    monthSummary: {
      totalObligations,
      paidObligations,
      unpaidObligations: Math.max(0, totalObligations - paidObligations),
      totalItemsCount,
      paidItemsCount,
      unpaidItemsCount: Math.max(0, totalItemsCount - paidItemsCount),
    },
  }
}
