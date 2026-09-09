import { AppShell } from './components/layout/AppShell'
import { InstallmentsPage } from './features/installments/InstallmentsPage'
import { MonthlyPage } from './features/monthly/MonthlyPage'
import { MorePage } from './features/more/MorePage'
import { useAutoFinanceSync } from './features/sync/useAutoFinanceSync'
import { TripsPage } from './features/trips/TripsPage'
import { YearlyPage } from './features/yearly/YearlyPage'
import { useFinanceStore } from './hooks/useFinanceStore'
import { th } from './i18n/th'
import { createJsonDownload } from './lib/storage'
import type { FinanceImportPreview } from './state/FinanceDataProvider'

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

  async function handlePreviewImportJson(file: File): Promise<FinanceImportPreview | null> {
    return store.previewImportJson(file)
  }

  async function handleConfirmImportJson(preview: FinanceImportPreview): Promise<void> {
    createJsonDownload(store.data, 'finance-backup-before-import')
    const importedData = store.applyImportedJson(preview)
    await sync.saveNow(importedData, th.sync.cloudImport)
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
      syncStatus={sync.status}
    >
      {renderActiveView()}
    </AppShell>
  )
}

export default App
