import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  writeBatch,
  type DocumentReference,
  type Firestore,
  type WriteBatch,
} from 'firebase/firestore'
import { createExportableFinanceData, normalizeFinanceData } from '../../lib/dataMigration'
import type { FinanceData } from '../../types/finance'
import { getFirebaseApp } from './firebaseApp'

const META_DOC_ID = 'app'
const SINGLETON_DOC_ID = 'main'
const BATCH_CHUNK_SIZE = 400

const singletonCollectionNames = ['meta', 'profile', 'settings', 'masters'] as const
const itemCollectionNames = ['transactions', 'recurringRules', 'installmentPlans', 'trips', 'budgets', 'goals'] as const

type SingletonCollectionName = (typeof singletonCollectionNames)[number]
type ItemCollectionName = (typeof itemCollectionNames)[number]
type WriteOperation = (batch: WriteBatch) => void
type ExportableFinanceData = ReturnType<typeof createExportableFinanceData>

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

function documentDataWithId(docId: string, value: unknown): Record<string, unknown> {
  const data = isRecord(value) ? value : {}
  return {
    id: typeof data.id === 'string' && data.id.trim() ? data.id : docId,
    ...data,
  }
}

function assertValidExportableData(data: ExportableFinanceData): void {
  for (const collectionName of itemCollectionNames) {
    const hasInvalidId = data[collectionName].some((item) => typeof item.id !== 'string' || !item.id.trim())
    if (hasInvalidId) throw new Error(`ไม่สามารถบันทึกขึ้น Cloud เพราะ ${collectionName} มีรายการที่ไม่มี id`)
  }
}

async function commitOperations(db: Firestore, operations: WriteOperation[]): Promise<void> {
  for (let index = 0; index < operations.length; index += BATCH_CHUNK_SIZE) {
    const batch = writeBatch(db)
    operations.slice(index, index + BATCH_CHUNK_SIZE).forEach((operation) => operation(batch))
    await batch.commit()
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

export async function loadFinanceDataFromCloud(userId: string): Promise<FinanceData | null> {
  const db = requireFirestore()
  const hasCloudData = await checkCloudDataExists(userId)
  if (!hasCloudData) return null

  const [
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

  return normalizeFinanceData({
    schemaVersion: meta?.schemaVersion,
    meta: meta ?? {},
    profile: profile ?? {},
    settings: settings ?? {},
    masters: masters ?? {},
    transactions,
    recurringRules,
    installmentPlans,
    trips,
    budgets,
    goals,
  })
}

export async function saveFinanceDataToCloud(userId: string, data: FinanceData): Promise<void> {
  const db = requireFirestore()
  const exportableData = createExportableFinanceData(data)
  assertValidExportableData(exportableData)
  const operations: WriteOperation[] = [
    (batch) => {
      batch.set(userRootRef(db, userId), {
        schemaVersion: exportableData.schemaVersion,
        updatedAt: exportableData.meta.updatedAt,
      }, { merge: true })
    },
  ]

  for (const collectionName of singletonCollectionNames) {
    operations.push((batch) => {
      batch.set(singletonDocRef(db, userId, collectionName), stripUndefined(exportableData[collectionName]) as Record<string, unknown>)
    })
  }

  for (const collectionName of itemCollectionNames) {
    const collectionRef = itemCollectionRef(db, userId, collectionName)
    const nextItems = exportableData[collectionName]
    const nextIds = new Set(nextItems.map((item) => item.id))
    const existingSnapshot = await getDocs(collectionRef)
    existingSnapshot.docs.forEach((snapshot) => {
      if (!nextIds.has(snapshot.id)) {
        operations.push((batch) => {
          batch.delete(snapshot.ref)
        })
      }
    })

    nextItems.forEach((item) => {
      operations.push((batch) => {
        batch.set(doc(collectionRef, item.id), stripUndefined(item) as Record<string, unknown>)
      })
    })
  }

  await commitOperations(db, operations)
}
