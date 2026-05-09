# Finance Tracker React Scaffold

ชุดไฟล์นี้เป็นโครงเริ่มต้นสำหรับแปลง `income_expense_tracker.html` เดิมให้เป็น Vite + React + TypeScript + Tailwind CSS

## วิธีใช้

1. แตกไฟล์ zip นี้ทับโปรเจกต์ Vite เดิม
2. ติดตั้ง dependency

```bash
npm install
```

3. รัน dev server

```bash
npm run dev
```

4. ตรวจ build

```bash
npm run build
```

## สิ่งที่ scaffold นี้ทำไว้แล้ว

- เปลี่ยนหน้า Vite starter เป็น Finance Tracker shell
- เพิ่ม Tailwind CSS config และ PostCSS config
- แยกโครงหลักเป็น Layout, UI components, feature pages, types, utils, calculations และ store hook
- มี mock/seed data ให้เห็นภาพหน้า Monthly, Yearly, Installments, Trips และ More
- มี Import/Export JSON แบบ local draft
- มี placeholder modal สำหรับให้ Codex ย้าย form เดิมต่อเป็น phase

## สิ่งที่ยังไม่ได้ย้ายจาก HTML เดิม

- Logic CRUD จริงทั้งหมด
- Quick Add parser เต็มรูปแบบ
- Enhanced select / flatpickr integration
- Firebase Auth / Firestore sync
- Confirm modal จริง
- Validation และ error handling เต็มรูปแบบ
- Calendar view จริงของ installment/trip

ดูรายละเอียดต่อได้ที่ `docs/feature-map.md` และ prompt สำหรับ Codex ที่ `docs/codex-phase-prompts.md`
