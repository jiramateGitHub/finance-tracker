# แผนปรับปรุง Finance Tracker

ความคืบหน้าปัจจุบัน: Phase 0–4 / PR-01 ถึง PR-12 เสร็จแล้วใน working tree — เพิ่ม test baseline, revision guard สำหรับ Cloud writes, แยก ordinary save ออกจาก explicit dataset replacement, แก้ trip migration/ledger ownership, installment balance/due date, import validation/recovery, sync lifecycle/demo isolation, shared ledger selector, budget/settings selectors, canonical DTO/alias migration, transaction-backed trip ownership, pure domain commands/memoized selectors และ UI smoke/lazy loading

วันที่ตรวจ: 2026-09-13 · ขอบเขต: วิเคราะห์โค้ดและลงมือแก้ PR-01 ถึง PR-12 ใน working tree ยังไม่ได้ migrate ข้อมูล production; PR-12 เพิ่ม live Auth/Firestore smoke ด้วยบัญชีที่ผู้ใช้ระบุและชุดข้อมูลว่าง

## ข้อสรุป

ควรเริ่มจากความถูกต้องและการรักษาข้อมูลก่อนปรับโครงสร้าง UI ปัญหาหลักคือ migration ทำงานซ้ำในทุก mutation, ข้อมูลเดียวกันมีหลาย representation และ Cloud save ใช้ snapshot ทั้งชุดเพื่อเขียนทับ/ลบข้อมูล โดยยังไม่มี conflict control

โครงสร้าง `src/features/` และ pure utility ที่มีอยู่เป็นพื้นฐานที่ใช้ต่อได้ ไม่จำเป็นต้อง rewrite แอป เป้าหมายคือทำให้แต่ละข้อมูลมีเจ้าของชัดเจน และใช้กฎคำนวณเดียวกันใน Monthly, Yearly, Trips และ Installments

## เอกสารในชุดนี้

| เอกสาร | เนื้อหา |
| --- | --- |
| [01-findings.md](01-findings.md) | บั๊ก หลักฐาน เส้นทางที่เกิด ผลกระทบ และสิ่งที่ยังต้องพิสูจน์ |
| [02-schema-design.md](02-schema-design.md) | ฟิลด์ซ้ำ schema เป้าหมาย invariants และแผน migration/rollback |
| [03-roadmap.md](03-roadmap.md) | ลำดับ PR, dependency, acceptance criteria และ test matrix |

## ลำดับที่แนะนำ

1. ทำ test runner ให้รันซ้ำได้ และเพิ่ม regression tests ของบั๊กที่พบ — เสร็จแล้วบางส่วนใน PR-01
2. ป้องกัน Cloud overwrite/conflict และแยก import replacement ออกจาก autosave ปกติ — เสร็จแล้วใน PR-02; มี local two-client contract test แล้ว และยังต้องรัน integration บน emulator/test project
3. แก้ trip resurrection และ linked ledger records — เสร็จแล้วใน PR-03
4. แก้ installment balance และ due date — เสร็จแล้วใน PR-04
5. แก้ import validation และ monthly search — เสร็จแล้วใน PR-05
6. รวม sync lifecycle และ demo isolation — เสร็จแล้วใน PR-06
7. รวม ledger selector และ date/money utilities ก่อนเปลี่ยน schema — เสร็จแล้วใน PR-07
8. รวม budget selectors และกำหนด supported/reserved settings — เสร็จแล้วใน PR-08
9. ตัด aliases ที่ซ้ำความหมาย แล้วค่อยเปลี่ยน ownership ของรายการทริปพร้อม migration ที่ตรวจยอดได้ — เสร็จแล้วใน PR-09 สำหรับ DTO/export/persistence boundary
10. ย้าย ownership รายการทริปและเตรียม money minor-unit conversion — เสร็จแล้วใน PR-10; production rollout ของ amountMinor ยังต้อง dry-run แยก
11. แยก state/domain/persistence, ปรับ performance และอัปเดตเอกสารเดิม — เสร็จแล้วใน PR-11
12. ตรวจ UI workflow, แก้ runtime browser gaps, ทำ lazy loading และบันทึก bundle evidence — เสร็จแล้วใน PR-12; mobile viewport และ non-empty multi-device Cloud ต้องตรวจบน browser/device จริงที่รองรับ

รายละเอียดระดับ PR และเกณฑ์จบแต่ละช่วงอยู่ใน roadmap ไม่ควรรวมทั้งหมดเป็น PR ใหญ่ครั้งเดียว

## สถานะหลักฐาน

- **ยืนยันด้วยเคสจำลอง:** เรียกฟังก์ชันจริงจากโปรเจคด้วยข้อมูลสังเคราะห์
- **ยืนยันจากเส้นทางโค้ด:** เห็นเงื่อนไขและผลลัพธ์ในโค้ด แต่ยังไม่ได้ทดสอบผ่าน browser หรือ Firestore
- **ความเสี่ยงที่ต้องทดสอบ:** concurrency, เครือข่ายล้มเหลว และ semantics ที่ต้องกำหนดให้ชัดก่อนแก้

การตรวจ baseline ไม่ได้ audit Firestore rules ที่ deploy อยู่จริง; live smoke ของ PR-12 ใช้บัญชีที่ผู้ใช้ระบุเพื่อ login, load, save ชุดข้อมูลว่าง และ reload เท่านั้น จึงยังไม่ถือว่าเป็นการยืนยันสถานะ production หรือการ audit security ครบระบบ

## ผลตรวจพื้นฐาน

| การตรวจ | ผล |
| --- | --- |
| `npm run lint` | ผ่าน (exit 0) |
| `npm run build` | ผ่าน (exit 0); หลัง PR-12 initial JavaScript chunk 623.67 kB / gzip 190.08 kB (ก่อน lazy loading 909.28 kB / gzip 246.20 kB) และยังมีคำเตือน chunk ใหญ่กว่า 500 kB |
| `npm test` | ผ่าน: fixture/migration/money/id/import validation/sync coordinator+repository/view settings/commands ใหม่ + assertion เดิม |
| Assertion เดิม 5 ไฟล์ | ผ่านทุกไฟล์: formatters, installments, monthlyLedger, tripUtils, budgetGoalCalculations |
| เคส audit เพิ่มเติม | พบ trip/item กลับมาหลังลบ, ยอดคงเหลือ 0 หลังยกเลิกจ่าย, due day ไม่ตรง, invalid date/amount ถูกยอมรับ, future schema ถูกเปลี่ยนเป็น v2, linked transaction หายจาก ledger และ parser `ไม่เกิน` ผิด |
| PR-02 focused behavior | ordinary save ลบเฉพาะ IDs ที่หายจาก local baseline; import ระบุ `replace: true`; root revision ตรวจแบบ transaction; local two-client contract test ผ่าน; `firestore.rules` บังคับ tenant/revision policy; dataset ที่เกิน 500 writes ถูกปฏิเสธเพื่อไม่เผย partial snapshot |
| PR-03 focused behavior | `migrateFinanceData` hydrate legacy trip เฉพาะ load/import; runtime `normalizeFinanceData` ไม่สร้าง trip กลับ; update/delete trip reconcile หรือ detach transactions ตาม ownership; Monthly/Yearly แสดง linked manual records และ deduplicate persisted trip items |
| PR-04 focused behavior | ยอดคงเหลือปัจจุบันคำนวณจาก schedule; snapshot แยกและถูก invalidate ตอน pay/unpay; due date helper เดียวใช้กับ info/ledger; overdue ใช้ full-date difference; interest total แยกจาก principal |
| PR-05 focused behavior | raw import validation ปฏิเสธ future/invalid schema, malformed root/collection, duplicate ID, invalid date/amount; schema v2 empty dataset ผ่าน; save failure คง preview สำหรับ retry; `ไม่เกิน`/strict amount operators และ smart month range ตรงกับ derived ledger |
| PR-06 focused behavior | save/load/import ใช้ queue เดียว; operation identity กันผลลัพธ์เก่าทับสถานะใหม่; pending/dirty ป้องกัน load/logout ทับ local edit; retry มีขอบเขต; demo ไม่เรียก Cloud |
| PR-07 focused behavior | Monthly/Yearly ใช้ shared ledger selector; reversed/effective month range derive rows ครบ; pending policy เชื่อม setting; yearly/monthly totals parity ผ่าน |
| PR-08 focused behavior | budget selector รวมหลาย line/category; explicit zero ไม่ fallback; custom thresholds และ pending policy มีผลจริง; trip sort ใช้ยอดที่แสดง; defaultView override/resolution และ reserved settings มี test |
| PR-09 focused behavior | canonical export/import round-trip ไม่มี collection/field aliases; version envelope/meta ตรงกัน; conflicting aliases ถูก block; monthly multi-line split deterministic; missing-id normalization ไม่สุ่ม; Firestore path/id mismatch ถูก block |
| PR-10 focused behavior | nested trip item materialize เป็น transaction เดียวด้วย source mapping; export/Firestore ไม่เก็บ trip money ซ้ำ; edit/delete reconcile owner; orphan/duplicate/mismatch มี report; trip installment cashflow ไม่ซ้ำ; minor-unit precision/rounding มี test |
| PR-11 focused behavior | CRUD/invariants อยู่ใน pure domain commands; update ป้องกัน id/timestamps/foreign keys; unchanged collections รักษา referential identity; Monthly/Yearly ใช้ memoized shared selector; range derivation คำนวณ installment schedule ต่อ plan ครั้งเดียว; installment schedule utility แยก module; command/selector benchmark fixture ผ่าน |
| PR-12 focused behavior | Monthly quick-add/add/edit/filter, Yearly drilldown, Installment card/table/calendar/schedule, Trip create/detail/item/budget/calendar, Monthly budget/goal, More demo sync/import preview/export และ technical disclosure ผ่าน production preview smoke; feature pages แยกเป็น lazy chunks; browser-compatible ID fallback แก้ quick-add runtime error |

## หลักฐาน PR-12

- Desktop smoke ผ่านบน dev และ production preview (`http://192.168.1.18:4173/finance-tracker/?demo=true`) โดยตรวจ route และ workflow หลักทุกหน้า; production preview ไม่มี console error
- พบและแก้ `crypto.randomUUID is not a function` ใน browser backend ด้วย [src/lib/id.ts](../src/lib/id.ts) และเพิ่ม regression test ใน `src/lib/id.test.ts`
- Follow-up reconciliation fix: legacy derived trip rows ที่ขาด `note`/`travelDetails` จะถูกเติม metadata จาก nested item โดยไม่ถูกนับเป็น conflict; ยังคง block เมื่อยอด วันที่ หมวด หรือสถานะหลักไม่ตรงกัน
- Initial JavaScript ลดจาก 909,287 bytes (ก่อน lazy loading) เหลือประมาณ 623,670 bytes หลังแยก page chunks; gzip ลดจากประมาณ 246.20 kB เหลือ 190.08 kB สำหรับ initial chunk
- CUA browser ที่ใช้ตรวจเปิดได้เฉพาะ viewport 1280×720 และไม่มี viewport override จึงยังไม่ได้ยืนยันขนาด 390–430 px หรือ non-empty multi-device Cloud workflow; ให้รัน mobile/device smoke เพิ่มใน CI หรือ browser ภายนอกก่อน release production

### หลักฐาน live Auth/Firestore เพิ่มเติม

- บัญชีที่ผู้ใช้ระบุ login สำเร็จ, แสดง Cloud bootstrap loading และโหลดข้อมูลว่างที่ normalize แล้วจาก Firestore
- กด manual Load ได้ผลลัพธ์ “ยังไม่มีข้อมูลบน Cloud” ก่อนสร้าง baseline; กด manual Save ด้วยชุดข้อมูลว่างสำเร็จ และมีเวลาซิงก์ล่าสุดแสดงใน UI
- reload และ login ซ้ำโหลดจาก Cloud สำเร็จ; logout กลับ LoginScreen; console error/warn เป็นศูนย์
- ไม่สร้าง transaction/budget/goal จริงในบัญชี เพราะต้องใช้ข้อมูลทดสอบและมีผลต่อข้อมูลการเงินของบัญชี
- บัญชีทดสอบที่มีข้อมูลจริงพบ nested trip item เก่าไม่ตรงกับ transaction เจ้าของ 3 รายการ; ปรับ Firestore load ให้ใช้ `migrateFinanceDataWithReport` hydrate read model จาก transaction source จึงเข้า dashboard ได้ ขณะที่ import/export/save ยังคงใช้ strict reconciliation เพื่อกันการเขียนทับข้อมูลที่ยังไม่ตรวจ

ก่อน PR-01 การตรวจ assertions เดิมใช้วิธีสำรองด้วย `typescript.transpileModule` เพราะ `npx -y tsx` ดาวน์โหลดไม่ได้ วิธีนั้นไม่ใช่ test command ของโปรเจคและยังไม่ทดแทน integration tests; หลัง PR-01 ให้ใช้ `npm test` เป็น baseline หลัก

## จุดที่ต้องกำหนดก่อนลงมือเปลี่ยนข้อมูล

- รายการทริปที่ผูกผ่อน: หน้าทริปควรแสดงมูลค่าซื้อ ส่วนกระแสเงินสดควรนับเฉพาะงวดหรือไม่ — ข้อเสนอคือแยกสองมุมมองนี้
- `balanceSnapshotAmount` หมายถึงยอดเงินจริง ณ วันใด และปรับอย่างไรเมื่อจ่าย/ยกเลิกจ่าย — ห้ามอนุมานการลดเงินต้นของสินค้ามีดอกเบี้ยจากค่างวดทั้งก้อน
- งบรวมทริปกับผลรวมงบหมวดหมู่เป็นวงเงินเดียวกันหรือคนละความหมาย — ข้อเสนอให้มีวงเงินรวมและยอดจัดสรรที่ชื่อชัดเจน
- `monthStartsOn` หมายถึงวันเริ่มสัปดาห์หรือวันเริ่มรอบบัญชี — โค้ดปัจจุบัน clamp 0–6 แต่ชื่อบอกอีกความหมาย

ใช้ข้อเสนอใน schema design เป็นฐานได้ ส่วนที่ยังคลุมเครือให้ตัดสินก่อน migration ที่เปลี่ยนความหมายข้อมูล ไม่จำเป็นต้องรอเพื่อเริ่ม regression tests หรือแก้บั๊กที่ยืนยันแล้ว
