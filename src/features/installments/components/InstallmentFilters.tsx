import { Button } from '../../../components/ui/Button'
import { CATEGORY_ICONS } from '../../../data/categories'
import { th } from '../../../i18n/th'
import type {
  InstallmentFilters as InstallmentFiltersState,
  InstallmentSortOrder,
  InstallmentStatusFilter,
  InstallmentViewMode,
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
  viewMode?: InstallmentViewMode
  onViewModeChange?: (mode: InstallmentViewMode) => void
  onFiltersChange: (filters: InstallmentFiltersState) => void
}

export function InstallmentFilters({
  filters,
  resultCount,
  categoryOptions = [],
  counts,
  viewMode = 'list',
  onViewModeChange,
  onFiltersChange,
}: InstallmentFiltersProps) {
  const currentStatus = filters.status || 'all'

  function handleStatusClick(status: InstallmentStatusFilter) {
    onFiltersChange({ ...filters, status })
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
      {/* 1. Quick Status Filter Tabs (from installment_tracker.html) */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-100">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => handleStatusClick('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
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
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
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
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
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
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
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
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              currentStatus === 'completed'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ผ่อนหมดแล้ว {counts ? `(${counts.completed})` : ''}
          </button>
        </div>

        {/* View Mode Switcher */}
        {onViewModeChange && (
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shrink-0">
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              title="มุมมองการ์ด"
              className={`p-1.5 rounded-lg font-medium transition ${
                viewMode === 'list'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="7" height="7" x="3" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="14" rx="1" />
                <rect width="7" height="7" x="3" y="14" rx="1" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              title="มุมมองตาราง"
              className={`p-1.5 rounded-lg font-medium transition ${
                viewMode === 'table'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18" />
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18" />
                <path d="M3 15h18" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange('calendar')}
              title="มุมมองปฏิทิน"
              className={`p-1.5 rounded-lg font-medium transition ${
                viewMode === 'calendar'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* 2. Secondary Filter Controls: Search, Category, Sort */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          {/* Search with clear button */}
          <div className="relative flex-1 min-w-[180px] max-w-sm">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="ค้นหาชื่อแผน, หมวด, หมายเหตุ..."
              value={filters.keyword}
              onChange={(e) => onFiltersChange({ ...filters, keyword: e.target.value })}
              className="w-full pl-9 pr-7 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {filters.keyword && (
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, keyword: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <select
            value={filters.category || 'all'}
            onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
            className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
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
            className="py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
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

        {/* Right side: Count & Clear */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold">พบ {resultCount} แผน</span>
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
    </section>
  )
}
