import type { SelectHTMLAttributes } from 'react'

export type SelectOption = {
  value: string
  label: string
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: SelectOption[]
}

export function SelectField({ className = '', options, ...props }: SelectFieldProps) {
  return (
    <select className={`finance-select ${className}`} {...props}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
