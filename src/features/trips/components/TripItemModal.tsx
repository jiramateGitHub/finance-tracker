import { useEffect, useMemo, useState, type FormEvent } from 'react'
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

const tripItemCategoryPresets = [
  'ที่พัก',
  'เดินทาง',
  'ค่าน้ำมัน',
  'ของกิน',
  'กาแฟ/ขนม',
  'ช้อปปิ้ง',
  'บันเทิง',
  'ของขวัญ/งานสังคม',
  'ท่องเที่ยว',
  'ผ่อนสินค้า',
  'อื่นๆ',
]

export function TripItemModal({ open, trip, item, categoryOptions, installmentPlans, onClose, onSubmit }: TripItemModalProps) {
  const [values, setValues] = useState<TripItemFormValues>(() => createTripItemFormValues(item ?? undefined, trip))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

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
  const categoryOptionsWithDefault = useMemo(() => Array.from(new Set([...tripItemCategoryPresets, ...categoryOptions])), [categoryOptions])

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
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <form className="finance-modal-panel relative z-10 max-w-2xl" onSubmit={handleSubmit}>
        <div className="mx-auto -mt-1 mb-1 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">{item ? 'แก้ไขรายการทริป' : 'เพิ่มรายการทริป'}</h2>
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
                showAllOptionsOnFocus
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
          <Button type="submit" variant="primary">{item ? th.common.saveChanges : 'บันทึกรายการ'}</Button>
        </footer>
      </form>
    </div>
  )
}
