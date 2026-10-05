import { th } from '../../../i18n/th'
import type { FinanceData, RecurringBillType, TransactionEntry } from '../../../types/finance'
import { calculateInstallmentProgress } from '../../installments/utils/installmentProgress'
import { getInstallmentDueDate, getInstallmentDueDay } from '../../installments/utils/installmentSchedule'
import { calculateMonthlyTotals, getMonthKeysInRange, getPaymentLabel, getSourceLabel, selectLedgerTransactionsForRange } from '../../monthly/utils/monthlyLedger'
import { calculateRecurringMonthlyInfo, RECURRING_TYPE_CONFIG } from '../../recurring/utils/recurringBills'
import { calculateTripTotals, getTripStatus, tripStatusLabel } from '../../trips/utils/tripUtils'
import type { ExportOptions, ExportReport, ReportColumn, ReportRow, ReportSheet } from '../exportTypes'
import { getBangkokDate, validateExportOptions } from './exportDates'

const labels = th.financeColumns
const column = (key: string, label: string, kind: ReportColumn['kind'] = 'text', hidden = false): ReportColumn => ({ key, label, kind, hidden })
const reference = (key: string) => column(key, key, 'text', true)

export function buildExportReport(data: FinanceData, options: ExportOptions): ExportReport {
  const error = validateExportOptions(options)
  if (error) throw new Error(error)
  const selected = new Set(options.categories)
  const inRange = (date: string) => date >= options.startDate && date <= options.endDate
  const months = getMonthKeysInRange(options.startDate.slice(0, 7), options.endDate.slice(0, 7))
  const today = getBangkokDate(new Date(options.exportedAt))
  // Existing status helpers read local calendar components; supply the Bangkok calendar day.
  const statusDate = new Date(`${today}T12:00:00`)
  const ledger = selectLedgerTransactionsForRange(data, { startMonth: months[0], endMonth: months.at(-1) })
    .filter((entry) => inRange(entry.date))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  const names = {
    plans: new Map(data.installmentPlans.map((plan) => [plan.id, plan.name])),
    bills: new Map(data.recurringRules.map((rule) => [rule.id, rule.name || rule.title])),
    trips: new Map(data.trips.map((trip) => [trip.id, trip.name])),
  }
  const sheets: ReportSheet[] = []
  const planId = (entry: TransactionEntry) => entry.installmentPlanId || entry.installmentId || (entry.sourceModule === 'installment' ? entry.sourceRefId : null)
  const billId = (entry: TransactionEntry) => entry.recurringRuleId || (entry.sourceModule === 'recurring_bill' ? entry.sourceRefId : null)
  const linkedPlanIds = new Set(ledger.map(planId).filter(Boolean))
  const linkedTripIds = new Set(ledger.map((entry) => entry.tripId).filter(Boolean))
  const tripItemTransactions = new Map<string, string[]>()
  for (const entry of ledger) {
    if (!entry.tripId || !entry.sourceRefId) continue
    const key = JSON.stringify([entry.tripId, entry.sourceRefId])
    const ids = tripItemTransactions.get(key) ?? []
    ids.push(entry.id)
    tripItemTransactions.set(key, ids)
  }
  const billTransactions = new Map<string, TransactionEntry[]>()
  for (const entry of data.transactions) {
    const id = billId(entry)
    if (entry.type !== 'expense' || !id) continue
    const month = entry.recurringMonthKey || entry.monthKey || entry.date.slice(0, 7)
    const key = JSON.stringify([id, month])
    const entries = billTransactions.get(key) ?? []
    entries.push(entry)
    billTransactions.set(key, entries)
  }

  for (const type of ['income', 'expense'] as const) {
    if (!selected.has(type)) continue
    sheets.push({
      key: type,
      name: type === 'income' ? `02_${th.transaction.income}` : `03_${th.transaction.expense}`,
      tone: type,
      notes: ['นับในสรุป: ใช่ = รวมในยอดสรุปตามตัวเลือกการรวมรายการยังไม่จ่าย'],
      columns: [
        column('date', labels.date, 'date'), column('title', labels.title), column('category', labels.category),
        column('source', labels.source), column('status', labels.status), column('amount', labels.amount, 'money'),
        column('note', labels.note), column('included', th.excel.included), column('plan', labels.planName),
        column('bill', labels.billName), column('trip', labels.tripName),
        reference('transactionId'), reference('planId'), reference('billId'), reference('tripId'), reference('sourceRefId'),
      ],
      rows: ledger.filter((entry) => entry.type === type).map((entry) => ({
        date: entry.date, title: entry.title, category: entry.category, source: getSourceLabel(entry), status: getPaymentLabel(entry),
        amount: entry.amount, note: entry.note ?? '', included: type === 'income' || options.includePending || entry.status !== 'pending' ? 'ใช่' : 'ไม่',
        plan: names.plans.get(planId(entry) ?? '') ?? '', bill: names.bills.get(billId(entry) ?? '') ?? '',
        trip: names.trips.get(entry.tripId ?? '') ?? '', transactionId: entry.id, planId: planId(entry) ?? '',
        billId: billId(entry) ?? '', tripId: entry.tripId ?? '', sourceRefId: entry.sourceRefId ?? '',
      })),
    })
  }

  if (selected.has('debt')) {
    const plans = data.installmentPlans.map((plan) => ({ plan, progress: calculateInstallmentProgress(plan) }))
      .filter(({ plan, progress }) => progress.scheduleMonths.some((month) => month >= months[0] && month <= months.at(-1)!)
        || linkedPlanIds.has(plan.id))
    sheets.push({
      key: 'debt', name: `04_${th.obligations.installmentsTab}`, tone: 'neutral',
      notes: [th.excel.snapshot, 'ยอดคงเหลือปัจจุบันคำนวณจากงวด ส่วน snapshot เป็นข้อมูลอ้างอิงที่บันทึกไว้'],
      columns: [
        column('name', labels.planName), column('category', labels.category), column('monthlyPayment', labels.monthlyPayment, 'money'),
        column('progress', labels.progress), column('dueDay', labels.due, 'number'), column('balance', labels.balance, 'money'),
        column('principal', 'เงินต้น (ถ้ามี)', 'money'), column('totalAmount', 'ยอดชำระตามสัญญา (บาท)', 'money'),
        column('monthsTotal', 'จำนวนงวดทั้งหมด (เดือน)', 'number'), column('monthsPaid', 'จำนวนเดือนที่จ่ายแล้ว', 'number'),
        column('monthsRemaining', 'งวดคงเหลือ', 'number'), column('snapshot', 'ยอดคงเหลือ snapshot (อ้างอิง)', 'money'),
        column('snapshotMonth', 'เดือนของ snapshot', 'month'), column('startMonth', 'เดือนเริ่ม', 'month'),
        column('endMonth', 'เดือนสิ้นสุด', 'month'), column('interestType', 'ประเภทดอกเบี้ย'),
        column('interestRate', 'อัตราดอกเบี้ย (% ต่อปี)', 'number'), column('interestNote', 'หมายเหตุดอกเบี้ย'),
        column('note', 'หมายเหตุเพิ่มเติม'), reference('planId'),
      ],
      rows: plans.map(({ plan, progress }) => ({
        name: plan.name, category: plan.category, monthlyPayment: Number(plan.monthlyAmount || plan.paymentAmount || 0),
        progress: `${progress.monthsPaid}/${progress.scheduleMonths.length}`, dueDay: getInstallmentDueDay(plan), balance: progress.remainingAmount,
        principal: progress.principalAmount, totalAmount: progress.totalAmount, monthsTotal: progress.scheduleMonths.length,
        monthsPaid: progress.monthsPaid, monthsRemaining: progress.monthsRemaining, snapshot: progress.snapshotRemainingAmount,
        snapshotMonth: progress.snapshotMonth, startMonth: plan.startMonth, endMonth: progress.endMonth,
        interestType: { none: 'ไม่มี', flat: 'คงที่', reducing: 'ลดต้นลดดอก' }[plan.interestType],
        interestRate: plan.interestRate ?? null, interestNote: plan.interestNote ?? '', note: plan.note ?? '', planId: plan.id,
      })),
    }, {
      key: 'schedule', name: `05_${th.installments.scheduleTitle}`, tone: 'neutral', notes: [th.excel.snapshot],
      columns: [column('plan', labels.planName), column('term', labels.term, 'number'), column('month', labels.dueMonth, 'month'),
        column('amount', labels.payment, 'money'), column('status', labels.status), column('date', labels.dueDate, 'date'),
        reference('planId'), reference('transactionId')],
      rows: plans.flatMap(({ plan, progress }) => progress.scheduleMonths.flatMap((month, index) => {
        const date = getInstallmentDueDate(plan, month)
        if (!inRange(date)) return []
        return [{ plan: plan.name, term: index + 1, month, amount: Number(plan.monthlyAmount || plan.paymentAmount || 0),
          status: progress.paidMonthKeys.includes(month) ? th.transaction.paid : 'รอชำระ', date,
          planId: plan.id, transactionId: `installment-${plan.id}-${month}` }]
      })),
    })
  }

  if (selected.has('bill')) {
    sheets.push({
      key: 'bill', name: `06_${th.obligations.billsTab}`, tone: 'warning',
      notes: ['สถานะเดือนนี้อ้างอิงเดือนในแต่ละแถว ยอดชำระคือยอดตามบิล/ประมาณการ',
        'ยอดที่บันทึกในรายจ่าย: ว่าง = ไม่มีรายการเชื่อมโยง ไม่ได้หมายถึงจ่าย 0 บาท'],
      columns: [column('name', labels.billName), column('type', labels.billType), column('amountType', labels.amountType),
        column('month', labels.month, 'month'), column('statementDate', labels.statementDate, 'date'), column('date', labels.dueDate, 'date'),
        column('status', labels.statusMonth), column('amount', labels.payment, 'money'), column('recordedAmount', th.excel.recordedAmount, 'money'),
        column('linked', th.excel.linkedExpense), column('note', 'หมายเหตุ / บันทึกเพิ่มเติม'), reference('billId'), reference('transactionIds')],
      rows: data.recurringRules.flatMap((rule) => months.flatMap((month) => {
        const info = calculateRecurringMonthlyInfo(rule, month, statusDate)
        if ((!info.isActiveInMonth && !info.isPaid) || !inRange(info.dueDateStr)) return []
        const transactions = billTransactions.get(JSON.stringify([rule.id, month])) ?? []
        const config = RECURRING_TYPE_CONFIG[rule.type as RecurringBillType]
        const status = info.isPaid ? th.transaction.paid : info.status === 'inactive' ? (rule.isActive === false ? 'ปิดใช้งาน' : 'อยู่นอกช่วงเวลา')
          : info.isOverdue ? `เกินกำหนด ${Math.abs(info.daysUntilDue ?? 0)} วัน`
            : info.isDueSoon ? (info.daysUntilDue === 0 ? 'ครบกำหนดวันนี้!' : `อีก ${info.daysUntilDue} วัน`)
              : `รอชำระ (วันที่ ${info.actualDueDay})`
        return [{ name: rule.name || rule.title, type: config?.label ?? (rule.type === 'income' ? th.transaction.income : th.transaction.expense),
          amountType: rule.amountType === 'variable' ? 'ผันแปร' : 'คงที่', month, statementDate: info.statementDateStr,
          date: info.dueDateStr, status, amount: info.effectiveAmount,
          recordedAmount: transactions.length ? transactions.reduce((total, entry) => total + entry.amount, 0) : null,
          linked: transactions.length ? 'มี' : 'ไม่มี', note: rule.note ?? '', billId: rule.id,
          transactionIds: transactions.map((entry) => entry.id).join(', ') }]
      })),
    })
  }

  const trips = data.trips.filter((trip) => (trip.startDate <= options.endDate && trip.endDate >= options.startDate)
    || trip.items.some((item) => inRange(item.date)) || linkedTripIds.has(trip.id))
  if (selected.has('trip')) {
    sheets.push({
      key: 'trip', name: `07_${th.transaction.trip}`, tone: 'primary', notes: ['ยอดทั้งทริป ไม่ใช่เฉพาะค่าใช้จ่ายในช่วงวันที่ที่เลือก'],
      columns: [column('name', labels.tripName), column('destination', labels.destination), column('period', labels.period),
        column('budget', labels.plannedBudget, 'money'), column('actual', labels.actualSpending, 'money'),
        column('remaining', labels.remaining, 'money'), column('usage', labels.usage, 'percent'), column('status', labels.status),
        column('startDate', 'วันที่เริ่ม', 'date'), column('endDate', 'วันที่สิ้นสุด', 'date'),
        column('paid', th.transaction.paid, 'money'), column('unpaid', th.transaction.unpaid, 'money'), column('note', labels.note), reference('tripId')],
      rows: trips.map((trip) => {
        const totals = calculateTripTotals(data, trip)
        return { name: trip.name, destination: trip.destination ?? '', period: `${trip.startDate} – ${trip.endDate}`,
          budget: totals.plannedBudget, actual: totals.actualSpending, remaining: totals.remaining,
          usage: totals.usagePercent / 100,
          status: tripStatusLabel[getTripStatus(trip, today)], startDate: trip.startDate, endDate: trip.endDate,
          paid: totals.paidTotal, unpaid: totals.unpaidTotal, note: trip.note ?? '', tripId: trip.id }
      }),
    }, {
      key: 'tripItems', name: `08_${th.trips.actualTab}`, tone: 'primary', notes: ['รายการจริงของทริป กรองตามวันที่รายการ'],
      columns: [column('trip', labels.tripName), column('date', labels.date, 'date'), column('title', labels.title),
        column('category', labels.category), column('installment', labels.installmentLink), column('status', labels.status),
        column('amount', labels.amount, 'money'), column('note', labels.note), column('destination', labels.destination),
        column('country', 'ประเทศ'), reference('tripId'), reference('itemId'), reference('planId'), reference('transactionIds')],
      rows: trips.flatMap((trip) => trip.items.filter((item) => inRange(item.date)).map((item) => {
        const linkedPlanId = item.installmentPlanId || item.installmentId || ''
        return { trip: trip.name, date: item.date, title: item.title, category: item.category,
          installment: names.plans.get(linkedPlanId) ?? (linkedPlanId ? 'ผูกยอดผ่อน' : ''),
          status: item.isPaid === false ? th.transaction.unpaid : th.transaction.paid, amount: item.amount,
          note: item.note ?? '', destination: item.destination ?? '', country: item.country ?? '', tripId: trip.id,
          itemId: item.id, planId: linkedPlanId,
          transactionIds: (tripItemTransactions.get(JSON.stringify([trip.id, item.id])) ?? []).join(', ') }
      })),
    })
  }

  const summaryColumns = [column('month', labels.month, 'month')]
  if (selected.has('income')) summaryColumns.push(column('income', th.transaction.income, 'money'))
  if (selected.has('expense')) summaryColumns.push(column('expense', th.transaction.expense, 'money'), column('pendingExpense', th.transaction.unpaid, 'money'))
  if (selected.has('income') && selected.has('expense')) summaryColumns.push(column('balance', th.transaction.balance, 'money'))
  summaryColumns.push(column('count', labels.count, 'number'))
  const cashflow = ledger.filter((entry) => selected.has(entry.type))
  const cashflowByMonth = new Map<string, TransactionEntry[]>()
  for (const entry of cashflow) {
    const month = entry.date.slice(0, 7)
    const entries = cashflowByMonth.get(month) ?? []
    entries.push(entry)
    cashflowByMonth.set(month, entries)
  }
  const hasCashflow = selected.has('income') || selected.has('expense')
  const summaryRows: ReportRow[] = hasCashflow ? months.map((month) => ({
    month, ...calculateMonthlyTotals(cashflowByMonth.get(month) ?? [], { includePending: options.includePending }),
  })) : sheets.map((sheet) => ({ name: sheet.name, count: sheet.rows.length, scope: sheet.notes[0] ?? '' }))
  const totals = hasCashflow ? { month: 'รวม', ...calculateMonthlyTotals(cashflow, { includePending: options.includePending }) } : undefined
  const warnings = (selected.has('trip') || selected.has('expense')) && trips.some((trip) => trip.items.some((item) => item.installmentPlanId || item.installmentId))
    ? ['ทริปที่ผูกยอดผ่อน: ยอดรายรับรายจ่ายใช้กติกาเดียวกับเว็บ อาจแสดงทั้งต้นทุนทริปและงวดชำระ'] : []
  const counts = sheets.map((sheet) => `${sheet.name}: ${sheet.rows.length} รายการ`).join(' · ')
  sheets.unshift({
    key: 'summary', name: `01_${th.monthly.totals}`, tone: 'primary',
    notes: ['รายรับรายจ่ายใช้ยอดจากหน้ารายเดือน ไม่บวกยอดจากชีตยอดผ่อน บิล หรือทริปซ้ำ', counts, ...warnings],
    columns: hasCashflow ? summaryColumns : [column('name', 'ชีต'), column('count', labels.count, 'number'), column('scope', 'ขอบเขต')],
    rows: summaryRows, totals,
  })
  return {
    options: { ...options, categories: [...new Set(options.categories)] },
    filename: `finance-report_${options.startDate}_${options.endDate}.xlsx`,
    sheets, entryCount: sheets.filter((sheet) => sheet.key !== 'summary').reduce((total, sheet) => total + sheet.rows.length, 0), warnings,
  }
}

export const exportCategoryLabels = {
  income: th.transaction.income,
  expense: th.transaction.expense,
  debt: th.obligations.installmentsTab,
  bill: th.obligations.billsTab,
  trip: th.transaction.trip,
}
