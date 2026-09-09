import type { ReactNode } from 'react'
import type { NavItem, ViewId } from '../../types/finance'

type BottomNavProps = {
  items: NavItem[]
  activeView: ViewId
  onChange: (viewId: ViewId) => void
}

function NavIcon({ id }: { id: ViewId }): ReactNode {
  if (id === 'monthly') {
    return (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect width="7" height="9" x="3" y="3" rx="1.5"/>
        <rect width="7" height="5" x="14" y="3" rx="1.5"/>
        <rect width="7" height="9" x="14" y="12" rx="1.5"/>
        <rect width="7" height="5" x="3" y="16" rx="1.5"/>
      </svg>
    )
  }
  if (id === 'yearly') {
    return (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3v18h18"/>
        <path d="m19 9-5 5-4-4-3 3"/>
      </svg>
    )
  }
  if (id === 'installments') {
    return (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect width="20" height="14" x="2" y="5" rx="2"/>
        <line x1="2" x2="22" y1="10" y2="10"/>
      </svg>
    )
  }
  if (id === 'trips') {
    return (
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
      </svg>
    )
  }
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="1.5"/>
      <circle cx="19" cy="12" r="1.5"/>
      <circle cx="5" cy="12" r="1.5"/>
    </svg>
  )
}

export function BottomNav({ items, activeView, onChange }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-2 sm:inset-x-3 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] sm:bottom-3 z-50 mx-auto grid max-w-lg grid-cols-5 gap-0.5 sm:gap-1 rounded-2xl sm:rounded-3xl border border-slate-200/85 bg-white/95 p-1 sm:p-1.5 shadow-lg shadow-slate-900/5 backdrop-blur-xl" aria-label="เมนูหลัก">
      {items.map((item) => {
        const isActive = item.id === activeView
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`group flex min-h-12 flex-col items-center justify-center gap-0.5 sm:gap-1 rounded-xl py-1.5 sm:py-2 px-0.5 sm:px-1 text-[10px] sm:text-[11px] font-semibold transition-all duration-150 active:scale-95 ${
              isActive
                ? 'bg-blue-50 text-blue-600 font-bold'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={`transition-transform duration-150 ${isActive ? 'scale-110 text-blue-600' : 'group-hover:scale-105'}`}>
              <NavIcon id={item.id} />
            </span>
            <span className="min-w-0 max-w-full truncate leading-tight tracking-tight">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
