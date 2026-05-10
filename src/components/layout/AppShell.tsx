import type { PropsWithChildren } from 'react'
import { NAV_ITEMS } from '../../data/navigation'
import type { SyncStatus } from '../../features/sync/syncTypes'
import type { ViewId } from '../../types/finance'
import { BottomNav } from './BottomNav'
import { Header } from './Header'

type AppShellProps = PropsWithChildren<{
  activeView: ViewId
  onChangeView: (viewId: ViewId) => void
  currentUserEmail: string
  syncStatus: SyncStatus
  onLogout: () => Promise<void>
}>

export function AppShell({ activeView, onChangeView, currentUserEmail, syncStatus, onLogout, children }: AppShellProps) {
  const activeItem = NAV_ITEMS.find((item) => item.id === activeView) ?? NAV_ITEMS[0]

  return (
    <div className="min-h-screen overflow-x-hidden bg-finance-bg pb-[calc(7.75rem+env(safe-area-inset-bottom))] text-finance-text">
      <div className="mx-auto grid w-full max-w-[1320px] min-w-0 gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4 lg:px-8">
        <Header activeItem={activeItem} currentUserEmail={currentUserEmail} syncStatus={syncStatus} onLogout={onLogout} />
        <main className="grid min-w-0 gap-3 pb-3 sm:gap-4">{children}</main>
      </div>
      <BottomNav items={NAV_ITEMS} activeView={activeView} onChange={onChangeView} />
    </div>
  )
}
