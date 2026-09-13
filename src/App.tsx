import { lazy, Suspense, useRef, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { useAutoFinanceSync } from './features/sync/useAutoFinanceSync'
import { useFinanceStore } from './hooks/useFinanceStore'
import { th } from './i18n/th'
import { createJsonDownload } from './lib/storage'
import { createEmptyFinanceData } from './lib/dataMigration'
import type { FinanceImportPreview } from './state/FinanceDataProvider'

const MonthlyPage = lazy(() => import('./features/monthly/MonthlyPage').then((module) => ({ default: module.MonthlyPage })))
const YearlyPage = lazy(() => import('./features/yearly/YearlyPage').then((module) => ({ default: module.YearlyPage })))
const InstallmentsPage = lazy(() => import('./features/installments/InstallmentsPage').then((module) => ({ default: module.InstallmentsPage })))
const TripsPage = lazy(() => import('./features/trips/TripsPage').then((module) => ({ default: module.TripsPage })))
const MorePage = lazy(() => import('./features/more/MorePage').then((module) => ({ default: module.MorePage })))

type AppProps = {
  currentUserId: string
  currentUserEmail: string
  onLogout: () => Promise<void>
}

function App({ currentUserId, currentUserEmail, onLogout }: AppProps) {
  const store = useFinanceStore()
  const [replacementMessage, setReplacementMessage] = useState<string | null>(null)
  const replacementBusyRef = useRef(false)
  const sync = useAutoFinanceSync({
    userId: currentUserId,
    data: store.data,
    replaceData: store.replaceData,
    dataReady: store.dataStatus.loadState !== 'loading',
    baselineData: store.dataStatus.cloudBaseline,
    reconciliationPending: Boolean(store.dataStatus.lastReconciliation?.tripOwnership.issues.length),
  })

  async function handleSaveToCloud(): Promise<void> {
    await sync.saveNow(store.data, th.sync.savedManual)
  }

  async function handleLoadFromCloud(discardDirty = false): Promise<void> {
    await sync.loadNow({ discardDirty })
  }

  async function handlePreviewImportJson(file: File): Promise<FinanceImportPreview | null> {
    return store.previewImportJson(file)
  }

  async function handleConfirmImportJson(preview: FinanceImportPreview): Promise<boolean> {
    if (replacementBusyRef.current) return false
    replacementBusyRef.current = true
    setReplacementMessage('กำลังนำเข้าและบันทึกข้อมูล กรุณารอจนเสร็จ')
    try {
      createJsonDownload(store.data, 'finance-backup-before-import')
      const result = await sync.saveNow(preview.data, th.sync.cloudImport, { replace: true })
      if (result.ok) store.markImportSucceeded(preview)
      else store.markImportFailed(preview, result.errorMessage ?? 'บันทึกข้อมูลนำเข้าไม่สำเร็จ')
      return result.ok
    } catch (error) {
      store.markImportFailed(preview, error instanceof Error ? error.message : 'นำเข้าข้อมูลไม่สำเร็จ')
      return false
    } finally {
      replacementBusyRef.current = false
      setReplacementMessage(null)
    }
  }

  async function handleResetData(): Promise<boolean> {
    if (replacementBusyRef.current) return false
    replacementBusyRef.current = true
    setReplacementMessage('กำลังล้างข้อมูลทั้งหมด กรุณารอจนเสร็จ')
    try {
      const result = await sync.saveNow(createEmptyFinanceData(), 'ล้างข้อมูลทั้งหมดและคืนค่าตั้งต้นแล้ว', { replace: true })
      return result.ok
    } finally {
      replacementBusyRef.current = false
      setReplacementMessage(null)
    }
  }

  function renderActiveView() {
    if (store.activeView === 'yearly') {
      return (
        <YearlyPage
          data={store.data}
          onSelectMonth={(monthKey) => {
            store.setSelectedMonth(monthKey)
            store.setActiveView('monthly')
          }}
        />
      )
    }
    if (store.activeView === 'installments') {
      return (
        <InstallmentsPage
          data={store.data}
          onAddPlan={store.addInstallmentPlan}
          onUpdatePlan={store.updateInstallmentPlan}
          onDeletePlan={store.deleteInstallmentPlan}
        />
      )
    }
    if (store.activeView === 'trips') {
      return (
        <TripsPage
          data={store.data}
          onAddTrip={store.addTrip}
          onUpdateTrip={store.updateTrip}
          onDeleteTrip={store.deleteTrip}
          onAddOrUpdateTripBudgetLine={store.addOrUpdateTripBudgetLine}
          onDeleteTripBudgetLine={store.deleteTripBudgetLine}
        />
      )
    }
    if (store.activeView === 'more') {
      return (
        <MorePage
          data={store.data}
          dataStatus={store.dataStatus}
          onExportJson={store.exportJson}
          onPreviewImportJson={handlePreviewImportJson}
          onConfirmImportJson={handleConfirmImportJson}
          currentUserId={currentUserId}
          currentUserEmail={currentUserEmail}
          onLogout={onLogout}
          syncStatus={sync.status}
          onLoadFromCloud={handleLoadFromCloud}
          onSaveToCloud={handleSaveToCloud}
          onAcknowledgeReconciliation={store.acknowledgeReconciliation}
          onResetData={handleResetData}
        />
      )
    }

    return (
      <MonthlyPage
        data={store.data}
        selectedMonth={store.selectedMonth}
        onMonthChange={store.setSelectedMonth}
        onAddTransaction={store.addTransaction}
        onUpdateTransaction={store.updateTransaction}
        onDeleteTransaction={store.deleteTransaction}
        onAddBudget={store.addBudget}
        onUpdateBudget={store.updateBudget}
        onDeleteBudget={store.deleteBudget}
        onAddGoal={store.addGoal}
        onUpdateGoal={store.updateGoal}
        onDeleteGoal={store.deleteGoal}
        syncStatus={sync.status}
      />
    )
  }

  return (
    <>
      <div inert={replacementMessage !== null}>
        <AppShell
          activeView={store.activeView}
          onChangeView={store.setActiveView}
          syncStatus={sync.status}
        >
          <Suspense fallback={(
            <div className="grid min-h-[24rem] place-items-center rounded-3xl border border-blue-100 bg-white p-6 text-sm font-extrabold text-finance-muted shadow-finance-sm">
              กำลังโหลดหน้าจอ...
            </div>
          )}>
            {renderActiveView()}
          </Suspense>
        </AppShell>
      </div>
      {replacementMessage ? (
        <div className="finance-modal-backdrop z-[100]" role="status" aria-live="polite" aria-busy="true">
          <div className="mx-4 max-w-md rounded-2xl bg-white p-6 text-center font-bold text-slate-800 shadow-xl">
            {replacementMessage}
          </div>
        </div>
      ) : null}
    </>
  )
}

export default App
