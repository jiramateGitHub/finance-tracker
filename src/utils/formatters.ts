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

export function currentDateInputValue(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getMonthKey(dateValue: string): string {
  return dateValue.slice(0, 7)
}

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}
