export type ViewId = 'monthly' | 'yearly' | 'installments' | 'trips' | 'more'

export type TransactionType = 'income' | 'expense'
export type TransactionStatus = 'cleared' | 'pending'
export type CategoryKind = 'income' | 'expense' | 'mixed'
export type GoalStatus = 'active' | 'paused' | 'completed'
export type InterestType = 'none' | 'flat' | 'reducing'
export type BudgetScope = 'monthly' | 'trip'
export type TripStatus = 'upcoming' | 'ongoing' | 'completed'

export const FINANCE_SCHEMA_VERSION = 2
export const DEFAULT_BASE_CURRENCY = 'THB'
export const DEFAULT_LOCALE = 'th-TH'
export const DEFAULT_TIMEZONE = 'Asia/Bangkok'

export interface TransactionEntry {
  id: string
  type: TransactionType
  date: string
  monthKey?: string
  category: string
  categoryId?: string
  title: string
  amount: number
  currency?: 'THB'
  note?: string
  status: TransactionStatus
  source?: 'manual' | 'quick-add' | 'installment' | 'import'
  sourceModule?: string
  sourceRefId?: string | null
  tripId?: string | null
  installmentId?: string
  installmentPlanId?: string | null
  recurringRuleId?: string | null
  goalId?: string | null
  createdAt: string
  updatedAt: string
}

export interface RecurringRule {
  id: string
  isActive: boolean
  type: TransactionType
  title: string
  category: string
  categoryId?: string
  amount: number
  currency: 'THB'
  cadence: string
  interval: number
  dayOfMonth?: number | null
  startDate: string
  endDate?: string | null
  note?: string | null
  tripId?: string | null
  goalId?: string | null
  createdAt: string
  updatedAt: string
}

export interface InstallmentPlan {
  id: string
  name: string
  category: string
  categoryId?: string
  monthlyAmount: number
  paymentAmount?: number
  monthsTotal: number
  totalMonths?: number
  installmentCount?: number
  monthsPaid: number
  paidMonths?: number
  paidMonthKeys?: string[]
  startMonth: string
  dueDay?: number
  paymentDay?: number | null
  principal?: number
  principalAmount?: number | null
  remainingOverride?: number
  balanceSnapshotAmount?: number | null
  balanceSnapshotMonth?: string | null
  interestType: InterestType
  interestRate?: number | null
  interestNote?: string
  note?: string
  tripId?: string | null
  createdAt: string
  updatedAt: string
}

export interface TripItem {
  id: string
  date: string
  category: string
  title: string
  amount: number
  destination?: string
  country?: string
  note?: string
  installmentId?: string
  isPaid?: boolean
}

export interface Trip {
  id: string
  name: string
  destination?: string
  budget?: number
  startDate: string
  endDate: string
  note?: string
  items: TripItem[]
  createdAt: string
  updatedAt: string
}

export interface Budget {
  id: string
  scope: BudgetScope
  name?: string
  month?: string
  tripId?: string
  category: string
  categoryId?: string | null
  amount: number
  lines?: BudgetLine[]
  alertThresholds?: number[]
  enabled?: boolean
  note?: string
  createdAt: string
  updatedAt: string
}

export interface BudgetLine {
  id: string
  categoryId: string
  amount: number
  note?: string
}

export interface Goal {
  id: string
  name: string
  type?: 'savings'
  kind?: 'savings'
  targetAmount: number
  currentAmount: number
  targetDate?: string
  linkedCategoryId?: string | null
  status: GoalStatus
  note?: string
  createdAt: string
  updatedAt: string
}

export interface FinanceProfile {
  id: 'primary'
  displayName: string | null
  baseCurrency: 'THB'
  locale: 'th-TH'
  timezone: 'Asia/Bangkok'
}

export interface FinanceSettings {
  baseCurrency: 'THB'
  locale: 'th-TH'
  timezone: 'Asia/Bangkok'
  schemaVersion: number
  defaultView: ViewId
  monthStartsOn: number
  includePendingInMonthlyTotals: boolean
}

export interface MasterCategory {
  id: string
  label: string
  kind: CategoryKind
  isArchived: boolean
}

export interface FinanceMasters {
  categories: MasterCategory[]
  tags: string[]
}

export interface FinanceMeta {
  createdAt: string
  updatedAt: string
  exportedAt: string | null
}

export interface FinanceData {
  schemaVersion: typeof FINANCE_SCHEMA_VERSION
  profile: FinanceProfile
  settings: FinanceSettings
  masters: FinanceMasters
  meta: FinanceMeta
  /**
   * Canonical schema v2 collections. Firebase/Firestore sync should read and
   * write these arrays, not the legacy aliases below.
   */
  transactions: TransactionEntry[]
  recurringRules: RecurringRule[]
  installmentPlans: InstallmentPlan[]
  trips: Trip[]
  budgets: Budget[]
  goals: Goal[]
  /**
   * Compatibility aliases for Phase 1 pages. Future phases can move UI code
   * to the canonical schema v2 collection names above.
   */
  entries: TransactionEntry[]
  installments: InstallmentPlan[]
}

export type AppData = FinanceData

export interface SummaryTotals {
  income: number
  expense: number
  balance: number
  entryCount: number
  pendingExpense: number
}

export interface NavItem {
  id: ViewId
  label: string
  icon: string
  title: string
}

