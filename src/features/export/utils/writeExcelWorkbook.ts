import type { Workbook, Worksheet } from 'exceljs'
import { MASTER_COLORS } from '../../../constants/theme'
import { th } from '../../../i18n/th'
import type { ExportReport, ReportColumn, ReportRow, ReportValue } from '../exportTypes'
import { exportCategoryLabels } from './buildExportReport'
import { isReportDate } from './exportDates'
import { calculateRowHeight, columnWidthPixels, createTextMeasurer } from './rowHeight'

const argb = (color: string) => `FF${color.slice(1).toUpperCase()}`
const colors = {
  primary: argb(MASTER_COLORS.primary[600]), income: argb(MASTER_COLORS.income[600]),
  expense: argb(MASTER_COLORS.expense[600]), warning: argb(MASTER_COLORS.warning[600]),
  neutral: argb(MASTER_COLORS.neutral[600]), text: argb(MASTER_COLORS.neutral[900]),
  muted: argb(MASTER_COLORS.neutral[600]), line: argb(MASTER_COLORS.neutral[200]),
  white: argb(MASTER_COLORS.surface.card), alternate: argb(MASTER_COLORS.neutral[50]),
}

function cellValue(value: ReportValue, column: ReportColumn): string | number | Date | null {
  if (value === null) return null
  if (column.kind === 'date' && typeof value === 'string' && isReportDate(value)) return new Date(`${value}T00:00:00Z`)
  if (column.kind === 'month' && typeof value === 'string' && isReportDate(`${value}-01`)) return new Date(`${value}-01T00:00:00Z`)
  // User text stays a literal string, including text beginning with '=' or '+'.
  return value
}

function addDataRow(worksheet: Worksheet, columns: ReportColumn[], data: ReportRow, index: number, measure: ReturnType<typeof createTextMeasurer>, total = false): void {
  const row = worksheet.addRow(columns.map((column) => cellValue(data[column.key] ?? null, column)))
  row.height = total ? 26 : 30
  row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    const column = columns[columnNumber - 1]
    cell.font = { name: 'Tahoma', size: 10, color: { argb: colors.text }, bold: total }
    cell.alignment = { vertical: 'middle', wrapText: true, horizontal: ['money', 'number', 'percent'].includes(column.kind) ? 'right' : 'left' }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: total || index % 2 ? colors.alternate : colors.white } }
    cell.border = { bottom: { style: 'hair', color: { argb: colors.line } } }
    if (column.kind === 'money') {
      cell.numFmt = '#,##0.00;(#,##0.00)'
      if (typeof cell.value === 'number' && cell.value < 0) cell.font = { ...cell.font, color: { argb: colors.expense } }
    }
    if (column.kind === 'number') cell.numFmt = '#,##0.##'
    if (column.kind === 'percent') cell.numFmt = '0.0%'
    if (column.kind === 'date') cell.numFmt = 'dd/mm/yyyy'
    if (column.kind === 'month') cell.numFmt = 'mm/yyyy'
    const text = typeof cell.value === 'string' ? cell.value : ''
    const width = worksheet.getColumn(columnNumber).width ?? 18
    if (!column.hidden) row.height = Math.max(row.height ?? 30, calculateRowHeight(text, columnWidthPixels(width), measure, total ? 26 : 30, 10, total))
    if (column.key === 'status') {
      const tone = text === th.transaction.paid ? 'income' : text.startsWith('เกินกำหนด') ? 'expense'
        : text.includes('ยังไม่จ่าย') || text.includes('รอชำระ') || text.includes('วันนี้') || text.startsWith('อีก ') ? 'warning' : 'neutral'
      cell.font = { ...cell.font, color: { argb: colors[tone] } }
    }
  })
}

export async function createExcelWorkbook(report: ExportReport): Promise<Workbook> {
  const { default: ExcelJS } = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  const measure = createTextMeasurer()
  workbook.creator = th.app.name
  workbook.created = new Date(report.options.exportedAt)
  workbook.modified = new Date(report.options.exportedAt)
  const timestamp = new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(workbook.created)
  const selectedLabels = report.options.categories.map((category) => exportCategoryLabels[category]).join(', ')

  for (const sheet of report.sheets) {
    if (sheet.rows.length > 1_048_000) throw new Error('จำนวนรายการเกินขนาดชีต Excel กรุณาลดช่วงเวลา')
    const worksheet = workbook.addWorksheet(sheet.name, { properties: { tabColor: { argb: colors[sheet.tone] } } })
    worksheet.columns = sheet.columns.map((column) => ({
      key: column.key, hidden: column.hidden,
      width: column.hidden ? 14 : column.key === 'note' || column.key === 'scope' ? 48
        : ['title', 'name', 'trip', 'plan', 'bill', 'destination', 'installment'].includes(column.key) ? 28
          : Math.min(36, Math.max(column.label.length + 2, column.kind === 'date' ? 16 : column.kind === 'money' ? 20 : 18)),
    }))
    const visibleCount = sheet.columns.filter((column) => !column.hidden).length
    const mergedWidth = sheet.columns.reduce((sum, column, index) => sum + (column.hidden ? 0 : columnWidthPixels(worksheet.getColumn(index + 1).width ?? 18)), 0)
    const metadata = [
      `${th.excel.title} · ${sheet.name}`,
      `${report.options.startDate} – ${report.options.endDate} · จำนวนเงินหน่วยบาท (THB) · วันที่ ค.ศ.`,
      `ส่งออกเมื่อ ${timestamp} (Asia/Bangkok) · หมวด: ${selectedLabels}`,
      report.options.includePending ? th.excel.includePending : 'ยอดสรุปรายจ่ายนับเฉพาะรายการจ่ายแล้ว',
      ...(report.options.hasUnsyncedChanges ? [th.excel.localChanges] : []),
      ...sheet.notes,
    ]
    metadata.forEach((text, index) => {
      const row = worksheet.addRow([text])
      worksheet.mergeCells(row.number, 1, row.number, visibleCount)
      row.height = calculateRowHeight(text, mergedWidth, measure, index === 0 ? 32 : 24, index === 0 ? 16 : 10, index === 0)
      const cell = row.getCell(1)
      cell.font = { name: 'Tahoma', size: index === 0 ? 16 : 10, bold: index === 0, color: { argb: index === 0 ? colors.primary : colors.muted } }
      cell.alignment = { vertical: 'middle', wrapText: true }
    })
    worksheet.addRow([])
    const header = worksheet.addRow(sheet.columns.map((column) => column.label))
    header.height = 40
    header.eachCell((cell, columnNumber) => {
      cell.font = { name: 'Tahoma', size: 10, bold: true, color: { argb: colors.white } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.primary } }
      cell.alignment = { vertical: 'middle', wrapText: true }
      if (!sheet.columns[columnNumber - 1].hidden) header.height = Math.max(header.height ?? 40,
        calculateRowHeight(String(cell.value ?? ''), columnWidthPixels(worksheet.getColumn(columnNumber).width ?? 18) - 16, measure, 40, 10, true))
    })
    sheet.rows.forEach((row, index) => addDataRow(worksheet, sheet.columns, row, index, measure))
    if (sheet.totals) addDataRow(worksheet, sheet.columns, sheet.totals, 0, measure, true)
    if (!sheet.rows.length) {
      const empty = worksheet.addRow([th.excel.noData])
      worksheet.mergeCells(empty.number, 1, empty.number, visibleCount)
      empty.height = 28
    }
    worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: header.number }]
    // Exclude totals from the filter range, so a total cannot be counted as a source record.
    worksheet.autoFilter = { from: { row: header.number, column: 1 }, to: { row: header.number + sheet.rows.length, column: visibleCount } }
    worksheet.pageSetup = {
      paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      printTitlesRow: `${header.number}:${header.number}`,
      printArea: `A1:${worksheet.getColumn(visibleCount).letter}${worksheet.rowCount}`,
    }
  }
  return workbook
}

export async function downloadExcelReport(report: ExportReport): Promise<void> {
  const workbook = await createExcelWorkbook(report)
  const buffer = await workbook.xlsx.writeBuffer()
  const bytes = new Uint8Array(buffer)
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = report.filename
  document.body.appendChild(anchor)
  try {
    anchor.click()
  } finally {
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
