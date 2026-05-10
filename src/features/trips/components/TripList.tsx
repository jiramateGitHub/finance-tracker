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
    return <EmptyState title="ไม่พบทริป" description="ปรับตัวกรองหรือเพิ่มทริปใหม่เพื่อเริ่มติดตามงบและค่าใช้จ่ายจริง" />
  }

  return (
    <div className="grid gap-2">
      {trips.map((trip) => {
        const totals = calculateTripTotals(data, trip)
        const status = getTripStatus(trip)
        const isActive = trip.id === activeTripId
        const percent = clampPercent(totals.usagePercent)
        return (
          <button
            key={trip.id}
            className={`finance-card-compact grid gap-3 text-left ${
              isActive ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100' : 'hover:border-blue-200 hover:bg-blue-50/50'
            }`}
            type="button"
            onClick={() => onSelectTrip(trip.id)}
          >
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 className="min-w-0 truncate text-base font-extrabold text-slate-900">{trip.name}</h3>
                  {isActive ? <Badge tone="active">กำลังดู</Badge> : null}
                </div>
                <p className="mt-1 break-words text-sm font-semibold leading-5 text-slate-500">
                  {trip.destination || 'ยังไม่ระบุจุดหมาย'}
                </p>
              </div>
              <Badge tone={status === 'completed' ? 'neutral' : 'active'}>{tripStatusLabel[status]}</Badge>
            </div>

            <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-500">
              <span className="rounded-full bg-slate-100 px-2.5 py-1">{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1">{totals.itemCount} รายการ</span>
            </div>

            <div className="grid gap-2 rounded-xl border border-blue-100 bg-white/90 p-3">
              <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                <span>ใช้จริงเทียบงบ</span>
                <span>{percent}%</span>
              </div>
              <div className="finance-progress-track">
                <div className="finance-progress-bar" style={{ width: `${percent}%` }} />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-extrabold text-rose-700">ใช้จริง {formatMoney(totals.actualSpending)}</span>
                <span className="font-bold text-blue-700">งบ {formatMoney(totals.plannedBudget)}</span>
              </div>
            </div>

            <div className="grid gap-2 text-xs font-bold sm:grid-cols-3">
              <span className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">จ่ายแล้ว {formatMoney(totals.paidTotal)}</span>
              <span className="rounded-xl bg-amber-50 px-3 py-2 text-amber-700">ยังไม่จ่าย {formatMoney(totals.unpaidTotal)}</span>
              <span className={`rounded-xl px-3 py-2 ${totals.remaining >= 0 ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'}`}>
                {totals.remaining >= 0 ? 'คงเหลือ' : 'เกินงบ'} {formatMoney(Math.abs(totals.remaining))}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
