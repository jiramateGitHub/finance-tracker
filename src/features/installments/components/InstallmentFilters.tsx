import { Button } from '../../../components/ui/Button'
import { FilterBar } from '../../../components/ui/FilterBar'
import { FormField } from '../../../components/ui/FormField'
import { MonthInput } from '../../../components/ui/MonthInput'
import { SelectField } from '../../../components/ui/SelectField'
import { TextInput } from '../../../components/ui/TextInput'
import { th } from '../../../i18n/th'
import type {
  InstallmentFilters as InstallmentFiltersState,
  InstallmentSortOrder,
  InstallmentStatusFilter,
  InstallmentViewMode,
} from '../utils/installmentPlans'
import { createDefaultInstallmentFilters } from '../utils/installmentPlans'

type InstallmentFiltersProps = {
  filters: InstallmentFiltersState
  viewMode: InstallmentViewMode
  resultCount: number
  onFiltersChange: (filters: InstallmentFiltersState) => void
  onViewModeChange: (viewMode: InstallmentViewMode) => void
  onAddPlan: () => void
}

export function InstallmentFilters({
  filters,
  viewMode,
  resultCount,
  onFiltersChange,
  onViewModeChange,
  onAddPlan,
}: InstallmentFiltersProps) {
  return (
    <FilterBar
      resultText={`พบ ${resultCount} แผนตามตัวกรอง`}
      actions={(
        <>
          <Button onClick={() => onFiltersChange(createDefaultInstallmentFilters())}>{th.common.clearFilters}</Button>
          <Button variant="primary" onClick={onAddPlan}>เพิ่มแผนผ่อน</Button>
        </>
      )}
    >
      <FormField label="ค้นหา">
        <TextInput
          placeholder="ชื่อแผน หมวด หมายเหตุ"
          value={filters.keyword}
          onChange={(event) => onFiltersChange({ ...filters, keyword: event.target.value })}
        />
      </FormField>

      <FormField label="สถานะ">
        <SelectField
          value={filters.status}
          options={[
            { value: 'all', label: 'ทั้งหมด' },
            { value: 'active', label: 'กำลังผ่อน' },
            { value: 'paid', label: 'จ่ายครบแล้ว' },
          ]}
          onChange={(event) => onFiltersChange({ ...filters, status: event.target.value as InstallmentStatusFilter })}
        />
      </FormField>

      <FormField label="เดือนเริ่ม">
        <MonthInput value={filters.startMonth} onChange={(event) => onFiltersChange({ ...filters, startMonth: event.target.value })} />
      </FormField>

      <FormField label="เดือนจบ">
        <MonthInput value={filters.endMonth} onChange={(event) => onFiltersChange({ ...filters, endMonth: event.target.value })} />
      </FormField>

      <FormField label="เรียงตาม">
        <SelectField
          value={filters.sortOrder}
          options={[
            { value: 'start-asc', label: 'เริ่มเก่าสุด' },
            { value: 'start-desc', label: 'เริ่มล่าสุด' },
            { value: 'name-asc', label: 'ชื่อ A-Z' },
            { value: 'remaining-desc', label: 'คงเหลือมาก' },
            { value: 'remaining-asc', label: 'คงเหลือน้อย' },
            { value: 'monthly-desc', label: 'ยอดต่อเดือนมาก' },
            { value: 'status-active', label: 'กำลังผ่อนก่อน' },
          ]}
          onChange={(event) => onFiltersChange({ ...filters, sortOrder: event.target.value as InstallmentSortOrder })}
        />
      </FormField>

      <FormField label="มุมมอง">
        <div className="flex min-w-0 rounded-xl border border-slate-300 bg-white p-1">
          <button
            className={`min-h-9 min-w-0 flex-1 rounded-lg px-3 text-sm font-extrabold ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
            type="button"
            onClick={() => onViewModeChange('list')}
          >
            รายการ
          </button>
          <button
            className={`min-h-9 min-w-0 flex-1 rounded-lg px-3 text-sm font-extrabold ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
            type="button"
            onClick={() => onViewModeChange('calendar')}
          >
            ปฏิทิน
          </button>
        </div>
      </FormField>
    </FilterBar>
  )
}
