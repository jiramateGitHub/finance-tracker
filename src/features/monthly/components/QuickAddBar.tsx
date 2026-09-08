import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { th } from '../../../i18n/th'
import type { TransactionEntry } from '../../../types/finance'
import { buildQuickAddTransaction } from '../utils/quickAddParser'

type QuickAddBarProps = {
  selectedMonth: string
  onAddTransaction: (transaction: TransactionEntry) => void
}

export function QuickAddBar({ selectedMonth, onAddTransaction }: QuickAddBarProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submitQuickAdd(): void {
    if (!value.trim()) return
    const transaction = buildQuickAddTransaction(value, selectedMonth)
    if (!transaction) {
      setError('พิมพ์ชื่อรายการและจำนวนเงิน เช่น กาแฟ 80 หรือ + เงินเดือน 35000')
      return
    }
    onAddTransaction(transaction)
    setValue('')
    setError(null)
  }

  function fillSample(sample: string): void {
    setValue(sample)
    setError(null)
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 sm:p-3.5 transition-all">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <label className="sr-only" htmlFor="quick-add-input">{th.monthly.quickAdd}</label>
          <input
            id="quick-add-input"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm font-medium text-slate-800 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              if (error) setError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitQuickAdd()
            }}
            placeholder={th.monthly.quickAddPlaceholder}
          />
        </div>
        <Button type="button" variant="primary" onClick={submitQuickAdd} className="shrink-0 w-full sm:w-auto">
          {th.common.add}
        </Button>
      </div>
      {error ? <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p> : null}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
        <span className="font-medium text-slate-500">ตัวอย่าง:</span>
        <button type="button" onClick={() => fillSample('กาแฟ 65')} className="rounded-lg bg-white px-2 py-0.5 font-medium text-slate-600 border border-slate-200/60 hover:bg-slate-100 hover:text-slate-800 transition">
          กาแฟ 65
        </button>
        <button type="button" onClick={() => fillSample('+ เงินเดือน 35000')} className="rounded-lg bg-white px-2 py-0.5 font-medium text-emerald-700 border border-emerald-200/60 hover:bg-emerald-50 transition">
          + เงินเดือน 35000
        </button>
        <button type="button" onClick={() => fillSample('ค่าไฟ 1,450 ยังไม่จ่าย')} className="rounded-lg bg-white px-2 py-0.5 font-medium text-amber-700 border border-amber-200/60 hover:bg-amber-50 transition">
          ค่าไฟ 1,450 ยังไม่จ่าย
        </button>
      </div>
    </div>
  )
}
