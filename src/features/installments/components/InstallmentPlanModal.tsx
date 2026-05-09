import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { ComboboxField } from '../../../components/ui/ComboboxField'
import { FormField } from '../../../components/ui/FormField'
import { MonthInput } from '../../../components/ui/MonthInput'
import { SelectField } from '../../../components/ui/SelectField'
import { TextareaField } from '../../../components/ui/TextareaField'
import { TextInput } from '../../../components/ui/TextInput'
import { th } from '../../../i18n/th'
import type { InstallmentPlan } from '../../../types/finance'
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

  if (!open) return null

  function updateField<K extends keyof InstallmentFormValues>(field: K, value: InstallmentFormValues[K]): void {
    setValues((current) => ({ ...current, [field]: value }))
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
      <form className="finance-modal-panel max-w-2xl" onSubmit={handleSubmit}>
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-extrabold">{plan ? 'แก้ไขแผนผ่อน' : 'เพิ่มแผนผ่อน'}</h2>
            <p className="mt-1 text-sm text-slate-500">ติดตามยอดรวม รอบรายเดือน และความคืบหน้าการจ่าย</p>
          </div>
          <Button type="button" onClick={onClose}>{th.common.close}</Button>
        </header>

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</div>}

        <div className="finance-form-grid">
          <FormField label="ชื่อแผน" fullWidth>
            <TextInput value={values.name} placeholder="มือถือ, โน้ตบุ๊ก, ผ่อนรถ" onChange={(event) => updateField('name', event.target.value)} />
          </FormField>
          <FormField label="ยอดรวม">
            <TextInput inputMode="decimal" value={values.totalAmount} placeholder="21600" onChange={(event) => updateField('totalAmount', event.target.value)} />
          </FormField>
          <FormField label="ยอดต่อเดือน">
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
            <ComboboxField value={values.category} options={categoryOptions} placeholder="ยอดผ่อน" onChange={(category) => updateField('category', category)} />
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

        <footer className="finance-modal-footer">
          <Button type="button" onClick={onClose}>{th.common.cancel}</Button>
          <Button type="button" variant="primary" onClick={savePlan}>{plan ? th.common.saveChanges : 'เพิ่มแผน'}</Button>
        </footer>
      </form>
    </div>
  )
}
