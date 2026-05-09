import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { th } from '../../../i18n/th'
import type { AppData, BudgetLine, Trip, TripItem } from '../../../types/finance'
import { formatDate, formatMoney } from '../../../utils/formatters'
import {
  calculateTripTotals,
  getTripActualByCategory,
  getTripBudgetLineViews,
  getTripDayCount,
  getTripStatus,
  type TripBudgetStatus,
  type TripDetailTab,
} from '../utils/tripUtils'

type TripDetailProps = {
  data: AppData
  trip: Trip | null
  activeTab: TripDetailTab
  onChangeTab: (tab: TripDetailTab) => void
  onEditTrip: (trip: Trip) => void
  onDeleteTrip: (tripId: string) => void
  onAddItem: (trip: Trip) => void
  onEditItem: (trip: Trip, item: TripItem) => void
  onDeleteItem: (trip: Trip, itemId: string) => void
  onToggleItemPaid: (trip: Trip, itemId: string) => void
  onAddBudgetLine: (trip: Trip) => void
  onEditBudgetLine: (trip: Trip, line: BudgetLine) => void
  onDeleteBudgetLine: (trip: Trip, categoryId: string) => void
}

const statusLabel = {
  upcoming: 'กำลังจะไป',
  ongoing: 'กำลังเดินทาง',
  completed: 'จบแล้ว',
}

const budgetStatusLabel: Record<TripBudgetStatus, string> = {
  safe: 'ยังปลอดภัย',
  'near-limit': 'ใกล้เต็มงบ',
  'over-budget': 'เกินงบ',
}

const budgetStatusTone: Record<TripBudgetStatus, 'income' | 'warning' | 'expense'> = {
  safe: 'income',
  'near-limit': 'warning',
  'over-budget': 'expense',
}

const budgetStatusBar: Record<TripBudgetStatus, string> = {
  safe: 'bg-emerald-500',
  'near-limit': 'bg-amber-500',
  'over-budget': 'bg-rose-500',
}

export function TripDetail({
  data,
  trip,
  activeTab,
  onChangeTab,
  onEditTrip,
  onDeleteTrip,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onToggleItemPaid,
  onAddBudgetLine,
  onEditBudgetLine,
  onDeleteBudgetLine,
}: TripDetailProps) {
  if (!trip) {
    return <EmptyState title="ยังไม่ได้เลือกทริป" description="เลือกทริปจากรายการหรือสร้างทริปใหม่" />
  }

  const totals = calculateTripTotals(data, trip)
  const budgetLineViews = getTripBudgetLineViews(data, trip)
  const actualByCategory = getTripActualByCategory(trip)
  const remainingTone = totals.remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-extrabold text-blue-950">{trip.name}</h2>
              <Badge tone={getTripStatus(trip) === 'completed' ? 'neutral' : 'active'}>{statusLabel[getTripStatus(trip)]}</Badge>
            </div>
            <p className="mt-1 text-sm text-blue-700">
              {trip.destination || '-'} · {formatDate(trip.startDate)} · {formatDate(trip.endDate)} · {getTripDayCount(trip)} วัน
            </p>
            {trip.note && <p className="mt-2 text-sm text-blue-800">{trip.note}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onAddItem(trip)}>เพิ่มรายการ</Button>
            <Button size="sm" onClick={() => onEditTrip(trip)}>แก้ไขทริป</Button>
            <Button size="sm" variant="danger" onClick={() => onDeleteTrip(trip.id)}>{th.common.delete}</Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['overview', 'actual', 'plan'] as TripDetailTab[]).map((tab) => (
          <button
            key={tab}
            className={`min-h-10 rounded-xl border px-4 text-sm font-extrabold ${
              activeTab === tab ? 'border-blue-700 bg-blue-600 text-white' : 'border-slate-300 bg-white text-blue-700'
            }`}
            type="button"
            onClick={() => onChangeTab(tab)}
          >
            {tab === 'overview' ? 'ภาพรวม' : tab === 'actual' ? 'รายการจริง' : 'งบ/แผน'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="งบที่วางไว้" value={formatMoney(totals.plannedBudget)} />
          <Metric label="ใช้จริง" value={formatMoney(totals.actualSpending)} />
          <Metric label="จ่ายแล้ว / ยังไม่จ่าย" value={`${formatMoney(totals.paidTotal)} / ${formatMoney(totals.unpaidTotal)}`} />
          <Metric label={totals.remaining >= 0 ? 'คงเหลือ' : 'เกินงบ'} value={formatMoney(Math.abs(totals.remaining))} className={remainingTone} />
        </div>
      )}

      {activeTab === 'actual' && (
        <div className="grid gap-3">
          {trip.items.length ? trip.items.map((item) => (
            <article key={item.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_auto] md:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-extrabold">{item.title}</h3>
                  <Badge tone={item.isPaid ? 'income' : 'warning'}>{item.isPaid ? th.transaction.paid : th.transaction.unpaid}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
                  <span>{formatDate(item.date)}</span>
                  <span>{item.category}</span>
                  {item.installmentId && <span>{th.transaction.installment}: {item.installmentId}</span>}
                  {(item.destination || item.country) && <span>{[item.destination, item.country].filter(Boolean).join(', ')}</span>}
                  {item.note && <span className="truncate">หมายเหตุ: {item.note}</span>}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-[auto_auto] md:flex md:items-center md:justify-end">
                <div className="text-right text-lg font-extrabold text-rose-700">{formatMoney(item.amount)}</div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button size="sm" onClick={() => onToggleItemPaid(trip, item.id)}>{item.isPaid ? th.transaction.markUnpaid : th.transaction.markPaid}</Button>
                  <Button size="sm" onClick={() => onEditItem(trip, item)}>{th.common.edit}</Button>
                  <Button size="sm" variant="danger" onClick={() => onDeleteItem(trip, item.id)}>{th.common.delete}</Button>
                </div>
              </div>
            </article>
          )) : <EmptyState title="ยังไม่มีรายการทริป" description="เพิ่มรายการใช้จ่ายจริงของทริปนี้" />}
        </div>
      )}

      {activeTab === 'plan' && (
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric label="งบทริป" value={formatMoney(Number(trip.budget || 0))} />
            <Metric label="งบแยกหมวดรวม" value={formatMoney(budgetLineViews.reduce((total, view) => total + view.planned, 0))} />
            <Metric label="แผนที่ใช้คำนวณ" value={formatMoney(totals.plannedBudget)} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-bold text-slate-500">งบแยกหมวดใช้เทียบแผนกับรายการจ่ายจริงของทริป</div>
            <Button size="sm" variant="primary" onClick={() => onAddBudgetLine(trip)}>เพิ่มงบหมวด</Button>
          </div>

          {budgetLineViews.length ? (
            <div className="grid gap-3">
              {budgetLineViews.map((view) => (
                <article key={view.categoryId} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold">{view.categoryId}</h3>
                        <Badge tone={budgetStatusTone[view.status]}>{budgetStatusLabel[view.status]}</Badge>
                      </div>
                      {view.line.note && <p className="mt-1 text-sm text-slate-500">{view.line.note}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => onEditBudgetLine(trip, view.line)}>{th.common.edit}</Button>
                      <Button size="sm" variant="danger" onClick={() => onDeleteBudgetLine(trip, view.categoryId)}>{th.common.delete}</Button>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <Metric label="วางแผน" value={formatMoney(view.planned)} />
                    <Metric label="ใช้จริง" value={formatMoney(view.actual)} className="text-rose-700" />
                    <Metric
                      label={view.remaining >= 0 ? 'คงเหลือ' : 'เกินงบ'}
                      value={formatMoney(Math.abs(view.remaining))}
                      className={view.remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'}
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                      <span>ใช้ไป {view.usagePercent}%</span>
                      <span>ใช้จริง {formatMoney(view.actual)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${budgetStatusBar[view.status]}`} style={{ width: `${view.usagePercent}%` }} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              ยังไม่มีงบแยกหมวด เพิ่มหมวดเพื่อเทียบแผนกับค่าใช้จ่ายจริง
            </div>
          )}

          {actualByCategory.size > 0 && (
            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-extrabold">ใช้จริงตามหมวด</h3>
              {Array.from(actualByCategory.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-bold text-slate-600">{category}</span>
                  <span className="font-extrabold text-rose-700">{formatMoney(amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type MetricProps = {
  label: string
  value: string
  className?: string
}

function Metric({ label, value, className = 'text-blue-700' }: MetricProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-bold text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-extrabold ${className}`}>{value}</div>
    </div>
  )
}
