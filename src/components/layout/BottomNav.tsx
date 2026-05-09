import type { NavItem, ViewId } from '../../types/finance'

type BottomNavProps = {
  items: NavItem[]
  activeView: ViewId
  onChange: (viewId: ViewId) => void
}

export function BottomNav({ items, activeView, onChange }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-2 bottom-2 z-50 mx-auto grid max-w-3xl grid-cols-5 gap-1 rounded-[20px] border border-slate-200 bg-white/95 p-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur sm:inset-x-3 sm:bottom-3 sm:p-2 sm:pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      {items.map((item) => {
        const isActive = item.id === activeView
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`grid min-h-12 place-items-center rounded-2xl px-1 py-1.5 text-[11px] font-extrabold transition sm:min-h-14 sm:px-2 sm:py-2 sm:text-xs ${
              isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="text-base leading-none sm:text-lg" aria-hidden="true">{item.icon}</span>
            <span className="leading-tight">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
