import type { InputHTMLAttributes } from 'react'

type MonthInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function MonthInput({ className = '', ...props }: MonthInputProps) {
  return (
    <div className="finance-calendar-input">
      <input className={`finance-control ${className}`} type="month" aria-label={props['aria-label'] ?? 'เดือน'} {...props} />
      <span aria-hidden="true">เดือน</span>
    </div>
  )
}
