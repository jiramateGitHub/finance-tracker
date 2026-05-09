import type { TextareaHTMLAttributes } from 'react'

type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export function TextareaField({ className = '', ...props }: TextareaFieldProps) {
  return <textarea className={`finance-textarea ${className}`} {...props} />
}
