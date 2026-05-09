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
    const transaction = buildQuickAddTransaction(value, selectedMonth)
    if (!transaction) {
      setError('พิมพ์ชื่อรายการและจำนวนเงิน เช่น กาแฟ 80 หรือ + โบนัส 5000')
      return
    }
    onAddTransaction(transaction)
    setValue('')
    setError(null)
  }

  return (
    <div className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3 sm:grid-cols-[1fr_auto] sm:items-start">
      <div>
        <label className="sr-only" htmlFor="quick-add-input">{th.monthly.quickAdd}</label>
        <input
          id="quick-add-input"
          className="min-h-11 w-full rounded-xl border border-blue-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') submitQuickAdd()
          }}
          placeholder={th.monthly.quickAddPlaceholder}
        />
        {error ? <p className="mt-2 text-xs font-bold text-rose-700">{error}</p> : null}
      </div>
      <Button type="button" variant="primary" onClick={submitQuickAdd}>
        {th.common.add}
      </Button>
    </div>
  )
}
