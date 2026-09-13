import { getDataSchemaVersion, getMigrationConflicts } from './dataMigration'
import { FINANCE_SCHEMA_VERSION } from '../types/finance'

export type ImportValidationIssue = {
  path: string
  code: 'root' | 'version' | 'collection' | 'record' | 'id' | 'duplicate-id' | 'date' | 'month' | 'amount' | 'enum' | 'reference'
  message: string
}

export type ImportValidationResult = {
  schemaVersion: number | null
  issues: ImportValidationIssue[]
}

export class FinanceImportValidationError extends Error {
  readonly issues: ImportValidationIssue[]
  readonly schemaVersion: number | null

  constructor(result: ImportValidationResult) {
    const detail = result.issues
      .slice(0, 4)
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join(' · ')
    super(`ไฟล์นำเข้าไม่ผ่านการตรวจสอบ${detail ? ` (${detail})` : ''}`)
    this.name = 'FinanceImportValidationError'
    this.issues = result.issues
    this.schemaVersion = result.schemaVersion
  }
}

type RawRecord = Record<string, unknown>

function isRecord(value: unknown): value is RawRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function hasOwn(record: RawRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key)
}

function isValidDate(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function isValidMonth(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}$/.test(value)) return false
  const month = Number(value.slice(5, 7))
  return month >= 1 && month <= 12
}

function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = Number(value.replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function addIssue(issues: ImportValidationIssue[], issue: ImportValidationIssue): void {
  issues.push(issue)
}

function validateId(value: unknown, path: string, issues: ImportValidationIssue[]): string | null {
  if (typeof value !== 'string' || !value.trim()) {
    addIssue(issues, { path, code: 'id', message: 'ต้องมี id เป็นข้อความที่ไม่ว่าง' })
    return null
  }
  return value.trim()
}

function validateRecord(value: unknown, path: string, issues: ImportValidationIssue[]): value is RawRecord {
  if (!isRecord(value)) {
    addIssue(issues, { path, code: 'record', message: 'ต้องเป็น object' })
    return false
  }
  return true
}

function validateAmount(record: RawRecord, key: string, path: string, issues: ImportValidationIssue[], required = true): void {
  if (!hasOwn(record, key)) {
    if (required) addIssue(issues, { path: `${path}.${key}`, code: 'amount', message: 'ต้องมีจำนวนเงิน' })
    return
  }
  const amount = parseFiniteNumber(record[key])
  if (amount === null || amount < 0) {
    addIssue(issues, { path: `${path}.${key}`, code: 'amount', message: 'ต้องเป็นจำนวนเงินที่ไม่ติดลบและเป็นตัวเลขจริง' })
  }
}

function validateDate(record: RawRecord, key: string, path: string, issues: ImportValidationIssue[], required = true): void {
  if (!hasOwn(record, key)) {
    if (required) addIssue(issues, { path: `${path}.${key}`, code: 'date', message: 'ต้องมีวันที่รูปแบบ YYYY-MM-DD' })
    return
  }
  if (!isValidDate(record[key])) {
    addIssue(issues, { path: `${path}.${key}`, code: 'date', message: 'วันที่ไม่ถูกต้องหรือไม่ใช่รูปแบบ YYYY-MM-DD' })
  }
}

function validateMonth(record: RawRecord, key: string, path: string, issues: ImportValidationIssue[], required = true): void {
  if (!hasOwn(record, key)) {
    if (required) addIssue(issues, { path: `${path}.${key}`, code: 'month', message: 'ต้องมีเดือนรูปแบบ YYYY-MM' })
    return
  }
  if (!isValidMonth(record[key])) {
    addIssue(issues, { path: `${path}.${key}`, code: 'month', message: 'เดือนไม่ถูกต้องหรือไม่ใช่รูปแบบ YYYY-MM' })
  }
}

function validateEnum(record: RawRecord, key: string, values: readonly string[], path: string, issues: ImportValidationIssue[], required = true): void {
  if (!hasOwn(record, key)) {
    if (required) addIssue(issues, { path: `${path}.${key}`, code: 'enum', message: 'ต้องมีค่าที่กำหนด' })
    return
  }
  if (typeof record[key] !== 'string' || !values.includes(record[key] as string)) {
    addIssue(issues, { path: `${path}.${key}`, code: 'enum', message: `ค่าต้องเป็น ${values.join(' / ')}` })
  }
}

function validateUniqueIds(items: unknown[], path: string, issues: ImportValidationIssue[], validateItem: (value: unknown, itemPath: string) => void): void {
  const seen = new Map<string, string>()
  items.forEach((value, index) => {
    const itemPath = `${path}[${index}]`
    if (isRecord(value)) {
      const id = validateId(value.id, `${itemPath}.id`, issues)
      if (id) {
        const previousPath = seen.get(id)
        if (previousPath) {
          addIssue(issues, { path: `${itemPath}.id`, code: 'duplicate-id', message: `ซ้ำกับ ${previousPath}` })
        } else {
          seen.set(id, itemPath)
        }
      }
    }
    validateItem(value, itemPath)
  })
}

function validateAliasConsistency(record: RawRecord, canonical: string, alias: string, issues: ImportValidationIssue[]): void {
  if (!hasOwn(record, canonical) || !hasOwn(record, alias) || !Array.isArray(record[canonical]) || !Array.isArray(record[alias])) return
  const canonicalById = new Map<string, string>()
  const aliasById = new Map<string, string>()
  record[canonical].filter(isRecord).forEach((item) => {
    if (typeof item.id === 'string' && item.id.trim()) canonicalById.set(item.id.trim(), JSON.stringify(item))
  })
  record[alias].filter(isRecord).forEach((item) => {
    if (typeof item.id === 'string' && item.id.trim()) aliasById.set(item.id.trim(), JSON.stringify(item))
  })
  const idsMatch = canonicalById.size === aliasById.size
    && Array.from(canonicalById.keys()).every((id) => aliasById.has(id))
  const valuesMatch = idsMatch && Array.from(canonicalById.entries()).every(([id, value]) => aliasById.get(id) === value)
  if (!idsMatch || !valuesMatch) {
    addIssue(issues, {
      path: `$.${alias}`,
      code: 'collection',
      message: `ขัดแย้งกับ ${canonical}; ไม่เลือกชุดข้อมูลใดชุดหนึ่งโดยอัตโนมัติ`,
    })
  }
}

function validateMasterCategories(items: unknown[], path: string, issues: ImportValidationIssue[]): void {
  const seen = new Map<string, string>()
  items.forEach((value, index) => {
    const itemPath = `${path}[${index}]`
    if (!validateRecord(value, itemPath, issues)) return
    const id = validateId(value.id ?? value.categoryId, `${itemPath}.id`, issues)
    if (id) {
      const previousPath = seen.get(id)
      if (previousPath) addIssue(issues, { path: `${itemPath}.id`, code: 'duplicate-id', message: `ซ้ำกับ ${previousPath}` })
      else seen.set(id, itemPath)
    }
    if (hasOwn(value, 'kind')) validateEnum(value, 'kind', ['income', 'expense', 'mixed'], itemPath, issues, false)
  })
}

function validateTransactions(items: unknown[], path: string, issues: ImportValidationIssue[]): void {
  validateUniqueIds(items, path, issues, (value, itemPath) => {
    if (!validateRecord(value, itemPath, issues)) return
    validateEnum(value, 'type', ['income', 'expense'], itemPath, issues)
    validateDate(value, 'date', itemPath, issues)
    validateAmount(value, 'amount', itemPath, issues)
    if (hasOwn(value, 'status')) validateEnum(value, 'status', ['cleared', 'pending'], itemPath, issues, false)
    if (hasOwn(value, 'tripId') && value.tripId !== null && (typeof value.tripId !== 'string' || !value.tripId.trim())) {
      addIssue(issues, { path: `${itemPath}.tripId`, code: 'reference', message: 'ถ้ามีต้องเป็น trip id ที่ไม่ว่าง' })
    }
  })
}

function validateRecurringRules(items: unknown[], path: string, issues: ImportValidationIssue[]): void {
  validateUniqueIds(items, path, issues, (value, itemPath) => {
    if (!validateRecord(value, itemPath, issues)) return
    validateEnum(value, 'type', ['income', 'expense'], itemPath, issues)
    validateDate(value, 'startDate', itemPath, issues)
    validateAmount(value, 'amount', itemPath, issues)
  })
}

function validateInstallmentPlans(items: unknown[], path: string, issues: ImportValidationIssue[]): void {
  validateUniqueIds(items, path, issues, (value, itemPath) => {
    if (!validateRecord(value, itemPath, issues)) return
    const hasMonthlyAmount = hasOwn(value, 'monthlyAmount')
    const hasPaymentAmount = hasOwn(value, 'paymentAmount')
    if (!hasMonthlyAmount && !hasPaymentAmount) {
      addIssue(issues, { path: `${itemPath}.monthlyAmount`, code: 'amount', message: 'ต้องมี monthlyAmount หรือ paymentAmount' })
    } else {
      if (hasMonthlyAmount) validateAmount(value, 'monthlyAmount', itemPath, issues)
      if (hasPaymentAmount) validateAmount(value, 'paymentAmount', itemPath, issues, false)
    }
    const monthCountKey = ['monthsTotal', 'totalMonths', 'installmentCount'].find((key) => hasOwn(value, key))
    if (!monthCountKey) {
      addIssue(issues, { path: `${itemPath}.monthsTotal`, code: 'record', message: 'ต้องมีจำนวนงวด' })
    } else {
      const monthCount = parseFiniteNumber(value[monthCountKey])
      if (monthCount === null || !Number.isInteger(monthCount) || monthCount < 1) {
        addIssue(issues, { path: `${itemPath}.${monthCountKey}`, code: 'record', message: 'จำนวนงวดต้องเป็นจำนวนเต็มมากกว่า 0' })
      }
    }
    validateMonth(value, 'startMonth', itemPath, issues)
    for (const key of ['dueDay', 'paymentDay']) {
      if (!hasOwn(value, key) || value[key] === null || value[key] === '') continue
      const dueDay = parseFiniteNumber(value[key])
      if (dueDay === null || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
        addIssue(issues, { path: `${itemPath}.${key}`, code: 'date', message: 'วันครบกำหนดต้องเป็นจำนวนเต็ม 1 ถึง 31' })
      }
    }
    if (hasOwn(value, 'paidMonthKeys')) {
      if (!Array.isArray(value.paidMonthKeys)) {
        addIssue(issues, { path: `${itemPath}.paidMonthKeys`, code: 'collection', message: 'ต้องเป็น array' })
      } else {
        const seen = new Set<string>()
        value.paidMonthKeys.forEach((month, index) => {
          if (!isValidMonth(month)) addIssue(issues, { path: `${itemPath}.paidMonthKeys[${index}]`, code: 'month', message: 'เดือนไม่ถูกต้อง' })
          if (typeof month === 'string' && seen.has(month)) addIssue(issues, { path: `${itemPath}.paidMonthKeys[${index}]`, code: 'duplicate-id', message: 'เดือนที่จ่ายซ้ำกัน' })
          if (typeof month === 'string') seen.add(month)
        })
      }
    }
    if (hasOwn(value, 'balanceSnapshot')) {
      if (value.balanceSnapshot === null) {
        // Explicit null means there is no historical snapshot.
      } else if (!isRecord(value.balanceSnapshot)) {
        addIssue(issues, { path: `${itemPath}.balanceSnapshot`, code: 'record', message: 'ต้องเป็น object หรือ null' })
      } else {
        validateAmount(value.balanceSnapshot, 'amountMinor', `${itemPath}.balanceSnapshot`, issues)
        if (hasOwn(value.balanceSnapshot, 'asOfMonth') && value.balanceSnapshot.asOfMonth !== null) {
          validateMonth(value.balanceSnapshot, 'asOfMonth', `${itemPath}.balanceSnapshot`, issues)
        }
        if (hasOwn(value.balanceSnapshot, 'basis')) validateEnum(value.balanceSnapshot, 'basis', ['override', 'reported'], `${itemPath}.balanceSnapshot`, issues, false)
      }
    }
  })
}

function validateTripItems(items: unknown[], path: string, issues: ImportValidationIssue[]): void {
  validateUniqueIds(items, path, issues, (value, itemPath) => {
    if (!validateRecord(value, itemPath, issues)) return
    validateDate(value, 'date', itemPath, issues)
    validateAmount(value, 'amount', itemPath, issues)
  })
}

function validateTrips(items: unknown[], path: string, issues: ImportValidationIssue[]): void {
  validateUniqueIds(items, path, issues, (value, itemPath) => {
    if (!validateRecord(value, itemPath, issues)) return
    validateDate(value, 'startDate', itemPath, issues)
    validateDate(value, 'endDate', itemPath, issues)
    if (isValidDate(value.startDate) && isValidDate(value.endDate) && String(value.endDate) < String(value.startDate)) {
      addIssue(issues, { path: `${itemPath}.endDate`, code: 'date', message: 'ต้องไม่อยู่ก่อน startDate' })
    }
    if (hasOwn(value, 'budget')) validateAmount(value, 'budget', itemPath, issues, false)
    if (hasOwn(value, 'items')) {
      if (Array.isArray(value.items)) validateTripItems(value.items, `${itemPath}.items`, issues)
      else addIssue(issues, { path: `${itemPath}.items`, code: 'collection', message: 'ต้องเป็น array' })
    }
  })
}

function validateBudgets(items: unknown[], path: string, issues: ImportValidationIssue[]): void {
  validateUniqueIds(items, path, issues, (value, itemPath) => {
    if (!validateRecord(value, itemPath, issues)) return
    validateEnum(value, 'scope', ['monthly', 'trip'], itemPath, issues, false)
    validateAmount(value, 'amount', itemPath, issues, false)
    if (value.scope === 'monthly') validateMonth(value, 'month', itemPath, issues)
    if (hasOwn(value, 'lines')) {
      if (!Array.isArray(value.lines)) {
        addIssue(issues, { path: `${itemPath}.lines`, code: 'collection', message: 'ต้องเป็น array' })
      } else {
        validateUniqueIds(value.lines, `${itemPath}.lines`, issues, (line, linePath) => {
          if (!validateRecord(line, linePath, issues)) return
          validateId(line.categoryId ?? line.category, `${linePath}.categoryId`, issues)
          validateAmount(line, 'amount', linePath, issues)
        })
      }
    }
    if (value.scope === 'trip' && hasOwn(value, 'tripId') && (typeof value.tripId !== 'string' || !value.tripId.trim())) {
      addIssue(issues, { path: `${itemPath}.tripId`, code: 'reference', message: 'ถ้ามีต้องเป็น trip id ที่ไม่ว่าง' })
    }
  })
}

function validateGoals(items: unknown[], path: string, issues: ImportValidationIssue[]): void {
  validateUniqueIds(items, path, issues, (value, itemPath) => {
    if (!validateRecord(value, itemPath, issues)) return
    validateAmount(value, 'targetAmount', itemPath, issues)
    validateAmount(value, 'currentAmount', itemPath, issues)
    if (hasOwn(value, 'kind')) validateEnum(value, 'kind', ['savings'], itemPath, issues, false)
    if (hasOwn(value, 'type')) validateEnum(value, 'type', ['savings'], itemPath, issues, false)
    if (hasOwn(value, 'targetDate') && value.targetDate !== null && value.targetDate !== '') validateDate(value, 'targetDate', itemPath, issues, false)
    if (hasOwn(value, 'status')) validateEnum(value, 'status', ['active', 'paused', 'completed'], itemPath, issues, false)
  })
}

type CollectionDefinition = {
  canonical: string
  aliases: string[]
  validate: (items: unknown[], path: string, issues: ImportValidationIssue[]) => void
}

const collections: CollectionDefinition[] = [
  { canonical: 'transactions', aliases: ['transactions', 'entries'], validate: validateTransactions },
  { canonical: 'recurringRules', aliases: ['recurringRules'], validate: validateRecurringRules },
  { canonical: 'installmentPlans', aliases: ['installmentPlans', 'installments'], validate: validateInstallmentPlans },
  { canonical: 'trips', aliases: ['trips'], validate: validateTrips },
  { canonical: 'budgets', aliases: ['budgets'], validate: validateBudgets },
  { canonical: 'goals', aliases: ['goals'], validate: validateGoals },
]

function parseVersion(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function validateFinanceImportPayload(raw: unknown): ImportValidationResult {
  const issues: ImportValidationIssue[] = []
  if (!isRecord(raw)) {
    addIssue(issues, { path: '$', code: 'root', message: 'root ต้องเป็น object ของ FinanceData' })
    return { schemaVersion: null, issues }
  }

  const rootVersionPresent = hasOwn(raw, 'schemaVersion')
  const rootVersion = rootVersionPresent ? parseVersion(raw.schemaVersion) : null
  const settings = isRecord(raw.settings) ? raw.settings : null
  for (const key of ['profile', 'settings', 'masters', 'meta']) {
    if (hasOwn(raw, key) && !isRecord(raw[key])) {
      addIssue(issues, { path: `$.${key}`, code: 'root', message: 'ต้องเป็น object' })
    }
  }
  const masters = isRecord(raw.masters) ? raw.masters : null
  if (masters && hasOwn(masters, 'categories')) {
    if (!Array.isArray(masters.categories)) {
      addIssue(issues, { path: '$.masters.categories', code: 'collection', message: 'ต้องเป็น array' })
    } else {
      validateMasterCategories(masters.categories, '$.masters.categories', issues)
    }
  }
  if (masters && hasOwn(masters, 'tags') && !Array.isArray(masters.tags)) {
    addIssue(issues, { path: '$.masters.tags', code: 'collection', message: 'ต้องเป็น array' })
  }
  const settingsVersionPresent = Boolean(settings && hasOwn(settings, 'schemaVersion'))
  const settingsVersion = settingsVersionPresent && settings ? parseVersion(settings.schemaVersion) : null
  const meta = isRecord(raw.meta) ? raw.meta : null
  const metaVersionPresent = Boolean(meta && hasOwn(meta, 'schemaVersion'))
  const metaVersion = metaVersionPresent && meta ? parseVersion(meta.schemaVersion) : null
  const schemaVersion = getDataSchemaVersion(raw)
  if (rootVersionPresent && rootVersion === null) {
    addIssue(issues, { path: '$.schemaVersion', code: 'version', message: 'schemaVersion ต้องเป็นตัวเลข' })
  }
  if (settingsVersionPresent && settingsVersion === null) {
    addIssue(issues, { path: '$.settings.schemaVersion', code: 'version', message: 'schemaVersion ต้องเป็นตัวเลข' })
  }
  if (metaVersionPresent && metaVersion === null) {
    addIssue(issues, { path: '$.meta.schemaVersion', code: 'version', message: 'schemaVersion ต้องเป็นตัวเลข' })
  }
  if (rootVersion !== null && !Number.isInteger(rootVersion)) addIssue(issues, { path: '$.schemaVersion', code: 'version', message: 'schemaVersion ต้องเป็นจำนวนเต็ม' })
  if (settingsVersion !== null && !Number.isInteger(settingsVersion)) addIssue(issues, { path: '$.settings.schemaVersion', code: 'version', message: 'schemaVersion ต้องเป็นจำนวนเต็ม' })
  if (metaVersion !== null && !Number.isInteger(metaVersion)) addIssue(issues, { path: '$.meta.schemaVersion', code: 'version', message: 'schemaVersion ต้องเป็นจำนวนเต็ม' })
  if (rootVersion !== null && settingsVersion !== null && rootVersion !== settingsVersion) {
    addIssue(issues, { path: '$.settings.schemaVersion', code: 'version', message: 'ไม่ตรงกับ schemaVersion ที่ root' })
  }
  if (rootVersion !== null && metaVersion !== null && rootVersion !== metaVersion) {
    addIssue(issues, { path: '$.meta.schemaVersion', code: 'version', message: 'ไม่ตรงกับ schemaVersion ที่ root' })
  }
  if (settingsVersion !== null && metaVersion !== null && settingsVersion !== metaVersion) {
    addIssue(issues, { path: '$.meta.schemaVersion', code: 'version', message: 'ไม่ตรงกับ schemaVersion ใน settings' })
  }
  if (schemaVersion !== null && (schemaVersion < 1 || schemaVersion > FINANCE_SCHEMA_VERSION)) {
    addIssue(issues, { path: '$.schemaVersion', code: 'version', message: schemaVersion > FINANCE_SCHEMA_VERSION ? `ยังไม่รองรับ schema v${schemaVersion}` : `ไม่รองรับ schema v${schemaVersion}` })
  }

  let collectionPresent = false
  for (const definition of collections) {
    const presentKeys = definition.aliases.filter((key) => hasOwn(raw, key))
    if (presentKeys.length) collectionPresent = true
    presentKeys.forEach((key) => {
      if (!Array.isArray(raw[key])) {
        addIssue(issues, { path: `$.${key}`, code: 'collection', message: 'ต้องเป็น array' })
      }
    })
    if (definition.aliases.length > 1) validateAliasConsistency(raw, definition.canonical, definition.aliases[1], issues)
    const sourceKey = hasOwn(raw, definition.canonical) ? definition.canonical : definition.aliases.find((key) => hasOwn(raw, key))
    if (sourceKey && Array.isArray(raw[sourceKey])) definition.validate(raw[sourceKey], `$.${sourceKey}`, issues)
    const aliasKey = presentKeys.find((key) => key !== sourceKey)
    if (aliasKey && Array.isArray(raw[aliasKey])) definition.validate(raw[aliasKey], `$.${aliasKey}`, issues)
  }
  if (!collectionPresent) addIssue(issues, { path: '$', code: 'collection', message: 'ไม่พบ collection ของข้อมูล หรือไฟล์ไม่ใช่ backup ของแอป' })

  getMigrationConflicts(raw).forEach((conflict) => {
    addIssue(issues, {
      path: conflict.path,
      code: 'collection',
      message: conflict.message,
    })
  })

  return { schemaVersion, issues }
}

export function assertValidFinanceImportPayload(raw: unknown): ImportValidationResult {
  const result = validateFinanceImportPayload(raw)
  if (result.issues.length) throw new FinanceImportValidationError(result)
  return result
}
