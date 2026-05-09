import type { CategoryKind, FinanceData, MasterCategory } from '../types/finance'

export const LEGACY_CATEGORY_OPTIONS = [
  'เงินเดือน',
  'โบนัส',
  'รายได้เสริม',
  'ธุรกิจ',
  'ฟรีแลนซ์',
  'ดอกเบี้ย/ปันผล',
  'ขายของออนไลน์',
  'คืนเงิน',
  'บ้าน/เช่า',
  'ค่าส่วนกลาง',
  'ไฟฟ้า',
  'น้ำประปา',
  'อินเทอร์เน็ต',
  'โทรศัพท์',
  'ของกิน',
  'กาแฟ/ขนม',
  'ค่าน้ำมัน',
  'เดินทาง',
  'รถยนต์',
  'ช้อปปิ้ง',
  'สัตว์เลี้ยง',
  'สุขภาพ',
  'ยา/รักษา',
  'ประกัน',
  'การศึกษา',
  'บันเทิง',
  'สมาชิก/Subscription',
  'บัตรเครดิต',
  'ผ่อนสินค้า',
  'เงินให้ครอบครัว',
  'ของขวัญ/งานสังคม',
  'ท่องเที่ยว',
  'ออมเงิน/ลงทุน',
  'ภาษี/ค่าธรรมเนียม',
  'ที่พัก',
  'เสื้อผ้า/เครื่องแต่งกาย',
  'ของใช้ส่วนตัว',
  'ซ่อมแซม/บำรุงรักษา',
  'บริจาค/ทำบุญ',
  'งานอดิเรก',
  'อื่นๆ',
] as const

export const CATEGORY_ICONS: Record<string, string> = {
  เงินเดือน: '💼',
  โบนัส: '🎉',
  รายได้เสริม: '✨',
  ธุรกิจ: '🏢',
  ฟรีแลนซ์: '🧑‍💻',
  'ดอกเบี้ย/ปันผล': '📈',
  ขายของออนไลน์: '🛍️',
  คืนเงิน: '↩️',
  'บ้าน/เช่า': '🏠',
  ค่าส่วนกลาง: '🧱',
  ไฟฟ้า: '💡',
  น้ำประปา: '🚰',
  อินเทอร์เน็ต: '🌐',
  โทรศัพท์: '📱',
  ของกิน: '🍱',
  'กาแฟ/ขนม': '☕',
  ค่าน้ำมัน: '⛽',
  เดินทาง: '🚗',
  รถยนต์: '🚘',
  ช้อปปิ้ง: '🛒',
  สัตว์เลี้ยง: '🐾',
  สุขภาพ: '🏥',
  'ยา/รักษา': '💊',
  ประกัน: '🛡️',
  การศึกษา: '📚',
  บันเทิง: '🎬',
  'สมาชิก/Subscription': '📦',
  บัตรเครดิต: '💳',
  ผ่อนสินค้า: '🧾',
  เงินให้ครอบครัว: '👨‍👩‍👧‍👦',
  'ของขวัญ/งานสังคม': '🎁',
  ท่องเที่ยว: '✈️',
  'ออมเงิน/ลงทุน': '🏦',
  'ภาษี/ค่าธรรมเนียม': '🏛️',
  ที่พัก: '🛏️',
  'เสื้อผ้า/เครื่องแต่งกาย': '👕',
  ของใช้ส่วนตัว: '🧴',
  'ซ่อมแซม/บำรุงรักษา': '🛠️',
  'บริจาค/ทำบุญ': '🤲',
  งานอดิเรก: '🎨',
  'อื่นๆ': '📌',
}

export const CATEGORY_LABELS: Record<string, string> = {
  ขายของออนไลน์: 'รายได้จากการขายออนไลน์',
  'บ้าน/เช่า': 'บ้านและค่าเช่า',
  ค่าส่วนกลาง: 'ค่าส่วนกลางที่พัก',
  ไฟฟ้า: 'ค่าไฟฟ้า',
  น้ำประปา: 'ค่าน้ำประปา',
  อินเทอร์เน็ต: 'ค่าอินเทอร์เน็ต',
  โทรศัพท์: 'ค่าโทรศัพท์',
  ของกิน: 'อาหาร',
  'กาแฟ/ขนม': 'เครื่องดื่มและของว่าง',
  ค่าน้ำมัน: 'น้ำมันเชื้อเพลิง',
  เดินทาง: 'การเดินทาง',
  รถยนต์: 'รถยนต์และการดูแล',
  ช้อปปิ้ง: 'ช้อปปิ้งและของใช้',
  'ยา/รักษา': 'ยาและค่ารักษา',
  ประกัน: 'ประกันภัย',
  'สมาชิก/Subscription': 'ค่าสมาชิกและบริการรายเดือน',
  ผ่อนสินค้า: 'ค่างวดสินค้า',
  เงินให้ครอบครัว: 'สนับสนุนครอบครัว',
  'ของขวัญ/งานสังคม': 'ของขวัญและงานสังคม',
  'ออมเงิน/ลงทุน': 'ออมเงินและลงทุน',
  'ภาษี/ค่าธรรมเนียม': 'ภาษีและค่าธรรมเนียม',
}

export const CATEGORY_ALIAS_MAP: Record<string, string> = {
  Other: 'อื่นๆ',
  other: 'อื่นๆ',
  'อื่น ๆ': 'อื่นๆ',
  Food: 'ของกิน',
  food: 'ของกิน',
  อาหาร: 'ของกิน',
  Housing: 'บ้าน/เช่า',
  housing: 'บ้าน/เช่า',
  บ้าน: 'บ้าน/เช่า',
  Travel: 'เดินทาง',
  travel: 'เดินทาง',
  Trips: 'ท่องเที่ยว',
  trips: 'ท่องเที่ยว',
  Installments: 'ผ่อนสินค้า',
  installments: 'ผ่อนสินค้า',
  ยอดผ่อน: 'ผ่อนสินค้า',
  Health: 'สุขภาพ',
  health: 'สุขภาพ',
  Shopping: 'ช้อปปิ้ง',
  shopping: 'ช้อปปิ้ง',
  Salary: 'เงินเดือน',
  salary: 'เงินเดือน',
}

export const SMART_CATEGORY_RULES: Array<{ keywords: string[]; category: string }> = [
  { keywords: ['ข้าว', 'กิน', 'อาหาร', 'food'], category: 'ของกิน' },
  { keywords: ['โรงแรม', 'hotel', 'hostel', 'airbnb'], category: 'ที่พัก' },
  { keywords: ['grab', 'taxi', 'แท็กซี่', 'รถไฟฟ้า'], category: 'เดินทาง' },
  { keywords: ['ค่าไฟ', 'ไฟฟ้า'], category: 'ไฟฟ้า' },
  { keywords: ['น้ำมัน', 'fuel', 'gas'], category: 'ค่าน้ำมัน' },
  { keywords: ['เสื้อผ้า', 'รองเท้า'], category: 'เสื้อผ้า/เครื่องแต่งกาย' },
  { keywords: ['แชมพู', 'สบู่', 'skincare', 'สกินแคร์'], category: 'ของใช้ส่วนตัว' },
  { keywords: ['โบนัส', 'bonus'], category: 'โบนัส' },
  { keywords: ['เงินเดือน', 'salary'], category: 'เงินเดือน' },
]

const legacyCategorySet = new Set<string>(LEGACY_CATEGORY_OPTIONS)
const incomeCategorySet = new Set<string>([
  'เงินเดือน',
  'โบนัส',
  'รายได้เสริม',
  'ธุรกิจ',
  'ฟรีแลนซ์',
  'ดอกเบี้ย/ปันผล',
  'ขายของออนไลน์',
  'คืนเงิน',
])

function normalizeText(value: unknown): string {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

export function normalizeCategoryId(value: unknown, fallback = 'อื่นๆ'): string {
  const raw = normalizeText(value)
  if (!raw) {
    const fallbackText = normalizeText(fallback)
    if (!fallbackText) return ''
    return normalizeCategoryId(fallbackText, '')
  }
  if (CATEGORY_ALIAS_MAP[raw]) return CATEGORY_ALIAS_MAP[raw]
  const lowered = raw.toLocaleLowerCase('en-US')
  if (CATEGORY_ALIAS_MAP[lowered]) return CATEGORY_ALIAS_MAP[lowered]
  return raw
}

export function getCategoryDisplayName(categoryId: string): string {
  const normalized = normalizeCategoryId(categoryId)
  return CATEGORY_LABELS[normalized] || normalized
}

export function getCategoryIcon(categoryId: string): string {
  const normalized = normalizeCategoryId(categoryId)
  return CATEGORY_ICONS[normalized] || '📌'
}

export function inferLegacyCategoryKind(categoryId: string): CategoryKind {
  const normalized = normalizeCategoryId(categoryId)
  if (incomeCategorySet.has(normalized)) return 'income'
  if (normalized === 'อื่นๆ') return 'mixed'
  return 'expense'
}

export function createLegacyMasterCategory(categoryId: string, kind?: CategoryKind): MasterCategory {
  const normalized = normalizeCategoryId(categoryId)
  return {
    id: normalized,
    label: getCategoryDisplayName(normalized),
    kind: kind ?? inferLegacyCategoryKind(normalized),
    isArchived: false,
  }
}

export function isLegacyCategory(categoryId: string): boolean {
  return legacyCategorySet.has(normalizeCategoryId(categoryId))
}

export function getCanonicalCategoryOptions(data?: FinanceData): string[] {
  const categories = new Set<string>(LEGACY_CATEGORY_OPTIONS)
  if (data) {
    data.masters.categories.forEach((category) => categories.add(normalizeCategoryId(category.id)))
    data.transactions.forEach((transaction) => {
      categories.add(normalizeCategoryId(transaction.categoryId || transaction.category))
    })
    data.recurringRules.forEach((rule) => {
      categories.add(normalizeCategoryId(rule.categoryId || rule.category))
    })
    data.installmentPlans.forEach((plan) => {
      categories.add(normalizeCategoryId(plan.categoryId || plan.category, 'ผ่อนสินค้า'))
    })
    data.budgets.forEach((budget) => {
      categories.add(normalizeCategoryId(budget.categoryId || budget.category, 'อื่นๆ'))
      budget.lines?.forEach((line) => categories.add(normalizeCategoryId(line.categoryId, 'อื่นๆ')))
    })
    data.trips.forEach((trip) => {
      trip.items.forEach((item) => categories.add(normalizeCategoryId(item.category, 'ท่องเที่ยว')))
    })
    data.goals.forEach((goal) => {
      if (goal.linkedCategoryId) categories.add(normalizeCategoryId(goal.linkedCategoryId))
    })
  }
  return Array.from(categories).filter(Boolean).sort((a, b) => a.localeCompare(b, 'th-TH'))
}
