import { ActionButton } from '../../../components/ui/ActionButton'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import type { RecurringRule } from '../../../types/finance'
import { formatMoney } from '../../../utils/formatters'
import {
  RECURRING_TYPE_CONFIG,
  type RecurringMonthlyInfo,
} from '../utils/recurringBills'

export type RecurringBillCardProps = {
  rule: RecurringRule
  info: RecurringMonthlyInfo
  selectedMonth: string
  onTogglePay: (rule: RecurringRule, isPaid: boolean) => void
  onQuickPay: (rule: RecurringRule) => void
  onEdit: (rule: RecurringRule) => void
  onDelete: (ruleId: string) => void
}

export function RecurringBillCard({
  rule,
  info,
  onTogglePay,
  onQuickPay,
  onEdit,
  onDelete,
}: RecurringBillCardProps) {
  const typeConfig =
    rule.type && rule.type in RECURRING_TYPE_CONFIG
      ? RECURRING_TYPE_CONFIG[rule.type as keyof typeof RECURRING_TYPE_CONFIG]
      : RECURRING_TYPE_CONFIG.other

  const isPaid = info.isPaid
  const isInactive = info.status === 'inactive'

  let statusBadge: React.ReactNode
  if (isPaid) {
    statusBadge = <Badge tone="income">จ่ายแล้ว ✓</Badge>
  } else if (isInactive) {
    statusBadge = (
      <Badge tone="neutral">
        {rule.isActive === false ? 'ปิดใช้งาน' : 'อยู่นอกช่วงเวลา'}
      </Badge>
    )
  } else if (info.isOverdue) {
    statusBadge = (
      <Badge tone="expense" className="animate-pulse">
        เกินกำหนด {Math.abs(info.daysUntilDue ?? 0)} วัน
      </Badge>
    )
  } else if (info.isDueSoon) {
    statusBadge = (
      <Badge tone="warning">
        {info.daysUntilDue === 0 ? 'ครบกำหนดวันนี้!' : `อีก ${info.daysUntilDue} วัน`}
      </Badge>
    )
  } else {
    statusBadge = <Badge tone="neutral">รอชำระ (วันที่ {info.actualDueDay})</Badge>
  }

  return (
    <article className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between h-full">
      <div>
        {/* 1. Top Strip: Type Pill & Status Badge */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-xl bg-slate-100 text-slate-700 truncate max-w-[160px] sm:max-w-none">
              <span>{typeConfig.icon}</span>
              <span className="truncate">{typeConfig.label}</span>
            </span>
            {rule.category && (
              <span className="text-[11px] font-medium text-slate-500 truncate max-w-[120px]">
                {rule.category}
              </span>
            )}
          </div>
          {statusBadge}
        </div>

        {/* 2. Title & Cycle Metadata */}
        <div className="mb-3">
          <h3
            className={`font-extrabold text-sm sm:text-base text-slate-900 line-clamp-2 leading-snug ${
              isPaid ? 'line-through text-slate-500' : ''
            }`}
            title={rule.name || rule.title}
          >
            {rule.name || rule.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5 text-slate-400 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" y1="21" x2="21" y2="21" />
              </svg>
              ครบกำหนดวันที่ <strong>{info.actualDueDay}</strong>
            </span>
            {info.actualStatementDay && (
              <span className="inline-flex items-center gap-1 text-slate-500">
                <span className="text-slate-300">•</span>
                ตัดรอบวันที่ <strong>{info.actualStatementDay}</strong>
              </span>
            )}
          </div>
        </div>

        {/* 3. 3-Column Financial Mini Stats */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 bg-slate-50/90 rounded-xl p-2 sm:p-3 border border-slate-100 mb-3 text-center sm:text-left">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block truncate">
              ยอดชำระ/เดือน
            </span>
            <span
              className={`text-[11px] sm:text-sm font-extrabold block truncate tabular-nums mt-0.5 tracking-tight ${
                isPaid ? 'text-slate-500' : 'text-blue-700'
              }`}
              title={formatMoney(rule.amount)}
            >
              {formatMoney(rule.amount)}
            </span>
          </div>

          <div className="min-w-0 border-x border-slate-200/60 px-1 sm:px-2">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block truncate">
              รูปแบบยอด
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-slate-700 block truncate mt-0.5">
              {rule.amountType === 'variable' ? (
                <span className="text-amber-600 font-bold">~ ผันแปร</span>
              ) : (
                'คงที่'
              )}
            </span>
          </div>

          <div className="min-w-0">
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block truncate">
              วันครบกำหนด
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-slate-800 block truncate mt-0.5">
              วันที่ {info.actualDueDay}
            </span>
          </div>
        </div>

        {/* 4. Note if any */}
        {rule.note && (
          <div className="text-[11px] text-slate-500 bg-slate-50/80 px-2.5 py-1.5 rounded-lg mb-3 line-clamp-2 italic border border-slate-100">
            "{rule.note}"
          </div>
        )}
      </div>

      {/* 5. Card Actions Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Left: Pay Actions */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <ActionButton
            action="pay"
            className="flex-1 min-h-9"
            isPaid={isPaid}
            disabled={isInactive && !isPaid}
            label={
              isPaid
                ? 'จ่ายแล้ว ✓'
                : isInactive
                  ? rule.isActive === false
                    ? 'ปิดใช้งาน'
                    : 'นอกช่วงเวลา'
                  : '1-Click จ่าย'
            }
            onClick={() => onTogglePay(rule, isPaid)}
          />

          {!isPaid && !isInactive && rule.amountType === 'variable' && (
            <Button
              type="button"
              variant="light"
              size="sm"
              onClick={() => onQuickPay(rule)}
              className="text-xs min-h-9 shrink-0"
              title="จ่ายโดยระบุยอดจริงในบิลเดือนนี้"
            >
              ระบุยอด
            </Button>
          )}
        </div>

        {/* Right: Secondary Actions Cluster */}
        <div className="flex items-center gap-1 shrink-0">
          <ActionButton
            action="edit"
            iconOnly
            title="แก้ไขบิล"
            onClick={() => onEdit(rule)}
          />
          <ActionButton
            action="delete"
            iconOnly
            title="ลบบิล"
            onClick={() => onDelete(rule.id)}
          />
        </div>
      </div>
    </article>
  )
}
