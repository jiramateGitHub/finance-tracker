import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { ComboboxField } from '../../../components/ui/ComboboxField'
import { FormField } from '../../../components/ui/FormField'
import { MonthInput } from '../../../components/ui/MonthInput'
import { SelectField } from '../../../components/ui/SelectField'
import { TextareaField } from '../../../components/ui/TextareaField'
import { TextInput } from '../../../components/ui/TextInput'
import { th } from '../../../i18n/th'
import type { InstallmentPlan } from '../../../types/finance'
import { parseAmountSafe } from '../../../utils/formatters'
import {
  buildInstallmentPlanFromForm,
  createInstallmentFormValues,
  type InstallmentFormValues,
  validateInstallmentForm,
} from '../utils/installmentPlans'

type InstallmentPlanModalProps = {
  open: boolean
  plan?: InstallmentPlan | null
  categoryOptions: string[]
  onClose: () => void
  onSubmit: (plan: InstallmentPlan) => void
}

export function InstallmentPlanModal({ open, plan, categoryOptions, onClose, onSubmit }: InstallmentPlanModalProps) {
  const [values, setValues] = useState<InstallmentFormValues>(() => createInstallmentFormValues(plan ?? undefined))
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

  function updateField<K extends keyof InstallmentFormValues>(field: K, value: InstallmentFormValues[K]): void {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleAutoCalculateMonthly(): void {
    const total = parseAmountSafe(values.totalAmount)
    const months = parseInt(values.monthsTotal, 10)
    if (total > 0 && months > 0) {
      const calculated = Math.round((total / months) * 100) / 100
      updateField('monthlyAmount', String(calculated))
    }
  }

  function savePlan(): void {
    const validationError = validateInstallmentForm(values)
    if (validationError) {
      setError(validationError)
      return
    }
    onSubmit(buildInstallmentPlanFromForm(values, plan ?? undefined))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    savePlan()
  }

  return (
    <div className="finance-modal-backdrop">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <form className="finance-modal-panel relative z-10 max-w-2xl" onSubmit={handleSubmit}>
        <div className="mx-auto -mt-1 mb-1 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">{plan ? 'แก้ไขแผนผ่อน' : 'เพิ่มแผนผ่อน'}</h2>
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
          <FormField label="ชื่อแผน" fullWidth>
            <TextInput value={values.name} placeholder="มือถือ, โน้ตบุ๊ก, ผ่อนรถ" onChange={(event) => updateField('name', event.target.value)} />
          </FormField>
          <FormField label="ยอดรวม">
            <TextInput inputMode="decimal" value={values.totalAmount} placeholder="21600" onChange={(event) => updateField('totalAmount', event.target.value)} />
          </FormField>
          <FormField
            label={
              <span className="flex items-center justify-between">
                <span>ยอดต่อเดือน</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleAutoCalculateMonthly()
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                >
                  คำนวณอัตโนมัติ
                </button>
              </span>
            }
          >
            <TextInput inputMode="decimal" value={values.monthlyAmount} placeholder="1800" onChange={(event) => updateField('monthlyAmount', event.target.value)} />
          </FormField>
          <FormField label="เงินต้น">
            <TextInput inputMode="decimal" value={values.principal} placeholder="เงินต้นเริ่มต้น ถ้ามี" onChange={(event) => updateField('principal', event.target.value)} />
          </FormField>
          <FormField label="ยอดคงเหลือกำหนดเอง">
            <TextInput inputMode="decimal" value={values.remainingOverride} placeholder="ยอดคงเหลือปัจจุบัน ถ้ามี" onChange={(event) => updateField('remainingOverride', event.target.value)} />
          </FormField>
          <FormField label="เดือนเริ่ม">
            <MonthInput value={values.startMonth} onChange={(event) => updateField('startMonth', event.target.value)} />
          </FormField>
          <FormField label="วันที่ครบกำหนด">
            <TextInput inputMode="numeric" value={values.dueDay} placeholder="1-31" onChange={(event) => updateField('dueDay', event.target.value)} />
          </FormField>
          <FormField label="จำนวนเดือน">
            <TextInput inputMode="numeric" value={values.monthsTotal} onChange={(event) => updateField('monthsTotal', event.target.value)} />
          </FormField>
          <FormField label="เดือนที่จ่ายแล้ว">
            <TextInput inputMode="numeric" value={values.paidMonths} onChange={(event) => updateField('paidMonths', event.target.value)} />
          </FormField>
          <FormField label="หมวดหมู่">
            <ComboboxField value={values.category} options={categoryOptions} placeholder="ผ่อนสินค้า" onChange={(category) => updateField('category', category)} />
          </FormField>
          <FormField label="ประเภทดอกเบี้ย">
            <SelectField
              value={values.interestType}
              options={[
                { value: 'none', label: 'ไม่มี' },
                { value: 'reducing', label: 'ลดต้นลดดอก' },
                { value: 'flat', label: 'คงที่' },
              ]}
              onChange={(event) => updateField('interestType', event.target.value as InstallmentFormValues['interestType'])}
            />
          </FormField>
          <FormField label="ดอกเบี้ย (% ต่อปี)">
            <TextInput inputMode="decimal" value={values.interestRate} placeholder="12" onChange={(event) => updateField('interestRate', event.target.value)} />
          </FormField>
          <FormField label="หมายเหตุดอกเบี้ย" fullWidth>
            <TextInput value={values.interestNote} placeholder="โปร 0%, ดอกเบี้ยธนาคาร, รายละเอียดโปรโมชัน" onChange={(event) => updateField('interestNote', event.target.value)} />
          </FormField>
          <FormField label="หมายเหตุ" fullWidth>
            <TextareaField value={values.note} placeholder="รายละเอียดเพิ่มเติม" onChange={(event) => updateField('note', event.target.value)} />
          </FormField>
          </div>
        </div>

        <footer className="finance-modal-footer">
          <Button type="button" onClick={onClose}>{th.common.cancel}</Button>
          <Button type="submit" variant="primary">{plan ? th.common.saveChanges : 'เพิ่มแผน'}</Button>
        </footer>
      </form>
    </div>
  )
}

