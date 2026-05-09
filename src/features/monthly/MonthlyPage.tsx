import { useMemo, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { th } from '../../i18n/th'
import type { AppData, Budget, Goal, TransactionEntry } from '../../types/finance'
import { formatMonth } from '../../utils/formatters'
import { BudgetGoalSection } from '../budgetGoals/BudgetGoalSection'
import { deriveInstallmentTransactions } from '../installments/utils/installmentPlans'
import type { SyncStatus } from '../sync/syncTypes'
import { deriveTripTransactions } from '../trips/utils/tripUtils'
import { ActionNeededPanel } from './components/ActionNeededPanel'
import { FrequentTransactionShortcuts } from './components/FrequentTransactionShortcuts'
import { MonthlyFilters } from './components/MonthlyFilters'
import { MonthlySummaryCards } from './components/MonthlySummaryCards'
import { QuickAddBar } from './components/QuickAddBar'
import { RecentTransactionPanel } from './components/RecentTransactionPanel'
import { TransactionFormModal } from './components/TransactionFormModal'
import { TransactionList } from './components/TransactionList'
import {
  calculateMonthlyTotals,
  createEmptyMonthlyFilters,
  filterMonthlyTransactions,
  getCategoryOptions,
  groupTransactionsByMonth,
  isInstallmentTransaction,
  type MonthlyFilters as MonthlyFiltersState,
  type TransactionFormValues,
} from './utils/monthlyLedger'

type MonthlyPageProps = {
  data: AppData
  selectedMonth: string
  onMonthChange: (monthKey: string) => void
  onAddTransaction: (transaction: TransactionEntry) => void
  onUpdateTransaction: (transactionId: string, patch: Partial<TransactionEntry>) => void
  onDeleteTransaction: (transactionId: string) => void
  onAddBudget: (budget: Budget) => void
  onUpdateBudget: (budgetId: string, patch: Partial<Budget>) => void
  onDeleteBudget: (budgetId: string) => void
  onAddGoal: (goal: Goal) => void
  onUpdateGoal: (goalId: string, patch: Partial<Goal>) => void
  onDeleteGoal: (goalId: string) => void
  syncStatus?: SyncStatus
}

type ModalState = {
  open: boolean
  transaction: TransactionEntry | null
  defaults?: Partial<TransactionFormValues>
}

export function MonthlyPage({
  data,
  selectedMonth,
  onMonthChange,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onAddBudget,
  onUpdateBudget,
  onDeleteBudget,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  syncStatus,
}: MonthlyPageProps) {
  const [filters, setFilters] = useState<MonthlyFiltersState>(() => createEmptyMonthlyFilters(selectedMonth))
  const [modalState, setModalState] = useState<ModalState>({ open: false, transaction: null })
  const [deleteTransactionId, setDeleteTransactionId] = useState<string | null>(null)

  const categoryOptions = useMemo(() => getCategoryOptions(data), [data])
  const ledgerTransactions = useMemo(() => [
    ...data.transactions.filter((transaction) => !isInstallmentTransaction(transaction) && !transaction.tripId && transaction.sourceModule !== 'trip'),
    ...deriveInstallmentTransactions(data.installmentPlans, filters.month),
    ...deriveTripTransactions(data.trips, filters.month),
  ], [data.transactions, data.installmentPlans, data.trips, filters.month])
  const monthlyData = useMemo(() => ({
    ...data,
    transactions: ledgerTransactions,
    entries: ledgerTransactions,
  }), [data, ledgerTransactions])
  const filteredTransactions = useMemo(() => filterMonthlyTransactions(ledgerTransactions, filters), [ledgerTransactions, filters])
  const transactionGroups = useMemo(() => groupTransactionsByMonth(filteredTransactions), [filteredTransactions])
  const filteredTotals = useMemo(() => calculateMonthlyTotals(filteredTransactions), [filteredTransactions])
  const monthTotals = useMemo(() => calculateMonthlyTotals(ledgerTransactions.filter((transaction) => transaction.date.startsWith(filters.month))), [ledgerTransactions, filters.month])

  function handleFiltersChange(nextFilters: MonthlyFiltersState): void {
    setFilters(nextFilters)
    if (nextFilters.month !== selectedMonth) onMonthChange(nextFilters.month)
  }

  function openAddModal(type: TransactionFormValues['type']): void {
    setModalState({
      open: true,
      transaction: null,
      defaults: {
        type,
        date: `${filters.month}-01`,
        status: type === 'income' ? 'cleared' : 'pending',
        sourceModule: 'manual',
      },
    })
  }

  function openEditModal(transaction: TransactionEntry): void {
    setModalState({ open: true, transaction })
  }

  function closeModal(): void {
    setModalState({ open: false, transaction: null })
  }

  function handleSubmit(transaction: TransactionEntry): void {
    if (modalState.transaction) {
      onUpdateTransaction(transaction.id, transaction)
    } else {
      onAddTransaction(transaction)
    }
    const transactionMonth = transaction.date.slice(0, 7)
    handleFiltersChange({ ...filters, month: transactionMonth })
    closeModal()
  }

  function handleDelete(transactionId: string): void {
    setDeleteTransactionId(transactionId)
  }

  function handleTogglePaid(transaction: TransactionEntry): void {
    if (transaction.type === 'income') return
    onUpdateTransaction(transaction.id, {
      status: transaction.status === 'pending' ? 'cleared' : 'pending',
    })
  }

  return (
    <div className="grid gap-4">
      <Card
        title={th.monthly.title}
        description={`กำลังแสดง ${formatMonth(filters.month)} พร้อมตัวกรอง ค้นหา และรายการที่แก้ไขได้`}
      >
        <QuickAddBar selectedMonth={filters.month} onAddTransaction={onAddTransaction} />
        <div className="mt-4">
        <MonthlyFilters
          filters={filters}
          resultCount={filteredTransactions.length}
          onChange={handleFiltersChange}
          onAddIncome={() => openAddModal('income')}
          onAddExpense={() => openAddModal('expense')}
        />
        </div>
      </Card>

      <Card title={th.monthly.totals} description="สรุปนี้คำนวณจากรายการที่กำลังแสดง">
        <MonthlySummaryCards totals={filteredTotals} />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-bold text-slate-500">{th.monthly.allRows}</div>
            <div className="mt-1 text-lg font-extrabold">{monthTotals.count}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-bold text-slate-500">{th.monthly.filteredRows}</div>
            <div className="mt-1 text-lg font-extrabold">{filteredTotals.count}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-bold text-slate-500">{th.monthly.selectedMonth}</div>
            <div className="mt-1 text-lg font-extrabold">{formatMonth(filters.month)}</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <ActionNeededPanel
          month={filters.month}
          transactions={ledgerTransactions}
          budgets={data.budgets}
          goals={data.goals}
          syncStatus={syncStatus}
        />
        <div className="grid gap-4">
          <RecentTransactionPanel transactions={data.transactions} />
          <FrequentTransactionShortcuts transactions={data.transactions} selectedMonth={filters.month} onAddTransaction={onAddTransaction} />
        </div>
      </div>

      <BudgetGoalSection
        data={monthlyData}
        selectedMonth={filters.month}
        onAddBudget={onAddBudget}
        onUpdateBudget={onUpdateBudget}
        onDeleteBudget={onDeleteBudget}
        onAddGoal={onAddGoal}
        onUpdateGoal={onUpdateGoal}
        onDeleteGoal={onDeleteGoal}
      />

      <Card title={th.monthly.grouped}>
        <TransactionList
          groups={transactionGroups}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onTogglePaid={handleTogglePaid}
        />
      </Card>

      {modalState.open && (
        <TransactionFormModal
          key={modalState.transaction?.id ?? `${modalState.defaults?.type ?? 'expense'}-${filters.month}`}
          open={modalState.open}
          transaction={modalState.transaction}
          defaultValues={modalState.defaults}
          categoryOptions={categoryOptions}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}

      <ConfirmModal
        open={deleteTransactionId !== null}
        title={th.transaction.deleteTitle}
        description={th.transaction.deleteDescription}
        confirmLabel={th.common.delete}
        destructive
        onConfirm={() => {
          if (deleteTransactionId) onDeleteTransaction(deleteTransactionId)
        }}
        onClose={() => setDeleteTransactionId(null)}
      />
    </div>
  )
}
