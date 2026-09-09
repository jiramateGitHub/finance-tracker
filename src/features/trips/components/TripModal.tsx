import { useEffect, useState, type FormEvent } from 'react'
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

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

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
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <form className="finance-modal-panel relative z-10 max-w-2xl" onSubmit={handleSubmit}>
        <div className="mx-auto -mt-1 mb-1 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">{trip ? 'แก้ไขทริป' : 'สร้างทริปใหม่'}</h2>
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
          <div className="finance-form-grid">
            <FormField label="ชื่อทริป" fullWidth>
              <TextInput value={values.name} placeholder="เช่น เซี่ยงไฮ้ 2026" onChange={(event) => updateField('name', event.target.value)} />
            </FormField>
            <FormField label="จุดหมาย / ประเทศ">
              <TextInput value={values.destination} placeholder="เช่น เซี่ยงไฮ้, จีน" onChange={(event) => updateField('destination', event.target.value)} />
            </FormField>
            <FormField label="งบที่วางแผนไว้">
              <TextInput inputMode="decimal" value={values.budget} placeholder="เช่น 60000" onChange={(event) => updateField('budget', event.target.value)} />
            </FormField>
            <FormField label="วันที่เริ่ม">
              <DateInput value={values.startDate} onChange={(event) => updateField('startDate', event.target.value)} />
            </FormField>
            <FormField label="วันที่จบ">
              <DateInput value={values.endDate} onChange={(event) => updateField('endDate', event.target.value)} />
            </FormField>
            <FormField label="หมายเหตุ" fullWidth>
              <TextareaField value={values.note} placeholder="แผนคร่าว ๆ รายละเอียดการจอง หรือสิ่งที่ต้องเตรียม" onChange={(event) => updateField('note', event.target.value)} />
            </FormField>
          </div>
        </div>

        <footer className="finance-modal-footer">
          <Button type="button" onClick={onClose}>{th.common.cancel}</Button>
          <Button type="submit" variant="primary">{trip ? th.common.saveChanges : 'สร้างทริป'}</Button>
        </footer>
      </form>
    </div>
  )
}
