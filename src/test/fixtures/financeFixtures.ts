import { createEmptyFinanceData } from '../../lib/dataMigration'
import { getMonthKey } from '../../utils/formatters'
import type { FinanceData, InstallmentPlan, TransactionEntry, Trip, TripItem } from '../../types/finance'

/**
 * Stable defaults for domain tests. Fixtures intentionally use fixed IDs and
 * timestamps so failures can be compared without random UUID noise.
 */
export const FIXTURE_TIMESTAMP = '2026-01-01T00:00:00.000Z'

export function makeTransaction(overrides: Partial<TransactionEntry> = {}): TransactionEntry {
  const date = overrides.date ?? '2026-01-15'
  const type = overrides.type ?? 'expense'
  const category = overrides.categoryId ?? overrides.category ?? (type === 'income' ? 'เงินเดือน' : 'อาหาร')

  return {
    id: 'transaction-fixture',
    type,
    date,
    monthKey: getMonthKey(date),
    category,
    categoryId: category,
    title: 'รายการทดสอบ',
    amount: 100,
    currency: 'THB',
    status: type === 'income' ? 'cleared' : 'cleared',
    source: 'manual',
    sourceModule: 'manual',
    sourceRefId: null,
    tripId: null,
    installmentPlanId: null,
    recurringRuleId: null,
    goalId: null,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    ...overrides,
  }
}

export function makeInstallmentPlan(overrides: Partial<InstallmentPlan> = {}): InstallmentPlan {
  return {
    id: 'installment-plan-fixture',
    name: 'แผนผ่อนทดสอบ',
    category: 'ผ่อนสินค้า',
    categoryId: 'ผ่อนสินค้า',
    monthlyAmount: 100,
    paymentAmount: 100,
    monthsTotal: 3,
    totalMonths: 3,
    installmentCount: 3,
    monthsPaid: 0,
    paidMonths: 0,
    paidMonthKeys: [],
    startMonth: '2026-01',
    dueDay: 5,
    paymentDay: 5,
    principal: 300,
    principalAmount: 300,
    remainingOverride: undefined,
    balanceSnapshotAmount: null,
    balanceSnapshotMonth: null,
    interestType: 'none',
    interestRate: null,
    tripId: null,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    ...overrides,
  }
}

export function makeTripItem(overrides: Partial<TripItem> = {}): TripItem {
  return {
    id: 'trip-item-fixture',
    date: '2026-01-15',
    category: 'ท่องเที่ยว',
    title: 'รายการทริปทดสอบ',
    amount: 250,
    isPaid: true,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    ...overrides,
  }
}

export function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-fixture',
    name: 'ทริปทดสอบ',
    destination: 'กรุงเทพฯ',
    budget: 500,
    startDate: '2026-01-15',
    endDate: '2026-01-16',
    items: [makeTripItem()],
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
    ...overrides,
  }
}

export function makeFinanceData(overrides: Partial<FinanceData> = {}): FinanceData {
  const base = createEmptyFinanceData()
  const transactions = overrides.transactions ?? []
  const installmentPlans = overrides.installmentPlans ?? []

  return {
    ...base,
    ...overrides,
    transactions,
    installmentPlans,
  }
}
