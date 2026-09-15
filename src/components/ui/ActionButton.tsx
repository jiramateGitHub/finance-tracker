import type { ReactNode } from 'react'
import {
  IconBookmark,
  IconCheck,
  IconCopy,
  IconEye,
  IconPencil,
  IconTrash,
} from './Icons'

export type ActionType = 'edit' | 'delete' | 'duplicate' | 'template' | 'view' | 'pay'

export type ActionButtonProps = {
  action: ActionType
  label?: ReactNode
  iconOnly?: boolean
  isPaid?: boolean
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  title?: string
  className?: string
  size?: 'sm' | 'md'
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export function ActionButton({
  action,
  label,
  iconOnly = false,
  isPaid = false,
  onClick,
  title,
  className = '',
  size = 'sm',
  disabled = false,
  type = 'button',
}: ActionButtonProps) {
  let icon: ReactNode
  let defaultTitle: string
  let defaultLabel: ReactNode
  let styleClasses: string

  if (action === 'pay') {
    icon = <IconCheck size={size === 'sm' ? 14 : 16} className="shrink-0" />
    if (isPaid) {
      defaultTitle = 'คลิกเพื่อเปลี่ยนเป็นยังไม่จ่าย'
      defaultLabel = 'จ่ายแล้ว'
      styleClasses = 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700'
    } else {
      defaultTitle = 'คลิกเพื่อบันทึกว่าจ่ายแล้ว'
      defaultLabel = 'จ่ายแล้ว'
      styleClasses = 'border-transparent bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 active:bg-emerald-800'
    }
  } else if (action === 'edit') {
    icon = <IconPencil size={size === 'sm' ? 14 : 16} className="shrink-0" />
    defaultTitle = 'แก้ไข'
    defaultLabel = 'แก้ไข'
    styleClasses = 'border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 shadow-xs'
  } else if (action === 'delete') {
    icon = <IconTrash size={size === 'sm' ? 14 : 16} className="shrink-0" />
    defaultTitle = 'ลบ'
    defaultLabel = 'ลบ'
    styleClasses = 'border-rose-200/70 bg-rose-50/70 text-rose-600 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700'
  } else if (action === 'duplicate') {
    icon = <IconCopy size={size === 'sm' ? 14 : 16} className="shrink-0" />
    defaultTitle = 'ทำซ้ำรายการ'
    defaultLabel = 'ทำซ้ำ'
    styleClasses = 'border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 shadow-xs'
  } else if (action === 'template') {
    icon = <IconBookmark size={size === 'sm' ? 14 : 16} className="shrink-0" />
    defaultTitle = 'ใช้เป็นต้นแบบ'
    defaultLabel = 'ต้นแบบ'
    styleClasses = 'border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900 shadow-xs'
  } else {
    // view
    icon = <IconEye size={size === 'sm' ? 14 : 16} className="shrink-0" />
    defaultTitle = 'ดูรายละเอียด'
    defaultLabel = 'ดู'
    styleClasses = 'border-slate-200/90 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 shadow-xs'
  }

  const effectiveTitle = title ?? (typeof defaultTitle === 'string' ? defaultTitle : undefined)
  const displayLabel = label !== undefined ? label : (iconOnly ? null : defaultLabel)

  const sizeClasses = iconOnly
    ? (size === 'sm' ? 'min-h-10 min-w-10 p-2 sm:min-h-9 sm:min-w-9 rounded-xl text-xs' : 'min-h-11 min-w-11 p-2.5 rounded-xl text-sm')
    : (size === 'sm' ? 'min-h-10 px-2.5 py-1.5 sm:min-h-9 rounded-xl text-xs gap-1.5' : 'min-h-11 px-3.5 py-2 rounded-xl text-sm gap-2')

  return (
    <button
      type={type}
      title={effectiveTitle}
      aria-label={effectiveTitle}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center border font-semibold transition duration-150 ease-in-out cursor-pointer active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${sizeClasses} ${styleClasses} ${className}`}
    >
      {icon}
      {displayLabel && <span className="truncate">{displayLabel}</span>}
    </button>
  )
}
