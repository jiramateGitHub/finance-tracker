import type { NavItem } from '../../types/finance'
import { SyncStatusBadge } from '../../features/sync/SyncStatusBadge'
import type { SyncStatus } from '../../features/sync/syncTypes'

type HeaderProps = {
  activeItem: NavItem
  syncStatus: SyncStatus
}

export function Header({ activeItem, syncStatus }: HeaderProps) {
  return (
    <header className="sticky top-2 z-40 min-w-0 rounded-2xl sm:rounded-3xl border border-slate-200/75 bg-white/90 p-3 shadow-xs backdrop-blur-md sm:top-3 sm:p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden size-9 place-items-center rounded-xl bg-blue-600 text-white shadow-xs font-bold text-base sm:grid">
            ฿
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg sm:text-xl font-bold tracking-tight text-slate-900">{activeItem.title}</h1>
          </div>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
          <SyncStatusBadge status={syncStatus} />
        </div>
      </div>
    </header>
  )
}
