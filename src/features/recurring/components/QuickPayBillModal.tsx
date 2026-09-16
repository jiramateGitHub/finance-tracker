import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../../../components/ui/Button'
import { FormField } from '../../../components/ui/FormField'
import { TextInput } from '../../../components/ui/TextInput'
import { TextareaField } from '../../../components/ui/TextareaField'
import { Badge } from '../../../components/ui/Badge'
import type { RecurringRule } from '../../../types/finance'
import { currentDateInputValue, formatMoney, getSafeDateInMonth, parseAmountSafe } from '../../../utils/formatters'
import { RECURRING_TYPE_CONFIG } from '../utils/recurringBills'

export type QuickPayBillModalProps = {
  open: boolean
  rule: RecurringRule | null
  selectedMonth: string
  onClose: () => void
  onPay: (
    ruleId: string,
    monthKey: string,
    options: {
      createTransaction: boolean
      amount: number
      date: string
      note?: string
    },
  ) => void
}

export function QuickPayBillModal({
  open,
  rule,
  selectedMonth,
  onClose,
  onPay,
}: QuickPayBillModalProps) {
  const [amountText, setAmountText] = useState(() => (rule?.amount ? String(rule.amount) : ''))
  const [dateText, setDateText] = useState(() => {
    const today = currentDateInputValue()
    if (today.startsWith(selectedMonth)) return today
    const day = rule?.dueDay ?? rule?.dayOfMonth ?? 1
    return getSafeDateInMonth(selectedMonth, String(day))
  })
  const [createTx, setCreateTx] = useState(() => rule?.autoGenerateTransaction !== false)
  const [noteText, setNoteText] = useState(() => rule?.note || '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open || !rule) return null

  const typeConfig = rule.type && rule.type in RECURRING_TYPE_CONFIG
    ? RECURRING_TYPE_CONFIG[rule.type as keyof typeof RECURRING_TYPE_CONFIG]
    : RECURRING_TYPE_CONFIG.other

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    if (!rule) return

    const parsedAmount = parseAmountSafe(amountText)
    if (parsedAmount <= 0) {
      setError('กรุณากรอกยอดเงินที่ชำระให้มากกว่า 0')
      return
    }

    if (!dateText) {
      setError('กรุณาเลือกวันที่ชำระ')
      return
    }

    onPay(rule.id, selectedMonth, {
      createTransaction: createTx,
      amount: parsedAmount,
      date: dateText,
      note: noteText.trim() || undefined,
    })
    onClose()
  }

  return (
    <div
      className="finance-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-pay-title"
    >
      <div className="relative w-full max-w-md rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl animate-scale-in">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">{typeConfig.icon}</span>
            <div>
              <h2 id="quick-pay-title" className="text-lg font-bold text-slate-900">
                บันทึกการชำระบิล
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-xs font-semibold text-slate-600 truncate max-w-[200px]">
                  {rule.name || rule.title}
                </span>
                <Badge tone={typeConfig.tone}>{typeConfig.label}</Badge>
              </div>
            </div>
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
          <FormField label="ยอดเงินที่ชำระจริง (บาท)" fullWidth>
            <TextInput
              type="number"
              step="0.01"
              min="0"
              required
              autoFocus
              value={amountText}
              onChange={(e) => {
                setAmountText(e.target.value)
                setError(null)
              }}
              placeholder="0.00"
            />
            {rule.amountType === 'variable' && (
              <span className="mt-1 block text-[11px] text-amber-600 font-medium">
                💡 บิลนี้เป็นยอดผันแปร (ยอดที่ประเมินไว้: {formatMoney(rule.amount)})
              </span>
            )}
          </FormField>

          <FormField label="วันที่ชำระเงิน" fullWidth>
            <TextInput
              type="date"
              required
              value={dateText}
              onChange={(e) => {
                setDateText(e.target.value)
                setError(null)
              }}
            />
          </FormField>

          <FormField label="บันทึกข้อความ / รายละเอียดเพิ่มเติม" fullWidth>
            <TextareaField
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="เช่น ชำระผ่านแอปธนาคาร, ชำระเต็มจำนวน"
              rows={2}
            />
          </FormField>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 flex items-start gap-3">
            <input
              id="createTxCheck"
              type="checkbox"
              checked={createTx}
              onChange={(e) => setCreateTx(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="createTxCheck" className="text-xs text-slate-700 cursor-pointer select-none">
              <strong className="block font-bold text-slate-800">
                บันทึกเป็นรายการรายจ่ายบนหน้าหลักอัตโนมัติ
              </strong>
              สร้างรายการรายจ่ายหมวด {rule.category} สถานะ &quot;จ่ายแล้ว&quot; เชื่อมโยงกับบิลนี้ทันที
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="light" onClick={onClose}>
              ยกเลิก
            </Button>
            <Button type="submit" variant="success">
              ยืนยันการชำระบิล
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
