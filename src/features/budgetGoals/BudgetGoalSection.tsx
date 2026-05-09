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

  return (
    <div className="grid gap-4">
      <Card
        title="งบประมาณและเป้าหมาย"
        description={`สัญญาณประจำ ${formatMonth(selectedMonth)} จากงบ เป้าหมาย และรายการรายเดือน`}
      >
        <div className="grid gap-3 lg:grid-cols-4">
          <SummaryCard label="งบเดือนนี้" value={formatMoney(totalBudget)} icon="B" tone="balance" />
          <SummaryCard label="ใช้ไปแล้ว" value={formatMoney(totalUsed)} icon="U" tone="expense" />
          <SummaryCard label="คงเหลือ" value={formatMoney(totalRemaining)} icon="R" tone={totalRemaining < 0 ? 'expense' : 'income'} />
          <SummaryCard label="เป้าหมายที่ยังทำอยู่" value={activeGoals} icon="G" tone="violet" />
        </div>

        <div className="mt-4 grid gap-2">
          {insights.length ? (
            insights.map((insight) => (
              <div key={insight.id} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Badge tone={insight.tone}>{insight.tone}</Badge>
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
          title="งบประมาณรายเดือน"
          description="หนึ่งหมวดมีงบได้หนึ่งรายการต่อเดือน ใช้ยอดจากรายจ่ายของเดือนที่เลือก"
          actions={<Button type="button" variant="primary" onClick={openAddBudget}>เพิ่มงบประมาณ</Button>}
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
          title="เป้าหมาย"
          description="ติดตามความคืบหน้าและอัปเดตยอดปัจจุบันได้จากหน้ารายเดือน"
          actions={<Button type="button" variant="primary" onClick={openAddGoal}>เพิ่มเป้าหมาย</Button>}
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
