import {
  documentDataWithId,
  FinanceDocumentIdentityConflictError,
} from './firestoreIdentity'
import { getChangedFirestoreItems } from './firestoreWritePlan'

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

const baseItems = [{ id: 'same', amount: 10 }, { id: 'changed', amount: 20 }]
const nextItems = [{ id: 'same', amount: 10 }, { id: 'changed', amount: 25 }, { id: 'new', amount: 30 }]
const changedItems = getChangedFirestoreItems(nextItems, baseItems)
assert(changedItems.map((item) => item.id).join(',') === 'changed,new', 'Ordinary Cloud saves must write only changed or new documents')
assert(getChangedFirestoreItems(nextItems, baseItems, true).length === 3, 'Replacement saves must retain every document for full dataset replacement')
assert(getChangedFirestoreItems(nextItems).length === 3, 'Initial Cloud saves without a baseline must write every document')
console.log('✓ Firestore changed-write planning passed')
