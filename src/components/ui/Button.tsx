import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type ButtonVariant = 'primary' | 'light' | 'success' | 'danger' | 'dark'

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
}>

const variantClassName: Record<ButtonVariant, string> = {
  primary: 'border-blue-700 bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700',
  light: 'border-slate-300 bg-white text-blue-700 hover:border-blue-300 hover:bg-blue-50',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  danger: 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
  dark: 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800',
}

export function Button({ variant = 'light', size = 'md', className = '', children, ...buttonProps }: ButtonProps) {
  const sizeClassName = size === 'sm' ? 'min-h-9 px-3 text-xs' : 'min-h-11 px-4 text-sm'
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl border font-extrabold transition ${sizeClassName} ${variantClassName[variant]} ${className}`}
      {...buttonProps}
    >
      {children}
    </button>
  )
}
