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
} from '../utils/installmentPlans'
import { createDefaultInstallmentFilters } from '../utils/installmentPlans'

type InstallmentFiltersProps = {
  filters: InstallmentFiltersState
  resultCount: number
  onFiltersChange: (filters: InstallmentFiltersState) => void
}

export function InstallmentFilters({
  filters,
  resultCount,
  onFiltersChange,
}: InstallmentFiltersProps) {
  return (
    <FilterBar
      resultText={`พบ ${resultCount} แผนตามตัวกรอง`}
      actions={(
        <Button onClick={() => onFiltersChange(createDefaultInstallmentFilters())}>{th.common.clearFilters}</Button>
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

    </FilterBar>
  )
}
