# Legacy HTML Feature Map → React Modules

อ้างอิงจาก `income_expense_tracker.html` เดิม เพื่อใช้เป็น checklist ตอนค่อย ๆ ย้าย logic เข้า React

## 1. App shell / Navigation

Legacy:
- `welcomeScreen`
- `appScreen`
- `main-header`
- `bottomNav`
- views: `view-monthly`, `view-yearly`, `view-more`, `view-trips`, `view-installments`

React scaffold:
- `src/components/layout/AppShell.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/data/navigation.ts`

Phase target:
- เพิ่ม auth gate จริง
- เพิ่ม route/view state แบบ persistent
- map bottom nav เดิมกับ `ViewId`

## 2. Monthly dashboard / Ledger

Legacy:
- Monthly filters: range start/end, keyword, sort, category, type, amount range
- Daily dashboard
- Action needed
- Monthly summary cards
- Quick actions
- Budget / Goal insight
- Budget เดือนนี้
- Goal
- Recent/frequent entries
- Monthly ledger

React scaffold:
- `src/features/monthly/MonthlyPage.tsx`
- `src/lib/finance-calculations.ts`
- `src/hooks/useFinanceStore.ts`

Phase target:
- ย้าย filter state แยกเป็น `useMonthlyFilters`
- ย้าย `renderMonthly`, `renderDailyDashboard`, `renderActionNeeded`, `renderRecentEntries`
- ทำ entry card component และ entry detail toggle

## 3. Transaction entry modal

Legacy:
- `entryModal`
- Quick Add input
- type, date, category, amount, title, note, paid status
- repeat monthly

React scaffold:
- ตอนนี้มี `ModalPlaceholder`

Phase target:
- สร้าง `src/features/entries/EntryFormModal.tsx`
- สร้าง `src/features/entries/quickAddParser.ts`
- สร้าง `addEntry`, `updateEntry`, `deleteEntry`, `togglePaid`

## 4. Yearly overview

Legacy:
- `view-yearly`
- yearly year picker
- prev/next year
- yearly summary cards
- yearly 12-month grid

React scaffold:
- `src/features/yearly/YearlyPage.tsx`

Phase target:
- เพิ่ม selected year state
- ย้าย yearly filter panel
- ทำ month box clickable กลับไป monthly month

## 5. Installments

Legacy:
- `view-installments`
- filters by keyword, status, start/end month, sort
- summary cards
- list/calendar switch
- `loanModal`
- loan interest type: none, reducing, flat
- due day, principal, remaining override

React scaffold:
- `src/features/installments/InstallmentsPage.tsx`

Phase target:
- สร้าง `InstallmentFormModal`
- ย้าย calculation: remaining, progress, due soon, calendar
- รองรับ link installment กับ trip item

## 6. Trips

Legacy:
- `view-trips`
- filters by keyword/year/month/category/status
- list/calendar switch
- trip summary cards
- trip detail tabs: overview/plan/actual
- `tripModal`, `tripItemModal`, `tripBudgetModal`

React scaffold:
- `src/features/trips/TripsPage.tsx`

Phase target:
- สร้าง components: `TripList`, `TripDetail`, `TripOverviewTab`, `TripPlanTab`, `TripActualTab`
- สร้าง form modals 3 ตัว
- ย้าย budget-vs-actual logic ต่อหมวด

## 7. Budget / Goal

Legacy:
- `budgetModal`
- `goalModal`
- monthly budget list
- goal progress list
- soft insights

React scaffold:
- แสดงใน `MonthlyPage.tsx` ก่อน

Phase target:
- แยกเป็น `src/features/budgetGoals/*`
- สร้าง reusable progress card
- เพิ่ม validation และ duplicate prevention ต่อเดือน/หมวด

## 8. More / File / Auth / Sync

Legacy:
- `view-more`
- export JSON
- import JSON
- auth user badge
- logout
- save/cloud status
- Firebase / Firestore schema v2 constants

React scaffold:
- `src/features/more/MorePage.tsx`
- `src/utils/storage.ts`

Phase target:
- แยก `storage/localJsonService.ts`
- เพิ่ม `services/firebaseAuthService.ts`
- เพิ่ม `services/firestoreFinanceRepository.ts`
- เก็บ schema migration ไว้ใน `src/data/migrations`
