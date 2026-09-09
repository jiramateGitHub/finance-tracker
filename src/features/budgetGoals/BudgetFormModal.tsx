import { useEffect, useState, type FormEvent } from 'react'
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

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

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
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <form className="finance-modal-panel relative z-10 max-w-xl" onSubmit={handleSubmit}>
        <div className="mx-auto -mt-1 mb-1 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">{budget ? 'แก้ไขงบประมาณรายเดือน' : 'เพิ่มงบประมาณรายเดือน'}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={th.common.close}
            className="grid min-h-10 min-w-10 sm:min-h-9 sm:min-w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition active:scale-95 cursor-pointer"
          >
            <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>

        {error && <div className="finance-error">{error}</div>}

        <div className="finance-modal-body">
          <div className="finance-form-grid">
            <FormField label="เดือน">
              <MonthInput value={values.month} onChange={(event) => updateField('month', event.target.value)} />
            </FormField>

            <FormField label="หมวดหมู่">
              <ComboboxField
                value={values.category}
                options={categoryOptions}
                placeholder="ของกิน, ท่องเที่ยว, บ้าน/เช่า"
                onChange={(category) => updateField('category', category)}
              />
            </FormField>

            <FormField label="จำนวนเงิน">
              <TextInput inputMode="decimal" type="text" placeholder="0.00" value={values.amount} onChange={(event) => updateField('amount', event.target.value)} />
            </FormField>

            <div className="flex min-w-0 items-center gap-2.5 self-end rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5">
              <input
                id="budget-enabled"
                className="size-4 rounded text-blue-600 focus:ring-blue-500"
                type="checkbox"
                checked={values.enabled}
                onChange={(event) => updateField('enabled', event.target.checked)}
              />
              <label htmlFor="budget-enabled" className="text-sm font-semibold text-slate-700 cursor-pointer">
                เปิดใช้งาน
              </label>
            </div>

            <FormField label="หมายเหตุ" fullWidth>
              <TextareaField value={values.note} placeholder="หมายเหตุงบประมาณ (ไม่บังคับ)" onChange={(event) => updateField('note', event.target.value)} />
            </FormField>
          </div>
        </div>

        <footer className="finance-modal-footer">
          <Button type="button" onClick={onClose}>{th.common.cancel}</Button>
          <Button type="submit" variant="primary">{budget ? th.common.saveChanges : 'เพิ่มงบประมาณ'}</Button>
        </footer>
      </form>
    </div>
  )
}

