import type { InputHTMLAttributes } from 'react'

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function DateInput({ className = '', ...props }: DateInputProps) {
  return (
    <div className="finance-calendar-input">
      <input className={`finance-control ${className}`} type="date" {...props} />
      <span aria-hidden="true">วันที่</span>
    </div>
  )
}
