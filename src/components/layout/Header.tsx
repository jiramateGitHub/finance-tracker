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
    <header className="sticky top-2 z-40 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-3 shadow-finance-sm sm:top-3 sm:rounded-[22px] sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold leading-tight text-finance-text sm:text-2xl">{activeItem.title}</h1>
          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-finance-muted sm:mt-1 sm:text-sm sm:leading-6">{activeItem.subtitle}</p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <SyncStatusBadge status={syncStatus} />
          <span className="max-w-[160px] truncate rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 sm:max-w-[220px]">
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
