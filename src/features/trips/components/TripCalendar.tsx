import { Badge } from '../../../components/ui/Badge'
import { EmptyState } from '../../../components/ui/EmptyState'
import type { AppData, Trip } from '../../../types/finance'
import { clampPercent, formatDate, formatMoney, formatMonth } from '../../../utils/formatters'
import { calculateTripTotals, getTripStatus, tripStatusLabel } from '../utils/tripUtils'

type TripCalendarProps = {
  data: AppData
  trips: Trip[]
  activeTripId: string | null
  onSelectTrip: (tripId: string) => void
}

export function TripCalendar({ data, trips, activeTripId, onSelectTrip }: TripCalendarProps) {
  if (!trips.length) {
    return (
      <EmptyState
        title="ยังไม่พบทริปในปฏิทิน"
        description="ปรับตัวกรองหรือเพิ่มทริปใหม่เพื่อแสดงในมุมมองปฏิทิน"
      />
    )
  }

  const grouped = trips.reduce<Map<string, Trip[]>>((groups, trip) => {
    const monthKey = (trip.startDate || '').slice(0, 7) || 'ไม่ระบุเดือน'
    groups.set(monthKey, [...(groups.get(monthKey) ?? []), trip])
    return groups
  }, new Map())

  return (
    <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from(grouped.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, monthTrips]) => {
          const monthActual = monthTrips.reduce((total, trip) => total + calculateTripTotals(data, trip).actualSpending, 0)
          const monthPlanned = monthTrips.reduce((total, trip) => total + calculateTripTotals(data, trip).plannedBudget, 0)
          return (
            <section key={monthKey} className="grid min-w-0 content-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-extrabold text-slate-800">{monthKey === 'ไม่ระบุเดือน' ? monthKey : formatMonth(monthKey)}</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">{monthTrips.length} ทริป</p>
                </div>
                <div className="min-w-0 text-right text-xs font-extrabold leading-5">
                  <div className="break-words text-rose-700">{formatMoney(monthActual)}</div>
                  <div className="break-words text-blue-700">งบ {formatMoney(monthPlanned)}</div>
                </div>
              </div>

              <div className="grid min-w-0 gap-2">
                {monthTrips
                  .slice()
                  .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)) || String(a.name).localeCompare(String(b.name), 'th-TH'))
                  .map((trip) => {
                    const totals = calculateTripTotals(data, trip)
                    const status = getTripStatus(trip)
                    const active = trip.id === activeTripId
                    const percent = clampPercent(totals.usagePercent)
                    return (
                      <button
                        key={trip.id}
                        type="button"
                        className={`finance-card-compact grid min-w-0 gap-2 text-left ${
                          active ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100' : 'hover:border-blue-200 hover:bg-blue-50/50'
                        }`}
                        onClick={() => onSelectTrip(trip.id)}
                      >
                        <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="truncate font-extrabold text-slate-900">{trip.name}</h4>
                            <p className="mt-0.5 truncate text-sm font-semibold text-slate-500">{trip.destination || 'ยังไม่ระบุจุดหมาย'}</p>
                          </div>
                          <Badge tone={status === 'completed' ? 'neutral' : 'active'}>{tripStatusLabel[status]}</Badge>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</span>
                          {active ? <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-700">กำลังดู</span> : null}
                        </div>

                        <div className="grid gap-2 rounded-xl border border-blue-100 bg-white/90 p-2.5">
                          <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                            <span>ใช้จริง / งบ</span>
                            <span>{percent}%</span>
                          </div>
                          <div className="finance-progress-track">
                            <div className="finance-progress-bar" style={{ width: `${percent}%` }} />
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                            <span className="text-rose-700">{formatMoney(totals.actualSpending)}</span>
                            <span className="text-blue-700">{formatMoney(totals.plannedBudget)}</span>
                          </div>
                        </div>

                        <div className="grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-3">
                          <span>{totals.itemCount} รายการ</span>
                          <span className="text-emerald-700">จ่ายแล้ว {formatMoney(totals.paidTotal)}</span>
                          <span className="text-amber-700">ค้าง {formatMoney(totals.unpaidTotal)}</span>
                        </div>
                      </button>
                    )
                  })}
              </div>
            </section>
          )
        })}
    </div>
  )
}
