import type { ChangeEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { SyncStatusBadge } from '../sync/SyncStatusBadge'
import type { FinanceDataStatus } from '../../state/FinanceDataProvider'
import type { AppData } from '../../types/finance'
import type { SyncStatus } from '../sync/syncTypes'
import { th } from '../../i18n/th'

type MorePageProps = {
  data: AppData
  dataStatus: FinanceDataStatus
  onExportJson: () => void
  onImportJson: (file: File) => Promise<void>
  currentUserId: string
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
  currentUserId,
  currentUserEmail,
  onLogout,
  syncStatus,
  onLoadFromCloud,
  onSaveToCloud,
}: MorePageProps) {
  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    if (file) await onImportJson(file)
    event.target.value = ''
  }

  const statusTone = dataStatus.saveState === 'error' || dataStatus.importState === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
  const cloudStatusTone = syncStatus.state === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : syncStatus.state === 'saved'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-blue-200 bg-blue-50 text-blue-700'
  const isCloudBusy = syncStatus.state === 'loading' || syncStatus.state === 'saving'
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ไม่ได้ตั้งค่า'

  return (
    <div className="grid gap-4">
      <Card title="Cloud Sync และไฟล์สำรอง" description="หลังเข้าสู่ระบบ Firestore คือแหล่งข้อมูลหลัก JSON ใช้สำหรับสำรองและย้ายข้อมูลเท่านั้น">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-extrabold">บัญชี Firebase</h3>
              <SyncStatusBadge status={syncStatus} />
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              ระบบโหลดข้อมูลจาก Cloud หลังเข้าสู่ระบบทุกครั้ง และบันทึกการแก้ไขกลับขึ้น Cloud อัตโนมัติ
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
              นำเข้า JSON แล้วระบบจะบันทึกชุดข้อมูลนั้นขึ้น Cloud ให้บัญชีนี้ทันที
            </p>
            <div className={`mt-3 rounded-xl border px-3 py-2 text-sm font-bold ${statusTone}`}>
              {dataStatus.message}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" onClick={onExportJson}>{th.file.exportJson}</Button>
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-extrabold text-blue-700 hover:bg-blue-50">
                นำเข้า JSON และบันทึกขึ้น Cloud
                <input className="sr-only" type="file" accept="application/json,.json" onChange={handleFileChange} />
              </label>
            </div>
          </div>
        </div>
      </Card>

      <Card title="ข้อมูลสำหรับตรวจสอบ Sync" description="ใช้เช็กบัญชีและจำนวนข้อมูลระหว่างทดสอบข้ามอุปกรณ์">
        <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <DebugItem label="UID" value={currentUserId} />
          <DebugItem label="Firebase Project" value={projectId} />
          <DebugItem label="สถานะ Sync" value={syncStatus.message} />
          <DebugItem
            label="ซิงก์ล่าสุด"
            value={syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleString('th-TH') : 'ยังไม่มี'}
          />
          <DebugItem label="รายการ" value={data.transactions.length.toString()} />
          <DebugItem label="รายการประจำ" value={data.recurringRules.length.toString()} />
          <DebugItem label="ยอดผ่อน" value={data.installmentPlans.length.toString()} />
          <DebugItem label="ทริป" value={data.trips.length.toString()} />
          <DebugItem label="งบประมาณ" value={data.budgets.length.toString()} />
          <DebugItem label="เป้าหมาย" value={data.goals.length.toString()} />
        </div>
      </Card>
    </div>
  )
}

function DebugItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs font-bold text-slate-400">{label}</div>
      <div className="truncate font-extrabold text-slate-700" title={value}>{value}</div>
    </div>
  )
}
