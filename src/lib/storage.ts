import { createExportableFinanceData } from './dataMigration'
import type { FinanceData } from '../types/finance'

function createLocalTimestampForFileName(): string {
  const now = new Date()
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
  const time = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('-')
  return `${date}T${time}`
}

export function createJsonDownload(data: FinanceData): void {
  const exportableData = createExportableFinanceData(data)
  const blob = new Blob([JSON.stringify(exportableData, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `finance-data-${createLocalTimestampForFileName()}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
