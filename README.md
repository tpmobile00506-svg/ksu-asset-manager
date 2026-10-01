# ระบบบริหารจัดการครุภัณฑ์ (KSU Asset Manager)

ระบบบริหารจัดการครุภัณฑ์ คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม มหาวิทยาลัยกาฬสินธุ์

Built with **Next.js 15**, **PostgreSQL (Neon)**, **Prisma ORM**, **TypeScript**

---

## การติดตั้งสำหรับการพัฒนา

```bash
npm install
npm run dev
```

แอปจะรันที่ `http://localhost:3000`

---

## Environment Variables

สร้างไฟล์ `.env` ที่ root โดยอ้างอิงจาก `.env.example`:

```env
DATABASE_URL="postgresql://..."
SESSION_SECRET="your-secret-key"
FRONTEND_ORIGIN="http://localhost:3000"
SESSION_COOKIE_SECURE=false

# บัญชี Admin เริ่มต้น (ใช้ตอน db:seed ครั้งแรก)
ADMIN_EMAIL="admin@ksu.ac.th"
ADMIN_PASSWORD="AdminPassword2026!"
ADMIN_NAME="ผู้ดูแลระบบ (Admin)"
```

---

## คำสั่งฐานข้อมูล

```bash
npm run db:generate   # สร้าง Prisma Client
npm run db:deploy     # รัน migrations
npm run db:seed       # สร้างบัญชี Admin เริ่มต้น
```

---

## การ Build และ Deploy

```bash
npm run build    # Build production bundle
npm start        # เปิดเซิร์ฟเวอร์ production
```

---

## การทำงานหลัก

- **ทะเบียนครุภัณฑ์** — ค้นหา กรอง เรียงลำดับ และพิมพ์ QR Code
- **นำเข้า Excel** — ตรวจทานข้อมูลก่อนยืนยันเข้าระบบ
- **แบ่งล็อต** — แยกรหัสช่วงเป็นครุภัณฑ์อิสระโดยยอดรวมเท่าเดิม
- **คำขอและโอนย้าย** — ส่งคำขอโอนย้าย ซ่อม จำหน่าย พร้อมสายอนุมัติ
- **ตรวจนับประจำปี** — สแกน QR บันทึกผลการตรวจนับ
- **รายงาน** — คำนวณค่าเสื่อมราคาตามระเบียบกระทรวงการคลัง
- **Audit Trail** — บันทึกทุกการเปลี่ยนแปลงแบบ Real-time

---

## ผู้ใช้งาน 5 กลุ่ม (Roles)

| Role | ชื่อภาษาไทย | สิทธิ์ |
|------|------------|--------|
| staff | เจ้าหน้าที่พัสดุ (Staff) | นำเข้า Excel, แก้ไขข้อมูล, ตรวจนับ |
| head | หัวหน้าสาขา (Head) | อนุมัติคำขอขั้นที่ 1 |
| deputy | รองคณบดี (Deputy) | อนุมัติคำขอขั้นที่ 2 |
| dean | คณบดี (Dean) | อนุมัติขั้นสุดท้าย |
| admin | ผู้ดูแลระบบ (Admin) | จัดการผู้ใช้, ตั้งค่าระบบ, สายอนุมัติ |

**สายอนุมัติเริ่มต้น:** หัวหน้าสาขา → รองคณบดี → คณบดี

---

## การทดสอบ

```bash
npm test              # Unit tests
npm run typecheck     # TypeScript type check
npm run build         # ตรวจสอบ build ก่อน deploy
```

---

## Repository

- **Production:** https://github.com/tpmobile00506-svg/ksu-asset-manager
- **สังกัด:** คณะวิศวกรรมศาสตร์และเทคโนโลยีอุตสาหกรรม มหาวิทยาลัยกาฬสินธุ์
