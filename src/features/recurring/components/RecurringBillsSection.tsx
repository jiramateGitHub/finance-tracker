import { useMemo, useState } from 'react'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { ConfirmModal } from '../../../components/ui/ConfirmModal'
import { IconPlus } from '../../../components/ui/Icons'
import { SelectField } from '../../../components/ui/SelectField'
import { SummaryCard } from '../../../components/ui/SummaryCard'
import { TextInput } from '../../../components/ui/TextInput'
import { ViewSwitcher } from '../../../components/ui/ViewSwitcher'
import type { RecurringRule } from '../../../types/finance'
import { formatMoney, formatMonth } from '../../../utils/formatters'
import { QuickPayBillModal } from './QuickPayBillModal'
import { RecurringBillCard } from './RecurringBillCard'
import { RecurringBillModal } from './RecurringBillModal'
import { RecurringBillTable } from './RecurringBillTable'
import {
  createDefaultRecurringFilters,
  filterRecurringRules,
  getRecurringDashboardMetrics,
  type RecurringFilterStatus,
  type RecurringFilters,
} from '../utils/recurringBills'

export type RecurringBillsSectionProps = {
  rules: RecurringRule[]
  selectedMonth: string
  categoryOptions: string[]
  onAddRule: (rule: RecurringRule) => void
  onUpdateRule: (ruleId: string, patch: Partial<RecurringRule>) => void
  onDeleteRule: (ruleId: string) => void
  onPayRule: (
    ruleId: string,
    monthKey: string,
    options?: {
      createTransaction: boolean
      amount: number
      date: string
      note?: string
    },
  ) => void
  onUnpayRule: (ruleId: string, monthKey: string) => void
}

export function RecurringBillsSection({
  rules,
  selectedMonth,
  categoryOptions,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
  onPayRule,
  onUnpayRule,
}: RecurringBillsSectionProps) {
  const [filters, setFilters] = useState<RecurringFilters>(createDefaultRecurringFilters)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [modalState, setModalState] = useState<{ open: boolean; rule: RecurringRule | null }>({
    open: false,
    rule: null,
  })
  const [quickPayRule, setQuickPayRule] = useState<RecurringRule | null>(null)
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null)

  const metrics = useMemo(
    () => getRecurringDashboardMetrics(rules, selectedMonth),
    [rules, selectedMonth],
  )

  const filteredItems = useMemo(
    () => filterRecurringRules(rules, filters, selectedMonth),
    [rules, filters, selectedMonth],
  )

  function handleTogglePay(rule: RecurringRule, isPaid: boolean): void {
    if (isPaid) {
      onUnpayRule(rule.id, selectedMonth)
    } else {
      if (rule.amountType === 'variable') {
        setQuickPayRule(rule)
      } else {
        onPayRule(rule.id, selectedMonth, {
          createTransaction: rule.autoGenerateTransaction !== false,
          amount: rule.amount,
          date: '',
        })
      }
    }
  }

  const paidProgressPercent =
    metrics.activeCount > 0
      ? Math.round((metrics.paidCount / metrics.activeCount) * 100)
      : 0

  return (
    <div className="space-y-4">
      {/* ==================== SUMMARY CARDS ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard
          compact
          label="ยอดบิลประจำเดือนนี้"
          value={formatMoney(metrics.totalAmount)}
          tone="primary"
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <line x1="2" x2="22" y1="10" y2="10" />
            </svg>
          }
          subValue={
            <span className="text-slate-500 font-medium">
              รวม {metrics.activeCount} บิล ({formatMonth(selectedMonth)})
            </span>
          }
        />

        <SummaryCard
          compact
          label="ชำระแล้ว"
          value={formatMoney(metrics.paidAmount)}
          tone="income"
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          }
          progress={paidProgressPercent}
          subValue={
            <span className="text-emerald-600 font-medium">
              {metrics.paidCount} บิลเรียบร้อย ({paidProgressPercent}%)
            </span>
          }
        />

        <SummaryCard
          compact
          label="คงค้างรอจ่าย"
          value={formatMoney(metrics.unpaidAmount)}
          tone="due"
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
          subValue={
            <span className="text-amber-600 font-medium">
              รอชำระ {metrics.unpaidCount} บิล
            </span>
          }
        />

        <SummaryCard
          compact
          label="ด่วน / เกินกำหนด"
          value={`${metrics.overdueCount + metrics.dueSoonCount} บิล`}
          tone="expense"
          icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <line x1="12" x2="12" y1="9" y2="13" />
              <line x1="12" x2="12.01" y1="17" y2="17" />
            </svg>
          }
          subValue={
            <span className="text-rose-600 font-medium">
              เกินกำหนด {metrics.overdueCount} • ใกล้ถึง {metrics.dueSoonCount}
            </span>
          }
        />
      </div>

      {/* ==================== FILTERS & ACTIONS BAR ==================== */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[260px]">
          <div className="w-full sm:w-60">
            <TextInput
              value={filters.keyword}
              onChange={(e) => setFilters((prev) => ({ ...prev, keyword: e.target.value }))}
              placeholder="ค้นหาชื่อบิล, หมายเหตุ..."
            />
          </div>

          <div className="w-36">
            <SelectField
              value={filters.type}
              onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
              options={[
                { value: 'all', label: 'ทุกประเภท' },
                { value: 'credit_card', label: '💳 บัตรเครดิต' },
                { value: 'utility', label: '⚡ สาธารณูปโภค' },
                { value: 'subscription', label: '🍿 บริการรายเดือน' },
                { value: 'loan', label: '🏦 สินเชื่อ' },
                { value: 'insurance', label: '🛡️ ประกัน' },
                { value: 'other', label: '📄 อื่นๆ' },
              ]}
            />
          </div>

          <div className="w-36">
            <SelectField
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value as RecurringFilterStatus }))
              }
              options={[
                { value: 'all', label: 'ทุกสถานะ' },
                { value: 'unpaid', label: '⏳ รอชำระ' },
                { value: 'paid', label: '✓ ชำระแล้ว' },
                { value: 'overdue', label: '🚨 เกินกำหนด' },
                { value: 'dueSoon', label: '⚠️ ใกล้ครบกำหนด' },
                { value: 'inactive', label: '⛔ ปิดใช้งาน / สิ้นสุด' },
              ]}
            />
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          icon={<IconPlus size={16} />}
          onClick={() => setModalState({ open: true, rule: null })}
        >
          <span>เพิ่มบิลประจำ</span>
        </Button>
      </div>

      {/* ==================== BILL VIEW (CARDS / TABLE) ==================== */}
      <Card
        title={
          <div className="flex items-center gap-2.5">
            <span>
              {viewMode === 'cards'
                ? 'รายการบิลประจำ & บัตรเครดิต'
                : 'ตารางภาพรวมบิลประจำ'}
            </span>
            <Badge tone="neutral">{filteredItems.length} รายการ</Badge>
          </div>
        }
        actions={
          <ViewSwitcher<'cards' | 'table'>
            activeView={viewMode}
            onViewChange={setViewMode}
            options={[
              { id: 'cards', label: 'การ์ด', icon: 'cards' },
              { id: 'table', label: 'ตาราง', icon: 'table' },
            ]}
          />
        }
      >
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
            <div className="text-3xl mb-2">📋</div>
            <p className="text-sm font-bold text-slate-700">ไม่พบบิลประจำตามเงื่อนไขที่เลือก</p>
            <p className="text-xs text-slate-500 mt-1">
              ลองปรับตัวกรอง หรือเพิ่มบิลประจำใหม่เพื่อเริ่มติดตาม
            </p>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredItems.map(({ rule, info }) => (
              <RecurringBillCard
                key={rule.id}
                rule={rule}
                info={info}
                selectedMonth={selectedMonth}
                onTogglePay={handleTogglePay}
                onQuickPay={(targetRule) => setQuickPayRule(targetRule)}
                onEdit={(targetRule) => setModalState({ open: true, rule: targetRule })}
                onDelete={(targetRuleId) => setDeleteRuleId(targetRuleId)}
              />
            ))}
          </div>
        ) : (
          <RecurringBillTable
            items={filteredItems}
            selectedMonth={selectedMonth}
            onTogglePay={handleTogglePay}
            onQuickPay={(targetRule) => setQuickPayRule(targetRule)}
            onEdit={(targetRule) => setModalState({ open: true, rule: targetRule })}
            onDelete={(targetRuleId) => setDeleteRuleId(targetRuleId)}
          />
        )}
      </Card>

      {/* Add / Edit Bill Modal */}
      {modalState.open && (
        <RecurringBillModal
          open={modalState.open}
          rule={modalState.rule}
          categoryOptions={categoryOptions}
          onClose={() => setModalState({ open: false, rule: null })}
          onSubmit={(savedRule) => {
            if (modalState.rule) {
              onUpdateRule(savedRule.id, savedRule)
            } else {
              onAddRule(savedRule)
            }
          }}
        />
      )}

      {/* Quick Pay Modal */}
      {quickPayRule && (
        <QuickPayBillModal
          key={quickPayRule.id}
          open={Boolean(quickPayRule)}
          rule={quickPayRule}
          selectedMonth={selectedMonth}
          onClose={() => setQuickPayRule(null)}
          onPay={onPayRule}
        />
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={deleteRuleId !== null}
        title="ลบบิลประจำนี้?"
        confirmLabel="ลบรายการ"
        destructive
        onConfirm={() => {
          if (deleteRuleId) onDeleteRule(deleteRuleId)
        }}
        onClose={() => setDeleteRuleId(null)}
      />
    </div>
  )
}
