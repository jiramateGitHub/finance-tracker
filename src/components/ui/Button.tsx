import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'light' | 'success' | 'danger' | 'dark' | 'subtle-danger' | 'subtle-success' | 'ghost'

type ButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'xs' | 'sm' | 'md'
  icon?: ReactNode
  iconOnly?: boolean
}>

const variantClassName: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-blue-600 text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700 active:bg-blue-800',
  light: 'border-slate-200/90 bg-white text-slate-700 shadow-xs hover:border-slate-300 hover:bg-slate-50/90 hover:text-slate-900 active:bg-slate-100',
  success: 'border-transparent bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 active:bg-emerald-800',
  danger: 'border-rose-200/60 bg-rose-50 text-rose-600 hover:bg-rose-100/80 active:bg-rose-200/60',
  dark: 'border-transparent bg-slate-900 text-white shadow-xs hover:bg-slate-800 active:bg-black',
  'subtle-danger': 'border-rose-200/70 bg-rose-50/80 text-rose-600 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700',
  'subtle-success': 'border-emerald-200/70 bg-emerald-50/90 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100/80',
  ghost: 'border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
}

export function Button({
  variant = 'light',
  size = 'md',
  icon,
  iconOnly = false,
  className = '',
  children,
  ...buttonProps
}: ButtonProps) {
  const sizeClassName = iconOnly
    ? size === 'xs'
      ? 'min-h-8 min-w-8 p-1.5 text-xs'
      : size === 'sm'
      ? 'min-h-9 min-w-9 p-2 text-xs sm:min-h-8.5 sm:min-w-8.5'
      : 'min-h-11 min-w-11 p-2.5 text-sm'
    : size === 'xs'
    ? 'min-h-8 px-2.5 py-1 text-xs'
    : size === 'sm'
    ? 'min-h-9 px-3 py-1.5 text-xs sm:min-h-8.5 sm:py-1.5'
    : 'min-h-11 px-4 py-2 text-sm'

  return (
    <button
      className={`inline-flex max-w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border text-center font-semibold leading-5 transition duration-150 ease-in-out cursor-pointer active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${sizeClassName} ${variantClassName[variant]} ${className}`}
      {...buttonProps}
    >
      {icon}
      {children}
    </button>
  )
}
