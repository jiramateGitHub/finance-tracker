import { Button } from '../../../components/ui/Button'
import { FilterBar } from '../../../components/ui/FilterBar'
import { FormField } from '../../../components/ui/FormField'
import { MonthInput } from '../../../components/ui/MonthInput'
import { SelectField } from '../../../components/ui/SelectField'
import { TextInput } from '../../../components/ui/TextInput'
import { th } from '../../../i18n/th'
import type { MonthlyFilters, MonthlyStatusFilter, MonthlyTypeFilter } from '../utils/monthlyLedger'

type MonthlyFiltersProps = {
  filters: MonthlyFilters
  resultCount: number
  onChange: (filters: MonthlyFilters) => void
  onAddIncome: () => void
  onAddExpense: () => void
}

export function MonthlyFilters({ filters, resultCount, onChange, onAddIncome, onAddExpense }: MonthlyFiltersProps) {
  return (
    <FilterBar
      resultText={`พบ ${resultCount} รายการตามตัวกรอง`}
      actions={(
        <>
          <Button onClick={() => onChange({ ...filters, keyword: '', type: 'all', status: 'all' })}>{th.common.clearFilters}</Button>
          <Button variant="success" onClick={onAddIncome}>{th.transaction.addIncome}</Button>
          <Button variant="danger" onClick={onAddExpense}>{th.transaction.addExpense}</Button>
        </>
      )}
    >
      <FormField label="เดือน">
        <MonthInput value={filters.month} onChange={(event) => onChange({ ...filters, month: event.target.value })} />
      </FormField>

      <FormField label={th.common.search}>
        <TextInput
          value={filters.keyword}
          placeholder="ชื่อ หมวด หมายเหตุ แหล่งที่มา"
          onChange={(event) => onChange({ ...filters, keyword: event.target.value })}
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
    </FilterBar>
  )
}
