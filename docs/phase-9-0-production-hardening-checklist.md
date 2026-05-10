# Phase 9.0 Production Hardening Checklist

เอกสารนี้ใช้ตรวจรอบสุดท้ายก่อนใช้งานจริงของ Finance Tracker หลัง Phase 9.0.2

## 1) Import JSON Safety

- [ ] ก่อนนำเข้าไฟล์ใหม่ ให้กด **ส่งออก JSON** เพื่อสำรองข้อมูลปัจจุบัน
- [ ] เลือกไฟล์ JSON แล้วระบบต้องแสดง preview / diagnostics ก่อน
- [ ] ระบบต้องยังไม่ replace data และยังไม่ save ขึ้น Cloud ระหว่าง preview
- [ ] กล่องยืนยันต้องแสดงหัวข้อ: `ยืนยันนำเข้าและแทนที่ข้อมูลบน Cloud?`
- [ ] กล่องยืนยันต้องแจ้งว่า import จะนำข้อมูลในไฟล์มาใช้กับบัญชีนี้ และบันทึกขึ้น Cloud ทันที
- [ ] กด **ยกเลิก** แล้วข้อมูลปัจจุบันต้องไม่เปลี่ยน
- [ ] กด **ยืนยันนำเข้า** แล้วจึง replace data และ save ขึ้น Cloud
- [ ] ถ้าไฟล์นำเข้ามีจำนวนข้อมูลน้อยกว่าข้อมูลปัจจุบันมาก ต้องมี warning ชัดเจนว่า Cloud อาจถูกลบตาม
- [ ] Export JSON ยังใช้งานได้หลัง confirm import

## 2) Firestore Rules Checklist

ตัวอย่างแนวคิด rules ที่ต้องตรวจใน Firebase Console หรือ repository rules file:

```text
users/{uid} read/write ได้เฉพาะเมื่อ request.auth != null และ request.auth.uid == uid
```

- [ ] ผู้ใช้ที่ login แล้วอ่าน/เขียนได้เฉพาะ path `users/{uid}` ของตัวเอง
- [ ] ปฏิเสธ unauthenticated reads
- [ ] ปฏิเสธ unauthenticated writes
- [ ] ไม่มี public write
- [ ] ทดสอบ User A อ่าน/เขียนข้อมูลตัวเองได้
- [ ] ทดสอบ User B อ่าน/เขียนข้อมูลตัวเองได้
- [ ] User B ไม่สามารถอ่านข้อมูลของ User A ได้
- [ ] User B ไม่สามารถเขียนทับข้อมูลของ User A ได้
- [ ] การลบ stale docs ตอน sync/delete เกิดเฉพาะใต้ `users/{uid}` ของตัวเอง
- [ ] ไม่ deploy rules จาก app code โดยตรง ให้จัดการจาก Firebase Console / Firebase CLI เท่านั้น

## 3) Firebase Auth / GitHub Pages Checklist

- [ ] Firebase Auth เปิด Email/Password provider แล้ว
- [ ] Authorized Domains มี `localhost`
- [ ] Authorized Domains มี GitHub Pages domain เช่น `username.github.io`
- [ ] Authorized Domains มี custom domain ถ้าใช้งานจริง
- [ ] GitHub repository variables ครบ:
  - [ ] `VITE_FIREBASE_API_KEY`
  - [ ] `VITE_FIREBASE_AUTH_DOMAIN`
  - [ ] `VITE_FIREBASE_PROJECT_ID`
  - [ ] `VITE_FIREBASE_STORAGE_BUCKET`
  - [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - [ ] `VITE_FIREBASE_APP_ID`
- [ ] GitHub Actions Pages deployment ผ่าน
- [ ] หน้า GitHub Pages เปิดได้หลัง deploy
- [ ] Login/logout ใช้งานได้บน GitHub Pages domain

## 4) App Check Checklist

ยังไม่ต้องเพิ่ม App Check code ใน Phase นี้ เว้นแต่ Firebase setup เดิมรองรับอย่างปลอดภัยแล้ว

- [ ] เลือก App Check provider ที่เหมาะกับเว็บ production
- [ ] อนุญาต GitHub Pages domain
- [ ] อนุญาต custom domain ถ้ามี
- [ ] เตรียม localhost/debug token สำหรับ local dev ถ้าจำเป็น
- [ ] ระหว่างทดสอบ ให้ enforcement เป็น OFF ก่อน
- [ ] เปิด enforcement เป็น ON หลัง production test สำเร็จ
- [ ] หลังเปิด enforcement แล้ว app ยังอ่าน Firestore ได้
- [ ] หลังเปิด enforcement แล้ว app ยังเขียน Firestore ได้
- [ ] ตรวจ browser console ว่าไม่มี App Check token error

## 5) Cross-device Regression

- [ ] Device A login ด้วยบัญชีเดียวกัน
- [ ] Device A เพิ่ม transaction
- [ ] รอ status เป็นบันทึกขึ้น Cloud แล้ว
- [ ] Device B หรือ incognito login บัญชีเดียวกัน
- [ ] transaction จาก Device A แสดงบน Device B
- [ ] Device B เพิ่ม trip item
- [ ] Device A refresh แล้วเห็น trip item
- [ ] Device A ลบ transaction
- [ ] Device B refresh แล้ว transaction หายไป
- [ ] User B ไม่เห็นข้อมูลของ User A
- [ ] Logout แล้ว login อีกบัญชี ต้องไม่เห็นข้อมูลผู้ใช้เดิม

## 6) Import/export Regression Checklist

- [ ] Export JSON จากข้อมูล production test ได้ schema v2
- [ ] Import JSON แบบ legacy จาก `income_expense_tracker.html` normalize ได้
- [ ] Import JSON แบบ schema v2 แล้วรายการ ธุรกรรม งบ เป้าหมาย ยอดผ่อน และทริปกลับมาครบ
- [ ] Import JSON ต้องแสดง preview/diagnostic ก่อนแทนที่ข้อมูล Cloud
- [ ] Cancel import แล้วข้อมูลเดิมไม่เปลี่ยน
- [ ] Confirm import แล้วบันทึกขึ้น Cloud สำเร็จ

## 7) Repeat Entry Regression Checklist

- [ ] เพิ่มรายการรายเดือนแบบไม่เปิดสร้างซ้ำ ได้ 1 รายการ
- [ ] เปิดสร้างซ้ำ 3 เดือน ได้รายการ 3 เดือนติดต่อกัน
- [ ] สร้างซ้ำมากกว่า 60 เดือน ถูกจำกัดไม่เกิน 60 เดือน
- [ ] รายการซ้ำแต่ละเดือนมี id ไม่ซ้ำกัน
- [ ] Export JSON มีรายการซ้ำที่สร้างไว้ครบ
- [ ] Refresh หรือ login อีกเครื่องแล้วรายการซ้ำยังอยู่ครบหลัง sync

## 8) Installment dueDay 31 Regression Checklist

- [ ] แผนผ่อน dueDay 31 ในเดือนกุมภาพันธ์ 2026 สร้างรายการวันที่ `2026-02-28`
- [ ] แผนผ่อน dueDay 31 ในเดือนกุมภาพันธ์ 2028 สร้างรายการวันที่ `2028-02-29`
- [ ] แผนผ่อน dueDay 31 ในเดือนเมษายน สร้างรายการวันที่ 30
- [ ] dueDay/paymentDay ที่ไม่ถูกต้อง fallback เป็นวันที่ 1
- [ ] Monthly ledger แสดงรายการยอดผ่อนโดยไม่มีวันที่ invalid เช่น `2026-02-31`

## 9) Responsive Regression Checklist

- [ ] Desktop 1920x1080 อ่านง่ายและการ์ดไม่ยืดเกินไป
- [ ] Mobile 402x874 ไม่มี horizontal scroll
- [ ] Bottom nav ไม่บังปุ่มสำคัญหรือ modal footer
- [ ] Modal เปิดบนมือถือแล้ว footer กดได้
- [ ] Combobox ใช้ได้ใน modal และไม่ถูก footer บัง
- [ ] Trip list/calendar/detail ใช้งานบนมือถือได้โดยกลับไปดูรายการทริปได้ง่าย

## 6) Final Import / Export Regression

- [ ] Export current data
- [ ] Import ไฟล์ที่ export จากระบบปัจจุบัน
- [ ] เห็น preview/diagnostics ก่อน confirm
- [ ] Confirm แล้ว counts เท่าเดิม
- [ ] Import legacy file จาก `income_expense_tracker.html`
- [ ] `isPaid: false` ยังกลายเป็น `status: pending`
- [ ] หมวดหมู่ยัง canonical เช่น `อื่นๆ`, `ของกิน`, `บ้าน/เช่า`
- [ ] Import ไฟล์เล็กมากทับข้อมูลปัจจุบันที่ใหญ่กว่า ต้องขึ้น warning จำนวนข้อมูลน้อยกว่า
- [ ] Cancel import แล้วข้อมูลปัจจุบันไม่เปลี่ยน
- [ ] Confirm import แล้ว save ขึ้น Cloud สำเร็จ
- [ ] เปิดอีก device แล้วเห็นข้อมูลที่ import แล้ว

## 7) Repeat Entry Regression

- [ ] เพิ่มรายการปกติ 1 รายการ แล้วยอด/เดือนถูกต้อง
- [ ] เพิ่มรายการแบบ `สร้างซ้ำรายเดือน` จำนวน 3 เดือน แล้วสร้าง 3 รายการ
- [ ] เพิ่มรายการวันที่ 31 เช่น `2026-01-31` ซ้ำ 2 เดือน ต้องได้ `2026-01-31` และ `2026-02-28`
- [ ] เพิ่มรายการวันที่ 31 ในปีอธิกสุรทิน เช่น `2028-01-31` ซ้ำ 2 เดือน ต้องได้ `2028-01-31` และ `2028-02-29`
- [ ] ใส่จำนวนเดือนว่าง / 0 / 61 / 1.5 / ตัวอักษร ต้องขึ้น error `จำนวนเดือนที่สร้างต้องอยู่ระหว่าง 1 ถึง 60`
- [ ] แก้ไขรายการเดิม ต้องไม่แสดงตัวเลือกสร้างซ้ำ และต้องอัปเดตเฉพาะรายการเดียว
- [ ] Modal รายการรายเดือนต้องไม่แสดงช่องเทคนิค `sourceModule`
- [ ] รายการ manual ที่สร้างจาก form ต้องมี `sourceModule = manual`
- [ ] รายการทริป/ยอดผ่อนที่ derive มา ต้องยังเป็น readonly ในหน้า Monthly

## 8) Responsive Regression

ตรวจขนาดหน้าจอเหล่านี้:

- [ ] Desktop 1920x1080
- [ ] Desktop 1366x768
- [ ] Tablet 768x1024
- [ ] Mobile 402x874
- [ ] Mobile 390x844

สิ่งที่ต้องตรวจ:

- [ ] ไม่มี horizontal scroll
- [ ] Bottom nav ไม่ทับ footer/actions ที่สำคัญ
- [ ] Modal footer เลื่อนถึงและกดได้
- [ ] Category combobox ใช้ได้ใน modal
- [ ] Date/month input ใช้ได้บน mobile
- [ ] Trip detail บน mobile มีปุ่มกลับไปดูรายการทริปและใช้งานได้
- [ ] รายการในหน้า Monthly / Installments / Trips ไม่ล้นจอ

## 9) Production UI Cleanup

- [ ] ไม่มีปุ่ม reset demo data บน production UI
- [ ] ไม่มี local-only import mode บน production UI
- [ ] ข้อมูลทางเทคนิคถูก collapse ไว้โดย default
- [ ] UI ไม่แสดงคำว่า Debug
- [ ] ปุ่ม manual Save to Cloud มีคำอธิบายความหมายชัดเจน
- [ ] ไม่มีข้อความ TODO ที่ผู้ใช้เห็น
- [ ] ข้อความหลักเป็นภาษาไทย

## 10) Build Quality

รันคำสั่งก่อนส่งขึ้น production:

```bash
npm run lint
npm run build
npm run preview
```

- [ ] ไม่มี unused imports
- [ ] ไม่มี type errors
- [ ] ไม่มี unreachable code
- [ ] ไม่มี stale imports
- [ ] ไม่มี production UI noise
- [ ] ไม่เปลี่ยน Firestore paths
- [ ] ไม่เพิ่ม business feature ใหม่
- [ ] ไม่เพิ่ม library ใหม่
