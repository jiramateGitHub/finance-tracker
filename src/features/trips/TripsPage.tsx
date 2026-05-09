import { useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { th } from '../../i18n/th'
import type { AppData, BudgetLine, Trip, TripItem } from '../../types/finance'
import { TripDetail } from './components/TripDetail'
import { TripBudgetFormModal } from './components/TripBudgetFormModal'
import { TripCalendar } from './components/TripCalendar'
import { TripFilters } from './components/TripFilters'
import { TripItemModal } from './components/TripItemModal'
import { TripList } from './components/TripList'
import { TripModal } from './components/TripModal'
import { TripSummaryCards } from './components/TripSummaryCards'
import {
  createEmptyTripFilters,
  deleteTripItem,
  filterTrips,
  getCategoryOptions,
  getTripBudgetLines,
  summarizeTrips,
  toggleTripItemPaid,
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
  const listRef = useRef<HTMLDivElement | null>(null)
  const detailRef = useRef<HTMLDivElement | null>(null)

  const filteredTrips = useMemo(() => filterTrips(data.trips, filters), [data.trips, filters])
  const effectiveActiveTripId = filteredTrips.some((trip) => trip.id === activeTripId)
    ? activeTripId
    : filteredTrips[0]?.id ?? null
  const activeTrip = filteredTrips.find((trip) => trip.id === effectiveActiveTripId) ?? null
  const summary = useMemo(() => summarizeTrips(data, filteredTrips), [data, filteredTrips])
  const categoryOptions = useMemo(() => getCategoryOptions(data), [data])

  function selectTrip(tripId: string): void {
    setActiveTripId(tripId)
    setActiveTab('overview')
    window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  function backToList(): void {
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
      const nextTrip = data.trips.find((trip) => trip.id !== deleteTarget.tripId)
      setActiveTripId(nextTrip?.id ?? null)
      setActiveTab('overview')
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

  return (
    <div className="grid gap-4">
      <Card title="จัดการทริป" description="วางแผนทริป ติดตามรายจ่ายจริง และเทียบกับงบประมาณ">
        <TripFilters
          filters={filters}
          resultCount={filteredTrips.length}
          categoryOptions={categoryOptions}
          onChange={setFilters}
          onAddTrip={openAddTrip}
          onAddItem={() => openAddItem()}
          canAddItem={Boolean(activeTrip)}
        />
      </Card>

      <Card title="สรุปทริป" description="คำนวณจากทริปที่กำลังแสดง">
        <TripSummaryCards summary={summary} />
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
        <Card title={viewMode === 'list' ? 'รายการทริป' : 'ปฏิทินทริป'}>
          <div ref={listRef} className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={viewMode === 'list' ? 'primary' : 'light'} onClick={() => setViewMode('list')}>
                รายการ
              </Button>
              <Button size="sm" variant={viewMode === 'calendar' ? 'primary' : 'light'} onClick={() => setViewMode('calendar')}>
                ปฏิทิน
              </Button>
            </div>
            {viewMode === 'list' ? (
              <TripList data={data} trips={filteredTrips} activeTripId={effectiveActiveTripId} onSelectTrip={selectTrip} />
            ) : (
              <TripCalendar data={data} trips={filteredTrips} activeTripId={effectiveActiveTripId} onSelectTrip={selectTrip} />
            )}
          </div>
        </Card>

        <div ref={detailRef}>
          <Card title="รายละเอียดทริป">
            <TripDetail
              data={data}
              trip={activeTrip}
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
              onBackToList={backToList}
            />
          </Card>
        </div>
      </div>

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
    </div>
  )
}
