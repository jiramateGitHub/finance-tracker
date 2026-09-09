import { useMemo, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { SummaryCard } from '../../components/ui/SummaryCard'
import { calculateEntryTotals } from '../../lib/finance-calculations'
import type { AppData } from '../../types/finance'
import { formatMoney } from '../../utils/formatters'
import { deriveInstallmentTransactions, getInstallmentScheduleMonths } from '../installments/utils/installmentPlans'
import { deriveTripTransactions } from '../trips/utils/tripUtils'
import { isInstallmentTransaction } from '../monthly/utils/monthlyLedger'

type YearlyPageProps = {
  data: AppData
  onSelectMonth?: (monthKey: string) => void
}

const monthNames = [
  { short: 'ม.ค.', full: 'มกราคม' },
  { short: 'ก.พ.', full: 'กุมภาพันธ์' },
  { short: 'มี.ค.', full: 'มีนาคม' },
  { short: 'เม.ย.', full: 'เมษายน' },
  { short: 'พ.ค.', full: 'พฤษภาคม' },
  { short: 'มิ.ย.', full: 'มิถุนายน' },
  { short: 'ก.ค.', full: 'กรกฎาคม' },
  { short: 'ส.ค.', full: 'สิงหาคม' },
  { short: 'ก.ย.', full: 'กันยายน' },
  { short: 'ต.ค.', full: 'ตุลาคม' },
  { short: 'พ.ย.', full: 'พฤศจิกายน' },
  { short: 'ธ.ค.', full: 'ธันวาคม' },
]

export function YearlyPage({ data, onSelectMonth }: YearlyPageProps) {
  const currentRealYear = new Date().getFullYear()
  const currentMonthPrefix = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  const [selectedYear, setSelectedYear] = useState<number>(currentRealYear)

  const availableYears = useMemo(() => {
    const years = new Set<number>()
    years.add(currentRealYear)

    // Manual transactions
    for (const entry of data.transactions) {
      const yr = Number(entry.date.slice(0, 4))
      if (Number.isFinite(yr) && yr > 2000 && yr < 2100) {
        years.add(yr)
      }
    }

    // Installment plans span (all intermediate years included)
    for (const plan of data.installmentPlans) {
      for (const monthKey of getInstallmentScheduleMonths(plan)) {
        const yr = Number(monthKey.slice(0, 4))
        if (Number.isFinite(yr) && yr > 2000 && yr < 2100) {
          years.add(yr)
        }
      }
    }

    // Trips (all dates, items, and date spans)
    for (const trip of data.trips) {
      const startYr = Number(trip.startDate.slice(0, 4))
      const endYr = Number(trip.endDate.slice(0, 4))
      if (Number.isFinite(startYr) && startYr > 2000 && startYr < 2100) {
        if (Number.isFinite(endYr) && endYr >= startYr && endYr < 2100) {
          for (let y = startYr; y <= endYr; y++) years.add(y)
        } else {
          years.add(startYr)
        }
      } else if (Number.isFinite(endYr) && endYr > 2000 && endYr < 2100) {
        years.add(endYr)
      }
      for (const item of trip.items) {
        const yr = Number(item.date.slice(0, 4))
        if (Number.isFinite(yr) && yr > 2000 && yr < 2100) {
          years.add(yr)
        }
      }
    }

    // Monthly budgets
    for (const budget of data.budgets) {
      if (budget.month) {
        const yr = Number(budget.month.slice(0, 4))
        if (Number.isFinite(yr) && yr > 2000 && yr < 2100) {
          years.add(yr)
        }
      }
    }

    return Array.from(years).sort((a, b) => b - a)
  }, [currentRealYear, data.budgets, data.installmentPlans, data.transactions, data.trips])

  const yearMonths = useMemo(
    () => Array.from({ length: 12 }, (_, i) => `${selectedYear}-${String(i + 1).padStart(2, '0')}`),
    [selectedYear],
  )

  // Unified ledger transactions matching MonthlyPage calculation
  const yearLedgerTransactions = useMemo(() => [
    ...data.transactions.filter((tx) => {
      if (isInstallmentTransaction(tx) || tx.tripId || tx.sourceModule === 'trip') {
        return false
      }
      return tx.date.startsWith(String(selectedYear))
    }),
    ...yearMonths.flatMap((month) => deriveInstallmentTransactions(data.installmentPlans, month)),
    ...yearMonths.flatMap((month) => deriveTripTransactions(data.trips, month)),
  ], [data.transactions, data.installmentPlans, data.trips, selectedYear, yearMonths])

  const totals = useMemo(() => calculateEntryTotals(yearLedgerTransactions), [yearLedgerTransactions])

  const expenseRatio = totals.income > 0 ? Math.min(100, Math.round((totals.expense / totals.income) * 100)) : undefined

  return (
    <div className="finance-page-shell space-y-4">
      {/* ==================== COMMAND / HEADER PANEL ==================== */}
      <section className="finance-command-panel">
        <div className="finance-toolbar finance-command-header border-b border-blue-100 pb-3">
          {/* Left: Title & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">ภาพรวมทั้งปี</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                  ปี {selectedYear}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                สรุปสถานะรายรับ-รายจ่ายและแนวโน้มการเงินตลอดทั้งปี
              </p>
            </div>
          </div>

          {/* Center: Year Navigator */}
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200/90 shadow-xs">
            <button
              type="button"
              title="ปีก่อนหน้า"
              onClick={() => setSelectedYear((prev) => prev - 1)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <div className="px-3 flex items-center gap-1.5 select-none">
              <svg className="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="text-sm font-bold text-slate-800 tracking-tight">
                ปี {selectedYear}
              </span>
            </div>

            <button
              type="button"
              title="ปีถัดไป"
              onClick={() => setSelectedYear((prev) => prev + 1)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            {selectedYear !== currentRealYear && (
              <button
                type="button"
                title="กลับมาปีปัจจุบัน"
                onClick={() => setSelectedYear(currentRealYear)}
                className="ml-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition border-l border-slate-200 cursor-pointer"
              >
                ปีปัจจุบัน
              </button>
            )}
          </div>

          {/* Right: Year Picker Pills */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full sm:max-w-xs py-0.5 scrollbar-none">
            {availableYears.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`min-h-8 shrink-0 rounded-xl px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  selectedYear === yr
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Overview Cards */}
        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <SummaryCard
            label="รายรับทั้งปี"
            value={formatMoney(totals.income)}
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            }
            tone="income"
            subValue={<span className="text-emerald-700 font-semibold">ยอดรับรวมทั้งปี</span>}
          />

          <SummaryCard
            label="รายจ่ายทั้งปี"
            value={formatMoney(totals.expense)}
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                <polyline points="17 18 23 18 23 12" />
              </svg>
            }
            tone="expense"
            subValue={
              <span>{expenseRatio !== undefined ? `${expenseRatio}% ของรายรับ` : 'ไม่มีรายรับ'}</span>
            }
            progress={expenseRatio}
          />

          <SummaryCard
            label="คงเหลือทั้งปี"
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
                {totals.balance >= 0 ? 'เงินออมสุทธิ' : 'รายจ่ายเกินรายรับ'}
              </span>
            }
          />

          <SummaryCard
            label="จำนวนรายการ"
            value={`${totals.entryCount} รายการ`}
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            }
            tone="violet"
            subValue={<span className="text-violet-700 font-semibold">ตลอดทั้งปี {selectedYear}</span>}
          />

          <SummaryCard
            label="ยอดยังไม่จ่าย"
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
                {totals.pendingExpense > 0 ? 'มียอดค้างชำระ' : 'ไม่มีค้างชำระ'}
              </span>
            }
          />
        </div>
      </section>

      {/* ==================== 12-MONTH OVERVIEW GRID ==================== */}
      <Card title={`สรุป 12 เดือน ปี ${selectedYear}`}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {monthNames.map(({ short, full }, index) => {
            const monthKey = `${selectedYear}-${String(index + 1).padStart(2, '0')}`
            const isCurrentMonth = monthKey === currentMonthPrefix
            const monthTotals = calculateEntryTotals(yearLedgerTransactions.filter((entry) => entry.date.startsWith(monthKey)))
            const hasData = monthTotals.entryCount > 0

            return (
              <article
                key={monthKey}
                onClick={() => onSelectMonth?.(monthKey)}
                role={onSelectMonth ? 'button' : undefined}
                tabIndex={onSelectMonth ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onSelectMonth && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onSelectMonth(monthKey)
                  }
                }}
                className={`rounded-2xl border p-4 sm:p-4.5 transition-all duration-150 group text-left ${
                  onSelectMonth ? 'cursor-pointer' : ''
                } ${
                  isCurrentMonth
                    ? 'border-blue-400/80 bg-blue-50/30 shadow-xs ring-1 ring-blue-300 hover:border-blue-500 hover:shadow-md'
                    : hasData
                    ? 'border-slate-200/80 bg-white hover:border-indigo-300 hover:shadow-md'
                    : 'border-slate-100 bg-slate-50/40 opacity-70 hover:opacity-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-700 transition">
                      {full} ({short})
                    </h3>
                    {isCurrentMonth && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-600 text-white">
                        เดือนนี้
                      </span>
                    )}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                    {monthTotals.entryCount} รายการ
                  </span>
                </div>

                <div className="grid gap-1.5 text-xs sm:text-sm">
                  <div className="flex justify-between items-baseline gap-3 text-emerald-700">
                    <span className="font-medium text-slate-500 text-xs">รายรับ</span>
                    <span className="font-bold">+{formatMoney(monthTotals.income)}</span>
                  </div>
                  <div className="flex justify-between items-baseline gap-3 text-rose-700">
                    <span className="font-medium text-slate-500 text-xs">รายจ่าย</span>
                    <span className="font-bold">-{formatMoney(monthTotals.expense)}</span>
                  </div>
                  <div className="flex justify-between items-baseline gap-3 border-t border-slate-100 pt-2 text-slate-800">
                    <span className="font-medium text-slate-600 text-xs">คงเหลือ</span>
                    <span className={`font-extrabold ${monthTotals.balance >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                      {formatMoney(monthTotals.balance)}
                    </span>
                  </div>
                </div>

                {onSelectMonth && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-400 group-hover:text-indigo-600 transition">
                    <span>เปิดดูรายเดือน</span>
                    <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
