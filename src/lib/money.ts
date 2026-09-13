export type MoneyRoundingMode = 'reject' | 'half-up'

export type MoneyConversionOptions = {
  rounding?: MoneyRoundingMode
}

export class MoneyConversionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MoneyConversionError'
  }
}

function readMoneyText(value: number | string): string {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new MoneyConversionError('จำนวนเงินต้องเป็นตัวเลขที่มีอยู่จริง')
    return String(value)
  }
  const text = value.trim().replace(/,/g, '')
  if (!text) throw new MoneyConversionError('จำนวนเงินต้องไม่ว่าง')
  return text
}

/** Convert a non-negative major-unit amount (for example baht) to integer minor units. */
export function toMinorUnits(value: number | string, options: MoneyConversionOptions = {}): number {
  const text = readMoneyText(value)
  if (!/^\d+(?:\.\d+)?$/.test(text)) throw new MoneyConversionError('จำนวนเงินต้องเป็นเลขไม่ติดลบและไม่มีสัญลักษณ์สกุลเงิน')
  const [wholeText, fractionText = ''] = text.split('.')
  const whole = Number(wholeText)
  if (!Number.isSafeInteger(whole)) throw new MoneyConversionError('จำนวนเงินเกินขอบเขตที่ปลอดภัย')
  const rounding = options.rounding ?? 'reject'
  if (fractionText.length > 2 && rounding === 'reject' && /[1-9]/.test(fractionText.slice(2))) {
    throw new MoneyConversionError('จำนวนเงินมีทศนิยมเกิน 2 ตำแหน่ง ต้องระบุ rounding ก่อนแปลง')
  }
  const paddedFraction = `${fractionText}00`.slice(0, 2)
  let minor = whole * 100 + Number(paddedFraction)
  if (fractionText.length > 2 && rounding === 'half-up' && Number(fractionText[2] ?? 0) >= 5) minor += 1
  if (!Number.isSafeInteger(minor)) throw new MoneyConversionError('จำนวนเงินเกินขอบเขต minor unit ที่ปลอดภัย')
  return minor
}

/** Convert integer minor units back to a major-unit number. */
export function fromMinorUnits(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new MoneyConversionError('minor unit ต้องเป็นจำนวนเต็มไม่ติดลบที่ปลอดภัย')
  return value / 100
}

/** Format integer minor units without introducing floating-point rounding. */
export function formatMinorUnits(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) throw new MoneyConversionError('minor unit ต้องเป็นจำนวนเต็มไม่ติดลบที่ปลอดภัย')
  const whole = Math.floor(value / 100)
  const fraction = String(value % 100).padStart(2, '0')
  return `${whole}.${fraction}`
}

export function roundTripMoney(value: number | string, options: MoneyConversionOptions = {}): { minor: number; major: number; text: string } {
  const minor = toMinorUnits(value, options)
  return { minor, major: fromMinorUnits(minor), text: formatMinorUnits(minor) }
}
