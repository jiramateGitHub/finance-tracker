import fs from 'node:fs'
import path from 'node:path'
import { createExportableFinanceData, migrateFinanceDataWithReport } from '../src/lib/dataMigration'
import { assertValidFinanceImportPayload } from '../src/lib/importValidation'

const [, , inputArgument, outputArgument] = process.argv

if (!inputArgument || !outputArgument) {
  throw new Error('Usage: tsx scripts/migrate-finance-json.ts <input.json> <output.json>')
}

const inputPath = path.resolve(inputArgument)
const outputPath = path.resolve(outputArgument)
const raw = JSON.parse(fs.readFileSync(inputPath, 'utf8')) as unknown

assertValidFinanceImportPayload(raw)
const migration = migrateFinanceDataWithReport(raw)
const canonical = createExportableFinanceData(migration.data)
// JSON serialization removes optional `undefined` properties such as an
// empty trip budget; validate the exact payload that the user will import.
const serialized = `${JSON.stringify(canonical, null, 2)}\n`
const importable = JSON.parse(serialized) as unknown
assertValidFinanceImportPayload(importable)

fs.writeFileSync(outputPath, serialized, 'utf8')

console.log(JSON.stringify({
  inputPath,
  outputPath,
  schemaVersion: canonical.schemaVersion,
  counts: {
    transactions: canonical.transactions.length,
    recurringRules: canonical.recurringRules.length,
    installmentPlans: canonical.installmentPlans.length,
    trips: canonical.trips.length,
    budgets: canonical.budgets.length,
    goals: canonical.goals.length,
  },
  reconciliationIssues: migration.report.tripOwnership.issues.length,
  createdTripTransactions: migration.report.tripOwnership.createdTransactionIds.length,
  reusedTripTransactions: migration.report.tripOwnership.reusedTransactionIds.length,
}, null, 2))
