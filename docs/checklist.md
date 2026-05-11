# Finance Tracker Checklist

Checklist นี้อิงจากโครงสร้างโค้ดปัจจุบันของโปรเจกต์

## Build / Static Gates

- [ ] `npm run lint` ผ่าน
- [ ] `npm run build` ผ่าน
- [ ] `npm run preview` เปิด production bundle ได้เมื่อจำเป็น
- [ ] ไม่มี TypeScript errors
- [ ] ไม่มี unused imports/variables
- [ ] ไม่มี visible TODO/debug placeholder บน production UI
- [ ] ไม่เปลี่ยน Firestore paths โดยไม่ตั้งใจ
- [ ] ไม่เปลี่ยน schema โดยไม่ตั้งใจ
- [ ] ไม่ reintroduce local-only persistence
- [ ] bundle warning จาก Vite ถูกพิจารณาแล้วว่าไม่ใช่ build failure

## Files / Structure Sanity

- [ ] `src/main.tsx` ยัง wrap เป็น `AuthGate -> FinanceDataProvider -> App`
- [ ] `src/App.tsx` ยัง pass user id/email/logout เข้า AppShell/MorePage
- [ ] `src/state/FinanceDataProvider.tsx` ยัง load data จาก Cloud ด้วย `userId`
- [ ] `src/hooks/useFinanceStore.ts` ยัง expose actions ครบทุก module
- [ ] `src/features/sync/useAutoFinanceSync.ts` ยัง debounce autosave
- [ ] `src/services/firebase/firestoreFinanceRepository.ts` ยังใช้ paths เดิม
- [ ] `src/lib/dataMigration.ts` compile และ normalize schema v2 ได้
- [ ] `src/lib/importDiagnostics.ts` compile และใช้กับ import preview ได้
- [ ] `src/lib/storage.ts` ยังมี `createJsonDownload`
- [ ] `src/utils/formatters.ts` ยังใช้ browser local date/month สำหรับ input defaults
- [ ] `docs/` เหลือ markdown หลักคือ `context.md` และ `checklist.md`

## Firestore Path Guard

ต้องคง path เหล่านี้:

- [ ] `users/{uid}/meta/app`
- [ ] `users/{uid}/profile/main`
- [ ] `users/{uid}/settings/main`
- [ ] `users/{uid}/masters/main`
- [ ] `users/{uid}/transactions/{id}`
- [ ] `users/{uid}/recurringRules/{id}`
- [ ] `users/{uid}/installmentPlans/{id}`
- [ ] `users/{uid}/trips/{id}`
- [ ] `users/{uid}/budgets/{id}`
- [ ] `users/{uid}/goals/{id}`

Repository behavior:

- [ ] `checkCloudDataExists(userId)` ตรวจ singleton docs และ item collections
- [ ] `loadFinanceDataFromCloud(userId)` อ่าน path เดียวกับที่ save เขียน
- [ ] `saveFinanceDataToCloud(userId, data)` เขียน meta/profile/settings/masters แม้ collections ว่าง
- [ ] save ลบ stale item docs เฉพาะใน collection ของ user ปัจจุบัน
- [ ] save reject item ที่ไม่มี `id`

## Firebase / Deploy Checklist

- [ ] `vite.config.ts` ตั้ง `base: '/finance-tracker/'`
- [ ] GitHub Pages Source เป็น GitHub Actions
- [ ] workflow `.github/workflows/deploy.yml` deploy `dist`
- [ ] workflow Build step มี env:
  - [ ] `VITE_FIREBASE_API_KEY`
  - [ ] `VITE_FIREBASE_AUTH_DOMAIN`
  - [ ] `VITE_FIREBASE_PROJECT_ID`
  - [ ] `VITE_FIREBASE_STORAGE_BUCKET`
  - [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - [ ] `VITE_FIREBASE_APP_ID`
- [ ] Firebase Auth เปิด Email/Password provider
- [ ] Authorized domains มี `localhost`
- [ ] Authorized domains มี GitHub Pages domain
- [ ] `.env.local` และ `.env.*.local` ถูก ignore
- [ ] ไม่มี Firebase values จริงถูก commit
- [ ] Firestore rules block unauthenticated access
- [ ] Firestore rules block cross-user access ใต้ `users/{uid}/...`

## Auth QA

- [ ] Auth loading state แสดงถูกต้อง
- [ ] LoginScreen แสดงเมื่อไม่มี user
- [ ] register สำเร็จ
- [ ] login สำเร็จ
- [ ] login ผิดรหัสแสดง error ภาษาไทย
- [ ] reset password ส่ง email ได้
- [ ] logout กลับไป LoginScreen
- [ ] refresh แล้วยังรักษา auth state ถูกต้อง

## Cloud-First Data QA

- [ ] หลัง login provider แสดง loading Cloud ก่อนเข้า app
- [ ] Cloud มีข้อมูลแล้ว app load ข้อมูลนั้นทันที
- [ ] Cloud ไม่มีข้อมูลแล้ว app เริ่มด้วย empty normalized data
- [ ] Cloud load fail แสดง error screen + retry ไม่ fallback เป็น seed/demo
- [ ] user A logout/login user B แล้วไม่เห็น runtime data ของ user A
- [ ] ไม่มี local-only/localStorage persistence เป็น main source
- [ ] manual Load from Cloud replace runtime state
- [ ] manual Save to Cloud เขียนข้อมูลปัจจุบันขึ้น Cloud
- [ ] autosave ทำงานหลัง CRUD changes
- [ ] autosave ไม่ยิงทุก keystroke ทันที เพราะมี debounce

## Sync QA

- [ ] `SyncStatusBadge` แสดง idle/loading/saving/saved/error เป็นภาษาไทย
- [ ] add transaction แล้วสถานะเปลี่ยนเป็น pending/saving/saved ตาม flow
- [ ] edit/delete transaction แล้ว stale Firestore doc ถูกลบหลัง save
- [ ] manual Save to Cloud แสดง success/error ถูกต้อง
- [ ] manual Load from Cloud แสดง success/error/no cloud ถูกต้อง
- [ ] same account ในอีก browser/device load ข้อมูลเดียวกันจาก Cloud
- [ ] fingerprint guard ไม่ save ซ้ำเมื่อข้อมูลไม่เปลี่ยน

## JSON Export QA

- [ ] Export JSON ได้ schema v2
- [ ] Export ใช้ normalized/exportable data shape
- [ ] filename ปกติเป็น `finance-data-YYYY-MM-DD-HH-mm-ss.json`
- [ ] export ไม่ต้องใช้ localStorage
- [ ] exported file import กลับเข้าระบบได้

## JSON Import QA

- [ ] เลือก JSON แล้วแสดง preview/diagnostics ก่อน
- [ ] invalid JSON แสดง error ภาษาไทยและไม่เปลี่ยนข้อมูล
- [ ] preview แสดง counts: transactions, recurringRules, installmentPlans, trips/tripItems, budgets, goals
- [ ] preview แสดง category alias mappings/warnings ถ้ามี
- [ ] large-drop warning แสดงเมื่อไฟล์นำเข้ามีจำนวนข้อมูลน้อยกว่าปัจจุบันมาก
- [ ] cancel import ไม่เปลี่ยน runtime data
- [ ] cancel import ไม่ดาวน์โหลด backup
- [ ] confirm import ดาวน์โหลด `finance-backup-before-import-YYYY-MM-DD-HH-mm-ss.json` ก่อน
- [ ] backup JSON import กลับได้ผ่าน preview flow
- [ ] confirm import แล้ว apply imported data
- [ ] confirm import แล้ว save imported data ขึ้น Cloud
- [ ] failed save หลัง import แสดง sync error ให้ผู้ใช้รู้

## Legacy Import QA

- [ ] v1 `entries[]` ถูก normalize เป็น `transactions[]`
- [ ] missing arrays กลายเป็น `[]`
- [ ] missing profile/settings/masters เติม safe defaults
- [ ] `isPaid: false` เป็น `status: "pending"`
- [ ] `isPaid: true` เป็น `status: "cleared"` ถ้าไม่มี status เดิม
- [ ] category `อื่นๆ` ไม่กลายเป็น `Other` หรือ `อื่น ๆ`
- [ ] category `ของกิน` ถูกเก็บเป็น canonical `ของกิน`
- [ ] category `บ้าน/เช่า` ไม่ถูกย่อเป็น `บ้าน`
- [ ] installment missing category fallback เป็น `ผ่อนสินค้า`
- [ ] trip item missing category fallback เป็น `ท่องเที่ยว`
- [ ] legacy trip transactions ที่มี `sourceModule: "trip"` hydrate เข้า `trip.items[]`
- [ ] import/export ซ้ำไม่ duplicate trip items จาก `sourceRefId`

## Monthly QA

- [ ] MonthlyPage แสดง summary cards รายรับ/รายจ่าย/คงเหลือ/ยังไม่จ่าย
- [ ] MonthlyFilters ใช้ start/end month, keyword, sort, category, type, status, min/max amount
- [ ] filter type `all/income/expense/installment/trip` ทำงาน
- [ ] filter status `all/paid/unpaid` ทำงาน
- [ ] smart keyword ทำงาน: ยังไม่จ่าย, ค้างจ่าย, จ่ายแล้ว, รายรับ, รายจ่าย, เดือนนี้, เดือนก่อน
- [ ] add income transaction
- [ ] add expense transaction
- [ ] edit manual transaction
- [ ] delete manual transaction ผ่าน ConfirmModal
- [ ] toggle paid/unpaid manual expense
- [ ] duplicate transaction
- [ ] use as template เปิด modal ด้วยค่าเดิม
- [ ] repeat monthly 1-60 months
- [ ] repeat วันที่ 31 clamp วันในเดือนสั้นถูกต้อง
- [ ] QuickAddBar parse ตัวอย่างหลักได้
- [ ] ActionNeededPanel แสดง unpaid/manual/installment/trip/budget/goal/sync issues
- [ ] RecentTransactionPanel ใช้ manual transactions เท่านั้น
- [ ] FrequentTransactionShortcuts ไม่ใช้ readonly derived rows เป็น template
- [ ] readonly installment rows แก้/ลบจาก Monthly ไม่ได้
- [ ] readonly trip rows แก้/ลบจาก Monthly ไม่ได้

## Budget / Goal QA

- [ ] BudgetGoalSection แสดงใน MonthlyPage
- [ ] add monthly budget
- [ ] edit monthly budget
- [ ] delete monthly budget ผ่าน ConfirmModal
- [ ] duplicate guard block same month+category
- [ ] budget usage คำนวณจาก transactions เดือน/หมวดเดียวกัน
- [ ] budget usage รวม derived rows ถ้าแสดงเป็น expense ใน ledger
- [ ] status safe/near-limit/over-budget ถูกต้อง
- [ ] soft insight แสดงภาษาไทย ไม่มี internal tone labels หลุด
- [ ] add goal
- [ ] edit goal
- [ ] delete goal ผ่าน ConfirmModal
- [ ] update current amount
- [ ] currentAmount >= targetAmount แสดง completed

## Installments QA

- [ ] InstallmentsPage เปิดได้จาก bottom nav
- [ ] summary cards แสดงจำนวน/ยอดผ่อน/คงเหลือ/รายเดือน
- [ ] filters keyword/status/start month/end month/sort order ทำงาน
- [ ] list/calendar view switch ทำงาน
- [ ] add installment plan
- [ ] edit installment plan
- [ ] delete installment plan ผ่าน ConfirmModal
- [ ] fields รองรับ principal, remainingOverride, dueDay, interestType, interestRate, interestNote/note
- [ ] calculate progress/paid/remaining/months remaining ถูกต้อง
- [ ] toggle paid month จาก calendar/list
- [ ] paid month update แล้ว Monthly derived row status เปลี่ยน
- [ ] dueDay 31 ใน `2026-02` ได้ `2026-02-28`
- [ ] dueDay 31 ใน `2028-02` ได้ `2028-02-29`
- [ ] invalid dueDay fallback เป็นวันที่ 1

## Trips QA

- [ ] TripsPage เปิดได้จาก bottom nav
- [ ] TripFilters keyword/year/month/category/status ทำงาน
- [ ] list/calendar view switch ทำงาน
- [ ] TripCalendar group ตาม startDate month
- [ ] list/calendar ใช้ filtered trips ชุดเดียวกัน
- [ ] add trip
- [ ] edit trip
- [ ] delete trip ผ่าน ConfirmModal
- [ ] selecting trip จาก list/calendar เปิด TripDetail ถูก trip
- [ ] mobile มีทางกลับไป list/calendar
- [ ] overview tab แสดง totals
- [ ] actual tab แสดง trip items
- [ ] plan tab แสดง planned vs actual by category
- [ ] add trip item
- [ ] edit trip item
- [ ] delete trip item ผ่าน ConfirmModal
- [ ] trip item optional installmentId select ทำงานเมื่อมี plans
- [ ] toggle paid/unpaid trip item
- [ ] add trip budget line
- [ ] edit trip budget line
- [ ] delete trip budget line
- [ ] trip budget line เก็บเป็น budget scope `trip`
- [ ] delete trip ลบ budget records ที่ผูก `tripId`
- [ ] Monthly derived trip rows เป็น readonly

## Yearly QA

- [ ] YearlyPage เปิดได้จาก bottom nav
- [ ] summary รายปีคำนวณจาก data ปัจจุบัน
- [ ] month grid/overview ไม่ overflow
- [ ] navigation กลับ Monthly ยังทำงานตาม selected month behavior ที่มีอยู่

## MorePage QA

- [ ] แสดง current user email
- [ ] แสดง sync status badge
- [ ] manual Save to Cloud button ทำงาน
- [ ] manual Load from Cloud button ทำงาน
- [ ] Logout button ทำงาน
- [ ] Export JSON button ทำงาน
- [ ] Import JSON file input เปิด preview
- [ ] technical info panel แสดง UID, project id, sync state, last synced, counts
- [ ] copy สื่อว่า Firestore เป็นข้อมูลหลัก และ JSON ใช้ backup/migration

## Responsive / UI QA

- [ ] Desktop `1920x1080` readable
- [ ] Desktop `1366x768` usable
- [ ] Tablet `768x1024` usable
- [ ] Mobile `402x874` ไม่มี horizontal scroll
- [ ] Mobile `390-430px` ไม่มี horizontal scroll
- [ ] Header ไม่ overflow เมื่อ email ยาว
- [ ] BottomNav safe-area และไม่บัง content
- [ ] BottomNav ไม่บัง modal footer
- [ ] modal panel ไม่เกิน viewport height
- [ ] modal body scroll ได้
- [ ] modal footer sticky/reachable
- [ ] ConfirmModal ใช้ได้บน mobile
- [ ] Combobox dropdown ไม่ถูก modal footer/header บัง
- [ ] Combobox keyboard Escape/Enter/Arrow ยังทำงาน
- [ ] DateInput clickable ใน modal
- [ ] MonthInput clickable ใน modal
- [ ] FilterBar stack บน mobile และ action buttons wrap
- [ ] long Thai/category/note/money/email ไม่ทำ layout แตก

## Thai Copy QA

- [ ] Login/Register/Reset/Logout เป็นภาษาไทย
- [ ] Sync status เป็นภาษาไทย
- [ ] Monthly labels เป็นภาษาไทย
- [ ] Budget/Goal labels เป็นภาษาไทย
- [ ] Installment labels เป็นภาษาไทย
- [ ] Trip labels เป็นภาษาไทย
- [ ] Import/export labels เป็นภาษาไทย
- [ ] ไม่มี visible English เช่น Search, Save changes, Close, Cancel, Category, Amount โดยไม่จำเป็น
- [ ] ไม่มี visible TODO/debug placeholder
- [ ] ไม่มี copy ที่สื่อว่า local/local-only เป็น source of truth

## Final Go-Live Smoke Test

- [ ] Deploy ล่าสุดขึ้น GitHub Pages
- [ ] เปิด deployed URL ได้
- [ ] Register/login สำเร็จ
- [ ] Add transaction แล้วรอ Cloud saved
- [ ] Refresh แล้วยังเห็น transaction
- [ ] Incognito/device อื่น login account เดียวกันแล้วเห็น transaction
- [ ] Add budget/device B แล้ว device A refresh เห็น budget
- [ ] Delete transaction/device A แล้ว device B reload แล้ว transaction หาย
- [ ] Export JSON
- [ ] Import JSON แล้วเห็น preview
- [ ] Confirm import แล้ว backup download ก่อน overwrite
- [ ] Logout/login อีกครั้งข้อมูลยังถูกต้อง
