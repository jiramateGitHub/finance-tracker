import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { ComboboxField } from '../../../components/ui/ComboboxField'
import { ConfirmModal } from '../../../components/ui/ConfirmModal'
import { DateInput } from '../../../components/ui/DateInput'
import { FormField } from '../../../components/ui/FormField'
import { SelectField } from '../../../components/ui/SelectField'
import { TextareaField } from '../../../components/ui/TextareaField'
import { TextInput } from '../../../components/ui/TextInput'
import { th } from '../../../i18n/th'
import type { TransactionEntry } from '../../../types/finance'
import {
  buildRepeatedTransactionsFromForm,
  buildTransactionFromForm,
  createTransactionFormValues,
  type TransactionFormValues,
  validateTransactionForm,
} from '../utils/monthlyLedger'

type TransactionFormModalProps = {
  open: boolean
  transaction?: TransactionEntry | null
  defaultValues?: Partial<TransactionFormValues>
  categoryOptions: string[]
  onClose: () => void
  onSubmit: (transactions: TransactionEntry[]) => void
}

export function TransactionFormModal({
  open,
  transaction,
  defaultValues,
  categoryOptions,
  onClose,
  onSubmit,
}: TransactionFormModalProps) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)
  const [initialValues] = useState<TransactionFormValues>(() => createTransactionFormValues(transaction ?? undefined, defaultValues))
  const [values, setValues] = useState<TransactionFormValues>(initialValues)
  const [error, setError] = useState<string | null>(null)
  const [discardConfirmationOpen, setDiscardConfirmationOpen] = useState(false)
  const hasUnsavedChanges = JSON.stringify(values) !== JSON.stringify(initialValues)
  const requestClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setDiscardConfirmationOpen(true)
      return
    }
    onClose()
  }, [hasUnsavedChanges, onClose])

  useEffect(() => {
    if (!open) return
    previouslyFocusedElementRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frameId = window.requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[data-initial-focus]')?.focus()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
      previouslyFocusedElementRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open || discardConfirmationOpen) return
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        requestClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusableElements = Array.from(formRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [])
      const firstElement = focusableElements[0]
      const lastElement = focusableElements.at(-1)
      if (!firstElement || !lastElement) return

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [discardConfirmationOpen, open, requestClose])

  if (!open) return null

  function updateField<K extends keyof TransactionFormValues>(field: K, value: TransactionFormValues[K]): void {
    if (error) setError(null)
    setValues((current) => ({
      ...current,
      [field]: value,
      status: field === 'type' && value === 'income' ? 'cleared' : current.status,
    }))
  }

  function saveTransaction(): void {
    const validationError = validateTransactionForm(values)
    if (validationError) {
      setError(validationError)
      const errorField = validationError === 'เลือกวันที่ที่ถูกต้อง' || validationError === 'เลือกวันที่'
        ? 'date'
        : validationError === 'กรอกชื่อรายการ'
          ? 'title'
          : validationError === 'กรอกจำนวนเงินมากกว่า 0'
            ? 'amount'
            : 'repeatCount'
      window.requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>(`[data-error-field="${errorField}"]`)?.focus()
      })
      return
    }

    if (transaction) {
      onSubmit([buildTransactionFromForm(values, transaction)])
      return
    }

    onSubmit(buildRepeatedTransactionsFromForm(values))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    saveTransaction()
  }

  const dateError = error === 'เลือกวันที่' || error === 'เลือกวันที่ที่ถูกต้อง' ? error : null
  const amountError = error === 'กรอกจำนวนเงินมากกว่า 0' ? error : null
  const titleError = error === 'กรอกชื่อรายการ' ? error : null
  const repeatCountError = error === 'จำนวนเดือนที่สร้างต้องอยู่ระหว่าง 1 ถึง 60' ? error : null

  return (
    <div className="finance-modal-backdrop">
      <div className="fixed inset-0" onClick={requestClose} aria-hidden="true" />
      <form ref={formRef} inert={discardConfirmationOpen} className="finance-modal-panel relative z-10 max-w-xl" onSubmit={handleSubmit}>
        <div className="mx-auto -mt-1 mb-1 h-1 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">{transaction ? th.transaction.edit : th.transaction.add}</h2>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={th.common.close}
            className="grid min-h-10 min-w-10 sm:min-h-9 sm:min-w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition active:scale-95 cursor-pointer"
          >
            <svg className="size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>

        <div className="finance-modal-body">
          <div className="finance-form-grid">
            <FormField label="ประเภท" fullWidth>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  className={`flex min-h-10 sm:min-h-9 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition cursor-pointer ${
                    values.type === 'expense'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => updateField('type', 'expense')}
                >
                  <span className="size-2 rounded-full bg-current opacity-70" />
                  {th.transaction.expense}
                </button>
                <button
                  type="button"
                  className={`flex min-h-10 sm:min-h-9 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition cursor-pointer ${
                    values.type === 'income'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => updateField('type', 'income')}
                >
                  <span className="size-2 rounded-full bg-current opacity-70" />
                  {th.transaction.income}
                </button>
              </div>
            </FormField>

            <FormField label="วันที่">
              <DateInput
                aria-describedby={dateError ? 'transaction-date-error' : undefined}
                aria-invalid={Boolean(dateError)}
                data-error-field="date"
                value={values.date}
                onChange={(event) => updateField('date', event.target.value)}
              />
              {dateError ? <p id="transaction-date-error" className="text-sm font-semibold text-rose-700" role="alert">{dateError}</p> : null}
            </FormField>

            <FormField label="หมวดหมู่">
              <ComboboxField
                value={values.category}
                options={categoryOptions}
                placeholder="ของกิน, เงินเดือน, บ้าน/เช่า"
                onChange={(category) => updateField('category', category)}
              />
            </FormField>

            <FormField label="จำนวนเงิน">
              <TextInput
                aria-describedby={amountError ? 'transaction-amount-error' : undefined}
                aria-invalid={Boolean(amountError)}
                data-error-field="amount"
                inputMode="decimal"
                type="text"
                placeholder="0.00"
                value={values.amount}
                onChange={(event) => updateField('amount', event.target.value)}
              />
              {amountError ? <p id="transaction-amount-error" className="text-sm font-semibold text-rose-700" role="alert">{amountError}</p> : null}
            </FormField>

            <FormField label="สถานะจ่าย">
              <SelectField
                value={values.status}
                disabled={values.type === 'income'}
                options={[
                  { value: 'cleared', label: th.transaction.paid },
                  { value: 'pending', label: th.transaction.unpaid },
                ]}
                onChange={(event) => updateField('status', event.target.value as TransactionFormValues['status'])}
              />
            </FormField>

            <FormField label="ชื่อรายการ" fullWidth>
              <TextInput
                aria-describedby={titleError ? 'transaction-title-error' : undefined}
                aria-invalid={Boolean(titleError)}
                data-error-field="title"
                data-initial-focus
                value={values.title}
                placeholder="เช่น เงินเดือน, กาแฟ, ค่าเช่าห้อง"
                onChange={(event) => updateField('title', event.target.value)}
              />
              {titleError ? <p id="transaction-title-error" className="text-sm font-semibold text-rose-700" role="alert">{titleError}</p> : null}
            </FormField>

            <FormField label={th.transaction.note} fullWidth>
              <TextareaField value={values.note} placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)" onChange={(event) => updateField('note', event.target.value)} />
            </FormField>

            {!transaction && (
              <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5 sm:col-span-2">
                <input
                  id="repeat-enabled"
                  type="checkbox"
                  className="size-4 rounded text-blue-600 focus:ring-blue-500"
                  checked={values.repeatEnabled}
                  onChange={(event) => updateField('repeatEnabled', event.target.checked)}
                />
                <label htmlFor="repeat-enabled" className="text-sm font-semibold text-slate-700 cursor-pointer">สร้างซ้ำรายเดือน</label>
              </div>
            )}

            {!transaction && values.repeatEnabled && (
              <FormField label="จำนวนเดือนที่สร้าง" fullWidth>
                <TextInput
                  aria-describedby={repeatCountError ? 'transaction-repeat-count-error' : undefined}
                  aria-invalid={Boolean(repeatCountError)}
                  data-error-field="repeatCount"
                  inputMode="numeric"
                  value={values.repeatCount}
                  placeholder="1-60 เดือน"
                  onChange={(event) => updateField('repeatCount', event.target.value)}
                />
                {repeatCountError ? <p id="transaction-repeat-count-error" className="text-sm font-semibold text-rose-700" role="alert">{repeatCountError}</p> : null}
              </FormField>
            )}
          </div>
        </div>

        <footer className="finance-modal-footer">
          <Button type="button" onClick={requestClose}>{th.common.cancel}</Button>
          <Button type="submit" variant="primary">{transaction ? th.common.saveChanges : th.transaction.add}</Button>
        </footer>
      </form>
      <ConfirmModal
        open={discardConfirmationOpen}
        title="ละทิ้งการเปลี่ยนแปลง?"
        description="ข้อมูลที่กรอกไว้จะหายและไม่ถูกบันทึก"
        confirmLabel="ละทิ้ง"
        destructive
        onConfirm={onClose}
        onClose={() => setDiscardConfirmationOpen(false)}
      />
    </div>
  )
}
