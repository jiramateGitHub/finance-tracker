import { CATEGORY_CHART_COLORS } from '../../../constants/theme'
import { CATEGORY_ICONS, normalizeCategoryId } from '../../../data/categories'
import type { TransactionEntry } from '../../../types/finance'
import { calculateMonthlyTotals } from '../../monthly/utils/monthlyLedger'

export const THAI_MONTH_LABELS = [
  { short: 'ม.ค.', full: 'มกราคม' },
  { short: 'ก.พ.', full: 'กุมภาพันธ์' },
  { short: 'มี.ค.', full: 'มีนาคม' },
  { short: 'เม.ย.', full: 'เมษายน' },
  { short: 'พ.ค.', full: 'พฤษภาคม' },
  { short: 'มิ.ย.', full: 'มิถุนายน' },
  { short: 'ก.ค.', full: 'กรกฎาคม' },
  { short: 'ส.ค.', full: 'สิงหาคม' },
  { short: 'ก.ย.', full: 'กันยายน' },
  { short: 'ต.ค.', full: 'ตุลาคม' },
  { short: 'พ.ย.', full: 'พฤศจิกายน' },
  { short: 'ธ.ค.', full: 'ธันวาคม' },
] as const

export type MonthlyTrendItem = {
  monthKey: string
  monthShortName: string
  monthFullName: string
  income: number
  expense: number
  balance: number
  transactionCount: number
}

export type CategoryDonutSlice = {
  category: string
  icon: string
  totalAmount: number
  percentage: number
  color: string
}

export type YearlyCategoryDistribution = {
  slices: CategoryDonutSlice[]
  totalExpense: number
  categoryCount: number
}

export type YearlyTrendOptions = {
  includePending?: boolean
}

export function calculateYearlyMonthlyTrend(
  transactions: TransactionEntry[],
  year: number,
  options: YearlyTrendOptions = {},
): MonthlyTrendItem[] {
  return THAI_MONTH_LABELS.map((month, index) => {
    const monthIndex = index + 1
    const monthKey = `${year}-${String(monthIndex).padStart(2, '0')}`
    const monthTransactions = transactions.filter((entry) => entry.date.startsWith(monthKey))
    const totals = calculateMonthlyTotals(monthTransactions, options)

    return {
      monthKey,
      monthShortName: month.short,
      monthFullName: month.full,
      income: totals.income,
      expense: totals.expense,
      balance: totals.balance,
      transactionCount: totals.count,
    }
  })
}

export type YearlyCategoryDistributionOptions = {
  includePending?: boolean
  maxCategories?: number
}

export function calculateYearlyCategoryDistribution(
  transactions: TransactionEntry[],
  options: YearlyCategoryDistributionOptions = {},
): YearlyCategoryDistribution {
  const includePending = options.includePending ?? true
  const maxCategories = options.maxCategories ?? 6

  const expenseCategoryMap = new Map<string, number>()
  let totalExpense = 0

  for (const entry of transactions) {
    if (entry.type === 'income') continue
    if (!includePending && entry.status === 'pending') continue
    if (entry.amount <= 0) continue

    const category = normalizeCategoryId(entry.categoryId || entry.category, 'อื่นๆ')
    const current = expenseCategoryMap.get(category) ?? 0
    expenseCategoryMap.set(category, current + entry.amount)
    totalExpense += entry.amount
  }

  if (totalExpense <= 0 || expenseCategoryMap.size === 0) {
    return {
      slices: [],
      totalExpense: 0,
      categoryCount: 0,
    }
  }

  // Sort descending by amount
  const sortedEntries = Array.from(expenseCategoryMap.entries()).sort((a, b) => b[1] - a[1])
  const categoryCount = sortedEntries.length

  let topEntries: Array<[string, number]>
  let otherAmount = 0

  if (sortedEntries.length <= maxCategories) {
    topEntries = sortedEntries
  } else {
    topEntries = sortedEntries.slice(0, maxCategories - 1)
    const remaining = sortedEntries.slice(maxCategories - 1)
    for (const [, amount] of remaining) {
      otherAmount += amount
    }

    const existingOtherIdx = topEntries.findIndex(([cat]) => cat === 'อื่นๆ')
    if (existingOtherIdx >= 0) {
      topEntries[existingOtherIdx] = ['อื่นๆ', topEntries[existingOtherIdx][1] + otherAmount]
    } else if (otherAmount > 0) {
      topEntries.push(['อื่นๆ', otherAmount])
    }
  }

  const slices: CategoryDonutSlice[] = topEntries.map(([category, amount], index) => {
    const rawPercent = (amount / totalExpense) * 100
    const percentage = Math.round(rawPercent)
    const color = category === 'อื่นๆ'
      ? CATEGORY_CHART_COLORS[CATEGORY_CHART_COLORS.length - 1]
      : CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length]
    const icon = CATEGORY_ICONS[category] || '📌'

    return {
      category,
      icon,
      totalAmount: amount,
      percentage,
      color,
    }
  })

  return {
    slices,
    totalExpense,
    categoryCount,
  }
}

export function findYearlyHighlights(trendData: MonthlyTrendItem[]) {
  const monthsWithTransactions = trendData.filter((m) => m.transactionCount > 0)
  if (monthsWithTransactions.length === 0) {
    return {
      highestIncomeMonth: null,
      highestExpenseMonth: null,
      totalIncome: 0,
      totalExpense: 0,
      savingsRate: null,
    }
  }

  let highestIncomeMonth: MonthlyTrendItem | null = null
  let highestExpenseMonth: MonthlyTrendItem | null = null
  let totalIncome = 0
  let totalExpense = 0

  for (const item of trendData) {
    totalIncome += item.income
    totalExpense += item.expense
    if (item.income > 0 && (!highestIncomeMonth || item.income > highestIncomeMonth.income)) {
      highestIncomeMonth = item
    }
    if (item.expense > 0 && (!highestExpenseMonth || item.expense > highestExpenseMonth.expense)) {
      highestExpenseMonth = item
    }
  }

  const savingsRate = totalIncome > 0
    ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
    : null

  return {
    highestIncomeMonth,
    highestExpenseMonth,
    totalIncome,
    totalExpense,
    savingsRate,
  }
}
