export class FinanceDocumentIdentityConflictError extends Error {
  readonly docId: string
  readonly dataId: string

  constructor(docId: string, dataId: string) {
    super(`Firestore document id ${docId} ขัดแย้งกับ field id ${dataId}`)
    this.name = 'FinanceDocumentIdentityConflictError'
    this.docId = docId
    this.dataId = dataId
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function documentDataWithId(docId: string, value: unknown): Record<string, unknown> {
  const data = isRecord(value) ? value : {}
  const dataId = typeof data.id === 'string' ? data.id.trim() : ''
  if (dataId && dataId !== docId) throw new FinanceDocumentIdentityConflictError(docId, dataId)
  return { ...data, id: docId }
}
