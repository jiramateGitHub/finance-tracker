import { SummaryCard } from '../../../components/ui/SummaryCard'
import { th } from '../../../i18n/th'
import { formatMoney } from '../../../utils/formatters'
import type { MonthlyTotals } from '../utils/monthlyLedger'

type MonthlySummaryCardsProps = {
  totals: MonthlyTotals
}

export function MonthlySummaryCards({ totals }: MonthlySummaryCardsProps) {
  const expenseRatio = totals.income > 0 ? Math.min(100, Math.round((totals.expense / totals.income) * 100)) : undefined

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. รายรับ */}
      <SummaryCard
        label={th.transaction.income}
        value={formatMoney(totals.income)}
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        }
        tone="income"
        subValue={
          <span className="text-emerald-700 font-semibold">
            กระแสเงินสดรับ
          </span>
        }
      />

      {/* 2. รายจ่าย */}
      <SummaryCard
        label={th.transaction.expense}
        value={formatMoney(totals.expense)}
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
            <polyline points="17 18 23 18 23 12" />
          </svg>
        }
        tone="expense"
        subValue={
          <div className="flex items-center justify-between text-[11px]">
            <span>ใช้ไป {expenseRatio !== undefined ? `${expenseRatio}% ของรายรับ` : 'ไม่มีรายรับ'}</span>
          </div>
        }
        progress={expenseRatio}
      />

      {/* 3. คงเหลือ */}
      <SummaryCard
        label={th.transaction.balance}
        value={formatMoney(totals.balance)}
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="14" x="2" y="5" rx="2" />
            <line x1="2" x2="22" y1="10" y2="10" />
          </svg>
        }
        tone={totals.balance >= 0 ? 'balance' : 'expense'}
        subValue={
          <span className={totals.balance >= 0 ? 'text-blue-700 font-semibold' : 'text-rose-700 font-semibold'}>
            {totals.balance >= 0 ? 'เงินคงเหลือสุทธิ' : 'รายจ่ายเกินรายรับ'}
          </span>
        }
      />

      {/* 4. ยังไม่จ่าย */}
      <SummaryCard
        label={th.transaction.unpaid}
        value={formatMoney(totals.pendingExpense)}
        icon={
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        }
        tone={totals.pendingExpense > 0 ? 'due' : 'income'}
        subValue={
          <span className={totals.pendingExpense > 0 ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
            {totals.pendingExpense > 0 ? 'มีรายการรอการชำระ' : 'ชำระครบถ้วนแล้ว 🎉'}
          </span>
        }
      />
    </div>
  )
}
