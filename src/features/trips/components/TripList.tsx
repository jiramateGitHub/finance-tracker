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
    <div className="grid min-w-0 gap-3.5 sm:gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {trips.map((trip) => {
        const totals = calculateTripTotals(data, trip)
        const status = getTripStatus(trip)
        const isActive = trip.id === activeTripId
        const percent = clampPercent(totals.usagePercent)
        const isOverBudget = totals.remaining < 0

        return (
          <div
            key={trip.id}
            onClick={() => onSelectTrip(trip.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectTrip(trip.id)
              }
            }}
            className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between group text-left ${
              isActive
                ? 'border-sky-400 bg-sky-50/40 ring-2 ring-sky-200 shadow-sm'
                : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-md'
            }`}
          >
            <div>
              {/* Header: Title, Status Badge, Dates */}
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-base text-slate-900 group-hover:text-sky-700 transition">
                      {trip.name}
                    </h3>
                    {isActive && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-700">
                        กำลังดู
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    {trip.destination || 'ยังไม่ระบุจุดหมาย'}
                  </p>
                </div>
                <Badge tone={status === 'completed' ? 'neutral' : 'active'}>
                  {tripStatusLabel[status]}
                </Badge>
              </div>

              {/* Date & Item count badges */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-medium mb-3.5">
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100/90 px-2 py-0.5 text-slate-600 font-medium text-[11px]">
                  <svg className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <line x1="16" x2="16" y1="2" y2="6" />
                    <line x1="8" x2="8" y1="2" y2="6" />
                    <line x1="3" x2="21" y1="10" y2="10" />
                  </svg>
                  {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
                </span>
                <span className="rounded-lg bg-slate-100/90 px-2 py-0.5 text-slate-600 font-medium text-[11px]">
                  {totals.itemCount} รายการ
                </span>
              </div>

              {/* Financial Box */}
              <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-100 mb-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">ใช้จ่ายจริง</span>
                  <span className="text-[11px] text-slate-400 font-medium">งบที่วางไว้</span>
                </div>
                <div className="flex items-baseline justify-between mt-0.5">
                  <span className="text-lg sm:text-xl font-extrabold text-rose-700">
                    {formatMoney(totals.actualSpending)}
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-700">
                    {formatMoney(totals.plannedBudget)}
                  </span>
                </div>
              </div>

              {/* Usage Progress Bar */}
              <div className="space-y-1.5 mb-3.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 font-medium">
                    ใช้ไป {percent}% ของงบ
                  </span>
                  <span className={`font-bold ${isOverBudget ? 'text-rose-600' : 'text-sky-600'}`}>
                    {isOverBudget ? `เกินงบ ${formatMoney(Math.abs(totals.remaining))}` : `คงเหลือ ${formatMoney(totals.remaining)}`}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isOverBudget ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-sky-500'
                    }`}
                    style={{ width: `${Math.min(100, percent)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Footer pill stats */}
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
              <span className="text-emerald-700">จ่ายแล้ว {formatMoney(totals.paidTotal)}</span>
              <span className={totals.unpaidTotal > 0 ? 'text-amber-700' : 'text-slate-400'}>
                {totals.unpaidTotal > 0 ? `ค้างจ่าย ${formatMoney(totals.unpaidTotal)}` : 'ไม่มีค้าง'}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
