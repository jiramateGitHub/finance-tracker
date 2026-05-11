import { Button } from '../../../components/ui/Button'
import { FilterBar } from '../../../components/ui/FilterBar'
import { FormField } from '../../../components/ui/FormField'
import { MonthInput } from '../../../components/ui/MonthInput'
import { SelectField } from '../../../components/ui/SelectField'
import { TextInput } from '../../../components/ui/TextInput'
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
  return (
    <FilterBar
      resultText={`พบ ${resultCount} ทริปตามตัวกรอง`}
      actions={(
        <>
          <Button type="button" onClick={() => onChange(createEmptyTripFilters())}>{th.common.clearFilters}</Button>
          <Button type="button" disabled={!canAddItem} onClick={onAddItem}>เพิ่มรายการทริป</Button>
        </>
      )}
    >
      <FormField label="ค้นหา">
        <TextInput
          placeholder="ทริป จุดหมาย รายการ หมวด หมายเหตุ"
          value={filters.keyword}
          onChange={(event) => onChange({ ...filters, keyword: event.target.value })}
        />
      </FormField>

      <FormField label="เดือนเริ่ม">
        <MonthInput
          value={filters.rangeStartMonth}
          onChange={(event) => onChange({ ...filters, rangeStartMonth: event.target.value })}
        />
      </FormField>

      <FormField label="เดือนจบ">
        <MonthInput
          value={filters.rangeEndMonth}
          onChange={(event) => onChange({ ...filters, rangeEndMonth: event.target.value })}
        />
      </FormField>

      <FormField label="สถานะ">
        <SelectField
          value={filters.status}
          options={[
            { value: 'all', label: 'ทั้งหมด' },
            { value: 'upcoming', label: tripStatusLabel.upcoming },
            { value: 'ongoing', label: tripStatusLabel.ongoing },
            { value: 'completed', label: tripStatusLabel.completed },
          ]}
          onChange={(event) => onChange({ ...filters, status: event.target.value as TripStatusFilter })}
        />
      </FormField>

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
    </FilterBar>
  )
}
