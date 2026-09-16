import { useMemo, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { IconPlus } from '../../components/ui/Icons'
import { ViewSwitcher } from '../../components/ui/ViewSwitcher'
import { th } from '../../i18n/th'
import type { AppData, InstallmentPlan, RecurringRule } from '../../types/finance'
import { currentMonthInputValue, formatMonth } from '../../utils/formatters'
import { ObligationsMasterCalendar } from '../recurring/components/ObligationsMasterCalendar'
import { RecurringBillModal } from '../recurring/components/RecurringBillModal'
import { RecurringBillsSection } from '../recurring/components/RecurringBillsSection'
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

export type ObligationsHubTab = 'bills' | 'installments' | 'calendar'

type InstallmentsPageProps = {
  data: AppData
  selectedMonth?: string
  onMonthChange?: (monthKey: string) => void
  onAddPlan: (plan: InstallmentPlan) => void
  onUpdatePlan: (planId: string, patch: Partial<InstallmentPlan>) => void
  onDeletePlan: (planId: string) => void
  onAddRecurringRule?: (rule: RecurringRule) => void
  onUpdateRecurringRule?: (ruleId: string, patch: Partial<RecurringRule>) => void
  onDeleteRecurringRule?: (ruleId: string) => void
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
}

type ModalState = {
  open: boolean
  plan: InstallmentPlan | null
}

export function InstallmentsPage({
  data,
  selectedMonth: selectedMonthProp,
  onMonthChange,
  onAddPlan,
  onUpdatePlan,
  onDeletePlan,
  onAddRecurringRule = () => {},
  onUpdateRecurringRule = () => {},
  onDeleteRecurringRule = () => {},
  onPayRecurringRule = () => {},
  onUnpayRecurringRule = () => {},
}: InstallmentsPageProps) {
  const currentRealMonth = currentMonthInputValue()
  const [internalSelectedMonth, setInternalSelectedMonth] = useState<string>(selectedMonthProp || currentRealMonth)
  const selectedMonth = selectedMonthProp || internalSelectedMonth
  const handleMonthChange = (monthKey: string) => {
    setInternalSelectedMonth(monthKey)
    onMonthChange?.(monthKey)
  }
  const [hubTab, setHubTab] = useState<ObligationsHubTab>('bills')
  const [filters, setFilters] = useState<InstallmentFiltersState>(() =>
    createDefaultInstallmentFilters(selectedMonth),
  )
  const [viewMode, setViewMode] = useState<InstallmentViewMode>('list')
  const [modalState, setModalState] = useState<ModalState>({ open: false, plan: null })
  const [isAddBillModalOpen, setIsAddBillModalOpen] = useState(false)
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null)

  const plans = data.installmentPlans
  const recurringRules = data.recurringRules

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
    return {
      all: plans.length,
      dueThisMonth: metrics.activeCountThisMonth,
      unpaid: metrics.pendingCountThisMonth,
      paid: metrics.paidCountThisMonth,
      completed: metrics.completedCount,
    }
  }, [metrics, plans.length])

  // 12-Month Debt Relief Projection data
  const projection = useMemo(
    () => getInstallment12MonthProjection(plans, selectedMonth),
    [plans, selectedMonth],
  )

  // Category Breakdown for selected month
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
              {hubTab === 'bills' ? (
                <span className="text-lg">💳</span>
              ) : hubTab === 'calendar' ? (
                <span className="text-lg">📅</span>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" x2="22" y1="10" y2="10" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  {hubTab === 'bills'
                    ? 'บิลประจำ & บัตรเครดิต'
                    : hubTab === 'calendar'
                      ? 'ปฏิทินภาระหนี้รวม'
                      : 'ยอดผ่อนชำระ'}
                </h2>
                <Badge tone="primary">
                  {hubTab === 'bills' ? 'ภาระประจำ' : hubTab === 'calendar' ? 'ภาพรวม' : 'ผ่อนสบาย'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block truncate">
                {hubTab === 'bills'
                  ? 'บันทึกวันตัดรอบ วันครบกำหนดชำระ และเตือนจ่าย 1-Click'
                  : hubTab === 'calendar'
                    ? 'ตารางภาพรวมยอดที่ต้องชำระของทุกวันในเดือน'
                    : 'บันทึกยอดผ่อน & สรุปภาระรายจ่ายรายเดือน'}
              </p>
            </div>
          </div>

          {/* Center: Month Navigator */}
          <div className="flex items-center justify-between bg-white p-1 rounded-xl border border-slate-200/90 shadow-xs w-full sm:w-auto">
            <button
              type="button"
              title="เดือนก่อนหน้า"
              onClick={() => handleMonthChange(addMonths(selectedMonth, -1))}
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
              onClick={() => handleMonthChange(addMonths(selectedMonth, 1))}
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
                onClick={() => handleMonthChange(currentRealMonth)}
                className="ml-1 min-h-10 sm:min-h-8 px-2.5 py-1 text-xs font-semibold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition border-l border-slate-200 cursor-pointer flex items-center shrink-0"
              >
                เดือนนี้
              </button>
            )}
          </div>

          {/* Right: Actions */}
          <div className="finance-command-actions w-full sm:w-auto">
            {hubTab === 'bills' ? (
              <Button
                type="button"
                variant="primary"
                icon={<IconPlus size={16} />}
                onClick={() => setIsAddBillModalOpen(true)}
                className="w-full sm:w-auto min-h-11 sm:min-h-9 justify-center"
              >
                <span>เพิ่มบิลประจำ</span>
              </Button>
            ) : hubTab === 'installments' ? (
              <Button
                type="button"
                variant="primary"
                icon={<IconPlus size={16} />}
                onClick={openAddModal}
                className="w-full sm:w-auto min-h-11 sm:min-h-9 justify-center"
              >
                <span>เพิ่มแผนผ่อน</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="light"
                icon={<IconPlus size={16} />}
                onClick={() => setIsAddBillModalOpen(true)}
                className="w-full sm:w-auto min-h-11 sm:min-h-9 justify-center"
              >
                <span>เพิ่มบิลใหม่</span>
              </Button>
            )}
          </div>
        </div>

        {/* ==================== HUB SEGMENTED SWITCHER ==================== */}
        <div className="mt-3 flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80 w-full sm:w-auto self-start gap-1">
          <button
            type="button"
            onClick={() => setHubTab('bills')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              hubTab === 'bills'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>💳 บิลประจำ & บัตรเครดิต</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                hubTab === 'bills' ? 'bg-blue-100 text-blue-700 font-extrabold' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {recurringRules.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setHubTab('installments')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              hubTab === 'installments'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>🧾 ยอดผ่อนชำระ</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                hubTab === 'installments' ? 'bg-blue-100 text-blue-700 font-extrabold' : 'bg-slate-200 text-slate-600'
              }`}
            >
              {plans.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setHubTab('calendar')}
            className={`flex-1 sm:flex-initial px-3.5 py-2 sm:py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              hubTab === 'calendar'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📅 ปฏิทินภาระรวม</span>
          </button>
        </div>
      </section>

      {/* ==================== TAB 1: RECURRING BILLS & CARDS ==================== */}
      {hubTab === 'bills' && (
        <RecurringBillsSection
          rules={recurringRules}
          selectedMonth={selectedMonth}
          categoryOptions={categoryOptions}
          onAddRule={onAddRecurringRule}
          onUpdateRule={onUpdateRecurringRule}
          onDeleteRule={onDeleteRecurringRule}
          onPayRule={onPayRecurringRule}
          onUnpayRule={onUnpayRecurringRule}
        />
      )}

      {/* ==================== TAB 2: INSTALLMENTS ==================== */}
      {hubTab === 'installments' && (
        <div className="space-y-4">
          {/* Stats Overview Cards & Alert Banner */}
          <div className="space-y-3.5">
            <InstallmentSummaryCards metrics={metrics} />

            <InstallmentAlertBanner
              urgentPlans={metrics.urgentPlans}
              selectedMonth={selectedMonth}
              onPay={handleToggleMonth}
            />
          </div>

          {/* Analytics & Projection Section */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 min-w-0 w-full max-w-full items-stretch">
            <div className="lg:col-span-2 min-w-0 w-full max-w-full flex flex-col">
              <InstallmentProjectionChart
                projection={projection}
                selectedMonth={selectedMonth}
              />
            </div>
            <div className="lg:col-span-1 min-w-0 w-full max-w-full flex flex-col">
              <InstallmentCategoryChart distribution={categoryDistribution} />
            </div>
          </section>

          {/* Filters & Search Bar */}
          <InstallmentFilters
            filters={filters}
            resultCount={filteredPlans.length}
            categoryOptions={categoryOptions}
            counts={filterCounts}
            onFiltersChange={setFilters}
          />

          {/* Main Items View */}
          <Card
            title={
              <div className="flex items-center gap-2.5">
                <span>
                  {viewMode === 'list'
                    ? 'รายการแผนผ่อน'
                    : viewMode === 'table'
                      ? 'ตารางภาพรวมแผนผ่อน'
                      : 'ปฏิทินรายเดือน'}
                </span>
                <Badge tone="neutral">
                  {filteredPlans.length}
                </Badge>
              </div>
            }
            actions={
              <ViewSwitcher<InstallmentViewMode>
                activeView={viewMode}
                onViewChange={setViewMode}
                options={[
                  { id: 'list', label: 'การ์ด', icon: 'cards' },
                  { id: 'table', label: 'ตาราง', icon: 'table' },
                  { id: 'calendar', label: 'ปฏิทิน', icon: 'calendar' },
                ]}
              />
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
        </div>
      )}

      {/* ==================== TAB 3: MASTER CALENDAR ==================== */}
      {hubTab === 'calendar' && (
        <ObligationsMasterCalendar
          rules={recurringRules}
          plans={plans}
          selectedMonth={selectedMonth}
          onPayRule={onPayRecurringRule}
          onUnpayRule={onUnpayRecurringRule}
          onToggleInstallmentMonth={handleToggleMonth}
        />
      )}

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

      {/* ==================== ADD RECURRING BILL MODAL (FROM COMMAND BAR) ==================== */}
      {isAddBillModalOpen && (
        <RecurringBillModal
          open={isAddBillModalOpen}
          categoryOptions={categoryOptions}
          onClose={() => setIsAddBillModalOpen(false)}
          onSubmit={(newRule) => {
            onAddRecurringRule(newRule)
            setIsAddBillModalOpen(false)
          }}
        />
      )}

      {/* ==================== DELETE PLAN CONFIRM MODAL ==================== */}
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
