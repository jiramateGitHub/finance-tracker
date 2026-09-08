import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../components/ui/Button'
import { DateInput } from '../../components/ui/DateInput'
import { FormField } from '../../components/ui/FormField'
import { SelectField } from '../../components/ui/SelectField'
import { TextareaField } from '../../components/ui/TextareaField'
import { TextInput } from '../../components/ui/TextInput'
import { th } from '../../i18n/th'
import type { Goal } from '../../types/finance'
import {
  buildGoalFromForm,
  createGoalFormValues,
  validateGoalForm,
  type GoalFormValues,
} from './budgetGoalCalculations'

type GoalFormModalProps = {
  open: boolean
  goal?: Goal | null
  onClose: () => void
  onSubmit: (goal: Goal) => void
}

export function GoalFormModal({ open, goal, onClose, onSubmit }: GoalFormModalProps) {
  const [values, setValues] = useState<GoalFormValues>(() => createGoalFormValues(goal ?? undefined))
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

  function updateField<K extends keyof GoalFormValues>(field: K, value: GoalFormValues[K]): void {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function saveGoal(): void {
    const validationError = validateGoalForm(values)
    if (validationError) {
      setError(validationError)
      return
    }
    onSubmit(buildGoalFromForm(values, goal ?? undefined))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    saveGoal()
  }

  return (
    <div className="finance-modal-backdrop">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <form className="finance-modal-panel relative z-10 max-w-xl" onSubmit={handleSubmit}>
        <div className="mx-auto -mt-1 mb-1 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">{goal ? 'แก้ไขเป้าหมาย' : 'เพิ่มเป้าหมาย'}</h2>
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

        {error && <div className="finance-error">{error}</div>}

        <div className="finance-modal-body">
          <div className="finance-form-grid">
            <FormField label="ชื่อเป้าหมาย" fullWidth>
              <TextInput value={values.name} placeholder="เงินสำรอง, ทริปหน้า, โน้ตบุ๊ก" onChange={(event) => updateField('name', event.target.value)} />
            </FormField>

            <FormField label="ยอดเป้าหมาย">
              <TextInput inputMode="decimal" min="0" type="text" value={values.targetAmount} onChange={(event) => updateField('targetAmount', event.target.value)} />
            </FormField>

            <FormField label="ยอดปัจจุบัน">
              <TextInput inputMode="decimal" min="0" type="text" value={values.currentAmount} onChange={(event) => updateField('currentAmount', event.target.value)} />
            </FormField>

            <FormField label="วันที่เป้าหมาย">
              <DateInput value={values.targetDate} onChange={(event) => updateField('targetDate', event.target.value)} />
            </FormField>

            <FormField label="สถานะ">
              <SelectField
                value={values.status}
                options={[
                  { value: 'active', label: th.goal.active },
                  { value: 'paused', label: th.goal.paused },
                  { value: 'completed', label: th.goal.completed },
                ]}
                onChange={(event) => updateField('status', event.target.value as GoalFormValues['status'])}
              />
            </FormField>

            <FormField label="หมายเหตุ" fullWidth>
              <TextareaField value={values.note} placeholder="หมายเหตุเป้าหมาย" onChange={(event) => updateField('note', event.target.value)} />
            </FormField>
          </div>
        </div>

        <footer className="finance-modal-footer">
          <Button type="button" onClick={onClose}>{th.common.cancel}</Button>
          <Button type="submit" variant="primary">{goal ? th.common.saveChanges : 'เพิ่มเป้าหมาย'}</Button>
        </footer>
      </form>
    </div>
  )
}
