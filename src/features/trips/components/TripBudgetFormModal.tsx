import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { ComboboxField } from '../../../components/ui/ComboboxField'
import { FormField } from '../../../components/ui/FormField'
import { TextareaField } from '../../../components/ui/TextareaField'
import { TextInput } from '../../../components/ui/TextInput'
import { th } from '../../../i18n/th'
import type { BudgetLine, Trip } from '../../../types/finance'
import {
  buildTripBudgetLineFromForm,
  createTripBudgetLineFormValues,
  type TripBudgetLineFormValues,
  validateTripBudgetLineForm,
} from '../utils/tripUtils'

type TripBudgetFormModalProps = {
  open: boolean
  trip: Trip
  line?: BudgetLine | null
  categoryOptions: string[]
  onClose: () => void
  onSubmit: (categoryId: string, amount: number, note?: string) => void
}

export function TripBudgetFormModal({ open, trip, line, categoryOptions, onClose, onSubmit }: TripBudgetFormModalProps) {
  const [values, setValues] = useState<TripBudgetLineFormValues>(() => createTripBudgetLineFormValues(line ?? undefined))
  const [error, setError] = useState<string | null>(null)
  const categoryOptionsWithDefault = useMemo(() => Array.from(new Set(['ท่องเที่ยว', 'ที่พัก', 'ของกิน', 'เดินทาง', ...categoryOptions])), [categoryOptions])

  if (!open) return null

  function updateField<K extends keyof TripBudgetLineFormValues>(field: K, value: TripBudgetLineFormValues[K]): void {
    setValues((current) => ({ ...current, [field]: value }))
    if (error) setError(null)
  }

  function saveLine(): void {
    const validationError = validateTripBudgetLineForm(values)
    if (validationError) {
      setError(validationError)
      return
    }
    const lineValue = buildTripBudgetLineFromForm(values)
    onSubmit(lineValue.categoryId, lineValue.amount, lineValue.note)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    saveLine()
  }

  return (
    <div className="finance-modal-backdrop">
      <form className="finance-modal-panel max-w-xl" onSubmit={handleSubmit}>
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-finance-text">{line ? 'แก้ไขงบทริปแยกหมวด' : 'เพิ่มงบทริปแยกหมวด'}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">กำหนดงบรายหมวดเพื่อเทียบกับรายการจริงของทริป</p>
          </div>
          <Button type="button" onClick={onClose}>{th.common.close}</Button>
        </header>

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</div> : null}

        <div className="finance-modal-body">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800">
            ทริป: {trip.name}{trip.destination ? ` · ${trip.destination}` : ''}
          </div>

          <div className="finance-form-grid">
            <FormField label="หมวดหมู่">
              <ComboboxField
                value={values.categoryId}
                options={categoryOptionsWithDefault}
                placeholder="ที่พัก, ของกิน, เดินทาง"
                onChange={(category) => updateField('categoryId', category)}
              />
            </FormField>
            <FormField label="จำนวนเงิน">
              <TextInput inputMode="decimal" value={values.amount} placeholder="เช่น 12000" onChange={(event) => updateField('amount', event.target.value)} />
            </FormField>
            <FormField label="หมายเหตุ" fullWidth>
              <TextareaField value={values.note} placeholder="หมายเหตุแผนงบประมาณ" onChange={(event) => updateField('note', event.target.value)} />
            </FormField>
          </div>
        </div>

        <footer className="finance-modal-footer">
          <Button type="button" onClick={onClose}>{th.common.cancel}</Button>
          <Button type="button" variant="primary" onClick={saveLine}>{line ? th.common.saveChanges : 'เพิ่มหมวดงบ'}</Button>
        </footer>
      </form>
    </div>
  )
}
