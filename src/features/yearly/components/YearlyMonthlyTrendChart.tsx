import { useMemo, useState } from 'react'
import { MASTER_COLORS } from '../../../constants/theme'
import { formatMoney } from '../../../utils/formatters'
import type { MonthlyTrendItem } from '../utils/yearlyUtils'
import { findYearlyHighlights } from '../utils/yearlyUtils'

type YearlyMonthlyTrendChartProps = {
  data: MonthlyTrendItem[]
  selectedYear: number
  onSelectMonth?: (monthKey: string) => void
  currentMonthKey?: string
}

export function YearlyMonthlyTrendChart({
  data,
  selectedYear,
  onSelectMonth,
  currentMonthKey,
}: YearlyMonthlyTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [tappedIdx, setTappedIdx] = useState<number | null>(null)

  const currentMonthIdx = useMemo(() => {
    return data.findIndex((m) => m.monthKey === currentMonthKey)
  }, [data, currentMonthKey])

  // Find index of month with highest activity or default to current month or 0
  const defaultIdx = useMemo(() => {
    if (currentMonthIdx >= 0 && (data[currentMonthIdx].income > 0 || data[currentMonthIdx].expense > 0)) {
      return currentMonthIdx
    }
    // Find latest month with data
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i].income > 0 || data[i].expense > 0) return i
    }
    return currentMonthIdx >= 0 ? currentMonthIdx : 0
  }, [data, currentMonthIdx])

  const activeIdx = hoveredIdx !== null ? hoveredIdx : tappedIdx !== null ? tappedIdx : defaultIdx
  const activeItem = data[activeIdx]

  // Calculate max scale for bars
  const maxVal = useMemo(() => {
    let max = 0
    for (const d of data) {
      if (d.income > max) max = d.income
      if (d.expense > max) max = d.expense
    }
    return max > 0 ? max : 1000
  }, [data])

  const hasAnyData = useMemo(() => {
    return data.some((d) => d.income > 0 || d.expense > 0)
  }, [data])

  const highlights = useMemo(() => findYearlyHighlights(data), [data])

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between min-w-0 w-full max-w-full h-full">
      {/* ==================== HEADER ==================== */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 sm:mb-3 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-base font-bold text-slate-900 flex items-center gap-1.5 min-w-0">
                <svg className="w-4 h-4 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <span className="truncate">แนวโน้มรายรับ - รายจ่าย 12 เดือน</span>
              </h3>
              <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 shrink-0">
                ปี {selectedYear}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              เปรียบเทียบกระแสเงินสดรายรับและรายจ่ายในแต่ละเดือน
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 shrink-0 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-slate-600 text-[11px]">รายรับ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
              <span className="text-slate-600 text-[11px]">รายจ่าย</span>
            </div>
          </div>
        </div>

        {/* ==================== CHART CONTENT ==================== */}
        {!hasAnyData ? (
          <div className="py-16 text-center text-xs text-slate-400">
            ยังไม่มีข้อมูลรายรับหรือรายจ่ายในปี {selectedYear}
          </div>
        ) : (
          <>
            {/* Mobile tap hint */}
            <div className="sm:hidden flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>แตะแท่งกราฟเพื่อดูรายเดือน</span>
              <span>👈 12 เดือน 👉</span>
            </div>

            {/* Scrollable Container on Mobile */}
            <div className="relative pt-6 pb-2 overflow-x-auto sm:overflow-visible touch-pan-x min-w-0 w-full max-w-full">
              <div className="grid grid-cols-12 min-w-[500px] sm:min-w-0 gap-1.5 sm:gap-2 items-end h-44 sm:h-48 border-b border-slate-100 pb-1">
                {data.map((item, idx) => {
                  const isCurrent = item.monthKey === currentMonthKey
                  const isActive = activeIdx === idx
                  const incomePercent = item.income > 0 ? Math.max(5, Math.round((item.income / maxVal) * 100)) : 0
                  const expensePercent = item.expense > 0 ? Math.max(5, Math.round((item.expense / maxVal) * 100)) : 0

                  return (
                    <div
                      key={item.monthKey}
                      className={`group relative flex flex-col items-center h-full justify-end cursor-pointer select-none rounded-lg p-0.5 transition-colors ${
                        isActive ? 'bg-blue-50/60' : 'hover:bg-slate-50/80'
                      }`}
                      onClick={() => setTappedIdx(tappedIdx === idx ? null : idx)}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    >
                      {/* Paired Bars Container */}
                      <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-full px-0.5">
                        {/* Income Bar */}
                        <div
                          style={{ height: `${incomePercent}%` }}
                          className={`w-1/2 rounded-t transition-all duration-300 ${
                            item.income === 0
                              ? 'h-[2px] bg-slate-100'
                              : isActive
                              ? 'bg-emerald-600 shadow-xs'
                              : 'bg-emerald-500/85 group-hover:bg-emerald-600'
                          }`}
                          title={`รายรับ: ${formatMoney(item.income)}`}
                        />

                        {/* Expense Bar */}
                        <div
                          style={{ height: `${expensePercent}%` }}
                          className={`w-1/2 rounded-t transition-all duration-300 ${
                            item.expense === 0
                              ? 'h-[2px] bg-slate-100'
                              : isActive
                              ? 'bg-rose-600 shadow-xs'
                              : 'bg-rose-500/85 group-hover:bg-rose-600'
                          }`}
                          title={`รายจ่าย: ${formatMoney(item.expense)}`}
                        />
                      </div>

                      {/* Month Label */}
                      <div className="mt-2 text-center">
                        <span
                          className={`block text-[10px] sm:text-[11px] leading-tight whitespace-nowrap transition-colors ${
                            isCurrent
                              ? 'font-extrabold text-blue-700'
                              : isActive
                              ? 'font-bold text-slate-900'
                              : 'text-slate-500'
                          }`}
                        >
                          {item.monthShortName}
                        </span>
                        {isCurrent && (
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full mt-0.5"
                            style={{ backgroundColor: MASTER_COLORS.primary[600] }}
                          />
                        )}
                      </div>

                      {/* Desktop Hover Tooltip */}
                      {hoveredIdx === idx && (
                        <div
                          className={`hidden sm:block absolute bottom-full mb-2 z-30 pointer-events-none rounded-xl bg-slate-900/95 text-white p-2.5 shadow-xl min-w-[140px] text-xs backdrop-blur-xs animate-in fade-in zoom-in-95 ${
                            idx <= 1 ? 'left-0' : idx >= data.length - 2 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                          }`}
                        >
                          <div className="font-bold text-slate-200 text-center border-b border-slate-700/80 pb-1 mb-1">
                            {item.monthFullName}
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-slate-400 text-[10px]">รายรับ:</span>
                              <span className="text-emerald-400 font-bold tabular-nums">+{formatMoney(item.income)}</span>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                              <span className="text-slate-400 text-[10px]">รายจ่าย:</span>
                              <span className="text-rose-400 font-bold tabular-nums">-{formatMoney(item.expense)}</span>
                            </div>
                            <div className="flex justify-between items-center gap-2 border-t border-slate-800 pt-1 mt-1 font-semibold">
                              <span className="text-slate-300 text-[10px]">คงเหลือ:</span>
                              <span className={`tabular-nums ${item.balance >= 0 ? 'text-blue-300 font-bold' : 'text-rose-300 font-bold'}`}>
                                {formatMoney(item.balance)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Interactive Active Month Strip */}
            {activeItem && (
              <div className="mt-3 p-3 rounded-xl bg-blue-50/70 border border-blue-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">
                    📅 {activeItem.monthFullName}:
                  </span>
                  <span className="font-bold text-emerald-700 tabular-nums">
                    +{formatMoney(activeItem.income)}
                  </span>
                  <span className="text-slate-300">/</span>
                  <span className="font-bold text-rose-700 tabular-nums">
                    -{formatMoney(activeItem.expense)}
                  </span>
                  <span className="text-slate-300">/</span>
                  <span className={`font-extrabold tabular-nums ${activeItem.balance >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                    คงเหลือ {formatMoney(activeItem.balance)}
                  </span>
                </div>

                {onSelectMonth && (
                  <button
                    type="button"
                    onClick={() => onSelectMonth(activeItem.monthKey)}
                    className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white px-2.5 py-1 rounded-lg border border-blue-200/80 hover:bg-blue-50/60 shadow-2xs transition cursor-pointer"
                  >
                    <span>เปิดดูรายเดือน</span>
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ==================== INSIGHT FOOTER ==================== */}
      {hasAnyData && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-2 flex-wrap">
            {highlights.highestIncomeMonth && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md font-medium">
                <span>🏆 รายรับสูงสุด:</span>
                <strong>{highlights.highestIncomeMonth.monthShortName}</strong>
                <span>({formatMoney(highlights.highestIncomeMonth.income)})</span>
              </span>
            )}
            {highlights.highestExpenseMonth && (
              <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-800 px-2 py-0.5 rounded-md font-medium">
                <span>⚠️ ใช้จ่ายสูงสุด:</span>
                <strong>{highlights.highestExpenseMonth.monthShortName}</strong>
                <span>({formatMoney(highlights.highestExpenseMonth.expense)})</span>
              </span>
            )}
          </div>

          {highlights.savingsRate !== null && (
            <div className="font-semibold text-slate-600">
              อัตราการออมทั้งปี:{' '}
              <span className={`font-bold ${highlights.savingsRate >= 20 ? 'text-emerald-700' : highlights.savingsRate > 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                {highlights.savingsRate}%
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
