import { Button } from '../../../components/ui/Button'
import { FormField } from '../../../components/ui/FormField'
import { SelectField } from '../../../components/ui/SelectField'
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
      {/* 1. Quick Status Filter Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-100">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => handleStatusClick('all')}
            className={`min-h-10 sm:min-h-8 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 inline-flex items-center justify-center cursor-pointer ${
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
            className={`min-h-10 sm:min-h-8 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 inline-flex items-center justify-center cursor-pointer ${
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
            className={`min-h-10 sm:min-h-8 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 inline-flex items-center justify-center cursor-pointer ${
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
            className={`min-h-10 sm:min-h-8 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 inline-flex items-center justify-center cursor-pointer ${
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
            className={`min-h-10 sm:min-h-8 px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 inline-flex items-center justify-center cursor-pointer ${
              currentStatus === 'completed'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ผ่อนหมดแล้ว {counts ? `(${counts.completed})` : ''}
          </button>
        </div>
      </div>

      {/* 2. Core Filter Controls: Search, Category, Sort */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {/* Search */}
        <div className="sm:col-span-2">
          <FormField label="ค้นหา">
            <div className="relative">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="ค้นหาชื่อแผน, หมวด, หมายเหตุ..."
                value={filters.keyword}
                onChange={(e) => onFiltersChange({ ...filters, keyword: e.target.value })}
                className="finance-control pl-9 pr-10"
              />
              {filters.keyword && (
                <button
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, keyword: '' })}
                  className="absolute right-1 top-1/2 -translate-y-1/2 min-h-9 min-w-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </FormField>
        </div>

        {/* Category Dropdown */}
        <div>
          <FormField label="หมวดหมู่">
            <SelectField
              value={filters.category || 'all'}
              options={[
                { value: 'all', label: 'ทุกหมวดหมู่' },
                ...categoryOptions.map((cat) => ({
                  value: cat,
                  label: CATEGORY_ICONS[cat] ? `${CATEGORY_ICONS[cat]} ${cat}` : cat,
                })),
              ]}
              onChange={(event) => onFiltersChange({ ...filters, category: event.target.value })}
            />
          </FormField>
        </div>

        {/* Sort Dropdown */}
        <div>
          <FormField label="เรียงตาม">
            <SelectField
              value={filters.sortOrder}
              options={[
                { value: 'dueDay', label: 'วันครบกำหนด' },
                { value: 'amountDesc', label: 'ค่างวด (มาก → น้อย)' },
                { value: 'amountAsc', label: 'ค่างวด (น้อย → มาก)' },
                { value: 'remainingDesc', label: 'ยอดหนี้เหลือ (มาก → น้อย)' },
                { value: 'progressDesc', label: 'ความคืบหน้าการผ่อน' },
                { value: 'start-asc', label: 'เริ่มเก่าสุด' },
                { value: 'start-desc', label: 'เริ่มล่าสุด' },
                { value: 'name-asc', label: 'ชื่อ A-Z' },
              ]}
              onChange={(event) => onFiltersChange({ ...filters, sortOrder: event.target.value as InstallmentSortOrder })}
            />
          </FormField>
        </div>
      </div>

      {/* 3. Result Count Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <span className="font-semibold text-slate-700">พบ {resultCount} แผน</span>
        <div className="flex items-center gap-2">
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
