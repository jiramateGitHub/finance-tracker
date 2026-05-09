import { Button } from '../../../components/ui/Button'
import { ComboboxField } from '../../../components/ui/ComboboxField'
import { FilterBar } from '../../../components/ui/FilterBar'
import { FormField } from '../../../components/ui/FormField'
import { MonthInput } from '../../../components/ui/MonthInput'
import { SelectField } from '../../../components/ui/SelectField'
import { TextInput } from '../../../components/ui/TextInput'
import { th } from '../../../i18n/th'
import type { MonthlyFilters, MonthlySortOrder, MonthlyStatusFilter, MonthlyTypeFilter } from '../utils/monthlyLedger'
import { createEmptyMonthlyFilters } from '../utils/monthlyLedger'

type MonthlyFiltersProps = {
  filters: MonthlyFilters
  resultCount: number
  categoryOptions: string[]
  selectedMonth: string
  onChange: (filters: MonthlyFilters) => void
  onAddIncome: () => void
  onAddExpense: () => void
}

export function MonthlyFilters({
  filters,
  resultCount,
  categoryOptions,
  selectedMonth,
  onChange,
  onAddIncome,
  onAddExpense,
}: MonthlyFiltersProps) {
  return (
    <FilterBar
      resultText={`พบ ${resultCount} รายการตามตัวกรอง`}
      actions={(
        <>
          <Button onClick={() => onChange(createEmptyMonthlyFilters(selectedMonth))}>{th.common.clearFilters}</Button>
          <Button variant="success" onClick={onAddIncome}>{th.transaction.addIncome}</Button>
          <Button variant="danger" onClick={onAddExpense}>{th.transaction.addExpense}</Button>
        </>
      )}
    >
      <FormField label="เดือนเริ่มต้น">
        <MonthInput value={filters.rangeStartMonth} onChange={(event) => onChange({ ...filters, rangeStartMonth: event.target.value })} />
      </FormField>

      <FormField label="เดือนสิ้นสุด">
        <MonthInput value={filters.rangeEndMonth} onChange={(event) => onChange({ ...filters, rangeEndMonth: event.target.value })} />
      </FormField>

      <FormField label={th.common.search}>
        <TextInput
          value={filters.keyword}
          placeholder="ยังไม่จ่าย, รายจ่าย, อาหาร เกิน 100"
          onChange={(event) => onChange({ ...filters, keyword: event.target.value })}
        />
      </FormField>

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

      <FormField label="หมวดหมู่">
        <ComboboxField
          value={filters.category}
          options={categoryOptions}
          placeholder="ทุกหมวดหมู่"
          onChange={(category) => onChange({ ...filters, category })}
        />
      </FormField>

      <FormField label="ประเภท">
        <SelectField
          value={filters.type}
          options={[
            { value: 'all', label: 'ทั้งหมด' },
            { value: 'income', label: th.transaction.income },
            { value: 'expense', label: th.transaction.expense },
            { value: 'installment', label: th.transaction.installment },
            { value: 'trip', label: th.transaction.trip },
          ]}
          onChange={(event) => onChange({ ...filters, type: event.target.value as MonthlyTypeFilter })}
        />
      </FormField>

      <FormField label="สถานะจ่าย">
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

      <FormField label="ยอดขั้นต่ำ">
        <TextInput inputMode="decimal" value={filters.minAmount} onChange={(event) => onChange({ ...filters, minAmount: event.target.value })} />
      </FormField>

      <FormField label="ยอดสูงสุด">
        <TextInput inputMode="decimal" value={filters.maxAmount} onChange={(event) => onChange({ ...filters, maxAmount: event.target.value })} />
      </FormField>
    </FilterBar>
  )
}
