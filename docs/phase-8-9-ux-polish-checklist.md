# Phase 8.9 Legacy UX/UI Polish Checklist

เป้าหมายของ Phase 8.9 คือปรับ UX/UI ให้กระชับ ใกล้เคียงระบบเดิม `income_expense_tracker.html` มากขึ้น โดยไม่เพิ่ม business feature ใหม่ ไม่เปลี่ยน Firestore paths และไม่เปลี่ยน data model หลัก

## 1. Desktop 1920x1080

- Monthly filters อ่านง่าย ไม่เบียด ไม่ล้นแนวนอน
- Trip command panel รวมตัวกรอง ปุ่มเพิ่มทริป ปุ่มเพิ่มรายการ และสรุปไว้ใกล้กัน
- Trip list/detail สมดุลกัน: list/calendar อยู่ซ้าย รายละเอียดอยู่ขวา
- Trip calendar เป็นกลุ่มรายเดือนแบบ compact ไม่เป็น card ใหญ่เกินไป
- Summary cards ไม่สูงหรือกว้างเกินจำเป็น
- MorePage ส่วนข้อมูลเทคนิคถูกพับไว้ ไม่รบกวน UI หลัก

## 2. Mobile 402x874

- ไม่มี horizontal scroll ใน Monthly / Installments / Trips / Yearly / More
- Trip list หรือ calendar แสดงก่อน และเมื่อเลือกทริปแล้ว scroll ไป detail ได้
- มีปุ่ม “กลับไปดูรายการทริป” ในรายละเอียดทริป
- Bottom nav ไม่ทับปุ่ม submit/cancel ของ modal
- Modal ทริป รายการทริป และงบทริปเปิดแล้วใช้งานได้ในจอสูงจำกัด
- Category combobox ใน modal กดเลือกได้ ไม่โดน blur แล้วค่าเพี้ยน
- DateInput / MonthInput แสดงค่าชัดเจน suffix ไม่บัง value

## 3. Trip flow

- สร้างทริปใหม่ได้
- แก้ไขทริปได้
- ลบทริปได้ พร้อม confirm modal
- เพิ่มรายการทริปได้ default หมวดเป็น “ท่องเที่ยว”
- แก้ไขรายการทริปได้
- ลบรายการทริปได้
- เปลี่ยนสถานะรายการทริปเป็นจ่ายแล้ว/ยังไม่จ่ายได้
- เพิ่มงบแยกหมวดของทริปได้
- แก้ไขงบแยกหมวดของทริปได้
- ลบงบแยกหมวดของทริปได้
- สลับมุมมอง รายการ / ปฏิทิน ได้
- เลือกทริปจาก list/calendar แล้ว detail เปลี่ยนถูกต้อง
- แท็บ ภาพรวม / รายการจริง / แผนงบ ทำงานถูกต้อง

## 4. Forms and controls

- TripModal แสดง title/description ชัดเจน
- TripItemModal แสดง context ของทริปชัดเจน
- TripBudgetFormModal แสดง context ของทริปชัดเจน
- Error message เป็นภาษาไทยและมองเห็นง่าย
- Sticky footer ยังเห็นปุ่ม ยกเลิก / บันทึก
- Combobox ค้นหา เลือก และพิมพ์ free text ได้
- DateInput ใช้งานได้บน Chrome/Edge desktop และ mobile
- MonthInput ใช้งานได้บน Chrome/Edge desktop และ mobile

## 5. Thai label cleanup

ตรวจหน้า UI หลักว่าไม่มีคำอังกฤษที่ดูเป็น debug/test โดยไม่จำเป็น เช่น:

- Actual → ใช้จริง
- Planned → วางแผน / งบที่วางไว้
- Overview → ภาพรวม
- Items → รายการ
- Plan → แผนงบ
- Budget → งบประมาณ
- Current → ปัจจุบัน
- Remaining → คงเหลือ
- Safe → ยังปลอดภัย
- Pending → ยังไม่จ่าย / รอดำเนินการ
- Debug → ข้อมูลทางเทคนิคสำหรับตรวจสอบ
- Project → โปรเจกต์

คำเทคนิคที่ยังใช้ได้ตามบริบท: JSON, Cloud, Firebase

## 6. Build quality

รันคำสั่งต่อไปนี้หลังแตก patch:

```bash
npm run lint
npm run build
```

ต้องไม่มี:

- unused imports
- unused variables / parameters
- TypeScript errors
- horizontal overflow ที่เห็นได้ชัด
- layout ที่ทำให้ปุ่มหลักถูก bottom nav บัง

## 7. Regression guard

- Firebase autosave ยังทำงานหลังเพิ่ม/แก้ไข/ลบทริป
- Import/Export JSON ยังทำงาน
- Monthly ยังเห็นรายการทริปผ่าน derived trip transactions
- Budget/trip calculations ยังใช้ category canonical เดิม
- ไม่มีการเปลี่ยน Firestore paths
- ไม่มี library ใหม่
