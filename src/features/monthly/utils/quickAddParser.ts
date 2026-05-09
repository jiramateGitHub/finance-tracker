import type { TransactionEntry, TransactionStatus, TransactionType } from '../../../types/finance'
import { currentDateInputValue, currentIsoTimestamp, getMonthKey } from '../../../utils/formatters'

export type QuickAddParseResult = {
  type: TransactionType
  title: string
  amount: number
  status: TransactionStatus
  category: string
}

const expenseKeywords = ['ค่า', 'กาแฟ', 'ข้าว', 'grab', 'taxi', 'รถ', 'อาหาร', 'ซื้อ']
const incomeKeywords = ['เงินเดือน', 'โบนัส', 'รายรับ', 'รับ']
const unpaidKeywords = ['ยังไม่จ่าย', 'ค้าง', 'pending', 'unpaid']

export function getQuickAddDate(selectedMonth: string): string {
  const today = currentDateInputValue()
  return today.startsWith(selectedMonth) ? today : `${selectedMonth}-01`
}

export function parseQuickAdd(input: string): QuickAddParseResult | null {
  const normalized = input.trim().replace(/\s+/g, ' ')
  if (!normalized) return null

  const amountMatch = normalized.match(/(\d+(?:\.\d{1,2})?)\s*$/)
  const amount = amountMatch ? Number(amountMatch[1]) : Number.NaN
  if (!Number.isFinite(amount) || amount <= 0) return null

  const withoutAmount = normalized.slice(0, amountMatch?.index ?? normalized.length).trim()
  const explicitIncome = withoutAmount.startsWith('+')
  const explicitExpense = withoutAmount.startsWith('-')
  const text = withoutAmount.replace(/^[+-]\s*/, '').trim()
  const lowered = text.toLocaleLowerCase()
  const status: TransactionStatus = unpaidKeywords.some((keyword) => lowered.includes(keyword)) ? 'pending' : 'cleared'
  const title = text.replace(/ยังไม่จ่าย|ค้าง|pending|unpaid/gi, '').trim()
  if (!title) return null

  const type: TransactionType = explicitIncome || incomeKeywords.some((keyword) => lowered.includes(keyword))
    ? 'income'
    : explicitExpense || expenseKeywords.some((keyword) => lowered.includes(keyword))
      ? 'expense'
      : 'expense'

  return {
    type,
    title,
    amount,
    status: type === 'income' ? 'cleared' : status,
    category: 'อื่น ๆ',
  }
}

export function buildQuickAddTransaction(input: string, selectedMonth: string): TransactionEntry | null {
  const parsed = parseQuickAdd(input)
  if (!parsed) return null

  const now = currentIsoTimestamp()
  const date = getQuickAddDate(selectedMonth)
  return {
    id: crypto.randomUUID(),
    type: parsed.type,
    date,
    monthKey: getMonthKey(date),
    category: parsed.category,
    categoryId: parsed.category,
    title: parsed.title,
    amount: parsed.amount,
    currency: 'THB',
    status: parsed.status,
    source: 'quick-add',
    sourceModule: 'manual',
    sourceRefId: null,
    tripId: null,
    installmentPlanId: null,
    recurringRuleId: null,
    goalId: null,
    createdAt: now,
    updatedAt: now,
  }
}
