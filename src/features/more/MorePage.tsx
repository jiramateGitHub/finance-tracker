import { useState, type ChangeEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { FormField } from '../../components/ui/FormField'
import { SelectField } from '../../components/ui/SelectField'
import { SyncStatusBadge } from '../sync/SyncStatusBadge'
import type { FinanceDataStatus } from '../../state/FinanceDataProvider'
import type { AppData } from '../../types/finance'
import type { ImportSyncMode, SyncStatus } from '../sync/syncTypes'
import { th } from '../../i18n/th'

type MorePageProps = {
  data: AppData
  dataStatus: FinanceDataStatus
  onExportJson: () => void
  onImportJson: (file: File, mode: ImportSyncMode) => Promise<void>
  onResetDemoData: () => void
  currentUserEmail: string
  onLogout: () => Promise<void>
  syncStatus: SyncStatus
  onLoadFromCloud: () => Promise<void>
  onSaveToCloud: () => Promise<void>
}

export function MorePage({
  data,
  dataStatus,
  onExportJson,
  onImportJson,
  onResetDemoData,
  currentUserEmail,
  onLogout,
  syncStatus,
  onLoadFromCloud,
  onSaveToCloud,
}: MorePageProps) {
  const [importMode, setImportMode] = useState<ImportSyncMode>('cloud')
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    if (file) await onImportJson(file, importMode)
    event.target.value = ''
  }

  const statusTone = dataStatus.saveState === 'error' || dataStatus.importState === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
  const cloudStatusTone = syncStatus.state === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : syncStatus.state === 'saved'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : syncStatus.state === 'conflict'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-blue-200 bg-blue-50 text-blue-700'
  const isCloudBusy = syncStatus.state === 'loading' || syncStatus.state === 'saving'

  return (
    <div className="grid gap-4">
      <Card title="Cloud Sync และไฟล์สำรอง" description="ใช้ข้อมูลบน Cloud เป็นหลัก และเก็บ cache ในเครื่องเพื่อให้เปิดได้เร็วขึ้น">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-extrabold">บัญชี Firebase</h3>
              <SyncStatusBadge status={syncStatus} />
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              เมื่อเข้าสู่ระบบแล้ว ข้อมูลบน Cloud คือแหล่งหลัก ส่วนข้อมูลในเครื่องเป็น cache แยกตามบัญชีสำหรับเปิดเร็วและรองรับช่วงออฟไลน์
            </p>
            <div className="mt-3 truncate rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600">
              {currentUserEmail}
            </div>
            <div className={`mt-3 rounded-xl border px-3 py-2 text-sm font-bold ${cloudStatusTone}`}>
              {syncStatus.message}
              {syncStatus.lastSyncedAt ? (
                <span className="mt-1 block text-xs font-semibold opacity-80">
                  {th.sync.lastSynced}: {new Date(syncStatus.lastSyncedAt).toLocaleString('th-TH')}
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="primary" onClick={onSaveToCloud} disabled={isCloudBusy}>
                {th.sync.saveToCloud}
              </Button>
              <Button type="button" onClick={onLoadFromCloud} disabled={isCloudBusy}>
                {th.sync.loadFromCloud}
              </Button>
              <Button type="button" onClick={onLogout}>
                {th.auth.logout}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="font-extrabold">นำเข้า/ส่งออก JSON</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              ข้อมูลปัจจุบัน: {data.transactions.length} รายการ, {data.recurringRules.length} รายการประจำ,{' '}
              {data.installmentPlans.length} แผนผ่อน, {data.trips.length} ทริป
            </p>
            <div className={`mt-3 rounded-xl border px-3 py-2 text-sm font-bold ${statusTone}`}>
              {dataStatus.message}
            </div>
            <div className="mt-3 grid gap-2">
              <FormField label={th.file.importMode}>
                <SelectField
                  value={importMode}
                  options={[
                    { value: 'cloud', label: th.file.importAndCloud },
                    { value: 'local-only', label: 'นำเข้าเพื่อดูตัวอย่างใน cache เครื่องนี้' },
                  ]}
                  onChange={(event) => setImportMode(event.target.value as ImportSyncMode)}
                />
              </FormField>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" onClick={onExportJson}>{th.file.exportJson}</Button>
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-extrabold text-blue-700 hover:bg-blue-50">
                {th.file.importJson}
                <input className="sr-only" type="file" accept="application/json,.json" onChange={handleFileChange} />
              </label>
              <Button variant="danger" onClick={() => setConfirmResetOpen(true)}>{th.file.resetLocal}</Button>
            </div>
          </div>
        </div>
      </Card>

      <ConfirmModal
        open={confirmResetOpen}
        title="รีเซ็ต cache ในเครื่อง?"
        description="ข้อมูลตัวอย่างจะถูกโหลดใหม่ใน cache ของบัญชีนี้ หากเปิดซิงก์อยู่ ระบบจะบันทึกตามสถานะ Cloud ปัจจุบัน"
        confirmLabel={th.file.resetLocal}
        destructive
        onConfirm={onResetDemoData}
        onClose={() => setConfirmResetOpen(false)}
      />
    </div>
  )
}
