import { useState, type FormEvent } from 'react'
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
      <form className="finance-modal-panel max-w-xl" onSubmit={handleSubmit}>
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-extrabold">{goal ? 'แก้ไขเป้าหมาย' : 'เพิ่มเป้าหมาย'}</h2>
            <p className="mt-1 text-sm text-slate-500">ติดตามความคืบหน้าของเป้าหมายการออม</p>
          </div>
          <Button type="button" onClick={onClose}>{th.common.close}</Button>
        </header>

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</div>}

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

        <footer className="finance-modal-footer">
          <Button type="button" onClick={onClose}>{th.common.cancel}</Button>
          <Button type="button" variant="primary" onClick={saveGoal}>{goal ? th.common.saveChanges : 'เพิ่มเป้าหมาย'}</Button>
        </footer>
      </form>
    </div>
  )
}
