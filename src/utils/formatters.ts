export function formatMoney(value: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatDate(value: string): string {
  if (!value) return '-'
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

export function formatMonth(value: string): string {
  if (!value) return '-'
  return new Intl.DateTimeFormat('th-TH', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}-01T00:00:00`))
}

export function currentIsoTimestamp(): string {
  return new Date().toISOString()
}

function formatLocalDatePart(value: number): string {
  return String(value).padStart(2, '0')
}

export function currentDateInputValue(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = formatLocalDatePart(now.getMonth() + 1)
  const day = formatLocalDatePart(now.getDate())
  return `${year}-${month}-${day}`
}

export function currentMonthInputValue(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = formatLocalDatePart(now.getMonth() + 1)
  return `${year}-${month}`
}

export function getMonthKey(dateValue: string): string {
  return dateValue.slice(0, 7)
}

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function sanitizeAmountInput(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/,/g, '').trim()
}

export function parseAmountSafe(value: string | number | null | undefined, fallback = 0): number {
  if (value === null || value === undefined) return fallback
  const sanitized = sanitizeAmountInput(value)
  if (!sanitized) return fallback
  const num = Number(sanitized)
  return Number.isFinite(num) ? num : fallback
}
