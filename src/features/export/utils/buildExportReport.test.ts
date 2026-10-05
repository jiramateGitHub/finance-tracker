import { assert } from '../../../test/assert'
import { th } from '../../../i18n/th'
import { makeFinanceData, makeInstallmentPlan, makeTransaction, makeTrip, makeTripItem } from '../../../test/fixtures/financeFixtures'
import type { FinanceData, RecurringRule } from '../../../types/finance'
import { selectLedgerTransactionsForRange } from '../../monthly/utils/monthlyLedger'
import { reconcileTripTransactions } from '../../trips/utils/tripUtils'
import type { ExportOptions } from '../exportTypes'
import { buildExportReport } from './buildExportReport'
import { getBangkokDate, getExportDateRange, validateExportOptions } from './exportDates'

const options: ExportOptions = {
  startDate: '2026-10-01', endDate: '2026-10-31', categories: ['income', 'expense', 'debt', 'bill', 'trip'],
  includePending: true, exportedAt: '2026-10-05T03:00:00Z',
}
const makeBill = (overrides: Partial<RecurringRule> = {}): RecurringRule => ({
  id: 'bill', isActive: true, type: 'utility', title: 'อินเทอร์เน็ต', category: 'สาธารณูปโภค', amount: 900,
  amountType: 'variable', currency: 'THB', cadence: 'monthly', interval: 1, dueDay: 4,
  paidMonthKeys: ['2026-10'], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
})
const trip = makeTrip({ items: [makeTripItem({ date: '2026-10-03', amount: 4500 })], startDate: '2026-10-03', endDate: '2026-10-05', budget: 12000 })
const data: FinanceData = makeFinanceData({
  transactions: reconcileTripTransactions([
    makeTransaction({ id: 'income', type: 'income', date: '2026-10-01', amount: 45000, status: 'pending' }),
    makeTransaction({ id: 'rent', date: '2026-10-02', amount: 9000 }),
    makeTransaction({ id: 'pending', date: '2026-10-05', amount: 5000, status: 'pending' }),
    makeTransaction({ id: 'bill-tx', date: '2026-10-04', amount: 700, sourceModule: 'recurring_bill', recurringRuleId: 'bill', recurringMonthKey: '2026-10' }),
  ], { ...trip, items: [] }, trip),
  installmentPlans: [makeInstallmentPlan({ startMonth: '2026-10', monthlyAmount: 1000, monthsTotal: 3, paidMonthKeys: ['2026-10'], balanceSnapshotAmount: 1800, balanceSnapshotMonth: '2026-10' })],
  trips: [trip], recurringRules: [makeBill(), makeBill({ id: 'paid-without-tx', title: 'ประกัน', amountType: 'fixed', amount: 500 })],
})
const original = JSON.stringify(data)
const report = buildExportReport(data, options)
assert.equal(report.sheets.length, 8)
assert.deepEqual(report.sheets.map((sheet) => sheet.name), [
  '01_สรุปรายเดือน', '02_รายรับ', '03_รายจ่าย', '04_ยอดผ่อนชำระ', '05_ตารางผ่อนชำระ',
  '06_บิลประจำ & บัตรเครดิต', '07_ทริป', '08_รายการจริง',
])
assert.equal(report.sheets[0].totals?.income, 45000)
assert.equal(report.sheets[0].totals?.expense, 20200)
assert.equal(report.sheets[0].totals?.balance, 24800)
assert.equal(report.sheets[0].totals?.pendingExpense, 5000)
const expense = report.sheets.find((sheet) => sheet.key === 'expense')!
assert.equal(expense.rows.length, 5, 'Stored trip item must not also create a derived duplicate')
assert.equal(expense.rows.filter((row) => row.tripId === trip.id).length, 1)
assert.deepEqual(expense.rows.map((row) => row.transactionId), selectLedgerTransactionsForRange(data, { startMonth: '2026-10', endMonth: '2026-10' })
  .filter((entry) => entry.type === 'expense').sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)).map((entry) => entry.id))
assert.equal(expense.rows.find((row) => row.transactionId === 'pending')?.status, th.transaction.unpaid)
assert.equal(expense.rows.find((row) => row.planId)?.source, th.transaction.installment)
assert.equal(expense.rows.find((row) => row.tripId)?.source, th.transaction.trip)
const debt = report.sheets.find((sheet) => sheet.key === 'debt')!.rows[0]
assert.equal(debt.balance, 2000)
assert.equal(debt.snapshot, 1800, 'Snapshot must not replace calculated balance')
assert.equal(debt.monthsPaid, 1)
const billRows = report.sheets.find((sheet) => sheet.key === 'bill')!.rows
assert.equal(billRows[0].amount, 900)
assert.equal(billRows[0].recordedAmount, 700)
assert.equal(billRows[1].recordedAmount, null, 'Paid flag without a transaction must not fabricate payment amount')
assert.equal(billRows[1].status, th.transaction.paid)
assert.equal(billRows[1].linked, 'ไม่มี')
assert.equal(report.sheets.find((sheet) => sheet.key === 'trip')!.rows[0].actual, 4500)
assert.equal(JSON.stringify(data), original, 'Export must not mutate FinanceData')

const cleared = buildExportReport(data, { ...options, includePending: false })
assert.equal(cleared.sheets[0].totals?.expense, 15200)
assert.equal(cleared.sheets[0].totals?.income, 45000, 'Pending income follows the current ledger policy')
assert.equal(cleared.sheets[0].totals?.balance, 29800)
assert.equal(cleared.sheets.find((sheet) => sheet.key === 'expense')!.rows.find((row) => row.transactionId === 'pending')?.included, 'ไม่')
assert.equal(cleared.sheets.find((sheet) => sheet.key === 'expense')!.rows.length, 5)

const partial = buildExportReport(data, { ...options, categories: ['income'] })
assert.equal(partial.sheets.length, 2)
assert.ok(!partial.sheets[0].columns.some((column) => column.key === 'balance' || column.key === 'expense'))
const debtOnly = buildExportReport(data, { ...options, categories: ['debt'] })
assert.equal(debtOnly.sheets.length, 3)
assert.ok(!debtOnly.sheets[0].columns.some((column) => column.key === 'income' || column.key === 'balance'))
assert.equal(debtOnly.sheets[0].totals, undefined)
const bounded = buildExportReport(data, { ...options, startDate: '2026-10-03', endDate: '2026-10-04' })
assert.equal(bounded.sheets[0].totals?.income, 0)
assert.equal(bounded.sheets[0].totals?.expense, 5200)
assert.equal(bounded.sheets.find((sheet) => sheet.key === 'schedule')!.rows.length, 0)

const outsideTrip = makeTrip({ startDate: '2026-11-01', endDate: '2026-11-03', items: [
  makeTripItem({ id: 'deposit', date: '2026-10-01', amount: 200 }), makeTripItem({ id: 'later', date: '2026-11-01', amount: 800 }),
] })
const outside = buildExportReport(makeFinanceData({ trips: [outsideTrip] }), options)
assert.equal(outside.sheets.find((sheet) => sheet.key === 'trip')!.rows[0].actual, 1000, 'Trip overview reports the whole trip')
assert.equal(outside.sheets.find((sheet) => sheet.key === 'tripItems')!.rows.length, 1)
assert.equal(outside.sheets[0].totals?.expense, 200)

const crossMonth = buildExportReport(makeFinanceData({ recurringRules: [makeBill()], transactions: [
  makeTransaction({ date: '2026-11-02', recurringRuleId: 'bill', recurringMonthKey: '2026-10', amount: 650 }),
] }), options)
assert.equal(crossMonth.sheets[0].totals?.expense, 0)
assert.equal(crossMonth.sheets.find((sheet) => sheet.key === 'bill')!.rows[0].recordedAmount, 650, 'Bill period follows recurringMonthKey rather than payment date')

const linkedTrip = makeTrip({ ...trip, items: [makeTripItem({ date: '2026-10-03', installmentPlanId: data.installmentPlans[0].id })] })
const linked = buildExportReport(makeFinanceData({ trips: [linkedTrip], installmentPlans: data.installmentPlans }), options)
assert.equal(linked.warnings.length, 1, 'Keep existing recognition policy visible for trips linked to installments')

const leap = buildExportReport(makeFinanceData({ installmentPlans: [makeInstallmentPlan({ startMonth: '2028-02', dueDay: 31 })] }), {
  ...options, startDate: '2028-02-29', endDate: '2028-02-29',
})
assert.equal(leap.sheets.find((sheet) => sheet.key === 'schedule')!.rows[0].date, '2028-02-29')
assert.ok(validateExportOptions({ ...options, startDate: '2026-02-30' }))
assert.ok(validateExportOptions({ ...options, startDate: '2026-11-01' }))
assert.ok(validateExportOptions({ ...options, categories: [] }))
assert.ok(validateExportOptions({ ...options, endDate: '2226-10-31' }))
assert.throws(() => buildExportReport(data, { ...options, startDate: '' }))
assert.equal(buildExportReport(makeFinanceData(), options).entryCount, 0)
assert.equal(getBangkokDate(new Date('2026-10-04T18:00:00Z')), '2026-10-05')
assert.deepEqual(getExportDateRange(data, 'month', '2028-02-12'), ['2028-02-01', '2028-02-29'])
assert.deepEqual(getExportDateRange(data, 'year', '2026-10-05'), ['2026-01-01', '2026-12-31'])
assert.deepEqual(getExportDateRange(makeFinanceData({ recurringRules: [makeBill({ startDate: '2024-01-01' })] }), 'all', '2026-10-05'), ['2024-01-01', '2026-10-05'])
assert.deepEqual(getExportDateRange(makeFinanceData({ recurringRules: [makeBill({ dueDay: 31 })] }), 'all', '2026-10-05'), ['2026-10-05', '2026-10-31'], 'All-data range includes the due date of months already marked paid')

console.log('Excel report tests passed')
