import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { IconPlus } from '../../components/ui/Icons'
import { ViewSwitcher, type StandardViewMode } from '../../components/ui/ViewSwitcher'
import { th } from '../../i18n/th'
import { createId } from '../../lib/id'
import type { AppData, Budget, Goal, RecurringRule, TransactionEntry } from '../../types/finance'
import { addMonths, currentIsoTimestamp, currentMonthInputValue, formatMonth } from '../../utils/formatters'
import { BudgetGoalSection } from '../budgetGoals/BudgetGoalSection'
import { RecurringBillModal } from '../recurring/components/RecurringBillModal'
import type { SyncStatus } from '../sync/syncTypes'
import { ActionNeededPanel } from './components/ActionNeededPanel'
import { DueBillsChecklistWidget } from './components/DueBillsChecklistWidget'
import { FrequentTransactionShortcuts } from './components/FrequentTransactionShortcuts'
import { MonthlyCalendarView } from './components/MonthlyCalendarView'
import { MonthlyFilters } from './components/MonthlyFilters'
import { MonthlySummaryCards } from './components/MonthlySummaryCards'
import { QuickAddBar } from './components/QuickAddBar'
import { RecentTransactionPanel } from './components/RecentTransactionPanel'
import { TransactionFormModal } from './components/TransactionFormModal'
import { TransactionList } from './components/TransactionList'
import { TransactionTable } from './components/TransactionTable'
import { getQuickAddDate } from './utils/quickAddParser'
import {
  calculateMonthlyTotals,
  createMemoizedLedgerSelector,
  createEmptyMonthlyFilters,
  filterMonthlyTransactions,
  getCategoryOptions,
  getSafeDateInMonth,
  groupTransactionsByMonth,
  resolveMonthlyFilterRange,
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
  onAddRecurringRule?: (rule: RecurringRule) => void
  onPayRecurringRule?: (
    ruleId: string,
    monthKey: string,
    options?: {
      createTransaction: boolean
      amount: number
      date: string
      note?: string
    },
  ) => void
  onUnpayRecurringRule?: (ruleId: string, monthKey: string) => void
  onNavigateToObligations?: () => void
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
  onAddRecurringRule = () => {},
  onPayRecurringRule = () => {},
  onUnpayRecurringRule = () => {},
  onNavigateToObligations,
  syncStatus,
}: MonthlyPageProps) {
  const [prevSelectedMonth, setPrevSelectedMonth] = useState(selectedMonth)
  const [filters, setFilters] = useState<MonthlyFiltersState>(() => createEmptyMonthlyFilters(selectedMonth))
  const [isAddBillOpen, setIsAddBillOpen] = useState(false)

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
  const [viewMode, setViewMode] = useState<StandardViewMode>('cards')

  const categoryOptions = useMemo(() => getCategoryOptions(data), [data])
  const selectLedger = useMemo(() => createMemoizedLedgerSelector(), [])
  const resolvedRange = useMemo(() => resolveMonthlyFilterRange(filters), [filters])
  const ledgerTransactions = useMemo(
    () => selectLedger(data, {
      startMonth: resolvedRange[0],
      endMonth: resolvedRange[1],
    }),
    [data, resolvedRange, selectLedger],
  )
  const monthlyData = useMemo(() => ({
    ...data,
    transactions: ledgerTransactions,
  }), [data, ledgerTransactions])
  const filteredTransactions = useMemo(() => filterMonthlyTransactions(ledgerTransactions, filters), [ledgerTransactions, filters])
  const totalsOptions = useMemo(
    () => ({ includePending: data.settings.includePendingInMonthlyTotals }),
    [data.settings.includePendingInMonthlyTotals],
  )
  const transactionGroups = useMemo(
    () => groupTransactionsByMonth(filteredTransactions, totalsOptions),
    [filteredTransactions, totalsOptions],
  )
  const filteredTotals = useMemo(
    () => calculateMonthlyTotals(filteredTransactions, totalsOptions),
    [filteredTransactions, totalsOptions],
  )
  const monthTotals = useMemo(
    () => calculateMonthlyTotals(ledgerTransactions, totalsOptions),
    [ledgerTransactions, totalsOptions],
  )
  const rangeLabel = resolvedRange[0] === resolvedRange[1]
    ? formatMonth(resolvedRange[0])
    : `${formatMonth(resolvedRange[0])} - ${formatMonth(resolvedRange[1])}`

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
        date: getQuickAddDate(filters.rangeStartMonth || selectedMonth),
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
      id: createId(),
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
    const targetMonth = filters.rangeStartMonth || selectedMonth
    setModalState({
      open: true,
      transaction: null,
      defaults: {
        type: transaction.type,
        date: getSafeDateInMonth(targetMonth, transaction.date.slice(8, 10)),
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
    <div className="finance-page-shell">
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
                <Badge tone="primary">
                  บันทึกรายเดือน
                </Badge>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                บันทึกและติดตามกระแสเงินสดรายรับ-รายจ่ายประจำเดือน
              </p>
            </div>
          </div>

          {/* Center: Month Navigator */}
          <div className="flex items-center justify-between sm:justify-center bg-white p-1 rounded-xl border border-slate-200/90 shadow-xs w-full sm:w-auto">
            <button
              type="button"
              title="เดือนก่อนหน้า"
              onClick={() => handleNavigateMonth(-1)}
              className="min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 p-2 sm:p-1.5 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <div className="px-3 flex items-center justify-center gap-1.5 select-none flex-1 sm:flex-initial">
              <svg className="w-4 h-4 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" y1="21" x2="21" y2="21" />
              </svg>
              <span className="text-sm font-bold text-slate-800 tracking-tight whitespace-nowrap">
                {formatMonth(activeMonth)}
              </span>
            </div>

            <button
              type="button"
              title="เดือนถัดไป"
              onClick={() => handleNavigateMonth(1)}
              className="min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 p-2 sm:p-1.5 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
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
                className="ml-1 min-h-10 sm:min-h-8 px-2.5 py-1 text-xs font-semibold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition border-l border-slate-200 cursor-pointer flex items-center"
              >
                เดือนนี้
              </button>
            )}
          </div>

          {/* Right: Actions */}
          <div className="finance-command-actions w-full sm:w-auto grid grid-cols-2 sm:flex">
            <Button
              type="button"
              variant="success"
              icon={<IconPlus size={16} />}
              onClick={() => openAddModal('income')}
              className="w-full sm:w-auto min-h-11 sm:min-h-9 justify-center"
            >
              <span>{th.transaction.addIncome}</span>
            </Button>
            <Button
              type="button"
              variant="danger"
              icon={<IconPlus size={16} />}
              onClick={() => openAddModal('expense')}
              className="w-full sm:w-auto min-h-11 sm:min-h-9 justify-center"
            >
              <span>{th.transaction.addExpense}</span>
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

      {/* ==================== DUE BILLS CHECKLIST WIDGET ==================== */}
      <DueBillsChecklistWidget
        rules={data.recurringRules}
        selectedMonth={activeMonth}
        onPayRule={onPayRecurringRule}
        onUnpayRule={onUnpayRecurringRule}
        onNavigateToObligations={onNavigateToObligations}
        onAddRule={() => setIsAddBillOpen(true)}
      />

      {/* ==================== ACTION NEEDED / RECENT / FREQUENT ==================== */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <ActionNeededPanel
          month={activeMonth}
          transactions={ledgerTransactions}
          budgets={data.budgets}
          goals={data.goals}
          includePending={data.settings.includePendingInMonthlyTotals}
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

      {/* ==================== TRANSACTIONS SECTION (CARDS / TABLE / CALENDAR) ==================== */}
      <Card
        title={
          <div className="flex items-center gap-2.5">
            <span>
              {viewMode === 'cards'
                ? th.monthly.grouped
                : viewMode === 'table'
                ? 'ตารางรายการรายรับ-รายจ่าย'
                : 'ปฏิทินรายรับ-รายจ่าย'}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {filteredTransactions.length}
            </span>
          </div>
        }
        actions={
          <ViewSwitcher
            activeView={viewMode}
            onViewChange={setViewMode}
            options={[
              { id: 'cards', label: 'การ์ด', icon: 'cards' },
              { id: 'table', label: 'ตาราง', icon: 'table' },
              { id: 'calendar', label: 'ปฏิทิน', icon: 'calendar' },
            ]}
          />
        }
      >
        {viewMode === 'cards' ? (
          <TransactionList
            groups={transactionGroups}
            highlightedIds={highlightedIds}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onUseTemplate={handleUseTemplate}
            onTogglePaid={handleTogglePaid}
          />
        ) : viewMode === 'table' ? (
          <TransactionTable
            transactions={filteredTransactions}
            highlightedIds={highlightedIds}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onUseTemplate={handleUseTemplate}
            onTogglePaid={handleTogglePaid}
          />
        ) : (
          <MonthlyCalendarView
            transactions={filteredTransactions}
            selectedMonth={activeMonth}
            highlightedIds={highlightedIds}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onUseTemplate={handleUseTemplate}
            onTogglePaid={handleTogglePaid}
          />
        )}
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

      {isAddBillOpen && (
        <RecurringBillModal
          open={isAddBillOpen}
          categoryOptions={categoryOptions}
          onClose={() => setIsAddBillOpen(false)}
          onSubmit={(rule) => {
            onAddRecurringRule(rule)
            setIsAddBillOpen(false)
          }}
        />
      )}
    </div>
  )
}
