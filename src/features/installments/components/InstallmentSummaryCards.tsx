import { formatMoney, formatMonth } from '../../../utils/formatters'
import type { InstallmentDashboardMetrics, InstallmentSummary } from '../utils/installmentPlans'

type InstallmentSummaryCardsProps = {
  metrics?: InstallmentDashboardMetrics
  summary?: InstallmentSummary
}

export function InstallmentSummaryCards({ metrics, summary }: InstallmentSummaryCardsProps) {
  // If full dashboard metrics are provided (preferred from installment_tracker.html reference)
  if (metrics) {
    const candidate = metrics.nextPayoffCandidate

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-0 w-full max-w-full">
        {/* CARD 1: ยอดที่ต้องจ่ายเดือนนี้ */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between min-w-0 w-full">
          <div>
            <div className="flex items-center justify-between gap-2 text-slate-500 mb-1.5 sm:mb-2 min-w-0">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider truncate">ต้องจ่ายเดือนนี้</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" y1="21" x2="21" y2="21" />
                  <path d="M8 14h.01" />
                  <path d="M12 14h.01" />
                  <path d="M16 14h.01" />
                  <path d="M8 18h.01" />
                  <path d="M12 18h.01" />
                </svg>
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 truncate tabular-nums leading-tight" title={formatMoney(metrics.totalDueThisMonth)}>
              {formatMoney(metrics.totalDueThisMonth)}
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] sm:text-xs text-slate-500 mb-1.5 font-medium tabular-nums min-w-0">
              <span className="min-w-0">จ่ายแล้ว: <strong className="text-emerald-600 font-bold">{formatMoney(metrics.totalPaidThisMonth)}</strong></span>
              <span className="min-w-0 text-right ml-auto">เหลือ: <strong className="text-rose-600 font-bold">{formatMoney(metrics.remainingThisMonth)}</strong></span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${metrics.paidMonthPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* CARD 2: หนี้คงเหลือรวม */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between min-w-0 w-full">
          <div>
            <div className="flex items-center justify-between gap-2 text-slate-500 mb-1.5 sm:mb-2 min-w-0">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider truncate">หนี้ผ่อนคงเหลือรวม</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2V5z" />
                  <path d="M2 9v1c0 1.1.9 2 2 2h1" />
                  <circle cx="16" cy="11" r="1" />
                </svg>
              </div>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 truncate tabular-nums leading-tight" title={formatMoney(metrics.totalLifetimeDebt)}>
              {formatMoney(metrics.totalLifetimeDebt)}
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] sm:text-xs text-slate-500 mb-1.5 font-medium tabular-nums min-w-0">
              <span className="min-w-0">ผ่อนไปแล้ว <strong className="font-bold text-slate-800">{metrics.lifetimePercent}%</strong></span>
              <span className="min-w-0 text-right ml-auto">ยอดเดิม <strong className="font-semibold text-slate-600">{formatMoney(metrics.totalLifetimeOriginal)}</strong></span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${metrics.lifetimePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* CARD 3: รายการผ่อนเดือนนี้ */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between min-w-0 w-full">
          <div>
            <div className="flex items-center justify-between gap-2 text-slate-500 mb-1.5 sm:mb-2 min-w-0">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider truncate">รายการผ่อนเดือนนี้</span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums leading-tight">
                {metrics.activeCountThisMonth}
              </span>
              <span className="text-xs text-slate-500 font-medium">รายการ</span>
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center gap-1.5 tabular-nums min-w-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              จ่ายแล้ว <b>{metrics.paidCountThisMonth}</b>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              รอชำระ <b>{metrics.pendingCountThisMonth}</b>
            </span>
            {metrics.overdueCountThisMonth > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                เกินกำหนด <b>{metrics.overdueCountThisMonth}</b>
              </span>
            )}
          </div>
        </div>

        {/* CARD 4: ปลดหนี้ชิ้นถัดไป */}
        <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-white p-3.5 sm:p-5 shadow-xs transition hover:shadow-md flex flex-col justify-between min-w-0 w-full">
          <div>
            <div className="flex items-center justify-between gap-2 text-emerald-800 mb-1.5 sm:mb-2 min-w-0">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-1 min-w-0 flex-1">
                <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="6" />
                  <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                </svg>
                <span className="truncate">ปลดหนี้ชิ้นถัดไป</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                {candidate ? (candidate.remainingMonths === 1 ? 'งวดสุดท้ายแล้ว!' : `อีก ${candidate.remainingMonths} งวด`) : 'เสร็จสิ้น'}
              </span>
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 truncate" title={candidate?.plan.name ?? 'ไม่มีหนี้คงเหลือ'}>
              {candidate ? candidate.plan.name : 'ไม่มีหนี้คงเหลือ 🎉'}
            </div>
            <div className="mt-0.5 sm:mt-1 text-xs text-slate-500 line-clamp-2">
              {candidate
                ? `เหลืออีก ${candidate.remainingMonths} งวด (หมด ${formatMonth(candidate.endMonth)})`
                : 'ยินดีด้วย! คุณไม่มีภาระผ่อนคงค้างในระบบ'}
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 text-xs font-semibold text-emerald-700 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-emerald-100 pt-2 tabular-nums min-w-0">
            {candidate ? (
              <>
                <span className="text-emerald-700 font-medium min-w-0">ภาระจะลดลงทันที:</span>
                <strong className="font-extrabold text-emerald-800 shrink-0 text-right min-w-0 ml-auto">{formatMoney(candidate.monthlyAmount)}/ด.</strong>
              </>
            ) : (
              <span className="text-emerald-700">พร้อมสำหรับการวางแผนเป้าหมายใหม่</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Fallback if only summary object is provided
  if (!summary) return null

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4 min-w-0 w-full max-w-full">
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 min-w-0">
        <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase block truncate">จำนวนแผน</span>
        <div className="mt-1 text-base sm:text-2xl font-bold text-slate-900 tabular-nums truncate leading-tight">{summary.planCount}</div>
      </div>
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3.5 sm:p-4 min-w-0">
        <span className="text-[11px] sm:text-xs font-semibold text-emerald-700 uppercase block truncate">จ่ายแล้วทั้งหมด</span>
        <div className="mt-1 text-base sm:text-2xl font-bold text-emerald-700 tabular-nums truncate leading-tight" title={formatMoney(summary.totalPaid)}>{formatMoney(summary.totalPaid)}</div>
      </div>
      <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-3.5 sm:p-4 min-w-0">
        <span className="text-[11px] sm:text-xs font-semibold text-rose-700 uppercase block truncate">คงเหลือ</span>
        <div className="mt-1 text-base sm:text-2xl font-bold text-rose-700 tabular-nums truncate leading-tight" title={formatMoney(summary.totalRemaining)}>{formatMoney(summary.totalRemaining)}</div>
      </div>
      <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-3.5 sm:p-4 min-w-0">
        <span className="text-[11px] sm:text-xs font-semibold text-blue-700 uppercase block truncate">ยอดต่อเดือน</span>
        <div className="mt-1 text-base sm:text-2xl font-bold text-blue-700 tabular-nums truncate leading-tight" title={formatMoney(summary.totalMonthly)}>{formatMoney(summary.totalMonthly)}</div>
      </div>
    </div>
  )
}
