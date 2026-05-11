# Finance Tracker Context

เอกสารนี้คือ snapshot ปัจจุบันของโครงสร้างโค้ดและ behavior หลักของโปรเจกต์ Finance Tracker

## สถานะปัจจุบัน

Finance Tracker เป็นแอป Vite + React + TypeScript + Tailwind CSS ที่ migrate จาก `income_expense_tracker.html` มาเป็น React modules แล้ว

สถานะล่าสุด:

- ใช้ Firebase Auth สำหรับ login/register/reset/logout
- ใช้ Cloud Firestore เป็น source of truth หลัง login
- ไม่มี local-only persistence ใน main app flow
- JSON export/import ยังมีไว้สำหรับ backup, migration, และ recovery
- Import JSON ต้องผ่าน preview/diagnostics และ confirm ก่อน overwrite Cloud
- ก่อน confirm import ระบบ download backup ของข้อมูลปัจจุบันเป็น JSON อัตโนมัติ
- Deploy ผ่าน GitHub Pages โดย `vite.config.ts` ตั้ง `base: '/finance-tracker/'`

## คำสั่งหลัก

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

Dependencies หลัก:

- React 19
- Vite 8
- TypeScript 6
- Tailwind CSS 3
- Firebase 12

## App Boot Flow

ไฟล์เริ่มต้นคือ `src/main.tsx`

โครงสร้าง runtime:

```tsx
<AuthGate>
  {({ user, logout }) => (
    <FinanceDataProvider userId={user.uid}>
      <App
        currentUserId={user.uid}
        currentUserEmail={user.email ?? user.uid}
        onLogout={logout}
      />
    </FinanceDataProvider>
  )}
</AuthGate>
```

ความหมาย:

- ถ้ายังไม่ login, `AuthGate` แสดง `LoginScreen`
- หลัง login, `FinanceDataProvider` โหลดข้อมูลจาก Firestore ตาม `user.uid`
- `App` ใช้ `useFinanceStore()` และ `useAutoFinanceSync()` เพื่อ render view และ autosave
- Navigation เป็น view state ใน `useFinanceStore`: `monthly`, `yearly`, `installments`, `trips`, `more`

## Source Of Truth

หลัง login ข้อมูลหลักอยู่บน Firestore เท่านั้น

Provider behavior:

- `FinanceDataProvider` รับ `userId`
- ตอน mount/userId change จะ `loadFinanceDataFromCloud(userId)`
- ถ้ามี Cloud data: normalize แล้ว set เป็น runtime state
- ถ้าไม่มี Cloud data: ใช้ `createEmptyFinanceData()`
- ถ้า Cloud load fail: แสดง error screen + retry button
- ไม่โหลด localStorage เป็น primary data
- ไม่ใช้ seed/demo data เป็น data จริงหลัง login

Autosave:

- `useAutoFinanceSync` debounce save ประมาณ 1.8 วินาที
- save ด้วย `saveFinanceDataToCloud(userId, normalizedData)`
- ใช้ fingerprint เพื่อลด duplicate writes
- sync state ปัจจุบันคือ `idle`, `loading`, `saving`, `saved`, `error`

## Firestore Repository

ไฟล์หลัก:

- `src/services/firebase/firebaseApp.ts`
- `src/services/firebase/authService.ts`
- `src/services/firebase/firestoreFinanceRepository.ts`

Repository functions:

- `loadFinanceDataFromCloud(userId): Promise<FinanceData | null>`
- `saveFinanceDataToCloud(userId, data): Promise<void>`
- `checkCloudDataExists(userId): Promise<boolean>`

Firestore paths ที่ต้องคงเดิม:

- `users/{uid}/meta/app`
- `users/{uid}/profile/main`
- `users/{uid}/settings/main`
- `users/{uid}/masters/main`
- `users/{uid}/transactions/{id}`
- `users/{uid}/recurringRules/{id}`
- `users/{uid}/installmentPlans/{id}`
- `users/{uid}/trips/{id}`
- `users/{uid}/budgets/{id}`
- `users/{uid}/goals/{id}`

Implementation notes:

- singleton collections: `meta`, `profile`, `settings`, `masters`
- item collections: `transactions`, `recurringRules`, `installmentPlans`, `trips`, `budgets`, `goals`
- save ใช้ batched writes และลบ stale docs ที่ไม่มีใน normalized current data
- save เขียน user root doc ด้วย schemaVersion/updatedAt เพื่อช่วย detect cloud existence
- load อ่าน path เดียวกับที่ save เขียน

## Data Model

ไฟล์หลัก:

- `src/types/finance.ts`
- `src/lib/dataMigration.ts`

Schema:

- `FINANCE_SCHEMA_VERSION = 2`
- base currency: `THB`
- locale: `th-TH`
- timezone: `Asia/Bangkok`

Canonical arrays:

- `transactions`
- `recurringRules`
- `installmentPlans`
- `trips`
- `budgets`
- `goals`

Compatibility aliases:

- `entries` mirrors `transactions`
- `installments` mirrors `installmentPlans`

Aliases มีไว้เพื่อ compatibility เท่านั้น ไม่ควรใช้เป็น write source of truth ใหม่

Date helpers:

- `currentDateInputValue()` ใช้ browser local date และคืน `YYYY-MM-DD`
- `currentMonthInputValue()` ใช้ browser local month และคืน `YYYY-MM`
- `currentIsoTimestamp()` ยังใช้ ISO timestamp สำหรับ createdAt/updatedAt/lastSyncedAt

## Data Migration / Import Diagnostics

ไฟล์หลัก:

- `src/lib/dataMigration.ts`
- `src/lib/importDiagnostics.ts`
- `src/data/categories.ts`

Migration responsibilities:

- `createEmptyFinanceData()`
- `normalizeFinanceData(input)`
- `getDataSchemaVersion(input)`
- `withUpdatedMeta(data)`
- `createExportableFinanceData(data)`

ต้องรองรับ:

- partial/old JSON
- missing arrays เป็น `[]`
- missing profile/settings/masters เป็น safe defaults
- old `entries[]` เป็น `transactions[]`
- legacy `isPaid` เป็น `status: "cleared" | "pending"`
- legacy category aliases เป็น canonical Thai category
- old trip transactions ที่มี `sourceModule: "trip"` hydrate กลับเป็น `trip.items[]`

Canonical Thai category examples:

- `อื่นๆ`
- `ของกิน`
- `บ้าน/เช่า`
- `กาแฟ/ขนม`
- `ค่าน้ำมัน`
- `ไฟฟ้า`
- `ผ่อนสินค้า`
- `ท่องเที่ยว`

## JSON Export / Import

ไฟล์หลัก:

- `src/lib/storage.ts`
- `src/utils/storage.ts`
- `src/features/more/MorePage.tsx`
- `src/App.tsx`
- `src/state/FinanceDataProvider.tsx`

Export:

- `createJsonDownload(data, filenamePrefix = 'finance-data')`
- ใช้ `createExportableFinanceData(data)`
- filename ปกติ: `finance-data-YYYY-MM-DD-HH-mm-ss.json`
- ไม่มี localStorage persistence helper ใน public exports แล้ว

Import:

1. MorePage รับไฟล์ JSON
2. `previewImportDataFromJson(file)` parse + normalize + analyze diagnostics
3. UI แสดง preview/diagnostics และ large-drop warning ถ้ามี
4. ผู้ใช้ confirm
5. `App.handleConfirmImportJson` download backup ปัจจุบันด้วย prefix `finance-backup-before-import`
6. `applyImportedJson(preview)` replace runtime state
7. `sync.saveNow(importedData, th.sync.cloudImport)` save imported data ขึ้น Cloud

ยังไม่มี:

- Firestore backup collection
- restore UI
- version history UI
- offline-first cache

## UI / Layout Structure

Layout:

- `src/components/layout/AppShell.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/BottomNav.tsx`

UI primitives:

- `Badge`
- `Button`
- `Card`
- `ConfirmModal`
- `EmptyState`
- `SummaryCard`
- form controls: `FormField`, `TextInput`, `TextareaField`, `SelectField`, `ComboboxField`, `DateInput`, `MonthInput`, `FilterBar`

Global styles:

- `src/index.css`
- Tailwind CSS เป็น styling หลัก
- มี finance utility classes สำหรับ controls, modal, filter grid, combobox, date/month inputs

UX targets:

- desktop `1920x1080`
- mobile `390-430px` และ `402x874`
- no horizontal scroll
- BottomNav ต้องไม่บัง content/modal footer
- modal body scroll ได้ footer กดได้
- Combobox ใช้ใน modal ได้
- DateInput/MonthInput ยังเป็น native input แต่ style ให้ consistent

## Feature Modules

### Auth

Files:

- `src/features/auth/AuthGate.tsx`
- `src/features/auth/LoginScreen.tsx`
- `src/services/firebase/authService.ts`

Features:

- login email/password
- register
- reset password
- logout
- loading/error state
- Thai UI copy

### Sync

Files:

- `src/features/sync/useAutoFinanceSync.ts`
- `src/features/sync/SyncStatusBadge.tsx`
- `src/features/sync/syncData.ts`
- `src/features/sync/syncTypes.ts`

Features:

- autosave debounce
- manual save
- manual load
- fingerprint duplicate-save guard
- sync states: `idle`, `loading`, `saving`, `saved`, `error`

### Monthly

Files:

- `src/features/monthly/MonthlyPage.tsx`
- components: `MonthlyFilters`, `MonthlySummaryCards`, `TransactionFormModal`, `TransactionList`, `QuickAddBar`, `ActionNeededPanel`, `RecentTransactionPanel`, `FrequentTransactionShortcuts`
- utils: `monthlyLedger.ts`, `monthlySmartFilter.ts`, `quickAddParser.ts`

Features:

- manual transaction CRUD
- paid/unpaid toggle
- duplicate transaction
- create from template
- repeat monthly 1-60 months
- Quick Add
- filters: start/end month, keyword, sort, category, type, status, min/max amount
- smart keywords เช่น ยังไม่จ่าย, ค้างจ่าย, จ่ายแล้ว, รายรับ, รายจ่าย, เดือนนี้, เดือนก่อน
- grouped transaction list
- derived readonly installment rows
- derived readonly trip rows
- Action Needed, Recent, Frequent
- Budget/Goal section embedded in Monthly

### Budget / Goal

Files:

- `src/features/budgetGoals/BudgetGoalSection.tsx`
- `BudgetFormModal.tsx`
- `GoalFormModal.tsx`
- `BudgetCard.tsx`
- `GoalCard.tsx`
- `budgetGoalCalculations.ts`

Features:

- monthly budget CRUD
- duplicate guard by month+category
- budget usage from monthly ledger expense rows
- safe/near-limit/over-budget
- goal CRUD
- goal current amount/progress/completed state
- soft insights

### Installments

Files:

- `src/features/installments/InstallmentsPage.tsx`
- components: `InstallmentFilters`, `InstallmentPlanModal`, `InstallmentPlanList`, `InstallmentCalendar`, `InstallmentSummaryCards`
- utils: `installmentPlans.ts`

Features:

- installment plan CRUD
- fields: category, monthlyAmount, monthsTotal, monthsPaid, startMonth, principal, remainingOverride, dueDay, interestType, interestRate, interestNote/note
- list/calendar view
- filters keyword/status/start month/end month/sort order
- paid month toggle
- progress/remaining/months remaining
- derived readonly Monthly transactions
- dueDay safe date clamp for short months/leap year

### Trips

Files:

- `src/features/trips/TripsPage.tsx`
- components: `TripFilters`, `TripList`, `TripCalendar`, `TripDetail`, `TripModal`, `TripItemModal`, `TripBudgetFormModal`, `TripSummaryCards`
- utils: `tripUtils.ts`

Features:

- trip CRUD
- trip item CRUD
- trip budget line CRUD by category
- filters keyword/year/month/category/status
- list/calendar view
- detail tabs overview/actual/plan
- planned vs actual by category
- trip item optional installmentId
- derived readonly Monthly transactions
- mobile return-to-list behavior

### Yearly

File:

- `src/features/yearly/YearlyPage.tsx`

Current role:

- yearly overview based on app data
- keep navigation compatibility with main shell

### More

File:

- `src/features/more/MorePage.tsx`

Features:

- Firebase account/sync status
- manual Save to Cloud
- manual Load from Cloud
- Export JSON
- Import JSON preview/confirm
- automatic backup download before Cloud overwrite
- import diagnostics and large-drop warnings
- technical info panel for QA

## Deployment Configuration

Files:

- `vite.config.ts`
- `.github/workflows/deploy.yml`
- `.env.example`
- `.gitignore`

Current deploy workflow:

- trigger: push to `main` or manual dispatch
- install: `npm ci`
- build: `npm run build`
- env values read from GitHub Actions variables:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
- deploy `dist` to GitHub Pages

Firebase setup required:

- Email/Password provider enabled
- Authorized domains include `localhost` and GitHub Pages domain
- Firestore rules restrict access to `users/{uid}/...`

## Guardrails For Future Work

- Do not change Firestore paths casually
- Do not reintroduce local-only/localStorage persistence as main flow
- Do not add Firestore backup/version collections without a clear migration phase
- Keep import preview + confirm + backup-before-overwrite
- Keep JSON export schema clean and normalized
- Keep UI text Thai-first
- Run `npm run lint` and `npm run build` after code changes
