import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { DateInput } from '../../../components/ui/DateInput'
import { FormField } from '../../../components/ui/FormField'
import { SelectField } from '../../../components/ui/SelectField'
import { th } from '../../../i18n/th'
import type { FinanceData } from '../../../types/finance'
import { formatMoney } from '../../../utils/formatters'
import type { ExportCategory, ExportOptions, ExportPeriod, ReportSheetKey } from '../exportTypes'
import { buildExportReport, exportCategoryLabels } from '../utils/buildExportReport'
import { EXPORT_CATEGORIES, getExportDateRange } from '../utils/exportDates'
import { downloadExcelReport } from '../utils/writeExcelWorkbook'

type ExportExcelModalProps = {
  data: FinanceData
  hasUnsyncedChanges: boolean
  onClose: () => void
}

export function ExportExcelModal({ data, hasUnsyncedChanges, onClose }: ExportExcelModalProps) {
  // Preview and download share a single read-only snapshot even if background sync updates the provider.
  const [snapshot] = useState(() => structuredClone(data))
  const [period, setPeriod] = useState<ExportPeriod>('month')
  const [options, setOptions] = useState<ExportOptions>(() => {
    const [startDate, endDate] = getExportDateRange(snapshot, 'month')
    return { startDate, endDate, categories: [...EXPORT_CATEGORIES], includePending: snapshot.settings.includePendingInMonthlyTotals,
      exportedAt: new Date().toISOString(), hasUnsyncedChanges }
  })
  const [activeSheet, setActiveSheet] = useState<ReportSheetKey>('summary')
  const [busy, setBusy] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloaded, setDownloaded] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const busyRef = useRef(false)
  const preview = useMemo(() => {
    try { return { report: buildExportReport(snapshot, options), error: null } }
    catch (error) { return { report: null, error: error instanceof Error ? error.message : 'สร้างรายงานไม่สำเร็จ' } }
  }, [snapshot, options])
  const report = preview.report
  const sheet = report?.sheets.find((entry) => entry.key === activeSheet) ?? report?.sheets[0]
  const disabledReason = preview.error ?? (report?.entryCount === 0 ? th.excel.noData : null)

  useEffect(() => {
    const dialog = dialogRef.current
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialog?.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [])

  function updateOptions(patch: Partial<ExportOptions>): void {
    setOptions((current) => ({ ...current, ...patch }))
    setDownloaded(null)
    setDownloadError(null)
  }

  function changePeriod(next: ExportPeriod): void {
    setPeriod(next)
    if (next !== 'custom') {
      const [startDate, endDate] = getExportDateRange(snapshot, next)
      updateOptions({ startDate, endDate })
    }
  }

  function toggleCategory(category: ExportCategory, checked: boolean): void {
    updateOptions({ categories: checked ? [...options.categories, category] : options.categories.filter((entry) => entry !== category) })
  }

  async function handleExport(): Promise<void> {
    if (!report || disabledReason || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setDownloadError(null)
    setDownloaded(null)
    try {
      const download = buildExportReport(snapshot, { ...options, exportedAt: new Date().toISOString() })
      await downloadExcelReport(download)
      setDownloaded(download.filename)
    } catch (error) {
      setDownloadError(error instanceof Error ? `ส่งออกไม่สำเร็จ: ${error.message}` : 'ส่งออกไม่สำเร็จ กรุณาลองอีกครั้ง')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[calc(100%_-_1.5rem)] max-w-3xl max-h-[92dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl backdrop:bg-slate-950/40 sm:p-6"
      aria-labelledby="excel-export-title"
      aria-describedby="excel-export-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!busyRef.current) onClose()
      }}
    >
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="excel-export-title" className="text-lg font-bold">{th.file.exportExcel}</h2>
          <p id="excel-export-description" className="mt-1 text-sm text-slate-600">{th.excel.description}</p>
        </div>
        <Button type="button" size="sm" disabled={busy} onClick={onClose}>{th.common.close}</Button>
      </header>
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        <FormField label={th.financeColumns.period}>
          <SelectField
            aria-label={th.financeColumns.period}
            value={period}
            options={(['month', 'year', 'custom', 'all'] as const).map((value) => ({ value, label: th.excel[value] }))}
            onChange={(event) => changePeriod(event.target.value as ExportPeriod)}
          />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={th.excel.startDate}>
            <DateInput aria-label={th.excel.startDate} value={options.startDate} min="1900-01-01" onChange={(event) => { setPeriod('custom'); updateOptions({ startDate: event.target.value }) }} />
          </FormField>
          <FormField label={th.excel.endDate}>
            <DateInput aria-label={th.excel.endDate} value={options.endDate} min="1900-01-01" onChange={(event) => { setPeriod('custom'); updateOptions({ endDate: event.target.value }) }} />
          </FormField>
        </div>
        <fieldset className="min-w-0">
          <legend className="mb-2 text-sm font-semibold">หมวดข้อมูล</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {EXPORT_CATEGORIES.map((category) => (
              <label key={category} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm">
                <input type="checkbox" className="size-4 shrink-0 accent-blue-600" checked={options.categories.includes(category)} onChange={(event) => toggleCategory(category, event.target.checked)} />
                {exportCategoryLabels[category]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 shrink-0 accent-blue-600" checked={options.includePending} onChange={(event) => updateOptions({ includePending: event.target.checked })} />
          {th.excel.includePending}
        </label>
      </fieldset>
      <p className="mt-1 text-xs text-slate-600">{th.excel.summaryIncluded}</p>
      {options.hasUnsyncedChanges ? <p className="mt-3 text-sm text-amber-700">{th.excel.localChanges}</p> : null}
      {report?.warnings.map((warning) => <p key={warning} className="mt-3 text-sm text-amber-700">{warning}</p>)}
      {report ? (
        <section className="mt-5 min-w-0 border-t border-slate-200 pt-4" aria-label="ตัวอย่างรายงาน">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">ชีตในไฟล์</h3>
            <Badge tone="neutral">{report.sheets.length} ชีต</Badge>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {report.sheets.map((entry) => (
              <Button key={entry.key} type="button" size="sm" disabled={busy} aria-pressed={sheet?.key === entry.key} variant={sheet?.key === entry.key ? 'primary' : 'light'} onClick={() => setActiveSheet(entry.key)}>
                {entry.name} ({entry.rows.length})
              </Button>
            ))}
          </div>
          {sheet ? (
            <div className="mt-3">
              <p className="text-xs text-slate-600">{sheet.notes[0]} · ตัวอย่างไม่เกิน 5 แถว · จำนวนเงินหน่วยบาท</p>
              <div className="mt-2 max-w-full overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50">
                    <tr>{sheet.columns.filter((column) => !column.hidden).map((column) => <th key={column.key} className="whitespace-nowrap px-3 py-2 font-semibold">{column.label}</th>)}</tr>
                  </thead>
                  <tbody>
                    {sheet.rows.slice(0, 5).map((row, index) => <tr key={index} className="border-t border-slate-100">
                      {sheet.columns.filter((column) => !column.hidden).map((column) => <td key={column.key} className={`whitespace-nowrap px-3 py-2 ${['money', 'number', 'percent'].includes(column.kind) ? 'text-right tabular-nums' : ''}`}>
                        {row[column.key] == null ? '—' : column.kind === 'money' ? formatMoney(Number(row[column.key])) : column.kind === 'percent' ? `${(Number(row[column.key]) * 100).toFixed(1)}%` : row[column.key]}
                      </td>)}
                    </tr>)}
                    {!sheet.rows.length ? <tr><td colSpan={sheet.columns.filter((column) => !column.hidden).length} className="p-3 text-slate-600">{th.excel.noData}</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
          <p className="mt-3 break-all text-xs text-blue-700">{report.filename}</p>
        </section>
      ) : null}
      {disabledReason ? <p role="alert" className="mt-3 text-sm text-amber-700">{disabledReason}</p> : null}
      {downloadError ? <p role="alert" className="mt-3 text-sm text-rose-700">{downloadError}</p> : null}
      {downloaded ? <p role="status" className="mt-3 break-words text-sm text-emerald-700">สร้างไฟล์และเริ่มดาวน์โหลดแล้ว: {downloaded}</p> : null}
      <footer className="sticky bottom-0 mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-white pt-3 pb-1">
        <Button type="button" disabled={busy} onClick={onClose}>{th.common.cancel}</Button>
        <Button type="button" variant="primary" disabled={busy || Boolean(disabledReason)} onClick={() => { void handleExport() }} aria-busy={busy}>
          {busy ? th.excel.generating : th.file.exportExcel}
        </Button>
      </footer>
    </dialog>
  )
}
