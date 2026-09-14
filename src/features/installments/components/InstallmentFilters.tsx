import { Button } from '../../../components/ui/Button'
import { CATEGORY_ICONS } from '../../../data/categories'
import { th } from '../../../i18n/th'
import type {
  InstallmentFilters as InstallmentFiltersState,
  InstallmentSortOrder,
  InstallmentStatusFilter,
} from '../utils/installmentPlans'
import { createDefaultInstallmentFilters } from '../utils/installmentPlans'

type FilterCounts = {
  all: number
  dueThisMonth: number
  unpaid: number
  paid: number
  completed: number
}

type InstallmentFiltersProps = {
  filters: InstallmentFiltersState
  resultCount: number
  categoryOptions?: string[]
  counts?: FilterCounts
  onFiltersChange: (filters: InstallmentFiltersState) => void
}

export function InstallmentFilters({
  filters,
  resultCount,
  categoryOptions = [],
  counts,
  onFiltersChange,
}: InstallmentFiltersProps) {
  const currentStatus = filters.status || 'all'

  function handleStatusClick(status: InstallmentStatusFilter) {
    onFiltersChange({ ...filters, status })
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs space-y-3 min-w-0 w-full max-w-full">
      {/* 1. Quick Status Filter Tabs (Full width on mobile, inline with view mode on sm+) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 min-w-0 w-full max-w-full">
        <div className="w-full sm:flex-1 min-w-0 max-w-full flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 touch-pan-x">
          <button
            type="button"
            onClick={() => handleStatusClick('all')}
            className={`min-h-9 sm:min-h-8 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 inline-flex items-center justify-center cursor-pointer ${
              currentStatus === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ทั้งหมด {counts ? `(${counts.all})` : ''}
          </button>

          <button
            type="button"
            onClick={() => handleStatusClick('dueThisMonth')}
            className={`min-h-9 sm:min-h-8 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 inline-flex items-center justify-center cursor-pointer ${
              currentStatus === 'dueThisMonth'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ต้องจ่ายเดือนนี้ {counts ? `(${counts.dueThisMonth})` : ''}
          </button>

          <button
            type="button"
            onClick={() => handleStatusClick('unpaid')}
            className={`min-h-9 sm:min-h-8 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 inline-flex items-center justify-center cursor-pointer ${
              currentStatus === 'unpaid'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            รอชำระ {counts ? `(${counts.unpaid})` : ''}
          </button>

          <button
            type="button"
            onClick={() => handleStatusClick('paid')}
            className={`min-h-9 sm:min-h-8 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 inline-flex items-center justify-center cursor-pointer ${
              currentStatus === 'paid'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            จ่ายแล้ว {counts ? `(${counts.paid})` : ''}
          </button>

          <button
            type="button"
            onClick={() => handleStatusClick('completed')}
            className={`min-h-9 sm:min-h-8 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 inline-flex items-center justify-center cursor-pointer ${
              currentStatus === 'completed'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ผ่อนหมดแล้ว {counts ? `(${counts.completed})` : ''}
          </button>
        </div>
      </div>

      {/* 2. Secondary Filter Controls: Search, Category, Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
          {/* Search with clear button */}
          <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-xs">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="ค้นหาชื่อแผน, หมวด, หมายเหตุ..."
              value={filters.keyword}
              onChange={(e) => onFiltersChange({ ...filters, keyword: e.target.value })}
              className="h-10 sm:h-9 w-full pl-9 pr-8 py-2 text-sm sm:text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {filters.keyword && (
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, keyword: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 min-h-8 min-w-8 flex items-center justify-center text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category & Sort: 2 columns on mobile, inline on tablet/desktop */}
          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
            {/* Category Dropdown */}
            <select
              value={filters.category || 'all'}
              onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
              className="h-10 sm:h-9 w-full sm:w-auto py-1.5 sm:py-2 px-2.5 sm:px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer truncate"
            >
              <option value="all">ทุกหมวดหมู่</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_ICONS[cat] ? `${CATEGORY_ICONS[cat]} ` : ''}{cat}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <select
              value={filters.sortOrder}
              onChange={(e) => onFiltersChange({ ...filters, sortOrder: e.target.value as InstallmentSortOrder })}
              className="h-10 sm:h-9 w-full sm:w-auto py-1.5 sm:py-2 px-2.5 sm:px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer truncate"
            >
              <option value="dueDay">เรียงตามวันครบกำหนด</option>
              <option value="amountDesc">ค่างวด (มาก → น้อย)</option>
              <option value="amountAsc">ค่างวด (น้อย → มาก)</option>
              <option value="remainingDesc">ยอดหนี้เหลือ (มาก → น้อย)</option>
              <option value="progressDesc">ความคืบหน้าการผ่อน</option>
              <option value="start-asc">เริ่มเก่าสุด</option>
              <option value="start-desc">เริ่มล่าสุด</option>
              <option value="name-asc">ชื่อ A-Z</option>
            </select>
          </div>
        </div>

        {/* Right side: Count & Clear & Mobile View Mode Switcher */}
        <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-500 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-semibold tabular-nums">พบ {resultCount} แผน</span>
            {(filters.keyword || (filters.category && filters.category !== 'all') || filters.status !== 'all') && (
              <Button
                size="sm"
                onClick={() => onFiltersChange(createDefaultInstallmentFilters(filters.selectedMonth))}
              >
                {th.common.clearFilters}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
