import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { th } from '../../../i18n/th'
import type { TransactionEntry } from '../../../types/finance'
import { currentIsoTimestamp } from '../../../utils/formatters'
import { getQuickAddDate } from '../utils/quickAddParser'
import { isManualTransaction } from '../utils/monthlyLedger'

type FrequentTransactionShortcutsProps = {
  transactions: TransactionEntry[]
  selectedMonth: string
  onAddTransaction: (transaction: TransactionEntry) => void
}

export function FrequentTransactionShortcuts({ transactions, selectedMonth, onAddTransaction }: FrequentTransactionShortcutsProps) {
  const templates = Array.from(
    transactions.filter(isManualTransaction).reduce((map, transaction) => {
      const key = `${transaction.type}-${transaction.title}-${transaction.category}-${transaction.amount}`
      const current = map.get(key)
      map.set(key, {
        transaction,
        count: (current?.count ?? 0) + 1,
      })
      return map
    }, new Map<string, { transaction: TransactionEntry; count: number }>()).values(),
  )
    .sort((a, b) => b.count - a.count || b.transaction.updatedAt.localeCompare(a.transaction.updatedAt))
    .slice(0, 6)

  function addFromTemplate(template: TransactionEntry): void {
    const now = currentIsoTimestamp()
    const date = getQuickAddDate(selectedMonth)
    onAddTransaction({
      ...template,
      id: crypto.randomUUID(),
      date,
      monthKey: selectedMonth,
      status: template.type === 'income' ? 'cleared' : template.status,
      source: 'quick-add',
      sourceModule: 'manual',
      createdAt: now,
      updatedAt: now,
    })
  }

  return (
    <Card title={th.monthly.frequent}>
      {templates.length ? (
        <div className="flex flex-wrap gap-2">
          {templates.map(({ transaction, count }) => (
            <Button key={`${transaction.title}-${transaction.amount}-${count}`} type="button" size="sm" onClick={() => addFromTemplate(transaction)}>
              {transaction.title} · {count} ครั้ง
            </Button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500">
          ยังไม่มีรายการซ้ำให้ใช้เป็นทางลัด
        </div>
      )}
    </Card>
  )
}
