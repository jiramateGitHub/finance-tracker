import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { th } from '../../i18n/th'
import type { AppData, Budget, Goal, TransactionEntry } from '../../types/finance'
import { addMonths, currentIsoTimestamp, currentMonthInputValue, formatMonth } from '../../utils/formatters'
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
  const [prevSelectedMonth, setPrevSelectedMonth] = useState(selectedMonth)
  const [filters, setFilters] = useState<MonthlyFiltersState>(() => createEmptyMonthlyFilters(selectedMonth))

  if (prevSelectedMonth !== selectedMonth) {
    setPrevSelectedMonth(selectedMonth)
    setFilters((prev) => ({
      ...prev,
      rangeStartMonth: selectedMonth,
      rangeEndMonth: selectedMonth,
    }))
  }
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
    if (nextFilters.rangeStartMonth !== selectedMonth) {
      setPrevSelectedMonth(nextFilters.rangeStartMonth)
      onMonthChange(nextFilters.rangeStartMonth)
    }
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
    const now = currentIsoTimestamp()
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

  const currentRealMonth = currentMonthInputValue()
  const activeMonth = filters.rangeStartMonth || selectedMonth

  function handleNavigateMonth(delta: number): void {
    const nextMonth = addMonths(activeMonth, delta)
    handleFiltersChange({
      ...filters,
      rangeStartMonth: nextMonth,
      rangeEndMonth: nextMonth,
    })
  }

  function handleJumpToCurrentMonth(): void {
    handleFiltersChange({
      ...filters,
      rangeStartMonth: currentRealMonth,
      rangeEndMonth: currentRealMonth,
    })
  }

  return (
    <div className="finance-page-shell space-y-4">
      {/* ==================== COMMAND / HEADER PANEL ==================== */}
      <section className="finance-command-panel">
        <div className="finance-toolbar finance-command-header border-b border-blue-100 pb-3">
          {/* Left: Title & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">รายรับ-รายจ่าย</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80">
                  บันทึกรายเดือน
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                บันทึกและติดตามกระแสเงินสดรายรับ-รายจ่ายประจำเดือน
              </p>
            </div>
          </div>

          {/* Center: Month Navigator */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200/90 shadow-xs">
            <button
              type="button"
              title="เดือนก่อนหน้า"
              onClick={() => handleNavigateMonth(-1)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <div className="px-3 flex items-center gap-1.5 select-none">
              <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" y1="21" x2="21" y2="21" />
              </svg>
              <span className="text-sm font-bold text-slate-800 tracking-tight">
                {formatMonth(activeMonth)}
              </span>
            </div>

            <button
              type="button"
              title="เดือนถัดไป"
              onClick={() => handleNavigateMonth(1)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {activeMonth !== currentRealMonth && (
              <button
                type="button"
                title="กลับมาเดือนปัจจุบัน"
                onClick={handleJumpToCurrentMonth}
                className="ml-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition border-l border-slate-200 cursor-pointer"
              >
                เดือนนี้
              </button>
            )}
          </div>

          {/* Right: Actions */}
          <div className="finance-command-actions">
            <Button type="button" variant="success" onClick={() => openAddModal('income')}>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>{th.transaction.addIncome}</span>
              </span>
            </Button>
            <Button type="button" variant="danger" onClick={() => openAddModal('expense')}>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>{th.transaction.addExpense}</span>
              </span>
            </Button>
          </div>
        </div>

        {/* Quick Add Bar & Stats Overview Cards */}
        <div className="mt-3.5 space-y-3.5">
          <QuickAddBar
            selectedMonth={activeMonth}
            onAddTransaction={(transaction) => {
              onAddTransaction(transaction)
              setHighlightedIds([transaction.id])
            }}
          />

          <MonthlySummaryCards totals={filteredTotals} />

          {/* Meta Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-500 font-medium px-1">
            <span>ช่วงเวลาที่แสดง: <strong className="text-slate-800">{rangeLabel}</strong></span>
            <div className="flex items-center gap-3">
              <span>{th.monthly.allRows}: <strong className="text-slate-800">{monthTotals.count}</strong></span>
              <span>{th.monthly.filteredRows}: <strong className="text-blue-700 font-bold">{filteredTotals.count}</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FILTERS BAR ==================== */}
      <MonthlyFilters
        filters={filters}
        resultCount={filteredTransactions.length}
        categoryOptions={categoryOptions}
        selectedMonth={activeMonth}
        onChange={handleFiltersChange}
      />

      {/* ==================== ACTION NEEDED / RECENT / FREQUENT ==================== */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <ActionNeededPanel
          month={activeMonth}
          transactions={ledgerTransactions}
          budgets={data.budgets}
          goals={data.goals}
          syncStatus={syncStatus}
        />
        <div className="grid gap-4">
          <RecentTransactionPanel transactions={data.transactions} />
          <FrequentTransactionShortcuts
            transactions={data.transactions}
            selectedMonth={activeMonth}
            onAddTransaction={(transaction) => {
              onAddTransaction(transaction)
              setHighlightedIds([transaction.id])
            }}
          />
        </div>
      </div>

      {/* ==================== BUDGET & GOAL SECTION ==================== */}
      <BudgetGoalSection
        data={monthlyData}
        selectedMonth={activeMonth}
        onAddBudget={onAddBudget}
        onUpdateBudget={onUpdateBudget}
        onDeleteBudget={onDeleteBudget}
        onAddGoal={onAddGoal}
        onUpdateGoal={onUpdateGoal}
        onDeleteGoal={onDeleteGoal}
      />

      {/* ==================== GROUPED TRANSACTION LIST ==================== */}
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
