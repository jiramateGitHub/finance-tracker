import type { InputHTMLAttributes } from 'react'

type MonthInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function MonthInput({ className = '', ...props }: MonthInputProps) {
  // TODO: A future UX phase can replace the native picker with flatpickr monthSelect or a custom picker.
  return (
    <div className="finance-calendar-input">
      <input className={`finance-control ${className}`} type="month" {...props} />
      <span aria-hidden="true">เดือน</span>
    </div>
  )
}
