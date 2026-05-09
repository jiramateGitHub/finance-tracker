import { useEffect, useMemo, useState } from 'react'
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
  getMonthKeysInRange,
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
  const [highlightedIds, setHighlightedIds] = useState<string[]>([])

  const categoryOptions = useMemo(() => getCategoryOptions(data), [data])
  const rangeMonths = useMemo(
    () => getMonthKeysInRange(filters.rangeStartMonth, filters.rangeEndMonth),
    [filters.rangeEndMonth, filters.rangeStartMonth],
  )
  const ledgerTransactions = useMemo(() => [
    ...data.transactions.filter((transaction) => !isInstallmentTransaction(transaction) && !transaction.tripId && transaction.sourceModule !== 'trip'),
    ...rangeMonths.flatMap((month) => deriveInstallmentTransactions(data.installmentPlans, month)),
    ...rangeMonths.flatMap((month) => deriveTripTransactions(data.trips, month)),
  ], [data.transactions, data.installmentPlans, data.trips, rangeMonths])
  const monthlyData = useMemo(() => ({
    ...data,
    transactions: ledgerTransactions,
    entries: ledgerTransactions,
  }), [data, ledgerTransactions])
  const filteredTransactions = useMemo(() => filterMonthlyTransactions(ledgerTransactions, filters), [ledgerTransactions, filters])
  const transactionGroups = useMemo(() => groupTransactionsByMonth(filteredTransactions), [filteredTransactions])
  const filteredTotals = useMemo(() => calculateMonthlyTotals(filteredTransactions), [filteredTransactions])
  const monthTotals = useMemo(
    () => calculateMonthlyTotals(ledgerTransactions.filter((transaction) => rangeMonths.includes(transaction.date.slice(0, 7)))),
    [ledgerTransactions, rangeMonths],
  )
  const rangeLabel = filters.rangeStartMonth === filters.rangeEndMonth
    ? formatMonth(filters.rangeStartMonth)
    : `${formatMonth(filters.rangeStartMonth)} - ${formatMonth(filters.rangeEndMonth)}`

  useEffect(() => {
    if (!highlightedIds.length) return undefined
    const timeoutId = window.setTimeout(() => setHighlightedIds([]), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [highlightedIds])

  function handleFiltersChange(nextFilters: MonthlyFiltersState): void {
    setFilters(nextFilters)
    if (nextFilters.rangeStartMonth !== selectedMonth) onMonthChange(nextFilters.rangeStartMonth)
  }

  function openAddModal(type: TransactionFormValues['type']): void {
    setModalState({
      open: true,
      transaction: null,
      defaults: {
        type,
        date: `${filters.rangeStartMonth || selectedMonth}-01`,
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

  function handleSubmit(transactions: TransactionEntry[]): void {
    const [transaction] = transactions
    if (!transaction) return
    if (modalState.transaction) {
      onUpdateTransaction(transaction.id, transaction)
    } else {
      transactions.forEach(onAddTransaction)
    }
    const transactionMonth = transaction.date.slice(0, 7)
    setHighlightedIds(transactions.map((item) => item.id))
    handleFiltersChange({ ...filters, rangeStartMonth: transactionMonth, rangeEndMonth: transactionMonth })
    closeModal()
  }

  function handleDuplicate(transaction: TransactionEntry): void {
    const now = new Date().toISOString()
    const duplicated: TransactionEntry = {
      ...transaction,
      id: crypto.randomUUID(),
      source: 'manual',
      sourceModule: 'manual',
      sourceRefId: null,
      tripId: null,
      installmentId: undefined,
      installmentPlanId: null,
      recurringRuleId: null,
      createdAt: now,
      updatedAt: now,
    }
    onAddTransaction(duplicated)
    setHighlightedIds([duplicated.id])
    const month = duplicated.date.slice(0, 7)
    handleFiltersChange({ ...filters, rangeStartMonth: month, rangeEndMonth: month })
  }

  function handleUseTemplate(transaction: TransactionEntry): void {
    setModalState({
      open: true,
      transaction: null,
      defaults: {
        type: transaction.type,
        date: `${filters.rangeStartMonth || selectedMonth}-${transaction.date.slice(8, 10) || '01'}`,
        category: transaction.categoryId || transaction.category,
        title: transaction.title,
        amount: String(transaction.amount),
        status: transaction.status,
        note: transaction.note ?? '',
        sourceModule: 'manual',
      },
    })
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
        description={`กำลังแสดง ${rangeLabel} พร้อมตัวกรอง ค้นหา และรายการที่แก้ไขได้`}
      >
        <QuickAddBar selectedMonth={filters.rangeStartMonth || selectedMonth} onAddTransaction={(transaction) => {
          onAddTransaction(transaction)
          setHighlightedIds([transaction.id])
        }} />
        <div className="mt-4">
          <MonthlyFilters
            filters={filters}
            resultCount={filteredTransactions.length}
            categoryOptions={categoryOptions}
            selectedMonth={selectedMonth}
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
            <div className="mt-1 text-lg font-extrabold">{rangeLabel}</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <ActionNeededPanel
          month={filters.rangeStartMonth || selectedMonth}
          transactions={ledgerTransactions}
          budgets={data.budgets}
          goals={data.goals}
          syncStatus={syncStatus}
        />
        <div className="grid gap-4">
          <RecentTransactionPanel transactions={data.transactions} />
          <FrequentTransactionShortcuts transactions={data.transactions} selectedMonth={filters.rangeStartMonth || selectedMonth} onAddTransaction={(transaction) => {
            onAddTransaction(transaction)
            setHighlightedIds([transaction.id])
          }} />
        </div>
      </div>

      <BudgetGoalSection
        data={monthlyData}
        selectedMonth={filters.rangeStartMonth || selectedMonth}
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
          highlightedIds={highlightedIds}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onUseTemplate={handleUseTemplate}
          onTogglePaid={handleTogglePaid}
        />
      </Card>

      {modalState.open && (
        <TransactionFormModal
          key={modalState.transaction?.id ?? `${modalState.defaults?.type ?? 'expense'}-${filters.rangeStartMonth}`}
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
