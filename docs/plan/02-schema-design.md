# Schema เป้าหมายและแผน migration

เอกสารนี้เป็น schema เป้าหมายและบันทึกผล migration ที่เริ่มใช้งานใน PR-09/10 แล้ว โดยการย้าย ownership ของ trip expense เสร็จใน PR-10 ส่วนการเปลี่ยนหน่วยเงินในข้อมูล production ยังแยกเป็น release ที่ต้อง dry-run เพื่อให้เทียบยอดได้

## ปัญหาเชิงโครงสร้าง

`src/types/finance.ts` และ runtime ใช้ canonical collection names แล้ว ส่วน legacy field aliases ยังรับเฉพาะที่ migration boundary เพื่อรองรับ backup เดิม `normalizeFinanceData` จึงไม่ hydrate trip และไม่เขียน collection aliases ซ้ำ

`createExportableFinanceData` และ Firestore repository ใช้ explicit serializers ทำให้ collection และ field aliases ไม่ถูกส่งขึ้น Cloud; consumer เดิมยังอ่าน normalized compatibility fields บางส่วนจนกว่าจะย้าย form models ใน PR-11. PR-11 แยก mutation commands และ memoized selectors ออกจาก provider แล้ว โดย selectors ไม่เรียก migration หรือ network

## ตารางจัดระเบียบฟิลด์

| ปัจจุบัน | ข้อเสนอ | การจัดการข้อมูลเดิม |
| --- | --- | --- |
| `entries` / `transactions` | ใช้ `transactions` ใน domain และ storage | legacy reader รับ entries; ถ้าทั้งคู่มีและต่างกันให้รายงาน conflict ไม่เลือกเงียบ; runtime ไม่มี alias |
| `installments` / `installmentPlans` | ใช้ `installmentPlans` | legacy reader รับ installments; runtime และ Firestore ไม่มี alias |
| `category` / `categoryId` | entity เก็บ `categoryId`; label อ่านจาก masters | แปลง alias ภาษาเก่าที่ boundary เท่านั้น; unknown category ต้องรักษา identity |
| `date` / `monthKey` | date เป็นค่าเก็บ; monthKey derive | ถ้าต้องใช้ Firestore query index ให้ monthKey เป็น field ที่ serializer สร้างและตรวจ ไม่รับแก้อิสระ |
| `installmentId` / `installmentPlanId` | ใช้ `installmentPlanId` | conflict ระหว่างสองค่าเป็น migration issue |
| `source`, `sourceModule`, `sourceRefId` | แยก provenance กับ domain relation | provenance บอกช่องทางสร้าง; trip/plan relation ไม่ใช้เป็นตัวบอกว่าต้องซ่อนจาก ledger |
| `monthlyAmount` / `paymentAmount` | `paymentAmountMinor` เมื่อผ่านขั้น money migration | ช่วงแรกใช้ชื่อเดียว `monthlyAmount`; ตรวจ conflict ก่อนเลือกค่า |
| `monthsTotal` / `totalMonths` / `installmentCount` | `installmentCount` | positive integer มีขอบเขต; ห้าม allocate schedule ใหญ่ผิดปกติโดยไม่ validate |
| `monthsPaid` / `paidMonths` / `paidMonthKeys` | paidMonthKeys เป็น source สำหรับโมเดลจ่ายเต็มงวดปัจจุบัน | count derive; legacy count แปลงเป็นงวดต้นๆ พร้อมบันทึกว่าเป็น assumption; empty array ต่างจาก missing |
| `dueDay` / `paymentDay` | `dueDay` | เลือก default เดียวทั้งทุกหน้า หรือ null = ยังไม่ระบุและไม่แสดง overdue แบบเดาวัน |
| `principal` / `principalAmount` | `principalAmountMinor` | ห้ามปน principal กับ contractual total; ถ้าขัดกันต้อง review |
| `remainingOverride` / `balanceSnapshotAmount` / `balanceSnapshotMonth` | `balanceSnapshot: { amountMinor, asOfMonth, basis } \| null` | snapshot เป็นข้อมูลยอด ณ เวลา ไม่ใช่ calculated remaining ที่ freeze ตลอดไป |
| `Trip.items[]` / imported trip transactions | ใช้ transaction เป็นเจ้าของรายจ่ายทริป | PR-10 map `tripId`/`sourceRefId`, dedup และรายงาน mismatch; export/Firestore ตัด nested money items และ runtime hydrate เป็น read model ชั่วคราว |
| `Trip.budget` / trip Budget.amount / lines total | แยก `totalLimitMinor` กับ allocated total ที่ derive | ไม่ถือว่าเท่ากันโดยอัตโนมัติ; รักษาค่าวงเงินที่ต่างจากผลรวม lines |
| monthly Budget.category/amount + lines | monthly budget หนึ่งหมวดต่อหนึ่ง record | split multi-line legacy budget เป็น records พร้อม mapping; parent total ต่างจาก lines เป็น conflict |
| `Goal.type` / `Goal.kind` | ใช้ `kind: savings` ชื่อเดียว | preserve currentAmount แบบ manual จนกว่าจะมี contribution model ที่ตกลงแล้ว |
| profile/settings currency, locale, timezone | settings เป็นเจ้าของ configuration; profile เป็น identity/display | phase แรกคง THB/th-TH/Asia-Bangkok ตามระบบที่รองรับ ไม่เพิ่ม multi-currency โดยปริยาย |
| schemaVersion ใน root/settings และ Firestore | envelope มี version เดียว; storage มี metadata ที่สอดคล้อง | runtime ไม่เดา version จาก optional settings; importer รองรับ legacy lookup แบบชัดเจน |

ผล PR-09/10: repository เขียน version ใน user root และ `meta` ให้ตรงกัน ส่วน settings ไม่เก็บ version แล้ว; reader ยังอ่าน root/meta/settings ตามลำดับเพื่อรองรับ backup รุ่นเก่า และจะหยุดเมื่อพบค่าขัดแย้ง. Trip money items ถูกย้ายเป็น transaction owner ตอน migration และ nested `Trip.items` เหลือ read model ชั่วคราวเท่านั้น

## แยก DTO กับ domain model

แนะนำโครงสร้างต่อไปนี้ โดยเพิ่มเท่าที่จำเป็นในแต่ละ PR:

```text
src/types/finance.ts                   # re-export domain types ช่วงเปลี่ยนผ่าน
src/types/transactions.ts
src/types/installments.ts
src/types/trips.ts
src/types/budgets.ts
src/types/goals.ts
src/lib/validation/                   # parse/validate วันที่ เงิน ID และ references
src/lib/migrations/                   # legacy DTO และ versioned pure migration
src/services/financeRepository.ts     # interface; domain ไม่ import Firebase
src/services/firebase/                # DTO serializers และ Firestore implementation
src/state/financeCommands.ts          # validated atomic domain commands
src/state/FinanceDataProvider.tsx     # composition/lifecycle/context
src/features/monthly/utils/ledger.ts  # shared ledger selector หรือ src/lib/ledger/ เมื่อใช้ข้ามฟีเจอร์
```

Legacy DTO อนุญาต aliases ได้ แต่ canonical domain type ไม่ควรมี aliases optional ซ้อนอยู่ทุก entity การ add/update ผ่าน commands ต้องไม่รับ `Partial<Entity>` ที่แก้ `id`, `createdAt` หรือ foreign key โดยไม่ตรวจ

ไม่ต้องเพิ่ม global state library ใหม่เพื่อทำงานนี้ เริ่มจาก reducer/commands และ memoized selectors ที่มีอยู่ได้

## Ownership ของรายจ่ายและ ledger

### ระยะ A: ทำโมเดลปัจจุบันให้ถูกก่อน

เก็บ manual transactions, trip items และ installment plans เป็นแหล่งข้อมูลที่มีเจ้าของชัด หยุด hydrate ใน runtime และสร้าง `selectLedgerRows(data, effectiveRange, policy)` ร่วมกันทุกหน้า

Row สำหรับแสดงผลต้องแยกชนิด:

```ts
type LedgerOrigin =
  | { kind: 'transaction'; transactionId: string }
  | { kind: 'trip-item'; tripId: string; itemId: string }
  | { kind: 'installment-occurrence'; planId: string; month: string }
```

Derived rows เป็น read model ไม่ส่งกลับไป normalize เป็น persisted transactions และไม่แก้ด้วย transaction CRUD การแก้จ่ายต้อง dispatch ไปเจ้าของจริงหรือพาไปฟีเจอร์ต้นทาง UI ปัจจุบันมีการจำกัด action ของ derived rows อยู่แล้ว ให้คงข้อจำกัดจน command routing รองรับครบ

### ระยะ B: ให้รายจ่ายทริปใช้ transaction เป็นข้อมูลหลัก

ย้ายฟิลด์ item ไป transaction ที่มี `tripId` และ optional `travelDetails` (destination/country) ให้ Trip เก็บข้อมูลการเดินทาง ไม่มี money items ซ้ำ ทุกรายจ่ายที่บันทึกเป็นเหตุการณ์เดียวกันมี ID เดียว

Installment occurrence ยังคง derive จาก plan สำหรับระบบปัจจุบัน และมี key `(planId, month)` ที่เสถียร ไม่สร้าง payment transactions ถาวรเพิ่มโดยไม่มี need หากภายหลังรองรับ partial payment/refund/actual payment date ค่อยออกแบบ payment events เป็นอีกโครงการ ไม่ควรขยาย scope ครั้งนี้โดยอัตโนมัติ

สำหรับ transaction ที่เป็นต้นทุนทริปแต่ชำระผ่านผ่อน ให้ใช้ explicit payment relation/recognition policy ตามการตัดสินใน F06: trip-cost selector นับราคาซื้อ; cashflow selector นับงวดและเงินดาวน์ตามข้อมูลจริง ห้ามคาดเดาจาก amount/title ที่คล้ายกัน

### Relation และ deletion

| Entity ที่ลบ | นโยบายเสนอ |
| --- | --- |
| Trip | UI แยก “ลบทริปและรายจ่ายที่เป็นของทริป” กับ “เก็บรายจ่ายแล้วถอด tripId”; ระยะ A ใช้ policy เดิมที่ลบ owned items แต่จัดการ legacy references ด้วย |
| InstallmentPlan | เตือนผลกระทบของ schedule และ linked trip costs; ไม่ลบ financial transaction อิสระ; block หรือ detach reference ตาม command ที่กำหนด |
| Category | archive เพื่อรักษาประวัติ; ห้าม hard delete เมื่อมี references |
| Goal | preserve transactions ที่เกี่ยวข้องแล้ว detach goalId หากยังไม่มี contribution ledger |
| Budget | ไม่ลบ expense; ใช้ explicit delete ID และ revision |

ทุก multi-entity command ต้อง validate ก่อน apply และเกิดเป็น state transition เดียว การ persistence ต้องรักษาความสอดคล้องของ command เดียวกันด้วย

## Budget model

ใช้ discriminated union เพื่อไม่ให้ monthly budget มี tripId หรือ trip budget ขาด tripId:

```ts
type BudgetScopeData =
  | { scope: 'monthly'; month: MonthKey; categoryId: CategoryId; limitMinor: number }
  | {
      scope: 'trip'
      tripId: string
      totalLimitMinor: number | null
      lines: Array<{ id: string; categoryId: CategoryId; limitMinor: number }>
    }
```

ตัวอย่างนี้เป็นส่วน business fields ยังต้องประกอบ id/timestamps/revision/enabled/thresholds ใน implementation

Trip allocated total = ผลรวม lines; overall limit = explicit totalLimit เมื่อมีค่า รวม 0 ด้วย มิฉะนั้น derive จาก allocated total ทำให้แสดง “วงเงินรวม” กับ “จัดสรรแล้ว” แยกกันได้ `alertThresholds` ต้องมี validation และ selector ใช้ค่าจริง ถ้าไม่รองรับ custom thresholds ให้ deprecate อย่างเปิดเผย

Uniqueness: monthly `(month, categoryId)`; trip budget ต่อ trip หนึ่งชุด; categoryId ใน trip lines ไม่ซ้ำ กำหนด merge policy ก่อนเปลี่ยนหมวดไปชน line ที่มีอยู่

### Supported settings contract (PR-08)

- `includePendingInMonthlyTotals` เป็น setting ที่รองรับ: totals, monthly budget progress และ budget alerts ใช้ค่าเดียวกัน
- `defaultView` เป็น setting ที่รองรับ: ใช้เป็นค่าเริ่มต้นหลัง load ข้อมูล และค่า `view` ใน URL ที่ถูกต้องมี priority สูงกว่า
- `monthStartsOn` ยังเป็น reserved field เพราะยังไม่มี calendar/accounting consumer; ต้อง preserve ค่าเดิม (รวม `0`) ที่ migration boundary ไม่ตีความเพิ่ม
- `recurringRules`, `goalId`/`linkedCategoryId` และการตั้งค่า locale/currency/timezone แบบ custom เป็น preserve-for-import/reserved จนกว่าจะมี scheduler, contribution model หรือ formatter contract รองรับ

## เงิน วันที่ และ enums

- Date-only ใช้ `YYYY-MM-DD` และตรวจวันจริงด้วย round-trip; ไม่ใช้ Date.parse เพียงอย่างเดียว
- MonthKey ตรวจ 01–12; ช่วงปีและจำนวนเดือน/schedule ต้องจำกัดเพื่อป้องกันข้อมูลผิดทำให้ array ใหญ่หรือ loop ไม่จบ
- dueDate/month arithmetic ใช้ฟังก์ชันเดียว; timezone ของ “วันนี้” ต้องสอดคล้องกับ setting ที่รองรับ
- เงินระยะเริ่มต้น validate finite/nonnegative และกำหนด precision; ระยะเปลี่ยน schema ใช้ integer minor units (สตางค์) พร้อม safe-integer bounds
- การ migrate บาท → สตางค์ต้องตรวจทศนิยมเกิน 2 ตำแหน่งและรายงาน rounding ไม่ใช้ Number * 100 แล้วคาดว่าถูกเสมอ; ห้าม migrate สองครั้ง
- คง enum status ที่ supported; provenance ไม่ใช่ status ของการจ่าย และไม่ซ้ำ sourceModule อิสระ
- ทำ counts/totals/progress เป็น derived data; snapshot ที่เป็น historical fact ต้องตั้งชื่อและ as-of ชัดเจน

## Migration และ rollout

1. **สำรวจและสำรอง:** ใช้ fixture สังเคราะห์/anonymous; เก็บ raw input สำหรับ recovery นอก repository; ทำ count/sum/reference report ก่อนเปลี่ยน
2. **Version dispatch:** แยก legacy/no-version, v2, target version และ unsupported version; target version ต้อง reject unknown future version
3. **Alias cleanup:** เสนอ v3 สำหรับ canonical fields และ validation โดยยังไม่รวม ownership/money migration ทุกอย่างในครั้งเดียว หาก scope เปลี่ยนให้ประกาศ version contract ก่อนเขียน
4. **Conflict report:** ถ้าชื่อเก่า/ใหม่ต่างกัน, duplicate ID, duplicate budget, orphan relation หรือยอดไม่ตรง ให้หยุดรายการนั้นหรือให้ review ไม่ auto-merge จากชื่อและยอด
5. **Deterministic transform:** ID เดิมคงเดิม; ID ใหม่ derive จาก source identity หรือ persisted mapping; timestamp ไม่ใช้เวลาปัจจุบันทุกครั้ง migration ต้อง reproducible ด้วย context คงที่
6. **Ownership/money migration:** ใช้ version ถัดไปแยกจาก alias cleanup; trip item และ transaction ที่อ้างถึงกัน map เป็นหนึ่ง record พร้อม metadata ครบ ถ้าคนละเวอร์ชันของเหตุการณ์ resolve ตามหลักฐานหรือส่ง review
7. **Reconciliation:** เทียบ raw/canonical counts, ยอดตาม type/month, trip cost, paid/pending, schedule count, budget limits และ orphan refs โดยนับการย้าย representation ตาม mapping ไม่เปรียบเทียบ raw array count ตรงๆ
8. **Dry run/preview:** ผู้ใช้เห็นรายการเพิ่ม/เปลี่ยน/ตัดออกและเหตุผล พร้อม backup reference ก่อน commit
9. **Persist safely:** small ordinary command ใช้ guarded writes; large import/migration stage ใน dataset generation ใหม่ ตรวจครบก่อนสลับ active generation ไม่เผยข้อมูลครึ่งชุด
10. **Compatibility:** ห้าม client v2 เขียนทับ v3/v4; มี minimum writer version/read-only compatibility path และ deployment plan ที่ป้องกัน tab เก่า
11. **Rollback:** ก่อนสลับ generation ยกเลิก staging ได้; หลังสลับใช้ backup/previous generation ผ่าน recovery command ที่ตรวจ revision ไม่ downgrade โดยรัน reverse normalizer หากมี edits ใหม่ต้อง export/preserve edits ก่อน rollback

ข้อเสนอ generation ใช้กับ bulk replacement ไม่จำเป็นต้องย้ายทุก autosave เป็น snapshot generation หรือทำ rewrite repository ใหญ่ใน PR แรก

## Invariants ที่ต้องทดสอบ

- Canonical data ไม่มี alias fields และ normalize/validate ไม่สร้าง entity ใหม่
- IDs unique ต่อ collection; document path ID ตรงกับ entity ID
- Reference ถูกต้องหรือถูกแยกเป็น unresolved issue ที่ UI เห็น ไม่มีการซ่อน transaction ทิ้ง
- `paidMonthKeys` unique และอยู่ใน schedule; monthsPaid derive เท่านั้น
- วันที่/เงินทุกค่า valid และ supported schema version ชัดเจน
- Ledger row มี origin/key เดียว เหตุการณ์เดียวไม่ถูกนับซ้ำจากหลาย representation
- Monthly aggregate 12 เดือนเท่ากับ Yearly เมื่อ range และ pending policy เหมือนกัน
- Export → import รักษาค่าธุรกิจ; export timestamp เปลี่ยนได้ แต่ไม่ถือว่าเป็น business mutation
- Migration target → target ไม่เปลี่ยน entity IDs/ยอด/relations และ delete ไม่คืนชีพ
