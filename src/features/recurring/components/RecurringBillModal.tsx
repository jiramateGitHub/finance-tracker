import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { ComboboxField } from '../../../components/ui/ComboboxField'
import { FormField } from '../../../components/ui/FormField'
import { SelectField } from '../../../components/ui/SelectField'
import { TextInput } from '../../../components/ui/TextInput'
import { TextareaField } from '../../../components/ui/TextareaField'
import { createId } from '../../../lib/id'
import type { RecurringAmountType, RecurringBillType, RecurringRule } from '../../../types/finance'
import { currentIsoTimestamp, currentMonthInputValue, parseAmountSafe } from '../../../utils/formatters'
import { RECURRING_TYPE_CONFIG } from '../utils/recurringBills'

export type RecurringBillModalProps = {
  open: boolean
  rule?: RecurringRule | null
  categoryOptions: string[]
  onClose: () => void
  onSubmit: (rule: RecurringRule) => void
}

type BillFormState = {
  name: string
  type: RecurringBillType
  category: string
  amount: string
  amountType: RecurringAmountType
  dueDay: string
  statementDay: string
  startDate: string
  endDate: string
  autoGenerateTransaction: boolean
  isActive: boolean
  note: string
}

const TYPE_OPTIONS: Array<{ value: RecurringBillType; label: string; icon: string }> = [
  { value: 'credit_card', label: 'บัตรเครดิต', icon: '💳' },
  { value: 'utility', label: 'สาธารณูปโภค / บิลบ้าน (น้ำ, ไฟ, เน็ต, เช่า)', icon: '⚡' },
  { value: 'subscription', label: 'สมาชิก / บริการรายเดือน (Netflix, Spotify ฯลฯ)', icon: '🍿' },
  { value: 'loan', label: 'สินเชื่อ / กู้ยืม / บัตรกดเงินสด', icon: '🏦' },
  { value: 'insurance', label: 'ประกันชีวิต / สุขภาพ / รถยนต์', icon: '🛡️' },
  { value: 'other', label: 'บิลอื่นๆ ทั่วไป', icon: '📄' },
]

export function RecurringBillModal({
  open,
  rule,
  categoryOptions,
  onClose,
  onSubmit,
}: RecurringBillModalProps) {
  const [form, setForm] = useState<BillFormState>(() => ({
    name: rule?.name || rule?.title || '',
    type: (rule?.type && rule.type in RECURRING_TYPE_CONFIG ? rule.type : 'utility') as RecurringBillType,
    category: rule?.categoryId || rule?.category || 'สาธารณูปโภค',
    amount: rule?.amount ? String(rule.amount) : '',
    amountType: rule?.amountType || 'fixed',
    dueDay: rule?.dueDay ? String(rule.dueDay) : rule?.dayOfMonth ? String(rule.dayOfMonth) : '5',
    statementDay: rule?.statementDay ? String(rule.statementDay) : '',
    startDate: rule?.startDate || `${currentMonthInputValue()}-01`,
    endDate: rule?.endDate || '',
    autoGenerateTransaction: rule?.autoGenerateTransaction !== false,
    isActive: rule?.isActive !== false,
    note: rule?.note || '',
  }))

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

  function updateField<K extends keyof BillFormState>(key: K, value: BillFormState[K]): void {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      // Auto-suggest category if user changes type and haven't customized category
      if (key === 'type') {
        const defaultCat = RECURRING_TYPE_CONFIG[value as RecurringBillType]?.defaultCategory
        if (defaultCat && (!prev.category || prev.category === 'สาธารณูปโภค' || prev.category === 'อื่นๆ')) {
          next.category = defaultCat
        }
      }
      return next
    })
    setError(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    const trimmedName = form.name.trim()
    if (!trimmedName) {
      setError('กรุณากรอกชื่อบิลหรือหนี้สินประจำ')
      return
    }

    const parsedAmount = parseAmountSafe(form.amount)
    if (parsedAmount < 0) {
      setError('ยอดเงินต้องไม่ติดลบ')
      return
    }

    const parsedDueDay = Number(form.dueDay)
    if (!Number.isInteger(parsedDueDay) || parsedDueDay < 1 || parsedDueDay > 31) {
      setError('วันครบกำหนดชำระต้องเป็นวันที่ 1 ถึง 31')
      return
    }

    let parsedStatementDay: number | null = null
    if (form.statementDay.trim()) {
      const day = Number(form.statementDay)
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        setError('วันตัดรอบบิลต้องเป็นวันที่ 1 ถึง 31')
        return
      }
      parsedStatementDay = day
    }

    if (form.endDate.trim() && form.startDate.trim() && form.endDate.trim() < form.startDate.trim()) {
      setError('วันสิ้นสุดต้องไม่มาก่อนวันเริ่มต้น')
      return
    }

    const now = currentIsoTimestamp()
    const finalRule: RecurringRule = {
      id: rule?.id || createId(),
      title: trimmedName,
      name: trimmedName,
      type: form.type,
      category: form.category || 'อื่นๆ',
      categoryId: form.category || 'อื่นๆ',
      amount: parsedAmount,
      amountType: form.amountType,
      currency: 'THB',
      cadence: rule?.cadence || 'monthly',
      interval: rule?.interval || 1,
      dueDay: parsedDueDay,
      dayOfMonth: parsedDueDay,
      statementDay: parsedStatementDay,
      paidMonthKeys: rule?.paidMonthKeys || [],
      autoGenerateTransaction: form.autoGenerateTransaction,
      isActive: form.isActive,
      startDate: form.startDate.trim() || rule?.startDate || `${currentMonthInputValue()}-01`,
      endDate: form.endDate.trim() || null,
      note: form.note.trim() || null,
      tripId: rule?.tripId || null,
      goalId: rule?.goalId || null,
      createdAt: rule?.createdAt || now,
      updatedAt: now,
    }

    onSubmit(finalRule)
    onClose()
  }

  return (
    <div
      className="finance-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recurring-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 id="recurring-modal-title" className="text-lg font-bold text-slate-900">
              {rule ? 'แก้ไขบิลประจำ & หนี้สิน' : 'เพิ่มบิลประจำ / บัตรเครดิต'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ระบบจะช่วยเตือนวันตัดรอบและวันครบกำหนด พร้อม 1-Click Pay
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            aria-label="ปิด"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <FormField label="ประเภทบิล / หนี้" fullWidth>
            <SelectField
              value={form.type}
              onChange={(e) => updateField('type', e.target.value as RecurringBillType)}
              options={TYPE_OPTIONS.map((opt) => ({
                value: opt.value,
                label: `${opt.icon} ${opt.label}`,
              }))}
            />
          </FormField>

          <FormField label="ชื่อบิล / หนี้สิน" fullWidth>
            <TextInput
              required
              autoFocus
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="เช่น บัตรเครดิต KBank, ค่าไฟฟ้านครหลวง, Netflix"
            />
          </FormField>

          <FormField label="หมวดหมู่รายจ่าย" fullWidth>
            <ComboboxField
              value={form.category}
              onChange={(val) => updateField('category', val)}
              options={categoryOptions}
              placeholder="เลือกหรือพิมพ์หมวดหมู่"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="ยอดเงินโดยประมาณ (บาท)" fullWidth>
              <TextInput
                type="number"
                step="0.01"
                min="0"
                required
                value={form.amount}
                onChange={(e) => updateField('amount', e.target.value)}
                placeholder="0.00"
              />
            </FormField>

            <FormField label="ลักษณะยอดชำระ" fullWidth>
              <SelectField
                value={form.amountType}
                onChange={(e) => updateField('amountType', e.target.value as RecurringAmountType)}
                options={[
                  { value: 'fixed', label: 'ยอดคงที่เท่ากันทุกเดือน' },
                  { value: 'variable', label: 'ยอดผันแปร (เช่น ค่าไฟ, บัตรเครดิต)' },
                ]}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="วันครบกำหนดชำระ (วันที่ 1-31)" fullWidth>
              <TextInput
                type="number"
                min="1"
                max="31"
                required
                value={form.dueDay}
                onChange={(e) => updateField('dueDay', e.target.value)}
                placeholder="เช่น 5 หรือ 25"
              />
            </FormField>

            <FormField
              label={
                form.type === 'credit_card'
                  ? 'วันตัดรอบบิล (วันที่ 1-31)'
                  : 'วันตัดรอบบิล (ไม่บังคับ)'
              }
              fullWidth
            >
              <TextInput
                type="number"
                min="1"
                max="31"
                value={form.statementDay}
                onChange={(e) => updateField('statementDay', e.target.value)}
                placeholder="เช่น 20 (เว้นว่างได้)"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="วันเริ่มต้นมีผล" fullWidth>
              <TextInput
                type="date"
                required
                value={form.startDate}
                onChange={(e) => updateField('startDate', e.target.value)}
              />
            </FormField>

            <FormField label="วันสิ้นสุด (เว้นว่างได้ถ้าไม่มีกำหนด)" fullWidth>
              <TextInput
                type="date"
                value={form.endDate}
                onChange={(e) => updateField('endDate', e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="หมายเหตุ / บันทึกเพิ่มเติม" fullWidth>
            <TextareaField
              value={form.note}
              onChange={(e) => updateField('note', e.target.value)}
              placeholder="เช่น เลขที่สัญญา, ตัดผ่านบัญชีอัตโนมัติ"
              rows={2}
            />
          </FormField>

          <div className="space-y-2.5 pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.autoGenerateTransaction}
                onChange={(e) => updateField('autoGenerateTransaction', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs text-slate-700">
                <strong className="font-semibold text-slate-800">
                  สร้างรายการรายจ่ายบนหน้าหลักอัตโนมัติเมื่อกดชำระ
                </strong>
                <span className="block text-slate-500">
                  เมื่อติ๊ก 1-Click Pay จะบันทึกรายจ่ายลงในเดือนนั้นให้อัตโนมัติ
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => updateField('isActive', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-xs text-slate-700">
                <strong className="font-semibold text-slate-800">เปิดใช้งานบิลนี้</strong>
                <span className="block text-slate-500">
                  หากยกเลิกสมาชิกหรือปิดยอดหนี้แล้ว สามารถปิดการใช้งานได้
                </span>
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="light" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="primary">
              {rule ? 'บันทึกการแก้ไข' : 'เพิ่มบิลประจำ'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
