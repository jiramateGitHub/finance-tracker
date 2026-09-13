import {
  documentDataWithId,
  FinanceDocumentIdentityConflictError,
} from './firestoreIdentity'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

console.log('Testing Firestore document identity contract...')

const hydrated = documentDataWithId('doc-1', { title: 'รายการ', id: 'doc-1' })
assert(hydrated.id === 'doc-1', 'Firestore document id must remain the canonical identity')

let conflictRejected = false
try {
  documentDataWithId('doc-1', { id: 'raw-id' })
} catch (error) {
  conflictRejected = error instanceof FinanceDocumentIdentityConflictError
}
assert(conflictRejected, 'A mismatched raw id must block the document instead of rewriting identity')

console.log('✓ Firestore document identity contract passed')
