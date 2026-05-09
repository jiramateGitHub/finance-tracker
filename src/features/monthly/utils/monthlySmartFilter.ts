export type MonthlySmartFilter = {
  text: string
  type?: 'income' | 'expense'
  status?: 'paid' | 'unpaid'
  monthOffset?: number
  minAmount?: number
  maxAmount?: number
  exactAmount?: number
}

function parseAmount(value: string): number | undefined {
  const amount = Number(value.replace(/,/g, ''))
  return Number.isFinite(amount) ? amount : undefined
}

export function parseMonthlySmartKeyword(keyword: string): MonthlySmartFilter {
  let text = keyword.trim()
  const result: MonthlySmartFilter = { text }

  const consume = (pattern: RegExp, apply: (match: RegExpMatchArray) => void): void => {
    const match = text.match(pattern)
    if (!match) return
    apply(match)
    text = text.replace(pattern, ' ').replace(/\s+/g, ' ').trim()
  }

  consume(/(?:ยังไม่จ่าย|ค้างจ่าย)/iu, () => {
    result.status = 'unpaid'
  })
  consume(/จ่ายแล้ว/iu, () => {
    result.status = 'paid'
  })
  consume(/รายรับ/iu, () => {
    result.type = 'income'
  })
  consume(/รายจ่าย/iu, () => {
    result.type = 'expense'
  })
  consume(/เดือนนี้/iu, () => {
    result.monthOffset = 0
  })
  consume(/เดือนก่อน/iu, () => {
    result.monthOffset = -1
  })
  consume(/(?:เกิน|มากกว่า)\s*([0-9][0-9,]*(?:\.\d+)?)/iu, (match) => {
    result.minAmount = parseAmount(match[1])
  })
  consume(/(?:ต่ำกว่า|น้อยกว่า|ไม่เกิน)\s*([0-9][0-9,]*(?:\.\d+)?)/iu, (match) => {
    result.maxAmount = parseAmount(match[1])
  })

  const trailingAmount = text.match(/^(.*?)(?:\s+)([0-9][0-9,]*(?:\.\d+)?)$/u)
  if (trailingAmount && result.minAmount === undefined && result.maxAmount === undefined) {
    const amount = parseAmount(trailingAmount[2])
    if (amount !== undefined) {
      result.exactAmount = amount
      text = trailingAmount[1].trim()
    }
  }

  result.text = text
  return result
}
