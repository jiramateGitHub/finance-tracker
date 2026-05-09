import { useMemo, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { ComboboxField } from '../../../components/ui/ComboboxField'
import { DateInput } from '../../../components/ui/DateInput'
import { FormField } from '../../../components/ui/FormField'
import { SelectField } from '../../../components/ui/SelectField'
import { TextareaField } from '../../../components/ui/TextareaField'
import { TextInput } from '../../../components/ui/TextInput'
import { th } from '../../../i18n/th'
import type { InstallmentPlan, Trip, TripItem } from '../../../types/finance'
import {
  buildTripItemFromForm,
  createTripItemFormValues,
  type TripItemFormValues,
  validateTripItemForm,
} from '../utils/tripUtils'

type TripItemModalProps = {
  open: boolean
  trip: Trip
  item?: TripItem | null
  categoryOptions: string[]
  installmentPlans: InstallmentPlan[]
  onClose: () => void
  onSubmit: (item: TripItem) => void
}

export function TripItemModal({ open, trip, item, categoryOptions, installmentPlans, onClose, onSubmit }: TripItemModalProps) {
  const [values, setValues] = useState<TripItemFormValues>(() => createTripItemFormValues(item ?? undefined, trip))
  const [error, setError] = useState<string | null>(null)
  const installmentOptions = useMemo(
    () => [
      { value: '', label: 'ไม่มี' },
      ...installmentPlans.map((plan) => ({
        value: plan.id,
        label: `${plan.name} - ${Number(plan.monthlyAmount || 0).toLocaleString('th-TH')} บาท`,
      })),
    ],
    [installmentPlans],
  )

  if (!open) return null

  function updateField<K extends keyof TripItemFormValues>(field: K, value: TripItemFormValues[K]): void {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function saveItem(): void {
    const validationError = validateTripItemForm(values)
    if (validationError) {
      setError(validationError)
      return
    }
    onSubmit(buildTripItemFromForm(values, item ?? undefined))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    saveItem()
  }

  return (
    <div className="finance-modal-backdrop">
      <form className="finance-modal-panel max-w-2xl" onSubmit={handleSubmit}>
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-extrabold">{item ? 'แก้ไขรายการทริป' : 'เพิ่มรายการทริป'}</h2>
            <p className="mt-1 text-sm text-slate-500">เพิ่มรายการให้ {trip.name}</p>
          </div>
          <Button type="button" onClick={onClose}>{th.common.close}</Button>
        </header>

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</div>}

        <div className="finance-form-grid">
          <FormField label="ชื่อรายการ" fullWidth>
            <TextInput value={values.title} placeholder="โรงแรม, รถไฟ, อาหารเย็น" onChange={(event) => updateField('title', event.target.value)} />
          </FormField>
          <FormField label="จำนวนเงิน">
            <TextInput inputMode="decimal" value={values.amount} placeholder="3500" onChange={(event) => updateField('amount', event.target.value)} />
          </FormField>
          <FormField label="วันที่">
            <DateInput value={values.date} onChange={(event) => updateField('date', event.target.value)} />
          </FormField>
          <FormField label="หมวดหมู่">
            <ComboboxField
              value={values.category}
              options={categoryOptions}
              placeholder="ท่องเที่ยว"
              onChange={(category) => updateField('category', category)}
            />
          </FormField>
          <FormField label="จุดหมาย">
            <TextInput value={values.destination} placeholder="เมืองหรือสถานที่" onChange={(event) => updateField('destination', event.target.value)} />
          </FormField>
          <FormField label="ประเทศ">
            <TextInput value={values.country} placeholder="ประเทศ" onChange={(event) => updateField('country', event.target.value)} />
          </FormField>
          {installmentPlans.length > 0 && (
            <FormField label="แผนผ่อนที่เกี่ยวข้อง">
              <SelectField
                value={values.installmentId}
                options={installmentOptions}
                onChange={(event) => updateField('installmentId', event.target.value)}
              />
            </FormField>
          )}
          <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-600">
            <input checked={values.isPaid} type="checkbox" onChange={(event) => updateField('isPaid', event.target.checked)} />
            จ่ายแล้ว
          </label>
          <FormField label="หมายเหตุ" fullWidth>
            <TextareaField value={values.note} placeholder="รายละเอียดเพิ่มเติม" onChange={(event) => updateField('note', event.target.value)} />
          </FormField>
        </div>

        <footer className="finance-modal-footer">
          <Button type="button" onClick={onClose}>{th.common.cancel}</Button>
          <Button type="button" variant="primary" onClick={saveItem}>{item ? th.common.saveChanges : 'บันทึกรายการ'}</Button>
        </footer>
      </form>
    </div>
  )
}
