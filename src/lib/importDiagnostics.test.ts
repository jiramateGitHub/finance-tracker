import { analyzeImportedFinanceData } from './importDiagnostics'
import { migrateFinanceData } from './dataMigration'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const raw = {
  transactions: [{
    id: 'manual-orphan',
    type: 'expense',
    date: '2026-11-01',
    category: 'food',
    title: 'รายการอ้างอิงทริปเก่า',
    amount: 250,
    status: 'cleared',
    sourceModule: 'manual',
    tripId: 'missing-trip',
  }],
}
const diagnostics = analyzeImportedFinanceData(raw, migrateFinanceData(raw), 'orphan.json')
assert(diagnostics.referenceSummary.orphanTripIds.join(',') === 'missing-trip', 'Should report missing trip ids')
assert(diagnostics.referenceSummary.orphanTripTransactionIds.join(',') === 'manual-orphan', 'Should report orphan transaction ids')
assert(diagnostics.warnings.some((warning) => warning.includes('อ้างอิงทริปที่ไม่พบ')), 'Should surface orphan reference warning')

console.log('Testing import reference diagnostics...')
console.log('✓ Orphan trip references are reported without dropping data')
