import { useMemo, useState, type ChangeEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { SyncStatusBadge } from '../sync/SyncStatusBadge'
import type { FinanceDataStatus, FinanceImportPreview } from '../../state/FinanceDataProvider'
import type { AppData, FinanceData } from '../../types/finance'
import type { SyncStatus } from '../sync/syncTypes'
import { th } from '../../i18n/th'

type MorePageProps = {
  data: AppData
  dataStatus: FinanceDataStatus
  onExportJson: () => void
  onPreviewImportJson: (file: File) => Promise<FinanceImportPreview | null>
  onConfirmImportJson: (preview: FinanceImportPreview) => Promise<void>
  currentUserId: string
  currentUserEmail: string
  onLogout: () => Promise<void>
  syncStatus: SyncStatus
  onLoadFromCloud: () => Promise<void>
  onSaveToCloud: () => Promise<void>
}

type CountKey = 'transactions' | 'installmentPlans' | 'trips' | 'budgets' | 'goals'

type DataCounts = Record<CountKey, number>

const countLabels: Record<CountKey, string> = {
  transactions: 'รายการรายรับรายจ่าย',
  installmentPlans: 'แผนผ่อน',
  trips: 'ทริป',
  budgets: 'งบประมาณ',
  goals: 'เป้าหมาย',
}

function getDataCounts(data: Pick<FinanceData, CountKey>): DataCounts {
  return {
    transactions: data.transactions.length,
    installmentPlans: data.installmentPlans.length,
    trips: data.trips.length,
    budgets: data.budgets.length,
    goals: data.goals.length,
  }
}

function getLargeDropWarnings(currentCounts: DataCounts, importedCounts: DataCounts): string[] {
  return (Object.keys(countLabels) as CountKey[])
    .filter((key) => {
      const currentCount = currentCounts[key]
      const importedCount = importedCounts[key]
      if (currentCount < 5) return false
      if (importedCount === 0 && currentCount > 0) return true
      return importedCount <= Math.floor(currentCount * 0.5)
    })
    .map((key) => `${countLabels[key]}: ปัจจุบัน ${currentCounts[key].toLocaleString('th-TH')} → ไฟล์นำเข้า ${importedCounts[key].toLocaleString('th-TH')}`)
}

export function MorePage({
  data,
  dataStatus,
  onExportJson,
  onPreviewImportJson,
  onConfirmImportJson,
  currentUserId,
  currentUserEmail,
  onLogout,
  syncStatus,
  onLoadFromCloud,
  onSaveToCloud,
}: MorePageProps) {
  const [pendingImport, setPendingImport] = useState<FinanceImportPreview | null>(null)
  const [confirmingImport, setConfirmingImport] = useState(false)

  const currentCounts = useMemo(() => getDataCounts(data), [data])
  const pendingCounts = useMemo(() => (pendingImport ? getDataCounts(pendingImport.data) : null), [pendingImport])
  const dropWarnings = useMemo(
    () => (pendingCounts ? getLargeDropWarnings(currentCounts, pendingCounts) : []),
    [currentCounts, pendingCounts],
  )
  const hasLargeDropWarning = dropWarnings.length > 0

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const preview = await onPreviewImportJson(file)
    if (preview) setPendingImport(preview)
  }

  async function confirmPendingImport(): Promise<void> {
    if (!pendingImport || confirmingImport) return
    const preview = pendingImport
    setConfirmingImport(true)
    setPendingImport(null)
    try {
      await onConfirmImportJson(preview)
    } finally {
      setConfirmingImport(false)
    }
  }

  const statusTone = dataStatus.saveState === 'error' || dataStatus.importState === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
  const cloudStatusTone = syncStatus.state === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-700'
    : syncStatus.state === 'saved'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-blue-200 bg-blue-50 text-blue-700'
  const isCloudBusy = syncStatus.state === 'loading' || syncStatus.state === 'saving' || confirmingImport
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ไม่ได้ตั้งค่า'
  const importPreviewDiagnostics = pendingImport?.diagnostics ?? dataStatus.lastImportDiagnostics

  return (
    <div className="grid gap-4">
      <Card title="ซิงก์ Cloud และไฟล์สำรอง">
        <p className="-mt-2 mb-4 text-sm font-semibold leading-6 text-finance-muted">
          Tip: Cloud เป็นข้อมูลหลัก ส่วน JSON ใช้สำรองก่อนนำเข้า
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900">บัญชี Firebase</h3>
              <SyncStatusBadge status={syncStatus} />
            </div>
            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
              โหลดและบันทึกข้อมูลผ่านบัญชีนี้
            </p>
            <div className="mt-3 truncate rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
              {currentUserEmail}
            </div>
            <div className={`mt-3 rounded-xl border px-3 py-2 text-sm font-semibold ${cloudStatusTone}`}>
              {syncStatus.message}
              {syncStatus.lastSyncedAt ? (
                <span className="mt-1 block text-xs font-medium opacity-80">
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
              <Button type="button" onClick={onLogout} disabled={isCloudBusy}>
                {th.auth.logout}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4">
            <h3 className="font-bold text-slate-900">นำเข้า/ส่งออก JSON</h3>
            <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
              ก่อนนำเข้า ระบบจะดาวน์โหลดไฟล์สำรองให้อัตโนมัติ
            </p>
            <div className={`mt-3 rounded-xl border px-3 py-2 text-sm font-semibold ${statusTone}`}>
              {dataStatus.message}
            </div>

            {importPreviewDiagnostics ? (
              <ImportDiagnosticsPanel
                diagnostics={importPreviewDiagnostics}
                title={pendingImport ? 'ตัวอย่างไฟล์ก่อนนำเข้า' : 'สรุปการนำเข้าล่าสุด'}
                dropWarnings={pendingImport ? dropWarnings : []}
              />
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="primary" onClick={onExportJson} disabled={isCloudBusy}>
                {th.file.exportJson}
              </Button>
              <label className={`inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-blue-700 shadow-xs hover:bg-blue-50/80 active:scale-[0.98] transition ${isCloudBusy ? 'pointer-events-none opacity-60' : ''}`}>
                เลือกไฟล์ JSON เพื่อตรวจสอบก่อนนำเข้า
                <input className="sr-only" type="file" accept="application/json,.json" onChange={handleFileChange} disabled={isCloudBusy} />
              </label>
            </div>
          </div>
        </div>
      </Card>

      <details className="rounded-[18px] border border-slate-200 bg-white p-3 text-sm shadow-finance-sm sm:p-4">
        <summary className="cursor-pointer list-none font-extrabold text-slate-700 marker:hidden">
          ข้อมูลทางเทคนิคสำหรับตรวจสอบ
          <span className="ml-2 text-xs font-bold text-slate-400">ใช้ดูบัญชี โปรเจกต์ และจำนวนข้อมูล</span>
        </summary>
        <div className="mt-3 grid gap-3 border-t border-slate-100 pt-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <TechnicalItem label="รหัสผู้ใช้" value={currentUserId} />
          <TechnicalItem label="โปรเจกต์ Firebase" value={projectId} />
          <TechnicalItem label="สถานะซิงก์" value={syncStatus.message} />
          <TechnicalItem
            label="ซิงก์ล่าสุด"
            value={syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleString('th-TH') : 'ยังไม่มี'}
          />
          <TechnicalItem label="รายการ" value={data.transactions.length.toString()} />
          <TechnicalItem label="รายการประจำ" value={data.recurringRules.length.toString()} />
          <TechnicalItem label="ยอดผ่อน" value={data.installmentPlans.length.toString()} />
          <TechnicalItem label="ทริป" value={data.trips.length.toString()} />
          <TechnicalItem label="งบประมาณ" value={data.budgets.length.toString()} />
          <TechnicalItem label="เป้าหมาย" value={data.goals.length.toString()} />
        </div>
      </details>

      <ConfirmModal
        open={pendingImport !== null}
        title="ยืนยันนำเข้าและแทนที่ข้อมูลบน Cloud?"
        description={hasLargeDropWarning
          ? `ก่อนแทนที่ข้อมูล ระบบจะดาวน์โหลดไฟล์สำรองของข้อมูลปัจจุบันให้ก่อน จากนั้นจะนำข้อมูลในไฟล์นี้มาใช้กับบัญชีนี้และบันทึกขึ้น Cloud ทันที ไฟล์นี้มีจำนวนข้อมูลน้อยกว่าข้อมูลปัจจุบันมาก อาจทำให้ข้อมูลบน Cloud ถูกลบตาม (${dropWarnings.join(' · ')})`
          : 'ก่อนแทนที่ข้อมูล ระบบจะดาวน์โหลดไฟล์สำรองของข้อมูลปัจจุบันให้ก่อน จากนั้นจะนำข้อมูลในไฟล์นี้มาใช้กับบัญชีนี้และบันทึกขึ้น Cloud ทันที'}
        confirmLabel="ยืนยันนำเข้า"
        cancelLabel="ยกเลิก"
        destructive={hasLargeDropWarning}
        onConfirm={() => {
          void confirmPendingImport()
        }}
        onClose={() => setPendingImport(null)}
      />
    </div>
  )
}

function ImportDiagnosticsPanel({
  diagnostics,
  title,
  dropWarnings,
}: {
  diagnostics: FinanceDataStatus['lastImportDiagnostics']
  title: string
  dropWarnings: string[]
}) {
  if (!diagnostics) return null

  return (
    <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
      <div className="font-extrabold">{title}: {diagnostics.fileName ?? 'ไฟล์ JSON'}</div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <ImportDiagnosticItem label="เวอร์ชันข้อมูล" value={diagnostics.schemaVersion ? `v${diagnostics.schemaVersion}` : 'เดิม / ไม่ระบุ'} />
        <ImportDiagnosticItem label="รายการ" value={`${diagnostics.counts.transactions || diagnostics.counts.entries} รายการ`} />
        <ImportDiagnosticItem label="รายการประจำ" value={`${diagnostics.counts.recurringRules} รายการ`} />
        <ImportDiagnosticItem label="ยอดผ่อน" value={`${diagnostics.counts.installmentPlans} แผน`} />
        <ImportDiagnosticItem label="ทริป / รายการทริป" value={`${diagnostics.counts.trips} / ${diagnostics.counts.tripItems}`} />
        <ImportDiagnosticItem label="งบ / เป้าหมาย" value={`${diagnostics.counts.budgets} / ${diagnostics.counts.goals}`} />
      </div>
      <div className="mt-2 text-xs font-bold text-blue-800">
        หมวดหมู่ที่แปลง: {diagnostics.categorySummary.aliasMappingsApplied.length
          ? diagnostics.categorySummary.aliasMappingsApplied.map((item) => `${item.from} → ${item.to} (${item.count})`).join(', ')
          : 'ไม่มี'}
      </div>
      {dropWarnings.length ? (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-extrabold leading-5 text-amber-800">
          ไฟล์นี้มีจำนวนข้อมูลน้อยกว่าข้อมูลปัจจุบันมาก อาจทำให้ข้อมูลบน Cloud ถูกลบตาม
          <ul className="mt-1 grid gap-1">
            {dropWarnings.map((warning) => <li key={warning}>• {warning}</li>)}
          </ul>
        </div>
      ) : null}
      <ul className="mt-2 grid gap-1 text-xs font-semibold leading-5 text-blue-800">
        {diagnostics.warnings.map((warning) => <li key={warning}>• {warning}</li>)}
      </ul>
    </div>
  )
}

function TechnicalItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs font-bold text-slate-400">{label}</div>
      <div className="truncate font-extrabold text-slate-700" title={value}>{value}</div>
    </div>
  )
}

function ImportDiagnosticItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white/80 px-3 py-2">
      <div className="text-[11px] font-bold text-blue-500">{label}</div>
      <div className="font-extrabold text-blue-900">{value}</div>
    </div>
  )
}
