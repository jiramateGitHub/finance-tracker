import { Button } from '../../../components/ui/Button'
import { ComboboxField } from '../../../components/ui/ComboboxField'
import { FilterBar } from '../../../components/ui/FilterBar'
import { FormField } from '../../../components/ui/FormField'
import { MonthInput } from '../../../components/ui/MonthInput'
import { SelectField } from '../../../components/ui/SelectField'
import { TextInput } from '../../../components/ui/TextInput'
import { th } from '../../../i18n/th'
import { tripStatusLabel, type TripFilters as TripFiltersState, type TripStatusFilter } from '../utils/tripUtils'

type TripFiltersProps = {
  filters: TripFiltersState
  resultCount: number
  categoryOptions: string[]
  onChange: (filters: TripFiltersState) => void
  onAddItem: () => void
  canAddItem: boolean
}

export function TripFilters({ filters, resultCount, categoryOptions, onChange, onAddItem, canAddItem }: TripFiltersProps) {
  return (
    <FilterBar
      resultText={`พบ ${resultCount} ทริปตามตัวกรอง`}
      actions={(
        <>
          <Button type="button" onClick={() => onChange({ keyword: '', year: '', month: '', category: '', status: 'all' })}>{th.common.clearFilters}</Button>
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

      <FormField label="ปี">
        <TextInput
          inputMode="numeric"
          maxLength={4}
          placeholder="2026"
          value={filters.year}
          onChange={(event) => onChange({ ...filters, year: event.target.value })}
        />
      </FormField>

      <FormField label="เดือน">
        <MonthInput value={filters.month} onChange={(event) => onChange({ ...filters, month: event.target.value })} />
      </FormField>

      <FormField label="หมวดหมู่">
        <ComboboxField
          value={filters.category}
          options={categoryOptions}
          placeholder="ทั้งหมด"
          onChange={(category) => onChange({ ...filters, category })}
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
    </FilterBar>
  )
}
