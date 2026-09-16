import type { FinanceData } from '../../types/finance'

export function createFinanceDataFingerprint(data: FinanceData): string {
  return JSON.stringify({
    schemaVersion: data.schemaVersion,
    profile: data.profile,
    settings: data.settings,
    masters: data.masters,
    transactions: data.transactions,
    recurringRules: data.recurringRules,
    installmentPlans: data.installmentPlans,
    // Trip items are a derived read model. Their canonical cashflow rows live
    // in transactions, so comparing nested items would mark every hydrated
    // Cloud load as dirty even when nothing was edited.
    trips: data.trips.map((trip) => ({
      ...trip,
      items: [],
    })),
    budgets: data.budgets,
    goals: data.goals,
  })
}

/** Apply an acknowledged snapshot, retaining newer edits only for ordinary saves. */
export function resolveAcknowledgedSave(
  sourceData: FinanceData,
  latestData: FinanceData,
  revision: number,
  replace = false,
  requestedData: FinanceData = sourceData,
): { savedData: FinanceData; localData: FinanceData; clean: boolean } {
  const savedData = { ...sourceData, meta: { ...sourceData.meta, revision } }
  const clean = replace || createFinanceDataFingerprint(latestData) === createFinanceDataFingerprint(requestedData)
  return {
    savedData,
    localData: clean ? savedData : { ...latestData, meta: { ...latestData.meta, revision } },
    clean,
  }
}
