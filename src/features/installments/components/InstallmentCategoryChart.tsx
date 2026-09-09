import { useMemo, useState } from 'react'
import { CATEGORY_ICONS } from '../../../data/categories'
import { formatMoney } from '../../../utils/formatters'
import type { InstallmentCategoryDistribution, InstallmentCategorySlice } from '../utils/installmentPlans'

type InstallmentCategoryChartProps = {
  distribution: InstallmentCategoryDistribution
}

export function InstallmentCategoryChart({ distribution }: InstallmentCategoryChartProps) {
  const [hoveredSlice, setHoveredSlice] = useState<InstallmentCategorySlice | null>(null)
  const { slices, totalMonthlyDue } = distribution

  const hasData = totalMonthlyDue > 0 && slices.length > 0

  // SVG Donut calculation
  const radius = 38
  const strokeWidth = 14
  const circumference = 2 * Math.PI * radius

  const slicesWithOffsets = useMemo(() => {
    return slices.map((slice, index) => {
      const precedingPercent = slices.slice(0, index).reduce((sum, s) => sum + s.percentage, 0)
      const strokeDasharray = `${(slice.percentage / 100) * circumference} ${circumference}`
      const strokeDashoffset = -((precedingPercent / 100) * circumference)
      return {
        ...slice,
        strokeDasharray,
        strokeDashoffset,
      }
    })
  }, [slices, circumference])

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between min-w-0 w-full max-w-full">
      {/* Title */}
      <div className="mb-1 sm:mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <svg className="w-4 h-4 text-blue-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
              <path d="M22 12A10 10 0 0 0 12 2v10z" />
            </svg>
            <span>สัดส่วนตามหมวดหมู่ (เดือนนี้)</span>
          </h3>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          แบ่งตามประเภทสินค้าและภาระผ่อนในเดือนนี้
        </p>
      </div>

      {!hasData ? (
        <div className="py-12 text-center text-xs text-slate-400">
          ไม่มีรายการผ่อนที่ต้องชำระในเดือนนี้
        </div>
      ) : (
        <>
          {/* Donut Chart */}
          <div className="relative flex items-center justify-center my-2 sm:my-3 h-40 sm:h-44">
            <svg viewBox="0 0 100 100" className="w-36 h-36 sm:w-40 sm:h-40 -rotate-90 transform">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth={strokeWidth}
              />
              {/* Slices */}
              {slicesWithOffsets.map((slice) => {
                const isHovered = hoveredSlice?.category === slice.category

                return (
                  <circle
                    key={slice.category}
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    className="transition-all duration-200 cursor-pointer"
                    onClick={() => setHoveredSlice(hoveredSlice?.category === slice.category ? null : slice)}
                    onMouseEnter={() => setHoveredSlice(slice)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                )
              })}
            </svg>

            {/* Donut Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
              {hoveredSlice ? (
                <>
                  <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[90px] block" title={hoveredSlice.category}>
                    {hoveredSlice.category}
                  </span>
                  <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 mt-0.5 tabular-nums tracking-tight" title={formatMoney(hoveredSlice.totalAmount)}>
                    {formatMoney(hoveredSlice.totalAmount)}
                  </span>
                  <span className="text-[10px] font-bold text-blue-600">
                    {hoveredSlice.percentage}%
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    รวมงวดเดือนนี้
                  </span>
                  <span className="text-[11px] sm:text-xs font-extrabold text-slate-900 mt-0.5 tabular-nums tracking-tight" title={formatMoney(totalMonthlyDue)}>
                    {formatMoney(totalMonthlyDue)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {slices.length} หมวด
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Legend / Breakdown List */}
          <div className="mt-1 pt-2 border-t border-slate-100 space-y-1 max-h-36 sm:max-h-40 overflow-y-auto pr-1 text-xs">
            {slices.map((slice) => {
              const icon = CATEGORY_ICONS[slice.category] || '🧾'
              const isHovered = hoveredSlice?.category === slice.category

              return (
                <div
                  key={slice.category}
                  onClick={() => setHoveredSlice(hoveredSlice?.category === slice.category ? null : slice)}
                  onMouseEnter={() => setHoveredSlice(slice)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className={`flex items-center justify-between p-2 sm:p-1.5 rounded-xl transition-all cursor-pointer select-none ${
                    isHovered
                      ? 'bg-blue-50/80 ring-1 ring-blue-200/80 font-bold'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate pr-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: slice.color }}
                    />
                    <span className="text-slate-700 truncate text-[11px] sm:text-xs">
                      {icon} {slice.category}
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
  )
}
