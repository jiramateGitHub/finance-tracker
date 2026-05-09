import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { th } from '../../i18n/th'
import type { FinanceData } from '../../types/finance'

type SyncConflictPanelProps = {
  cloudData: FinanceData | null
  onUseCloud: () => Promise<void>
  onKeepLocal: () => Promise<void>
  onMerge: () => Promise<void>
}

export function SyncConflictPanel({ cloudData, onUseCloud, onKeepLocal, onMerge }: SyncConflictPanelProps) {
  if (!cloudData) return null

  return (
    <Card title={th.sync.conflictTitle} description={th.sync.conflictDescription}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0 text-sm leading-6 text-slate-500">
          <p>
            ข้อมูลบน Cloud มี {cloudData.transactions.length} รายการ, {cloudData.installmentPlans.length} แผนผ่อน,{' '}
            {cloudData.trips.length} ทริป, {cloudData.budgets.length} งบประมาณ, {cloudData.goals.length} เป้าหมาย
          </p>
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 font-bold text-amber-800">
            ถ้าเลือกใช้ข้อมูลในเครื่อง ระบบจะอัปโหลดข้อมูลชุดนี้ขึ้น Cloud และแทนที่ข้อมูล Cloud ปัจจุบัน
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <Button type="button" variant="primary" onClick={onUseCloud}>
            {th.sync.useCloud}
          </Button>
          <Button type="button" variant="danger" onClick={onKeepLocal}>
            {th.sync.keepLocal}
          </Button>
          <Button type="button" onClick={onMerge}>
            {th.sync.mergeSafe}
          </Button>
        </div>
      </div>
    </Card>
  )
}
