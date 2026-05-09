# Codex Phase Prompts

ใช้ prompt ต่อไปนี้ให้ Codex ทำต่อทีละ phase โดยให้เปิด repo ที่แตกจาก zip นี้แล้วค่อยแก้ไฟล์จริง

---

## Phase 1 — จัด data model + migration จาก HTML เดิม

```text
อ่านไฟล์ docs/feature-map.md และโครง src/types/finance.ts, src/data/seedData.ts, src/hooks/useFinanceStore.ts

เป้าหมาย:
1. ตรวจ data model ให้รองรับข้อมูลจาก income_expense_tracker.html เดิมทั้งหมด
2. เพิ่ม src/data/migrations/financeDataMigration.ts สำหรับ normalize/ensure schema version 2
3. เพิ่ม type guard สำหรับ import JSON
4. ห้ามเปลี่ยน UI เยอะ ให้เน้น data model และ import/export ให้ปลอดภัยก่อน
5. ทำให้ npm run build ผ่าน

ข้อกำหนด:
- ใช้ TypeScript strict-friendly
- ห้ามใช้ any ถ้าไม่จำเป็น
- เพิ่ม comment สั้น ๆ เฉพาะจุดที่ logic สำคัญ
- ถ้ามี field จาก HTML เดิมที่ยังไม่แน่ใจ ให้ใส่ TODO ใน migration ไม่ใช่ลบทิ้ง
```

---

## Phase 2 — ย้าย Entry CRUD + Quick Add

```text
จาก scaffold นี้ ให้สร้างระบบรายรับ/รายจ่ายจริง

ไฟล์หลัก:
- src/features/monthly/MonthlyPage.tsx
- src/hooks/useFinanceStore.ts
- src/types/finance.ts

ให้เพิ่มไฟล์ใหม่:
- src/features/entries/EntryFormModal.tsx
- src/features/entries/EntryCard.tsx
- src/features/entries/quickAddParser.ts
- src/features/entries/entryValidation.ts

เป้าหมาย:
1. แทน ModalPlaceholder ของ entry ด้วย EntryFormModal จริง
2. รองรับ add/edit/delete/toggle paid
3. รองรับ repeat monthly ตาม field เดิม: repeatEnabled, repeatCount
4. ทำ Quick Add parser เบื้องต้น เช่น:
   - "+ โบนัส 5000"
   - "ค่าไฟ 1200 ยังไม่จ่าย"
   - "grab ไป office 180"
5. เชื่อมกับ localStorage ผ่าน useFinanceStore เดิม
6. ทำให้ npm run build ผ่าน

ห้ามทำ:
- ห้ามเพิ่ม Firebase ใน phase นี้
- ห้ามย้าย installment/trip logic ใน phase นี้
```

---

## Phase 3 — Monthly filters + Action Needed + Recent/Frequent

```text
ต่อจาก Phase 2 ให้ย้าย monthly filter และ insight

เป้าหมาย:
1. สร้าง useMonthlyFilters เพื่อรองรับ rangeStartMonth, rangeEndMonth, keyword, sort, category, type, min/max amount
2. เพิ่ม active filter label/chips
3. ย้าย Action Needed: unpaid/pending, due soon จาก installment, budget over/near limit
4. ย้าย Recent/Frequent entries แบบ component
5. ทำ ledger card ให้มี detail toggle เหมือน HTML เดิม
6. ทำให้ npm run build ผ่าน

เน้น:
- แยก pure calculation ไว้ใน src/lib
- UI ใช้ Tailwind เท่านั้น
```

---

## Phase 4 — Budget + Goal CRUD

```text
เพิ่ม Budget และ Goal CRUD จริง

ให้เพิ่ม:
- src/features/budgetGoals/BudgetFormModal.tsx
- src/features/budgetGoals/GoalFormModal.tsx
- src/features/budgetGoals/BudgetCard.tsx
- src/features/budgetGoals/GoalCard.tsx
- src/features/budgetGoals/budgetGoalCalculations.ts

เป้าหมาย:
1. add/edit/delete monthly budget
2. add/edit/delete goal
3. progress bar + status: safe/near-limit/over-budget, active/paused/completed
4. duplicate budget guard ต่อเดือน + หมวดหมู่
5. monthly soft insight
6. ทำให้ npm run build ผ่าน
```

---

## Phase 5 — Installment module

```text
ย้ายระบบผ่อนจาก HTML เดิมมาเป็น React

ให้เพิ่ม:
- src/features/installments/InstallmentFormModal.tsx
- src/features/installments/InstallmentCard.tsx
- src/features/installments/InstallmentCalendar.tsx
- src/features/installments/installmentCalculations.ts

เป้าหมาย:
1. add/edit/delete installment
2. รองรับ field: monthlyAmount, monthsTotal, monthsPaid, startMonth, principal, remainingOverride, dueDay, interestType, interestRate, note
3. คำนวณ remaining/progress/due soon
4. list/calendar view switch
5. สร้าง readonly monthly expense view หรือ linked entry placeholder ตาม logic เดิม
6. ทำให้ npm run build ผ่าน
```

---

## Phase 6 — Trips module

```text
ย้าย Trips module จาก HTML เดิมมาเป็น React

ให้เพิ่ม:
- src/features/trips/TripFormModal.tsx
- src/features/trips/TripItemFormModal.tsx
- src/features/trips/TripBudgetFormModal.tsx
- src/features/trips/TripList.tsx
- src/features/trips/TripDetail.tsx
- src/features/trips/TripCalendar.tsx
- src/features/trips/tripCalculations.ts

เป้าหมาย:
1. add/edit/delete trip
2. add/edit/delete trip item
3. add/edit/delete trip budget by category
4. Trip detail tabs: overview / plan / actual
5. list/calendar view switch
6. link trip item กับ installmentId
7. budget vs actual warning: near-limit / over-budget
8. ทำให้ npm run build ผ่าน
```

---

## Phase 7 — Auth + Firebase/Firestore Sync

```text
เพิ่ม Auth + Firestore sync โดยอิงจาก schema constants ใน HTML เดิม

ให้เพิ่ม:
- src/services/firebase/firebaseApp.ts
- src/services/firebase/authService.ts
- src/services/firebase/firestoreFinanceRepository.ts
- src/features/auth/LoginScreen.tsx
- src/features/sync/SyncStatusBadge.tsx

เป้าหมาย:
1. ทำ login/logout/reset password
2. แยก collection ตามแนวคิดเดิม: meta, profile, settings, masters, transactions, recurringRules, installmentPlans, trips, budgets, goals
3. debounce cloud save
4. cloud load/merge strategy แบบปลอดภัย
5. UI save status: idle/saving/saved/error
6. ทำให้ npm run build ผ่าน

สำคัญ:
- ห้าม hardcode Firebase config; อ่านจาก Vite env เช่น VITE_FIREBASE_API_KEY
- เพิ่ม .env.example เท่านั้น ไม่ใส่ secret จริง
```

---

## Phase 8 — UI polish + parity check

```text
ตรวจเทียบกับ docs/feature-map.md และ HTML เดิม

เป้าหมาย:
1. เช็ค feature parity ราย module
2. ปรับ responsive mobile bottom nav, sticky header, modal sheet
3. เพิ่ม reusable Select/DatePicker wrapper ถ้าจำเป็น
4. เพิ่ม ConfirmModal จริงแทน browser confirm
5. ลบ dead code และ TODO ที่จบแล้ว
6. ทำให้ npm run lint และ npm run build ผ่าน
```
