import { LEGACY_CATEGORY_OPTIONS } from './categories'
import { normalizeFinanceData } from '../lib/dataMigration'

const now = '2026-05-08T00:00:00.000+07:00'

export const CATEGORY_OPTIONS = [...LEGACY_CATEGORY_OPTIONS]

export const seedData = normalizeFinanceData({
  settings: {
    baseCurrency: 'THB',
    locale: 'th-TH',
    timezone: 'Asia/Bangkok',
    schemaVersion: 2,
  },
  entries: [
    {
      id: 'entry-salary-may',
      type: 'income',
      date: '2026-05-01',
      category: 'เงินเดือน',
      title: 'เงินเดือนประจำเดือน',
      amount: 50000,
      status: 'cleared',
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'entry-rent-may',
      type: 'expense',
      date: '2026-05-03',
      category: 'บ้าน/เช่า',
      title: 'ค่าเช่าห้อง',
      amount: 12000,
      status: 'cleared',
      source: 'manual',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'entry-food-may',
      type: 'expense',
      date: '2026-05-07',
      category: 'ของกิน',
      title: 'อาหารและกาแฟ',
      amount: 320,
      status: 'pending',
      source: 'quick-add',
      createdAt: now,
      updatedAt: now,
    },
  ],
  installments: [
    {
      id: 'loan-phone',
      name: 'โทรศัพท์มือถือ',
      category: 'ผ่อนสินค้า',
      monthlyAmount: 1800,
      monthsTotal: 12,
      monthsPaid: 5,
      startMonth: '2026-01',
      dueDay: 5,
      principal: 21600,
      interestType: 'none',
      note: 'ตัวอย่างข้อมูลสำหรับทำ UI ก่อนย้าย logic จริง',
      createdAt: now,
      updatedAt: now,
    },
  ],
  trips: [
    {
      id: 'trip-shanghai',
      name: 'Shanghai 2026',
      destination: 'Shanghai, China',
      budget: 60000,
      startDate: '2026-05-20',
      endDate: '2026-05-24',
      note: 'ตัวอย่างทริปสำหรับวางโครง Trip module',
      items: [
        {
          id: 'trip-item-hotel',
          date: '2026-05-20',
          category: 'ท่องเที่ยว',
          title: 'โรงแรม',
          amount: 18000,
          isPaid: true,
        },
        {
          id: 'trip-item-food',
          date: '2026-05-21',
          category: 'ของกิน',
          title: 'อาหารระหว่างทริป',
          amount: 3500,
          isPaid: false,
        },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ],
  budgets: [
    {
      id: 'budget-food-may',
      scope: 'monthly',
      month: '2026-05',
      category: 'ของกิน',
      amount: 9000,
      note: 'งบอาหารเดือนนี้',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'budget-trip-shopping',
      scope: 'trip',
      tripId: 'trip-shanghai',
      category: 'ช้อปปิ้ง',
      amount: 12000,
      createdAt: now,
      updatedAt: now,
    },
  ],
  goals: [
    {
      id: 'goal-emergency',
      name: 'เงินสำรองฉุกเฉิน',
      targetAmount: 120000,
      currentAmount: 35000,
      targetDate: '2026-12-31',
      status: 'active',
      note: 'เก็บเงินสำรอง 6 เดือน',
      createdAt: now,
      updatedAt: now,
    },
  ],
})


