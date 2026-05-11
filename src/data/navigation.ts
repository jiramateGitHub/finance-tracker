import type { NavItem } from '../types/finance'

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'monthly',
    label: 'หน้าหลัก',
    icon: '▦',
    title: 'แดชบอร์ดการเงินส่วนตัว',
  },
  {
    id: 'yearly',
    label: 'รายปี',
    icon: '▤',
    title: 'ภาพรวมทั้งปี',
  },
  {
    id: 'installments',
    label: 'ผ่อน',
    icon: '◌',
    title: 'จัดการยอดผ่อน',
  },
  {
    id: 'trips',
    label: 'ทริป',
    icon: '✈',
    title: 'จัดการทริป',
  },
  {
    id: 'more',
    label: 'เพิ่มเติม',
    icon: '⋯',
    title: 'เพิ่มเติม',
  },
]
