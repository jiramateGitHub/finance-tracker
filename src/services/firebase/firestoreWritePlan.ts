import type { FinanceData } from '../../types/finance'

type FirestoreItem = {
  id: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUndefined)
  if (!isRecord(value)) return value

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, stripUndefined(item)]),
  )
}

function comparableFirestoreValue(value: unknown): string {
  return JSON.stringify(stripUndefined(value))
}

/** Return only documents whose payload differs from the acknowledged baseline. */
export function getChangedFirestoreItems(nextItems: FirestoreItem[], baseItems?: FirestoreItem[], replace = false): FirestoreItem[] {
  if (replace || !baseItems) return nextItems
  const baseItemsById = new Map(baseItems.map((item) => [item.id, item]))
  return nextItems.filter((item) => {
    const baseItem = baseItemsById.get(item.id)
    return !baseItem || comparableFirestoreValue(baseItem) !== comparableFirestoreValue(item)
  })
}

/**
 * Build the data shape that was actually persisted by the Firestore writer.
 * Trip items are a runtime read model; serializeTrip intentionally stores them
 * as transaction documents instead of nesting them inside the trip document.
 */
export function createPersistedFinanceBaseline(data: FinanceData): FinanceData {
  return {
    ...data,
    trips: data.trips.map((trip) => ({
      ...trip,
      items: [],
    })),
  }
}
