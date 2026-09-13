import { Badge } from '../../components/ui/Badge'
import { th } from '../../i18n/th'
import type { SyncStatus } from './syncTypes'

type SyncStatusBadgeProps = {
  status: SyncStatus
  className?: string
}

const labelByState: Record<SyncStatus['state'], string> = {
  idle: th.sync.idle,
  pending: th.sync.pending,
  loading: th.sync.loading,
  saving: th.sync.saving,
  saved: th.sync.saved,
  conflict: th.sync.conflict,
  error: th.sync.error,
}

const toneByState: Record<SyncStatus['state'], 'neutral' | 'income' | 'expense' | 'warning' | 'active'> = {
  idle: 'neutral',
  pending: 'active',
  loading: 'active',
  saving: 'active',
  saved: 'income',
  conflict: 'warning',
  error: 'expense',
}

export function SyncStatusBadge({ status, className = '' }: SyncStatusBadgeProps) {
  return (
    <Badge tone={toneByState[status.state]} className={className}>
      {labelByState[status.state]}
    </Badge>
  )
}
