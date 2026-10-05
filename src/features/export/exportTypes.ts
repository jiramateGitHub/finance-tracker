import type { SemanticTone } from '../../constants/theme'

export type ExportCategory = 'income' | 'expense' | 'debt' | 'bill' | 'trip'
export type ExportPeriod = 'month' | 'year' | 'custom' | 'all'
export type ReportSheetKey = 'summary' | ExportCategory | 'schedule' | 'tripItems'
export type ReportValue = string | number | null
export type ReportRow = Record<string, ReportValue>

export interface ExportOptions {
  startDate: string
  endDate: string
  categories: ExportCategory[]
  includePending: boolean
  exportedAt: string
  hasUnsyncedChanges?: boolean
}

export interface ReportColumn {
  key: string
  label: string
  kind: 'text' | 'money' | 'number' | 'date' | 'month' | 'percent'
  hidden?: boolean
}

export interface ReportSheet {
  key: ReportSheetKey
  name: string
  tone: SemanticTone
  columns: ReportColumn[]
  rows: ReportRow[]
  notes: string[]
  totals?: ReportRow
}

export interface ExportReport {
  options: ExportOptions
  filename: string
  sheets: ReportSheet[]
  entryCount: number
  warnings: string[]
}
