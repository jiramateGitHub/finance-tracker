import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { th } from '../../i18n/th'
import type { AppData, InstallmentPlan } from '../../types/finance'
import { currentMonthInputValue, formatMonth } from '../../utils/formatters'
import { InstallmentAlertBanner } from './components/InstallmentAlertBanner'
import { InstallmentCalendar } from './components/InstallmentCalendar'
import { InstallmentCategoryChart } from './components/InstallmentCategoryChart'
import { InstallmentFilters } from './components/InstallmentFilters'
import { InstallmentPlanList } from './components/InstallmentPlanList'
import { InstallmentPlanModal } from './components/InstallmentPlanModal'
import { InstallmentPlanTable } from './components/InstallmentPlanTable'
import { InstallmentProjectionChart } from './components/InstallmentProjectionChart'
import { InstallmentSummaryCards } from './components/InstallmentSummaryCards'
import {
  addMonths,
  calculateInstallmentMonthlyInfo,
  createDefaultInstallmentFilters,
  filterInstallmentPlans,
  getCategoryOptions,
  getInstallment12MonthProjection,
  getInstallmentCategoryDistribution,
  getInstallmentDashboardMetrics,
  setAllMonthsPaid,
  setPaidMonth,
  type InstallmentFilters as InstallmentFiltersState,
  type InstallmentViewMode,
} from './utils/installmentPlans'

type InstallmentsPageProps = {
  data: AppData
  onAddPlan: (plan: InstallmentPlan) => void
  onUpdatePlan: (planId: string, patch: Partial<InstallmentPlan>) => void
  onDeletePlan: (planId: string) => void
}

type ModalState = {
  open: boolean
  plan: InstallmentPlan | null
}

export function InstallmentsPage({ data, onAddPlan, onUpdatePlan, onDeletePlan }: InstallmentsPageProps) {
  const currentRealMonth = currentMonthInputValue()
  const [selectedMonth, setSelectedMonth] = useState<string>(currentRealMonth)
  const [filters, setFilters] = useState<InstallmentFiltersState>(() =>
    createDefaultInstallmentFilters(currentRealMonth),
  )
  const [viewMode, setViewMode] = useState<InstallmentViewMode>('list')
  const [modalState, setModalState] = useState<ModalState>({ open: false, plan: null })
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null)

  const plans = data.installmentPlans

  // Keep filters.selectedMonth in sync with selectedMonth
  const effectiveFilters = useMemo(
    () => ({ ...filters, selectedMonth }),
    [filters, selectedMonth],
  )

  const filteredPlans = useMemo(
    () => filterInstallmentPlans(plans, effectiveFilters),
    [effectiveFilters, plans],
  )

  // Metrics for rich overview cards & urgent banner
  const metrics = useMemo(
    () => getInstallmentDashboardMetrics(plans, selectedMonth),
    [plans, selectedMonth],
  )

  // Filter counts for quick status pills
  const filterCounts = useMemo(() => {
    let dueThisMonth = 0
    let unpaid = 0
    let paid = 0
    let completed = 0

    plans.forEach((plan) => {
      const info = calculateInstallmentMonthlyInfo(plan, selectedMonth)
      if (info.isCompleted) completed += 1
      if (info.isActiveInMonth) {
        dueThisMonth += 1
        if (info.isPaidInMonth) paid += 1
        else if (!info.isCompleted) unpaid += 1
      }
    })

    return {
      all: plans.length,
      dueThisMonth,
      unpaid,
      paid,
      completed,
    }
  }, [plans, selectedMonth])

  // 12-Month Debt Relief Projection data
  const projection = useMemo(
    () => getInstallment12MonthProjection(plans, selectedMonth),
    [plans, selectedMonth],
  )

  // Category Breakdown for selected month (installment_tracker.html reference)
  const categoryDistribution = useMemo(
    () => getInstallmentCategoryDistribution(plans, selectedMonth),
    [plans, selectedMonth],
  )

  const categoryOptions = useMemo(() => getCategoryOptions(data), [data])

  function openAddModal(): void {
    setModalState({ open: true, plan: null })
  }

  function openEditModal(plan: InstallmentPlan): void {
    setModalState({ open: true, plan })
  }

  function closeModal(): void {
    setModalState({ open: false, plan: null })
  }

  function handleSubmit(plan: InstallmentPlan): void {
    if (modalState.plan) onUpdatePlan(plan.id, plan)
    else onAddPlan(plan)
    closeModal()
  }

  function handleDelete(planId: string): void {
    setDeletePlanId(planId)
  }

  function handleToggleMonth(plan: InstallmentPlan, monthKey: string, isPaid: boolean): void {
    onUpdatePlan(plan.id, setPaidMonth(plan, monthKey, isPaid))
  }

  function handleSettleAll(plan: InstallmentPlan, isPaid: boolean): void {
    onUpdatePlan(plan.id, setAllMonthsPaid(plan, isPaid))
  }

  function handleClearFilters(): void {
    setFilters(createDefaultInstallmentFilters(selectedMonth))
  }

  return (
    <div className="finance-page-shell">
      {/* ==================== COMMAND / HEADER PANEL ==================== */}
      <section className="finance-command-panel">
        <div className="finance-toolbar finance-command-header border-b border-blue-100 pb-3">
          {/* Left: Title & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 shrink-0">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">ยอดผ่อน</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80">
                  ผ่อนสบาย
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block truncate">
                บันทึกยอดผ่อน & สรุปภาระรายจ่ายรายเดือน
              </p>
            </div>
          </div>

          {/* Center: Month Navigator (Touch-friendly & flexible) */}
          <div className="flex items-center justify-between bg-white p-1 rounded-xl border border-slate-200/90 shadow-xs w-full sm:w-auto">
            <button
              type="button"
              title="เดือนก่อนหน้า"
              onClick={() => setSelectedMonth((prev) => addMonths(prev, -1))}
              className="min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 p-2 sm:p-1.5 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <div className="px-2 sm:px-3 flex items-center justify-center gap-1.5 select-none flex-1 sm:flex-initial min-w-0">
              <svg className="w-4 h-4 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" y1="21" x2="21" y2="21" />
              </svg>
              <span className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight truncate">
                {formatMonth(selectedMonth)}
              </span>
            </div>

            <button
              type="button"
              title="เดือนถัดไป"
              onClick={() => setSelectedMonth((prev) => addMonths(prev, 1))}
              className="min-h-10 min-w-10 sm:min-h-8 sm:min-w-8 p-2 sm:p-1.5 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {selectedMonth !== currentRealMonth && (
              <button
                type="button"
                title="กลับมาเดือนปัจจุบัน"
                onClick={() => setSelectedMonth(currentRealMonth)}
                className="ml-1 min-h-10 sm:min-h-8 px-2.5 py-1 text-xs font-semibold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition border-l border-slate-200 cursor-pointer flex items-center shrink-0"
              >
                เดือนนี้
              </button>
            )}
          </div>

          {/* Right: Actions */}
          <div className="finance-command-actions w-full sm:w-auto">
            <Button type="button" variant="primary" onClick={openAddModal} className="w-full sm:w-auto min-h-11 sm:min-h-9 justify-center">
              <span className="flex items-center justify-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                <span>เพิ่มแผนผ่อน</span>
              </span>
            </Button>
          </div>
        </div>

        {/* ==================== STATS OVERVIEW CARDS ==================== */}
        <div className="mt-3.5 space-y-3.5">
          <InstallmentSummaryCards metrics={metrics} />

          {/* Alert Banner for Overdue / Due Soon */}
          <InstallmentAlertBanner
            urgentPlans={metrics.urgentPlans}
            selectedMonth={selectedMonth}
            onPay={handleToggleMonth}
          />
        </div>
      </section>

      {/* ==================== ANALYTICS & PROJECTION SECTION (installment_tracker.html line 280) ==================== */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 min-w-0 w-full max-w-full">
        <div className="lg:col-span-2 min-w-0 w-full max-w-full">
          <InstallmentProjectionChart
            projection={projection}
            selectedMonth={selectedMonth}
          />
        </div>
        <div className="lg:col-span-1 min-w-0 w-full max-w-full">
          <InstallmentCategoryChart
            distribution={categoryDistribution}
          />
        </div>
      </section>

      {/* ==================== FILTERS & SEARCH BAR ==================== */}
      <InstallmentFilters
        filters={filters}
        resultCount={filteredPlans.length}
        categoryOptions={categoryOptions}
        counts={filterCounts}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onFiltersChange={setFilters}
      />

      {/* ==================== MAIN ITEMS VIEW ==================== */}
      <Card
        title={
          viewMode === 'list'
            ? 'รายการแผนผ่อน'
            : viewMode === 'table'
            ? 'ตารางภาพรวมแผนผ่อน'
            : 'ปฏิทินรายเดือน'
        }
      >
        {viewMode === 'list' ? (
          <InstallmentPlanList
            plans={filteredPlans}
            selectedMonth={selectedMonth}
            totalPlansCount={plans.length}
            onOpenAdd={openAddModal}
            onClearFilters={handleClearFilters}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onToggleMonth={handleToggleMonth}
            onSettleAll={handleSettleAll}
          />
        ) : viewMode === 'table' ? (
          <InstallmentPlanTable
            plans={filteredPlans}
            selectedMonth={selectedMonth}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onToggleMonth={handleToggleMonth}
            onSettleAll={handleSettleAll}
          />
        ) : (
          <InstallmentCalendar plans={filteredPlans} filters={effectiveFilters} />
        )}
      </Card>

      {/* ==================== ADD / EDIT PLAN MODAL ==================== */}
      {modalState.open && (
        <InstallmentPlanModal
          key={modalState.plan?.id ?? 'new-installment-plan'}
          open={modalState.open}
          plan={modalState.plan}
          categoryOptions={categoryOptions}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}

      {/* ==================== DELETE CONFIRM MODAL ==================== */}
      <ConfirmModal
        open={deletePlanId !== null}
        title={th.installments.deleteTitle}
        confirmLabel={th.common.delete}
        destructive
        onConfirm={() => {
          if (deletePlanId) onDeletePlan(deletePlanId)
        }}
        onClose={() => setDeletePlanId(null)}
      />
    </div>
  )
}
