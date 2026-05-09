import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { th } from '../../../i18n/th'
import type { TransactionEntry } from '../../../types/finance'
import { formatDate, formatMoney } from '../../../utils/formatters'
import { isManualTransaction } from '../utils/monthlyLedger'

type RecentTransactionPanelProps = {
  transactions: TransactionEntry[]
}

export function RecentTransactionPanel({ transactions }: RecentTransactionPanelProps) {
  const recent = transactions
    .filter(isManualTransaction)
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 5)

  return (
    <Card title={th.monthly.recent}>
      {recent.length ? (
        <div className="grid gap-2">
          {recent.map((transaction) => (
            <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold">{transaction.title}</p>
                <p className="text-xs font-semibold text-slate-500">{formatDate(transaction.date)} · {transaction.category}</p>
              </div>
              <Badge tone={transaction.type === 'income' ? 'income' : 'expense'}>
                {transaction.type === 'income' ? '+' : '-'}{formatMoney(transaction.amount)}
              </Badge>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500">
          ยังไม่มีรายการล่าสุด
        </div>
      )}
    </Card>
  )
}
