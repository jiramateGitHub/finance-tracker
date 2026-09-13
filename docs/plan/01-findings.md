# Findings และบั๊กที่ควรแก้

อ้างอิง source ณ 2026-09-13 เลขบรรทัดเป็นจุดเริ่มตรวจและอาจเปลี่ยนหลัง refactor

Priority: **P1** = ข้อมูลหาย/คืนชีพ/ยอดผิดใน workflow สำคัญ, **P2** = ผลลัพธ์หรือสถานะผิดเฉพาะกรณี, **P3** = maintainability/performance/documentation ไม่มีข้อค้นพบที่จัดเป็น P0 จากหลักฐานปัจจุบัน

## F01 · P1 · Autosave สามารถลบข้อมูลที่เพิ่มจากอีก client

**สถานะ:** ยืนยันกลไกจากโค้ด; ต้องจำลองสอง client ด้วย Firestore Emulator

หลักฐาน: `src/services/firebase/firestoreFinanceRepository.ts:154` (`saveFinanceDataToCloud`), โดยเฉพาะการสร้าง `nextIds` แล้ว `batch.delete` เอกสารที่ไม่อยู่ใน local snapshot ที่บรรทัด 174–188

ตัวอย่าง: A และ B โหลดข้อมูลชุดเดียวกัน → B เพิ่ม transaction X แล้วบันทึก → A แก้รายการเก่าและ autosave → repository ของ A อ่านพบ X แต่ local snapshot ไม่มี X จึงสั่งลบ X แม้ผู้ใช้ A ไม่ได้ลบรายการนั้น การแก้รายการ ID เดียวกันก็เขียนทับโดยไม่มี revision check

`mergeFinanceData` ใน `src/features/sync/syncData.ts:28` ไม่มี caller ใน app flow จึงไม่ได้ป้องกันปัญหานี้ และถ้านำมาใช้ตรงๆ การ union ด้วย ID โดยไม่มี tombstone จะคืนรายการที่ลบไปแล้วได้

**แผนแก้:** แยก ordinary mutation เป็น upsert/delete เฉพาะ ID ที่ผู้ใช้เปลี่ยน มี revision/conflict control และให้ snapshot replacement ใช้เฉพาะ import ที่มีขอบเขตชัดเจน การใส่ tombstone อย่างเดียวไม่แก้ stale overwrite ของรายการที่ยังอยู่

**เกณฑ์ผ่าน:** A บันทึกหลัง B เพิ่ม X แล้ว X ยังอยู่; การแก้ ID เดียวกันแจ้ง conflict หรือ resolve ตามนโยบายที่ทดสอบแล้ว; delete ไม่กลับมาหลัง client เก่ากลับมาออนไลน์

## F02 · P1 · ลบทริปหรือรายการที่ hydrate มาจาก transaction แล้วกลับมา

**สถานะ:** ยืนยันด้วยเคสจำลอง · แก้ ownership และ canonical transaction migration แล้วใน PR-03/PR-10; ต้องตรวจ workflow ผ่าน browser/Firestore เพิ่ม

หลักฐาน:

- `src/lib/dataMigration.ts:347` hydrate รายการจาก transactions เข้า trips
- `src/lib/dataMigration.ts` แยก `migrateFinanceData` (load/import) ออกจาก `normalizeFinanceData` (runtime)
- `src/state/FinanceDataProvider.tsx` update/delete trip เรียก reconciliation/detach ตาม ownership
- `src/features/trips/utils/tripUtils.ts` `deleteTripItem` ลบเฉพาะ nested item

Input จำลองก่อน PR-03: transaction `tx-trip-1`, `tripId: trip-1`, `sourceModule: trip`, `sourceRefId: item-1` เมื่อ normalize จะได้ทริปหนึ่งรายการ จากนั้นลบทริปแล้วเรียก `withUpdatedMeta` ผลคือทริปกลับมา 1 รายการ; ลบ item แล้วทำเช่นเดียวกัน item กลับมา 1 รายการ

การแก้ยอด/วันที่ใน trip item ตอนนี้ reconcile ไปยัง transaction เจ้าของด้วย sourceRefId เดียวกัน; หาก import พบข้อมูลสอง representation ไม่ตรงกันจะเก็บ issue ใน reconciliation report และ block ตอน persistence จนกว่าจะตรวจ

**แผนแก้:** ย้าย hydration ไป migration แบบครั้งเดียว; reconcile/consume legacy source ด้วย ID mapping; runtime mutation ไม่สร้าง entity กลับจากข้อมูลเก่าอีก กำหนด delete policy ของ linked records อย่างชัดเจน

**เกณฑ์ผ่าน:** create/edit/delete → normalize/export/import/reload แล้วไม่มีรายการคืนชีพ และยอด/สถานะไม่แยกเป็นสองชุด

## F03 · P1 · Transaction ที่มี tripId หายจาก Monthly/Yearly ได้

**สถานะ:** ยืนยันด้วยเคสจำลองตามเงื่อนไข ledger ของหน้า Monthly และตรวจ Yearly · canonical trip transactions และ dedupe ถูกทำใน PR-03/PR-10

หลักฐานเดิมอยู่ที่ `src/features/monthly/MonthlyPage.tsx` และ `src/features/yearly/YearlyPage.tsx`; ปัจจุบัน canonical trip transactions เป็น persisted source, `selectPersistedLedgerTransactions` เก็บ linked manual/orphan rows และ deduplicate ด้วย source mapping ขณะที่ `createTripItemFromTripTransaction` สร้างเพียง compatibility read model ที่ migration boundary

ตัวอย่างก่อน PR-03: expense ที่มี `tripId` แต่ `sourceModule: manual`, ID ปกติ และไม่มี trip item คู่กัน → transaction ถูกเก็บใน data แต่ ledger ไม่แสดง เคสจำลองได้ 0 rows ไม่ใช่ข้อมูลถูกลบจาก persistence แต่ผู้ใช้จะเห็นยอดขาดไป รายการ installment ที่มี reference แต่ไม่มี plan ก็ต้องตรวจในลักษณะเดียวกัน

**แผนแก้:** แยก relation (`tripId`) จาก ownership/source; deduplicate เฉพาะรายการที่มี identity mapping ว่าเป็นเหตุการณ์เดียวกัน ไม่ใช้การมี foreign key เป็นเหตุให้ทิ้ง transaction

**เกณฑ์ผ่าน:** linked manual income/expense, imported row, orphan reference และ ordinary trip row ต้องแสดงครบและไม่ถูกนับซ้ำ

## F04 · P1 · Snapshot balance ทำให้ยกเลิกจ่ายแล้วหนี้ยังเป็นศูนย์

**สถานะ:** ยืนยันด้วยเคสจำลอง · แก้กลไกแล้วใน PR-04; ต้องตรวจ workflow ผ่าน browser/Firestore เพิ่ม

หลักฐานก่อน PR-04: `src/features/installments/utils/installmentPlans.ts:111`, `:667`, `:682`

`setAllMonthsPaid(plan, true)` ตั้ง `remainingOverride` และ `balanceSnapshotAmount` เป็น 0 แต่ `setPaidMonth(plan, month, false)` ไม่ล้าง/ปรับค่าเหล่านี้ ขณะที่ `calculateInstallmentProgress` เลือก snapshot ก่อนยอดตาม schedule

ตัวอย่าง: 2 งวด งวดละ 100 → จ่ายครบ → ยกเลิกจ่ายงวดแรก ผลจริง `monthsRemaining: 1`, `totalPaid: 100`, `remainingAmount: 0` แทนยอดที่สอดคล้องกันตาม schedule นอกจากนี้ snapshot ที่เป็นบวกจะค้างค่าเดิมเมื่อเปลี่ยนสถานะรายงวด

**แผนแก้:** แยก calculated balance กับ dated balance snapshot; ไม่สร้าง override จาก action จ่ายครบ; กำหนดการ invalidate snapshot และการแสดงยอดสินค้ามีดอกเบี้ย

**เกณฑ์ผ่าน:** pay/unpay/settle/unsettle และ imported snapshot ไม่ทำให้สถานะงวดกับยอดคงเหลือขัดกัน

## F05 · P1 · Import ยอมรับข้อมูลผิดและเปลี่ยนค่าเงียบๆ

**สถานะ:** ยืนยันด้วยเคสจำลองและเส้นทาง import · แก้ raw validation/recovery แล้วใน PR-05; ยังต้องทดสอบ Firestore/browser workflow

หลักฐาน: `src/lib/dataMigration.ts:88`, `:94`, `:259`, `:547`; `src/state/FinanceDataProvider.tsx:179`; `src/App.tsx` `handleConfirmImportJson`

- วันที่ `2026-02-30` ผ่าน Date parse และถูกเก็บเป็นข้อความเดิม; month ตรวจเพียง regex จึงรับ `2026-13`
- amount ติดลบถูก clamp เป็น 0; invalid/missing date ถูกแทนด้วยวันที่ปัจจุบัน ทำให้ยอดหรือเดือนเปลี่ยน
- `schemaVersion: 999` ถูก normalize เป็น 2 โดยไม่มี reject เวอร์ชันที่ยังไม่รองรับ
- JSON เช่น `null`, `{}` หรือ primitive ถูก normalize เป็นข้อมูลว่าง; มี preview/confirm และ backup download อยู่แล้ว แต่ไม่มี validation ที่รับรองว่าเป็นไฟล์แอปที่ถูกต้อง
- ไม่มี uniqueness/foreign-key validation ก่อนบันทึก; ID ซ้ำใน array สามารถลงเอกสาร ID เดียวกัน และ ID ที่ขาดถูกสร้างใหม่ระหว่าง normalize
- `transactions ?? entries` เลือก canonical ทันทีแม้ array ว่างหรือผิดชนิด หากสองชุดขัดกัน legacy data อาจถูกละเลย

**แผนแก้:** แยก parse → validate raw shape/version → explicit migration → validate canonical → preview diff โดย invalid data ต้อง reject/quarantine พร้อม field path และ reason การแก้ข้อมูลโดยประมาณต้องแสดงใน preview ไม่เงียบ

**เกณฑ์ผ่าน:** ไม่เขียน Cloud เมื่อ root/version/date/ID/amount ผิด; preserve original file เพื่อ recovery; import/export round-trip รักษายอดและความสัมพันธ์

หลักฐานหลัง PR-05: `src/lib/importValidation.ts` ตรวจ raw payload ก่อน migration และ `src/state/FinanceDataProvider.tsx` จะไม่เปลี่ยน local data หรือทำเครื่องหมายสำเร็จก่อน Cloud save ตอบรับ; preview เก็บ source text และ More page คง preview ไว้ให้ retry เมื่อ save ล้มเหลว

## F06 · P1 · ทริปที่ผูกผ่อนอาจนับค่าใช้จ่ายซ้ำ

**สถานะ:** ยืนยันจากเส้นทางโค้ด; กำหนด policy และเพิ่ม fixture แล้วใน PR-10 โดย trip transaction เป็น purchase-cost source ส่วน cashflow ใช้ installment occurrence เมื่อมี plan ที่รู้จัก

หลักฐาน: `deriveTripTransactions` และ `selectPersistedLedgerTransactions` ใน `src/features/trips/utils/tripUtils.ts`/`src/features/monthly/utils/monthlyLedger.ts` ใช้ source mapping และ suppress purchase transaction เมื่อมี installment plan ที่รู้จัก; Trip detail ยังสรุป purchase cost จาก transaction-backed read model ส่วน Monthly/Yearly ใช้ installment occurrence เป็น cashflow

ตัวอย่าง: ค่าตั๋ว 12,000 ผูกแผน 12 งวด × 1,000 จะมีทั้ง trip expense 12,000 และ installment 1,000 ในเดือนซื้อ หากใช้ยอดนั้นเป็นกระแสเงินสดจะสูงกว่าที่ต้องการ แต่ยอดค่าทริป 12,000 ยังมีประโยชน์ในมุมมองต้นทุนทริป

**แผนแก้:** แยก travel cost กับ cashflow recognition ด้วย `tripId`, `sourceRefId` และ `installmentPlanId`; ห้ามทิ้งทุก item ที่มี installmentId เพราะอาจเป็น reference อย่างเดียวในข้อมูลเก่า

**เกณฑ์ผ่าน:** fixture ของผ่อนเต็มจำนวน/บางส่วน/ดาวน์ มียอด cashflow และ trip cost ที่กำหนดไว้แน่นอน; orphan plan ไม่ทำให้ค่าใช้จ่ายหาย

## F07 · P2 · กำหนดวันชำระไม่ตรงระหว่างหน้าผ่อนกับ ledger

**สถานะ:** ยืนยันด้วยเคสจำลอง · แก้กลไกแล้วใน PR-04; ต้องตรวจ workflow ผ่าน browser/Firestore เพิ่ม

หลักฐานก่อน PR-04: `calculateInstallmentMonthlyInfo` ใน installmentPlans.ts ใช้ fallback วันที่ 25 ขณะที่ `deriveInstallmentTransactions` ใช้วันที่ 1

Plan ไม่มี dueDay/paymentDay → หน้า Installments ได้ `actualDueDay: 25` แต่ Monthly row ได้ `2026-09-01` จึงเปลี่ยนความหมายของ overdue และวันที่แสดง

อีกจุดจากโค้ด: `daysUntilDue = actualDueDay - todayDate` สำหรับรายการ overdue ข้ามเดือน ใช้เฉพาะเลขวัน จึงอาจได้ค่าบวกทั้งที่ค้างชำระแล้ว ควรใช้ผลต่าง calendar date เต็ม

**แผนแก้/เกณฑ์ผ่าน:** ใช้ `getInstallmentDueDate` ร่วมกันและเลือก fallback เดียว; ทดสอบ 28/29/30/31 วัน, leap year, overdue ข้ามเดือนและปี

## F08 · P2 · Smart search จำนวนเงินและเดือนผิด

**สถานะ:** parser ยืนยันด้วยเคสจำลอง · แก้ operator และ effective range แล้วใน PR-05; ยังต้องตรวจ workflow ผ่าน browser

หลักฐาน: `src/features/monthly/utils/monthlySmartFilter.ts`; `src/features/monthly/utils/monthlyLedger.ts` `filterMonthlyTransactions`; `src/features/monthly/MonthlyPage.tsx:85`

- `parseMonthlySmartKeyword('ไม่เกิน 100')` ได้ `{ text: 'ไม่', minAmount: 100 }` เพราะ regex `เกิน` match ก่อน `ไม่เกิน`
- `มากกว่า`/`ต่ำกว่า` ถูกนำไปใช้กับ `>=`/`<=` จึงไม่ตรงความหมายที่ boundary
- หน้า Monthly สร้าง derived rows ตามเดือนใน controls ก่อน filter keyword; ค้น `เดือนก่อน` อาจเปลี่ยนช่วงกรองแต่ไม่สร้าง installment/trip ของเดือนนั้น ทำให้เห็น manual rows แต่ derived rows ขาด

**แผนแก้:** parse คำเฉพาะก่อนคำย่อย เก็บ operator ชัดเจน และ resolve effective filters ก่อนเรียก ledger selector ให้ label/summary ใช้ช่วงเดียวกัน

**เกณฑ์ผ่าน:** ไม่เกิน/เกิน/ต่ำกว่า ที่ค่าเท่ากับเกณฑ์; เลือกเดือนปัจจุบันแล้วค้นเดือนก่อนยังเห็น manual+trip+installment ครบ

หลักฐานหลัง PR-05/PR-07: `parseMonthlySmartKeyword` แยก `ไม่เกิน` ก่อน `เกิน`, เก็บ inclusive/strict flags และ `resolveMonthlyFilterRange` ถูกใช้ก่อน derive rows; `selectLedgerTransactionsForRange` รวม persisted/derived rows ด้วย effective range เดียวกันใน Monthly และ Yearly

## F09 · P2 · Budget มีหลายยอดและหลายกฎที่ไม่ตรงกัน

**สถานะ:** แก้แล้วใน PR-08 และ migrate monthly multi-line ไป canonical records แล้วใน PR-09

หลักฐาน: `src/lib/dataMigration.ts:435`, `src/features/budgetGoals/budgetGoalCalculations.ts`, `src/features/trips/utils/tripUtils.ts:119` และ `compareTrips`

- `Budget.amount` และ `lines[].amount` ต่างกันได้ โดย normalization ไม่ reconcile
- Monthly usage ใช้ `getBudgetCategoryKeys` รวมทุก line; form เก็บ lines เดิมระหว่างแก้และแจ้ง collision ก่อนเขียน
- Trip planned budget และ `budget-desc` ใช้ selector เดียวกัน; explicit zero ไม่ fallback ไป `trip.budget`
- Monthly/trip status ใช้ `getBudgetThresholds`; pending budget usage ใช้ `includePendingInMonthlyTotals` เดียวกับ totals

**แผนแก้:** ใช้ discriminated budget scope, กำหนด aggregate policy เดียวและ explicit zero/null semantics, sort ตาม selector เดียวกับ UI; multi-line import ต้อง migrate หรือแจ้งว่าแก้ไม่ได้ ห้ามตัด line เงียบๆ

**เกณฑ์ผ่าน:** edit/import หลายหมวดไม่สูญหาย; delete line สุดท้ายและวงเงิน 0 ได้ผลที่กำหนด; custom thresholds มีผลจริง

## F10 · P1/P2 · Save lifecycle ยังไม่มีการประสานงานครบ

**สถานะ:** ยืนยันโครงสร้างจากโค้ด · แก้ queue/dirty/retry lifecycle แล้วใน PR-06; deferred contract test ผ่าน แต่ยังต้องทดสอบ network/Firestore Emulator

หลักฐาน: `src/features/sync/useAutoFinanceSync.ts:54`, `:141`, `:152`; `src/services/firebase/firestoreFinanceRepository.ts:77`; `src/state/FinanceDataProvider.tsx:248`

- saveNow แบบ manual เรียกซ้อนได้โดยไม่มี shared in-flight queue; load/import/save อาจ overlap
- commit แบ่งกลุ่ม 400 operations แล้วรันทีละกลุ่ม กลุ่มก่อนสำเร็จแล้วกลุ่มหลังล้มเหลวจะได้ข้อมูลบางส่วน ไม่มี generation marker สำหรับ consistent read
- โหลด Cloud แบบ manual จะ cancel debounce และ replace local data โดยยังไม่ตรวจ dirty state
- ไม่มี durable pending queue ใน app flow; ปิดหน้า/ออกจากระบบก่อน debounce 1.8 วินาทีทำให้การแก้ล่าสุดยังไม่ถูกส่ง
- provider ตั้ง `saveState: saved` ก่อน Cloud ack ขณะที่ hook เก็บ SyncStatus อีกชุด; หลัง error effect สามารถกลับไป idle/retry โดยไม่มี backoff ที่ชัด
- validate ID หลัง normalize จะไม่ตรวจพบ original missing ID ที่ normalizer เพิ่งสร้างแทนให้

**แผนแก้:** sync coordinator เดียวสำหรับ mutation/save/load/import; pending/saving/synced/error/conflict states, serialized queue, bounded retry/backoff, dirty protection และ revision/generation ตาม operation

**เกณฑ์ผ่าน:** slow save → edit ใหม่ไม่หาย; double save ไม่ย้อนข้อมูล; failure หลัง batch แรกไม่เผย snapshot ครึ่งชุด; failed import ไม่รายงาน complete; logout/load ระหว่าง dirty มีเส้นทางรักษาข้อมูล

หลักฐานหลัง PR-06: `FinanceSyncCoordinator` serialize งานและรักษา operation id; `useAutoFinanceSync` ใช้ acknowledged revision/base, คง dirty edit ระหว่าง save และปฏิเสธ load เมื่อมี local edit; More page ปิด load/logout ขณะ dirty และ demo branch ไม่เรียก Firestore

## F11 · P2 · Schema มี setting และ relation ที่ไม่มี behavior รองรับ

**สถานะ:** แก้ส่วนที่ประกาศ supported/reserved ใน PR-08; canonical metadata/config และ aliases ถูกจัด boundary ใน PR-09 แล้ว

- `includePendingInMonthlyTotals` ถูกใช้กับ totals และ budget progress/alerts
- `defaultView` ถูก normalize และใช้เป็นค่าเริ่มต้นของ `useFinanceStore`; URL ที่ถูกต้อง override ได้
- `monthStartsOn` ยังไม่มี consumer จึงเป็น reserved แต่ normalizer รักษา explicit `0` แล้ว
- profile/settings เก็บ baseCurrency/locale/timezone ซ้ำ แต่ formatter ใช้ค่าคงที่หรือ timezone เครื่อง
- recurringRules ถูก import/export/sync แต่ไม่มี scheduler/CRUD; การสร้างซ้ำจาก form เป็น eager transactions คนละกลไก
- Goal `goalId`/`linkedCategoryId` ไม่ได้ทำให้ currentAmount เปลี่ยนอัตโนมัติ และ `type`/`kind` ซ้ำกัน

`recurringRules`, goal links (`goalId`/`linkedCategoryId`) และ locale/currency/timezone customization ยังเป็น reserved/preserve-for-import จนกว่าจะมี behavior และ owner ที่ตกลงกันใน PR ถัดไป

## F12 · P2 · Demo mode ยังต่อกับ Cloud sync จริง

**สถานะ:** ยืนยันจาก wiring · แก้ demo isolation แล้วใน PR-06; ยังไม่ได้ทำ network spy/integration test จริง

`src/features/auth/AuthGate.tsx` ใช้ `?demo=true` สร้าง fake user; provider ใส่ sample data แต่ `src/App.tsx` ยังเรียก `useAutoFinanceSync` ด้วย `demo-user` โดยไม่มี demo repository guard การแก้ข้อมูล demo จึงพยายาม save ผ่าน Firestore ปกติ; logout ของ demo ไม่เปลี่ยน local demo state

ไม่สรุปว่าอ่าน/เขียนข้อมูลคนอื่นได้ เพราะยังขึ้นกับ Auth และ rules ที่ deploy อยู่

**แผนแก้:** inject in-memory repository สำหรับ demo, ปุ่มออก demo เปลี่ยน mode อย่างชัดเจน และทดสอบว่าไม่มี network persistence call

## F13 · P3 · โครงสร้างโค้ดและเครื่องมือเพิ่มภาระการดูแล

- FinanceDataProvider รวม load/import/validation/CRUD/budget logic/demo seed และเปิด `setData` ให้ consumer ข้าม invariant ได้
- utility ไฟล์ installment รวม form/filter/payment/schedule/dashboard/projection; ฟังก์ชันวันที่และ totals ซ้ำหลายไฟล์
- withUpdatedMeta normalize ทุก entity ใหม่แม้แก้รายการเดียว ทำให้ reference เปลี่ยนทั่ว data และเพิ่มงาน render/derive/fingerprint
- Monthly และ Yearly ประกอบ ledger แยกกัน จึงมีโอกาส drift; tests consistency ปัจจุบันไม่ได้ครอบคลุมทุกเส้นทาง UI
- `tsx` ไม่อยู่ devDependencies แต่ npm test ดาวน์โหลดผ่าน npx ทุก invocation; test files ถูกระบุด้วยมือใน script
- ไม่พบ Firestore rules/emulator configuration ในไฟล์ที่ตรวจ ควรเพิ่มเป็นโครงสร้างทดสอบและ deployment ที่ตรวจสอบได้ โดยไม่อนุมานว่า rules จริงเปิดกว้าง
- `README.md` ยังบอกว่า CRUD/Auth เป็น placeholder และอ้างเอกสารที่ไม่พบใน inventory; `docs/context.md` อธิบายระบบใหม่กว่า
- bundle มี warning ขนาดใหญ่ ควรวัด initial load และแยกโหลด feature หลังแก้ correctness ไม่ควรเปลี่ยน chunk config เพียงเพื่อซ่อน warning

**แผนแก้:** แยกตาม domain responsibilities, selectors และ repository interface ที่ทดสอบได้; รักษา feature folders เดิม; ลง local test runner และปรับเอกสารให้ตรงระบบจริง
