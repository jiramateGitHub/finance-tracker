import { useMemo, useState } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmModal } from '../../components/ui/ConfirmModal'
import { SummaryCard } from '../../components/ui/SummaryCard'
import { th } from '../../i18n/th'
import type { Budget, FinanceData, Goal } from '../../types/finance'
import { formatMoney, formatMonth } from '../../utils/formatters'
import { BudgetCard } from './BudgetCard'
import { BudgetFormModal } from './BudgetFormModal'
import { GoalCard } from './GoalCard'
import { GoalFormModal } from './GoalFormModal'
import {
  buildBudgetGoalInsights,
  calculateBudgetProgress,
  calculateGoalProgress,
  getBudgetGoalCategoryOptions,
  getMonthlyBudgets,
} from './budgetGoalCalculations'

type BudgetGoalSectionProps = {
  data: FinanceData
  selectedMonth: string
  onAddBudget: (budget: Budget) => void
  onUpdateBudget: (budgetId: string, patch: Partial<Budget>) => void
  onDeleteBudget: (budgetId: string) => void
  onAddGoal: (goal: Goal) => void
  onUpdateGoal: (goalId: string, patch: Partial<Goal>) => void
  onDeleteGoal: (goalId: string) => void
}

type BudgetModalState = {
  open: boolean
  budget: Budget | null
}

type GoalModalState = {
  open: boolean
  goal: Goal | null
}

const goalStatusOrder: Record<Goal['status'], number> = {
  active: 0,
  paused: 1,
  completed: 2,
}

const insightToneLabel = {
  income: 'ดี',
  expense: 'เกินงบ',
  warning: 'เตือน',
  active: 'กำลังทำ',
  neutral: 'ทั่วไป',
} as const

export function BudgetGoalSection({
  data,
  selectedMonth,
  onAddBudget,
  onUpdateBudget,
  onDeleteBudget,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
}: BudgetGoalSectionProps) {
  const [budgetModal, setBudgetModal] = useState<BudgetModalState>({ open: false, budget: null })
  const [goalModal, setGoalModal] = useState<GoalModalState>({ open: false, goal: null })
  const [deleteBudgetId, setDeleteBudgetId] = useState<string | null>(null)
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null)

  const categoryOptions = useMemo(() => getBudgetGoalCategoryOptions(data), [data])
  const monthlyBudgets = useMemo(() => getMonthlyBudgets(data.budgets, selectedMonth), [data.budgets, selectedMonth])
  const budgetProgress = useMemo(
    () => monthlyBudgets.map((budget) => calculateBudgetProgress(budget, data.transactions)),
    [monthlyBudgets, data.transactions],
  )
  const goals = useMemo(
    () => data.goals
      .slice()
      .sort((a, b) => goalStatusOrder[a.status] - goalStatusOrder[b.status] || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
    [data.goals],
  )
  const insights = useMemo(
    () => buildBudgetGoalInsights(data.budgets, data.goals, data.transactions, selectedMonth),
    [data.budgets, data.goals, data.transactions, selectedMonth],
  )

  const totalBudget = budgetProgress.reduce((sum, item) => sum + item.amount, 0)
  const totalUsed = budgetProgress.reduce((sum, item) => sum + item.used, 0)
  const totalRemaining = totalBudget - totalUsed
  const activeGoals = goals.filter((goal) => calculateGoalProgress(goal).displayStatus !== 'completed').length

  function openAddBudget(): void {
    setBudgetModal({ open: true, budget: null })
  }

  function openEditBudget(budget: Budget): void {
    setBudgetModal({ open: true, budget })
  }

  function closeBudgetModal(): void {
    setBudgetModal({ open: false, budget: null })
  }

  function submitBudget(budget: Budget): void {
    if (budgetModal.budget) {
      onUpdateBudget(budget.id, budget)
    } else {
      onAddBudget(budget)
    }
    closeBudgetModal()
  }

  function deleteBudget(budgetId: string): void {
    setDeleteBudgetId(budgetId)
  }

  function openAddGoal(): void {
    setGoalModal({ open: true, goal: null })
  }

  function openEditGoal(goal: Goal): void {
    setGoalModal({ open: true, goal })
  }

  function closeGoalModal(): void {
    setGoalModal({ open: false, goal: null })
  }

  function submitGoal(goal: Goal): void {
    if (goalModal.goal) {
      onUpdateGoal(goal.id, goal)
    } else {
      onAddGoal(goal)
    }
    closeGoalModal()
  }

  function deleteGoal(goalId: string): void {
    setDeleteGoalId(goalId)
  }

  function updateGoalAmount(goalId: string, amount: number): void {
    const goal = data.goals.find((item) => item.id === goalId)
    const patch: Partial<Goal> = { currentAmount: amount }
    if (goal && amount >= goal.targetAmount) patch.status = 'completed'
    if (goal?.status === 'completed' && amount < goal.targetAmount) patch.status = 'active'
    onUpdateGoal(goalId, patch)
  }

  const usedPercent = totalBudget > 0 ? Math.min(100, Math.round((totalUsed / totalBudget) * 100)) : undefined

  return (
    <div className="grid gap-4">
      <Card
        title={
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm shadow-teal-500/20">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <div>
              <span className="font-extrabold text-slate-900">งบประมาณและเป้าหมาย</span>
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <SummaryCard
            label="งบเดือนนี้"
            value={formatMoney(totalBudget)}
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
            }
            tone="balance"
            subValue={<span className="text-blue-700 font-semibold">{formatMonth(selectedMonth)}</span>}
          />

          <SummaryCard
            label="ใช้ไปแล้ว"
            value={formatMoney(totalUsed)}
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
            }
            tone="expense"
            subValue={<span>ใช้ไป {usedPercent !== undefined ? `${usedPercent}%` : 'ไม่มีงบ'}</span>}
            progress={usedPercent}
          />

          <SummaryCard
            label="คงเหลือ"
            value={formatMoney(totalRemaining)}
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            }
            tone={totalRemaining < 0 ? 'expense' : 'income'}
            subValue={
              <span className={totalRemaining >= 0 ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                {totalRemaining >= 0 ? 'อยู่ในกรอบงบประมาณ' : 'งบประมาณเกิน'}
              </span>
            }
          />

          <SummaryCard
            label="เป้าหมายที่ยังทำอยู่"
            value={`${activeGoals} เป้าหมาย`}
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
            }
            tone="violet"
            subValue={<span className="text-violet-700 font-semibold">กำลังสะสม</span>}
          />
        </div>

        <div className="mt-4 grid gap-2">
          {insights.length ? (
            insights.map((insight) => (
              <div key={insight.id} className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5 transition hover:bg-slate-100/60">
                <Badge tone={insight.tone}>{insightToneLabel[insight.tone]}</Badge>
                <p className="text-sm font-semibold leading-6 text-slate-700">{insight.text}</p>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-500">
              เดือนนี้ยังไม่มีงบหรือเป้าหมายที่ต้องดูแลเป็นพิเศษ
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card
          title={
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                  <line x1="16" x2="16" y1="2" y2="6" />
                  <line x1="8" x2="8" y1="2" y2="6" />
                  <line x1="3" x2="21" y1="10" y2="10" />
                </svg>
              </div>
              <span className="font-bold text-slate-900">งบประมาณรายเดือน</span>
            </div>
          }
          actions={
            <Button type="button" variant="primary" onClick={openAddBudget}>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>เพิ่มงบประมาณ</span>
              </span>
            </Button>
          }
        >
          {monthlyBudgets.length ? (
            <div className="grid gap-3">
              {monthlyBudgets.map((budget) => (
                <BudgetCard
                  key={budget.id}
                  budget={budget}
                  transactions={data.transactions}
                  onEdit={openEditBudget}
                  onDelete={deleteBudget}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-500">
              ยังไม่มีงบประมาณสำหรับ {formatMonth(selectedMonth)}
            </div>
          )}
        </Card>

        <Card
          title={
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
              </div>
              <span className="font-bold text-slate-900">เป้าหมาย</span>
            </div>
          }
          actions={
            <Button type="button" variant="primary" onClick={openAddGoal}>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>เพิ่มเป้าหมาย</span>
              </span>
            </Button>
          }
        >
          {goals.length ? (
            <div className="grid gap-3">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={openEditGoal}
                  onDelete={deleteGoal}
                  onUpdateAmount={updateGoalAmount}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-500">
              ยังไม่มีเป้าหมาย เพิ่มเป้าหมายแรกเพื่อเริ่มติดตาม
            </div>
          )}
        </Card>
      </div>

      {budgetModal.open && (
        <BudgetFormModal
          key={budgetModal.budget?.id ?? `budget-${selectedMonth}`}
          open={budgetModal.open}
          budget={budgetModal.budget}
          selectedMonth={selectedMonth}
          budgets={data.budgets}
          categoryOptions={categoryOptions}
          onClose={closeBudgetModal}
          onSubmit={submitBudget}
        />
      )}

      {goalModal.open && (
        <GoalFormModal
          key={goalModal.goal?.id ?? 'new-goal'}
          open={goalModal.open}
          goal={goalModal.goal}
          onClose={closeGoalModal}
          onSubmit={submitGoal}
        />
      )}

      <ConfirmModal
        open={deleteBudgetId !== null}
        title={th.budget.deleteTitle}
        confirmLabel={th.common.delete}
        destructive
        onConfirm={() => {
          if (deleteBudgetId) onDeleteBudget(deleteBudgetId)
        }}
        onClose={() => setDeleteBudgetId(null)}
      />

      <ConfirmModal
        open={deleteGoalId !== null}
        title={th.goal.deleteTitle}
        confirmLabel={th.common.delete}
        destructive
        onConfirm={() => {
          if (deleteGoalId) onDeleteGoal(deleteGoalId)
        }}
        onClose={() => setDeleteGoalId(null)}
      />
    </div>
  )
}
