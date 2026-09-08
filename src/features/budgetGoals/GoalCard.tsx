import { useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { th } from '../../i18n/th'
import type { Goal } from '../../types/finance'
import { formatMoney, parseAmountSafe } from '../../utils/formatters'
import { calculateGoalProgress } from './budgetGoalCalculations'

type GoalCardProps = {
  goal: Goal
  onEdit: (goal: Goal) => void
  onDelete: (goalId: string) => void
  onUpdateAmount: (goalId: string, amount: number) => void
}

const statusTone: Record<Goal['status'], 'income' | 'warning' | 'active'> = {
  active: 'active',
  paused: 'warning',
  completed: 'income',
}

const statusLabel: Record<Goal['status'], string> = {
  active: th.goal.active,
  paused: th.goal.paused,
  completed: th.goal.completed,
}

export function GoalCard({ goal, onEdit, onDelete, onUpdateAmount }: GoalCardProps) {
  const progress = calculateGoalProgress(goal)
  const [draft, setDraft] = useState({ goalId: goal.id, amount: String(goal.currentAmount) })
  const draftAmount = draft.goalId === goal.id ? draft.amount : String(goal.currentAmount)
  const parsedDraft = parseAmountSafe(draftAmount, Number.NaN)
  const amountChanged = Number.isFinite(parsedDraft) && parsedDraft >= 0 && parsedDraft !== goal.currentAmount

  function saveAmount(): void {
    if (!amountChanged) return
    onUpdateAmount(goal.id, parsedDraft)
  }

  return (
    <article className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-extrabold text-slate-900">{goal.name}</h3>
            <Badge tone={statusTone[progress.displayStatus]}>{statusLabel[progress.displayStatus]}</Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {goal.targetDate ? `วันที่เป้าหมาย ${goal.targetDate}` : 'ยังไม่มีวันที่เป้าหมาย'}{goal.note ? ` · ${goal.note}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={() => onEdit(goal)}>{th.common.edit}</Button>
          <Button type="button" size="sm" variant="danger" onClick={() => onDelete(goal.id)}>{th.common.delete}</Button>
        </div>
      </header>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-bold text-slate-500">เป้าหมาย</div>
          <div className="mt-1 text-base font-extrabold text-slate-900">{formatMoney(progress.targetAmount)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-bold text-slate-500">ปัจจุบัน</div>
          <div className="mt-1 text-base font-extrabold text-blue-700">{formatMoney(progress.currentAmount)}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-bold text-slate-500">คงเหลือ</div>
          <div className="mt-1 text-base font-extrabold text-emerald-700">{formatMoney(progress.remaining)}</div>
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
          <span>เก็บแล้ว {progress.percent}%</span>
          <span>{progress.isCompleted ? th.goal.completed : 'กำลังเก็บ'}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-500" style={{ width: `${progress.percent}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
        <label className="grid min-w-44 flex-1 gap-1 text-xs font-semibold text-slate-600">
          อัปเดตยอดปัจจุบัน
          <input
            className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-xs outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
            inputMode="decimal"
            type="text"
            value={draftAmount}
            onChange={(event) => setDraft({ goalId: goal.id, amount: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                saveAmount()
              }
            }}
          />
        </label>
        <Button type="button" size="sm" variant="primary" disabled={!amountChanged} onClick={saveAmount}>
          บันทึกยอด
        </Button>
      </div>
    </article>
  )
}
