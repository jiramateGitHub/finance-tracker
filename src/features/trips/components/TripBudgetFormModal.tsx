import { useEffect, useMemo, useState, type FormEvent } from 'react'
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

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

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
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <form className="finance-modal-panel relative z-10 max-w-xl" onSubmit={handleSubmit}>
        <div className="mx-auto -mt-1 mb-1 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">{line ? 'แก้ไขงบทริปแยกหมวด' : 'เพิ่มงบทริปแยกหมวด'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={th.common.close}
            className="grid size-8.5 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition active:scale-95"
          >
            <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>

        {error ? <div className="finance-error">{error}</div> : null}

        <div className="finance-modal-body">
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3.5 py-2 text-xs font-semibold text-blue-700">
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
              <TextareaField value={values.note} placeholder="หมายเหตุแผนงบประมาณ (ไม่บังคับ)" onChange={(event) => updateField('note', event.target.value)} />
            </FormField>
          </div>
        </div>

        <footer className="finance-modal-footer">
          <Button type="button" onClick={onClose}>{th.common.cancel}</Button>
          <Button type="submit" variant="primary">{line ? th.common.saveChanges : 'เพิ่มหมวดงบ'}</Button>
        </footer>
      </form>
    </div>
  )
}
