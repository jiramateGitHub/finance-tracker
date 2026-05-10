import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { th } from '../../../i18n/th'
import type { AppData, BudgetLine, Trip, TripItem } from '../../../types/finance'
import { clampPercent, formatDate, formatMoney } from '../../../utils/formatters'
import {
  calculateTripTotals,
  getTripActualByCategory,
  getTripBudgetLineViews,
  getTripDayCount,
  getTripStatus,
  tripBudgetStatusLabel,
  tripStatusLabel,
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
  onBackToList?: () => void
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

const tabLabels: Record<TripDetailTab, string> = {
  overview: 'ภาพรวม',
  actual: 'รายการจริง',
  plan: 'แผนงบ',
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
  onBackToList,
}: TripDetailProps) {
  if (!trip) {
    return <EmptyState title="ยังไม่ได้เลือกทริป" description="เลือกทริปจากรายการหรือสร้างทริปใหม่เพื่อดูรายละเอียด" />
  }

  const totals = calculateTripTotals(data, trip)
  const budgetLineViews = getTripBudgetLineViews(data, trip)
  const actualByCategory = getTripActualByCategory(trip)
  const remainingTone = totals.remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'
  const tripStatus = getTripStatus(trip)
  const usagePercent = clampPercent(totals.usagePercent)

  return (
    <div className="grid min-w-0 gap-3">
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-3 sm:p-4">
        <div className="finance-toolbar items-start">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="min-w-0 break-words text-xl font-extrabold leading-tight text-blue-950">{trip.name}</h2>
              <Badge tone={tripStatus === 'completed' ? 'neutral' : 'active'}>{tripStatusLabel[tripStatus]}</Badge>
            </div>
            <p className="mt-1 text-sm font-semibold leading-6 text-blue-700">
              {trip.destination || 'ยังไม่ระบุจุดหมาย'} · {formatDate(trip.startDate)} - {formatDate(trip.endDate)} · {getTripDayCount(trip)} วัน
            </p>
            {trip.note ? <p className="mt-1 text-sm leading-6 text-blue-800">{trip.note}</p> : null}
          </div>
          <div className="flex min-w-0 flex-wrap justify-end gap-2">
            {onBackToList ? <Button type="button" size="sm" onClick={onBackToList}>กลับไปดูรายการทริป</Button> : null}
            <Button type="button" size="sm" onClick={() => onAddItem(trip)}>เพิ่มรายการ</Button>
            <Button type="button" size="sm" onClick={() => onEditTrip(trip)}>แก้ไขทริป</Button>
            <Button type="button" size="sm" variant="danger" onClick={() => onDeleteTrip(trip.id)}>{th.common.delete}</Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          <div className="flex items-center justify-between gap-3 text-xs font-bold text-blue-700">
            <span>ใช้จริงเทียบงบ</span>
            <span>{usagePercent}%</span>
          </div>
          <div className="finance-progress-track bg-blue-100">
            <div className="finance-progress-bar" style={{ width: `${usagePercent}%` }} />
          </div>
        </div>
      </div>

      <div className="finance-mini-summary-grid">
        <Metric label="งบที่วางไว้" value={formatMoney(totals.plannedBudget)} />
        <Metric label="ใช้จริง" value={formatMoney(totals.actualSpending)} className="text-rose-700" />
        <Metric label="จ่ายแล้ว" value={formatMoney(totals.paidTotal)} className="text-emerald-700" />
        <Metric label="ยังไม่จ่าย" value={formatMoney(totals.unpaidTotal)} className="text-amber-700" />
        <Metric label={totals.remaining >= 0 ? 'คงเหลือ' : 'เกินงบ'} value={formatMoney(Math.abs(totals.remaining))} className={remainingTone} />
      </div>

      <div className="finance-segmented" aria-label="แท็บรายละเอียดทริป">
        {(['overview', 'actual', 'plan'] as TripDetailTab[]).map((tab) => (
          <button
            key={tab}
            className={`finance-segmented-button ${activeTab === tab ? 'is-active' : ''}`}
            type="button"
            aria-pressed={activeTab === tab}
            onClick={() => onChangeTab(tab)}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <Metric label="จำนวนรายการจริง" value={`${totals.itemCount} รายการ`} />
            <Metric label="จำนวนวัน" value={`${getTripDayCount(trip)} วัน`} />
            <Metric label="สถานะทริป" value={tripStatusLabel[tripStatus]} />
          </div>

          {actualByCategory.size > 0 ? (
            <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <h3 className="font-extrabold text-slate-800">ใช้จริงตามหมวด</h3>
              {Array.from(actualByCategory.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-bold text-slate-600">{category}</span>
                  <span className="font-extrabold text-rose-700">{formatMoney(amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="ยังไม่มีรายการจริง" description="เพิ่มรายการใช้จ่ายเพื่อดูสรุปตามหมวดและสถานะจ่าย" />
          )}
        </div>
      )}

      {activeTab === 'actual' && (
        <div className="grid gap-3">
          <div className="finance-toolbar">
            <div className="text-sm font-bold text-slate-500">รายการใช้จ่ายจริงของทริปนี้</div>
            <Button type="button" size="sm" variant="primary" onClick={() => onAddItem(trip)}>เพิ่มรายการ</Button>
          </div>
          {trip.items.length ? trip.items.map((item) => (
            <article key={item.id} className="finance-card-compact grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 className="min-w-0 truncate font-extrabold">{item.title}</h3>
                  <Badge tone={item.isPaid ? 'income' : 'warning'}>{item.isPaid ? th.transaction.paid : th.transaction.unpaid}</Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
                  <span>{formatDate(item.date)}</span>
                  <span>{item.category}</span>
                  {item.installmentId ? <span>{th.transaction.installment}: {item.installmentId}</span> : null}
                  {(item.destination || item.country) ? <span>{[item.destination, item.country].filter(Boolean).join(', ')}</span> : null}
                  {item.note ? <span className="truncate">หมายเหตุ: {item.note}</span> : null}
                </div>
              </div>
              <div className="grid gap-2 md:justify-items-end">
                <div className="text-right text-lg font-extrabold text-rose-700">{formatMoney(item.amount)}</div>
                <div className="flex min-w-0 flex-wrap justify-end gap-2">
                  <Button type="button" size="sm" onClick={() => onToggleItemPaid(trip, item.id)}>{item.isPaid ? th.transaction.markUnpaid : th.transaction.markPaid}</Button>
                  <Button type="button" size="sm" onClick={() => onEditItem(trip, item)}>{th.common.edit}</Button>
                  <Button type="button" size="sm" variant="danger" onClick={() => onDeleteItem(trip, item.id)}>{th.common.delete}</Button>
                </div>
              </div>
            </article>
          )) : <EmptyState title="ยังไม่มีรายการทริป" description="เพิ่มรายการใช้จ่ายจริงของทริปนี้ เช่น ที่พัก อาหาร เดินทาง หรือกิจกรรม" />}
        </div>
      )}

      {activeTab === 'plan' && (
        <div className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Metric label="งบทริปหลัก" value={formatMoney(Number(trip.budget || 0))} />
            <Metric label="งบแยกหมวดรวม" value={formatMoney(budgetLineViews.reduce((total, view) => total + view.planned, 0))} />
            <Metric label="แผนที่ใช้คำนวณ" value={formatMoney(totals.plannedBudget)} />
          </div>

          <div className="finance-toolbar">
            <div className="text-sm font-bold leading-6 text-slate-500">งบแยกหมวดช่วยเทียบแผนกับรายการจริงในทริป</div>
            <Button type="button" size="sm" variant="primary" onClick={() => onAddBudgetLine(trip)}>เพิ่มงบหมวด</Button>
          </div>

          {budgetLineViews.length ? (
            <div className="grid gap-3">
              {budgetLineViews.map((view) => (
                <article key={view.categoryId} className="finance-card-compact grid gap-3">
                  <div className="finance-toolbar items-start">
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h3 className="truncate font-extrabold">{view.categoryId}</h3>
                        <Badge tone={budgetStatusTone[view.status]}>{tripBudgetStatusLabel[view.status]}</Badge>
                      </div>
                      {view.line.note ? <p className="mt-1 text-sm leading-6 text-slate-500">{view.line.note}</p> : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" onClick={() => onEditBudgetLine(trip, view.line)}>{th.common.edit}</Button>
                      <Button type="button" size="sm" variant="danger" onClick={() => onDeleteBudgetLine(trip, view.categoryId)}>{th.common.delete}</Button>
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
                    <div className="finance-progress-track">
                      <div className={`h-full rounded-full ${budgetStatusBar[view.status]}`} style={{ width: `${view.usagePercent}%` }} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="ยังไม่มีงบแยกหมวด" description="เพิ่มหมวดงบ เช่น ที่พัก ของกิน เดินทาง เพื่อเทียบแผนกับค่าใช้จ่ายจริง" />
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
    <div className="finance-mini-summary-card">
      <div className="finance-metric-label">{label}</div>
      <div className={`finance-metric-value ${className}`}>{value}</div>
    </div>
  )
}
