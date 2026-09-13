import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  runTransaction,
  type DocumentReference,
  type Firestore,
  type Transaction,
} from 'firebase/firestore'
import { assertSupportedFinanceDataSchema, createExportableFinanceData, createPersistedFinanceData, migrateFinanceDataWithReport, normalizeFinanceData, type FinanceMigrationReport } from '../../lib/dataMigration'
import {
  FinanceDataConflictError,
  type FinanceRepository,
  type FinanceRepositorySaveOptions,
} from '../financeRepository'
import type { FinanceData } from '../../types/finance'
import { getFirebaseApp } from './firebaseApp'
import { createPersistedFinanceBaseline, getChangedFirestoreItems } from './firestoreWritePlan'
export { documentDataWithId, FinanceDocumentIdentityConflictError } from './firestoreIdentity'
export { createPersistedFinanceBaseline, getChangedFirestoreItems } from './firestoreWritePlan'
import { documentDataWithId } from './firestoreIdentity'

export { FinanceDataConflictError } from '../financeRepository'

const META_DOC_ID = 'app'
const SINGLETON_DOC_ID = 'main'

const singletonCollectionNames = ['meta', 'profile', 'settings', 'masters'] as const
const itemCollectionNames = ['transactions', 'recurringRules', 'installmentPlans', 'trips', 'budgets', 'goals'] as const

type SingletonCollectionName = (typeof singletonCollectionNames)[number]
type ItemCollectionName = (typeof itemCollectionNames)[number]
type ExportableFinanceData = ReturnType<typeof createExportableFinanceData>

export type FinanceCloudLoadResult = {
  data: FinanceData
  /** The canonical Cloud payload before runtime trip-item hydration. */
  baselineData: FinanceData
  reconciliation: FinanceMigrationReport
}

export type FinanceSaveOptions = FinanceRepositorySaveOptions

type FirestoreWriter = {
  set: Transaction['set']
  delete: Transaction['delete']
}

type Mutation =
  | { kind: 'set'; ref: DocumentReference; data: Record<string, unknown>; merge?: boolean }
  | { kind: 'delete'; ref: DocumentReference }

function requireFirestore(): Firestore {
  const app = getFirebaseApp()
  if (!app) throw new Error('ยังไม่ได้ตั้งค่า Firebase กรุณากรอกค่า VITE_FIREBASE_* ก่อนใช้ Cloud')
  return getFirestore(app)
}

function userRootRef(db: Firestore, userId: string): DocumentReference {
  return doc(db, 'users', userId)
}

function singletonDocRef(db: Firestore, userId: string, collectionName: SingletonCollectionName): DocumentReference {
  const docId = collectionName === 'meta' ? META_DOC_ID : SINGLETON_DOC_ID
  return doc(db, 'users', userId, collectionName, docId)
}

function itemCollectionRef(db: Firestore, userId: string, collectionName: ItemCollectionName) {
  return collection(db, 'users', userId, collectionName)
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

function assertValidExportableData(data: ExportableFinanceData): void {
  for (const collectionName of itemCollectionNames) {
    const hasInvalidId = data[collectionName].some((item) => typeof item.id !== 'string' || !item.id.trim())
    if (hasInvalidId) throw new Error(`ไม่สามารถบันทึกขึ้น Cloud เพราะ ${collectionName} มีรายการที่ไม่มี id`)
  }
}

async function readSingleton(db: Firestore, userId: string, collectionName: SingletonCollectionName): Promise<Record<string, unknown> | null> {
  const snapshot = await getDoc(singletonDocRef(db, userId, collectionName))
  return snapshot.exists() ? snapshot.data() : null
}

async function readCollection(db: Firestore, userId: string, collectionName: ItemCollectionName): Promise<Record<string, unknown>[]> {
  const snapshot = await getDocs(itemCollectionRef(db, userId, collectionName))
  return snapshot.docs.map((item) => documentDataWithId(item.id, item.data()))
}

export async function checkCloudDataExists(userId: string): Promise<boolean> {
  const db = requireFirestore()
  const rootSnapshot = await getDoc(userRootRef(db, userId))
  if (rootSnapshot.exists()) return true
  const metaSnapshot = await getDoc(singletonDocRef(db, userId, 'meta'))
  if (metaSnapshot.exists()) return true

  const checks = await Promise.all([
    getDoc(singletonDocRef(db, userId, 'profile')),
    getDoc(singletonDocRef(db, userId, 'settings')),
    getDoc(singletonDocRef(db, userId, 'masters')),
    ...itemCollectionNames.map((collectionName) => getDocs(itemCollectionRef(db, userId, collectionName))),
  ])

  return checks.some((snapshot) => ('exists' in snapshot ? snapshot.exists() : snapshot.size > 0))
}

export async function loadFinanceDataFromCloudWithReport(userId: string): Promise<FinanceCloudLoadResult | null> {
  const db = requireFirestore()
  const hasCloudData = await checkCloudDataExists(userId)
  if (!hasCloudData) return null

  const [
    root,
    meta,
    profile,
    settings,
    masters,
    transactions,
    recurringRules,
    installmentPlans,
    trips,
    budgets,
    goals,
  ] = await Promise.all([
    getDoc(userRootRef(db, userId)),
    readSingleton(db, userId, 'meta'),
    readSingleton(db, userId, 'profile'),
    readSingleton(db, userId, 'settings'),
    readSingleton(db, userId, 'masters'),
    readCollection(db, userId, 'transactions'),
    readCollection(db, userId, 'recurringRules'),
    readCollection(db, userId, 'installmentPlans'),
    readCollection(db, userId, 'trips'),
    readCollection(db, userId, 'budgets'),
    readCollection(db, userId, 'goals'),
  ])

  const rootData = root.exists() ? root.data() : {}
  const rawData = {
    schemaVersion: rootData.schemaVersion ?? meta?.schemaVersion,
    meta: {
      ...(meta ?? {}),
      revision: rootData.revision ?? meta?.revision,
    },
    profile: profile ?? {},
    settings: settings ?? {},
    masters: masters ?? {},
    transactions,
    recurringRules,
    installmentPlans,
    trips,
    budgets,
    goals,
  }
  assertSupportedFinanceDataSchema(rawData)
  const normalized = normalizeFinanceData(rawData)
  // Cloud reads may contain an older nested trip read model whose fields no
  // longer match the canonical transaction owner. Reconcile that read model
  // from the transaction source and let callers decide when a report must
  // block persistence (imports and export validation remain strict).
  // Reuse the normalized payload so legacy records missing timestamps/ids do
  // not receive a second set of fallback values between baseline and runtime.
  const migration = migrateFinanceDataWithReport(normalized)
  return {
    data: migration.data,
    baselineData: createPersistedFinanceBaseline(normalized),
    reconciliation: migration.report,
  }
}

export async function loadFinanceDataFromCloud(userId: string): Promise<FinanceData | null> {
  const result = await loadFinanceDataFromCloudWithReport(userId)
  return result?.data ?? null
}

export async function saveFinanceDataToCloud(
  userId: string,
  data: FinanceData,
  options: FinanceSaveOptions = {},
): Promise<number> {
  const db = requireFirestore()
  const exportableData = createExportableFinanceData(data)
  assertValidExportableData(exportableData)
  const expectedRevision = Math.max(0, Math.floor(options.expectedRevision ?? exportableData.meta.revision ?? 0))
  const baseData = options.baseData ? createPersistedFinanceData(options.baseData) : null
  const mutations: Mutation[] = []

  mutations.push({
    kind: 'set',
    ref: userRootRef(db, userId),
    merge: true,
    data: {
      schemaVersion: exportableData.schemaVersion,
      updatedAt: exportableData.meta.updatedAt,
      revision: expectedRevision + 1,
    },
  })

  for (const collectionName of singletonCollectionNames) {
    const baseSingleton = baseData?.[collectionName]
    if (baseData && baseSingleton && comparableFirestoreValue(baseSingleton) === comparableFirestoreValue(exportableData[collectionName])) continue
    mutations.push({
      kind: 'set',
      ref: singletonDocRef(db, userId, collectionName),
      data: stripUndefined(exportableData[collectionName]) as Record<string, unknown>,
    })
  }

  for (const collectionName of itemCollectionNames) {
    const collectionRef = itemCollectionRef(db, userId, collectionName)
    const nextItems = exportableData[collectionName]
    const nextIds = new Set(nextItems.map((item) => item.id))
    const baseItems = baseData?.[collectionName]

    // Ordinary saves delete only IDs that existed in this client's baseline.
    // Full replacement additionally removes documents left over from older data.
    const idsToDelete = options.replace
      ? (await getDocs(collectionRef)).docs.filter((snapshot) => !nextIds.has(snapshot.id)).map((snapshot) => snapshot.id)
      : (baseItems ?? []).filter((item) => !nextIds.has(item.id)).map((item) => item.id)
    idsToDelete.forEach((id) => mutations.push({ kind: 'delete', ref: doc(collectionRef, id) }))

    getChangedFirestoreItems(nextItems, baseItems, options.replace).forEach((item) => {
      mutations.push({
        kind: 'set',
        ref: doc(collectionRef, item.id),
        data: stripUndefined(item) as Record<string, unknown>,
      })
    })
  }

  // Firestore removed the 500-write commit/transaction limit in March 2023.
  // Keep replacement atomic; the service still enforces request-size limits.
  return runTransaction(db, async (transaction) => {
    const rootSnapshot = await transaction.get(userRootRef(db, userId))
    const rootData = rootSnapshot.exists() ? rootSnapshot.data() : {}
    const actualSchemaVersion = Number(rootData.schemaVersion ?? exportableData.schemaVersion)
    if (Number.isFinite(actualSchemaVersion) && actualSchemaVersion > exportableData.schemaVersion) {
      throw new Error(`ไม่สามารถเขียนทับข้อมูล schema v${actualSchemaVersion} ด้วย writer v${exportableData.schemaVersion}`)
    }
    const actualRevision = Math.max(0, Math.floor(Number(rootData.revision ?? 0) || 0))
    if (actualRevision !== expectedRevision) throw new FinanceDataConflictError(expectedRevision, actualRevision)

    const writer = transaction as unknown as FirestoreWriter
    mutations.forEach((mutation) => {
      if (mutation.kind === 'delete') writer.delete(mutation.ref)
      else if (mutation.merge) writer.set(mutation.ref, mutation.data, { merge: true })
      else writer.set(mutation.ref, mutation.data)
    })
    return expectedRevision + 1
  })
}

export const firestoreFinanceRepository: FinanceRepository = {
  load: loadFinanceDataFromCloud,
  save: saveFinanceDataToCloud,
}
