/**
 * Master Color System (Design Tokens) for Finance Tracker
 *
 * Single Source of Truth สำหรับโทนสีของระบบ เพื่อให้ UI ทั้งหมด
 * เรียกใช้ค่าสีที่สอดคล้องกันและเป็นไปตาม Semantic Tokens เดียวกัน
 */

export const MASTER_COLORS = {
  // Brand / Primary: สีน้ำเงินหลักของระบบ ใช้กับแอ็กชันหลัก, แท็บที่เลือก, ลิงก์
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    900: '#1e3a8a',
  },

  // Income / Positive: สีเขียวมรกตสำหรับรายรับ, ชำระแล้ว, ปลอดภัย
  income: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
  },

  // Expense / Danger: สีกุหลาบ/แดง สำหรับรายจ่าย, เกินงบ, ลบข้อมูล, เกิดข้อผิดพลาด
  expense: {
    50: '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    500: '#f43f5e',
    600: '#e11d48',
    700: '#be123c',
    800: '#9f1239',
  },

  // Warning / Due: สีอำพันสำหรับรอชำระ, ใกล้ครบกำหนด, เตือนใกล้เต็มงบ
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Neutral / Slate: สำหรับข้อความ, พื้นหลัง, เส้นขอบ
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },

  // Surface: พื้นหลังแอป และการ์ด
  surface: {
    bg: '#f4f8fc',
    bgGradientStart: '#f8fbff',
    card: '#ffffff',
    cardMuted: '#f8fafc',
  },
} as const

/**
 * โทนสีหมวดหมู่สำหรับกราฟ (Category Donut & Bar Charts)
 * จัดคู่สีให้อยู่ในโทนที่เข้ากันกับสีหลักของระบบ ไม่แปลกแยก
 */
export const CATEGORY_CHART_COLORS: readonly string[] = [
  '#2563eb', // 1. Blue (Primary)
  '#059669', // 2. Emerald (Income/Success)
  '#d97706', // 3. Amber (Warning/Gold)
  '#7c3aed', // 4. Violet (Accent)
  '#e11d48', // 5. Rose (Expense)
  '#0891b2', // 6. Cyan (Fresh Accent)
  '#ea580c', // 7. Orange (Warm Accent)
  '#64748b', // 8. Slate (Neutral)
]

/**
 * Semantic Tone Type สำหรับคอมโพเนนต์ที่รองรับ tone ต่างๆ
 */
export type SemanticTone = 'primary' | 'income' | 'expense' | 'warning' | 'neutral'

/**
 * Tailwind Classes ประจำแต่ละ Semantic Tone
 */
export const SEMANTIC_TONE_CLASSES: Record<
  SemanticTone,
  {
    text: string
    bgLight: string
    borderLight: string
    solid: string
    badge: string
    bar: string
  }
> = {
  primary: {
    text: 'text-blue-700',
    bgLight: 'bg-blue-50/90',
    borderLight: 'border-blue-200/60',
    solid: 'bg-blue-600 text-white',
    badge: 'border-blue-200/60 bg-blue-50/90 text-blue-700',
    bar: 'bg-blue-600',
  },
  income: {
    text: 'text-emerald-700',
    bgLight: 'bg-emerald-50/90',
    borderLight: 'border-emerald-200/60',
    solid: 'bg-emerald-600 text-white',
    badge: 'border-emerald-200/60 bg-emerald-50/90 text-emerald-700',
    bar: 'bg-emerald-500',
  },
  expense: {
    text: 'text-rose-700',
    bgLight: 'bg-rose-50/90',
    borderLight: 'border-rose-200/60',
    solid: 'bg-rose-600 text-white',
    badge: 'border-rose-200/60 bg-rose-50/90 text-rose-700',
    bar: 'bg-rose-500',
  },
  warning: {
    text: 'text-amber-700',
    bgLight: 'bg-amber-50/90',
    borderLight: 'border-amber-200/60',
    solid: 'bg-amber-600 text-white',
    badge: 'border-amber-200/60 bg-amber-50/90 text-amber-700',
    bar: 'bg-amber-500',
  },
  neutral: {
    text: 'text-slate-600',
    bgLight: 'bg-slate-100/80',
    borderLight: 'border-slate-200/80',
    solid: 'bg-slate-700 text-white',
    badge: 'border-slate-200/80 bg-slate-100/80 text-slate-600',
    bar: 'bg-slate-400',
  },
}
