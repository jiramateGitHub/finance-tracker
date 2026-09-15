import { IconCards, IconTable, IconCalendar } from './Icons'

export type StandardViewMode = 'cards' | 'list' | 'table' | 'calendar'

export type ViewOption<T extends string> = {
  id: T
  label: string
  icon?: 'cards' | 'table' | 'calendar' | 'list'
}

export type ViewSwitcherProps<T extends string> = {
  activeView: T
  onViewChange: (view: T) => void
  options?: ViewOption<T>[]
  className?: string
  ariaLabel?: string
}

const defaultOptions: ViewOption<StandardViewMode>[] = [
  { id: 'cards', label: 'การ์ด', icon: 'cards' },
  { id: 'table', label: 'ตาราง', icon: 'table' },
  { id: 'calendar', label: 'ปฏิทิน', icon: 'calendar' },
]

function renderIcon(iconType?: 'cards' | 'table' | 'calendar' | 'list') {
  if (iconType === 'table') {
    return <IconTable size={15} className="shrink-0" />
  }
  if (iconType === 'calendar') {
    return <IconCalendar size={15} className="shrink-0" />
  }
  return <IconCards size={15} className="shrink-0" />
}

export function ViewSwitcher<T extends string>({
  activeView,
  onViewChange,
  options = defaultOptions as unknown as ViewOption<T>[],
  className = '',
  ariaLabel = 'เลือกรูปแบบการแสดงผล',
}: ViewSwitcherProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`inline-flex items-center rounded-xl border border-slate-200/90 bg-slate-100/90 p-1 shadow-xs select-none ${className}`}
    >
      {options.map((option) => {
        const isActive = activeView === option.id
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            title={option.label}
            onClick={() => onViewChange(option.id)}
            className={`min-h-10 min-w-10 sm:min-h-9 sm:min-w-0 flex items-center justify-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
              isActive
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            {renderIcon(option.icon ?? (option.id === 'table' ? 'table' : option.id === 'calendar' ? 'calendar' : 'cards'))}
            <span className="hidden sm:inline whitespace-nowrap">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
