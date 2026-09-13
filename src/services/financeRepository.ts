import type { FinanceData } from '../types/finance'

export type FinanceRepositorySaveOptions = {
  /** Revision read by the caller. A mismatch rejects the whole write. */
  expectedRevision?: number
  /** Previously loaded local baseline, used to identify intentional deletes. */
  baseData?: FinanceData
  /** Explicit full replacement used by confirmed import/recovery flows. */
  replace?: boolean
}

export interface FinanceRepository {
  load: (userId: string) => Promise<FinanceData | null>
  save: (userId: string, data: FinanceData, options?: FinanceRepositorySaveOptions) => Promise<number>
}

export class FinanceDataConflictError extends Error {
  readonly code = 'finance-data-conflict'

  constructor(expectedRevision: number, actualRevision: number) {
    super(`ข้อมูล Cloud มีการเปลี่ยนแปลงแล้ว (revision ${actualRevision}; local revision ${expectedRevision}) กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก`)
    this.name = 'FinanceDataConflictError'
  }
}
