import { useMemo, useState } from 'react'
import { ActionButton } from '../../../components/ui/ActionButton'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { EmptyState } from '../../../components/ui/EmptyState'
import { FormField } from '../../../components/ui/FormField'
import {
  IconCalendar,
  IconCheck,
  IconPlus,
  IconSearch,
} from '../../../components/ui/Icons'
import { SelectField } from '../../../components/ui/SelectField'
import { TextInput } from '../../../components/ui/TextInput'
import { ViewSwitcher } from '../../../components/ui/ViewSwitcher'
import { CATEGORY_CHART_COLORS } from '../../../constants/theme'
import { th } from '../../../i18n/th'
import type { AppData, BudgetLine, Trip, TripItem } from '../../../types/finance'
import { clampPercent, formatDate, formatMoney } from '../../../utils/formatters'
import {
  calculateTripTotals,
  compareTripItemsByDateAndCreatedAt,
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
  hideHeader?: boolean
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

type ActualItemStatusFilter = 'all' | 'paid' | 'unpaid' | 'installment'
type DetailViewMode = 'table' | 'cards'

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

const actualStatusOptions: Array<{ value: ActualItemStatusFilter; label: string }> = [
  { value: 'all', label: 'ทุกสถานะ' },
  { value: 'unpaid', label: 'ยังไม่จ่าย' },
  { value: 'paid', label: 'จ่ายแล้ว' },
  { value: 'installment', label: 'ผูกยอดผ่อน' },
]

export function TripDetail({
  data,
  trip,
  hideHeader = false,
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
  const [actualKeyword, setActualKeyword] = useState('')
  const [actualCategory, setActualCategory] = useState('')
  const [actualStatus, setActualStatus] = useState<ActualItemStatusFilter>('all')
  const [actualViewMode, setActualViewMode] = useState<DetailViewMode>('table')
  const [planViewMode, setPlanViewMode] = useState<DetailViewMode>('table')
  const [collapsedActualDates, setCollapsedActualDates] = useState<Set<string>>(() => new Set())

  const installmentNameById = useMemo(
    () => new Map(data.installmentPlans.map((plan) => [plan.id, plan.name])),
    [data.installmentPlans],
  )
  const actualCategoryOptions = useMemo(
    () => Array.from(new Set((trip?.items ?? []).map((item) => item.category).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'th-TH')),
    [trip?.items],
  )
  const filteredActualItems = useMemo(
    () => filterTripItems(trip?.items ?? [], {
      category: actualCategory,
      installmentNameById,
      keyword: actualKeyword,
      status: actualStatus,
    }),
    [actualCategory, actualKeyword, actualStatus, installmentNameById, trip?.items],
  )
  const actualItemGroups = useMemo(() => groupTripItemsByDate(filteredActualItems), [filteredActualItems])
  const isActualFiltered = Boolean(actualKeyword.trim() || actualCategory || actualStatus !== 'all')

  if (!trip) {
    return <EmptyState title="ยังไม่ได้เลือกทริป" description="เลือกทริปจากรายการหรือสร้างทริปใหม่เพื่อดูรายละเอียด" />
  }

  const totals = calculateTripTotals(data, trip)
  const budgetLineViews = getTripBudgetLineViews(data, trip)
  const actualByCategory = getTripActualByCategory(trip)
  const remainingTone = totals.remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'
  const tripStatus = getTripStatus(trip)
  const usagePercent = clampPercent(totals.usagePercent)
  const filteredActualTotal = filteredActualItems.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const dayCount = getTripDayCount(trip) || 1
  const dailyAverage = totals.actualSpending > 0 ? totals.actualSpending / dayCount : 0
  const paidPercent = totals.actualSpending > 0 ? clampPercent(Math.round((totals.paidTotal / totals.actualSpending) * 100)) : 0
  const unpaidItemsCount = trip.items.filter((item) => !item.isPaid).length
  const paidItemsCount = trip.items.filter((item) => item.isPaid).length
  const totalCategoryBudget = budgetLineViews.reduce((total, view) => total + view.planned, 0)

  const recentItems = trip.items
    .slice()
    .sort(compareTripItemsByDateAndCreatedAt)
    .slice(0, 4)

  function toggleActualDate(date: string): void {
    setCollapsedActualDates((current) => {
      const next = new Set(current)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  function clearActualFilters(): void {
    setActualKeyword('')
    setActualCategory('')
    setActualStatus('all')
  }

  return (
    <div className="grid min-w-0 gap-4">
      {!hideHeader && (
        <>
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-3.5 sm:p-4 shadow-xs">
            <div className="finance-toolbar items-start">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="min-w-0 break-words text-xl font-extrabold leading-tight text-slate-900">{trip.name}</h2>
                  <Badge tone={tripStatus === 'completed' ? 'neutral' : 'active'}>{tripStatusLabel[tripStatus]}</Badge>
                </div>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                  {trip.destination || 'ยังไม่ระบุจุดหมาย'} · {formatDate(trip.startDate)} - {formatDate(trip.endDate)} · {dayCount} วัน
                </p>
                {trip.note ? <p className="mt-1 text-sm leading-6 text-slate-500">{trip.note}</p> : null}
              </div>
              <div className="flex min-w-0 flex-wrap justify-end gap-2">
                <Button type="button" size="sm" variant="primary" icon={<IconPlus size={15} />} onClick={() => onAddItem(trip)}>เพิ่มรายการ</Button>
                <Button type="button" size="sm" onClick={() => onEditTrip(trip)}>{th.common.edit}</Button>
                <Button type="button" size="sm" variant="danger" onClick={() => onDeleteTrip(trip.id)}>{th.common.delete}</Button>
              </div>
            </div>

            <div className="mt-3.5 grid gap-1.5">
              <div className="flex items-center justify-between gap-3 text-xs font-bold text-blue-700">
                <span>ใช้จริงเทียบงบประมาณ</span>
                <span>{usagePercent}%</span>
              </div>
              <div className="finance-progress-track bg-blue-100">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    totals.remaining < 0 ? 'bg-rose-500' : usagePercent > 85 ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(100, usagePercent)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard label="งบที่วางไว้" value={formatMoney(totals.plannedBudget)} />
            <MetricCard label="ใช้จริง" value={formatMoney(totals.actualSpending)} valueClassName="text-rose-700" />
            <MetricCard label="จ่ายแล้ว" value={formatMoney(totals.paidTotal)} valueClassName="text-emerald-700" />
            <MetricCard label="ยังไม่จ่าย" value={formatMoney(totals.unpaidTotal)} valueClassName="text-amber-700" />
            <MetricCard label={totals.remaining >= 0 ? 'คงเหลือ' : 'เกินงบ'} value={formatMoney(Math.abs(totals.remaining))} valueClassName={remainingTone} />
          </div>
        </>
      )}

      {/* Main Tab Navigation Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="finance-segmented" aria-label="แท็บรายละเอียดทริป">
          {(['overview', 'actual', 'plan'] as TripDetailTab[]).map((tab) => {
            const count = tab === 'actual' ? trip.items.length : tab === 'plan' ? budgetLineViews.length : null
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                className={`finance-segmented-button flex items-center gap-1.5 ${isActive ? 'is-active' : ''}`}
                type="button"
                aria-pressed={isActive}
                onClick={() => onChangeTab(tab)}
              >
                <span>{tabLabels[tab]}</span>
                {count !== null && count > 0 ? (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200/90 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {/* ==================== TAB 1: OVERVIEW ==================== */}
      {activeTab === 'overview' && (
        <div className="grid gap-4">
          {/* Key Highlights Metric Grid */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">ระยะเวลาเดินทาง</span>
              <div className="mt-1 text-base sm:text-lg font-extrabold text-slate-900">{dayCount} วัน</div>
              <div className="mt-0.5 text-xs text-slate-500 font-medium truncate">
                {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">รายการใช้จ่ายทั้งหมด</span>
              <div className="mt-1 text-base sm:text-lg font-extrabold text-slate-900">{totals.itemCount} รายการ</div>
              <div className="mt-0.5 text-xs text-slate-500 font-medium">
                บันทึกแล้วในทริปนี้
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">ค่าใช้จ่ายเฉลี่ย / วัน</span>
              <div className="mt-1 text-base sm:text-lg font-extrabold text-slate-900 tabular-nums">{formatMoney(dailyAverage)}</div>
              <div className="mt-0.5 text-xs text-slate-500 font-medium truncate">
                จากยอดใช้จริง {formatMoney(totals.actualSpending)}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">อัตราการชำระเงิน</span>
              <div className="mt-1 text-base sm:text-lg font-extrabold text-emerald-700 tabular-nums">{paidPercent}%</div>
              <div className="mt-0.5 text-xs text-slate-500 font-medium truncate">
                ชำระแล้ว {formatMoney(totals.paidTotal)}
              </div>
            </div>
          </div>

          {/* Budget Health Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">สุขภาพงบประมาณ</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ใช้งบไปแล้ว {usagePercent}% ของแผนงบประมาณที่วางไว้ ({formatMoney(totals.actualSpending)} / {formatMoney(totals.plannedBudget)})
                </p>
              </div>
              <Badge tone={totals.remaining >= 0 ? (usagePercent > 85 ? 'warning' : 'income') : 'expense'}>
                {totals.remaining >= 0 ? (usagePercent > 85 ? 'ใกล้เต็มงบ' : 'อยู่ในงบประมาณ') : 'งบประมาณเกิน'}
              </Badge>
            </div>

            <div className="mt-3 grid gap-1.5">
              <div className="finance-progress-track bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    totals.remaining < 0 ? 'bg-rose-500' : usagePercent > 85 ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(100, usagePercent)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>0 บาท</span>
                <span>งบที่วางไว้ {formatMoney(totals.plannedBudget)}</span>
              </div>
            </div>
          </div>

          {/* 2-Column Split: Category Distribution & Payment Breakdown */}
          <div className="grid gap-4 lg:grid-cols-2 items-stretch">
            {/* Category Distribution Card */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">สัดส่วนค่าใช้จ่ายตามหมวดหมู่</h3>
                    <p className="text-xs text-slate-500 mt-0.5">เรียงตามยอดใช้จ่ายจริงจากมากไปน้อย</p>
                  </div>
                  <span className="text-xs font-bold text-slate-500">{actualByCategory.size} หมวด</span>
                </div>

                {actualByCategory.size > 0 ? (
                  <div className="mt-3.5 space-y-3">
                    {Array.from(actualByCategory.entries())
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, amount], index) => {
                        const color = CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length]
                        const percentage = totals.actualSpending > 0
                          ? clampPercent(Math.round((amount / totals.actualSpending) * 100))
                          : 0
                        const matchingBudget = budgetLineViews.find((b) => b.categoryId === category)

                        return (
                          <div key={category} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <span className="font-bold text-slate-800 truncate">{category}</span>
                                {matchingBudget ? (
                                  <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                                    (งบ {formatMoney(matchingBudget.planned)})
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-slate-500 font-semibold">{percentage}%</span>
                                <span className="font-bold text-slate-900 tabular-nums">{formatMoney(amount)}</span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%`, backgroundColor: color }}
                              />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400 font-medium">
                    ยังไม่มีรายการใช้จ่ายจริงในทริปนี้
                  </div>
                )}
              </div>

              {actualByCategory.size > 0 ? (
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>รวมค่าใช้จ่ายจริง</span>
                  <span className="font-extrabold text-rose-700 text-sm tabular-nums">{formatMoney(totals.actualSpending)}</span>
                </div>
              ) : null}
            </div>

            {/* Payment & Installment Breakdown Card */}
            <div className="flex flex-col gap-3.5 h-full">
              {/* Payment Status Split */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                {/* Paid */}
                <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <IconCheck size={14} />
                      </div>
                      <Badge tone="income">จ่ายแล้ว</Badge>
                    </div>
                    <div className="mt-2 text-lg font-extrabold text-emerald-800 tabular-nums">{formatMoney(totals.paidTotal)}</div>
                  </div>
                  <div className="mt-1 text-xs text-emerald-700 font-medium">
                    {paidItemsCount} รายการชำระแล้ว
                  </div>
                </div>

                {/* Unpaid */}
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-3.5 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                        <IconCalendar size={14} />
                      </div>
                      <Badge tone="warning">รอชำระ</Badge>
                    </div>
                    <div className="mt-2 text-lg font-extrabold text-amber-800 tabular-nums">{formatMoney(totals.unpaidTotal)}</div>
                  </div>
                  <div className="mt-1 text-xs text-amber-700 font-medium flex items-center justify-between">
                    <span>{unpaidItemsCount} รายการยังไม่จ่าย</span>
                    {unpaidItemsCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          onChangeTab('actual')
                          setActualStatus('unpaid')
                        }}
                        className="text-amber-800 underline hover:text-amber-900 font-bold"
                      >
                        ดูรายการ →
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Installment Plans Info Box */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">การผูกกับแผนผ่อนชำระ</h4>
                  {trip.items.some((item) => Boolean(item.installmentId)) ? (
                    <div className="mt-2 space-y-2">
                      {trip.items
                        .filter((item) => Boolean(item.installmentId))
                        .map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-slate-100 last:border-b-0">
                            <div className="min-w-0">
                              <span className="font-bold text-slate-800 truncate block">{item.title}</span>
                              <span className="text-slate-400">{installmentNameById.get(item.installmentId ?? '') || 'แผนผ่อน'}</span>
                            </div>
                            <span className="font-bold text-rose-700 tabular-nums">{formatMoney(item.amount)}</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-slate-400 font-medium">ไม่มีรายการในทริปนี้ที่ผูกกับแผนผ่อนสินค้า</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Expenses Preview Section */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">รายการใช้จ่ายล่าสุด</h3>
                <p className="text-xs text-slate-500 mt-0.5">รายการจริงที่บันทึกล่าสุดในทริปนี้</p>
              </div>
              <Button type="button" size="sm" onClick={() => onChangeTab('actual')}>
                ดูรายการจริงทั้งหมด ({trip.items.length}) →
              </Button>
            </div>

            {recentItems.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentItems.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 truncate">{item.title}</span>
                        <Badge tone={item.isPaid ? 'income' : 'warning'}>{item.isPaid ? th.transaction.paid : th.transaction.unpaid}</Badge>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span>{formatDate(item.date)}</span>
                        <span>•</span>
                        <span>{item.category}</span>
                        {item.destination ? (
                          <>
                            <span>•</span>
                            <span>{item.destination}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-right font-extrabold text-rose-700 tabular-nums text-sm">
                      {formatMoney(item.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">
                ยังไม่มีรายการใช้จ่าย
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 2: ACTUAL TRANSACTIONS ==================== */}
      {activeTab === 'actual' && (
        <div className="grid gap-3.5">
          {/* Toolbar Header */}
          <div className="finance-toolbar items-center pb-1 border-b border-slate-100">
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">รายการใช้จ่ายจริงของทริปนี้</h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                แสดง {filteredActualItems.length} จาก {trip.items.length} รายการ · รวม {formatMoney(filteredActualTotal)}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <ViewSwitcher<DetailViewMode>
                activeView={actualViewMode}
                onViewChange={setActualViewMode}
                options={[
                  { id: 'table', label: 'ตาราง', icon: 'table' },
                  { id: 'cards', label: 'การ์ดตามวัน', icon: 'cards' },
                ]}
              />
              <Button type="button" size="sm" variant="primary" icon={<IconPlus size={16} />} onClick={() => onAddItem(trip)}>
                เพิ่มรายการ
              </Button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-3 sm:p-3.5 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Keyword Search */}
              <div className="relative">
                <label className="text-xs font-semibold text-slate-500 mb-1 block">ค้นหา</label>
                <div className="relative">
                  <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <TextInput
                    value={actualKeyword}
                    placeholder="ชื่อ, หมวด, หรือหมายเหตุ"
                    className="pl-8"
                    onChange={(event) => setActualKeyword(event.target.value)}
                  />
                </div>
              </div>

              {/* Category Filter */}
              <FormField label="หมวดหมู่">
                <SelectField
                  value={actualCategory}
                  options={[
                    { value: '', label: 'ทุกหมวดหมู่' },
                    ...actualCategoryOptions.map((category) => ({ value: category, label: category })),
                  ]}
                  onChange={(event) => setActualCategory(event.target.value)}
                />
              </FormField>

              {/* Status Filter */}
              <FormField label="สถานะการชำระ">
                <SelectField
                  value={actualStatus}
                  options={actualStatusOptions}
                  onChange={(event) => setActualStatus(event.target.value as ActualItemStatusFilter)}
                />
              </FormField>
            </div>

            {/* Filter Actions Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
              <span className="font-semibold text-slate-500">
                พบ {filteredActualItems.length} รายการ ({actualItemGroups.length} วัน)
              </span>

              <div className="flex items-center gap-1.5">
                {isActualFiltered ? (
                  <Button type="button" size="sm" onClick={clearActualFilters}>
                    {th.common.clearFilters}
                  </Button>
                ) : null}
                {actualViewMode === 'cards' && actualItemGroups.length > 0 ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setCollapsedActualDates(new Set(actualItemGroups.map((group) => group.date)))}
                    >
                      ย่อทั้งหมด
                    </Button>
                    <Button type="button" size="sm" onClick={() => setCollapsedActualDates(new Set())}>
                      ขยายทั้งหมด
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* Actual Items View: Table vs Cards */}
          {filteredActualItems.length === 0 ? (
            <EmptyState
              title={trip.items.length ? 'ไม่พบรายการตามตัวกรอง' : 'ยังไม่มีรายการทริป'}
              description={
                trip.items.length
                  ? 'ลองเปลี่ยนคำค้น หมวดหมู่ หรือสถานะเพื่อดูรายการอื่น'
                  : 'เพิ่มรายการใช้จ่ายจริงของทริปนี้ เช่น ที่พัก อาหาร เดินทาง หรือกิจกรรม'
              }
            />
          ) : actualViewMode === 'table' ? (
            <>
              {/* Desktop Full Table View */}
              <div className="hidden md:block rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">วันที่</th>
                        <th className="py-3 px-4">รายการ / รายละเอียด</th>
                        <th className="py-3 px-3">หมวดหมู่</th>
                        <th className="py-3 px-3">การผูกผ่อน</th>
                        <th className="py-3 px-3">สถานะ</th>
                        <th className="py-3 px-4 text-right">จำนวนเงิน</th>
                        <th className="py-3 px-4 text-center">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredActualItems.map((item) => (
                        <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                            {formatDate(item.date)}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div className="font-bold truncate max-w-[240px]" title={item.title}>
                              {item.title}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-normal truncate max-w-[240px]">
                              {item.destination || item.country ? (
                                <span>{[item.destination, item.country].filter(Boolean).join(', ')}</span>
                              ) : null}
                              {item.note ? <span>({item.note})</span> : null}
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-medium text-xs">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-xs">
                            {item.installmentId ? (
                              <Badge tone="warning">
                                {installmentNameById.get(item.installmentId) ?? 'ผูกยอดผ่อน'}
                              </Badge>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <Badge tone={item.isPaid ? 'income' : 'warning'}>
                              {item.isPaid ? th.transaction.paid : th.transaction.unpaid}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-rose-700 tabular-nums text-sm whitespace-nowrap">
                            {formatMoney(item.amount)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <ActionButton
                                action="pay"
                                size="sm"
                                isPaid={item.isPaid}
                                label={item.isPaid ? th.transaction.markUnpaid : th.transaction.markPaid}
                                onClick={() => onToggleItemPaid(trip, item.id)}
                              />
                              <ActionButton
                                action="edit"
                                size="sm"
                                iconOnly
                                title={th.common.edit}
                                onClick={() => onEditItem(trip, item)}
                              />
                              <ActionButton
                                action="delete"
                                size="sm"
                                iconOnly
                                title={th.common.delete}
                                onClick={() => onDeleteItem(trip, item.id)}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card Fallback (md:hidden) when in table mode */}
              <div className="space-y-3 md:hidden">
                {filteredActualItems.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                          <span className="font-semibold text-slate-700">{formatDate(item.date)}</span>
                          <span>•</span>
                          <span>{item.category}</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{item.title}</h4>
                        {item.destination || item.country ? (
                          <p className="text-xs text-slate-400 mt-0.5">{[item.destination, item.country].filter(Boolean).join(', ')}</p>
                        ) : null}
                      </div>
                      <div className="text-right text-base font-extrabold text-rose-700 tabular-nums shrink-0">
                        {formatMoney(item.amount)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={item.isPaid ? 'income' : 'warning'}>
                        {item.isPaid ? th.transaction.paid : th.transaction.unpaid}
                      </Badge>
                      {item.installmentId ? (
                        <Badge tone="warning">
                          {installmentNameById.get(item.installmentId) ?? 'ผูกยอดผ่อน'}
                        </Badge>
                      ) : null}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                      <ActionButton
                        action="pay"
                        size="sm"
                        isPaid={item.isPaid}
                        label={item.isPaid ? th.transaction.markUnpaid : th.transaction.markPaid}
                        onClick={() => onToggleItemPaid(trip, item.id)}
                      />
                      <div className="flex items-center gap-1">
                        <ActionButton action="edit" size="sm" iconOnly title={th.common.edit} onClick={() => onEditItem(trip, item)} />
                        <ActionButton action="delete" size="sm" iconOnly title={th.common.delete} onClick={() => onDeleteItem(trip, item.id)} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            /* Cards View: Grouped by Date (Accordion) */
            <div className="grid gap-3">
              {actualItemGroups.map((group) => {
                const collapsed = collapsedActualDates.has(group.date)
                return (
                  <section key={group.date} className="grid gap-2">
                    <button
                      type="button"
                      className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-slate-50/90 px-3.5 py-2.5 text-left transition hover:bg-slate-100/90"
                      aria-expanded={!collapsed}
                      onClick={() => toggleActualDate(group.date)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-white text-xs font-extrabold text-slate-700 shadow-xs border border-slate-200">
                          {collapsed ? '+' : '−'}
                        </span>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-900">{formatDate(group.date)}</h4>
                          <span className="text-xs text-slate-500 font-semibold">{group.items.length} รายการ</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-extrabold text-rose-700 tabular-nums">{formatMoney(group.total)}</div>
                        <div className="text-[11px] font-semibold text-slate-400">{collapsed ? 'แตะเพื่อดู' : 'แตะเพื่อย่อ'}</div>
                      </div>
                    </button>

                    {!collapsed ? (
                      <div className="grid gap-2 pl-2 sm:pl-3 border-l-2 border-slate-200">
                        {group.items.map((item) => (
                          <article
                            key={item.id}
                            className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5 hover:border-slate-300 transition"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-extrabold text-sm text-slate-900 line-clamp-1">{item.title}</h4>
                                  <Badge tone={item.isPaid ? 'income' : 'warning'}>
                                    {item.isPaid ? th.transaction.paid : th.transaction.unpaid}
                                  </Badge>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs text-slate-500 font-medium">
                                  <span className="text-slate-700 font-semibold">{item.category}</span>
                                  {item.installmentId ? <span>• ผ่อน: {installmentNameById.get(item.installmentId)}</span> : null}
                                  {item.destination || item.country ? <span>• {[item.destination, item.country].filter(Boolean).join(', ')}</span> : null}
                                  {item.note ? <span className="text-slate-400">({item.note})</span> : null}
                                </div>
                              </div>
                              <div className="text-right text-base font-extrabold text-rose-700 tabular-nums shrink-0">
                                {formatMoney(item.amount)}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                              <ActionButton
                                action="pay"
                                size="sm"
                                isPaid={item.isPaid}
                                label={item.isPaid ? th.transaction.markUnpaid : th.transaction.markPaid}
                                onClick={() => onToggleItemPaid(trip, item.id)}
                              />
                              <div className="flex items-center gap-1">
                                <ActionButton action="edit" size="sm" iconOnly title={th.common.edit} onClick={() => onEditItem(trip, item)} />
                                <ActionButton action="delete" size="sm" iconOnly title={th.common.delete} onClick={() => onDeleteItem(trip, item.id)} />
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </section>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 3: BUDGET PLAN ==================== */}
      {activeTab === 'plan' && (
        <div className="grid gap-4">
          {/* Top 4 Summary Cards */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">งบทริปหลัก</span>
              <div className="mt-1 text-base sm:text-lg font-extrabold text-slate-900 tabular-nums">{formatMoney(Number(trip.budget || 0))}</div>
              <div className="mt-0.5 text-xs text-slate-400 font-medium">งบประมาณรวมทั้งทริป</div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">รวมงบแยกหมวด</span>
              <div className="mt-1 text-base sm:text-lg font-extrabold text-blue-700 tabular-nums">{formatMoney(totalCategoryBudget)}</div>
              <div className="mt-0.5 text-xs text-slate-400 font-medium">รวม {budgetLineViews.length} หมวด</div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">ใช้จริงรวม</span>
              <div className="mt-1 text-base sm:text-lg font-extrabold text-rose-700 tabular-nums">{formatMoney(totals.actualSpending)}</div>
              <div className="mt-0.5 text-xs text-slate-400 font-medium">จากรายการจริงทั้งหมด</div>
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">คงเหลือรวม</span>
              <div className={`mt-1 text-base sm:text-lg font-extrabold tabular-nums ${remainingTone}`}>
                {formatMoney(Math.abs(totals.remaining))}
              </div>
              <div className="mt-0.5 text-xs font-medium text-slate-500">
                {totals.remaining >= 0 ? 'อยู่ในกรอบงบ' : 'งบประมาณเกิน'}
              </div>
            </div>
          </div>

          {/* Budget Plan Toolbar */}
          <div className="finance-toolbar items-center pb-1 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900">แผนงบประมาณแยกตามหมวด</h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                เปรียบเทียบงบประมาณที่วางไว้กับค่าใช้จ่ายจริงในแต่ละหมวดหมู่
              </p>
            </div>

            <div className="flex items-center gap-2">
              <ViewSwitcher<DetailViewMode>
                activeView={planViewMode}
                onViewChange={setPlanViewMode}
                options={[
                  { id: 'table', label: 'ตาราง', icon: 'table' },
                  { id: 'cards', label: 'การ์ด', icon: 'cards' },
                ]}
              />
              <Button type="button" size="sm" variant="primary" icon={<IconPlus size={16} />} onClick={() => onAddBudgetLine(trip)}>
                เพิ่มงบหมวด
              </Button>
            </div>
          </div>

          {/* Budget Line Views: Table vs Cards */}
          {budgetLineViews.length === 0 ? (
            <div className="grid gap-3">
              <EmptyState
                title="ยังไม่มีงบแยกหมวด"
                description="เพิ่มหมวดงบ เช่น ที่พัก ของกิน เดินทาง เพื่อเทียบแผนกับค่าใช้จ่ายจริงได้อย่างแม่นยำ"
              />
              <div className="flex justify-center">
                <Button type="button" variant="primary" icon={<IconPlus size={16} />} onClick={() => onAddBudgetLine(trip)}>
                  เพิ่มงบหมวดแรก
                </Button>
              </div>
            </div>
          ) : planViewMode === 'table' ? (
            <>
              {/* Desktop Full Table View */}
              <div className="hidden md:block rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4">หมวดหมู่</th>
                        <th className="py-3 px-4 text-right">งบที่วางไว้</th>
                        <th className="py-3 px-4 text-right">ใช้จริง</th>
                        <th className="py-3 px-4 text-right">คงเหลือ</th>
                        <th className="py-3 px-4 w-44">การใช้งบ</th>
                        <th className="py-3 px-3 text-center">สถานะ</th>
                        <th className="py-3 px-4 text-center">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {budgetLineViews.map((view) => (
                        <tr key={view.categoryId} className="hover:bg-blue-50/30 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            <div className="font-bold text-sm">{view.categoryId}</div>
                            {view.line.note ? (
                              <div className="text-[11px] text-slate-400 font-normal truncate max-w-[200px]">{view.line.note}</div>
                            ) : null}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-800 tabular-nums whitespace-nowrap">
                            {formatMoney(view.planned)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-rose-700 tabular-nums whitespace-nowrap">
                            {formatMoney(view.actual)}
                          </td>
                          <td className={`py-3 px-4 text-right font-bold tabular-nums whitespace-nowrap ${view.remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {formatMoney(view.remaining)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                                <span>{view.usagePercent}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${budgetStatusBar[view.status]}`}
                                  style={{ width: `${Math.min(100, view.usagePercent)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <Badge tone={budgetStatusTone[view.status]}>
                              {tripBudgetStatusLabel[view.status]}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <ActionButton
                                action="edit"
                                size="sm"
                                iconOnly
                                title={th.common.edit}
                                onClick={() => onEditBudgetLine(trip, view.line)}
                              />
                              <ActionButton
                                action="delete"
                                size="sm"
                                iconOnly
                                title={th.common.delete}
                                onClick={() => onDeleteBudgetLine(trip, view.categoryId)}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card Fallback (md:hidden) when in table mode */}
              <div className="grid gap-3 md:hidden">
                {budgetLineViews.map((view) => (
                  <article key={view.categoryId} className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-sm text-slate-900 truncate">{view.categoryId}</h4>
                          <Badge tone={budgetStatusTone[view.status]}>{tripBudgetStatusLabel[view.status]}</Badge>
                        </div>
                        {view.line.note ? <p className="text-xs text-slate-400 mt-0.5 truncate">{view.line.note}</p> : null}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <ActionButton action="edit" size="sm" iconOnly title={th.common.edit} onClick={() => onEditBudgetLine(trip, view.line)} />
                        <ActionButton action="delete" size="sm" iconOnly title={th.common.delete} onClick={() => onDeleteBudgetLine(trip, view.categoryId)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">งบที่วางไว้</span>
                        <span className="text-xs font-bold text-slate-800 tabular-nums mt-0.5 block">{formatMoney(view.planned)}</span>
                      </div>
                      <div className="border-x border-slate-200/60 px-1">
                        <span className="text-[10px] text-slate-400 font-medium block">ใช้จริง</span>
                        <span className="text-xs font-bold text-rose-700 tabular-nums mt-0.5 block">{formatMoney(view.actual)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-medium block">คงเหลือ</span>
                        <span className={`text-xs font-bold tabular-nums mt-0.5 block ${view.remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatMoney(view.remaining)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>ใช้ไป {view.usagePercent}%</span>
                        <span>ใช้จริง {formatMoney(view.actual)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${budgetStatusBar[view.status]}`}
                          style={{ width: `${Math.min(100, view.usagePercent)}%` }}
                        />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            /* Cards View */
            <div className="grid gap-3 sm:grid-cols-2">
              {budgetLineViews.map((view) => (
                <article key={view.categoryId} className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3 hover:border-slate-300 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-base text-slate-900 truncate">{view.categoryId}</h4>
                        <Badge tone={budgetStatusTone[view.status]}>{tripBudgetStatusLabel[view.status]}</Badge>
                      </div>
                      {view.line.note ? <p className="text-xs text-slate-400 mt-0.5 truncate">{view.line.note}</p> : null}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <ActionButton action="edit" size="sm" iconOnly title={th.common.edit} onClick={() => onEditBudgetLine(trip, view.line)} />
                      <ActionButton action="delete" size="sm" iconOnly title={th.common.delete} onClick={() => onDeleteBudgetLine(trip, view.categoryId)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">งบที่วางไว้</span>
                      <span className="text-xs font-bold text-slate-800 tabular-nums mt-0.5 block">{formatMoney(view.planned)}</span>
                    </div>
                    <div className="border-x border-slate-200/60 px-1">
                      <span className="text-[10px] text-slate-400 font-medium block">ใช้จริง</span>
                      <span className="text-xs font-bold text-rose-700 tabular-nums mt-0.5 block">{formatMoney(view.actual)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium block">คงเหลือ</span>
                      <span className={`text-xs font-bold tabular-nums mt-0.5 block ${view.remaining >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {formatMoney(view.remaining)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>ใช้ไป {view.usagePercent}%</span>
                      <span>ใช้จริง {formatMoney(view.actual)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${budgetStatusBar[view.status]}`}
                        style={{ width: `${Math.min(100, view.usagePercent)}%` }}
                      />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type MetricCardProps = {
  label: string
  value: string
  valueClassName?: string
}

function MetricCard({ label, value, valueClassName = 'text-blue-700' }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5">
      <div className="truncate text-xs font-semibold text-slate-500">{label}</div>
      <div className={`mt-0.5 min-w-0 break-words tabular-nums text-base font-bold leading-tight sm:text-lg ${valueClassName}`}>
        {value}
      </div>
    </div>
  )
}

function groupTripItemsByDate(items: TripItem[]): Array<{ date: string; items: TripItem[]; total: number }> {
  const groups = new Map<string, TripItem[]>()
  items.slice().sort(compareTripItemsByDateAndCreatedAt).forEach((item) => {
    const date = item.date || ''
    groups.set(date, [...(groups.get(date) ?? []), item])
  })

  return Array.from(groups.entries()).map(([date, groupItems]) => ({
    date,
    items: groupItems,
    total: groupItems.reduce((sum, item) => sum + Number(item.amount || 0), 0),
  }))
}

type TripItemFilterInput = {
  category: string
  installmentNameById: Map<string, string>
  keyword: string
  status: ActualItemStatusFilter
}

function filterTripItems(items: TripItem[], filters: TripItemFilterInput): TripItem[] {
  const keyword = normalizeActualKeyword(filters.keyword)

  return items.filter((item) => {
    if (filters.category && item.category !== filters.category) return false
    if (filters.status === 'paid' && !item.isPaid) return false
    if (filters.status === 'unpaid' && item.isPaid) return false
    if (filters.status === 'installment' && !item.installmentId) return false
    if (!keyword) return true

    const installmentName = item.installmentId ? filters.installmentNameById.get(item.installmentId) : ''
    return [
      item.title,
      item.category,
      item.destination,
      item.country,
      item.note,
      installmentName,
    ].some((value) => normalizeActualKeyword(value).includes(keyword))
  })
}

function normalizeActualKeyword(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase('th-TH')
}
