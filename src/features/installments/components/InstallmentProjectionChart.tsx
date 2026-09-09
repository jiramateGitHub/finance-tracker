import { useState } from 'react'
import { formatMoney, formatMonth } from '../../../utils/formatters'
import type { Installment12MonthProjection } from '../utils/installmentPlans'

type InstallmentProjectionChartProps = {
  projection: Installment12MonthProjection
  selectedMonth: string
}

export function InstallmentProjectionChart({
  projection,
  selectedMonth,
}: InstallmentProjectionChartProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const { months, maxMonthlyDue, firstMilestone } = projection
  const hasAnyDebt = months.some((m) => m.totalDue > 0)

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs transition hover:shadow-md h-full flex flex-col justify-between">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                <polyline points="17 18 23 18 23 12" />
              </svg>
              พยากรณ์ภาระผ่อน 12 เดือนข้างหน้า (Debt Relief Forecast)
            </h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
              12 เดือน
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            จำลองยอดผ่อนที่ต้องจ่ายในแต่ละเดือน เมื่อรายการต่างๆ ทยอยผ่อนหมด
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
        >
          {isOpen ? 'ย่อกราฟ' : 'ขยายดูกราฟ'}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 pt-2">
          {!hasAnyDebt ? (
            <div className="py-8 text-center text-xs text-slate-400">
              ไม่มีภาระผ่อนคงค้างใน 12 เดือนข้างหน้า 🎉
            </div>
          ) : (
            <>
              {/* Bar Chart Container */}
              <div className="relative pt-6 pb-2">
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 sm:gap-2 items-end h-44 border-b border-slate-100">
                  {months.map((item, idx) => {
                    const isSelected = item.monthKey === selectedMonth
                    const heightPercent = maxMonthlyDue > 0 ? Math.max(8, Math.round((item.totalDue / maxMonthlyDue) * 100)) : 8
                    const hasMilestone = item.finishingPlans.length > 0
                    const isHovered = hoveredIndex === idx

                    return (
                      <div
                        key={item.monthKey}
                        className="group relative flex flex-col items-center h-full justify-end cursor-pointer"
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      >
                        {/* Milestone indicator icon */}
                        {hasMilestone && (
                          <span
                            className="absolute -top-5 text-[10px] text-amber-500 animate-bounce"
                            title={`ผ่อนหมด: ${item.finishingPlans.join(', ')}`}
                          >
                            🎉
                          </span>
                        )}

                        {/* Bar */}
                        <div
                          style={{ height: `${item.totalDue === 0 ? 4 : heightPercent}%` }}
                          className={`w-full rounded-t-lg transition-all duration-300 ${
                            item.totalDue === 0
                              ? 'bg-slate-100'
                              : isSelected
                              ? 'bg-blue-600 shadow-sm'
                              : isHovered
                              ? 'bg-blue-500'
                              : hasMilestone
                              ? 'bg-emerald-500/85 hover:bg-emerald-600'
                              : 'bg-blue-400/60 hover:bg-blue-500/80'
                          }`}
                        />

                        {/* Month Label */}
                        <div className="mt-2 text-center">
                          <span className={`block text-[10px] font-semibold leading-tight ${isSelected ? 'text-blue-700 font-extrabold' : 'text-slate-500'}`}>
                            {formatShortThaiMonth(item.monthKey)}
                          </span>
                        </div>

                        {/* Tooltip on Hover */}
                        {isHovered && (
                          <div className="absolute bottom-full mb-2 z-30 pointer-events-none rounded-xl bg-slate-900/90 text-white p-2.5 shadow-xl text-center min-w-[120px] backdrop-blur-xs text-xs animate-in fade-in zoom-in-95">
                            <div className="font-bold text-slate-100">{formatMonth(item.monthKey)}</div>
                            <div className="text-emerald-400 font-extrabold text-sm mt-0.5">
                              {formatMoney(item.totalDue)}
                            </div>
                            {hasMilestone && (
                              <div className="mt-1 text-[10px] text-amber-300 border-t border-white/10 pt-1">
                                ผ่อนหมด: {item.finishingPlans.join(', ')}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Milestone Insight Highlight */}
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-700 flex items-start gap-2 bg-slate-50/70 p-3 rounded-xl border">
                <span className="text-base shrink-0">💡</span>
                <div className="leading-relaxed">
                  {firstMilestone ? (
                    <span>
                      เป้าหมายสำคัญ: ในเดือน <strong>{formatMonth(firstMilestone.monthKey)}</strong> คุณจะผ่อน <strong>{firstMilestone.finishingPlans.join(', ')}</strong> หมด! ภาระค่าใช้จ่ายต่อเดือนจะลดลงทันที 🎉
                    </span>
                  ) : (
                    <span>
                      ยอดผ่อนของคุณคงที่สม่ำเสมอใน 12 เดือนข้างหน้า ช่วยให้วางแผนกระแสเงินสดได้อย่างมั่นใจ
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}

function formatShortThaiMonth(monthKey: string): string {
  const shortMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  const parts = monthKey.split('-')
  if (parts.length < 2) return monthKey
  const monthIdx = parseInt(parts[1], 10) - 1
  const yearShort = (parseInt(parts[0], 10) + 543) % 100
  return `${shortMonths[monthIdx] || parts[1]} '${yearShort}`
}
