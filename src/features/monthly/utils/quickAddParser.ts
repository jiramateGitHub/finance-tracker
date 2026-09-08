import { SMART_CATEGORY_RULES, normalizeCategoryId } from '../../../data/categories'
import type { TransactionEntry, TransactionStatus, TransactionType } from '../../../types/finance'
import { currentDateInputValue, currentIsoTimestamp, getMonthKey, parseAmountSafe } from '../../../utils/formatters'

export type QuickAddParseResult = {
  type: TransactionType
  title: string
  amount: number
  status: TransactionStatus
  category: string
}

const incomeKeywords = ['income', 'salary', 'bonus', 'commission', 'refund', 'allowance', 'payday', 'เงินเดือน', 'โบนัส', 'รายรับ', 'รายได้', 'คืนเงิน', 'ค่าคอม', 'คอมมิชชั่น', 'เบี้ยเลี้ยง']
const unpaidKeywords = ['ยังไม่จ่าย', 'ค้างจ่าย', 'ค้าง', 'pending', 'unpaid']
const paidKeywords = ['จ่ายแล้ว', 'paid', 'cleared']

export function getQuickAddDate(selectedMonth: string): string {
  const today = currentDateInputValue()
  return today.startsWith(selectedMonth) ? today : `${selectedMonth}-01`
}

export function detectQuickAddCategory(text: string, type: TransactionType): string {
  const normalizedText = text.trim().toLocaleLowerCase('th-TH')
  const matchedRule = SMART_CATEGORY_RULES.find((rule) => rule.keywords.some((keyword) => normalizedText.includes(keyword.toLocaleLowerCase('th-TH'))))
  if (matchedRule) return normalizeCategoryId(matchedRule.category)
  return type === 'income' ? 'เงินเดือน' : 'อื่นๆ'
}

function detectQuickAddType(text: string, explicitIncome: boolean, explicitExpense: boolean): TransactionType {
  if (explicitExpense) return 'expense'
  if (explicitIncome) return 'income'
  const lowered = text.toLocaleLowerCase('th-TH')
  if (incomeKeywords.some((keyword) => lowered.includes(keyword.toLocaleLowerCase('th-TH')))) return 'income'
  return 'expense'
}

function detectQuickAddStatus(text: string, type: TransactionType): TransactionStatus {
  if (type === 'income') return 'cleared'
  const lowered = text.toLocaleLowerCase('th-TH')
  if (unpaidKeywords.some((keyword) => lowered.includes(keyword.toLocaleLowerCase('th-TH')))) return 'pending'
  if (paidKeywords.some((keyword) => lowered.includes(keyword.toLocaleLowerCase('th-TH')))) return 'cleared'
  return 'cleared'
}

function cleanQuickAddTitle(text: string): string {
  return text
    .replace(/^[+-]\s*|\s*[+-]$/g, '')
    .replace(/ยังไม่จ่าย|ค้างจ่าย|ค้าง|pending|unpaid|จ่ายแล้ว|paid|cleared/gi, '')
    .replace(/(?:^|\s)(?:บาท|฿|\.-)(?:\s|$)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseQuickAdd(input: string): QuickAddParseResult | null {
  const normalized = input.trim().replace(/\s+/g, ' ')
  if (!normalized) return null

  const amountMatches = Array.from(normalized.matchAll(/(\d[\d,]*(?:\.\d{1,2})?)(?:\s*(?:บาท|฿|\.-))?/g))
  const amountMatch = amountMatches.at(-1)
  if (!amountMatch) return null

  const numPart = amountMatch[1] ?? amountMatch[0]
  const amount = parseAmountSafe(numPart, Number.NaN)
  if (!Number.isFinite(amount) || amount <= 0) return null

  const withoutAmount = `${normalized.slice(0, amountMatch.index)} ${normalized.slice((amountMatch.index ?? 0) + amountMatch[0].length)}`.trim()
  const explicitIncome = withoutAmount.startsWith('+') || withoutAmount.endsWith('+')
  const explicitExpense = withoutAmount.startsWith('-') || withoutAmount.endsWith('-')
  const text = withoutAmount.replace(/^[+-]\s*/, '').replace(/\s*[+-]$/, '').trim()
  const type = detectQuickAddType(text, explicitIncome, explicitExpense)
  const title = cleanQuickAddTitle(text)
  if (!title) return null

  return {
    type,
    title,
    amount,
    status: detectQuickAddStatus(text, type),
    category: detectQuickAddCategory(text, type),
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
