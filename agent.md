# Agent Handover Log & Task State: PEA Smart Vehicle
**ระบบตรวจสภาพและบริหารยานพาหนะอัจฉริยะ การไฟฟ้าส่วนภูมิภาค (PEA)**  
**บันทึกล่าสุดเมื่อ:** 2026-09-21 (สำหรับใช้ปฏิบัติงานต่อในวันพรุ่งนี้)  
**เวอร์ชันปัจจุบันของระบบ:** v0.7.22  
**พาธโปรเจกต์:** D:\PEA SMART
**เว็บ Online (GitHub Pages):** https://book-pon.github.io/pea-smart-vehicle/

---

## 1. สรุปภาพรวมและงานที่ได้ดำเนินการเสร็จสิ้นในวันนี้ (Completed Tasks)

### 1.1 การปรับปรุง UI/UX และมาตรฐาน กฟภ. (PEA Standards & Styling)
- **Safety Orange Design Overrides:**
  - ปรับปุ่ม Action หลักทั้งหมดเป็นสไตล์ Safety Orange (#ff6600) พื้นหลังส้ม ตัวอักษรและไอคอนสีดำเข้ม (#000000) คมชัดสูงตามข้อกำหนดความปลอดภัย กฟภ.
  - รองรับ Sunlight Mode (โหมดกลางแดด คอนทราสต์สูง) สำหรับใช้งานตรวจสภาพกลางแจ้ง
  - รองรับ Responsive Header (หน้าจอ < 1150px) ซ่อนข้อความยาว แสดงปุ่มไอคอนและลด Padding ให้ไม่ล้นจอ
- **การบันทึกเชื้อเพลิงแบบทางการ:**
  - ปรับใช้ภาษาทางการ บันทึกการเติมน้ำมันเชื้อเพลิง (ลิตร) และ ระดับน้ำมันเชื้อเพลิงคงเหลือ: ร้อยละ XX%
  - นำปุ่มเลือกระดับน้ำมันเชื้อเพลิงออกจากส่วนหัวตามคำขอ

### 1.2 สรุปผลการตรวจสอบสภาพรถยนต์เป็นกราฟวงกลม (Pie / Doughnut Chart)
- ติดตั้ง **Chart.js** Doughnut Chart ในหน้า **แดชบอร์ดควบคุม (Supervisor)**
- แยกสัดส่วนสถานะ 3 กลุ่มสีตามมาตรฐานความปลอดภัย:
  - 🟢 **พร้อมใช้งาน (READY)** - #10b981
  - 🟡 **เฝ้าระวัง (WARNING)** - #f59e0b
  - 🔴 **งดใช้งาน (CRITICAL)** - #ef4444
- มี Custom Interactive Legend คำนวณจำนวนคันและเปอร์เซ็นต์สัดส่วน (%) แบบเรียลไทม์
- สามารถคลิกที่เสี้ยวของกราฟเพื่อกรองรายการรถในตารางด้านล่างได้ทันที

### 1.3 เชื่อมต่อฐานข้อมูล Google Sheets (PEA Fleet Database)
- สร้างโมดูล js/googleSheetService.js สำหรับส่งข้อมูลแบบ Client-side ผ่าน Google Apps Script Web App (doPost)
- เชื่อมต่อการส่งข้อมูลแบบ Real-time Auto-Sync:
  1. การส่งผลตรวจสภาพประจำวัน (Sheet: Inspections)
  2. การอนุมัติงานซ่อมของหัวหน้างาน (Sheet: RepairApprovals)
  3. การลงทะเบียนยานพาหนะคันใหม่ (Sheet: Vehicles)
- เพิ่มหน้าต่างตั้งค่า **ฐานข้อมูล Google Sheet** บนแถบ Header พร้อม:
  - ช่องใส่ Web App URL
  - โค้ด Google Apps Script สำเร็จรูปพร้อมปุ่ม **คัดลอกโค้ดทั้งหมด** ในคลิกเดียว
  - ปุ่มทดสอบการเชื่อมต่อ (	estConnection)
  - ปุ่มสำรองข้อมูลและส่งออกเป็นไฟล์ **CSV (UTF-8 BOM)** ภาษาไทยไม่เพี้ยน

### 1.4 ระบบตรวจสอบและแจ้งเตือนการบันทึกเลขไมล์ (Mileage Tracking & Alert System)
- **อ้างอิงจาก:** feature_request.md
- **ฟังก์ชันการทำงาน:**
  1. **Data Entry:** แยกช่องบันทึก **เลขไมล์ก่อนออกปฏิบัติงาน (Start Mileage)** และ **เลขไมล์หลังปฏิบัติงาน (End Mileage)**
  2. **Live Calculation:** คำนวณ ผลต่างระยะทาง = เลขไมล์หลัง - เลขไมล์ก่อน แบบเรียลไทม์ขณะพิมพ์
  3. **Validation:** ป้องกันการกรอกเลขไมล์หลังน้อยกว่าเลขไมล์ก่อน (แจ้งเตือนไมล์ลดลง)
  4. **Emergency Alert Criteria (> 10,000 กม.):**
     - หากผลต่างระยะทางเกิน 10,000 กิโลเมตร ระบบจะส่ง **Broadcast Alert (เสียงเตือนฉุกเฉิน + Web Push + Pop-up)** ทันที
     - ส่งสัญญาณแจ้งเตือนไปยัง 2 กลุ่มเป้าหมาย:
       1. **หัวหน้างาน (Supervisor / CHIEF)**
       2. **ช่างซ่อมบำรุง (Maintenance Technician / MECHANIC)**
     - บันทึกลงใน **Activity Logs** เป็นประเภท MILEAGE_ANOMALY_ALERT ระดับ CRITICAL
     - ซิงค์คอลัมน์ผลต่างระยะทางและสถานะแจ้งเตือนเข้า Google Sheets
     - นำข้อมูลเลขไมล์ก่อน-หลัง และผลต่างระยะทางไปแสดงใน **ใบรับรองตรวจสภาพทางการ กฟภ. (A4/PDF)**

### 1.5 ปรับโครงสร้างแบบฟอร์มข้อมูลปฏิบัติงาน 4 ส่วน (Operational Form Restructuring)
- **ส่วนที่ 1: ข้อมูลยานพาหนะ (Vehicle Info)**: เลือกรถยนต์คันที่นำไปปฏิบัติงาน (เลขทะเบียน, ยี่ห้อ/รุ่น)
- **ส่วนที่ 2: ข้อมูลทั่วไปและงานที่ปฏิบัติ (General Info)**:
  - ช่องกรอก **รหัสพนักงาน** (ปรับเป็นแป้นพิมพ์ตัวเลข `inputmode="numeric"`)
  - ช่องกรอก **ชื่อ-นามสกุล** ผู้ปฏิบัติงาน
  - ช่องกรอก **งานที่ต้องปฏิบัติ (ภารกิจ)** ขนาดกว้างพิเศษ รองรับรายละเอียดภารกิจหน้างาน
- **ส่วนที่ 3: ข้อมูลการเดินทาง (Mileage Info - Grid Layout)**:
  - จัดกลุ่มเป็น Grid สวยงาม มี **เลขไมล์ไป (ก่อนงาน)**, **เลขไมล์กลับ (หลังงาน)** พร้อม Numeric Keyboard
  - แสดงผลต่างระยะทางสดแบบเรียลไทม์ (คำนวณอัตโนมัติ)
- **ส่วนที่ 4: ข้อมูลเชื้อเพลิง (Fuel Info)**:
  - ช่องกรอก **น้ำมันเชื้อเพลิงที่เติม (ลิตร)** พร้อม Numeric Keyboard (`inputmode="decimal"`)
- **การจัดวาง Responsive & Mobile-friendly**:
  - บนจอมือถือ ฟอร์มจะเรียงลงมาทีละบรรทัดอย่างเป็นระเบียบ (Stacking) ไม่อึดอัด ระยะห่าง Padding/Margin สบายตา
  - รองรับการบันทึกลง Activity Logs, Google Sheets และเอกสารรับรอง A4/PDF ครบทุกช่องข้อมูล

### 1.6 ระบบจัดการข้อมูลยานพาหนะแบบยืดหยุ่น (Vehicle Management - Add & Delete)
- **ปุ่ม "+ เพิ่มรถยนต์คันใหม่"**: วางไว้ข้างหัวข้อส่วนที่ 1 เมื่อคลิกจะเปิด Modal ฟอร์มที่กระชับและคล่องตัว:
  - **ตัดช่องข้อมูลที่ไม่จำเป็นออก 3 ช่องตามคำขอ**:
    1. *รหัสยานพาหนะ กฟภ. (Vehicle ID)*: ตัดออก (ระบบสร้างรหัสมาตรฐานให้อัตโนมัติตามทะเบียน เช่น `PEA-PK-XXXX`)
    2. *ระดับน้ำมันเชื้อเพลิงเริ่มต้น*: ตัดออก (ระบบกำหนดค่าเริ่มต้น 100% ให้อัตโนมัติ)
    3. *พนักงานขับรถประจำ*: ตัดออก (ระบบกำหนดพนักงานขับรถส่วนกลางให้อัตโนมัติ และจะใช้ชื่อผู้ขับขี่จริงจากฟอร์มตรวจสภาพ)
  - **คงเหลือเฉพาะช่องข้อมูลสำคัญ**: หมายเลขทะเบียน, ยี่ห้อและรุ่นรถ, ประเภทยานพาหนะ, เลขไมล์เริ่มต้น, และวันหมดอายุภาษี
- **ปุ่ม "ลบข้อมูลรถยนต์" (ถังขยะสีแดง)**: วางอยู่ติดกับ Dropdown เลือกยานพาหนะ
- **Confirmation Dialog**: มีหน้าต่างแจ้งเตือนยืนยันก่อนลบ แสดงรายละเอียดรถ (ทะเบียน, รุ่น, รหัสรถ, เลขไมล์) พร้อมปุ่มยืนยัน ป้องกันการเผลอลบ
### 1.7 ปรับปรุงระบบเลือกวันหมดอายุภาษี (Tax Expiry Date Picker Enhancement)
- **จัดเรียงตามรูปแบบ วัน / เดือน / ปี พ.ศ. (Day / Month / Year Layout):**
  - **วัน (Day):** ตัวเลข `01 - 31`
  - **เดือน (Month):** ตัวเลข `1 - 12` เพียวๆ ตามคำขอ (ไม่มีตัวย่อชื่อเดือนภาษาไทย สะอาดตาและเรียบง่าย)
  - **ปี พ.ศ. (Year):** แสดงเฉพาะ **ปี พ.ศ.** ชัดเจน (`2569`, `2570`, `2571`, `2572`, `2573`, `2574`) ไม่ต้องแสดง ค.ศ.
- **ค่าเริ่มต้น (Default Date):**
  - ค่าเริ่มต้นตั้งต้นที่: **วัน 31 / เดือน 12 / ปี พ.ศ. 2569**
### 1.8 ระบบแก้ไขข้อมูลยานพาหนะ (Vehicle Profile Edit)
- **ปุ่มแก้ไขประวัติรถยนต์ (Edit Button):**
  - ติดตั้งปุ่มไอคอนดินสอ (`<i class="fa-solid fa-pen-to-square"></i>`) สีอำพัน ข้าง Dropdown เลือกยานพาหนะ ติดกับปุ่มลบ (ถังขยะ)
  - คลิกแล้วเปิด Modal **"แก้ไขข้อมูลยานพาหนะ กฟภ."** พร้อมดึงข้อมูลรถคันปัจจุบันมาเติมในฟอร์มทันที
- **ข้อมูลที่สามารถแก้ไขได้:**
  1. หมายเลขทะเบียนรถ
  2. ยี่ห้อและรุ่นรถ
  3. ประเภทยานพาหนะ (กระบะ 4x4, บรรทุกเครน, กระเช้า, ตรวจการ)
  4. เลขไมล์สะสมล่าสุด (กม.)
  5. วันหมดอายุภาษีประจำปี (เลือก วัน / เดือน / ปี พ.ศ.)
- **การอัปเดตระบบและการซิงค์:**
  - บันทึกลง LocalStorage และ Activity Logs (ประเภท `EDIT_VEHICLE`)
  - ซิงค์การเปลี่ยนแปลงไปยัง Google Sheets อัตโนมัติ
### 1.9 ระบบดึงข้อมูลพนักงานอัตโนมัติ (Auto-fetch Employee Info)
- **การทำงานอัตโนมัติ (Auto-fetch On-the-fly):**
  - เมื่อผู้ใช้งานพิมพ์หรือกรอก **รหัสพนักงาน** ลงในช่อง (เช่น `512446`) ระบบจะค้นหาข้อมูลจากฐานข้อมูลพนักงาน กฟภ. และเติม **ชื่อ-นามสกุล ผู้ปฏิบัติงาน** ลงในช่องถัดไปทันที
  - แสดงรายละเอียดเพิ่มเติม: ป้าย Badge สีเขียว `พบข้อมูล กฟภ.`, ตำแหน่งงาน และสังกัด/แผนกปฏิบัติการ
  - กำหนดรหัสเริ่มต้นเป็น `512446` เพื่อความสะดวกรวดเร็วในการทดสอบและใช้งาน
- **กรณีไม่พบรหัสพนักงาน (Not Found Handling):**
  - แสดง Badge สีแดง `ไม่พบรหัส` พร้อมข้อความแจ้งเตือนเบาๆ:
    > ⚠️ *ไม่พบข้อมูลพนักงาน กรุณาตรวจสอบรหัสอีกครั้ง*
  - ระบบยังคงอนุญาตให้ผู้ใช้งานพิมพ์ระบุชื่อ-นามสกุลด้วยตนเองได้ เพื่อความยืดหยุ่นในกรณีพนักงานใหม่หรือบุคคลภายนอก

### 1.10 ระบบจัดการฐานข้อมูลพนักงาน (Employee Database Management)
- **ฐานข้อมูลหลักพนักงาน (Employee Master Data):**
  - จัดเก็บใน `LocalStorage` คีย์ `pea_employees` และมี Fallback จาก `PEA_EMPLOYEES`
  - โครงสร้างข้อมูลประกอบด้วย: `id` (รหัสพนักงาน), `name` (ชื่อ-นามสกุล), `position` (ตำแหน่ง), `dept` (สังกัด/แผนก)
  - รองรับ CRUD ครบถ้วนใน `js/db.js`: `getEmployees()`, `getEmployeeById()`, `saveEmployee()`, `deleteEmployee()`
- **หน้าจอจัดการรายชื่อพนักงาน (Employee Master Modal):**
  - ติดตั้งปุ่ม **"จัดการรายชื่อพนักงาน"** บนหัวข้อส่วนที่ 2 (General Info)
  - แสดงตารางรายชื่อพนักงานทั้งหมดในระบบ พร้อมจำนวนพนักงานรวม
  - **ฟังก์ชันเพิ่มพนักงาน (+ เพิ่มพนักงานใหม่):** กรอกรหัส, ชื่อ-นามสกุล, ตำแหน่ง, สังกัด และบันทึกเข้าสู่ระบบ
  - **ฟังก์ชันแก้ไขข้อมูลพนักงาน (ไอคอนดินสอ):** ดึงข้อมูลเดิมมาแก้ไขและบันทึกอัปเดต
  - **ฟังก์ชันลบข้อมูลพนักงาน (ไอคอนถังขยะ):** มีระบบยืนยันก่อนลบ ป้องกันการเผลอลบ
- **การทำงานร่วมกับฟอร์มหลักแบบเรียลไทม์:**
  - เมื่อเพิ่มหรือแก้ไขข้อมูลพนักงาน หากรหัสนั้นกำลังถูกกรอกหรือใช้งานอยู่ในฟอร์มหลัก ระบบจะอัปเดตชื่อผู้ปฏิบัติงานให้ทันทีโดยไม่ต้องรีโหลดหน้าเว็บ

### 1.11 เงื่อนไขความปลอดภัยและการแสดงผลช่องชื่อ-นามสกุล (Strict Clear Condition)
- **ช่องชื่อ-นามสกุลว่างเปล่าเสมอเมื่อไม่มีรหัสพนักงาน (Clear / Empty State):**
  - ยกเลิกการใส่ค่าเริ่มต้นอัตโนมัติ (Default Prefill) และไม่ดึงชื่อพนักงานขับรถมาค้างไว้
  - หากช่อง 'รหัสพนักงาน' ว่างอยู่ ช่อง 'ชื่อ-นามสกุล ผู้ปฏิบัติงาน' จะต้อง **ว่างเปล่า (Empty)** 100%
  - ช่องชื่อ-นามสกุลจะแสดงข้อมูลก็ต่อเมื่อ **มีการกรอกรหัสพนักงานที่ตรงกับฐานข้อมูล กฟภ. เท่านั้น**
  - หากกรอกรหัสพนักงานแล้วลบออก หรือกรอกรหัสที่ไม่พบในระบบ ช่องชื่อ-นามสกุลจะถูกล้างค่าให้ว่างเปล่าทันที

### 1.12 แท็บใหม่: บันทึกขากลับและติดตามรถออกปฏิบัติงาน (Tab 5: Active Trips & Return Mileage)
- **แท็บ 5. บันทึกขากลับ (Active Trips) บนแถบเมนูหลัก:**
  - เพิ่มแท็บที่ 5 บน Navigation Bar พร้อม Badge ตัวเลขนับจำนวนคันที่กำลังออกปฏิบัติงานแบบ Real-time
  - รวบรวมรถยนต์ทุกคันที่กำลังอยู่ในสถานะออกปฏิบัติงาน (ยังไม่ได้ปิดงาน)
  - แสดงข้อมูลสรุปครบถ้วนในแต่ละรายการ:
    1. **หมายเลขทะเบียนรถและรุ่นรถยนต์**
    2. **ชื่อผู้ปฏิบัติงานและรหัสพนักงาน**
    3. **งานที่ต้องปฏิบัติ (ภารกิจ)** และวันที่นำรถออก
    4. **เวลาออกและเลขไมล์ขาไป (Start Mileage)** ที่เคยบันทึกไว้
    5. **สถานะการทำงาน:** กำลังปฏิบัติงาน (Active Pulsing Badge)
- **ปุ่มบันทึกขากลับ / สิ้นสุดภารกิจ:**
  - มีปุ่ม **"บันทึกขากลับ"** (สี Safety Orange) ในทุกรายการรถที่กำลังออกปฏิบัติงาน
  - พร้อมปุ่มเปิดฟอร์มตรวจสภาพเต็มรูปแบบ (Full Checklist) ขากลับ
- **หน้าต่างบันทึกข้อมูลขากลับ (Return Mileage Modal):**
  - ดึงข้อมูลการเดินทางครั้งนั้นขึ้นมาแสดงอัตโนมัติ (ทะเบียน, ผู้ปฏิบัติงาน, ภารกิจ, เวลาออก, เลขไมล์ขาไป)
  - ช่องกรอก **เลขไมล์กลับ (หลังปฏิบัติงาน)**
  - **คำนวณ 'ผลต่างระยะทาง' (ระยะทางที่วิ่งในรอบนี้) ให้อัตโนมัติทันที** แบบ Live Calculation
  - มีระบบตรวจสอบความถูกต้อง: ป้องกันเลขไมล์ลดลง และส่งการแจ้งเตือนฉุกเฉินหากผลต่างระยะทางเกิน 10,000 กม.
  - บันทึกประวัติกิจกรรม (`VEHICLE_RETURN`) และส่งข้อมูลซิงค์เข้า Google Sheets อัตโนมัติ

### 1.13 ปรับปรุงหน้าจอส่วนที่ 3 สำหรับขาไป (Section 3: Start Mileage Simplification)
- **นำช่องที่ไม่เกี่ยวข้องกับขาไปออก (Clean & Focused UI):**
  - นำช่อง **'เลขไมล์กลับ (หลังปฏิบัติงาน)'** ออกจากหน้าจอตรวจสภาพขาไป
  - นำช่อง **'ผลต่างระยะทาง'** ออกจากหน้าจอตรวจสภาพขาไป
- **คงเหลือเฉพาะข้อมูลขาไป:**
  - คงเหลือเฉพาะช่อง **'เลขไมล์ไป (ก่อนปฏิบัติงาน)'** ซึ่งดึงเลขไมล์ล่าสุดของรถยนต์มาแสดงให้อัตโนมัติ
  - ปรับช่องกรอกให้กว้างขึ้นและชัดเจน พร้อมคำอธิบายแนะนำให้ตรวจสอบก่อนกดปุ่ม **"บันทึกรถออกปฏิบัติงาน"**

---

## 2. โครงสร้างไฟล์ปัจจุบันในโปรเจกต์ (File Architecture)

| ไฟล์ / โฟลเดอร์ | หน้าที่และรายละเอียด |
|---|---|
| index.html | โครงสร้างหน้าเว็บหลัก แบ่ง 5 แถบ (Driver, Mechanic, Supervisor, Logs, Active Trips) และโมดอลทั้งหมด |
| css/main.css | สไตล์ CSS หลัก, Safety Orange, Tailwind, Sunlight Mode, A4 Print stylesheet |
| js/vehicleData.js | ข้อมูลคลังรถยนต์ PEA, รายการตรวจสอบ 4 หมวด, Preset จุดชำรุด |
| js/db.js | คลังจัดเก็บ LocalStorage, ระบบจำลองคิวออฟไลน์, Activity Logs Consolidation |
| js/notification.js | ระบบแจ้งเตือนตามบทบาท (Role-based), Web Audio Chimes, Push Notifications |
| js/reportGenerator.js | ตัวสร้างแบบฟอร์มเอกสารรับรองตรวจสภาพทางการ กฟภ. (A4/PDF) พร้อมภาพ Before/After |
| js/googleSheetService.js | ตัวเชื่อมต่อฐานข้อมูล Google Sheets และเทมเพลตโค้ด Apps Script |
| js/app.js | Application Controller หลัก ควบคุมการคำนวณไมล์, กราฟวงกลม, การส่งตรวจสภาพ และเหตุการณ์ทั้งหมด |
| eature_request.md | เอกสารข้อกำหนดระบบตรวจจับและแจ้งเตือนเลขไมล์ |
| เปิดใช้งานระบบ.bat | สคริปต์เปิดเว็บแอปบนเบราว์เซอร์อัตโนมัติ |

---

## 3. สิ่งที่ต้องทำต่อในวันพรุ่งนี้ / แผนงานถัดไป (Next Steps & To-Do)

1. **ทดสอบการใช้งานจริงกับ Google Sheet:**
   - นำ Web App URL ของ Google Apps Script ที่ Deploy จาก Google Sheet จริงมาใส่ในระบบเพื่อทดสอบ End-to-End Real-time Sync
2. **การปรับแต่งระบบรายงานเพิ่มเติม (Optional Enhancements):**
   - เพิ่มฟังก์ชันกรองประวัติการวิ่งและระยะทางสะสมในตารางประวัติกิจกรรม (Logs Filter by Date/Vehicle)
   - ขยายการแสดงกราฟสถิติการใช้น้ำมันเชื้อเพลิงเฉลี่ยต่อระยะทาง (กม./ลิตร)
3. **การทดสอบความเข้ากันได้ของอุปกรณ์สนาม (Field Testing):**
   - ทดสอบการทำงานผ่านแท็บเล็ต/สมาร์ทโฟนของคนขับรถและช่างในสนาม
   - ทดสอบโหมดออฟไลน์เมื่อไม่มีสัญญาณอินเทอร์เน็ต และการซิงค์อัตโนมัติเมื่อกลับมาออนไลน์

---
*บันทึกโดย Antigravity AI Assistant สำหรับโครงการ PEA Smart Vehicle*


## 4. บันทึกการแก้ไขล่าสุด (Latest Resolution - 2026-09-20)
- **ปัญหาที่พบ:** ระบบล่มทั้งหมด (Total Failure) ฟังก์ชันทุกปุ่มไม่สามารถกดใช้งานได้ (1-6) เช่น เพิ่มรถ, นำรถออก, กดเปลี่ยนหน้า ฯลฯ
- **สาเหตุของปัญหา:** เกิด Syntax Error ในไฟล์ js/app.js (บรรทัดที่ 740 ในช่วงฟังก์ชัน submitInspection) เนื่องจากมีการประกาศตัวแปร const fuelSelect และ const fuelRefillInput ซ้ำกัน 2 ครั้งในบล็อกเดียวกัน ส่งผลให้เบราว์เซอร์หยุดอ่านสคริปต์ทั้งหมด ทำให้ตัวแปร app ไม่ถูกกำหนดค่าและปุ่มต่างๆ หายไปจากหน่วยความจำ
- **การแก้ไข:** ลบตัวแปรที่ประกาศซ้ำซ้อนออก และแก้ไขระบบ Bootstrapping ให้กลับมาโหลดคลาสได้อย่างถูกต้องตรงไปตรงมา พร้อมทำการอัปเดตเวอร์ชัน (Cache Busting) เป็น v0.7.1 เพื่อเคลียร์แคชให้ผู้ใช้งานอัตโนมัติ
- **การสำรองข้อมูล:** ได้จัดทำไฟล์ Backup สำหรับเวอร์ชันปัจจุบันที่แก้ไขสมบูรณ์แล้ว ได้แก่ js/app_backup_working_v0.7.1.js และ index_backup_working_v0.7.1.html
## 5. การแก้ไขและอัปเดตระบบล่าสุด (Version 0.7.2 - 0.7.5) - วันที่ 20/09/2026
- **เพิ่มระบบซิงค์ Google Sheets สำหรับข้อมูลขาไปและขากลับ:**
  - สร้างแอคชัน DEPARTURE ใน googleSheetService.js เพื่อบันทึกข้อมูลส่วนที่ 2 (รหัสพนักงาน, ชื่อ, ภารกิจ, เลขไมล์ขาไป) ลงในแท็บ บันทึกรถออก_Departures
- **ปรับแต่งโครงสร้างคอลัมน์:**
  - แยกคอลัมน์ "เลขไมล์ขาไปปฏิบัติงาน" และ "เลขไมล์ขากลับปฏิบัติงาน" ในตารางเดียวกัน
- **แก้ไขบั๊กใหญ่ในฝั่ง Google Apps Script (Version 0.7.5):**
  - **ปัญหา:** ระบบฝั่งขากลับ (INSPECTION) ไม่ยอมอัปเดตช่อง "เลขไมล์ขากลับปฏิบัติงาน"
  - **สาเหตุ:** ตัว Apps Script เกิด Crash (Error) ก่อนจะถึงคำสั่งอัปเดต เนื่องจากตัวแปร payload.defects ถูกส่งมาเป็น String ทำให้ฟังก์ชัน .map() เกิด TypeError ส่งผลให้โค้ดหยุดทำงานกลางคัน
  - **การแก้ไข:** ปรับปรุงโค้ดฝั่ง Apps Script ให้เช็ก Type ของ Array/String ก่อนทำงาน และเพิ่มระบบค้นหาบรรทัด (Fallback Match) จากทะเบียนรถและสถานะ กรณีไม่ได้รับค่า missionId
- **สร้าง Backup แล้ว:**
  - index_backup_working_v0.7.5.html
  - js/app_backup_working_v0.7.5.js
  - js/db_backup_working_v0.7.5.js
  - js/googleSheetService_backup_working_v0.7.5.js

## 6. อัปเดตระบบแจ้งเตือนผ่าน Email (Version 0.7.8) - วันที่ 20/09/2026
### สิ่งที่ได้ทำไปแล้ววันนี้ (Work Done Today):
- **แก้ไขบั๊ก Apps Script (v0.7.5):** แก้ไขบั๊กร้ายแรงใน Google Apps Script ที่ทำให้บันทึกไมล์ขากลับไม่ได้ (เนื่องจากการอ่านค่า defects ผิดพลาด)
- **สลับจาก LINE Notify เป็น Email Alert:** เปลี่ยนระบบการแจ้งเตือนจาก LINE เป็นการส่งอีเมลผ่าน Google Apps Script (MailApp.sendEmail) โดยตรง ซึ่งมีความเป็นทางการกว่า ฟรี และตั้งค่าง่ายกว่า
- **เพิ่ม UI ตั้งค่าอีเมล:** อัปเดตหน้าต่าง "ตั้งค่า Google Sheets" (หัวข้อ 4) ให้สามารถกรอกอีเมลผู้รับการแจ้งเตือนได้หลายคน
- **กำหนดเงื่อนไขการแจ้งเตือน (Thresholds):**
  - แจ้งเตือนรอบ PM: เมื่อเลขไมล์เหลือ 0 กม. หรือชนระยะ 10,000 กม. พอดี
  - แจ้งเตือนต่อภาษี: ล่วงหน้า 7 วัน
- **แก้ไขปัญหาภาษาต่างดาว (Encoding Issues):** กู้คืนไฟล์ทั้งหมดจาก Backup v0.7.5 และเขียนโค้ดทับใหม่ด้วยการเข้ารหัส UTF-8 อย่างเคร่งครัด ทำให้การแสดงผลภาษาไทยสมบูรณ์
- **แบคอัปไฟล์ปัจจุบัน (v0.7.8):** บันทึกโค้ดที่ทำงานได้สมบูรณ์เป็นไฟล์ _backup_working_v0.7.8 ทั้ง 4 ไฟล์หลัก

### สิ่งที่ต้องทำในครั้งต่อไป (Next Steps):
1. **ทดสอบระบบ Email Alert (User Testing):** ผู้ใช้ต้องทดสอบ "บันทึกไมล์ขากลับ" สำหรับรถที่มีระยะทางครบ 10,000 กม. หรือภาษีเหลือต่ำกว่า 7 วัน เพื่อตรวจสอบว่าอีเมลเข้าสู่กล่องจดหมาย (Inbox) ถูกต้องหรือไม่
2. **การปรับแต่งดีไซน์อีเมล (Email Template Customization):** หากผู้ใช้ต้องการแก้ไขรูปแบบสี, ข้อความ, หรือโลโก้ในเนื้อหาอีเมล สามารถปรับแก้ HTML ในฟังก์ชัน checkMaintenanceAlerts
3. **ขยายการแจ้งเตือนจุดชำรุด (Defect Alerts):** ในอนาคตสามารถเพิ่มฟีเจอร์ส่งอีเมลแจ้งเตือนช่างเครื่องยนต์ทันทีเมื่อพนักงานขับรถรายงานว่าพบจุดชำรุดระดับ "วิกฤต"

---

## 7. บันทึกการซ่อม-บูรณะโปรเจกต์ใหม่บนเครื่องปัจจุบัน (Repair & Restore Log) - วันที่ 20/09/2026 (Late Session)

### 7.1 ภารกิจ
- ไฟล์ต้นทางอาศัยอยู่ที่เครื่องเดิม (c:\Users\512446\Desktop\AI ควบคุมยานพาหนะ) จึงต้องบูรณะระบบทั้งชุดใหม่ในโฟลเดอร์ **D:\PEA SMART** ให้รันได้ครบตาม spec v0.7.8

### 7.2 สเต็ปที่ทำแล้ว (Completed Steps)
- **สเต็ป 1 — โครงสร้างโฟลเดอร์:** สร้าง `js/` และ `css/` ย้ายไฟล์ให้ตรงตำแหน่งตาม §2:
  - `js/`: app.js, db.js, vehicleData.js, notification.js, googleSheetService.js, reportGenerator.js
  - `css/`: main.css
- **สเต็ป 2 — กู้คืน reportGenerator.js:** ไฟล์เดิมขาดหายในโฟลเดอร์ทั้งหมด แต่โหลด `reportGenerator.zip` มาวินิจฉัยได้ว่า:
  - ZIP local header (30 ไบต์แรก) ถูกเขียนทับ + ค่าเมตาดาต้าเก่า (CRC 0x70B6BD33, size 19436) ไม่ตรงเนื้อหาจริง
  - แต่ DEFLATE stream ที่ offset **84..4139** ยังสมบูรณ์ → inflate ได้โค้ดครบ **19,388 ไบต์** (`class PEAReportGenerator` + ปิดท้าย `const reportGen = new PEAReportGenerator();`)
  - ภาษาไทยใน zip เป็น **TIS-620/Windows-874** → แปลงเป็น **UTF-8 (+BOM)** เรียบร้อย
- **สเต็ป 3 — สร้าง `index.html`:** คัดลอกจาก `index_backup_working_v0.7.8.html`; ตรวจ path/order ของ script ทั้ง 6 ตัวลง `/js/`, CSS ลง `/css/` ถูกต้อง + เปิดใช้ cache busting `?v=0.7.8`
- **สเต็ป 4 — ยูนิฟายเวอร์ชัน:** แก้ `เปิดใช้งานระบบ.bat` + `agent.md` มาตรา 4 (TIS-620 2 ชั้น/1 ชั้น) ให้เป็น UTF-8 ตรงกัน; ตัวเลขเวอร์ชันถูกตั้งเป็น **v0.7.8**
- **สเต็ป 5 — ตรวจ Cross-reference Global ครบ:** `window.app`, `window.db`, `notifier`, `googleSheet`, `reportGen` + method ทั้งหมดที่เรียกภายใน (db 26 ตัว, googleSheet 6 ตัว, notifier 2 ตัว, reportGen 2 ตัว) ตรงกันกับ definition ทุกตัว ✓
- **สเต็ป 6 — ล้าง Dead-code:** นำ bloc สมัยก่อน (ยังอ้าง `end-mileage-input`, `fuel-level-select`, `mileage-delta-badge` ซึ่งไม่มีใน HTML v0.7.8) ออกจาก `js/app.js` ให้สะอาด; เหลือปัญญา guard ซ่าไฟล์คำสั่ง รัน `node --check` ผ่าน
- **สเต็ป 7 — เติม BOM:** เติม UTF-8 BOM ครบทุกไฟล์ที่ index.html โหลด (index.html, css/main.css, js/*.js ทั้ง 6 ตัว)
- **สเต็ป 8 — รวมเวอร์ชัน:** ปรับ badge/footer/comment/cache-busting ใน index.html + db.js (APP_BUILD_VERSION, log console) + app.js + reportGenerator.js + googleSheetService.js ให้เป็น **v0.7.8** ทั้งหมด
- **ตรวจความสมบูรณ์:** `node --check` ผ่าน 8/8 ไฟล์ JS, assets local ครบ (CDN ภายนอกปกติ), ไฟล์ `check.html` โหลดเห็น (db.js + app.js)
- **ตรวจ syntax:** `node --check` ผ่านทุกไฟล์ JS ครบ

### 7.3 การซ่อม encoding agent.md
- Section 4 (เดิมเป็นคาราโอเกะ) เกิดจากข้อความที่ encode 2 ชั้น → แก้ด้วยการ decode ช่วงไบต์ 27209–28034 เป็น Windows-874 ทดแทน → ปัจจุบัน agent.md เป็น **UTF-8 บริสุทธิ์ 100%** (สแกนไล่ไบต์แล้ว 0 ตัวเสีย ครบ 227 บรรทัด)

### 7.4 สเต็ปรอ (Pending Steps)
- [x] ~~สร้าง `index.html` จาก `index_backup_working_v0.7.8.html` + ตรวจ path/order script~~ → **เสร็จ (สเต็ป 3)**
- [x] ~~แก้ encoding + เวอร์ชันของ `เปิดใช้งานระบบ.bat`~~ → **เสร็จ (สเต็ป 4+8):** ไฟล์ UTF-8/BOM v0.7.8 (โดย decode ช่วงไบต์ใหม่เป็น UTF-8−BOM ไม่ใช่ TIS-620 ตรงกับ `chcp 65001`)
- [x] ~~ล้าง dead-code ใน `app.js` ที่ยังอ้าง element เก่า: `end-mileage-input`, `fuel-level-select`, `mileage-delta-badge`~~ → **เสร็จ (สเต็ป 6)**
- [x] ~~เติม BOM ไฟล์ที่ยังไม่มี (db.js, vehicleData.js, notification.js, css/main.css)~~ → **เสร็จ (สเต็ป 7):** +reportGenerator.js ด้วย (รวม 5 ไฟล์)
- [x] ~~รวมเวอร์ชันเป็น v0.7.8 (HTML badge, footer reportGen, README, .bat)~~ → **เสร็จ (สเต็ป 8):** badge/footer/cache-busting/APP_BUILD_VERSION/log ครบทุกไฟล์ = v0.7.8
- [x] ~~ทดสอบโหลดผ่าน `check.html` และ `index.html` ให้ไม่มี JS error~~ → **ตรวจแล้ว (สเต็ป 9):** `node --check` 8/8, global cross-ref ครบ, สั่งฝั่ง HTML ครบ 6 ตัว + CSS ครบ, BOM ครบทุก asset ที่โหลด ตรวจด้วยสคริปต์แล้ว ✓ (เหลือแค่เปิดเบราว์เซอร์ยืนยันสด — ผู็ใช้งาน)

### 7.5 Google Sheets เป็นฐานข้อมูลสองทาง + Auto-load เช้าแรก (v0.7.9)
- [x] ~~สเต็ป A — Apps Script: เพิ่ม `doGet` แบบ JSONP (`action=READ_ALL&callback=...`) ตอบ `callback({ok, data:{vehicles, employees, inspections, departures}})` ด้วย `MimeType.JAVASCRIPT` + mapper `VEHICLE_FIELD_MAP/EMPLOYEE_FIELD_MAP/INSPECTION_FIELD_MAP/DEPARTURE_FIELD_MAP` + `readSheetRows()` (อ่านจากคอลัมน์ `ข้อมูลเต็ม (JSON)` ก่อน แล้ว fallback จับคู่ header ไทย) + `ensureJsonColumn()` เติมคอลัมน์ `ข้อมูลเต็ม (JSON)` ให้ชีตเก่า~~ → **เสร็จ**: เทมเพลตใน `js/googleSheetService.js` (`PEA_GOOGLE_APPS_SCRIPT_CODE`)
- [x] ~~สเต็ป B — ฝั่งเบราว์เซอร์: `readSnapshot()` inject `<script>`+callback (timeout 15 วิ, cleanup เสมอ), `hasValidSnapshotData()`, `normalizeVehicleRow()`, `mergeVehiclesFromSnapshot()` merge รายคันด้วย `updatedAt` (กันข้อมูลถอยหลัง)~~ → **เสร็จ**: class `PEAGoogleSheetService`
- [x] ~~สเต็ป C — db.js: `enqueueSync` ส่ง GSheet จริงเมื่อออนไลน์ (`syncToGoogleSheets` + `getGoogleSheetsActionFor` map UPDATE_VEHICLE→VEHICLE, DELETE_VEHICLE→VEHICLE, SAVE_TICKET→REPAIR_APPROVAL, ADD_LOG→skip); ยังคิว เมื่อ offline; `processSyncQueue` flush ทีละรายการ คงไว้เฉพาะรายการที่ fail~~ → **เสร็จ** + `replaceVehiclesFromRemote()` (เขียนตรง ไม่ trigger enqueue กลับ กัน echo loop)
- [x] ~~สเต็ป D — app.js: `importFromGoogleSheet()` (readSnapshot→merge→save→render→activity log), `loadFromGoogleSheet()` handler ปุ่มใน modal Step 1, `autoLoadFromGoogleSheetIfNewDay()` เปิดแอปครั้งแรกของวัน (แฟลก `pea_last_gsheet_autoload_date` th-TH)~~ → **เสร็จ**: ปุ่ม "โหลดข้อมูลจาก Google Sheet (ซิงก์ลงเครื่อง)" เพิ่มใน modal แล้ว
- [x] ~~สเต็ป E — บัมพ์ v0.7.9 ทุกจุด (index.html badge/footer/comment+cache-busting `?v=0.7.9`, app.js, db.js APP_BUILD_VERSION, googleSheetService.js, reportGenerator.js, เปิดใช้งานระบบ.bat)~~ → **เสร็จ**: file ใช้งานสะอาด ไม่เหลือ v0.7.8 (agent.md เก็บ v0.7.8 ไว้เป็นประวัติ)
- [ ] **ผู้ใช้ต้องทำการ deploy เอง:** เปิด Google Sheet → Extensions > Apps Script → วางโค้ด `PEA_GOOGLE_APPS_SCRIPT_CODE` ใหม่ทั้งหมด → Deploy ใหม่เป็น Web app (Anyone) → วาง URL ลง modal → กด "ทดสอบส่งข้อมูลทดสอบ" + "โหลดข้อมูลจาก Google Sheet (ซิงก์ลงเครื่อง)"

### 7.6 สเต็ปถัดไป (Pending — PM 10,000 กม.)
- [x] ~~**ปุ่ม "บันทึกการเข้าเช็ค/รีเซ็ตรอบ PM"** — set `lastPmMileage = mileage` ปัจจุบัน~~ → **เสร็จ (v0.7.21):** ปุ่ม "เคลียร์ PM แล้ว" ใน badge + ตารางสรุป → `markPmDone()` จัดการให้
- [ ] **สถานะ PM_DUE** ให้แสดง "ต้องเข้ารับการตรวจเช็คสภาพรถ" ตอน badge/board/คิว (ตอนนี้แจ้งเตือนขึ้นแล้วใน badge/สรุป แต่ status รายการยังเป็น READY ได้)
- [ ] **NaN guard** "อีก NaN กม." หาก `lastPmMileage` undefined
- [x] ~~**ตรวจภาษี + PM เรียกผ่านหลายจุด**~~ → **เสร็จ (v0.7.21):** fleet scan ตอนเปิดแอป + ทุกบันทึกขากล้าง; email แยก 2 ฉบับ ตามบทบาทผู้รับ; lock รอบละครั้ง

---

## 8. แผนกงานล่าสุด — Deploy สู่เว็บสาธารณะ + Email Alert 2 บทบาท (2026-09-21) ★สถานะล่าสุด

### 8.1 สถานภาพปัจจุบัน (ปัจจุบัน = v0.7.22)
- **เว็บเปิดได้ผ่านอินเทอร์เน็ต (ทุกคนใช้งานได้):** `https://book-pon.github.io/pea-smart-vehicle/`
  - Repo: **public** `BooK-PON/pea-smart-vehicle` — branch คือ **`master`** (ไม่ใช่ main!) → push ทุกครั้งผ่าน `git push origin master`
  - GitHub CLI (`gh`) ล็อกอินเป็น **BooK-PON** แล้ว พร้อมใช้
  - **หมายเหตุ:** repo เป็น public + ไม่มีรหัสผ่าน (ตามที่ผู้ใช้ขอ "ให้ทุกคนใช้ได้") ถ้าต้องการจำกัดสิทธิ์ต้องเพิ่มระบบ Login ภายหลัง
- **ฐานข้อมูลกลาง = Google Sheets** / แอปเป็นแบบ offline-first: เครื่องใคร = localStorage ของเครื่องนั้น แต่ข้อมูลที่บันทึก push ขึ้นชีตกลาง และปุ่ม "โหลดจาก Google Sheet" ดึงกลับมา
- **GAS Web App URL ที่ฝังเป็นค่าเริ่มต้น (ผู้ใช้ไม่ต้องกรอก):**  
  `https://script.google.com/macros/s/AKfycbwLoz2fsJtENGH-VFz4T9VozHGAvEXMR0PltRNGDtjC4XkUSXOvJR0092yJkKnZnynkRA/exec`  
  อยู่ที่ `js/googleSheetService.js` → `this.DEFAULT_WEBAPP_URL` (ผู้ใช้สามารถเปลี่ยนเป็นของตัวเองได้ในเมนูตั้งค่า เก็บใน localStorage ต่อเครื่อง)

### 8.2 ไทม์ไลน์เวอร์ชันล่าสุด (สรุป)
| เวอร์ชัน | สิ่งที่ทำ |
|---|---|
| v0.7.9 | 2 ทาง GSheet (doGet READ_ALL แบบ JSONP/JSON + VEHICLE/DEPARTURE/INSPECTION POST) + auto-load เช้าแรก |
| v0.7.11 | readSnapshot fetch-GET ก่อน + JSONP fallback; แก้ rows extraction จาก `payload.data.vehicles` (testConnectionFull, importFromGoogleSheet) |
| v0.7.12 | ตรวจจับ **HTML_GATE** (Google interstitial/bot-check เมื่อ GAS ไม่ได้ Anyone) + เตือนสาเหตุชัดเจน ไม่แจ้งผลหลอก |
| v0.7.13 | db.js: enqueueSync เก็บคิวเมื่อส่งไม่ขึ้น, DELETE_VEHICLE→null (กันรถที่ลบแล้วกลับมาโผล่), +SAVE_INSPECTION/SAVE_DEPARTURE mapping, processSyncQueue เช็ค `res.success` ถูกต้อง |
| v0.7.14 | เปลี่ยนชื่อ tab ชีต → **`บันทึกการเข้า-ออกรถยนต์_Departures`** (มี `migrateDepartureTab()` เปลี่ยนชื่ออัตโนมัติใน GAS) |
| v0.7.15 | เปิดเองผ่าน LAN server (`เปิดใช้งานระบบ.bat` → server.js + localhost:8080); `readSnapshotWithRetry(12000,3)` |
| v0.7.16 | **Deploy GitHub Pages** + ฝัง `DEFAULT_WEBAPP_URL` เข้ารหัส |
| v0.7.17 | **ระบบแจ้งเตือนอีเมล 2 บทบาท** (หัวหน้างาน + ช่างเครื่องยนต์), Fleet scan ตอนเปิดแอป, ปุ่มส่งอีเมลทดสอบ, GAS SEND_EMAIL รับ array |
| v0.7.18 | ปุ่ม **"Google Sheet"** แสดงข้อความตลอดเวลาแม้หน้าจอแคบ (<1150px เดิมซ่อน label หาปุ่มไม่เจอ) |
| v0.7.19 | **ปรับฐานข้อมูลให้ตรงกับข้อมูลจริง:**
  - เพิ่มแอคชัน GAS **`EMPLOYEE`** — พนักงาน sync ขึ้นชีต `พนักงาน_Employees` ได้ (เดิมไม่มีทางเขียนเลย = ชีตว่าง)
  - เพิ่ม **`Repairs` ใน READ_ALL** — `ประวัติการซ่อม_Repairs` อ่านกลับมาได้แล้ว (เดิม write-only) พร้อม `REPAIR_FIELD_MAP`
  - **รวมหัวข้อคอลัมน์** `งานที่ต้องปฏิบัติ` → `งานที่ต้องปฏิบัติ (ภารกิจ)` ให้ตรงทุกแท็บ ผ่าน `standardizeHeaderNames()` (เปลี่ยนหัวข้อเก่าให้อัตโนมัติ)
  - บังคับ `employeeId` เป็น **String** ตรงกันตอนเขียนชีต
  - **Import ลงเครื่องครบ 3 ประเภท:** รถ + พนักงาน + ประวัติซ่อม (เดิมมีแค่รถ) + **กันข้อมูลทดสอบ `TEST-*`** ปนเข้ากองยานจริง
  - **อัปโหลดรถ/พนักงานที่เครื่องมีแต่ชีตยังไม่มีขึ้นไป** ในการ import — ทำให้ชีตมีกองยานจริง ไม่ใช่แค่แถวทดสอบ
  - **ซ่อม encoding reportGenerator.js** — ภาษาไทยทั้งไฟล์เป็น mojibake (double-encoding จากตอนกู้ zip) ใบรับรอง A4/PDF จึงแสดงภาษาไทยถูกต้อง 100% |
| v0.7.20 | **แก้บั๊กส่งอีเมลจริง:** `MailApp.sendEmail({to: [...]})` array ของ GAS → ต้อง `join(', ')` เป็น string (พบตอนเทสต์ live URL: "อีเมลไม่ถูกต้อง [Ljava.lang.Object;...") — v0.7.17-19 ที่ผ่านมาไม่เคยส่งสำเร็จจริงสักฉบับ; ข้อมูลจริงมี 3 คันเข้าเงื่อนไข (กพ-4501/2ขข-1102 PM-DUE + 82-8820 ภาษีขาด 24 วัน) |
| v0.7.21 | **ส่งอีเมลแยกตามเงื่อนไข + แจ้งรอบละครั้ง:**
  - **แยกผู้รับ:** PM 10,000 กม. → **หัวหน้า + ช่างเครื่อง** / ภาษี ≤ 7 วัน → **หัวหน้าคนเดียว** (`db.getPmRecipients()`/`getTaxRecipients()` = `getAlertRecipientsForRoles()`, fallback key เดิม `pea_alert_emails` ยังใช้ได้)
  - **lock เปลี่ยนเป็น "รอบละครั้ง" (cycle):** PM lock จำค่า `lastPmMileage`, Tax lock จำค่า `taxExpiry` — ระบบรู้ว่า "เคลียร์แล้ว" เพราะค่า baseline ของข้อมูลเปลี่ยน (ไม่ได้ lock ตามวันแบบ v0.7.17 ที่สแปมทุกวัน)
  - **ปุ่ม `เคลียร์ PM แล้ว`** ใน header badge + แถว fleet table ของตารางสรุป → `markPmDone()` ตั้ง `lastPmMileage = mileage` ปัจจุบัน + log + ซิงก์ขึ้นชีต (ผ่านคอลัมน์ JSON ทำให้ baseline ข้ามเครื่องได้)
  - **ต่อภาษี:** ใช้ฟอร์มแก้รถ (ตั้ง `taxExpiry` ใหม่) — ค่าเปลี่ยน = รู้ว่าต่อแล้ว รอบถัดไป (ใกล้ 7 วัน) จะแจ้งอีก
  - Fleet scan ตอนเปิดแอป ส่งแยก 2 ฉบับ (ฉบับ PM + ฉบับภาษี) แทนฉบับรวม |
| v0.7.22 | **ปุ่ม "เคลียร์ภาษี" (`markTaxRenewed`)** — สมมาตรกับเคลียร์ PM: ถามวันหมดอายุภาษีใหม่ (YYYY-MM-DD, ค่าเริ่มต้น = +1 ปี) → ตั้ง `taxExpiry` + ลบ lock `pea_alert_tax_cycle_{id}` + log `TAX_RENEWED` + ซิงก์ขึ้นชีต; เพิ่มปุ่มใน badge หน้ารถ (ขาด+ใกล้หมด) และในตารางสรุปตามตาราง; และแก้ HTML badge PM ผิดรูป (ปีกกาซ้ำซ้อน) — วิธีที่ถูกสำหรับ "ต่อภาษี" แต่ถ้าต้องการแค่เลื่อนการเตือนแบบไม่แก้ข้อมูลจริง ยังใช้ฟอร์มแก้รถได้ |
| v0.7.23 วางแผน | ตัวเลือกถัดไป: ส่งสรุปรายวัน/สัปดาห์, ปรับแต่ง HTML อีเมล, แจ้งเตือนจุดชำรุดวิกฤตถึงช่าง |

### 8.3 ระบบ Email Alert (หัวใจ v0.7.17) — ข้อกำหนดจากผู้ใช้
- **Trigger 2 เงื่อนไข (ใน `checkMaintenanceAlerts` / `_buildVehicleAlerts` ของ `js/app.js`):**
  1. **PM:** `vehicle.mileage - vehicle.lastPmMileage >= 10000` กม. ("ระยะทางเกิน 1 หมื่น กม.")
  2. **Tax:** `taxExpiry` เหลือ **≤ 7 วัน** (รวมขาดแล้ว: แสดง "เลยกำหนด X วัน")
- **ผู้รับ = 2 บทบาทตายตัวเท่านั้น:** ช่างเครื่องยนต์ + หัวหน้างาน (ไม่ใช่ list หลายคน)
  - เก็บใน localStorage แยกช่อง: `pea_alert_email_mechanic`, `pea_alert_email_chief`
  - Getter รวม: `db.getAlertRecipients()` (ถ้าทั้งสองช่องว่าง → fallback ไป key เดิม `pea_alert_emails` แบบ , )
  - **ตอนทดสอบ:** ผู้ใช้มีเฉพาะ `pon60562@gmail.com` → กรอกช่องทั้งสอง = pon60562@gmail.com
- **เวลาเช็ค:** (1) **Fleet scan ทั้งกองยานตอนเปิดแอป** (`checkFleetAlerts()` ใน init — ส่ง 2 ฉบับแยก: สรุป PM + สรุปภาษี ถ้ามีคันถึงกำหนด) + (2) ทุกครั้ง "บันทึกขากลับ" สำหรับรถคันนั้น (`checkMaintenanceAlerts(vehicle)` → ส่งรายคัน)
- **กันสแปม (รอบละครั้ง — v0.7.21):** lock ใน localStorage ใช้ค่า baseline เป็นตัวบอกว่า "ยังไม่เคลียร์":
  - **PM:** `pea_alert_pm_cycle_{id}` จำค่า `lastPmMileage` → แจ้งซ้ำเพราะค่าเดิม = ส่งซ้ำไม่ได้จนกว่า `markPmDone()` (ปุ่ม "เคลียร์ PM แล้ว") หรือแก้รถให้ `lastPmMileage` เปลี่ยน
  - **Tax:** `pea_alert_tax_cycle_{id}` จำค่า `taxExpiry` → แจ้งซ้ำเพราะค่าวันเดิม = ส่งซ้ำไม่ได้จนกว่าจะต่อภาษี (แก้ฟอร์มรถ ตั้ง `taxExpiry` ใหม่)
  - ทั้งสอง key ถูกเช็ค/เขียนแบบ "record-before-send" (กัน race เมื่อรีเฟรชหลาย tab พร้อมกัน) ใน `_markPmCycleAlerted()`/`_markTaxCycleAlerted()`
  - ข้อมูล baseline ผ่าน GAS 2 ทาง (JSON column คอลัมน์เดียว) → **ล็อกไม่ผูกกับเครื่องใดเครื่องหนึ่ง**
- **แยกผู้รับ (v0.7.21):** PM → หัวหน้า + ช่างเครื่อง / ภาษี → หัวหน้าคนเดียว (ดู `db.getPmRecipients()`/`getTaxRecipients()`)
- **GAS:** แอคชัน `SEND_EMAIL` → `MailApp.sendEmail({ to: toList.join(', ') })` — ⚠️ **GAS รับ `to` เป็น string คั่น `,` เท่านั้น ไม่ใช่ array** (เทสต์จริงเจอ error "อีเมลไม่ถูกต้อง [Ljava.lang.Object;..." ตอน v0.7.17-19 — ยังไม่เคยส่งสำเร็จจริงจนถึง v0.7.20)
- **กล่องข้อความหลัก Gmail:** ส่งผ่าน GAAS จากบัญชีผู้ใช้เอง + เนื้อหา HTML เรียบง่าย → ควรเข้า Primary inbox (ยังต้องยืนยันจริงในการทดสอบ)
- **UI:** ตั้งค่า Google Sheets modal → หัวข้อ **"4. อีเมลสำหรับรับแจ้งเตือน"** → 2 ช่อง (หัวหน้างาน / ช่างเครื่องยนต์) + ปุ่ม **บันทึกอีเมล** + ปุ่ม **ส่งอีเมลทดสอบ** (`sendTestAlertEmail()`)

### 8.4 งานที่ค้าง/ต้องทำต่อพรุ่งนี้ (เรียงตามลำดับ) ★★★
- [ ] **① Re-Deploy GAS เวอร์ชันล่าสุด (สำคัญ — GAS ที่ deploy อยู่ตอนนี้ยังเป็น v0.7.19 ที่อีเมลยังพัง!):**
  - เปิด Google Sheet → Extensions > Apps Script → ลบโค้ดเก่า → วาง `APPS_SCRIPT_code_ready_to_paste.js` (ปัจจุบัน **449 บรรทัด**) ทั้งหมด → Save
  - Deploy > **Manage deployments > แก้ deployment เดิม > Version = New version** (เพื่อให้ URL เดิมใช้งานได้ ไม่ต้องเปลี่ยนในระบบ!) → ตั้ง "Execute as Me" + "Anyone" → Deploy
  - ไฟล์นี้ประกอบด้วย: **`toList.join(', ')` (v0.7.20 แก้ bug array)** + migrateDepartureTab/ชื่อ tab ใหม่ (v0.7.14) + doGet READ_ALL ทั้งหมด
  - ⚠️ ถ้า URL เปลี่ยน (สร้าง deployment ใหม่แทนการแก้เก่า) → ต้องแก้ `DEFAULT_WEBAPP_URL` ใน js/googleSheetService.js + bump version + push ใหม่
- [ ] **② ทดสอบ Email จริง (เป้าหมายหลัก):**
  1. เปิด `https://book-pon.github.io/pea-smart-vehicle/` กด **Ctrl+F5** (ล้างแคช)
  2. ปุ่ม **Google Sheet** (มุมขวาบน) → หัวข้อ **4** → กรอก `pon60562@gmail.com` ทั้ง 2 ช่อง (หัวหน้า + ช่าง) → **บันทึกอีเมล** → **ส่งอีเมลทดสอบ**
  3. เช็ค Gmail → "ส่งอีเมลทดสอบ" ต้องเข้า **Primary** 1 ฉบับจริง (ก่อนนี้ v0.7.17-19 ไม่เคยส่งสำเร็จ เพราะ bug array)
  4. ถ้าเข้า tab อื่น → ทำให้ "สะอาด" ขึ้น (ลด HTML/ใส่ text/plain) เพื่อดันไป Primary
- [ ] **③ ทดสอบเงื่อนไขจริง (รอบละครั้ง):** รีเฟรชหน้า (Fleet scan ตอนเปิด) → ควรได้ **2 ฉบับแยก** (PM: หัวหน้า+ช่าง / ภาษี: หัวหน้า) สำหรับ 3 คันจริง (กพ-4501, 2ขข-1102, 82-8820); รีเฟรชซ้ำหลายๆ ครั้ง → **ต้องไม่ส่งซ้ำ**; กด "เคลียร์ PM แล้ว" ที่ กพ-4501/2ขข-1102 → บันทึก/รีเฟรช → ไม่มี PM ซ้ำจนกว่าจะครบรอบ 10,000 กม. ใหม่
- [ ] **④ (ถ้าไม่สะดวกเทสต์อีเมลจริง) ตัวเลือก:** เปิด modal แล้วตรวจ log console (F12) — ค่าล็อก cycle ควรถูกตั้งครั้งเดียวแล้วคงอยู่
- [ ] **⑤ Priority 2 (ยังค้าง):** ~~Import ข้ามเครื่องสำหรับ employees / inspections / departures ให้ครบ~~ → **v0.7.19 ทำแล้ว:** import พนักงาน + ประวัติซ่อมครบ (ใน `importFromGoogleSheet`) ยังเหลือแสดงผลซ่อม/พนักงานจากชีตใน UI เพิ่มเติมได้
- [ ] **⑥ (ความสวยงาม UI) PM_DUE:** ใช้ปุ่ม "เคลียร์ PM แล้ว" (ทำแล้ว v0.7.21) + NaN guard ให้ผู้ใช้ที่ข้อมูล `lastPmMileage` ยังเป็น undefined

### 8.5 วิธี Deploy/อัปเดตเวอร์ชัน → GitHub Pages (ขั้นตอนบังคับเมื่อแก้โค้ด)
1. Bump version: แทนที่เวอร์ชันเดิม เช่น `v0.7.20` → `v0.7.21` ในไฟล์: `js/googleSheetService.js`, `js/db.js`, `js/app.js`, `js/reportGenerator.js`, `js/server.js`, `index.html`, `เปิดใช้งานระบบ.bat`, `เปิดใช้โหมด LAN.bat` (`css/main.css` ไม่มีคำว่าเวอร์ชัน — ข้ามได้) (เฉพาะไฟล์ที่เจอคำว่าเวอร์ชันเดิม)
2. ตรวจ syntax: `node --check` ครบทุกไฟล์ JS (ผ่านหมด = OK) — รวม `APPS_SCRIPT_code_ready_to_paste.js` ถ้า regenerate แล้ว
3. ถ้าแก้ template GAS ใน googleSheetService.js → รัน `node extract_apps_script.js` เพื่อสร้าง `APPS_SCRIPT_code_ready_to_paste.js` ใหม่
4. `git add -A` → commit (ตั้ง user.name/user.email = BooK-PON) → `git push origin master` (branch = master!)
5. รอ GitHub Pages build ~60-90 วิ แล้วเช็ค `https://book-pon.github.io/pea-smart-vehicle/js/app.js?v=v0.7.21`
6. เตือนผู้ใช้ **Ctrl+F5**
7. ถ้ามีการส่งอีเมลจริงโดยใช้ GAS → เตือนผู้ใช้ **Re-deploy GAS** (จัดการ deployment เดิมแบบ New version) ด้วย `APPS_SCRIPT_code_ready_to_paste.js` ใหม่ — โค้ดเก่าที่ deploy อยู่บนเซิร์ฟเวอร์จะถูกใช้จนกว่าจะ deploy ใหม่

### 8.6 เครื่องมือ/ไฟล์สำคัญ
- `js/googleSheetService.js` — template GAS (`PEA_GOOGLE_APPS_SCRIPT_CODE`) + readSnapshot/readSnapshotWithRetry + SEND_EMAIL (`to` = string คั่น `,`) + DEFAULT_WEBAPP_URL
- `js/db.js` — queue/sync + `getAlertRecipients()`, `getPmRecipients()`, `getTaxRecipients()`, `getAlertRecipientsForRoles()` (fallback key `pea_alert_emails`)
- `js/app.js` — `checkFleetAlerts()` (2 ฉบับแยก), `checkMaintenanceAlerts()`, `_buildVehicleAlerts()`, `_sendAlertEmail()`, `_composeAlertEmail()`, `_markPmCycleAlerted()`, `_markTaxCycleAlerted()`, `markPmDone()` (ปุ่มเคลียร์ PM), `markTaxRenewed()` (ปุ่มเคลียร์ภาษี v0.7.22), `sendTestAlertEmail()`, `openGoogleSheetModal()` (หัวข้อ 4)
- `APPS_SCRIPT_code_ready_to_paste.js` — **ไฟล์ GAS ฉบับวางจริง 449 บรรทัด (v0.7.21 comment, โค้ด = v0.7.20 join fix)**
- `test_gsheet.mjs` — `node test_gsheet.mjs "URL"` (เทสต์ 4 ขั้นจาก Node ต่อ URL จริง, ใช้ได้ทั้งอ่าน/ส่ง/อีเมล)
- `extract_apps_script.js` — สกัด template → เขียนไฟล์วางใหม่
- `.gitignore` — ยกเว้น backup (`js/*_backup_working_*.js`), server.js, *.bat, test/script ฯลฯ ไม่ขึ้น Pages
- Backup เก่า: `js/db_backup_working_v0.7.8.js`, `js/googleSheetService_backup_working_v0.7.8.js`

### 8.7 ส่วนที่ห้ามยุ่ง (ไม่ควรแก้เด็ดขาด)
- โค้ดหลักอ่าน/เขียน GSheet: `VEHICLE`, `READ_ALL`, `INSPECTION`, `DEPARTURE`, `REPAIR_APPROVAL`, lock, sync queue — แก้ได้เฉพาะ block `SEND_EMAIL`
- Logic เงื่อนไข PM/tax เดิม + aliasการกันสแปม (`_buildVehicleAlerts`)
- ห้ามลบ key เดิม `pea_alert_emails` (fallback ยังใช้อยู่)
- อย่าเปลี่ยนชื่อ tab ชีตด้วยมือใน Sheet (ให้ `migrateDepartureTab()` จัดการอัตโนมัติ)
- เปลี่ยน GAS URL ต้องทำผ่านการ bump version + push (ไม่ได้สอนให้แก้ใน settings อันเดียว)

### 8.8 อัปเดต v0.7.19 — ทำให้ตาราง Google Sheet ตรงกับข้อมูลจริง (2026-09-21)
- **สิ่งที่แก้ในโค้ดแล้ว (ในเครื่อง):**
  - `js/googleSheetService.js`: GAS template ได้แอคชัน `EMPLOYEE`, อ่าน `Repairs` ใน READ_ALL + `REPAIR_FIELD_MAP`, `standardizeHeaderNames()` (รวมหัวข้อ `งานที่ต้องปฏิบัติ (ภารกิจ)`), `employeeId` เป็น String; ฝั่ง client ได้ `normalizeEmployeeRow()` + `mergeEmployeesFromSnapshot()`
  - `js/db.js`: map `UPDATE_EMPLOYEE→EMPLOYEE`, `DELETE_EMPLOYEE→null`, เพิ่ม `replaceEmployeesFromRemote()`
  - `js/app.js`: `importFromGoogleSheet()` นำเข้าพนักงาน/ซ่อม + กรอง `TEST-*` + อัปโหลดรถ/พนักงานที่ชีตยังไม่มีให้ครบ
  - `js/reportGenerator.js`: **กู้ภาษาไทยทั้งไฟล์** (mojibake double-encoding → Windows-874 inverse → UTF-8 ถูกต้อง) ใบรับรอง A4/PDF อ่านภาษาไทยได้
  - Bump cache-busting `?v=0.7.9` (เก่า!) → `?v=0.7.19` ใน index.html + ทุกไฟล์รวมเวอร์ชัน v0.7.19
- **งานที่ต้องทำโดยผู้ใช้ (บังคับ):**
  1. **Re-deploy GAS:** Google Sheet → Apps Script → วาง `APPS_SCRIPT_code_ready_to_paste.js` (449 บรรทัด) ทั้งหมด → Deploy (แก้ deployment เดิม, Version ใหม่, Anyone) → URL เดิมใช้ได้ไม่ต้องแก้
  3. **Push GitHub Pages:** `git push origin master` แล้วรอ build ~60-90 วิ + เตือนผู้ใช้ **Ctrl+F5**
  4. กดปุ่ม **Google Sheet** (หัวข้อ 4) → ตั้งค่าอีเมล → "โหลดข้อมูลจาก Google Sheet" เพื่อดาวน์ถลง real fleet + อัปโหลดกองยาน/พนักงานขึ้นชีต
  5. ตรวจชีต: `ข้อมูลยานพาหนะ_Vehicles` จะมีรถจริง (ไม่ใช่แค่ TEST), `พนักงาน_Employees` มีรายชื่อ, `ประวัติการซ่อม_Repairs` มีประวัติ + หัวข้อคอลัมน์ตรงกัน
- **ข้อควรรู้:** แถว `TEST-*` เดิมที่อยู่ในชีตจะไม่ถูกนำเข้าลงเครื่องอีกแล้ว (กรองฝั่ง client) แต่ยังค้างอยู่ในชีต หากอยากล้างจริง ต้องลบแถวด้วยมือในชีต (ไม่มีปุ่มลบในตัวระบบฝั่ง GAS)

*บันทึกโดย opencode สำหรับโครงการ PEA Smart Vehicle — 2026-09-21*
