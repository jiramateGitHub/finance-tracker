# Phase 8.6 Legacy Import Compatibility Checklist

เป้าหมายของ Phase 8.6 คือทำให้ JSON เก่าจาก `income_expense_tracker.html` นำเข้า React app ได้ปลอดภัย โดยไม่ทำให้หมวดหมู่เพี้ยน ไม่สร้างหมวดซ้ำ และยังคงสถานะจ่าย/ยังไม่จ่ายเดิมให้มากที่สุด

## ขอบเขตที่ต้องไม่เปลี่ยน

- ไม่เปลี่ยน Firestore paths เดิม
- ไม่เปลี่ยน layout หลักของ UI
- ไม่เพิ่ม business feature ใหม่
- เน้น import compatibility, category canonical id และ diagnostics เท่านั้น

## Manual test cases

### 1. Import old v1 JSON with `entries[]` and `isPaid: false`

Expected:

- รายการจาก `entries[]` ต้องถูกนำเข้าเป็น `transactions[]`
- `isPaid: false` ต้องกลายเป็น `status: "pending"`
- `isPaid: true` ต้องกลายเป็น `status: "cleared"` เมื่อไม่มี `status` เดิม

### 2. Import old category `อื่นๆ`

Expected:

- ต้องคงเป็น `อื่นๆ`
- ห้ามกลายเป็น `Other`
- ห้ามกลายเป็น `อื่น ๆ`

### 3. Import old category `ของกิน`

Expected:

- canonical id ต้องเป็น `ของกิน`
- `category` และ `categoryId` ต้องตรงกันเป็น `ของกิน`
- ถ้า UI ใช้ label สามารถแสดงเป็น `อาหาร` ได้ แต่ค่าที่บันทึกต้องเป็น `ของกิน`

### 4. Import old category `บ้าน/เช่า`

Expected:

- ต้องคงเป็น `บ้าน/เช่า`
- ห้ามกลายเป็น `บ้าน`

### 5. Import installment with missing category

Expected:

- category fallback ต้องเป็น `ผ่อนสินค้า`
- `category` และ `categoryId` ต้องเป็น `ผ่อนสินค้า`

### 6. Import trip item with missing category

Expected:

- category fallback ต้องเป็น `ท่องเที่ยว`
- Trip item และ derived trip transaction ต้องใช้ `ท่องเที่ยว`

### 7. Import old JSON without `masters.categories`

Expected:

- `masters.categories` ต้องมีรายการเต็มจาก legacy `CATEGORY_OPTIONS`
- Dropdown ต้องมีหมวดเก่าครบ เช่น `บ้าน/เช่า`, `ของกิน`, `กาแฟ/ขนม`, `ค่าน้ำมัน`, `ไฟฟ้า`, `ผ่อนสินค้า`, `ท่องเที่ยว`, `อื่นๆ`
- ห้ามมี default English categories เช่น `Food`, `Housing`, `Trips`, `Other`

### 8. Quick Add after import

Expected:

- `ข้าว 80` → expense, category `ของกิน`
- `ค่าไฟ 1200 ยังไม่จ่าย` → expense, category `ไฟฟ้า`, status `pending`
- `โบนัส 5000` → income, category `โบนัส`, status `cleared`
- `grab ไป office 180` → expense, category `เดินทาง`

### 9. Budget category matching

Expected:

- Budget `ของกิน` ต้องรวม transaction เก่าที่ category/categoryId เป็น `ของกิน`
- Budget `อื่นๆ` ต้องรวม transaction เก่าที่ category/categoryId เป็น `อื่นๆ`
- ห้ามเกิดกรณี budget `อาหาร` แต่ transaction เป็น `ของกิน` แล้วคำนวณไม่เจอกัน

### 10. Export JSON after import and reload

Expected:

- Export JSON แล้ว import กลับเข้ามาใหม่ได้
- Categories ยังเป็น canonical legacy ids
- ห้ามเกิดหมวดซ้ำจาก alias เช่น `Other`, `อื่น ๆ`, `Food`, `อาหาร`, `บ้าน`, `ยอดผ่อน`

## Import diagnostics ที่ควรเห็น

หลังเลือกไฟล์ JSON ที่หน้า More ควรเห็นการ์ดสรุปเป็นภาษาไทย เช่น

- ชื่อไฟล์ที่ import
- schema version หรือ legacy / ไม่ระบุ
- จำนวน entries/transactions, recurring rules, installment plans, trips, trip items, budgets, goals
- alias ที่ถูกแปลง เช่น `Other → อื่นๆ`, `Food → ของกิน`, `บ้าน → บ้าน/เช่า`
- warnings เช่น legacy `isPaid` converted, category fallback used, invalid date fallback used, zero amount kept

## Build checks

รันคำสั่งต่อไปนี้ก่อน merge

```bash
npm run lint
npm run build
```

Expected:

- lint ผ่าน
- build ผ่าน
- ไม่มี English default categories หลัง import หรือบัญชีว่าง

## Phase 8.6.1 เพิ่มเติม: V2 เก่าที่เก็บ Trip items เป็น transactions

ไฟล์ export จาก `income_expense_tracker.html` บางชุดเป็น `schemaVersion: 2` แล้ว แต่ใน `trips[]` มีเฉพาะข้อมูลหัวทริป และรายการจ่ายจริงของทริปถูกเก็บใน `transactions[]` โดยใช้ `sourceModule: "trip"`, `tripId` และ `sourceRefId`

Expected:

- Import ต้องไม่ error
- `transactions[]` ต้องยังคงอยู่ เพื่อให้หน้า Monthly / Budget รายเดือนยังเห็นรายการเดิม
- ระบบต้องเติม `trip.items[]` จาก trip transactions ให้หน้า Trips แสดง actual items / plan vs actual ได้
- ต้องใช้ `sourceRefId` เป็น `trip.items[].id` เพื่อไม่ duplicate เมื่อ export/import ซ้ำ
- `status: "pending"` ของ trip transaction ต้องกลายเป็น `trip.items[].isPaid = false`
- Import diagnostics ต้องนับจำนวนรายการทริปหลัง hydrate แล้ว เช่น `19 / 409`
- Import diagnostics ต้องแสดง warning ว่าแปลง transaction ของทริปกลับเป็นรายการทริปแล้วกี่รายการ
