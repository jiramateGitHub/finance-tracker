import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { th } from '../../../i18n/th'
import type { FinanceData } from '../../../types/finance'
import { ExportExcelModal } from './ExportExcelModal'

type ExcelExportSectionProps = {
  data: FinanceData
  ready: boolean
  hasUnsyncedChanges: boolean
}

export function ExcelExportSection({ data, ready, hasUnsyncedChanges }: ExcelExportSectionProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Card title={th.excel.title}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 text-sm text-slate-600">
            <p>{th.excel.description}</p>
            <p className="mt-1 text-xs">รายรับ รายจ่าย ยอดผ่อนชำระ บิลประจำ & บัตรเครดิต และทริป</p>
          </div>
          <Button type="button" variant="primary" disabled={!ready} onClick={() => setOpen(true)}>{th.file.exportExcel}</Button>
        </div>
        {!ready ? <p className="mt-2 text-xs text-slate-600">รอโหลดข้อมูลบัญชีให้เสร็จก่อนส่งออก</p> : null}
      </Card>
      {open && ready ? <ExportExcelModal data={data} hasUnsyncedChanges={hasUnsyncedChanges} onClose={() => setOpen(false)} /> : null}
    </>
  )
}
