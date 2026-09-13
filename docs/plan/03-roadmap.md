# Roadmap การแก้ไข

แผนนี้แบ่งงานเป็น PR ที่ตรวจและย้อนกลับได้ ขนาด S/M/L เป็นขนาดสัมพัทธ์ ไม่ใช่กำหนดวันส่งมอบ เริ่มจาก P1 ที่มีความเสี่ยงข้อมูล ก่อน schema และ UI cleanup

## Phase 0 — สร้าง baseline ที่รันซ้ำได้

### PR-01 · Test infrastructure และ fixtures · S · เสร็จแล้ว

แก้ package.json/lockfile ให้ `tsx` เป็น devDependency ใช้ runner ที่ติดตั้งในโปรเจคแทน `npx -y` ดาวน์โหลดขณะ test ตามแนวทางปัจจุบัน และเพิ่ม shared fixture/test ที่ `src/test/fixtures/financeFixtures.ts` หากเพิ่ม test file ให้เพิ่มใน script ด้วย หรือแยก PR สำหรับ discovery runner ภายหลัง

เพิ่ม fixture builders ด้วยข้อมูลสังเคราะห์สำหรับ v1/v2, conflicting aliases, trip hydration, plans, budgets, duplicate IDs และ invalid inputs ใส่ clock/ID generator ที่ deterministic ใน tests ที่ต้องใช้

**เกณฑ์จบ:** clean install จาก lockfile แล้ว lint/test/build ผ่าน; test execution หลังติดตั้งไม่ต้องดาวน์โหลด runner; assertions เดิมทั้ง 5 ไฟล์ยังผ่าน; shared fixtures ใช้ ID/timestamp คงที่; ไม่ commit finance data จริง

**ผลตรวจใน working tree:** `npm test`, `npm run lint` และ `npm run build` ผ่านแล้ว โดย build ยังมีคำเตือน bundle ใหญ่ตาม baseline

**Dependency:** ไม่มี · **เกี่ยวข้อง:** F13

## Phase 1 — ป้องกันข้อมูลสูญหายและแก้บั๊กตรงจุด

### PR-02 · ป้องกัน stale Cloud snapshot · L · เสร็จแล้ว

เพิ่ม save options และ operation contract สำหรับ upsert/delete ที่ชัด แยก ordinary save จาก explicit `replace: true` สำหรับ import เก็บ revision/base revision และป้องกัน write จาก stale client อย่าใช้ `mergeFinanceData` เป็นทางลัดแก้ conflict โดยไม่มี deletion semantics

เริ่มด้วย protective conflict rejection ได้ก่อน incremental optimization โดยใช้ Firestore transaction ตรวจ revision พร้อม writes สำหรับข้อมูลไม่เกิน 500 writes; dataset ใหญ่กว่านี้ถูกปฏิเสธชั่วคราวจนกว่า bulk generation จะพร้อม จึงไม่ประกาศความเป็น atomic เกินขอบเขตที่ทำได้

เพิ่ม conflict state ใน sync UI แล้ว: เมื่อ revision ไม่ตรงจะหยุดปุ่ม save และให้ผู้ใช้โหลด Cloud baseline ผ่านปุ่ม `โหลดจาก Cloud` ก่อนดำเนินการต่อ การทดสอบ two-client จริงยังต้องใช้ Firestore Emulator หรือ project test แยกจาก production

**ผลใน working tree:** ordinary save ลบเฉพาะ IDs ที่อยู่ใน `baseData` แล้วหายจาก local state; import ใน `src/App.tsx` ส่ง `replace: true` และเทียบ revision กับ Cloud baseline ไม่ใช่ metadata จากไฟล์ backup; root `revision` ตรวจใน transaction และคืน revision ใหม่; save ที่มี newer local edit ไม่ใช้ response เก่าทับ edit นั้น; build/lint/test ผ่าน

**ผลการทดสอบ:** `src/features/sync/syncRepository.test.ts` จำลอง two-client add/edit/delete, conflict preservation และ explicit replace ผ่านแล้ว; `firestore.rules` บังคับ tenant ownership, monotonic root revision และห้ามลบ root; `firebase.json` พร้อมให้รัน integration ต่อใน emulator/test project

**ข้อจำกัดที่อยู่นอก PR นี้:** environment นี้ยังไม่มี Firestore Emulator จึงยังไม่ได้รัน rules integration จริง; old writer version และ bulk replacement แบบ generation สำหรับข้อมูลเกิน 500 writes เป็นงาน rollout/PR-06 ต่อไป

**ข้อควรระวังในการ deploy rules:** rules ชุดนี้จะปฏิเสธ writer รุ่นเก่าที่ไม่ส่ง `revision` หรือไม่เพิ่ม revision ทีละหนึ่ง ควร deploy หลัง client ที่ใช้ PR-02 พร้อมกัน หรือเตรียม migration/maintenance window สำหรับผู้ใช้ที่เปิดแท็บรุ่นเก่า

**Dependency:** PR-01 · **เกี่ยวข้อง:** F01, F10

### PR-03 · แยก migration ออกจาก mutation และแก้ trip ownership bug · M/L · เสร็จแล้ว

แยก pure validation/canonicalization ออกจาก legacy hydration; provider update เฉพาะ entity ที่เปลี่ยนและ meta ไม่ hydrate ทุกครั้ง เพิ่ม explicit reconciliation ของ imported trip source และ delete policy ช่วงเปลี่ยนผ่าน ปรับ ledger ไม่ซ่อน linked manual records

**ผลใน working tree:** เพิ่ม `migrateFinanceData` สำหรับ load/import boundary และทำให้ `normalizeFinanceData` ไม่มี side effect ที่ hydrate trip; repository/provider เรียก migration เฉพาะตอนนำข้อมูลเข้า runtime. `updateTrip` reconcile รายการ transaction ที่เป็นเจ้าของจาก trip item ส่วน `deleteTrip` ลบ source-owned rows และ detach รายการ manual ที่อ้างอิงทริป; ลบ item จะลบ source row ตาม mapping. Monthly/Yearly รวม persisted transactions ทุกแถวที่ไม่ใช่ installment และ derive trip rows เฉพาะ item ที่ยังไม่มี persisted identity

**ผลการทดสอบ:** เพิ่ม `src/lib/dataMigration.test.ts`, `src/lib/importDiagnostics.test.ts`, regression ownership/reconciliation/dedupe ใน `tripUtils.test.ts` และ linked manual coverage ใน `monthlyLedger.test.ts`; `npm test`, `npm run lint`, `npm run build` ผ่าน

**ข้อจำกัด:** orphan/manual references ยังถูกเก็บไว้เพื่อไม่ลบข้อมูล โดย import diagnostics จะแจ้ง trip IDs และ transaction IDs ที่หาไม่พบ; policy นี้จะถูกทำให้เป็น selector กลางและตรวจ migration report ต่อใน PR-05/PR-07

**เกณฑ์จบ:** F02/F03 reproduction กลายเป็น regression tests ที่ผ่าน; delete trip/item ไม่กลับมาหลัง reload/export-import; edits ของ migrated trip ใช้แหล่งหลักเดียว; orphan reference มี diagnostics

**Dependency:** PR-01 และ persistence contract ของ PR-02 ถูก integrate แล้ว · **เกี่ยวข้อง:** F02, F03

### PR-04 · แก้ยอดผ่อนและวันครบกำหนด · M · เสร็จแล้ว

เลิกใช้ settlement action สร้าง permanent remaining override; กำหนด snapshot invalidation/visibility; รวม dueDate helper และคำนวณ overdue ด้วย date เต็ม ตรวจ form, schedule, calendar, alerts และ projection ให้ใช้ค่าตรงกัน

**ผลใน working tree:** `calculateInstallmentProgress` แยกยอดตาม schedule, เงินต้น และ snapshot ออกจากกัน โดย snapshot เป็นข้อมูลอ้างอิงตามเดือนและไม่ freeze ยอดปัจจุบัน. `setPaidMonth`/`setAllMonthsPaid` ล้าง snapshot ทุกครั้งที่เปลี่ยนสถานะ จึงไม่เกิด settle → unpay แล้วยอดคงเหลือค้างเป็นศูนย์. เพิ่ม `getInstallmentDueDay`/`getInstallmentDueDate` ใช้ร่วมกันระหว่าง monthly info, derived ledger rows และ sort; fallback วันครบกำหนดเป็นวันที่ 25 และ clamp วันสิ้นเดือน/ปีอธิกสุรทิน. Overdue/daysUntilDue ใช้ผลต่างวันจากวันที่เต็ม และแผนมีดอกเบี้ยใช้ยอดชำระตามสัญญาแยกจากเงินต้น

**ผลการทดสอบ:** เพิ่ม regression cases ใน `src/features/installments/utils/installmentPlans.test.ts` สำหรับ snapshot invalidation, settle/unpay, ดอกเบี้ย/เงินต้น, fallback due day, due date สิ้นเดือน, leap year, ข้ามปี และวันที่ derived transaction; `npm test`, `npm run lint`, `npm run build` ผ่าน

**ข้อจำกัด:** ฟิลด์ legacy `remainingOverride`/`balanceSnapshotAmount` ยังอ่านเพื่อ compatibility แต่ canonical export ใช้ `balanceSnapshot`; การแยก money units เป็นงาน PR-10

**เกณฑ์จบ:** settle → unpay ได้ยอด/สถานะสอดคล้อง; pay/unpay snapshot cases ไม่ค้างค่าเงียบ; due day fallback ทุกหน้าตรงกัน; end-of-month/leap-year/cross-year tests ผ่าน ไม่ตีความค่างวดมีดอกเบี้ยทั้งหมดเป็นเงินต้น

**Dependency:** PR-01 · **เกี่ยวข้อง:** F04, F07

### PR-05 · Import validation และ recovery flow · L · เสร็จแล้ว

เพิ่ม version dispatch, strict root/entity validation, unique IDs, reference diagnostics และ conflict reporting ก่อน normalize; ไม่ยอมรับ future version/invalid root เป็นข้อมูลว่าง แยก intentional empty dataset ที่ถูก schema จากไฟล์ผิด

ปรับ confirmImport ให้คืนผล success/error จริงไป UI เก็บ preview/recovery state เมื่อ save ล้มเหลว ไม่ตั้ง import complete ตั้งแต่เปลี่ยน local state และไม่ปิดการกู้คืนโดยอัตโนมัติ

**เกณฑ์จบ:** malformed/version/duplicate/date/amount cases ไม่เขียน Cloud; partial replacement ไม่เผยครึ่งชุด; backup ก่อน import ยังอยู่; failure แล้ว retry/recover ได้โดยไม่สูญข้อมูลเดิม

**ผลใน working tree:** เพิ่ม `src/lib/importValidation.ts` เป็น raw-payload gate ก่อน migration โดยตรวจ root/schema version, collection shape, required IDs, duplicate IDs, date/month, amount และ enum/reference fields; schema v2 ที่เป็น empty dataset ยังนำเข้าได้ ส่วน future/invalid schema และ malformed payload ถูกปฏิเสธพร้อม path/reason. Preview เก็บ `sourceText` ไว้ใน memory และ import จะบันทึก Cloud ก่อนเปลี่ยนสถานะสำเร็จใน provider; เมื่อ save ล้มเหลวจะคง preview/diagnostics ให้ยืนยัน retry ได้ โดย backup เดิมยังถูกดาวน์โหลดก่อนเริ่ม replacement. Monthly smart search แก้ลำดับ `ไม่เกิน`, strict `เกิน`/`ต่ำกว่า` boundary และ resolve ช่วงเดือนก่อน derive installment/trip rows

**ผลการทดสอบ:** เพิ่ม strict import validation tests และ regression tests สำหรับ `ไม่เกิน`/`เกิน`/`เดือนก่อน`; `npm test`, `npm run lint`, `npm run build` ผ่าน

**ข้อจำกัด:** recovery state ยังอยู่ใน memory ของ session ปัจจุบัน; durable outbox, serialized sync lifecycle และ emulator integration เป็นงาน PR-06

**Dependency:** PR-01, PR-02, PR-03 · **เกี่ยวข้อง:** F05, F10

### PR-06 · Sync lifecycle และ demo isolation · M/L · เสร็จแล้ว

รวม save/load/import ลง coordinator เดียว มี queue, in-flight operation identity, revision, pending state และ bounded backoff ให้ UI ใช้สถานะ persistence แหล่งเดียว ป้องกัน manual reload/logout ทับ dirty data และกำหนดวิธีกู้ pending edits ระหว่าง session/refresh

หากเลือก durable local outbox ให้แยก per-user และระบุ lifecycle/cleanup; ไม่เปลี่ยนแอปเป็น offline-first เต็มระบบโดยไม่จำเป็น Demo ใช้ in-memory repository และออกจาก demo ได้จริง

**เกณฑ์จบ:** delayed save/rapid edit/manual save/load/import/error scenarios ผ่าน; status synced เกิดหลัง ack เท่านั้น; failure ยังคงเห็นและ retry ได้; demo network write = 0

**ผลใน working tree:** เพิ่ม `FinanceSyncCoordinator` สำหรับ serialize save/load พร้อม operation id และ queue ที่ไม่เสียต่อเมื่อ operation ก่อนหน้าล้มเหลว; `useAutoFinanceSync` ใช้ coordinator เดียวกับ autosave/manual save/load/import, คำนวณ revision/base จาก Cloud ack ล่าสุดเพื่อไม่ให้ queued save ชน conflict, เก็บ `dirty`/`pending` state และไม่ให้ load/logout ทับ local edit ที่ยังไม่ซิงก์. เพิ่ม bounded exponential retry สำหรับ transient failures, session guard กันผลลัพธ์จาก user เดิมหลัง logout/unmount และ recovery flow ที่ backup ก่อน force-load เมื่อเกิด conflict. `demo-user` ไม่เรียก Firestore ทั้ง save/load และแสดงสถานะ local-only

**ผลการทดสอบ:** เพิ่ม `src/features/sync/syncCoordinator.test.ts` ครอบคลุมลำดับงาน, operation identity, retry bound และ non-retryable error; `npm test`, `npm run lint`, `npm run build` ผ่าน

**ข้อจำกัด:** pending/recovery state ยังอยู่ใน memory ของ session; หากปิดแท็บก่อน ack จะยังไม่มี durable outbox และยังไม่ได้รัน Firestore Emulator/network integration

**Dependency:** PR-02, PR-05 · **เกี่ยวข้อง:** F10, F12

## Phase 2 — ทำกฎธุรกิจให้ใช้ร่วมกัน

### PR-07 · Shared ledger และ smart filters · M · เสร็จแล้ว

ย้ายการประกอบ Monthly/Yearly ledger ไป selector เดียว Resolve effective date range จาก smart keyword ก่อน derive rows และใช้ผลเดียวกันกับ labels/totals แก้ parser `ไม่เกิน` กับ strict/inclusive operators

วาง pending policy สำหรับ totals/budgets อย่างชัดเจนและเชื่อม setting ที่รองรับ คง trip-cost กับ cashflow เป็นคนละ selector หากใช้นโยบาย F06; เพิ่ม acceptance fixtures ของ trip ที่ผ่อนก่อนเปลี่ยนยอดแสดง

**เกณฑ์จบ:** เดือนก่อน/ช่วงกลับด้าน/ข้ามปีเห็นทุก source; amount boundary tests ผ่าน; yearly เท่ากับ monthly 12 เดือนใน policy เดียวกัน; linked expenses ไม่หายหรือซ้ำ

**ผลใน working tree:** เพิ่ม `selectLedgerTransactionsForRange` เป็น selector กลางที่กรอง persisted rows และ derive installment/trip rows ตาม effective range เดียวกัน ให้ Monthly และ Yearly ใช้ logic เดียวกัน รวมถึง normalize ช่วงกลับด้านและคง linked manual transactions ไว้. `calculateMonthlyTotals` รองรับ policy `includePendingInMonthlyTotals`: เมื่อปิดจะตัด pending ออกจาก expense/balance แต่ยังแสดง `pendingExpense` แยก; ค่าเริ่มต้นยังคงนับ pending เพื่อไม่เปลี่ยน behavior เดิม. การรับรู้ trip-cost กับ cashflow ยังแยกเป็นข้อกำหนด F06 ที่รอการตัดสิน ไม่เปลี่ยนความหมายใน PR นี้

**ผลการทดสอบ:** เพิ่ม regression cases สำหรับ pending policy, reversed month range, derived installment/trip rows ใน shared selector และ yearly/monthly total parity; `npm test`, `npm run lint`, `npm run build` ผ่าน

**ข้อจำกัด:** ยังไม่ได้ทำ browser/E2E และยังไม่เปลี่ยน trip-cost recognition จนกว่า F06 จะมี policy ที่ยืนยัน

**Dependency:** PR-03, PR-04 และตัดสิน F06 ก่อนเปลี่ยน recognition · **เกี่ยวข้อง:** F03, F06, F08, F11

### PR-08 · Budget และ supported settings contract · M · เสร็จแล้ว

รวม budget total/category/threshold selectors ให้ display/filter/sort ใช้ชุดเดียว แก้ zero fallback, multi-line edit loss และ category collision ทำ defaultView ใช้งานจริงหรือประกาศไม่รองรับ ระบุ recurringRules/goal links เป็น reserved ถ้ายังไม่ implement

**เกณฑ์จบ:** monthly multi-line import ไม่ถูกตัดทิ้ง; trip sort ตรงยอดแสดง; line rename ไปชนหมวดเดิมไม่ overwrite โดยไม่แจ้ง; pending/custom thresholds/settings ที่ระบุ supported มี test

**ผลใน working tree:** เพิ่ม budget selectors กลางสำหรับ line categories, explicit total/zero และ alert thresholds; monthly budget usage รองรับหลายหมวดและใช้ `includePendingInMonthlyTotals` เดียวกับ totals; แก้ trip planned budget ไม่ fallback เมื่อวงเงินที่บันทึกเป็นศูนย์ และให้ `budget-desc` เรียงจาก selector เดียวกับยอดที่แสดง. การแก้ budget หลาย line เก็บรายการย่อยเดิมไว้ พร้อม validation กัน category collision และแสดงคำเตือนใน form. `defaultView` จาก settings ถูกใช้เป็นค่าเริ่มต้นหลังโหลดข้อมูล โดย URL view ที่ถูกต้องยัง override ได้; `monthStartsOn: 0` ถูกเก็บตามค่าเดิมและ recurringRules/goal links ยังคงเป็น reserved fields

**ผลการทดสอบ:** เพิ่ม regression สำหรับ multi-line usage/edit preservation, pending budget policy, explicit zero, custom thresholds, trip line status/sort และ defaultView/settings normalization; `npm test`, `npm run lint`, `npm run build` และ `git diff --check` ผ่าน (build ยังคงมีคำเตือน bundle ใหญ่ตาม baseline)

**Dependency:** PR-05, PR-07 · **เกี่ยวข้อง:** F09, F11

## Phase 3 — Schema cleanup แบบมี migration

### PR-09 · ตัด aliases และ versioned canonical DTO · L · เสร็จแล้ว

ทำ field-by-field migration ตาม schema design เริ่ม collection aliases, categoryId, installment aliases, goal kind และ metadata/config ownership; เปลี่ยน consumer ให้ compile ไม่ได้เมื่ออ่านชื่อเก่า เก็บ legacy types เฉพาะ migration boundary

เพิ่ม serializer ที่ระบุ fields ชัด แก้ documentDataWithId ให้ document path เป็น identity ตาม contract: ปัจจุบัน `{ id: fallback, ...data }` สามารถถูก raw data.id ทับอีกครั้ง หาก mismatch ให้ report/block ตาม policy ไม่สร้าง ID ใหม่แล้วลบเอกสารเก่าเงียบๆ

**เกณฑ์จบ:** canonical export/Firestore DTO ไม่มี aliases; version read/write ตรงกัน; conflicting legacy fields ไม่ถูกเลือกเงียบ; normalize ไม่มี random repair; old clients ไม่เขียนทับ version ใหม่

**ผลใน working tree:** runtime `FinanceData` ใช้ `transactions`/`installmentPlans` เป็น collection เดียวและย้าย seed/provider/monthly/sync consumers ออกจาก aliases. `createExportableFinanceData` ใช้ explicit canonical serializers: transaction/recurring rule ใช้ `categoryId`, installment ใช้ `installmentCount`/`paidMonthKeys`/`balanceSnapshot`, trip item ใช้ `categoryId`/`installmentPlanId`, budget ใช้ `categoryId` และ goal ใช้ `kind`; derived `monthKey` และ field aliases ไม่ถูกเขียนลง JSON หรือ Firestore. `schemaVersion` อยู่ที่ envelope และ `meta` ส่วน settings เป็น config เท่านั้น. Migration ตรวจ collection/field/version conflicts ก่อนเลือกค่า, split monthly multi-line budgets เป็น records ด้วย ID deterministic, และ fallback ID deterministic ไม่สุ่ม. Firestore document identity ตรวจ mismatch แล้ว block และเขียน `id` จาก path เสมอ พร้อม guard ไม่ให้ writer รุ่นนี้ downgrade root schema ที่ใหม่กว่า

**ผลการทดสอบ:** เพิ่ม canonical export/import round-trip, alias conflict, deterministic ID, monthly budget split และ Firestore document identity tests; `npm test`, `npm run lint`, `npm run build` ผ่าน (build ยังมีคำเตือน bundle ใหญ่ตาม baseline)

**ข้อจำกัด:** record aliases ยังถูกอ่านใน migration boundary และคงไว้ใน normalized installment/transaction types เพื่อให้หน้าเดิมทำงานต่อ; serializer/Firestore boundary ไม่ปล่อย aliases แล้ว. การย้าย nested trip money items เป็น canonical transactions ทำใน PR-10 แล้ว และ PR-11 แยก command/ledger adapter สำเร็จ; การตัด field aliases จาก UI form models และการเลิกใช้ nested read model ยังเป็นงานต่อเนื่อง

**Dependency:** Phase 1–2 ผ่าน และ migration fixtures/report พร้อม · **เกี่ยวข้อง:** F05, F11, F13

### PR-10 · Trip transaction ownership และ money units · L · เสร็จแล้ว

เปลี่ยน nested trip money items เป็น canonical transactions พร้อม source mapping และ travel details ตาม schema design หลัง ledger selector เสถียร แยก money minor-unit conversion เป็น PR/release ย่อยอีกครั้งถ้าผลกระทบกว้าง ห้ามรวมการเปลี่ยน meaning ของ snapshot, trip expense และ rounding ทั้งหมดในครั้งเดียว

**เกณฑ์จบ:** reconciliation report อธิบายทุก row ที่ย้าย/รวม/ตัด; ไม่มี orphan หรือยอดหาย; trip cost/cashflow policy fixtures ผ่าน; integer conversion round-trip ผ่าน; dry-run/recovery ผ่านก่อนข้อมูลจริง

**ผลใน working tree:** migration เพิ่ม `migrateFinanceDataWithReport` พร้อม report สำหรับ transaction ที่สร้าง/นำกลับมาใช้, duplicate source, field mismatch และ orphan reference. Nested trip items ถูก materialize เป็น transaction เจ้าของด้วย `tripId`/`sourceRefId`, `travelDetails` และ `installmentPlanId`; CRUD reconciliation สร้าง/แก้/ลบ transaction ตาม item เดียวกัน. Trip export/Firestore ไม่เก็บ money items ซ้ำ และ migration จะ hydrate เป็น read model เฉพาะตอน load/import. กำหนด policy ว่า trip transaction เป็น purchase cost ส่วน cashflow ใช้ installment occurrence เมื่ออ้างอิงแผนที่รู้จัก. เพิ่ม `money.ts` สำหรับแปลง major ↔ integer minor units แบบตรวจ precision, safe integer และ explicit half-up rounding

**ผลการทดสอบ:** เพิ่ม migration reconciliation/round-trip/orphan tests, canonical trip ledger policy fixture และ money precision/rounding tests; `npm test`, `npm run lint`, `npm run build` ผ่าน (build ยังคงมีคำเตือน bundle ใหญ่ตาม baseline)

**ข้อจำกัด:** ข้อมูลปัจจุบันยังเก็บจำนวนเงินเป็นหน่วย major เดิมเพื่อไม่เปลี่ยน semantics โดยอัตโนมัติ; การ rollout field `amountMinor` จริงต้องทำ dry-run/recovery กับ production backup และแยก release. Trip UI ยังแสดง hydrated nested items เป็น compatibility read model แต่ command และ ledger ownership ใช้ transaction เป็น source หลักแล้ว

**Dependency:** PR-09 และตัดสิน semantics ที่ยังเปิดอยู่ · **เกี่ยวข้อง:** F02, F06, F09

## Phase 4 — Refactor โค้ดและคุณภาพการใช้งาน

### PR-11 · แยก state/commands/selectors และลดงานคำนวณ · M · เสร็จแล้ว

ลด provider เหลือ lifecycle/composition; ย้าย CRUD/invariants ไป domain commands; จำกัด raw setData; แยก installment utilities ตาม schedule/payment/progress/filter/form ที่มีความรับผิดชอบชัด ไม่แยกเป็นไฟล์ย่อยเพียงเพราะจำนวนบรรทัด

รักษา referential identity ของ collection ที่ไม่เปลี่ยน, derive schedule ครั้งเดียวต่อ plan/range และใช้ memoization ตาม input จริง แยก Context เฉพาะเมื่อวัดพบ render churn

**เกณฑ์จบ:** behavior/tests เดิมไม่เปลี่ยน; benchmark fixture เดียวกันก่อน/หลังแสดงเวลาคำนวณและจำนวน render ลดลง; ไม่มี migration/network side effect ใน selector

**ผลใน working tree:** ย้าย mutation ของ transaction, installment, trip, budget และ goal ไปที่ `src/state/financeCommands.ts`; provider เหลือ lifecycle/status composition และไม่ expose raw `setData`. Commands ป้องกันการ override `id`, timestamps และ transaction foreign keys พร้อมรักษา reference ของ collection ที่ไม่เปลี่ยน. แยก schedule arithmetic ไป `installmentSchedule.ts`; เพิ่ม range derivation ที่คำนวณ schedule ต่อ plan ครั้งเดียวและ memoized ledger selector ที่ invalidate ตาม collection references/range จริง. Installments page ใช้ dashboard metrics ชุดเดียวกับ filter counts เพื่อลดการคำนวณซ้ำ

**ผลการทดสอบ:** เพิ่ม command identity/invariant tests, memoized selector identity tests และ benchmark fixture ที่แสดง schedule lookups จาก `plans × months` เหลือ `plans` พร้อมนับ recomputation ของ selector; `npm test`, `npm run lint`, `npm run build` และ `git diff --check` ผ่าน (build ยังคงมีคำเตือน bundle ใหญ่ตาม baseline)

**ข้อจำกัด:** Trip detail ยังใช้ hydrated `Trip.items` เป็น compatibility read model สำหรับการแสดงผลและ form แต่ทุก add/update/delete ผ่าน command ที่ reconcile transaction owner แล้ว. การตรวจ workflow และ bundle splitting ทำต่อใน PR-12 และมีข้อจำกัดด้าน mobile/live Cloud ระบุไว้ในผลการตรวจของ PR-12

**Dependency:** PR-07, PR-09; ownership ที่ยังเปลี่ยนต้องมี adapter ชัด · **เกี่ยวข้อง:** F13

### PR-12 · UI verification, bundle และเอกสาร · S/M · เสร็จแล้ว

ตรวจ workflow หลักบน desktop และ production preview: Monthly quick add/add/edit/filter, Yearly drilldown, Installment list/table/calendar/schedule, Trip create/detail/item/budget/calendar, Budget/Goal และ More import/export/sync/demo; บันทึก mobile/device acceptance ที่ยังต้องทำต่อเมื่อมี viewport ที่รองรับ

ทำ lazy loading ของ feature ที่ไม่ต้องอยู่ initial route ตามผลวัด อัปเดต README/context/checklist และลิงก์ที่เสีย ไม่ใช้การเพิ่ม warning threshold เป็นการแก้ performance

**เกณฑ์จบ:** lint/test/build ผ่าน, smoke/E2E ผ่าน, มี before/after screenshots เมื่อ UI เปลี่ยน, บันทึก initial bundle/load เทียบ baseline และเอกสารอธิบายระบบจริง

**ผลใน working tree:** เปลี่ยน page imports ใน `src/App.tsx` เป็น lazy chunks พร้อม Suspense fallback; เพิ่ม `src/lib/id.ts` ให้การสร้าง id ใช้ `randomUUID`, `getRandomValues` หรือ fallback ที่ไม่ทำให้ browser เก่าล้ม; ตรวจ dev และ production preview ด้วยโหมด `?demo=true` ครบ Monthly quick-add/add/edit/filter, Yearly drilldown, Installment card/table/calendar/schedule, Trip create/detail/item/budget/calendar, Monthly budget/goal และ More export/import preview/demo sync/technical disclosure. Initial chunk ลดจาก 909,287 เป็นประมาณ 623,670 bytes และ gzip ลดจากประมาณ 246.20 เป็น 190.08 kB

**ผลการทดสอบ:** `npm test`, `npm run lint`, `npm run build` และ `git diff --check` ผ่าน; production preview ทุก route ไม่มี console error และไม่พบ horizontal overflow ที่ viewport 1280×720. เพิ่ม regression test สำหรับ browser ที่ไม่มี `crypto.randomUUID`

**ข้อจำกัด:** browser backend ของการตรวจรอบนี้ไม่มี viewport override จึงยังไม่ยืนยัน mobile 390–430 px; live smoke ยืนยันเฉพาะ bootstrap/load/save ชุดข้อมูลว่าง ส่วน non-empty Firestore multi-device sync และ settlement/delete ที่เป็น side effect ต้องทำบน browser/device หรือ test project ที่เหมาะสมก่อน release

**Dependency:** ฟีเจอร์ที่เปลี่ยนผ่าน acceptance tests แล้ว · **เกี่ยวข้อง:** F13

### P1 follow-up · Cloud baseline และ reconciliation review · เสร็จแล้ว

แยก `baselineData` ที่สะท้อนเอกสาร Firestore จริงออกจาก runtime data ที่ hydrate `trip.items[]` เป็น read model และปรับ sync fingerprint ให้ไม่นับ read model ซ้ำ จึงไม่ทำให้ transaction ที่ materialize จาก nested trip item ถูกมองว่าเป็น baseline แล้วหายไปจาก save รอบถัดไป

ขยาย reconciliation issue ให้เก็บ snapshot ของ nested item กับ transaction owner, แสดงรายละเอียดทั้งสองฝั่งใน More และบล็อก save/autosave จนกว่าจะกดรับทราบอย่างชัดเจน รายงานจะไม่ถูกล้างโดย `replaceData` หลัง save โดยอัตโนมัติ

**ผลการทดสอบ:** เพิ่ม regression สำหรับ persisted baseline, fingerprint ที่ไม่รวม trip read model และ snapshot mismatch; `npm test`, `npm run lint`, `npm run build` และ `git diff --check` ผ่าน

## Test matrix ที่ต้องเพิ่ม

| ชั้น | Cases สำคัญ | เป้าหมาย |
| --- | --- | --- |
| Migration/validation | null/primitive/root ผิด, future version, duplicate ID, aliases ขัดกัน, invalid month/date, negative/nonfinite/precision money | ไม่แก้ข้อมูลเงียบ; errors มี entity/field path |
| Migration round-trip | v1/v2 → target, target → target, export/import, missing IDs mapping, trip hydration/delete | ID/ยอด/relation เสถียร ไม่มี resurrection |
| Installment domain | zero/one/large count, explicit empty paid keys, sparse paid months, settle/unpay, snapshot, due 31/February, overdue ข้ามปี | balance/schedule/status สอดคล้อง |
| Ledger | manual linked trip, orphan plan, imported copies, trip installment/down payment, income/pending, 12-month parity | เหตุการณ์ครบและไม่ซ้ำ |
| Filters/forms | ไม่เกิน/เกิน/ต่ำกว่า boundary, month keyword, reversed range, template วันที่ 31 ไปเดือนสั้น | กรองตรงความหมายและไม่สร้างวันที่ผิด |
| Budget/Goal | multi-line legacy, amount ≠ lines, zero limit, duplicate category, disabled, custom threshold, manual goal progress/status | ไม่สูญ lines และ semantics ชัด |
| State/commands | add/edit/delete compound relations, protected id/createdAt, import failure | state atomic และรักษา references |
| Sync hook/coordinator | fake timer debounce, deferred request, edit while saving, double manual save, load dirty, retry, unmount/logout | pending edits ไม่หายและ status ไม่โกหก |
| Repository/emulator | two clients, revision conflict, delete tombstone, partial bulk import, identity mismatch, per-user rules | ไม่ overwrite ข้าม client/tenant และไม่เผยครึ่งชุด |
| UI/E2E | full feature workflows, error recovery, demo exit, mobile modal/calendar | ตรวจ wiring ที่ pure unit tests จับไม่ได้ |

เพิ่ม tests พร้อม bug fix หรือก่อน fix ที่ทำให้แดงได้ ไม่สร้าง test ที่เพียงคัดสูตร implementation มาคำนวณ expected ผลลัพธ์เอง ใช้ตัวเลขคาดหมายที่กำหนดจาก scenario และ invariant

## Release gates

- ทุก PR ที่แตะ runtime: lint/test/build และ focused regression tests ผ่าน; บันทึกข้อจำกัดหาก environment ไม่รองรับ emulator/browser
- ก่อน release sync: two-client conflict และ failure recovery ต้องผ่าน ไม่ใช้ unit tests อย่างเดียวรับรองการรักษาข้อมูล
- ก่อน release schema: backup, dry-run reconciliation, supported reader/writer version, staged rollout และ rollback rehearsal ครบ
- ห้าม commit `.env.local`, credential, finance exports, node_modules หรือ dist
- แผนเสร็จเมื่อ F01–F12 ถูกแก้หรือมีข้อกำหนดรองรับพร้อม tests, canonical schema ไม่มี aliases ซ้ำ และใช้งานจริงผ่าน acceptance matrix; F13 performance ให้มีผลวัดก่อน/หลัง

## งานที่ไม่ควรแทรกเข้ามาโดยปริยาย

ยังไม่จำเป็นต้องเพิ่ม multi-currency, full accounting/double-entry, partial-payment engine, recurring scheduler, state library ใหม่ หรือ rewrite UI ทั้งระบบ งานเหล่านี้ต้องมี use case และ acceptance criteria แยกต่างหาก เพื่อให้รอบนี้จบที่บั๊ก/ข้อมูลซ้ำที่พบจริง
