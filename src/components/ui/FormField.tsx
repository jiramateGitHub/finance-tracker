import type { ReactNode } from 'react'

type FormFieldProps = {
  label: ReactNode
  children: ReactNode
  className?: string
  fullWidth?: boolean
}

export function FormField({ label, children, className = '', fullWidth = false }: FormFieldProps) {
  return (
    <label className={`finance-field ${fullWidth ? 'sm:col-span-2' : ''} ${className}`}>
      <span className="finance-label">{label}</span>
      {children}
    </label>
  )
}
