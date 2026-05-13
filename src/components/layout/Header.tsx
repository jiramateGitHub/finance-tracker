import type { NavItem } from '../../types/finance'
import { SyncStatusBadge } from '../../features/sync/SyncStatusBadge'
import type { SyncStatus } from '../../features/sync/syncTypes'

type HeaderProps = {
  activeItem: NavItem
  syncStatus: SyncStatus
}

export function Header({ activeItem, syncStatus }: HeaderProps) {
  return (
    <header className="sticky top-2 z-40 min-w-0 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-3 shadow-finance-sm sm:top-3 sm:rounded-[22px] sm:p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold leading-tight text-finance-text sm:text-2xl">{activeItem.title}</h1>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
          <SyncStatusBadge status={syncStatus} />
        </div>
      </div>
    </header>
  )
}
