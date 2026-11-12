# AI Build Guide — Group Beach Trip Website

> สถานะเอกสาร: ฉบับสรุปข้อกำหนดที่ผู้ใช้ยืนยันแล้ว พร้อมใช้เป็นคู่มือหลักสำหรับ AI Developer  
> เทคโนโลยีหลัก: HTML, CSS, Vanilla JavaScript, Node.js / Netlify Functions, YugabyteDB, Supabase Storage  
> เป้าหมาย: เว็บไซต์วางแผนทริปทะเลสำหรับกลุ่มเพื่อน ใช้งานผ่าน Public URL บน Netlify

---

## 1. คำสั่งสำคัญสำหรับ AI Developer

ก่อนเริ่มงาน ให้ทำตามข้อกำหนดนี้อย่างเคร่งครัด

1. อ่านไฟล์ `style-guide.md`, `plan.json` และเอกสารนี้ให้ครบก่อนแก้ไขหรือสร้างไฟล์ใด ๆ
2. ตรวจสอบโครงสร้างโปรเจกต์และฐานข้อมูลจริงก่อนเริ่มพัฒนา ห้ามสมมติชื่อคอลัมน์ ชนิดข้อมูล หรือความสัมพันธ์ของตาราง
3. หากข้อกำหนดไม่ชัดเจน ขัดแย้งกัน หรือข้อมูลไม่เพียงพอ ให้ถามผู้ใช้ก่อน ห้ามเดาเอง
4. ห้ามเปลี่ยนโครงสร้างฐานข้อมูล เพิ่ม/ลบ/เปลี่ยนคอลัมน์ Constraint หรือ Migration โดยไม่ได้อธิบายเหตุผล ผลกระทบ และได้รับอนุมัติจากผู้ใช้
5. ห้ามเปลี่ยนเทคโนโลยีหลักหรือเพิ่ม Framework โดยไม่ได้รับอนุมัติ
6. แบ่งงานเป็นระยะย่อย ทำทีละส่วน และรายงานไฟล์ที่สร้าง/แก้ไข วิธีทดสอบ ผลทดสอบ และปัญหาที่พบ
7. ให้ใช้ข้อมูลจากฐานข้อมูลเป็นแหล่งข้อมูลจริงสำหรับข้อมูลสมาชิกและข้อมูลการเงิน ห้ามใช้ข้อมูลตัวอย่างแทนข้อมูลจริงใน Production
8. ห้ามแสดงข้อมูลการเงินเก่าจาก Cache เสมือนเป็นข้อมูลล่าสุด หาก Backend หรือ Database ใช้งานไม่ได้
9. ห้ามเปิดเผย `DB_URL`, Supabase Secret Key, รหัสผ่าน, Session ID หรือข้อมูลลับใน Frontend, Git หรือ Log
10. หากพบว่าข้อกำหนดนี้ไม่สามารถทำได้ด้วยบริการหรือแพ็กเกจที่เลือก ให้แจ้งผู้ใช้พร้อมทางเลือกและค่าใช้จ่ายที่อาจเกิดขึ้นก่อนดำเนินการ

## 2. เป้าหมายและขอบเขตโครงการ

สร้างเว็บไซต์สำหรับกลุ่มเพื่อนเพื่อเตรียมทริปทะเล โดยมีข้อมูลสถานที่ แผนการเดินทาง สภาพอากาศ การแจ้งเตือน และระบบการเงินของกลุ่ม

- เป็นเว็บไซต์ ไม่ใช่ Native Mobile App
- ระยะแรกไม่ทำ PWA
- เปิดใช้งานผ่าน Public URL ที่ Deploy บน Netlify
- รองรับมือถือเป็นหลัก และใช้งานได้บน Tablet/Desktop
- รองรับ Chrome, Safari, Edge และ Firefox รุ่นปัจจุบัน
- มีผู้ใช้หลายคนเข้าใช้งานพร้อมกันได้
- ไม่จำเป็นต้องใช้ Real-time/WebSocket ผู้ใช้เห็นข้อมูลใหม่เมื่อ Refresh หรือมีการ Fetch ข้อมูลใหม่
- เป็นระบบสำหรับทริปเดียวในระยะแรก ไม่ทำระบบจัดการหลายทริปหรือ Archive แยกทริป

## 3. เทคโนโลยีและบริการ

### Frontend
- HTML
- CSS
- Vanilla JavaScript
- ไม่ใช้ React, Vue, Angular, Tailwind หรือ CSS Framework เว้นแต่ผู้ใช้อนุมัติ

### Backend
- Node.js บน Netlify Functions
- Backend เป็นผู้เชื่อมต่อฐานข้อมูลและ Supabase Storage
- ตรวจสอบ Session และสิทธิ์ทุกครั้งก่อนเข้าถึงข้อมูลที่ต้องได้รับการยืนยันตัวตน
- ตรวจสอบความเข้ากันได้ของ Database Driver, TLS, Connection Pooling และข้อจำกัด Serverless ก่อนเลือกวิธีเชื่อมต่อ YugabyteDB

### Database
- YugabyteDB
- Environment variable: `DB_URL`
- ห้ามนำ Connection String ไปไว้ใน Frontend หรือ Commit ลง Git

### File Storage
- Supabase Storage
- Bucket: `payment-slips`
- Bucket เป็น Private
- Environment variables:
  - `SUPA_URL`
  - `SUPA_PUBLISHABLE_KEY`
  - `SUPA_SECRET_KEY`
- Supabase Secret Key ใช้เฉพาะ Backend เท่านั้น และห้ามเปิดเผยใน Frontend
- Publishable Key ไม่ใช่สิ่งทดแทน Secret Key สำหรับงาน Backend ที่ต้องใช้สิทธิ์ระดับ Secret

### Environment variables
ต้องตั้งค่าใน Netlify Dashboard สำหรับ Production และใช้ `.env` เฉพาะ Local Development
- `DB_URL`
- `SUPA_URL`
- `SUPA_PUBLISHABLE_KEY`
- `SUPA_SECRET_KEY`
- ตัวแปรอื่นที่จำเป็นต้องเสนอผู้ใช้ก่อนเพิ่ม

เพิ่ม `.env`, ไฟล์ Credential และไฟล์ลับลง `.gitignore` ห้าม Commit

## 4. แนวทาง UI/UX

`style-guide.md` เป็นแหล่งอ้างอิงหลักด้านหน้าตาเว็บไซต์ ห้ามแก้ไขไฟล์นี้เอง

หลักสำคัญ:
- Mobile-first
- โทนสนุก สดใส เป็นมิตร เกี่ยวกับทะเล
- ใช้สีหลัก Teal/Blue และสี Accent Orange/Yellow ตามค่าที่กำหนดใน `style-guide.md`
- รองรับ Light/Dark Theme ตาม System Preference
- ใช้ฟอนต์ IBM Plex Sans Thai
- Layout โปร่ง ไม่อัดแน่น
- ใช้ Glassmorphism ตามข้อจำกัดใน Style Guide และมี Fallback สำหรับ Browser ที่ไม่รองรับ
- ไม่ใช้ Glassmorphism กับช่องกรอกข้อมูลหรือข้อความยาว
- คำนึงถึง Contrast และไม่ใช้สีเป็นตัวบอกสถานะเพียงอย่างเดียว
- ปุ่มและ Input มีความสูงอย่างน้อย 44px
- Mobile Bottom Navigation ต้องไม่บังเนื้อหา และต้องรองรับ Safe Area
- ใช้ Lucide Outline Icons
- ไม่ใช้ Emoji เป็น Icon ใน UI
- Animation เฉพาะ Hover/Press ตาม Style Guide และเคารพ `prefers-reduced-motion`
- มี Loading, Empty State, Success และ Error State ที่ชัดเจน
- ป้องกันการกดปุ่มซ้ำระหว่างกำลังบันทึกข้อมูล
- ข้อความแจ้งเตือนควรเป็นมิตร ไม่กล่าวโทษผู้ใช้

## 5. ผู้ใช้และระบบเข้าสู่ระบบ

### รายชื่อสมาชิก
- รายชื่อสมาชิกโหลดจากตาราง `friends`
- ผู้ใช้เลือกชื่อจาก Dropdown ไม่ต้องสมัครสมาชิกเอง
- ไม่ต้องมีหน้าเพิ่ม/ลบสมาชิก
- ไม่มี Admin ทุกคนมีสิทธิ์เท่าเทียมกันตามกฎของแต่ละฟังก์ชัน
- ผู้ใช้ดูข้อมูลโปรไฟล์ของตนเองและข้อมูลการเงินส่วนตัวได้

### การเข้าสู่ระบบ
- สมาชิกทุกคนใช้ Shared Password เดียวกัน
- Backend ตรวจสอบ Password โดยเก็บค่า Password แบบ Hash ฝั่ง Server
- เมื่อ Login สำเร็จ Backend สร้าง Session ใหม่
- Shared Password ไม่สามารถพิสูจน์ได้อย่างแน่นอนว่าผู้ที่ Login เป็นเจ้าของชื่อสมาชิกจริง ต้องยอมรับข้อจำกัดนี้
- จำกัดจำนวนครั้งการลอง Password และมี Rate Limit
- ป้องกัน Session Fixation โดยสร้าง Session ใหม่หลัง Login
- ไม่บันทึก Password หรือ Session ID ลง Log

### Session
- ใช้ Cookie ที่มี `HttpOnly`, `Secure`, `SameSite` ตามความเหมาะสม
- ไม่เก็บ Session ID ใน `localStorage`
- Session ฝั่ง Server มีอายุสูงสุด 7 วันนับจากเวลา Login และไม่ต่ออายุเมื่อมีการใช้งาน
- Logout ต้องยกเลิก Session ฝั่ง Server ของอุปกรณ์ปัจจุบัน
- เปลี่ยน Shared Password แล้วต้องยกเลิก Session ที่ยังใช้งานอยู่ทั้งหมด
- สมาชิกคนเดียว Login ได้หลายอุปกรณ์ แต่ละอุปกรณ์มี Session แยกกัน
- Login บนอุปกรณ์ใหม่ไม่ทำให้ Session ของอุปกรณ์เดิมหมดอายุ
- Logout จากอุปกรณ์หนึ่งไม่กระทบอุปกรณ์อื่น
- เมื่อ Session หมดอายุ ให้แจ้งผู้ใช้และนำกลับหน้า Login
- ใช้ Session Cookie ที่ไม่มีอายุถาวรใน Browser เมื่อปิด Browser แล้วเปิดใหม่ต้อง Login อีกครั้ง แม้ Session ฝั่ง Server จะยังไม่ครบ 7 วันก็ตาม

## 6. Navigation และหน้าเว็บไซต์

### โครงสร้างหลัก
หน้าแรกหลัง Login ประกอบด้วย:
1. Dashboard
2. Calendar / Itinerary
3. Places
4. Weather
5. Notifications

Finance เป็นเมนูแยก และมีเมนูย่อย:
1. Central Fund
2. Record Expenses
3. Split Expenses
4. Debt List
5. Repayment / Repayment History

บนมือถือใช้ Bottom Navigation ตามแนวทางใน `style-guide.md` ซึ่งกำหนดให้มีเมนูหลัก 3–5 รายการ หากจำนวนหน้ามากเกินไป ให้เสนอการจัดกลุ่มเมนูหรือหน้า More ก่อน Implement ห้ามยัดทุกเมนูจนใช้งานยาก

## 7. Dashboard

Dashboard แสดงภาพรวมกลุ่มและข้อมูลส่วนตัวของสมาชิกที่ Login อยู่ โดยไม่ทำให้หน้าแน่นเกินไป

ข้อมูลที่ต้องแสดง:
- ยอดเงินกองกลางรวม
- ยอดเงินกองกลางที่สมาชิกแต่ละคนสมทบ
- ค่าใช้จ่ายรวม
- สมาชิกแต่ละคนสำรองจ่ายไปเท่าใด
- ใครต้องชำระเงินให้ใคร
- ยอดหนี้คงค้าง
- จำนวนวันที่เหลือก่อนเดินทาง
- วันเริ่มต้นและวันสิ้นสุดทริป
- สภาพอากาศในช่วงทริป
- จำนวนสมาชิกที่เข้าร่วม
- ภาพรวมข้อมูลส่วนตัวของผู้ใช้ที่ Login อยู่

แสดง Card ของที่พักและสถานที่ท่องเที่ยวหลักตามข้อมูลที่มี

ไม่ต้องแสดงยอดเงินกองกลางที่ใช้ไปหรือยอดคงเหลือบน Dashboard เพราะเงินกองกลางโดยทั่วไปตั้งเป้าตามค่าที่พักและการเดินทาง

หากไม่มีข้อมูล ให้แสดง Empty State อย่างชัดเจน ไม่แสดง `0.00` โดยไม่มีคำอธิบาย

## 8. Calendar และ Itinerary

- `plan.json` เป็นแหล่งข้อมูลหลักสำหรับ Itinerary และสถานที่ในระยะนี้ ยังไม่ต้องสร้าง `place.json`
- แสดงกิจกรรมแยกตามวัน เมื่อเลือกวันให้เห็นกิจกรรมและสถานที่ของวันนั้น
- Parser ต้องรองรับ Key ชื่อ `place_name` และ `name` ที่มีอยู่ในไฟล์จริง ห้ามแก้ไฟล์ต้นฉบับหรือเปลี่ยนชื่อ Key โดยไม่จำเป็น
- วันที่ใน Key เช่น `plan_2/5/70` หมายถึงวันที่ 2/5/2570 พ.ศ. หรือ 2 พฤษภาคม 2027 ค.ศ. ปี `70` หมายถึง พ.ศ. 2570 / ค.ศ. 2027
- วันเริ่มต้นและวันสิ้นสุดทริปเก็บใน `public.trip_settings` ของ Database `travel_sea` เป็นแหล่งข้อมูลหลักสำหรับวันทริป
- สมาชิกทุกคนดูวันทริปได้ แต่เฉพาะเจ้าของโครงการเท่านั้นที่แก้ไขผ่าน Project Settings ได้
- เมื่อแก้วันทริปสำเร็จ ให้ Dashboard, Countdown, Calendar และ Weather อ่านค่าใหม่จากแหล่งเดียวกันโดยอัตโนมัติ
- การเปลี่ยนวันทริปต้องบันทึก Audit Log โดยมีค่าเดิม ค่าใหม่ ผู้แก้ไข และเวลา
- ไม่ส่ง Notification เมื่อเปลี่ยนวันทริปหรือ Itinerary เจ้าของโครงการจะแจ้งสมาชิกด้วยตนเอง
- Itinerary เป็นแบบ Read-only สำหรับสมาชิกทั่วไป เฉพาะเจ้าของโครงการแก้ข้อมูลต้นทาง `plan.json` ได้
- เวลาแสดงผลใช้รูปแบบ 24 ชั่วโมง และวันที่ใช้ พ.ศ. ในรูปแบบ `DD/MM/YYYY` โดยแปลงจากวันที่มาตรฐานในระบบอย่างถูกต้อง

## 9. Places

แยก Overview Page ตามหมวด:
- Accommodation
- Tourist Attractions
- Restaurants

แต่ละสถานที่มี Detail Page ของตัวเอง

ข้อมูลที่แสดงตามข้อมูลที่มี:
- ชื่อสถานที่
- รูปภาพ
- คำอธิบาย
- ที่อยู่หรือพิกัด
- ลิงก์ Google Maps
- ประเภทสถานที่

ห้ามสร้างคำอธิบาย ที่อยู่ ราคา หรือหมวดหมู่ขึ้นเอง หากไม่มีข้อมูลให้แสดงเฉพาะข้อมูลที่มีหรือถามผู้ใช้

`plan.json` เป็นแหล่งข้อมูลหลักสำหรับสถานที่และแผนเดินทางในระยะนี้ ยังไม่จำเป็นต้องสร้าง `place.json` แยก เว้นแต่ภายหลังพบเหตุผลที่ต้องแยกข้อมูล

ที่พักในปัจจุบันเป็นเพียงตัวเลือกที่กำลังพิจารณา ยังไม่ใช่การจองที่ยืนยันแล้ว เพราะวันเดินทางยังไม่สรุป ห้ามแสดงสถานะว่าจองแล้ว

ค่าใช้จ่ายรวมยังสรุปไม่ได้ เพราะค่าที่พักและค่าเดินทางขึ้นอยู่กับวันที่เดินทาง

รูปภาพที่ผู้ใช้อาจเพิ่มภายหลัง:
- `khohlan.jpeg` สำหรับเกาะล้าน
- `hotel.jpeg` สำหรับที่พัก

ยังไม่มีความต้องการให้เพิ่มภาพสถานที่อื่นโดยอัตโนมัติ

## 10. Weather

ต้องแสดง:
- ภาพรวมสภาพอากาศ
- อุณหภูมิสูงสุดและต่ำสุด
- โอกาสเกิดฝน
- ปริมาณฝน

แสดงพยากรณ์ตามสถานที่ปลายทางของแต่ละวัน โดยเชื่อมกับข้อมูลใน `plan.json` ไม่ใช่แสดงเฉพาะสภาพอากาศบริเวณที่พัก

ข้อมูลพยากรณ์มีขอบเขตตามที่ผู้ให้บริการรองรับ หากวันเดินทางอยู่นอกช่วงพยากรณ์ ให้แสดงข้อความชัดเจนว่าไม่มีข้อมูลพยากรณ์ระยะนั้น ห้ามคาดเดา

ยังไม่ได้เลือก Weather Provider ต้องตรวจสอบ API, ระยะพยากรณ์, Rate Limit, Attribution และค่าใช้จ่ายก่อนเสนอผู้ใช้อนุมัติ

## 11. Notifications

แจ้งเตือนเฉพาะเหตุการณ์:
1. สมาชิกเติมเงินกองกลาง
2. สมาชิกสร้างรายการค่าใช้จ่าย
3. มีการแบ่งค่าใช้จ่ายและเกิดหนี้ของสมาชิก
4. สมาชิกส่งหลักฐานการชำระหนี้
5. ใกล้ถึงวันเดินทาง

ไม่ต้องแจ้งเตือนเมื่อมีการเปลี่ยนแปลงวันทริป Itinerary หรือ Place รวมถึงการแก้ Description วันที่ Slip และ Void

ข้อกำหนด:
- มี Bell Icon และ Unread Count
- แสดงรายการแจ้งเตือนพร้อมข้อความและวันเวลา
- แตะรายการแล้วนำไปยังหน้าที่เกี่ยวข้อง
- Mark as Read ได้
- เก็บประวัติการแจ้งเตือน แม้ Logout แล้ว
- แสดงเป็นรายการเรียงตามกิจกรรมล่าสุด
- รองรับการค้นหาและ Filter ตามประเภทธุรกรรม สมาชิก ช่วงวันที่ และสถานะ โดยเรียงล่าสุดไปเก่าสุดเสมอ

## 12. Central Fund

- สมาชิกกรอกจำนวนเงินและแนบสลิป
- Upload สลิปไป Supabase Storage
- บันทึก File Path ลง YugabyteDB ไม่เก็บ Signed URL เป็นข้อมูลถาวร
- เมื่อส่งรายการสำเร็จ ให้เพิ่มยอดเงินกองกลางทันที ไม่ต้องรออนุมัติ
- สมาชิกคนเดิมส่งเงินได้หลายครั้ง แต่ละรายการต้องเป็น Transaction แยกกัน
- แสดงยอดรวม ยอดแยกตามสมาชิก และประวัติรายการทั้งหมด
- ประวัติเรียงจากรายการล่าสุด
- สมาชิกทุกคนดูรายการและสลิปได้
- ไม่มีระบบอนุมัติรายการ
- ผู้สร้างรายการเท่านั้นที่มีสิทธิ์ Void รายการของตนเองตามนโยบาย Void โดยต้องระบุเหตุผลและเก็บประวัติ

## 13. Expenses

- ผู้ที่สำรองจ่ายเงินจริงต้องเป็นผู้สร้าง Expense และระบบกำหนดผู้จ่ายจากสมาชิกที่ Login อยู่โดยอัตโนมัติ ห้ามมีช่องเลือกหรือเปลี่ยนผู้จ่ายเอง
- หากคนผิดเป็นผู้สร้างรายการ ห้ามเพิ่มฟังก์ชันเปลี่ยนผู้จ่าย ให้ Void และสร้างรายการใหม่ตามเงื่อนไข
- ใช้ประเภทค่าใช้จ่ายที่กำหนดไว้ล่วงหน้า สมาชิกไม่สามารถเพิ่มประเภทเองผ่านเว็บไซต์
- ข้อมูล Expense ประกอบด้วยผู้จ่าย ประเภท จำนวนเงินจริง วันที่เกิดค่าใช้จ่าย คำอธิบาย (ถ้ามี) สลิป (ถ้ามี) และสมาชิกที่เข้าร่วมการหาร
- Expense ไม่จำเป็นต้องมี Slip ได้ แต่ถ้าไม่มี Slip ต้องกรอก Description เพิ่มเติม
- ผู้สร้างแก้ไขรายละเอียดได้ก่อน Split
- หลัง Split แล้ว ห้ามแก้ข้อมูลทางการเงินต้นทาง แต่อนุญาตให้แก้ Description, วันที่เกิดค่าใช้จ่าย และเปลี่ยน Slip ได้ โดยไม่กระทบ Debt และต้องบันทึกค่าเดิม/ค่าใหม่ใน Audit Log
- หากมี Slip อยู่แล้ว ห้ามลบ Slip โดยปล่อยให้ว่าง ต้องใช้การแทนที่ไฟล์เท่านั้น
- ห้ามลบ Expense โดยตรง ใช้ Void พร้อมเหตุผล
- อนุญาตให้สร้าง Expense ย้อนหลังหลังวันสิ้นสุดทริปได้ โดยต้องระบุวันที่เกิดค่าใช้จ่ายจริง และระบบต้องบันทึก `created_at` แยกจากวันที่เกิดค่าใช้จ่าย
- Expense ที่มี Split แล้วจะ Void ได้ต่อเมื่อไม่มี Debt ที่เกี่ยวข้องถูกชำระไปแล้ว หากมี Settlement ที่ชำระ Debt บางส่วน/ทั้งหมดแล้ว ต้องจัดการ Settlement ที่เกี่ยวข้องตามนโยบายก่อน ห้าม Void ลูกโซ่เอง
- Schema ปัจจุบันยังไม่มี Description, created_at, slip storage path และ Void metadata ที่ครบถ้วน ต้องเสนอ Migration ที่จำเป็นก่อน Implement

## 14. Expense Split และ Debt

รองรับการแบ่งเท่ากันและไม่เท่ากัน โดยกรณีไม่เท่ากันผู้ใช้ระบุจำนวนเงินหรือเปอร์เซ็นต์ได้

กฎการคำนวณ:
- บันทึกแถว `expenses_split` ให้ผู้เข้าร่วมทุกคน รวมถึงผู้จ่าย
- ตัวอย่าง: A จ่าย 1,000 บาท มีสมาชิก 4 คนร่วมหารเท่ากัน ต้องบันทึก 4 แถว แถวละ 250 บาท
- ส่วนของผู้จ่ายเป็นส่วนแบ่งของตนเอง ไม่ใช่หนี้ที่ผู้จ่ายต้องคืนให้ตัวเอง
- คำนวณ Debt เฉพาะส่วนที่สมาชิกอื่นต้องคืนให้ผู้จ่าย
- กรณีแบ่งไม่เท่ากัน ผลรวมส่วนแบ่งก่อนการปัดเศษต้องเท่ากับยอด Expense จริง มิฉะนั้นปฏิเสธการบันทึก
- ปัดยอดที่สมาชิกแต่ละคนต้องรับผิดชอบขึ้นเป็นจำนวนเต็มบาทตามกติกาที่ตกลงไว้ ส่วนต่างจากการปัดขึ้นเป็นประโยชน์ของผู้จ่าย
- เก็บยอด Expense จริงแยกจากยอดรับผิดชอบหลังปัดเศษ
- เมื่อ Split สำเร็จ ให้สร้าง Debt และแจ้งสมาชิกที่เกี่ยวข้อง
- ผู้สร้าง Expense เท่านั้นที่แก้ไข Split ได้ และแก้ได้เฉพาะเมื่อยังไม่มี Debt ที่เกี่ยวข้องถูกชำระ
- เมื่อแก้ Split ให้คำนวณ Debt ใหม่และแจ้งสมาชิกที่ได้รับผลกระทบ
- ผู้สร้าง Expense เท่านั้นที่ Void Split ทั้งชุดได้ หากไม่มี Debt ที่เกี่ยวข้องถูกชำระ ต้องระบุเหตุผลและเก็บประวัติ ส่วน Expense ต้นทางยังคงอยู่
- หากมี Debt ใดถูกชำระแล้ว ห้ามแก้หรือ Void Split

การรวม Debt:
- Debt จากลูกหนี้คนเดียวกันไปยังเจ้าหนี้คนเดียวกันให้รวมยอดในหน้ารายการหนี้
- ผู้ใช้สามารถขยายเพื่อดูรายละเอียด Expense ที่ประกอบกันเป็นยอดรวม
- การชำระหนึ่งครั้งต้องชำระยอดรวมทั้งหมดของคู่ลูกหนี้/เจ้าหนี้นั้น ไม่รองรับ Partial Payment
- Debt ที่ชำระครบแล้วซ่อนจากรายการหนี้คงค้าง แต่ยังอยู่ใน Repayment History

Schema:
- ใช้ `expenses_split.expenses_id character(10)` เชื่อมแถว Split กับ Expense
- ใช้ `expenses_split.settlement_id character(10)` เพื่อให้ Debt หลายแถวเชื่อมกับ Settlement หนึ่งรายการ
- ทั้งสองคอลัมน์มีอยู่แล้วแต่ Nullable และยังไม่มี Foreign Key ต้องตรวจความถูกต้องใน Backend และเสนอ Migration/Constraint หากจำเป็นก่อนใช้งานจริง

## 15. Repayment / Settlement

- สมาชิกเลือกคู่ลูกหนี้/เจ้าหนี้ที่ต้องการชำระ ระบบแสดงยอด Debt รวมทั้งหมดระหว่างสมาชิกคู่นั้น
- ชำระเต็มยอดรวมเท่านั้น ไม่รองรับ Partial Payment
- แนบ Slip และบันทึก Settlement เมื่อ Backend ยืนยันสำเร็จ ให้ถือว่าหนี้ที่เชื่อมโยงถูกชำระทันที ไม่ต้องรอผู้รับอนุมัติ
- ผู้รับเงินเห็นผู้ส่ง จำนวนเงิน วันที่ Description และ Slip
- ผู้ส่งเป็นผู้สร้างรายการ Settlement และเป็นผู้มีสิทธิ์ Void Settlement ของตนเองตามนโยบาย
- ใช้ `expenses_split.settlement_id` เชื่อม Split/Debt หลายแถวเข้ากับ Settlement เดียว
- ก่อนบันทึก ต้องตรวจว่าหนี้ทุกแถวเป็นของลูกหนี้/เจ้าหนี้คู่เดียวกัน ยอดรวมตรงกับ Settlement และยังไม่ถูกชำระ ต้องบันทึก Settlement และอัปเดตทุก Split ภายใน Database Transaction เดียว
- Settlement ที่ Void สำเร็จต้องคืนสถานะ Debt ทุกแถวที่เชื่อมกับ Settlement กลับเป็นค้างชำระ
- ห้ามแก้ยอดเงินหรือเปลี่ยน/ลบ Slip ของ Settlement เดิมโดยตรง หากยอดผิดให้ Void และสร้างใหม่
- ผู้สร้างสามารถแทนที่ Slip ได้โดยไม่เปลี่ยนยอดหรือสถานะหนี้ ต้องบันทึก Audit Log
- ห้ามลบ Slip โดยไม่แทนที่ด้วยไฟล์ใหม่
- ไม่มี Notification เมื่อแก้ Description, เปลี่ยน Slip หรือ Void

## 16. นโยบาย Void และ Audit Logs

### Void
ห้าม Hard Delete ธุรกรรมการเงิน ให้ใช้ Void เพื่อเก็บประวัติเดิมไว้ โดยทุกการ Void ต้องระบุเหตุผล เก็บผู้กระทำและเวลา และไม่นำรายการที่ Void ไปคำนวณยอดปัจจุบัน

สิทธิ์และเงื่อนไข:
- Central Fund: เจ้าของรายการ Void รายการของตนเองได้ทันทีโดยไม่ต้องรออนุมัติ ต้องระบุเหตุผล
- Expense: เจ้าของรายการ Void ได้เมื่อไม่มี Debt ที่เกี่ยวข้องถูกชำระแล้ว หากมีการชำระแล้วต้องจัดการ Settlement ที่เกี่ยวข้องก่อน
- Expense Split: ผู้สร้าง Expense ต้นทาง Void Split ทั้งชุดได้เมื่อไม่มี Debt ที่เกี่ยวข้องถูกชำระ
- Settlement: ผู้สร้าง Settlement Void รายการของตนเองได้ตามการตรวจสอบความสัมพันธ์ และเมื่อ Void แล้วต้องคืน Debt ที่เชื่อมโยงทั้งหมด
- ไม่มีการ Void ลูกโซ่หรือ Cascade อัตโนมัติ
- Central Fund แก้จำนวนเงินไม่ได้ ให้ Void รายการเดิมและสร้างใหม่
- Expense แก้ข้อมูลการเงินหลัง Split ไม่ได้ ให้ Void และสร้างใหม่เมื่อเข้าเงื่อนไข
- Settlement แก้จำนวนเงินไม่ได้ ให้ Void และสร้างใหม่

### Audit Logs
ผู้ใช้อนุมัติให้ AI Developer ออกแบบและสร้างตาราง `audit_logs` ได้ โดยไม่ต้องถามอนุมัติซ้ำสำหรับการสร้างตารางนี้ แต่ต้องอธิบาย Schema/Migration และทดสอบก่อนใช้จริง

ต้องบันทึกเหตุการณ์สำคัญ:
- Create, Edit, Replace Slip และ Void ของ Central Fund, Expense, Expense Split และ Settlement
- การแก้ไขวันเริ่ม/สิ้นสุดทริป Itinerary และข้อมูล Place/Accommodation/Restaurant
- เก็บ entity/event type, entity ID, actor/member ID, timestamp, old values, new values และ reason สำหรับ Void
- บันทึกเหตุการณ์หลังจากธุรกรรมหลักสำเร็จอย่างน่าเชื่อถือ โดยไม่ทำให้ข้อมูลหลักกับ Audit Log ไม่ตรงกัน
- ไม่บันทึก Login สำเร็จ, Login ล้มเหลว หรือ Logout ลง `audit_logs`
- เก็บ Audit Log ไม่มีกำหนดเวลา ไม่ลบอัตโนมัติ และรวมใน Database Backup

การแสดงผล:
- มีหน้าแยกชื่อ “ประวัติการเปลี่ยนแปลง” สมาชิกทุกคนเข้าดูได้
- ค้นหาและ Filter ตามประเภทธุรกรรม สมาชิก ช่วงวันที่ และสถานะ
- เรียงใหม่ไปเก่าเสมอและใช้ Infinite Scroll
- แสดงค่าเดิม/ค่าใหม่ ผู้กระทำ และวันเวลา
- ในหน้า Detail ของแต่ละธุรกรรม แสดงประวัติย่อจาก `audit_logs` ชุดเดียวกัน
- สมาชิกดูได้แต่แก้ไขหรือลบ Audit Log ไม่ได้
- ไม่มี Export Excel/CSV
- ไม่มี Notification เมื่อแก้ไข เปลี่ยน Slip หรือ Void
- รายการ Void แสดงในประวัติธุรกรรมหลักพร้อมป้าย “ยกเลิกแล้ว” แต่ซ่อนจาก Dashboard และไม่รวมในยอด

## 17. การแสดงผลข้อมูลการเงินและ Finance Overview

- ใช้สกุลเงินบาท (THB) แสดงสองตำแหน่งทศนิยม
- ใช้ Decimal-safe arithmetic หรือ integer satang ห้ามใช้ Floating Point แบบไม่ควบคุมในการคำนวณเงินจริง
- แยกยอด Expense จริงออกจากยอดหนี้หลังปัดขึ้นเป็นจำนวนเต็มบาท
- วันที่แสดงเป็น พ.ศ. รูปแบบ `DD/MM/YYYY`; เวลา 24 ชั่วโมง; เขตเวลา `Asia/Bangkok` (UTC+7)
- คำนวณจากข้อมูลจริงใน Database ไม่ใช้ Cache เก่าเป็นยอดล่าสุด
- รายการ Void ไม่รวมในยอดการเงินและไม่แสดงบน Dashboard แต่ยังเห็นใน Transaction History พร้อมสถานะ “ยกเลิกแล้ว”
- ประวัติเรียงล่าสุดไปเก่าสุดเสมอ ใช้ Infinite Scroll ไม่มีตัวเลือกเรียงแบบอื่น
- รายการหนี้ที่ชำระครบซ่อนจาก Debt List แต่ยังอยู่ใน Repayment History

### Finance Overview
เมื่อกดเมนู Finance ให้เปิดหน้า Finance Overview ก่อน โดยแสดง:
- ยอดเงินกองกลางรวม
- ค่าใช้จ่ายรวม
- ยอดหนี้คงค้าง
- สรุปยอดที่สมาชิกแต่ละคนสำรองจ่าย
- สรุปยอดหนี้ระหว่างสมาชิก
- ลิงก์ไป Central Fund, Record Expenses, Split Expenses, Debt List และ Repayment/Repayment History

ข้อมูลทางการเงินใน Finance Overview เป็นยอดสะสมทั้งหมดตั้งแต่เริ่มต้นทริป ไม่มีตัวเลือกเลือกช่วงวันที่

### กราฟ
Finance Overview ต้องมีกราฟ:
- ค่าใช้จ่ายแยกตามหมวดหมู่
- สัดส่วนยอดเงินที่สมาชิกแต่ละคนสำรองจ่าย
- แสดงตัวเลขสรุปควบคู่กับกราฟ
- รองรับมือถือเต็มรูปแบบ ปรับขนาดตามหน้าจอ และแตะเพื่อดูรายละเอียดได้
- กราฟต้องไม่ล้นหน้าจอหรือทำให้หน้าแน่นเกินไป
- ไม่รวมรายการ Void ในกราฟและยอดรวม

## 18. Project Settings และ Profile / Member

### Project Settings
- มีหน้า/ส่วนตั้งค่าโครงการสำหรับวันเริ่มต้นและวันสิ้นสุดทริป
- เฉพาะเจ้าของโครงการ (ผู้ใช้) เท่านั้นที่แก้ไขวันทริปได้ สมาชิกคนอื่นดูได้อย่างเดียว
- อ่านและเขียนข้อมูลแถวเดียว `setting_id = 1` ใน `public.trip_settings`
- วันที่ทั้งสองค่าอาจเป็น `NULL` พร้อมกันก่อนกำหนด แต่เมื่อกำหนดแล้วต้องเป็นวันที่ถูกต้องและวันเริ่มต้นไม่เกินวันสิ้นสุด
- เมื่อบันทึกสำเร็จให้อัปเดต `updated_at` และบันทึก Audit Log
- การเปลี่ยนวันต้องสะท้อนไปยัง Dashboard, Calendar, Countdown และ Weather จากแหล่งข้อมูลเดียวกัน
- ไม่มี Notification เมื่อเปลี่ยนวันทริป

### Profile / Member

- ใช้ข้อมูลสมาชิกจาก `friends`
- แสดงชื่อสมาชิก
- แสดงข้อมูลส่วนตัวทางการเงิน เช่น ยอดสมทบเงินกองกลาง ยอดสำรองจ่าย และยอดหนี้
- แสดงประวัติ Transaction ของสมาชิก
- ไม่อนุญาตให้แก้ไขหรือลบชื่อสมาชิกผ่านเว็บไซต์
- ไม่มีระบบสมัครสมาชิก
- ใช้ Avatar หรืออักษรย่อแทนรูปโปรไฟล์ได้
- วาง Logout ไว้ใน Profile หรือเมนู More

## 19. Supabase Storage และไฟล์สลิป

- Bucket `payment-slips` เป็น Private
- Backend ตรวจสอบ Session และสิทธิ์ก่อน Upload หรือขอ URL สำหรับดูไฟล์
- Backend ใช้ Supabase SDK สร้าง Signed URL อายุสั้น เช่น 300 วินาทีตามความเหมาะสม
- Database เก็บ Storage Path ไม่เก็บ Signed URL เป็นค่าถาวร
- สมาชิกที่ Login แล้วทุกคนมีสิทธิ์ดูสลิปการเงินทั้งหมดตามกติกาที่ตกลง
- ตรวจสอบชนิดไฟล์และขนาดไฟล์ทั้งฝั่ง Client และ Backend
- รองรับ JPG/JPEG/PNG/PDF ขนาดไม่เกิน 5 MB
- Backend สร้างชื่อไฟล์เอง ไม่ใช้ชื่อไฟล์จากผู้ใช้อย่างเดียว
- หาก Upload สำเร็จแต่ Insert Database ล้มเหลว ต้องมีการจัดการไฟล์กำพร้า (Orphan File)
- หากเครือข่ายขาดระหว่างบันทึก ให้ตรวจสอบสถานะ Transaction ก่อน Retry เพื่อป้องกันรายการซ้ำ
- ภาพสถานที่และ Static Assets เก็บในโปรเจกต์ ส่วนสลิปเก็บใน Supabase Storage
- Optimize รูปภาพสำหรับมือถือและใช้ Lazy Loading ตามความเหมาะสม
- มี Fallback Image เมื่อไฟล์ไม่พบ

## 20. Security

- ใช้ Parameterized SQL ห้ามต่อ String SQL จาก Input โดยตรง
- ป้องกัน XSS และ CSRF
- จำกัด CORS เฉพาะ Domain เว็บไซต์
- ใช้ HTTPS
- Rate Limit Endpoint สำคัญ โดยเฉพาะ Login และการส่ง Transaction
- Validate ข้อมูลทั้ง Frontend และ Backend โดย Backend เป็นผู้ตัดสินสุดท้าย
- ตรวจสอบ Authorization ใน Backend ทุก Endpoint ไม่พึ่งการซ่อนปุ่มใน Frontend
- ป้องกันการกด Submit ซ้ำและ Duplicate Transaction
- ห้ามส่ง Secret หรือ Session ID ไป Frontend หรือ Log
- ห้ามใช้ข้อมูลจาก Cache เป็นแหล่งจริงของยอดการเงิน
- จำกัดสิทธิ์เข้าถึง Backup และไฟล์ Storage

## 21. Error Handling และ Concurrent Use

- หาก Database เชื่อมต่อไม่ได้ ให้แสดงข้อความแจ้งเตือนชัดเจน และห้ามแสดงข้อมูลการเงินเก่าเสมือนเป็นข้อมูลปัจจุบัน
- มี Loading และ Timeout สำหรับ Backend ที่ตอบสนองช้า
- บันทึกไม่สำเร็จต้องแสดง Error ห้ามแสดง Success
- เมื่อเกิด Network Error ระหว่าง Submit ให้ตรวจสอบสถานะรายการก่อนให้ผู้ใช้ Retry
- ใช้ Database Transaction สำหรับการบันทึกหลายตารางที่ต้องสำเร็จหรือยกเลิกพร้อมกัน
- ป้องกันการบันทึกซ้ำจาก Double Click หรือ Request Retry
- การคำนวณทางการเงินต้องยึด Database เป็นแหล่งข้อมูลจริง
- หลังบันทึกสำเร็จให้ผู้ทำรายการเห็นข้อมูลใหม่ทันที
- สมาชิกอื่นเห็นข้อมูลใหม่เมื่อ Refresh หรือ Fetch ข้อมูลใหม่
- ป้องกัน Concurrent Edit ที่ทำให้ข้อมูลของอีกคนถูกเขียนทับ
- เมื่อพบข้อมูลเก่าหรือ Conflict ให้แจ้งและให้โหลดข้อมูลล่าสุด
- ไม่จำเป็นต้องทำ Real-time/WebSocket

## 22. Backup และ Monitoring

- วางแผน Backup YugabyteDB อย่างน้อยวันละครั้ง และเก็บย้อนหลัง 30 วัน หากแพ็กเกจและบริการรองรับ
- สำรองข้อมูล Supabase Storage ด้วย ไม่ใช่สำรองเฉพาะ Database
- ต้องมีแนวทาง Restore Database และไฟล์สลิปให้สัมพันธ์กัน
- ทดสอบ Restore เป็นระยะ
- มี Monitoring สำหรับ Backend, Database, Storage, Error และ Performance โดยเลือกเครื่องมือราคาต่ำหรือ Free Tier ก่อน
- บันทึกเหตุการณ์ทางการเงินที่จำเป็นต่อการตรวจสอบ
- ห้าม Log Password, Secret, Session ID หรือข้อมูลลับ
- ตรวจสอบค่าใช้จ่ายและข้อจำกัดของแพ็กเกจก่อนเปิดใช้จริง

## 23. Git และการทำงานร่วมกัน

- ใช้ Git/GitHub
- `main` เป็น Branch หลัก
- Feature Branch ใช้ได้ตามความเหมาะสม ไม่บังคับ
- เชื่อม GitHub กับ Netlify เพื่อ Deploy อัตโนมัติ
- ไม่บังคับสร้าง Develop Branch หรือ Development Database แยก
- ใช้ Database ที่มีอยู่ด้วยความระมัดระวัง
- หลีกเลี่ยง Test Data ที่อาจปะปนกับข้อมูลทริปจริง
- แบ่ง Commit ตามงาน และทดสอบก่อน Deploy
- ก่อนแก้ไฟล์ใด ให้ตรวจสอบเนื้อหาเดิมและผลกระทบต่อส่วนอื่น

## 24. เมื่อทริปสิ้นสุด

- ไม่ลบหรือปิดระบบอัตโนมัติหลังวันสิ้นสุดทริป
- สมาชิกยังดู Dashboard, Calendar, Places และประวัติย้อนหลังได้
- ประวัติการเงินและสลิปยังคงอยู่
- หนี้คงค้างยังแสดงให้เห็น
- อนุญาตให้สร้าง Expense ย้อนหลังหลังวันสิ้นสุดทริปได้ โดยต้องระบุวันที่เกิดค่าใช้จ่ายจริง และระบบต้องเก็บเวลาที่สร้างรายการจริงแยกต่างหาก
- ระยะแรกไม่ต้องทำ Archive หรือระบบหลายทริป

## 25. การทดสอบ

ต้องทดสอบอย่างน้อย:
- Login, Logout, Session Expiry และ Multi-device
- Authorization ของแต่ละ Endpoint
- Dashboard และการคำนวณยอด
- Calendar และการแสดง Itinerary
- Places และ Detail Page
- Weather และกรณีไม่มีข้อมูลพยากรณ์
- Notifications
- Central Fund และ Upload Slip
- Expense, Split, Debt และ Repayment
- Void และการตรวจสอบ Transaction ที่เชื่อมโยง
- การป้องกัน Duplicate Submit
- Concurrent Requests
- Database/Storage Outage
- Network interruption และ Retry
- Responsive Layout บนมือถือ Tablet Desktop
- Browser ที่กำหนด
- Security และการไม่เปิดเผย Secret

ใช้ Mock/Test Data ในการทดสอบ และห้ามทำให้ข้อมูลการเงินจริงเสียหาย

## 26. Pre-deployment Checklist

ก่อนเปิดใช้งานจริง ต้องตรวจสอบ:
- ตั้ง Environment Variables ครบใน Netlify
- ไม่มี Secret ใน Frontend หรือ GitHub
- `DB_URL` เชื่อมต่อ YugabyteDB ได้จาก Netlify Functions
- ตรวจสอบ TLS, Connection และข้อจำกัด Serverless แล้ว
- Schema จริงตรงกับ Code และไม่มีการเปลี่ยน Schema โดยไม่ได้รับอนุมัติ
- Supabase Bucket เป็น Private
- Signed URL ใช้งานได้และหมดอายุตามกำหนด
- Login, Session, Logout และ Authorization ทำงาน
- ทดสอบ Financial Flow ด้วย Test Data
- ทดสอบ Error/Retry/Duplicate Prevention
- ทดสอบ Responsive และ Browser
- HTTPS ทำงาน
- Backup/Restore มีแนวทางที่ทดสอบแล้ว
- ไม่มี Test Data ปะปนใน Production
- ตรวจสอบค่าใช้จ่ายและข้อจำกัดแพ็กเกจ

## 27. โครงสร้างฐานข้อมูลล่าสุดที่ตรวจสอบแล้ว

ข้อมูลในหัวข้อนี้ตรวจจากไฟล์ CSV ล่าสุดที่ผู้ใช้ส่งเมื่อ 12/11/2026 หลังจากเพิ่มคอลัมน์ใน `expenses_split` และสร้าง `trip_settings` แล้ว โดย Database ที่เชื่อมต่อคือ `travel_sea`, Schema คือ `public`

### 27.1 ตารางและคอลัมน์ปัจจุบัน

#### `friends`

| Column | Type | Nullable | Key |
|---|---|---:|---|
| `f_id` | `character(10)` | NO | PRIMARY KEY |
| `name` | `character varying(255)` | YES | |

#### `central_fund`

| Column | Type | Nullable | Key |
|---|---|---:|---|
| `slips_id` | `character(10)` | NO | PRIMARY KEY |
| `f_id` | `character(10)` | YES | |
| `date` | `date` | YES | |
| `amount_c` | `numeric` | YES | |
| `url_c` | `character(255)` | YES | |

#### `expenses`

| Column | Type | Nullable | Key |
|---|---|---:|---|
| `expenses_id` | `character(10)` | NO | PRIMARY KEY |
| `f_id` | `character(10)` | YES | |
| `type` | `character varying(255)` | YES | |
| `date` | `date` | YES | |
| `amount_e` | `numeric` | YES | |
| `url_e` | `character(255)` | YES | |

#### `expenses_split`

| Column | Type | Nullable | Key |
|---|---|---:|---|
| `expenses_split_id` | `character(10)` | NO | PRIMARY KEY |
| `f_id` | `character(10)` | YES | |
| `amount_r` | `numeric` | YES | |
| `expenses_id` | `character(10)` | YES | |
| `settlement_id` | `character(10)` | YES | |

`expenses_id` และ `settlement_id` เป็นคอลัมน์ที่เพิ่มภายหลังและตรวจพบใน Schema ล่าสุดแล้ว ทั้งคู่ยัง Nullable และยังไม่มี Foreign Key

#### `settlement`

| Column | Type | Nullable | Key |
|---|---|---:|---|
| `settlement_id` | `character(10)` | NO | PRIMARY KEY |
| `tranfer_f` | `character(10)` | YES | |
| `receive_f` | `character(10)` | YES | |
| `amount_s` | `numeric` | YES | |
| `date` | `date` | YES | |
| `url_s` | `character(255)` | YES | |
| `description` | `character varying(255)` | YES | |

ชื่อคอลัมน์ `tranfer_f` สะกดเช่นนี้ใน Database จริง ห้ามเปลี่ยนชื่อเองโดยไม่ขออนุมัติ

#### `trip_settings`

| Column | Type | Nullable | Default / Key |
|---|---|---:|---|
| `setting_id` | `smallint` | NO | Default `1`, PRIMARY KEY |
| `trip_start_date` | `date` | YES | |
| `trip_end_date` | `date` | YES | |
| `updated_at` | `timestamp with time zone` | NO | `CURRENT_TIMESTAMP` |

ตารางนี้ถูกสร้างใน Database `travel_sea` แล้ว มี CHECK Constraint:
- `trip_settings_single_row`: อนุญาตเฉพาะ `setting_id = 1`
- `trip_settings_valid_dates`: อนุญาตให้ทั้งสองวันเป็น `NULL` พร้อมกัน หรือทั้งคู่มีค่าโดยวันเริ่มต้นต้องไม่อยู่หลังวันสิ้นสุด

### 27.2 Constraints ที่ตรวจพบ

- ทุกตารางมี Primary Key ตามที่แสดงในตารางด้านบน
- `trip_settings` มี CHECK Constraints สองรายการตามที่ระบุ
- CSV ล่าสุดไม่แสดง Foreign Key ในตารางใด
- ไม่พบ Foreign Key ระหว่าง `friends`, `expenses`, `expenses_split` และ `settlement`
- การไม่มี Foreign Key ไม่ได้แปลว่าไม่มีความสัมพันธ์ทางตรรกะ แต่ Backend ต้องตรวจสอบความสัมพันธ์เองจนกว่าจะมีการอนุมัติ Migration เพิ่ม Constraint

### 27.3 ข้อจำกัดของ Schema ปัจจุบันและแนวทางพัฒนา

Schema ปัจจุบันยังไม่มีฟิลด์เพียงพอสำหรับทุกข้อกำหนดที่ยืนยันแล้ว เช่น:
- สถานะ Void, เหตุผล, ผู้ Void และเวลา Void ของธุรกรรม
- Description ที่จำเป็นในกรณี Expense ไม่มีสลิป
- Storage path สำหรับไฟล์สลิปที่แยกชัดเจนจาก URL
- ข้อมูล Audit Log
- Session และการจัดการการเปลี่ยน Shared Password
- การเชื่อม Settlement กับ Split หลายแถวผ่าน `expenses_split.settlement_id` ซึ่งมีคอลัมน์แล้ว แต่ยังไม่มี Foreign Key หรือข้อบังคับความสัมพันธ์

ห้ามแก้ Schema ปัจจุบันโดยตรงใน Production โดยไม่ทำ Migration ที่ตรวจสอบแล้ว ต้องตรวจข้อมูลเดิม สำรองข้อมูล วางแผน Rollback และทดสอบในสภาพแวดล้อมที่ปลอดภัยก่อน

## 28. ข้อกำหนดที่ยืนยันแล้วและงานที่ AI Developer ต้องตรวจสอบทางเทคนิค

หัวข้อนี้ไม่ใช่รายการคำถามที่ต้องถามผู้ใช้ซ้ำ แต่เป็นรายการตรวจสอบทางเทคนิคก่อน Implement

1. **Audit Log:** ผู้ใช้อนุมัติให้ AI Developer ออกแบบและสร้างตาราง `audit_logs` ได้ โดยต้องแสดงแบบ Migration ให้ตรวจสอบได้ และรวมเหตุการณ์ Create, Edit, Replace Slip, Void และการแก้ไขข้อมูลทริป
2. **Void fields:** ออกแบบวิธีเก็บสถานะและเหตุผล Void โดยไม่ลบประวัติเดิม และห้ามทำ Cascade Void โดยอัตโนมัติ
3. **Session storage:** ออกแบบตาราง/กลไก Session ฝั่ง Backend ให้รองรับหลายอุปกรณ์และการยกเลิกทุก Session เมื่อเปลี่ยน Shared Password
4. **Expense description:** เพิ่มวิธีเก็บ Description ซึ่งจำเป็นเมื่อ Expense ไม่มี Slip โดยเสนอ Migration ก่อน
5. **Storage path:** ตรวจและเสนอวิธีเก็บ Supabase object path ใน Database แทนการเก็บ Signed URL ถาวร
6. **Foreign Keys / integrity:** วิเคราะห์ความเหมาะสมของ Foreign Key และ CHECK/UNIQUE Constraints โดยตรวจข้อมูลเดิมก่อน ห้ามเพิ่มนอกเหนือจากสิทธิ์ที่ได้รับอนุมัติ
7. **Settlement mapping:** ใช้ `expenses_split.settlement_id` ที่มีอยู่เชื่อม Split หลายรายการกับ Settlement หนึ่งรายการ ต้องตรวจว่าผู้จ่าย/ผู้รับตรงกันและยอดรวมตรงกันก่อนบันทึกแบบ Atomic
8. **Weather Provider:** ตรวจ Forecast Horizon, API Limits, Attribution, Terms และราคา ก่อนเลือกผู้ให้บริการ และแจ้งผู้ใช้ก่อนมีค่าใช้จ่าย
9. **Service Limits:** ตรวจ Netlify Functions, YugabyteDB connections/backup, Supabase Storage limits และค่าใช้จ่ายจริงก่อน Production
10. **Project configuration:** วันทริปอยู่ใน `trip_settings` แล้ว ต้องสร้างหน้า Project Settings ที่เฉพาะเจ้าของโครงการแก้ไขได้
11. **Itinerary parsing:** ตรวจ `plan.json` จริงก่อนทำ Parser รองรับทั้ง Key `place_name` และ `name` โดยไม่แก้ต้นฉบับโดยพลการ
12. **Pre-production review:** ตรวจ Schema CSV ล่าสุดอีกครั้งกับ Database ก่อน Deploy และยืนยันว่า Migration ทุกตัวถูกนำไปใช้จริง

## 29. แผนการพัฒนาเป็น Phase

AI Developer ควรเสนอแผนงานและทำทีละ Phase โดยรอการตรวจสอบผลลัพธ์ในแต่ละช่วง

### Phase 0 — ตรวจสอบก่อนเริ่ม
- อ่านเอกสารทั้งหมด
- ตรวจสอบไฟล์โปรเจกต์
- ตรวจสอบ `plan.json` และ `style-guide.md`
- ตรวจสอบ Schema/Constraints ล่าสุด
- สรุปความไม่ชัดเจนและถามผู้ใช้ก่อนเริ่มส่วนที่เกี่ยวข้อง

### Phase 1 — Project Setup
- ตั้งโครงสร้าง Frontend/Backend
- ตั้งค่า Netlify Functions
- ตั้ง Environment Variables สำหรับ Local/Production
- ทดสอบ YugabyteDB และ Supabase Connectivity โดยไม่เปิดเผย Secret

### Phase 2 — Authentication
- หน้า Login
- เลือกสมาชิก
- Shared Password
- Session Cookie, Logout, Expiry, Rate Limit
- ทดสอบ Multi-device

### Phase 3 — Static Information
- Dashboard เบื้องต้น
- Calendar/Itinerary
- Places Overview/Detail
- Weather
- Responsive UI

### Phase 4 — Notifications
- สร้าง Notification ตาม Event ที่กำหนด
- Mark as Read
- History และ Navigation

### Phase 5 — Finance
- Central Fund
- Expense
- Expense Split
- Debt
- Settlement/Repayment
- Void และประวัติ
- Slip Upload/View
- ทดสอบ Calculation และ Transaction Integrity

### Phase 6 — Security, Testing and Deployment
- Security Review
- Error/Retry/Concurrency
- Backup/Restore
- Responsive/Browser Testing
- Pre-deployment Checklist
- Deploy Production หลังผู้ใช้ตรวจสอบและอนุมัติ

## 30. รูปแบบรายงานความคืบหน้าของ AI Developer

เมื่อจบแต่ละงาน ให้รายงาน:
- ทำอะไรเสร็จแล้ว
- สร้างหรือแก้ไขไฟล์ใด
- มีการเปลี่ยน Schema หรือไม่ (หากมี ต้องมี Approval ก่อน)
- ทดสอบอะไรไปแล้วและผลเป็นอย่างไร
- มีปัญหาหรือข้อจำกัดอะไร
- งานถัดไปคืออะไร
- มีจุดใดต้องให้ผู้ใช้ตัดสินใจก่อนหรือไม่

ห้ามอ้างว่าทดสอบผ่านหากยังไม่ได้ทดสอบจริง และห้าม Deploy Production หาก Checklist ยังไม่ผ่านครบ

---

## 31. ภาคผนวก: ข้อสรุปเพิ่มเติมที่ผู้ใช้ยืนยันภายหลัง

หัวข้อนี้เป็นข้อกำหนดล่าสุดและมีลำดับความสำคัญเหนือข้อความเก่าในเอกสาร หากข้อความส่วนใดขัดกัน ให้ใช้ข้อกำหนดในภาคผนวกนี้

### 31.1 สิทธิ์แก้ไขข้อมูลทริปและสมาชิก
- ไม่มี Admin Role สำหรับระบบการเงิน สมาชิกทุกคนมีสิทธิ์เท่าเทียมกันตามกติกาแต่ละธุรกรรม
- มีสิทธิ์เฉพาะเจ้าของโครงการสำหรับแก้ไขวันทริป Itinerary และข้อมูลที่พัก/ร้านอาหาร/สถานที่ท่องเที่ยวเท่านั้น สิทธิ์นี้ไม่ใช่ Admin สิทธิ์ครอบจักรวาล
- เฉพาะเจ้าของโครงการแก้ไข `plan.json` และข้อมูลสถานที่ได้ สมาชิกอื่นดูได้อย่างเดียว
- ไม่มีระบบเพิ่ม/ลบสมาชิกหรือแก้ชื่อสมาชิกผ่านเว็บไซต์ เปลี่ยนชื่อโดยแก้ Database โดยตรง และใช้ `f_id` เป็นตัวอ้างอิง

### 31.2 Central Fund
- การเติมเงินกองกลางต้องแนบ Slip ตาม Flow เดิม
- ยอดเพิ่มทันทีเมื่อ Backend ยืนยันการบันทึกสำเร็จ ไม่ต้องรออนุมัติ
- สมาชิกคนเดิมเติมหลายครั้งได้ แต่เป็นคนละรายการ
- ผู้สร้างแก้จำนวนเงินไม่ได้ หากผิดให้ Void พร้อมเหตุผลแล้วสร้างรายการใหม่
- ผู้สร้างเปลี่ยน Slip ได้โดยยอดไม่เปลี่ยนและต้องบันทึก Audit Log
- ห้ามลบ Slip โดยไม่แทนที่
- ผู้สร้าง Void รายการของตนได้ทันทีโดยไม่ต้องรออนุมัติ และต้องระบุเหตุผล
- แสดงยอดรวม ยอดรายสมาชิก และประวัติทั้งหมดแก่สมาชิกทุกคน; ทุกคนดู Slip ได้
- รายการ Void อยู่ใน Transaction History แต่ไม่รวมยอดและซ่อนจาก Dashboard

### 31.3 Expenses และ Split
- Payer ถูกกำหนดจากสมาชิกที่สร้าง Expense โดยอัตโนมัติ ห้ามเลือกหรือเปลี่ยน Payer
- Expense มี Slip หรือไม่มีก็ได้ แต่กรณีไม่มี Slip ต้องมี Description
- แก้ Expense ได้ก่อน Split; หลัง Split ล็อกข้อมูลการเงิน แต่แก้ Description, วันที่เกิดค่าใช้จ่าย และแทนที่ Slip ได้ โดยบันทึก Audit Log และไม่เปลี่ยน Debt
- ไม่แจ้ง Notification เมื่อแก้ Description, วันที่ หรือ Slip
- แบ่งค่าใช้จ่ายต้องบันทึกทุก Participant รวม Payer ลง `expenses_split`; Payer ไม่มีหนี้ให้ตัวเอง
- แบ่งไม่เท่ากันระบุเป็นจำนวนเงินหรือเปอร์เซ็นต์ได้ ผลรวมต้องเท่ากับยอดจริงก่อนปัด
- ปัดส่วนรับผิดชอบของแต่ละคนขึ้นเป็นจำนวนเต็มบาท ส่วนต่างเป็นประโยชน์ของ Payer
- แก้ Split ได้เฉพาะเมื่อไม่มี Debt ใดที่เกี่ยวข้องถูกชำระ; หลังแก้ให้คำนวณใหม่และแจ้งสมาชิกที่ได้รับผลกระทบ
- Void Split ทั้งชุดได้โดยเจ้าของ Expense เมื่อไม่มี Debt ใดถูกชำระ ต้องระบุเหตุผลและบันทึก Audit Log; Expense ต้นทางยังอยู่
- หลังทริปจบยังสร้าง Expense ย้อนหลังได้ โดยบันทึกวันที่เกิดจริงและเวลาที่สร้างจริงแยกกัน

### 31.4 Debt และ Settlement
- รวม Debt ของลูกหนี้/เจ้าหนี้คู่เดียวกันเป็นยอดเดียวใน Debt List และเปิดดูรายละเอียด Expense ที่ประกอบยอดได้
- ชำระเต็มยอดรวมเท่านั้น ไม่รองรับ Partial Payment
- Settlement หนึ่งรายการสามารถเชื่อม Debt Split หลายแถวด้วย `expenses_split.settlement_id`
- เมื่อบันทึก Settlement สำเร็จ ให้ถือว่าชำระแล้วทันที ไม่ต้องให้ผู้รับอนุมัติ
- ผู้สร้าง Settlement เปลี่ยน Slip ได้โดยไม่เปลี่ยนยอดหรือสถานะหนี้และต้องบันทึก Audit Log
- แก้ยอด Settlement ไม่ได้ ต้อง Void และสร้างใหม่
- Void Settlement ต้องมีเหตุผล และคืน Debt ทุกแถวที่เชื่อมโยงกลับเป็นค้างชำระ
- หลังทริปจบ สมาชิกยังชำระหนี้ได้ และเพิ่มเงินกองกลางได้ตามปกติ

### 31.5 Slip และ Storage
- Bucket `payment-slips` เป็น Private
- Backend สร้าง Signed URL อายุสั้นเพื่อดู Slip; DB เก็บ Storage Object Path ไม่เก็บ Signed URL ถาวร
- สมาชิกที่ Login แล้วทุกคนดู Slip ของ Central Fund, Expense และ Settlement ได้
- รองรับ JPG/JPEG/PNG/PDF ตามข้อจำกัดขนาดไฟล์ที่ Backend กำหนดและตรวจสอบทั้ง Client/Server
- หาก Upload สำเร็จแต่ DB Insert ล้มเหลว อย่าเพิ่งลบไฟล์ทันที ให้ตรวจสอบก่อนว่าไม่มี Record อ้างถึงแล้วค่อย Cleanup
- หากเครือข่ายขาดระหว่าง Submit ให้ตรวจสถานะกับ Backend/DB ก่อนให้ Retry และใช้ Idempotency Key กับการเขียนข้อมูลสำคัญ
- Slip ที่มีอยู่ห้ามลบแล้วปล่อยว่าง ให้แทนที่ด้วยไฟล์ใหม่เท่านั้น

### 31.6 Session และ Shared Password
- ใช้ Shared Password เดียวกันทุกสมาชิก ไม่มีระบบสมัครสมาชิก
- เก็บ Password Hash ฝั่ง Server เท่านั้น
- Session Cookie เป็น Session Cookie ของ Browser; ปิด Browser แล้วเปิดใหม่ต้อง Login อีกครั้ง
- Session ฝั่ง Server หมดอายุ 7 วันนับจาก Login แบบตายตัว ไม่เลื่อนตามกิจกรรม
- สมาชิกเดียวกัน Login ได้หลายอุปกรณ์ แต่ละอุปกรณ์มี Session แยกกัน
- Logout อุปกรณ์หนึ่งไม่กระทบอุปกรณ์อื่น
- เปลี่ยน Shared Password ให้ยกเลิก Session ทุกอุปกรณ์
- Cookie ต้องมี `HttpOnly`, `Secure`, `SameSite` และมี CSRF protection ที่เหมาะสม
- ไม่เก็บ Login success/failure หรือ Logout ใน Audit Log

### 31.7 Trip End และ Notifications
- หลังวันสิ้นสุดทริป เว็บไซต์ยังใช้งานดูประวัติและชำระหนี้ได้ ไม่ปิดหรือลบข้อมูลอัตโนมัติ
- หลังทริปยังเพิ่มเงินกองกลางและสร้าง Expense ย้อนหลังได้ แต่ไม่เพิ่มกิจกรรมใหม่ใน Itinerary
- Notification มีเฉพาะ 5 เหตุการณ์: เติมเงินกองกลาง, สร้าง Expense, สร้าง Split/เกิดหนี้, ส่ง Settlement, และใกล้วันเดินทาง
- ไม่มี Notification สำหรับการแก้วันทริป/Itinerary/Place, การแก้ Description/วันที่/Slip และ Void
- Notification เป็นประวัติแยกหมวด เรียงกิจกรรมล่าสุด มี Unread Count, Mark as Read และกดไปหน้าที่เกี่ยวข้องได้

### 31.8 ประวัติธุรกรรมและ Audit
- Audit Log เก็บไม่มีกำหนดและรวมใน Backup
- สมาชิกทุกคนอ่านได้ แต่แก้ไข/ลบไม่ได้
- มีหน้าแยก “ประวัติการเปลี่ยนแปลง” และแสดงประวัติย่อใน Transaction Detail
- ค้นหา/Filter ตามประเภทธุรกรรม สมาชิก ช่วงวันที่ และสถานะ
- เรียงล่าสุดไปเก่าสุดเสมอและใช้ Infinite Scroll
- ไม่มี Export Excel/CSV
- Transaction History แสดง Void พร้อมข้อความ “ยกเลิกแล้ว”; Dashboard ซ่อน Void
- ไม่มี Notification สำหรับ Void หรือ Audit Events

### 31.9 Finance Overview
- เมนู Finance เปิดหน้า Finance Overview ก่อน แล้วจึงเข้าหน้าย่อยได้
- แสดงยอดกองกลางรวม ค่าใช้จ่ายรวม หนี้คงค้าง ยอดที่แต่ละคนสำรองจ่าย และยอดหนี้ระหว่างสมาชิก
- มีกราฟค่าใช้จ่ายแยกหมวดหมู่และสัดส่วนยอดที่สมาชิกแต่ละคนสำรองจ่าย
- กราฟปรับขนาดเต็มรูปแบบสำหรับมือถือและแตะเพื่อดูรายละเอียดได้
- ข้อมูลเป็นยอดสะสมทั้งหมดตั้งแต่เริ่มต้นทริป ไม่มีตัวเลือกช่วงวันที่
- ไม่รวมรายการ Void ในยอดและกราฟ

### 31.10 วันทริปและรูปแบบเวลา
- `trip_settings` ถูกสร้างแล้วใน Database `travel_sea`, Schema `public`
- ใช้แถว `setting_id = 1` เก็บ `trip_start_date`, `trip_end_date`, `updated_at`
- เฉพาะเจ้าของโครงการแก้วันทริปผ่าน Project Settings ได้
- วันที่แสดงเป็น พ.ศ. รูปแบบ `DD/MM/YYYY`, เวลา 24 ชั่วโมง, Timezone `Asia/Bangkok`
- `plan.json` ใช้ปี `70` หมายถึง พ.ศ. 2570 / ค.ศ. 2027

### 31.11 การตัดสินใจที่ยังเป็นงานทางเทคนิค ไม่ใช่คำถาม Requirement
AI Developer สามารถเลือกวิธี Implement ที่ปลอดภัยและเรียบง่ายได้ภายในขอบเขตที่อนุมัติ แต่ต้องบันทึกเหตุผลและแจ้งผู้ใช้:
- โครงสร้างและ Migration สำหรับ `audit_logs` (สร้างได้ตามที่ผู้ใช้อนุมัติ)
- โครงสร้าง Session ฝั่ง Server
- ฟิลด์ Void/Description/created_at/Storage Path ที่ยังขาด
- การตรวจสอบความสัมพันธ์และข้อเสนอ Foreign Key/Constraints
- การเลือก Weather Provider และไลบรารีกราฟ โดยต้องตรวจราคา/ข้อจำกัดก่อน
- การจัดการ Netlify Functions กับ Connection Pooling ของ YugabyteDB
- รูปแบบ Idempotency และการบันทึกหลายตารางแบบ Atomic

หากการตัดสินใจใดต้องเพิ่มค่าใช้จ่าย เปลี่ยนเทคโนโลยีหลัก ทำให้ข้อมูลเดิมเปลี่ยนแปลง หรือมีความเสี่ยงต่อข้อมูลการเงินจริง ต้องแจ้งและขออนุมัติก่อน

