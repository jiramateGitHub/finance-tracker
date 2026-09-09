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
    <div className="finance-page-shell space-y-4">
      {/* ==================== COMMAND / HEADER PANEL ==================== */}
      <section className="finance-command-panel">
        <div className="finance-toolbar finance-command-header border-b border-blue-100 pb-3">
          {/* Left: Title & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-white shadow-sm shadow-slate-700/20">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">ตั้งค่า & ข้อมูล</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80">
                  Cloud & Backup
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                จัดการบัญชี Firebase, ซิงก์ข้อมูลบน Cloud และนำเข้า/ส่งออกไฟล์สำรอง
              </p>
            </div>
          </div>

          {/* Right: Cloud Sync Status & Quick Actions */}
          <div className="finance-command-actions items-center">
            <SyncStatusBadge status={syncStatus} />
            <Button type="button" size="sm" onClick={onLogout} disabled={isCloudBusy}>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>{th.auth.logout}</span>
              </span>
            </Button>
          </div>
        </div>

        {/* Overview Counts Bar */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="text-slate-400">ข้อมูลปัจจุบัน:</span>
          <span className="rounded-xl bg-white border border-slate-200/80 px-2.5 py-1">
            รายการ {currentCounts.transactions.toLocaleString('th-TH')}
          </span>
          <span className="rounded-xl bg-white border border-slate-200/80 px-2.5 py-1">
            แผนผ่อน {currentCounts.installmentPlans.toLocaleString('th-TH')}
          </span>
          <span className="rounded-xl bg-white border border-slate-200/80 px-2.5 py-1">
            ทริป {currentCounts.trips.toLocaleString('th-TH')}
          </span>
          <span className="rounded-xl bg-white border border-slate-200/80 px-2.5 py-1">
            งบประมาณ {currentCounts.budgets.toLocaleString('th-TH')}
          </span>
          <span className="rounded-xl bg-white border border-slate-200/80 px-2.5 py-1">
            เป้าหมาย {currentCounts.goals.toLocaleString('th-TH')}
          </span>
        </div>
      </section>

      {/* ==================== 2 COLUMNS: FIREBASE & BACKUP ==================== */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Firebase Account Panel */}
        <Card
          title={
            <div className="flex items-center justify-between gap-2 w-full">
              <span className="font-bold text-slate-900">บัญชี Firebase Cloud</span>
              <SyncStatusBadge status={syncStatus} />
            </div>
          }
        >
          <p className="-mt-1 mb-3 text-xs font-medium text-slate-500">
            ข้อมูลหลักถูกบันทึกบน Cloud Firestore อัตโนมัติ ปลอดภัยและซิงก์ข้ามอุปกรณ์
          </p>

          <div className="truncate rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-sm font-semibold text-slate-800 flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="5" />
              <path d="M20 21a8 8 0 0 0-16 0" />
            </svg>
            <span className="truncate">{currentUserEmail}</span>
          </div>

          <div className={`mt-3 rounded-xl border px-3.5 py-2.5 text-sm font-semibold ${cloudStatusTone}`}>
            <div>{syncStatus.message}</div>
            {syncStatus.lastSyncedAt ? (
              <span className="mt-1 block text-xs font-medium opacity-80">
                {th.sync.lastSynced}: {new Date(syncStatus.lastSyncedAt).toLocaleString('th-TH')}
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="primary" onClick={onSaveToCloud} disabled={isCloudBusy}>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                  <path d="M12 12v9" />
                  <path d="m16 16-4-4-4 4" />
                </svg>
                <span>{th.sync.saveToCloud}</span>
              </span>
            </Button>
            <Button type="button" onClick={onLoadFromCloud} disabled={isCloudBusy}>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                  <path d="M12 21v-9" />
                  <path d="m8 17 4 4 4-4" />
                </svg>
                <span>{th.sync.loadFromCloud}</span>
              </span>
            </Button>
          </div>
        </Card>

        {/* JSON Backup Panel */}
        <Card
          title={
            <span className="font-bold text-slate-900">นำเข้า/ส่งออก JSON สำรอง</span>
          }
        >
          <p className="-mt-1 mb-3 text-xs font-medium text-slate-500">
            ก่อนนำเข้าทุกครั้ง ระบบจะดาวน์โหลดไฟล์สำรองให้อัตโนมัติเพื่อความปลอดภัย
          </p>

          <div className={`rounded-xl border px-3.5 py-2.5 text-sm font-semibold ${statusTone}`}>
            {dataStatus.message}
          </div>

          {importPreviewDiagnostics ? (
            <ImportDiagnosticsPanel
              diagnostics={importPreviewDiagnostics}
              title={pendingImport ? 'ตัวอย่างไฟล์ก่อนนำเข้า' : 'สรุปการนำเข้าล่าสุด'}
              dropWarnings={pendingImport ? dropWarnings : []}
            />
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="primary" onClick={onExportJson} disabled={isCloudBusy}>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>{th.file.exportJson}</span>
              </span>
            </Button>
            <label className={`inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-blue-700 shadow-xs hover:bg-blue-50/80 active:scale-[0.98] transition ${isCloudBusy ? 'pointer-events-none opacity-60' : ''}`}>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>เลือกไฟล์ JSON ตรวจสอบก่อนนำเข้า</span>
              </span>
              <input className="sr-only" type="file" accept="application/json,.json" onChange={handleFileChange} disabled={isCloudBusy} />
            </label>
          </div>
        </Card>
      </div>

      {/* Technical Info QA Accordion */}
      <details className="rounded-2xl border border-slate-200/80 bg-white p-4 text-sm shadow-xs transition hover:border-slate-300">
        <summary className="cursor-pointer list-none font-extrabold text-slate-700 marker:hidden flex items-center justify-between">
          <span>ข้อมูลทางเทคนิคสำหรับตรวจสอบ</span>
          <span className="text-xs font-bold text-slate-400">แตะเพื่อเปิด/ปิด</span>
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
