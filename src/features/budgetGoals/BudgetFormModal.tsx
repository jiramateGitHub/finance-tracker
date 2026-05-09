import { useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { ComboboxField } from '../../components/ui/ComboboxField'
import { FormField } from '../../components/ui/FormField'
import { MonthInput } from '../../components/ui/MonthInput'
import { TextareaField } from '../../components/ui/TextareaField'
import { TextInput } from '../../components/ui/TextInput'
import { th } from '../../i18n/th'
import type { Budget } from '../../types/finance'
import {
  buildBudgetFromForm,
  createBudgetFormValues,
  validateBudgetForm,
  type BudgetFormValues,
} from './budgetGoalCalculations'

type BudgetFormModalProps = {
  open: boolean
  budget?: Budget | null
  selectedMonth: string
  budgets: Budget[]
  categoryOptions: string[]
  onClose: () => void
  onSubmit: (budget: Budget) => void
}

export function BudgetFormModal({
  open,
  budget,
  selectedMonth,
  budgets,
  categoryOptions,
  onClose,
  onSubmit,
}: BudgetFormModalProps) {
  const [values, setValues] = useState<BudgetFormValues>(() => createBudgetFormValues(budget ?? undefined, selectedMonth))
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  function updateField<K extends keyof BudgetFormValues>(field: K, value: BudgetFormValues[K]): void {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function saveBudget(): void {
    const validationError = validateBudgetForm(values, budgets, budget?.id)
    if (validationError) {
      setError(validationError)
      return
    }
    onSubmit(buildBudgetFromForm(values, budget ?? undefined))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    saveBudget()
  }

  return (
    <div className="finance-modal-backdrop">
      <form className="finance-modal-panel max-w-xl" onSubmit={handleSubmit}>
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-extrabold">{budget ? 'แก้ไขงบประมาณรายเดือน' : 'เพิ่มงบประมาณรายเดือน'}</h2>
            <p className="mt-1 text-sm text-slate-500">งบประมาณใช้กับหนึ่งเดือนและหนึ่งหมวดหมู่</p>
          </div>
          <Button type="button" onClick={onClose}>{th.common.close}</Button>
        </header>

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</div>}

        <div className="finance-form-grid">
          <FormField label="เดือน">
            <MonthInput value={values.month} onChange={(event) => updateField('month', event.target.value)} />
          </FormField>

          <FormField label="หมวดหมู่">
            <ComboboxField
              value={values.category}
              options={categoryOptions}
              placeholder="อาหาร, ท่องเที่ยว, บ้าน"
              onChange={(category) => updateField('category', category)}
            />
          </FormField>

          <FormField label="จำนวนเงิน">
            <TextInput inputMode="decimal" min="0" type="text" value={values.amount} onChange={(event) => updateField('amount', event.target.value)} />
          </FormField>

          <label className="flex min-h-11 min-w-0 items-center gap-2 self-end rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600">
            <input className="size-4" type="checkbox" checked={values.enabled} onChange={(event) => updateField('enabled', event.target.checked)} />
            เปิดใช้งาน
          </label>

          <FormField label="หมายเหตุ" fullWidth>
            <TextareaField value={values.note} placeholder="หมายเหตุงบประมาณ" onChange={(event) => updateField('note', event.target.value)} />
          </FormField>
        </div>

        <footer className="finance-modal-footer">
          <Button type="button" onClick={onClose}>{th.common.cancel}</Button>
          <Button type="button" variant="primary" onClick={saveBudget}>{budget ? th.common.saveChanges : 'เพิ่มงบประมาณ'}</Button>
        </footer>
      </form>
    </div>
  )
}
