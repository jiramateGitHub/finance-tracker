import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { DateInput } from '../../../components/ui/DateInput'
import { FormField } from '../../../components/ui/FormField'
import { TextareaField } from '../../../components/ui/TextareaField'
import { TextInput } from '../../../components/ui/TextInput'
import { th } from '../../../i18n/th'
import type { Trip } from '../../../types/finance'
import { buildTripFromForm, createTripFormValues, type TripFormValues, validateTripForm } from '../utils/tripUtils'

type TripModalProps = {
  open: boolean
  trip?: Trip | null
  onClose: () => void
  onSubmit: (trip: Trip) => void
}

export function TripModal({ open, trip, onClose, onSubmit }: TripModalProps) {
  const [values, setValues] = useState<TripFormValues>(() => createTripFormValues(trip ?? undefined))
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  function updateField<K extends keyof TripFormValues>(field: K, value: TripFormValues[K]): void {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function saveTrip(): void {
    const validationError = validateTripForm(values)
    if (validationError) {
      setError(validationError)
      return
    }
    onSubmit(buildTripFromForm(values, trip ?? undefined))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    saveTrip()
  }

  return (
    <div className="finance-modal-backdrop">
      <form className="finance-modal-panel max-w-2xl" onSubmit={handleSubmit}>
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-extrabold">{trip ? 'แก้ไขทริป' : 'เพิ่มทริป'}</h2>
            <p className="mt-1 text-sm text-slate-500">ตั้งค่าจุดหมาย วันที่ และงบที่วางแผนไว้</p>
          </div>
          <Button type="button" onClick={onClose}>{th.common.close}</Button>
        </header>

        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</div>}

        <div className="finance-form-grid">
          <FormField label="ชื่อทริป" fullWidth>
            <TextInput value={values.name} placeholder="เซี่ยงไฮ้ 2026" onChange={(event) => updateField('name', event.target.value)} />
          </FormField>
          <FormField label="จุดหมาย / ประเทศ">
            <TextInput value={values.destination} placeholder="เซี่ยงไฮ้, จีน" onChange={(event) => updateField('destination', event.target.value)} />
          </FormField>
          <FormField label="งบที่วางแผนไว้">
            <TextInput inputMode="decimal" value={values.budget} placeholder="60000" onChange={(event) => updateField('budget', event.target.value)} />
          </FormField>
          <FormField label="วันที่เริ่ม">
            <DateInput value={values.startDate} onChange={(event) => updateField('startDate', event.target.value)} />
          </FormField>
          <FormField label="วันที่จบ">
            <DateInput value={values.endDate} onChange={(event) => updateField('endDate', event.target.value)} />
          </FormField>
          <FormField label="หมายเหตุ" fullWidth>
            <TextareaField value={values.note} placeholder="รายละเอียดเพิ่มเติม" onChange={(event) => updateField('note', event.target.value)} />
          </FormField>
        </div>

        <footer className="finance-modal-footer">
          <Button type="button" onClick={onClose}>{th.common.cancel}</Button>
          <Button type="button" variant="primary" onClick={saveTrip}>{trip ? th.common.saveChanges : 'สร้างทริป'}</Button>
        </footer>
      </form>
    </div>
  )
}
