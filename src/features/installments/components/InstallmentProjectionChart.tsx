import { useEffect, useRef, useState } from 'react'
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
  const { months, maxMonthlyDue, firstMilestone } = projection
  const selectedIdx = months.findIndex((m) => m.monthKey === selectedMonth)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [tappedIdx, setTappedIdx] = useState<number | null>(null)
  const barRefs = useRef<(HTMLDivElement | null)[]>([])

  // Active index for inspection strip: hover has priority on desktop, then tapped, then selectedMonth, then 0
  const activeIndex =
    hoveredIdx !== null
      ? hoveredIdx
      : tappedIdx !== null
      ? tappedIdx
      : selectedIdx >= 0
      ? selectedIdx
      : 0

  // Scroll active bar into view when selectedMonth changes
  useEffect(() => {
    if (selectedIdx >= 0) {
      barRefs.current[selectedIdx]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [selectedIdx])
  const hasAnyDebt = months.some((m) => m.totalDue > 0)

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-xs transition hover:shadow-md h-full flex flex-col justify-between min-w-0 w-full max-w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 sm:mb-3 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs sm:text-base font-bold text-slate-900 flex items-center gap-1.5 min-w-0">
              <svg className="w-4 h-4 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                <polyline points="17 18 23 18 23 12" />
              </svg>
              <span className="truncate">พยากรณ์ภาระผ่อน 12 เดือนข้างหน้า</span>
              <span className="hidden sm:inline font-normal text-slate-500 text-xs">(Debt Relief Forecast)</span>
            </h3>
            <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 shrink-0">
              12 เดือน
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            จำลองยอดผ่อนที่ต้องจ่ายในแต่ละเดือน เมื่อรายการต่างๆ ทยอยผ่อนหมด
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="shrink-0 min-h-8 sm:min-h-8 inline-flex items-center justify-center text-xs font-semibold text-slate-600 hover:text-slate-900 px-2.5 sm:px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
        >
          {isOpen ? 'ย่อกราฟ' : 'ขยายดูกราฟ'}
        </button>
      </div>

      {isOpen && (
        <div className="mt-2 sm:mt-4 pt-1 sm:pt-2 min-w-0 w-full max-w-full">
          {!hasAnyDebt ? (
            <div className="py-8 text-center text-xs text-slate-400">
              ไม่มีภาระผ่อนคงค้างใน 12 เดือนข้างหน้า 🎉
            </div>
          ) : (
            <>
              {/* Mobile swipe hint */}
              <div className="sm:hidden flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>แตะแท่งกราฟเพื่อดูรายละเอียด</span>
                <span>👈 เลื่อนดู 12 เดือน 👉</span>
              </div>

              {/* Bar Chart Container */}
              <div className="relative pt-6 pb-2 overflow-x-auto touch-pan-x min-w-0 w-full max-w-full">
                <div className="grid grid-cols-12 min-w-[480px] sm:min-w-0 gap-1.5 sm:gap-2 items-end h-40 sm:h-44 border-b border-slate-100 pr-1">
                  {months.map((item, idx) => {
                    const isSelected = item.monthKey === selectedMonth
                    const heightPercent = maxMonthlyDue > 0 ? Math.max(8, Math.round((item.totalDue / maxMonthlyDue) * 100)) : 8
                    const hasMilestone = item.finishingPlans.length > 0
                    const isHovered = hoveredIdx === idx
                    const isActive = activeIndex === idx

                    return (
                      <div
                        key={item.monthKey}
                        ref={(el) => {
                          barRefs.current[idx] = el
                        }}
                        className="group relative flex flex-col items-center h-full justify-end cursor-pointer select-none"
                        onClick={() => setTappedIdx(tappedIdx === idx ? null : idx)}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
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
                              ? 'bg-blue-600 shadow-sm ring-2 ring-blue-400'
                              : isActive
                              ? 'bg-blue-500 ring-2 ring-blue-300'
                              : hasMilestone
                              ? 'bg-emerald-500/85 hover:bg-emerald-600'
                              : 'bg-blue-400/60 hover:bg-blue-500/80'
                          }`}
                        />

                        {/* Month Label */}
                        <div className="mt-2 text-center">
                          <span className={`block text-[10px] font-semibold leading-tight whitespace-nowrap ${isSelected ? 'text-blue-700 font-extrabold' : isActive ? 'text-blue-900 font-bold' : 'text-slate-500'}`}>
                            {formatShortThaiMonth(item.monthKey)}
                          </span>
                        </div>

                        {/* Desktop Tooltip on Hover (hidden on mobile touch to avoid clipping) */}
                        {isHovered && (
                          <div className={`hidden sm:block absolute bottom-full mb-2 z-30 pointer-events-none rounded-xl bg-slate-900/90 text-white p-2.5 shadow-xl text-center min-w-[120px] backdrop-blur-xs text-xs animate-in fade-in zoom-in-95 ${
                            idx === 0 ? 'left-0' : idx === months.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2'
                          }`}>
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

              {/* Selected Month Interactive Detail Strip (touch-friendly & unclipped) */}
              {activeIndex !== null && months[activeIndex] && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-blue-50/90 border border-blue-200/80 flex flex-wrap items-center justify-between gap-1.5 text-xs animate-in fade-in">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-blue-900">
                      📅 {formatMonth(months[activeIndex].monthKey)}:
                    </span>
                    <span className="font-extrabold text-blue-700 tabular-nums">
                      {formatMoney(months[activeIndex].totalDue)}
                    </span>
                  </div>
                  {months[activeIndex].finishingPlans.length > 0 ? (
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md">
                      🎉 ผ่อนหมด: {months[activeIndex].finishingPlans.join(', ')}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">
                      (แตะแท่งกราฟเพื่อดูเดือนอื่น)
                    </span>
                  )}
                </div>
              )}

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
