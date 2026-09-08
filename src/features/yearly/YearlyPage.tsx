import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
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
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    years.add(currentYear)
    for (const entry of data.entries) {
      const yr = Number(entry.date.slice(0, 4))
      if (Number.isFinite(yr) && yr > 2000 && yr < 2100) {
        years.add(yr)
      }
    }
    return Array.from(years).sort((a, b) => b - a)
  }, [currentYear, data.entries])

  const yearEntries = useMemo(() => getYearEntries(data.entries, selectedYear), [data.entries, selectedYear])
  const totals = useMemo(() => calculateEntryTotals(yearEntries), [yearEntries])

  return (
    <div className="grid gap-4">
      <Card
        title={`ภาพรวมทั้งปี ${selectedYear}`}
        actions={(
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              onClick={() => setSelectedYear((prev) => prev - 1)}
              aria-label="ปีก่อนหน้า"
            >
              ‹
            </Button>
            <div className="flex items-center gap-1 overflow-x-auto max-w-[140px] sm:max-w-xs py-0.5">
              {availableYears.map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={`min-h-8 shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    selectedYear === yr
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => setSelectedYear((prev) => prev + 1)}
              aria-label="ปีถัดไป"
            >
              ›
            </Button>
          </div>
        )}
      >
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
          <SummaryCard label="รายรับทั้งปี" value={formatMoney(totals.income)} icon="+" tone="income" />
          <SummaryCard label="รายจ่ายทั้งปี" value={formatMoney(totals.expense)} icon="-" tone="expense" />
          <SummaryCard label="คงเหลือทั้งปี" value={formatMoney(totals.balance)} icon="=" tone="balance" />
          <SummaryCard label="จำนวนรายการ" value={`${totals.entryCount} รายการ`} icon="#" tone="violet" />
          <SummaryCard label="ยอดยังไม่จ่าย" value={formatMoney(totals.pendingExpense)} icon="!" tone="due" />
        </div>
      </Card>

      <Card title={`สรุป 12 เดือน ปี ${selectedYear}`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {monthLabels.map((label, index) => {
            const monthKey = `${selectedYear}-${String(index + 1).padStart(2, '0')}`
            const monthTotals = calculateEntryTotals(data.entries.filter((entry) => entry.date.startsWith(monthKey)))
            const hasData = monthTotals.entryCount > 0
            return (
              <article
                key={monthKey}
                className={`rounded-2xl border p-4 transition-all duration-150 ${
                  hasData
                    ? 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-xs'
                    : 'border-slate-100 bg-slate-50/50 opacity-60 hover:opacity-100'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-slate-900">{label}</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                    {monthTotals.entryCount} รายการ
                  </span>
                </div>
                <div className="mt-3 grid gap-1.5 text-xs sm:text-sm">
                  <div className="flex justify-between gap-3 text-emerald-700">
                    <span className="font-medium text-slate-500">รายรับ</span>
                    <span className="font-bold">+{formatMoney(monthTotals.income)}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-rose-700">
                    <span className="font-medium text-slate-500">รายจ่าย</span>
                    <span className="font-bold">-{formatMoney(monthTotals.expense)}</span>
                  </div>
                  <div className="flex justify-between gap-3 border-t border-slate-100 pt-1.5 text-blue-700">
                    <span className="font-medium text-slate-600">คงเหลือ</span>
                    <span className="font-bold">{formatMoney(monthTotals.balance)}</span>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
