import { Badge } from '../../../components/ui/Badge'
import { EmptyState } from '../../../components/ui/EmptyState'
import type { AppData, Trip } from '../../../types/finance'
import { clampPercent, formatDate, formatMoney } from '../../../utils/formatters'
import { calculateTripTotals, getTripStatus, tripStatusLabel } from '../utils/tripUtils'

type TripListProps = {
  data: AppData
  trips: Trip[]
  activeTripId: string | null
  onSelectTrip: (tripId: string) => void
}

export function TripList({ data, trips, activeTripId, onSelectTrip }: TripListProps) {
  if (!trips.length) {
    return <EmptyState title="ไม่พบทริป" description="เพิ่มทริปใหม่เพื่อเริ่มติดตามงบและค่าใช้จ่ายจริง" />
  }

  return (
    <div className="grid gap-3">
      {trips.map((trip) => {
        const totals = calculateTripTotals(data, trip)
        const isActive = trip.id === activeTripId
        return (
          <button
            key={trip.id}
            className={`grid gap-3 rounded-2xl border p-4 text-left transition ${
              isActive ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50'
            }`}
            type="button"
            onClick={() => onSelectTrip(trip.id)}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-extrabold">{trip.name}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {trip.destination || '-'} · {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                </p>
              </div>
              <Badge tone={getTripStatus(trip) === 'completed' ? 'neutral' : 'active'}>{tripStatusLabel[getTripStatus(trip)]}</Badge>
            </div>

            <div className="rounded-xl border border-blue-100 bg-white p-3">
              <div className="mb-2 flex justify-between gap-3 text-xs font-bold text-slate-500">
                <span>ใช้จริง / แผน</span>
                <span>{clampPercent(totals.usagePercent)}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${clampPercent(totals.usagePercent)}%` }} />
              </div>
              <div className="mt-2 text-sm font-extrabold text-blue-700">
                {formatMoney(totals.actualSpending)} / {formatMoney(totals.plannedBudget)}
              </div>
            </div>

            <div className="grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-3">
              <span>{trip.items.length} รายการ</span>
              <span className="text-emerald-700">{formatMoney(totals.paidTotal)} จ่ายแล้ว</span>
              <span className="text-amber-700">{formatMoney(totals.unpaidTotal)} ยังไม่จ่าย</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
