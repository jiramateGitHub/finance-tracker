import { useMemo, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { SummaryCard } from '../../components/ui/SummaryCard'
import { th } from '../../i18n/th'
import type { AppData, BudgetLine, Trip, TripItem } from '../../types/finance'
import { clampPercent, formatDate, formatMoney } from '../../utils/formatters'
import { TripDetail } from './components/TripDetail'
import { TripBudgetFormModal } from './components/TripBudgetFormModal'
import { TripCalendar } from './components/TripCalendar'
import { TripFilters } from './components/TripFilters'
import { TripItemModal } from './components/TripItemModal'
import { TripList } from './components/TripList'
import { TripModal } from './components/TripModal'
import { TripSummaryCards } from './components/TripSummaryCards'
import {
  calculateTripTotals,
  createEmptyTripFilters,
  deleteTripItem,
  filterTrips,
  getCategoryOptions,
  getTripBudgetLines,
  getTripDayCount,
  getTripStatus,
  summarizeTrips,
  toggleTripItemPaid,
  tripStatusLabel,
  upsertTripItem,
  type TripDetailTab,
  type TripFilters as TripFiltersState,
} from './utils/tripUtils'

type TripsPageProps = {
  data: AppData
  onAddTrip: (trip: Trip) => void
  onUpdateTrip: (tripId: string, patch: Partial<Trip>) => void
  onDeleteTrip: (tripId: string) => void
  onAddOrUpdateTripBudgetLine: (tripId: string, categoryId: string, amount: number, note?: string) => void
  onDeleteTripBudgetLine: (tripId: string, categoryId: string) => void
}

type TripModalState = {
  open: boolean
  trip: Trip | null
}

type TripItemModalState = {
  open: boolean
  trip: Trip | null
  item: TripItem | null
}

type TripBudgetModalState = {
  open: boolean
  trip: Trip | null
  line: BudgetLine | null
}

type DeleteTarget =
  | { type: 'trip'; tripId: string }
  | { type: 'item'; trip: Trip; itemId: string }
  | { type: 'budgetLine'; trip: Trip; categoryId: string }

type TripViewMode = 'list' | 'calendar'

export function TripsPage({
  data,
  onAddTrip,
  onUpdateTrip,
  onDeleteTrip,
  onAddOrUpdateTripBudgetLine,
  onDeleteTripBudgetLine,
}: TripsPageProps) {
  const [filters, setFilters] = useState<TripFiltersState>(createEmptyTripFilters)
  const [activeTripId, setActiveTripId] = useState<string | null>(() => data.trips[0]?.id ?? null)
  const [activeTab, setActiveTab] = useState<TripDetailTab>('overview')
  const [viewMode, setViewMode] = useState<TripViewMode>('list')
  const [tripModal, setTripModal] = useState<TripModalState>({ open: false, trip: null })
  const [itemModal, setItemModal] = useState<TripItemModalState>({ open: false, trip: null, item: null })
  const [budgetModal, setBudgetModal] = useState<TripBudgetModalState>({ open: false, trip: null, line: null })
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [detailTripId, setDetailTripId] = useState<string | null>(null)

  const filteredTrips = useMemo(() => filterTrips(data.trips, filters), [data.trips, filters])
  const effectiveActiveTripId = filteredTrips.some((trip) => trip.id === activeTripId)
    ? activeTripId
    : filteredTrips[0]?.id ?? null
  const activeTrip = filteredTrips.find((trip) => trip.id === effectiveActiveTripId) ?? null
  const detailTrip = detailTripId ? data.trips.find((trip) => trip.id === detailTripId) ?? null : null
  const summary = useMemo(() => summarizeTrips(data, filteredTrips), [data, filteredTrips])
  const categoryOptions = useMemo(() => getCategoryOptions(data), [data])

  function selectTrip(tripId: string): void {
    setActiveTripId(tripId)
    setActiveTab('overview')
    setDetailTripId(tripId)
  }

  function closeTripDetail(): void {
    setDetailTripId(null)
  }

  function openAddTrip(): void {
    setTripModal({ open: true, trip: null })
  }

  function openEditTrip(trip: Trip): void {
    setTripModal({ open: true, trip })
  }

  function closeTripModal(): void {
    setTripModal({ open: false, trip: null })
  }

  function submitTrip(trip: Trip): void {
    if (tripModal.trip) onUpdateTrip(trip.id, trip)
    else {
      onAddTrip(trip)
      setActiveTripId(trip.id)
    }
    closeTripModal()
  }

  function handleDeleteTrip(tripId: string): void {
    setDeleteTarget({ type: 'trip', tripId })
  }

  function openAddItem(trip = activeTrip): void {
    if (!trip) return
    setItemModal({ open: true, trip, item: null })
  }

  function openEditItem(trip: Trip, item: TripItem): void {
    setItemModal({ open: true, trip, item })
  }

  function closeItemModal(): void {
    setItemModal({ open: false, trip: null, item: null })
  }

  function submitItem(item: TripItem): void {
    if (!itemModal.trip) return
    const nextTrip = upsertTripItem(itemModal.trip, item)
    onUpdateTrip(nextTrip.id, nextTrip)
    setActiveTripId(nextTrip.id)
    setActiveTab('actual')
    closeItemModal()
  }

  function handleDeleteItem(trip: Trip, itemId: string): void {
    setDeleteTarget({ type: 'item', trip, itemId })
  }

  function handleToggleItemPaid(trip: Trip, itemId: string): void {
    const nextTrip = toggleTripItemPaid(trip, itemId)
    onUpdateTrip(nextTrip.id, nextTrip)
    setActiveTab('actual')
  }

  function openAddBudgetLine(trip = activeTrip): void {
    if (!trip) return
    setBudgetModal({ open: true, trip, line: null })
  }

  function openEditBudgetLine(trip: Trip, line: BudgetLine): void {
    setBudgetModal({ open: true, trip, line })
  }

  function closeBudgetModal(): void {
    setBudgetModal({ open: false, trip: null, line: null })
  }

  function submitBudgetLine(categoryId: string, amount: number, note?: string): void {
    if (!budgetModal.trip) return
    if (budgetModal.line && budgetModal.line.categoryId !== categoryId) {
      onDeleteTripBudgetLine(budgetModal.trip.id, budgetModal.line.categoryId)
    }
    onAddOrUpdateTripBudgetLine(budgetModal.trip.id, categoryId, amount, note)
    setActiveTripId(budgetModal.trip.id)
    setActiveTab('plan')
    closeBudgetModal()
  }

  function handleDeleteBudgetLine(trip: Trip, categoryId: string): void {
    setDeleteTarget({ type: 'budgetLine', trip, categoryId })
  }

  function confirmDelete(): void {
    if (!deleteTarget) return
    if (deleteTarget.type === 'trip') {
      onDeleteTrip(deleteTarget.tripId)
      const nextTrip = filteredTrips.find((trip) => trip.id !== deleteTarget.tripId)
      setActiveTripId(nextTrip?.id ?? null)
      setActiveTab('overview')
      setDetailTripId(null)
      setDeleteTarget(null)
      return
    }
    if (deleteTarget.type === 'item') {
      const nextTrip = deleteTripItem(deleteTarget.trip, deleteTarget.itemId)
      onUpdateTrip(nextTrip.id, nextTrip)
      setActiveTab('actual')
      setDeleteTarget(null)
      return
    }
    onDeleteTripBudgetLine(deleteTarget.trip.id, deleteTarget.categoryId)
    setActiveTab('plan')
    setDeleteTarget(null)
  }

  function getDeleteTitle(): string {
    if (deleteTarget?.type === 'item') return th.trips.deleteItemTitle
    if (deleteTarget?.type === 'budgetLine') return th.trips.deleteBudgetLineTitle
    return th.trips.deleteTitle
  }

  const tripOverlays = (
    <>
      {tripModal.open && (
        <TripModal
          key={tripModal.trip?.id ?? 'new-trip'}
          open={tripModal.open}
          trip={tripModal.trip}
          onClose={closeTripModal}
          onSubmit={submitTrip}
        />
      )}

      {itemModal.open && itemModal.trip && (
        <TripItemModal
          key={`${itemModal.trip.id}-${itemModal.item?.id ?? 'new-item'}`}
          open={itemModal.open}
          trip={itemModal.trip}
          item={itemModal.item}
          categoryOptions={categoryOptions}
          installmentPlans={data.installmentPlans}
          onClose={closeItemModal}
          onSubmit={submitItem}
        />
      )}

      {budgetModal.open && budgetModal.trip && (
        <TripBudgetFormModal
          key={`${budgetModal.trip.id}-${budgetModal.line?.categoryId ?? 'new-budget-line'}`}
          open={budgetModal.open}
          trip={budgetModal.trip}
          line={budgetModal.line}
          categoryOptions={Array.from(new Set([...categoryOptions, ...getTripBudgetLines(data, budgetModal.trip.id).map((line) => line.categoryId)]))}
          onClose={closeBudgetModal}
          onSubmit={submitBudgetLine}
        />
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title={getDeleteTitle()}
        confirmLabel={th.common.delete}
        destructive
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )

  if (detailTrip) {
    const tripStatus = getTripStatus(detailTrip)
    const tripTotals = calculateTripTotals(data, detailTrip)
    const usagePercent = clampPercent(tripTotals.usagePercent)

    return (
      <div className="finance-page-shell">
        {/* ==================== COMMAND / HEADER PANEL FOR TRIP DETAIL ==================== */}
        <section className="finance-command-panel">
          <div className="finance-toolbar finance-command-header border-b border-sky-100 pb-3">
            {/* Left: Back button & Trip Title */}
            <div className="flex items-center gap-3">
              <Button type="button" size="sm" onClick={closeTripDetail}>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  <span>ย้อนกลับ</span>
                </span>
              </Button>

              <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-sm shadow-sky-500/20">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{detailTrip.name}</h2>
                  <Badge tone={tripStatus === 'completed' ? 'neutral' : 'active'}>
                    {tripStatusLabel[tripStatus]}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {detailTrip.destination || 'ยังไม่ระบุจุดหมาย'} · {formatDate(detailTrip.startDate)} - {formatDate(detailTrip.endDate)} ({getTripDayCount(detailTrip)} วัน)
                  {detailTrip.note ? ` · ${detailTrip.note}` : ''}
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="finance-command-actions">
              <Button type="button" variant="primary" onClick={() => openAddItem(detailTrip)}>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>เพิ่มรายการ</span>
                </span>
              </Button>
              <Button type="button" onClick={() => openEditTrip(detailTrip)}>
                {th.common.edit}
              </Button>
              <Button type="button" variant="danger" onClick={() => handleDeleteTrip(detailTrip.id)}>
                {th.common.delete}
              </Button>
            </div>
          </div>

          {/* 5 Rich Financial Summary Cards for this trip */}
          <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <SummaryCard
              compact
              label="งบที่วางไว้"
              value={formatMoney(tripTotals.plannedBudget)}
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              }
              tone="balance"
              subValue={<span className="text-blue-700 font-semibold">แผนงบรวม</span>}
            />

            <SummaryCard
              compact
              label="ใช้จ่ายจริง"
              value={formatMoney(tripTotals.actualSpending)}
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
              }
              tone="expense"
              subValue={<span>ใช้ไป {usagePercent}% ของงบ</span>}
              progress={usagePercent}
            />

            <SummaryCard
              compact
              label="จ่ายแล้ว"
              value={formatMoney(tripTotals.paidTotal)}
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              }
              tone="income"
              subValue={<span className="text-emerald-700 font-semibold">ชำระเรียบร้อย</span>}
            />

            <SummaryCard
              compact
              label="ยังไม่จ่าย"
              value={formatMoney(tripTotals.unpaidTotal)}
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
              }
              tone={tripTotals.unpaidTotal > 0 ? 'due' : 'income'}
              subValue={
                <span className={tripTotals.unpaidTotal > 0 ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                  {tripTotals.unpaidTotal > 0 ? 'มียอดรอชำระ' : 'ไม่มีค้างชำระ'}
                </span>
              }
            />

            <SummaryCard
              compact
              label={tripTotals.remaining >= 0 ? 'คงเหลือ' : 'เกินงบ'}
              value={formatMoney(Math.abs(tripTotals.remaining))}
              icon={
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" x2="22" y1="10" y2="10" />
                </svg>
              }
              tone={tripTotals.remaining >= 0 ? 'balance' : 'expense'}
              subValue={
                <span className={tripTotals.remaining >= 0 ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                  {tripTotals.remaining >= 0 ? 'อยู่ในกรอบงบประมาณ' : 'งบประมาณเกิน'}
                </span>
              }
            />
          </div>
        </section>

        {/* Tabbed Detail Content Card */}
        <Card>
          <TripDetail
            data={data}
            trip={detailTrip}
            hideHeader
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            onEditTrip={openEditTrip}
            onDeleteTrip={handleDeleteTrip}
            onAddItem={openAddItem}
            onEditItem={openEditItem}
            onDeleteItem={handleDeleteItem}
            onToggleItemPaid={handleToggleItemPaid}
            onAddBudgetLine={openAddBudgetLine}
            onEditBudgetLine={openEditBudgetLine}
            onDeleteBudgetLine={handleDeleteBudgetLine}
          />
        </Card>
        {tripOverlays}
      </div>
    )
  }

  return (
    <div className="finance-page-shell">
      {/* ==================== COMMAND / HEADER PANEL ==================== */}
      <section className="finance-command-panel">
        <div className="finance-toolbar finance-command-header border-b border-blue-100 pb-3">
          {/* Left: Title & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-sm shadow-sky-500/20">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">จัดการทริป</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/80">
                  เที่ยวสบายใจ
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                วางแผนงบประมาณและบันทึกค่าใช้จ่ายการท่องเที่ยว
              </p>
            </div>
          </div>

          {/* Center: View Switcher */}
          <div className="finance-segmented" aria-label="เลือกมุมมองทริป">
            <button
              type="button"
              className={`finance-segmented-button ${viewMode === 'list' ? 'is-active' : ''}`}
              aria-pressed={viewMode === 'list'}
              onClick={() => setViewMode('list')}
            >
              รายการ
            </button>
            <button
              type="button"
              className={`finance-segmented-button ${viewMode === 'calendar' ? 'is-active' : ''}`}
              aria-pressed={viewMode === 'calendar'}
              onClick={() => setViewMode('calendar')}
            >
              ปฏิทิน
            </button>
          </div>

          {/* Right: Add Trip Button */}
          <div className="finance-command-actions">
            <Button type="button" variant="primary" onClick={openAddTrip}>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>เพิ่มทริป</span>
              </span>
            </Button>
          </div>
        </div>

        {/* Stats Overview Cards */}
        <div className="mt-3.5 space-y-3.5">
          <TripSummaryCards summary={summary} />
        </div>
      </section>

      {/* Filters Bar */}
      <TripFilters
        filters={filters}
        resultCount={filteredTrips.length}
        onChange={setFilters}
        onAddItem={() => openAddItem()}
        canAddItem={Boolean(activeTrip)}
      />

      {/* Main Items View */}
      <Card title={viewMode === 'list' ? 'รายการทริปทั้งหมด' : 'ปฏิทินทริป'}>
        {viewMode === 'list' ? (
          <TripList data={data} trips={filteredTrips} activeTripId={effectiveActiveTripId} onSelectTrip={selectTrip} />
        ) : (
          <TripCalendar data={data} trips={filteredTrips} activeTripId={effectiveActiveTripId} onSelectTrip={selectTrip} />
        )}
      </Card>

      {tripOverlays}
    </div>
  )
}
