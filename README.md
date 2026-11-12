# ทริปทะเล 2027 🏖️ (Group Beach Trip WebApp)

เว็บไซต์สำหรับกลุ่มเพื่อนเพื่อเตรียมตัวและวางแผนทริปเที่ยวทะเลเกาะล้าน พร้อมระบบบันทึกแผนการเดินทาง ข้อมูลสถานที่ท่องเที่ยว พยากรณ์อากาศ และระบบจัดการการเงินกลุ่มแบบครบวงจร

---

## 🌟 ฟังก์ชันหลัก

1. **Dashboard & Countdown:**
   * นับถอยหลังสู่วันเดินทาง
   * สรุปยอดเงินกองกลาง ค่าใช้จ่ายรวม และหนี้คงค้าง
   * สรุปสถานะการเงินส่วนบุคคลของสมาชิกที่เข้าสู่ระบบ
   * การ์ดสถานที่ท่องเที่ยวและที่พักแนะนำ
   * สรุปพยากรณ์อากาศเกาะล้านแบบย่อ

2. **แผนการเดินทาง (Itinerary):**
   * แสดงกิจกรรมแยกตามวัน (5 วัน) จาก `plan.json`
   * บอกเวลาเริ่มต้น-สิ้นสุด รายละเอียดกิจกรรม ค่าใช้จ่ายโดยประมาณ
   * ปุ่มเปิดตำแหน่งบน Google Maps โดยตรง

3. **สถานที่สำคัญ (Places):**
   * ข้อมูลสถานที่ท่องเที่ยวหลัก (เกาะล้าน), ที่พักแนะนำ (ชลิตา กู๊ดวิว), และจุดต่อรถ/เรือ
   * แยกหมวดหมู่ ค้นหา และดูรูปภาพประกอบ

4. **พยากรณ์อากาศ (Weather):**
   * เชื่อมต่อข้อมูลสภาพอากาศจาก **Open-Meteo API** (พยากรณ์ล่วงหน้า 14 วัน)
   * แสดงอุณหภูมิสูงสุด-ต่ำสุด โอกาสเกิดฝน ปริมาณฝน และสภาพท้องฟ้า

5. **ระบบการเงินกลุ่ม (Finance Hub):**
   * **Finance Overview:** กราฟแท่งสรุปค่าใช้จ่ายแยกตามหมวดหมู่ และสัดส่วนยอดสำรองจ่ายรายบุคคล
   * **Central Fund (เงินกองกลาง):** สมาชิกเติมเงินกองกลางพร้อมแนบสลิปผ่าน Supabase Storage (Private)
   * **Record Expenses (สำรองจ่าย):** สมาชิกบันทึกค่าใช้จ่ายสำรองจ่าย พร้อมแนบสลิปหรือระบุคำอธิบาย
   * **Expense Split (หารค่าใช้จ่าย):** เลือกระบุผู้ร่วมหาร ระบบปัดเศษขึ้นเป็นจำนวนเต็มบาทให้ผู้จ่ายตามกติกา
   * **Debt List & Repayment (รายการหนี้และชำระเงิน):** รวมยอดหนี้คู่เดียวกันเป็นก้อนเดียว ชำระเต็มยอดพร้อมแนบสลิปโอนเงิน ยอดอัปเดตแบบ Atomic Transaction
   * **Void Policy & Audit Logs:** นโยบายยกเลิกรายการโดยไม่ลบประวัติ พร้อมบันทึกทุกความเคลื่อนไหวลงในตาราง `audit_logs`

6. **ระบบการแจ้งเตือน (Notifications):**
   * แจ้งเตือนเมื่อมีเพื่อนเติมเงินกองกลาง, บันทึกค่าใช้จ่าย, หารค่าใช้จ่าย หรือชำระหนี้

---

## 🛠️ เทคโนโลยีที่ใช้

* **Frontend:** HTML5, CSS3 (Glassmorphism Design System ตาม `style-guide.md`), Vanilla JavaScript, Lucide Outline Icons, Google Fonts (IBM Plex Sans Thai)
* **Backend:** Node.js บน Netlify Serverless Functions
* **Database:** YugabyteDB Cloud (PostgreSQL Compatible)
* **Storage:** Supabase Storage (Private Bucket: `payment-slips`)
* **Weather API:** Open-Meteo API

---

## 🚀 การติดตั้งและรันในเครื่อง (Local Development)

โปรเจกต์นี้มี Node.js v20 LTS แบบ Portable พร้อมใช้งานในตัว:

```bash
# 1. ติดตั้ง Dependencies (ทำครั้งแรก)
npm install

# 2. รัน Local Development Server
npm start
# หรือ
npm run dev
```

เปิดเบราว์เซอร์ไปที่: `http://localhost:8888`

* **รหัสผ่านกลาง (Shared Password):** กำหนดไว้ใน `.env` (ค่าเริ่มต้น: `ideal_sea_051211`)

---

## ☁️ การนำขึ้นใช้งานจริงบน Netlify (Deployment)

1. ทำการ Push โค้ดขึ้น GitHub Repository
2. เข้าสู่ [Netlify Dashboard](https://app.netlify.com) แล้วเลือก **Add new site > Import an existing project**
3. เลือก Repository นี้ โดย Netlify จะอ่านการตั้งค่าจาก [netlify.toml](file:///Users/nxpze/Documents/GitHub/sea_webapp/netlify.toml) อัตโนมัติ:
   * **Publish directory:** `src`
   * **Functions directory:** `netlify/functions`
4. ตั้งค่า **Environment Variables** ใน Netlify (Site settings > Environment variables):
   * `DB_URL`
   * `SUPA_URL`
   * `SUPA_PUBLISHABLE_KEY`
   * `SUPA_SECRET_KEY`
   * `SHARED_PASSWORD`
   * `SESSION_SECRET`
5. คลิก **Deploy Site** เพื่อเปิดใช้งานผ่าน Public URL
