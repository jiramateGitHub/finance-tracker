import { ActionButton } from '../../../components/ui/ActionButton'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import type { RecurringRule } from '../../../types/finance'
import { formatMoney } from '../../../utils/formatters'
import {
  RECURRING_TYPE_CONFIG,
  type RecurringMonthlyInfo,
} from '../utils/recurringBills'

export type RecurringBillTableProps = {
  items: Array<{
    rule: RecurringRule
    info: RecurringMonthlyInfo
  }>
  selectedMonth: string
  onTogglePay: (rule: RecurringRule, isPaid: boolean) => void
  onQuickPay: (rule: RecurringRule) => void
  onEdit: (rule: RecurringRule) => void
  onDelete: (ruleId: string) => void
}

function getStatusBadge(info: RecurringMonthlyInfo, rule: RecurringRule): React.ReactNode {
  if (info.isPaid) {
    return <Badge tone="income">จ่ายแล้ว ✓</Badge>
  }
  if (info.status === 'inactive') {
    return (
      <Badge tone="neutral">
        {rule.isActive === false ? 'ปิดใช้งาน' : 'อยู่นอกช่วงเวลา'}
      </Badge>
    )
  }
  if (info.isOverdue) {
    return (
      <Badge tone="expense" className="animate-pulse">
        เกินกำหนด {Math.abs(info.daysUntilDue ?? 0)} วัน
      </Badge>
    )
  }
  if (info.isDueSoon) {
    return (
      <Badge tone="warning">
        {info.daysUntilDue === 0 ? 'ครบกำหนดวันนี้!' : `อีก ${info.daysUntilDue} วัน`}
      </Badge>
    )
  }
  return <Badge tone="neutral">รอชำระ (วันที่ {info.actualDueDay})</Badge>
}

export function RecurringBillTable({
  items,
  onTogglePay,
  onQuickPay,
  onEdit,
  onDelete,
}: RecurringBillTableProps) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
        ยังไม่พบบิลประจำตามเงื่อนไขที่เลือก
      </div>
    )
  }

  return (
    <>
      {/* 1. Mobile Card Fallback (md:hidden) */}
      <div className="space-y-3 md:hidden">
        {items.map(({ rule, info }) => {
          const typeConfig =
            rule.type && rule.type in RECURRING_TYPE_CONFIG
              ? RECURRING_TYPE_CONFIG[rule.type as keyof typeof RECURRING_TYPE_CONFIG]
              : RECURRING_TYPE_CONFIG.other

          const isPaid = info.isPaid
          const isInactive = info.status === 'inactive'
          const statusBadge = getStatusBadge(info, rule)

          return (
            <div
              key={rule.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-3"
            >
              {/* Top: Name, Type, Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4
                    className={`font-bold text-sm leading-snug line-clamp-2 ${
                      isPaid ? 'line-through text-slate-500' : 'text-slate-900'
                    }`}
                    title={rule.name || rule.title}
                  >
                    {rule.name || rule.title}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 flex-wrap">
                    <span>{typeConfig.icon}</span>
                    <span className="font-semibold text-slate-700">{typeConfig.label}</span>
                    {rule.category && <span>• {rule.category}</span>}
                  </div>
                </div>
                <div className="shrink-0">{statusBadge}</div>
              </div>

              {/* Middle: 3-column stats */}
              <div className="grid grid-cols-3 gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-100 text-center">
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 font-medium block truncate">
                    ยอดชำระ
                  </span>
                  <span
                    className={`text-[11px] sm:text-xs font-bold block truncate tabular-nums tracking-tight ${
                      isPaid ? 'text-slate-500' : 'text-blue-700'
                    }`}
                  >
                    {formatMoney(rule.amount)}
                  </span>
                </div>
                <div className="min-w-0 border-x border-slate-200/60 px-1">
                  <span className="text-[10px] text-slate-400 font-medium block truncate">
                    ประเภทยอด
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-700 block truncate">
                    {rule.amountType === 'variable' ? 'ผันแปร' : 'คงที่'}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] text-slate-400 font-medium block truncate">
                    วันครบกำหนด
                  </span>
                  <span className="text-[11px] sm:text-xs font-bold text-slate-800 block truncate">
                    วันที่ {info.actualDueDay}
                  </span>
                </div>
              </div>

              {/* Cycle Info / Note if present */}
              {(info.actualStatementDay || rule.note) && (
                <div className="text-[11px] text-slate-500 flex flex-col gap-1 px-1">
                  {info.actualStatementDay && (
                    <span>ตัดรอบบิล: วันที่ {info.actualStatementDay}</span>
                  )}
                  {rule.note && <span className="italic">"{rule.note}"</span>}
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <ActionButton
                    action="pay"
                    className="flex-1 min-h-9"
                    isPaid={isPaid}
                    disabled={isInactive && !isPaid}
                    label={
                      isPaid
                        ? '✓ จ่ายแล้ว'
                        : isInactive
                          ? rule.isActive === false
                            ? 'ปิดใช้งาน'
                            : 'นอกช่วง'
                          : 'จ่ายบิลนี้'
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
                    >
                      ระบุยอด
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <ActionButton
                    action="edit"
                    iconOnly
                    title="แก้ไข"
                    onClick={() => onEdit(rule)}
                  />
                  <ActionButton
                    action="delete"
                    iconOnly
                    title="ลบ"
                    onClick={() => onDelete(rule.id)}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 2. Full Table View for md+ (hidden md:block) */}
      <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">ชื่อบิล / ประเภท</th>
                <th className="py-3 px-3">ประเภทยอด</th>
                <th className="py-3 px-3">วันตัดรอบ</th>
                <th className="py-3 px-3">วันครบกำหนด</th>
                <th className="py-3 px-3">สถานะเดือนนี้</th>
                <th className="py-3 px-3 text-right">ยอดชำระ</th>
                <th className="py-3 px-4 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(({ rule, info }) => {
                const typeConfig =
                  rule.type && rule.type in RECURRING_TYPE_CONFIG
                    ? RECURRING_TYPE_CONFIG[rule.type as keyof typeof RECURRING_TYPE_CONFIG]
                    : RECURRING_TYPE_CONFIG.other

                const isPaid = info.isPaid
                const isInactive = info.status === 'inactive'
                const statusBadge = getStatusBadge(info, rule)

                return (
                  <tr key={rule.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Name & Category */}
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div
                        className={`font-bold truncate max-w-[220px] ${
                          isPaid ? 'line-through text-slate-400' : ''
                        }`}
                        title={rule.name || rule.title}
                      >
                        {rule.name || rule.title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal flex items-center gap-1.5 mt-0.5">
                        <span>{typeConfig.icon}</span>
                        <span>{typeConfig.label}</span>
                        {rule.category && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[120px]">{rule.category}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Amount Type */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {rule.amountType === 'variable' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                          ~ ผันแปร
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600">
                          คงที่
                        </span>
                      )}
                    </td>

                    {/* Statement Day */}
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {info.actualStatementDay ? (
                        <span>วันที่ {info.actualStatementDay}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Due Day */}
                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      <span className="font-medium">วันที่ {info.actualDueDay}</span>
                    </td>

                    {/* Status this month */}
                    <td className="py-3 px-3 whitespace-nowrap">{statusBadge}</td>

                    {/* Amount */}
                    <td
                      className={`py-3 px-3 text-right font-bold whitespace-nowrap tabular-nums ${
                        isPaid ? 'text-slate-400' : 'text-blue-700'
                      }`}
                    >
                      {formatMoney(rule.amount)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Quick Pay */}
                        <ActionButton
                          action="pay"
                          size="sm"
                          isPaid={isPaid}
                          disabled={isInactive && !isPaid}
                          label={
                            isPaid
                              ? 'จ่ายแล้ว'
                              : isInactive
                                ? rule.isActive === false
                                  ? 'ปิดอยู่'
                                  : 'นอกช่วง'
                                : 'จ่าย'
                          }
                          onClick={() => onTogglePay(rule, isPaid)}
                        />

                        {!isPaid && !isInactive && rule.amountType === 'variable' && (
                          <Button
                            type="button"
                            variant="light"
                            size="sm"
                            onClick={() => onQuickPay(rule)}
                            className="text-xs min-h-9 px-2.5"
                            title="ระบุยอดจริงในบิล"
                          >
                            ระบุยอด
                          </Button>
                        )}

                        <ActionButton
                          action="edit"
                          size="sm"
                          iconOnly
                          title="แก้ไข"
                          onClick={() => onEdit(rule)}
                        />
                        <ActionButton
                          action="delete"
                          size="sm"
                          iconOnly
                          title="ลบ"
                          onClick={() => onDelete(rule.id)}
                        />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
