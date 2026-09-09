import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'

type ButtonVariant = 'primary' | 'light' | 'success' | 'danger' | 'dark'

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
}>

const variantClassName: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-blue-600 text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 active:bg-blue-800',
  light: 'border-slate-200/90 bg-white text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50/90 hover:text-slate-900 active:bg-slate-100',
  success: 'border-emerald-200/60 bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 active:bg-emerald-200/60',
  danger: 'border-rose-200/60 bg-rose-50 text-rose-600 hover:bg-rose-100/80 active:bg-rose-200/60',
  dark: 'border-transparent bg-slate-900 text-white shadow-xs hover:bg-slate-800 active:bg-black',
}

export function Button({ variant = 'light', size = 'md', className = '', children, ...buttonProps }: ButtonProps) {
  const sizeClassName = size === 'sm' ? 'min-h-10 px-3 py-2 text-xs sm:min-h-9 sm:py-1.5' : 'min-h-11 px-4 py-2 text-sm'
  return (
    <button
      className={`inline-flex max-w-full min-w-0 items-center justify-center gap-2 rounded-xl border text-center font-semibold leading-5 transition duration-150 ease-in-out active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${sizeClassName} ${variantClassName[variant]} ${className}`}
      {...buttonProps}
    >
      {children}
    </button>
  )
}
