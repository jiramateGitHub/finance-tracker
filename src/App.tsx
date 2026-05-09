import { AppShell } from './components/layout/AppShell'
import { InstallmentsPage } from './features/installments/InstallmentsPage'
import { MonthlyPage } from './features/monthly/MonthlyPage'
import { MorePage } from './features/more/MorePage'
import { SyncConflictPanel } from './features/sync/SyncConflictPanel'
import type { ImportSyncMode } from './features/sync/syncTypes'
import { useAutoFinanceSync } from './features/sync/useAutoFinanceSync'
import { TripsPage } from './features/trips/TripsPage'
import { YearlyPage } from './features/yearly/YearlyPage'
import { useFinanceStore } from './hooks/useFinanceStore'
import { th } from './i18n/th'

type AppProps = {
  currentUserId: string
  currentUserEmail: string
  onLogout: () => Promise<void>
}

function App({ currentUserId, currentUserEmail, onLogout }: AppProps) {
  const store = useFinanceStore()
  const sync = useAutoFinanceSync({
    userId: currentUserId,
    data: store.data,
    replaceData: store.replaceData,
  })

  async function handleSaveToCloud(): Promise<void> {
    await sync.saveNow(store.data, th.sync.savedManual)
  }

  async function handleLoadFromCloud(): Promise<void> {
    await sync.loadNow()
  }

  async function handleImportJson(file: File, mode: ImportSyncMode): Promise<void> {
    if (mode === 'local-only') {
      sync.markLocalOnly(th.sync.localImport)
    } else {
      sync.enableAutoSave(th.sync.cloudImport)
    }
    await store.importJson(file)
  }

  function renderActiveView() {
    if (store.activeView === 'yearly') return <YearlyPage data={store.data} />
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
          onImportJson={handleImportJson}
          onResetDemoData={store.resetDemoData}
          currentUserEmail={currentUserEmail}
          onLogout={onLogout}
          syncStatus={sync.status}
          onLoadFromCloud={handleLoadFromCloud}
          onSaveToCloud={handleSaveToCloud}
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
    <AppShell
      activeView={store.activeView}
      onChangeView={store.setActiveView}
      currentUserEmail={currentUserEmail}
      syncStatus={sync.status}
      onLogout={onLogout}
    >
      <SyncConflictPanel
        cloudData={sync.pendingCloudData}
        onUseCloud={() => sync.resolveConflict('use-cloud')}
        onKeepLocal={() => sync.resolveConflict('keep-local')}
        onMerge={() => sync.resolveConflict('merge')}
      />
      {renderActiveView()}
    </AppShell>
  )
}

export default App
