import type { InputHTMLAttributes } from 'react'

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function DateInput({ className = '', ...props }: DateInputProps) {
  // TODO: A future UX phase can replace the native picker with flatpickr or a custom Thai calendar.
  return (
    <div className="finance-calendar-input">
      <input className={`finance-control pr-20 ${className}`} type="date" {...props} />
      <span aria-hidden="true">วันที่</span>
    </div>
  )
}
