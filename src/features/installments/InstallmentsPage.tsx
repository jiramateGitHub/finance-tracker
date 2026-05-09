import { useMemo, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { th } from '../../i18n/th'
import type { AppData, InstallmentPlan } from '../../types/finance'
import { InstallmentCalendar } from './components/InstallmentCalendar'
import { InstallmentFilters } from './components/InstallmentFilters'
import { InstallmentPlanList } from './components/InstallmentPlanList'
import { InstallmentPlanModal } from './components/InstallmentPlanModal'
import { InstallmentSummaryCards } from './components/InstallmentSummaryCards'
import {
  createDefaultInstallmentFilters,
  filterInstallmentPlans,
  getCategoryOptions,
  setPaidMonth,
  summarizeInstallmentPlans,
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
  const [filters, setFilters] = useState<InstallmentFiltersState>(() => createDefaultInstallmentFilters())
  const [viewMode, setViewMode] = useState<InstallmentViewMode>('list')
  const [modalState, setModalState] = useState<ModalState>({ open: false, plan: null })
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null)

  const plans = data.installmentPlans
  const filteredPlans = useMemo(() => filterInstallmentPlans(plans, filters), [filters, plans])
  const summary = useMemo(() => summarizeInstallmentPlans(filteredPlans), [filteredPlans])
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

  return (
    <div className="grid gap-4">
      <Card
        title="ยอดผ่อน"
        description="ติดตามแผนผ่อน รอบที่จ่ายแล้ว ยอดคงเหลือ และตารางรายเดือน"
      >
        <InstallmentFilters
          filters={filters}
          viewMode={viewMode}
          resultCount={filteredPlans.length}
          onFiltersChange={setFilters}
          onViewModeChange={setViewMode}
          onAddPlan={openAddModal}
        />
      </Card>

      <Card title="สรุปยอดผ่อน" description="สรุปจากแผนผ่อนที่กำลังแสดง">
        <InstallmentSummaryCards summary={summary} />
      </Card>

      <Card title={viewMode === 'list' ? 'รายการแผนผ่อน' : 'ปฏิทินรายเดือน'}>
        {viewMode === 'list' ? (
          <InstallmentPlanList
            plans={filteredPlans}
            onEdit={openEditModal}
            onDelete={handleDelete}
            onToggleMonth={handleToggleMonth}
          />
        ) : (
          <InstallmentCalendar plans={filteredPlans} filters={filters} />
        )}
      </Card>

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
