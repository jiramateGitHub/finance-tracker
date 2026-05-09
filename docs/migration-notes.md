# Migration Notes

## แนวทางที่ใช้ใน scaffold นี้

- ไม่ย้าย JavaScript เดิมทั้งก้อนทันที เพราะ HTML เดิมมี state และ DOM manipulation จำนวนมาก
- เริ่มจากแยก domain model ก่อน แล้วค่อยย้ายทีละ feature
- Tailwind จะเป็น styling หลัก แทนการย้าย CSS ทั้ง 5,000+ บรรทัดแบบตรง ๆ
- `useFinanceStore` เป็น temporary store ก่อน ถ้าระบบใหญ่ขึ้นค่อยแยก context/reducer หรือ state library

## โครงไฟล์สำคัญ

```text
src/
  components/
    layout/          # shell, header, bottom nav
    ui/              # reusable UI primitives
  data/              # seed data, nav config, master data
  features/
    monthly/
    yearly/
    installments/
    trips/
    more/
  hooks/
  lib/               # pure calculations
  types/
  utils/
```

## หลักการย้าย logic จาก HTML

1. หา DOM render function เดิม เช่น `renderMonthly`, `renderTrips`
2. แยก pure calculation ออกมาก่อน
3. สร้าง TypeScript type ให้ field ชัดเจน
4. สร้าง component ที่รับ props ไม่แตะ DOM ตรง ๆ
5. เขียน action ใน store/hook
6. ค่อยเชื่อม form และ validation

## เช็คก่อน merge แต่ละ phase

```bash
npm run lint
npm run build
```
