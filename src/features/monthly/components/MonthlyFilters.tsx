import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { ComboboxField } from '../../../components/ui/ComboboxField'
import { FormField } from '../../../components/ui/FormField'
import { MonthInput } from '../../../components/ui/MonthInput'
import { SelectField } from '../../../components/ui/SelectField'
import { TextInput } from '../../../components/ui/TextInput'
import { th } from '../../../i18n/th'
import type { MonthlyFilters as MonthlyFiltersType, MonthlySortOrder, MonthlyStatusFilter, MonthlyTypeFilter } from '../utils/monthlyLedger'
import { createEmptyMonthlyFilters } from '../utils/monthlyLedger'

type MonthlyFiltersProps = {
  filters: MonthlyFiltersType
  resultCount: number
  categoryOptions: string[]
  selectedMonth: string
  onChange: (filters: MonthlyFiltersType) => void
}

export function MonthlyFilters({
  filters,
  resultCount,
  categoryOptions,
  selectedMonth,
  onChange,
}: MonthlyFiltersProps) {
  const hasExtendedFilters = Boolean(
    filters.category || filters.status !== 'all' || filters.minAmount || filters.maxAmount,
  )
  const [showExtended, setShowExtended] = useState(hasExtendedFilters)

  const currentType = filters.type || 'all'

  function handleTypeClick(type: MonthlyTypeFilter) {
    onChange({ ...filters, type })
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-xs space-y-3">
      {/* 1. Quick Type Filter Tabs */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1 border-b border-slate-100">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => handleTypeClick('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              currentType === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            ทั้งหมด
          </button>

          <button
            type="button"
            onClick={() => handleTypeClick('expense')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              currentType === 'expense'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {th.transaction.expense}
          </button>

          <button
            type="button"
            onClick={() => handleTypeClick('income')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              currentType === 'income'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {th.transaction.income}
          </button>

          <button
            type="button"
            onClick={() => handleTypeClick('installment')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              currentType === 'installment'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {th.transaction.installment}
          </button>

          <button
            type="button"
            onClick={() => handleTypeClick('trip')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              currentType === 'trip'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {th.transaction.trip}
          </button>
        </div>

        {/* Right side: Extended toggle & clear button */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => setShowExtended((prev) => !prev)}
            className={showExtended ? 'border-blue-300 bg-blue-50 text-blue-700' : ''}
          >
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span>{showExtended ? 'ย่อตัวกรอง' : 'ตัวกรองเพิ่มเติม'}</span>
              {hasExtendedFilters && !showExtended ? <span className="w-1.5 h-1.5 rounded-full bg-blue-600" /> : null}
            </span>
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onChange(createEmptyMonthlyFilters(selectedMonth))}
          >
            {th.common.clearFilters}
          </Button>
        </div>
      </div>

      {/* 2. Core Filter Controls: Search, Sort, Month Range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {/* Search */}
        <div className="sm:col-span-2 relative">
          <label className="text-xs font-semibold text-slate-500 mb-1 block">
            {th.common.search}
          </label>
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="ค้นหารายการ, หมวดหมู่, หมายเหตุ, ยังไม่จ่าย..."
              value={filters.keyword}
              onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
              className="w-full pl-9 pr-7 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {filters.keyword && (
              <button
                type="button"
                onClick={() => onChange({ ...filters, keyword: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Sort */}
        <div>
          <FormField label="เรียงตาม">
            <SelectField
              value={filters.sortOrder}
              options={[
                { value: 'date-desc', label: 'วันที่ล่าสุด' },
                { value: 'date-asc', label: 'วันที่เก่าสุด' },
                { value: 'amount-desc', label: 'ยอดสูงสุด' },
                { value: 'amount-asc', label: 'ยอดต่ำสุด' },
                { value: 'title-asc', label: 'ชื่อรายการ' },
              ]}
              onChange={(event) => onChange({ ...filters, sortOrder: event.target.value as MonthlySortOrder })}
            />
          </FormField>
        </div>

        {/* Status */}
        <div>
          <FormField label="สถานะการชำระ">
            <SelectField
              value={filters.status}
              options={[
                { value: 'all', label: 'ทั้งหมด' },
                { value: 'paid', label: th.transaction.paid },
                { value: 'unpaid', label: th.transaction.unpaid },
              ]}
              onChange={(event) => onChange({ ...filters, status: event.target.value as MonthlyStatusFilter })}
            />
          </FormField>
        </div>
      </div>

      {/* 3. Extended Filter Controls */}
      {showExtended && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <FormField label="เดือนเริ่มต้น">
            <MonthInput value={filters.rangeStartMonth} onChange={(event) => onChange({ ...filters, rangeStartMonth: event.target.value })} />
          </FormField>

          <FormField label="เดือนสิ้นสุด">
            <MonthInput value={filters.rangeEndMonth} onChange={(event) => onChange({ ...filters, rangeEndMonth: event.target.value })} />
          </FormField>

          <FormField label="หมวดหมู่">
            <ComboboxField
              value={filters.category}
              options={categoryOptions}
              placeholder="ทุกหมวดหมู่"
              onChange={(category) => onChange({ ...filters, category })}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-2">
            <FormField label="ยอดขั้นต่ำ">
              <TextInput inputMode="decimal" placeholder="0" value={filters.minAmount} onChange={(event) => onChange({ ...filters, minAmount: event.target.value })} />
            </FormField>

            <FormField label="ยอดสูงสุด">
              <TextInput inputMode="decimal" placeholder="ไม่จำกัด" value={filters.maxAmount} onChange={(event) => onChange({ ...filters, maxAmount: event.target.value })} />
            </FormField>
          </div>
        </div>
      )}

      {/* 4. Bottom Info Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <span className="font-semibold text-slate-700">พบ {resultCount} รายการ</span>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          คลิกที่รายการเพื่อดูรายละเอียดหรือแก้ไข
        </span>
      </div>
    </section>
  )
}
