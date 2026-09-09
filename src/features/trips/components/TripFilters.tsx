import { Button } from '../../../components/ui/Button'
import { FormField } from '../../../components/ui/FormField'
import { MonthInput } from '../../../components/ui/MonthInput'
import { SelectField } from '../../../components/ui/SelectField'
import { th } from '../../../i18n/th'
import { createEmptyTripFilters, tripStatusLabel, type TripFilters as TripFiltersState, type TripSortOrder, type TripStatusFilter } from '../utils/tripUtils'

type TripFiltersProps = {
  filters: TripFiltersState
  resultCount: number
  onChange: (filters: TripFiltersState) => void
  onAddItem: () => void
  canAddItem: boolean
}

export function TripFilters({ filters, resultCount, onChange, onAddItem, canAddItem }: TripFiltersProps) {
  const currentStatus = filters.status || 'all'

  function handleStatusClick(status: TripStatusFilter) {
    onChange({ ...filters, status })
  }

  const hasActiveFilters = Boolean(
    filters.keyword ||
    filters.status !== 'all' ||
    filters.rangeStartMonth ||
    filters.rangeEndMonth,
  )

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
      {/* 1. Quick Status Filter Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-100">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => handleStatusClick('all')}
            className={`min-h-10 sm:min-h-8 px-3.5 py-2 sm:py-1.5 inline-flex items-center justify-center rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              currentStatus === 'all'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ทั้งหมด
          </button>

          <button
            type="button"
            onClick={() => handleStatusClick('ongoing')}
            className={`min-h-10 sm:min-h-8 px-3.5 py-2 sm:py-1.5 inline-flex items-center justify-center rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              currentStatus === 'ongoing'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tripStatusLabel.ongoing}
          </button>

          <button
            type="button"
            onClick={() => handleStatusClick('upcoming')}
            className={`min-h-10 sm:min-h-8 px-3.5 py-2 sm:py-1.5 inline-flex items-center justify-center rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              currentStatus === 'upcoming'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tripStatusLabel.upcoming}
          </button>

          <button
            type="button"
            onClick={() => handleStatusClick('completed')}
            className={`min-h-10 sm:min-h-8 px-3.5 py-2 sm:py-1.5 inline-flex items-center justify-center rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              currentStatus === 'completed'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tripStatusLabel.completed}
          </button>
        </div>

        {/* Right side: Add Item & Clear */}
        <div className="flex items-center gap-2">
          {canAddItem && (
            <Button type="button" size="sm" onClick={onAddItem}>
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>เพิ่มรายการทริป</span>
              </span>
            </Button>
          )}
          {hasActiveFilters && (
            <Button type="button" size="sm" onClick={() => onChange(createEmptyTripFilters())}>
              {th.common.clearFilters}
            </Button>
          )}
        </div>
      </div>

      {/* 2. Core Filter Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {/* Search */}
        <div className="relative">
          <label className="text-xs font-semibold text-slate-500 mb-1 block">ค้นหา</label>
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="ทริป, จุดหมาย, หมวด, หมายเหตุ..."
              value={filters.keyword}
              onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
              className="h-11 sm:h-9 text-base sm:text-xs w-full pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {filters.keyword && (
              <button
                type="button"
                onClick={() => onChange({ ...filters, keyword: '' })}
                className="min-h-9 min-w-9 sm:min-h-8 sm:min-w-8 flex items-center justify-center absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Month start */}
        <div>
          <FormField label="เดือนเริ่ม">
            <MonthInput
              value={filters.rangeStartMonth}
              onChange={(event) => onChange({ ...filters, rangeStartMonth: event.target.value })}
            />
          </FormField>
        </div>

        {/* Month end */}
        <div>
          <FormField label="เดือนจบ">
            <MonthInput
              value={filters.rangeEndMonth}
              onChange={(event) => onChange({ ...filters, rangeEndMonth: event.target.value })}
            />
          </FormField>
        </div>

        {/* Sort */}
        <div>
          <FormField label="เรียงตาม">
            <SelectField
              value={filters.sortOrder}
              options={[
                { value: 'start-desc', label: 'เริ่มล่าสุด' },
                { value: 'start-asc', label: 'เริ่มเก่าสุด' },
                { value: 'name-asc', label: 'ชื่อทริป A-Z' },
                { value: 'actual-desc', label: 'ใช้จริงมากสุด' },
                { value: 'budget-desc', label: 'งบมากสุด' },
              ]}
              onChange={(event) => onChange({ ...filters, sortOrder: event.target.value as TripSortOrder })}
            />
          </FormField>
        </div>
      </div>

      {/* 3. Result Count Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <span className="font-semibold text-slate-700">พบ {resultCount} ทริป</span>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          แตะที่ทริปเพื่อเปิดดูรายละเอียด งบประมาณ และรายการค่าใช้จ่ายจริง
        </span>
      </div>
    </section>
  )
}
