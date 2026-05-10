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
      { value: '', label: 'ไม่ผูกกับแผนผ่อน' },
      ...installmentPlans.map((plan) => ({
        value: plan.id,
        label: `${plan.name} - ${Number(plan.monthlyAmount || 0).toLocaleString('th-TH')} บาท`,
      })),
    ],
    [installmentPlans],
  )
  const categoryOptionsWithDefault = useMemo(() => Array.from(new Set(['ท่องเที่ยว', ...categoryOptions])), [categoryOptions])

  if (!open) return null

  function updateField<K extends keyof TripItemFormValues>(field: K, value: TripItemFormValues[K]): void {
    setValues((current) => ({ ...current, [field]: value }))
    if (error) setError(null)
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
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-finance-text">{item ? 'แก้ไขรายการทริป' : 'เพิ่มรายการทริป'}</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">บันทึกรายการใช้จ่ายของ {trip.name} พร้อมสถานะจ่ายแล้ว/ยังไม่จ่าย</p>
          </div>
          <Button type="button" onClick={onClose}>{th.common.close}</Button>
        </header>

        {error ? <div className="finance-error">{error}</div> : null}

        <div className="finance-modal-body">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-800">
            ทริป: {trip.name}{trip.destination ? ` · ${trip.destination}` : ''}
          </div>

          <div className="finance-form-grid">
            <FormField label="ชื่อรายการ" fullWidth>
              <TextInput value={values.title} placeholder="โรงแรม, รถไฟ, อาหารเย็น" onChange={(event) => updateField('title', event.target.value)} />
            </FormField>
            <FormField label="จำนวนเงิน">
              <TextInput inputMode="decimal" value={values.amount} placeholder="เช่น 3500" onChange={(event) => updateField('amount', event.target.value)} />
            </FormField>
            <FormField label="วันที่">
              <DateInput value={values.date} onChange={(event) => updateField('date', event.target.value)} />
            </FormField>
            <FormField label="หมวดหมู่">
              <ComboboxField
                value={values.category}
                options={categoryOptionsWithDefault}
                placeholder="ท่องเที่ยว"
                onChange={(category) => updateField('category', category)}
              />
            </FormField>
            <FormField label="สถานะจ่าย">
              <div className="finance-segmented w-full">
                <button
                  type="button"
                  className={`finance-segmented-button flex-1 ${values.isPaid ? 'is-active' : ''}`}
                  onClick={() => updateField('isPaid', true)}
                >
                  จ่ายแล้ว
                </button>
                <button
                  type="button"
                  className={`finance-segmented-button flex-1 ${!values.isPaid ? 'is-active' : ''}`}
                  onClick={() => updateField('isPaid', false)}
                >
                  ยังไม่จ่าย
                </button>
              </div>
            </FormField>
            <FormField label="จุดหมาย">
              <TextInput value={values.destination} placeholder="เมืองหรือสถานที่" onChange={(event) => updateField('destination', event.target.value)} />
            </FormField>
            <FormField label="ประเทศ">
              <TextInput value={values.country} placeholder="ประเทศ" onChange={(event) => updateField('country', event.target.value)} />
            </FormField>
            {installmentPlans.length > 0 ? (
              <FormField label="แผนผ่อนที่เกี่ยวข้อง" fullWidth>
                <SelectField
                  value={values.installmentId}
                  options={installmentOptions}
                  onChange={(event) => updateField('installmentId', event.target.value)}
                />
              </FormField>
            ) : null}
            <FormField label="หมายเหตุ" fullWidth>
              <TextareaField value={values.note} placeholder="รายละเอียดเพิ่มเติม" onChange={(event) => updateField('note', event.target.value)} />
            </FormField>
          </div>
        </div>

        <footer className="finance-modal-footer">
          <Button type="button" onClick={onClose}>{th.common.cancel}</Button>
          <Button type="button" variant="primary" onClick={saveItem}>{item ? th.common.saveChanges : 'บันทึกรายการ'}</Button>
        </footer>
      </form>
    </div>
  )
}
