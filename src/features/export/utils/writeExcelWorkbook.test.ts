import { assert } from '../../../test/assert'
import ExcelJS from 'exceljs'
import { MASTER_COLORS } from '../../../constants/theme'
import { th } from '../../../i18n/th'
import { makeFinanceData, makeTransaction } from '../../../test/fixtures/financeFixtures'
import { buildExportReport } from './buildExportReport'
import { createExcelWorkbook } from './writeExcelWorkbook'
import { calculateRowHeight, createTextMeasurer } from './rowHeight'

const report = buildExportReport(makeFinanceData({ transactions: [
  makeTransaction({ title: '=HYPERLINK("https://example.com")', note: '+SUM(1,2)', date: '2026-10-05', amount: 1250.25, status: 'pending' }),
] }), { startDate: '2026-10-01', endDate: '2026-10-31', categories: ['expense', 'trip'], includePending: false,
  exportedAt: '2026-10-05T18:00:00Z', hasUnsyncedChanges: true })
const workbook = await createExcelWorkbook(report)
const buffer = await workbook.xlsx.writeBuffer()
const reopened = new ExcelJS.Workbook()
await reopened.xlsx.load(buffer)
assert.equal(reopened.worksheets.length, 4)
const expense = reopened.getWorksheet('03_รายจ่าย')!
let headerRow = 0
expense.eachRow((row) => { if (row.getCell(1).value === th.financeColumns.date) headerRow = row.number })
assert.ok(headerRow > 4)
const row = expense.getRow(headerRow + 1)
assert.ok(row.getCell(1).value instanceof Date)
assert.equal((row.getCell(1).value as Date).toISOString(), '2026-10-05T00:00:00.000Z')
assert.equal(row.getCell(1).numFmt, 'dd/mm/yyyy')
assert.equal(row.getCell(2).type, ExcelJS.ValueType.String, 'User text must remain literal rather than an executable formula')
assert.equal(row.getCell(2).value, '=HYPERLINK("https://example.com")')
assert.equal(row.getCell(7).value, '+SUM(1,2)')
assert.equal(row.getCell(6).type, ExcelJS.ValueType.Number)
assert.equal(row.getCell(6).value, 1250.25)
assert.equal(row.getCell(8).value, 'ไม่')
assert.equal(expense.getColumn(12).hidden, true)
assert.equal(expense.views[0].state, 'frozen')
assert.equal((expense.views[0] as ExcelJS.WorksheetViewFrozen).ySplit, headerRow)
assert.ok(expense.autoFilter)
assert.equal(expense.pageSetup.printTitlesRow, `${headerRow}:${headerRow}`)
assert.equal(row.getCell(5).font.color?.argb, `FF${MASTER_COLORS.warning[600].slice(1).toUpperCase()}`)
const summary = reopened.worksheets[0]
assert.ok(!report.sheets[0].columns.some((column) => column.key === 'balance'))
const metadata = String(summary.getCell('A3').value)
assert.ok(metadata.includes('06/10/2026'), 'Export timestamp must use Bangkok date and Gregorian year')
assert.equal(reopened.creator, th.app.name)
for (const sheet of reopened.worksheets) {
  assert.ok(sheet.name.length <= 31)
  assert.ok(!/[\\/?*[\]:]/.test(sheet.name))
}
const measure = createTextMeasurer()
assert.equal(calculateRowHeight('สั้น', 200, measure), 30)
assert.equal(calculateRowHeight('หนึ่ง\r\nสอง\rสาม', 200, measure), 60)
assert.ok(calculateRowHeight('หมายเหตุยาว '.repeat(30), 150, measure) > calculateRowHeight('หมายเหตุยาว '.repeat(30), 350, measure))
assert.equal(measure('กิ่', 10, false), measure('ก', 10, false), 'Combining marks must not inflate fallback text width')
const expenseReport = report.sheets.find((sheet) => sheet.key === 'expense')!
const shortRow = { ...expenseReport.rows[0] }
const hiddenColumn = expenseReport.columns.find((column) => column.hidden)!
expenseReport.rows = [
  { ...shortRow, [hiddenColumn.key]: 'hidden-reference'.repeat(100) },
  { ...shortRow, note: 'หมายเหตุหลายบรรทัด\n'.repeat(8) },
]
expenseReport.columns.find((column) => column.key === 'title')!.label = 'หัวคอลัมน์ยาว '.repeat(20)
expenseReport.notes.push('คำอธิบายรายงาน '.repeat(200))
const fitted = await createExcelWorkbook(report)
const fittedBuffer = await fitted.xlsx.writeBuffer()
const fittedReopened = new ExcelJS.Workbook()
await fittedReopened.xlsx.load(fittedBuffer)
const fittedExpense = fittedReopened.getWorksheet(expenseReport.name)!
let fittedHeader = 0
fittedExpense.eachRow((current) => { if (current.getCell(1).value === th.financeColumns.date) fittedHeader = current.number })
assert.equal(fittedExpense.getRow(fittedHeader + 1).height, row.height, 'Hidden references must not increase visible row height')
assert.ok(fittedExpense.getRow(fittedHeader + 2).height! > row.height!)
assert.ok(fittedExpense.getRow(fittedHeader).height! > 40, 'Long headers must wrap with sufficient height')
assert.ok(fittedExpense.getRow(fittedHeader - 2).height! > 24, 'Merged report notes must fit their visible width')
console.log('Excel workbook round-trip tests passed')
