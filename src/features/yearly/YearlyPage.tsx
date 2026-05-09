import { Card } from '../../components/ui/Card'
import { SummaryCard } from '../../components/ui/SummaryCard'
import { calculateEntryTotals } from '../../lib/finance-calculations'
import type { AppData, TransactionEntry } from '../../types/finance'
import { formatMoney } from '../../utils/formatters'

type YearlyPageProps = {
  data: AppData
}

const monthLabels = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
]

function getYearEntries(entries: TransactionEntry[], year: number): TransactionEntry[] {
  return entries.filter((entry) => entry.date.startsWith(String(year)))
}

export function YearlyPage({ data }: YearlyPageProps) {
  const currentYear = new Date().getFullYear()
  const yearEntries = getYearEntries(data.entries, currentYear)
  const totals = calculateEntryTotals(yearEntries)

  return (
    <div className="grid gap-4">
      <Card title="ภาพรวมทั้งปี" description="สรุปรายรับรายจ่ายทั้งปีและการ์ดรายเดือน 12 เดือน">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="รายรับทั้งปี" value={formatMoney(totals.income)} icon="+" tone="income" />
          <SummaryCard label="รายจ่ายทั้งปี" value={formatMoney(totals.expense)} icon="-" tone="expense" />
          <SummaryCard label="คงเหลือทั้งปี" value={formatMoney(totals.balance)} icon="=" tone="balance" />
          <SummaryCard label="จำนวนรายการ" value={totals.entryCount} icon="#" tone="violet" />
          <SummaryCard label="ยอดยังไม่จ่าย" value={formatMoney(totals.pendingExpense)} icon="!" tone="due" />
        </div>
      </Card>

      <Card title={`สรุป 12 เดือน ปี ${currentYear}`}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {monthLabels.map((label, index) => {
            const monthKey = `${currentYear}-${String(index + 1).padStart(2, '0')}`
            const monthTotals = calculateEntryTotals(data.entries.filter((entry) => entry.date.startsWith(monthKey)))
            return (
              <article key={monthKey} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-extrabold">{label}</h3>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                    {monthTotals.entryCount} รายการ
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm">
                  <div className="flex justify-between gap-3 text-emerald-700"><span>รับ</span><strong>{formatMoney(monthTotals.income)}</strong></div>
                  <div className="flex justify-between gap-3 text-rose-700"><span>จ่าย</span><strong>{formatMoney(monthTotals.expense)}</strong></div>
                  <div className="flex justify-between gap-3 border-t border-slate-100 pt-2 text-blue-700"><span>คงเหลือ</span><strong>{formatMoney(monthTotals.balance)}</strong></div>
                </div>
              </article>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
