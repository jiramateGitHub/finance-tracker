import { Badge } from '../../../components/ui/Badge'
import { EmptyState } from '../../../components/ui/EmptyState'
import type { AppData, Trip } from '../../../types/finance'
import { formatDate, formatMoney, formatMonth } from '../../../utils/formatters'
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
    <div className="grid gap-4">
      {Array.from(grouped.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, monthTrips]) => (
          <section key={monthKey} className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="font-extrabold text-slate-800">{monthKey === 'ไม่ระบุเดือน' ? monthKey : formatMonth(monthKey)}</h3>
              <span className="text-sm font-bold text-slate-500">{monthTrips.length} ทริป</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {monthTrips
                .slice()
                .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)) || String(a.name).localeCompare(String(b.name), 'th-TH'))
                .map((trip) => {
                  const totals = calculateTripTotals(data, trip)
                  const status = getTripStatus(trip)
                  const active = trip.id === activeTripId
                  return (
                    <button
                      key={trip.id}
                      type="button"
                      className={`grid min-w-0 gap-3 rounded-2xl border p-4 text-left transition ${
                        active ? 'border-blue-300 bg-blue-50 shadow-finance-sm' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50'
                      }`}
                      onClick={() => onSelectTrip(trip.id)}
                    >
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="truncate font-extrabold text-slate-900">{trip.name}</h4>
                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {trip.destination || '-'} · {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                          </p>
                        </div>
                        <Badge tone={status === 'completed' ? 'neutral' : 'active'}>{tripStatusLabel[status]}</Badge>
                      </div>

                      <div className="grid gap-2 rounded-xl border border-blue-100 bg-white p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-bold text-slate-500">ใช้จริง</span>
                          <span className="font-extrabold text-rose-700">{formatMoney(totals.actualSpending)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-bold text-slate-500">งบที่วางไว้</span>
                          <span className="font-extrabold text-blue-700">{formatMoney(totals.plannedBudget)}</span>
                        </div>
                      </div>

                      <div className="grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-3">
                        <span>{totals.itemCount} รายการ</span>
                        <span className="text-emerald-700">{formatMoney(totals.paidTotal)} จ่ายแล้ว</span>
                        <span className="text-amber-700">{formatMoney(totals.unpaidTotal)} ยังไม่จ่าย</span>
                      </div>
                    </button>
                  )
                })}
            </div>
          </section>
        ))}
    </div>
  )
}
