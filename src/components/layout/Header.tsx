import type { NavItem } from '../../types/finance'
import { SyncStatusBadge } from '../../features/sync/SyncStatusBadge'
import type { SyncStatus } from '../../features/sync/syncTypes'
import { th } from '../../i18n/th'
import { Button } from '../ui/Button'

type HeaderProps = {
  activeItem: NavItem
  currentUserEmail: string
  syncStatus: SyncStatus
  onLogout: () => Promise<void>
}

export function Header({ activeItem, currentUserEmail, syncStatus, onLogout }: HeaderProps) {
  return (
    <header className="sticky top-2 z-40 min-w-0 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-3 shadow-finance-sm sm:top-3 sm:rounded-[22px] sm:p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold leading-tight text-finance-text sm:text-2xl">{activeItem.title}</h1>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
          <SyncStatusBadge status={syncStatus} />
          <span className="max-w-[min(70vw,220px)] truncate rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
            {currentUserEmail}
          </span>
          <Button type="button" size="sm" onClick={onLogout}>
            {th.auth.logout}
          </Button>
        </div>
      </div>
    </header>
  )
}
