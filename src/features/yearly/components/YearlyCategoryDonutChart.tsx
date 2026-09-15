import { useMemo, useState } from 'react'
import { MASTER_COLORS } from '../../../constants/theme'
import type { TransactionEntry } from '../../../types/finance'
import { formatMoney } from '../../../utils/formatters'
import type { CategoryDonutSlice } from '../utils/yearlyUtils'
import { calculateYearlyCategoryDistribution } from '../utils/yearlyUtils'

type YearlyCategoryDonutChartProps = {
  transactions: TransactionEntry[]
  selectedYear: number
  includePending?: boolean
}

export function YearlyCategoryDonutChart({
  transactions,
  selectedYear,
  includePending = true,
}: YearlyCategoryDonutChartProps) {
  const [hoveredSlice, setHoveredSlice] = useState<CategoryDonutSlice | null>(null)

  const distribution = useMemo(() => {
    return calculateYearlyCategoryDistribution(transactions, {
      includePending,
      maxCategories: 6,
    })
  }, [transactions, includePending])

  const { slices, totalExpense, categoryCount } = distribution
  const hasData = totalExpense > 0 && slices.length > 0

  // SVG Donut calculation
  const radius = 38
  const strokeWidth = 14
  const circumference = 2 * Math.PI * radius

  const slicesWithOffsets = useMemo(() => {
    return slices.map((slice, index) => {
      const precedingPercent = slices.slice(0, index).reduce((sum, s) => sum + (s.totalAmount / totalExpense) * 100, 0)
      const slicePercent = (slice.totalAmount / totalExpense) * 100
      const strokeDasharray = `${(slicePercent / 100) * circumference} ${circumference}`
      const strokeDashoffset = -((precedingPercent / 100) * circumference)
      return {
        ...slice,
        strokeDasharray,
        strokeDashoffset,
      }
    })
  }, [slices, totalExpense, circumference])

  const sortedSlices = useMemo(() => {
    if (!hoveredSlice) return slicesWithOffsets
    return [
      ...slicesWithOffsets.filter((s) => s.category !== hoveredSlice.category),
      ...slicesWithOffsets.filter((s) => s.category === hoveredSlice.category),
    ]
  }, [slicesWithOffsets, hoveredSlice])

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between min-w-0 w-full max-w-full h-full">
      {/* Title */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1 sm:mb-2 min-w-0">
          <h3 className="text-xs sm:text-base font-bold text-slate-900 flex items-center gap-1.5 min-w-0">
            <svg className="w-4 h-4 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
              <path d="M22 12A10 10 0 0 0 12 2v10z" />
            </svg>
            <span className="truncate">สัดส่วนรายจ่ายตามหมวดหมู่</span>
          </h3>
          <span className="text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
            ทั้งปี {selectedYear}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          แบ่งตามหมวดหมู่ค่าใช้จ่ายตลอดทั้งปี
        </p>

        {!hasData ? (
          <div className="py-16 text-center text-xs text-slate-400">
            ยังไม่มีรายการรายจ่ายในปี {selectedYear}
          </div>
        ) : (
          <>
            {/* Donut Chart */}
            <div className="relative flex items-center justify-center my-3 sm:my-4 h-44 sm:h-48">
              <svg
                viewBox="0 0 100 100"
                className="w-40 h-40 sm:w-44 sm:h-44 -rotate-90 transform"
                onMouseLeave={() => setHoveredSlice(null)}
              >
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={MASTER_COLORS.neutral[100]}
                  strokeWidth={strokeWidth}
                />
                {/* Slices */}
                {sortedSlices.map((slice) => {
                  const isHovered = hoveredSlice?.category === slice.category

                  return (
                    <circle
                      key={slice.category}
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      stroke={slice.color}
                      strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                      strokeDasharray={slice.strokeDasharray}
                      strokeDashoffset={slice.strokeDashoffset}
                      className="transition-all duration-200 cursor-pointer"
                      style={{ pointerEvents: 'stroke' }}
                      onClick={() => setHoveredSlice(hoveredSlice?.category === slice.category ? null : slice)}
                      onMouseEnter={() => setHoveredSlice(slice)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  )
                })}
              </svg>

              {/* Donut Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-3">
                {hoveredSlice ? (
                  <>
                    <span className="text-sm shrink-0 mb-0.5" role="img" aria-label={hoveredSlice.category}>
                      {hoveredSlice.icon}
                    </span>
                    <span className="text-[11px] text-slate-600 font-bold truncate max-w-[110px] block" title={hoveredSlice.category}>
                      {hoveredSlice.category}
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 mt-0.5 tabular-nums tracking-tight" title={formatMoney(hoveredSlice.totalAmount)}>
                      {formatMoney(hoveredSlice.totalAmount)}
                    </span>
                    <span className="text-[10px] font-bold text-blue-600">
                      {hoveredSlice.percentage}%
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                      รวมรายจ่ายทั้งปี
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-slate-900 mt-0.5 tabular-nums tracking-tight" title={formatMoney(totalExpense)}>
                      {formatMoney(totalExpense)}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      {categoryCount} หมวดหมู่
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Legend / Breakdown List */}
            <div className="mt-1 pt-2 border-t border-slate-100 space-y-1 max-h-40 overflow-y-auto pr-1 text-xs scrollbar-thin">
              {slices.map((slice) => {
                const isHovered = hoveredSlice?.category === slice.category

                return (
                  <div
                    key={slice.category}
                    onClick={() => setHoveredSlice(hoveredSlice?.category === slice.category ? null : slice)}
                    onMouseEnter={() => setHoveredSlice(slice)}
                    onMouseLeave={() => setHoveredSlice(null)}
                    className={`flex items-center justify-between p-2 sm:p-1.5 rounded-xl transition-all cursor-pointer select-none ${
                      isHovered
                        ? 'bg-blue-50/80 ring-1 ring-blue-200/80 text-blue-900 font-semibold'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate pr-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="truncate text-[11px] sm:text-xs">
                        {slice.icon} {slice.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 font-medium text-[11px] sm:text-xs">
                      <span className="font-bold text-slate-900 tabular-nums">
                        {formatMoney(slice.totalAmount)}
                      </span>
                      <span className="text-slate-400 text-[10px] tabular-nums">
                        ({slice.percentage}%)
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer hint */}
      {hasData && (
        <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400 text-center">
          แตะหรือชี้ที่กราฟเพื่อดูสัดส่วนแต่ละหมวด
        </div>
      )}
    </div>
  )
}
