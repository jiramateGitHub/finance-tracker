import { ActionButton } from '../../../components/ui/ActionButton'
import { Badge } from '../../../components/ui/Badge'
import { EmptyState } from '../../../components/ui/EmptyState'
import type { AppData, Trip } from '../../../types/finance'
import { clampPercent, formatDate, formatMoney } from '../../../utils/formatters'
import { calculateTripTotals, getTripDayCount, getTripStatus, tripStatusLabel } from '../utils/tripUtils'

type TripTableProps = {
  data: AppData
  trips: Trip[]
  activeTripId: string | null
  onSelectTrip: (tripId: string) => void
  onEditTrip?: (trip: Trip) => void
  onDeleteTrip?: (tripId: string) => void
}

export function TripTable({
  data,
  trips,
  activeTripId,
  onSelectTrip,
  onEditTrip,
  onDeleteTrip,
}: TripTableProps) {
  if (!trips.length) {
    return (
      <EmptyState
        title="ไม่พบทริป"
        description="ปรับตัวกรองหรือเพิ่มทริปใหม่เพื่อเริ่มติดตามงบและค่าใช้จ่ายจริง"
      />
    )
  }

  return (
    <>
      {/* 1. Mobile Card Fallback (md:hidden) */}
      <div className="space-y-3 md:hidden">
        {trips.map((trip) => {
          const totals = calculateTripTotals(data, trip)
          const status = getTripStatus(trip)
          const isActive = trip.id === activeTripId
          const percent = clampPercent(totals.usagePercent)
          const isOverBudget = totals.remaining < 0

          return (
            <article
              key={trip.id}
              onClick={() => onSelectTrip(trip.id)}
              className={`rounded-2xl border p-3.5 shadow-xs transition cursor-pointer space-y-3 ${
                isActive
                  ? 'border-sky-400 bg-sky-50/40 ring-1 ring-sky-300'
                  : 'border-slate-200/90 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{trip.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {trip.destination || 'ยังไม่ระบุจุดหมาย'} · {getTripDayCount(trip)} วัน
                  </p>
                </div>
                <Badge tone={status === 'completed' ? 'neutral' : 'active'}>
                  {tripStatusLabel[status]}
                </Badge>
              </div>

              {/* 3 mini stats */}
              <div className="grid grid-cols-3 gap-1.5 bg-slate-50/90 p-2 rounded-xl border border-slate-100 text-center">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">งบที่วางไว้</span>
                  <span className="text-xs font-bold text-slate-800 tabular-nums mt-0.5 block">{formatMoney(totals.plannedBudget)}</span>
                </div>
                <div className="border-x border-slate-200/60 px-1">
                  <span className="text-[10px] text-slate-400 font-medium block">ใช้จริง</span>
                  <span className="text-xs font-bold text-rose-700 tabular-nums mt-0.5 block">{formatMoney(totals.actualSpending)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">คงเหลือ</span>
                  <span className={`text-xs font-bold tabular-nums mt-0.5 block ${isOverBudget ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {formatMoney(totals.remaining)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isOverBudget ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-sky-500'
                  }`}
                  style={{ width: `${Math.min(100, percent)}%` }}
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-sky-700">
                  แตะเพื่อดูรายละเอียด →
                </span>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  {onEditTrip && (
                    <ActionButton
                      action="edit"
                      iconOnly
                      title="แก้ไขทริป"
                      onClick={() => onEditTrip(trip)}
                    />
                  )}
                  {onDeleteTrip && (
                    <ActionButton
                      action="delete"
                      iconOnly
                      title="ลบทริป"
                      onClick={() => onDeleteTrip(trip.id)}
                    />
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* 2. Full Table View for md+ */}
      <div className="hidden md:block rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">ชื่อทริป / จุดหมาย</th>
                <th className="py-3 px-3">ช่วงเวลา</th>
                <th className="py-3 px-3 text-right">งบที่วางไว้</th>
                <th className="py-3 px-3 text-right">ใช้จ่ายจริง</th>
                <th className="py-3 px-3 text-right">คงเหลือ</th>
                <th className="py-3 px-3">ใช้ไป</th>
                <th className="py-3 px-3">สถานะ</th>
                <th className="py-3 px-4 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {trips.map((trip) => {
                const totals = calculateTripTotals(data, trip)
                const status = getTripStatus(trip)
                const isActive = trip.id === activeTripId
                const percent = clampPercent(totals.usagePercent)
                const isOverBudget = totals.remaining < 0

                return (
                  <tr
                    key={trip.id}
                    className={`transition-colors ${
                      isActive ? 'bg-sky-50/40' : 'hover:bg-blue-50/30'
                    }`}
                  >
                    {/* Trip Name & Destination */}
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-slate-900 truncate max-w-[200px]" title={trip.name}>
                          {trip.name}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-700">
                            ดูอยู่
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal truncate max-w-[200px]">
                        {trip.destination || 'ยังไม่ระบุจุดหมาย'} · {totals.itemCount} รายการ
                      </div>
                    </td>

                    {/* Date range & day count */}
                    <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                      <div>{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</div>
                      <div className="text-[11px] text-slate-400">{getTripDayCount(trip)} วัน</div>
                    </td>

                    {/* Planned Budget */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-slate-700 tabular-nums">
                      {formatMoney(totals.plannedBudget)}
                    </td>

                    {/* Actual Spending */}
                    <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-rose-700 tabular-nums">
                      {formatMoney(totals.actualSpending)}
                    </td>

                    {/* Remaining */}
                    <td className={`py-3 px-3 text-right whitespace-nowrap font-bold tabular-nums ${isOverBudget ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {formatMoney(totals.remaining)}
                    </td>

                    {/* Progress Bar & % */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              isOverBudget ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-sky-500'
                            }`}
                            style={{ width: `${Math.min(100, percent)}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-slate-600 tabular-nums">{percent}%</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      <Badge tone={status === 'completed' ? 'neutral' : 'active'}>
                        {tripStatusLabel[status]}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <ActionButton
                          action="view"
                          size="sm"
                          label="เปิดดู"
                          onClick={() => onSelectTrip(trip.id)}
                        />
                        {onEditTrip && (
                          <ActionButton
                            action="edit"
                            size="sm"
                            iconOnly
                            title="แก้ไขทริป"
                            onClick={() => onEditTrip(trip)}
                          />
                        )}
                        {onDeleteTrip && (
                          <ActionButton
                            action="delete"
                            size="sm"
                            iconOnly
                            title="ลบทริป"
                            onClick={() => onDeleteTrip(trip.id)}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
