import type { PropsWithChildren } from 'react'
import { NAV_ITEMS } from '../../data/navigation'
import type { SyncStatus } from '../../features/sync/syncTypes'
import type { ViewId } from '../../types/finance'
import { BottomNav } from './BottomNav'
import { Header } from './Header'

type AppShellProps = PropsWithChildren<{
  activeView: ViewId
  onChangeView: (viewId: ViewId) => void
  syncStatus: SyncStatus
}>

export function AppShell({ activeView, onChangeView, syncStatus, children }: AppShellProps) {
  const activeItem = NAV_ITEMS.find((item) => item.id === activeView) ?? NAV_ITEMS[0]

  return (
    <div className="min-h-screen overflow-x-clip bg-finance-bg pb-[calc(8.5rem+env(safe-area-inset-bottom))] text-finance-text">
      <div className="mx-auto grid grid-cols-1 w-full max-w-[1320px] min-w-0 gap-3 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] pb-3 sm:gap-4 sm:px-5 sm:pt-4 sm:pb-4 lg:px-8">
        <Header activeItem={activeItem} syncStatus={syncStatus} />
        <main className="grid grid-cols-1 min-w-0 w-full max-w-full gap-3 pb-4 sm:gap-4">{children}</main>
      </div>
      <BottomNav items={NAV_ITEMS} activeView={activeView} onChange={onChangeView} />
    </div>
  )
}
