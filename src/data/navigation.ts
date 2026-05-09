import type { NavItem } from '../types/finance'

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'monthly',
    label: 'หน้าหลัก',
    icon: '▦',
    title: 'แดชบอร์ดการเงินส่วนตัว',
    subtitle: 'จัดการรายรับ รายจ่าย งบ และเป้าหมายในมุมมองรายเดือน',
  },
  {
    id: 'yearly',
    label: 'รายปี',
    icon: '▤',
    title: 'ภาพรวมทั้งปี',
    subtitle: 'ดูแนวโน้มรายรับ รายจ่าย และคงเหลือ 12 เดือน',
  },
  {
    id: 'installments',
    label: 'ผ่อน',
    icon: '◌',
    title: 'จัดการยอดผ่อน',
    subtitle: 'ติดตามค่างวด ยอดคงเหลือ และรายการที่ใกล้ถึงกำหนด',
  },
  {
    id: 'trips',
    label: 'ทริป',
    icon: '✈',
    title: 'จัดการทริป',
    subtitle: 'วางแผนงบทริป บันทึกรายการจริง และเทียบงบต่อหมวด',
  },
  {
    id: 'more',
    label: 'เพิ่มเติม',
    icon: '⋯',
    title: 'เพิ่มเติม',
    subtitle: 'ไฟล์ บัญชี นำเข้า/ส่งออก และพื้นที่สำหรับซิงก์ต่อในอนาคต',
  },
]
