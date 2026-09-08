import type { InputHTMLAttributes } from 'react'

type DateInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function DateInput({ className = '', ...props }: DateInputProps) {
  return (
    <input
      className={`finance-control ${className}`}
      type="date"
      aria-label={props['aria-label'] ?? 'วันที่'}
      {...props}
    />
  )
}
