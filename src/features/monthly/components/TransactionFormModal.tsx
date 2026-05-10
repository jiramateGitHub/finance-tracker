import { useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { ComboboxField } from '../../../components/ui/ComboboxField'
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
  const [values, setValues] = useState<TransactionFormValues>(() => createTransactionFormValues(transaction ?? undefined, defaultValues))
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  function updateField<K extends keyof TransactionFormValues>(field: K, value: TransactionFormValues[K]): void {
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

  return (
    <div className="finance-modal-backdrop">
      <form className="finance-modal-panel max-w-2xl" onSubmit={handleSubmit}>
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-extrabold">{transaction ? th.transaction.edit : th.transaction.add}</h2>
            <p className="mt-1 text-sm text-slate-500">ระบบจะบันทึกการเปลี่ยนแปลงขึ้น Cloud ตามบัญชี Firebase นี้</p>
          </div>
          <Button type="button" onClick={onClose}>{th.common.close}</Button>
        </header>

        {error && <div className="finance-error">{error}</div>}

        <div className="finance-modal-body">
          <div className="finance-form-grid">
          <FormField label="ประเภท">
            <SelectField
              value={values.type}
              options={[
                { value: 'expense', label: th.transaction.expense },
                { value: 'income', label: th.transaction.income },
              ]}
              onChange={(event) => updateField('type', event.target.value as TransactionFormValues['type'])}
            />
          </FormField>

          <FormField label="วันที่">
            <DateInput value={values.date} onChange={(event) => updateField('date', event.target.value)} />
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
            <TextInput inputMode="decimal" min="0" type="text" value={values.amount} onChange={(event) => updateField('amount', event.target.value)} />
          </FormField>

          <FormField label="ชื่อรายการ" fullWidth>
            <TextInput value={values.title} placeholder="เงินเดือน, กาแฟ, ค่าเช่า" onChange={(event) => updateField('title', event.target.value)} />
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
          <FormField label={th.transaction.note} fullWidth>
            <TextareaField value={values.note} placeholder="รายละเอียดเพิ่มเติม" onChange={(event) => updateField('note', event.target.value)} />
          </FormField>

          {!transaction && (
            <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <input
                id="repeat-enabled"
                type="checkbox"
                checked={values.repeatEnabled}
                onChange={(event) => updateField('repeatEnabled', event.target.checked)}
              />
              <label htmlFor="repeat-enabled" className="text-sm font-extrabold text-slate-700">สร้างซ้ำรายเดือน</label>
            </div>
          )}

          {!transaction && values.repeatEnabled && (
            <FormField label="จำนวนเดือนที่สร้าง">
              <TextInput
                inputMode="numeric"
                value={values.repeatCount}
                placeholder="1-60"
                onChange={(event) => updateField('repeatCount', event.target.value)}
              />
            </FormField>
          )}
          </div>
        </div>

        <footer className="finance-modal-footer">
          <Button type="button" onClick={onClose}>{th.common.cancel}</Button>
          <Button type="button" variant="primary" onClick={saveTransaction}>{transaction ? th.common.saveChanges : th.transaction.add}</Button>
        </footer>
      </form>
    </div>
  )
}