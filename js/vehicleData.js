/**
 * PEA Smart Vehicle Inspection & Fleet Management System
 * Vehicle Dataset, Safety Standards & Defect Presets
 * การไฟฟ้าส่วนภูมิภาค (PEA)
 */

const PEA_VEHICLE_TYPES = {
    PICKUP: {
        id: 'pickup',
        name: 'รถกระบะปฏิบัติการ (Utility Pick-up 4x4)',
        category: 'งานแก้กระแสไฟฟ้าขัดข้อง 24 ชม.',
        icon: 'fa-truck-pickup',
        badgeColor: 'bg-blue-600/20 text-blue-300 border-blue-500/40',
        standards: 'มาตรฐานยานยนต์ กฟภ. รถบริการภาคสนาม'
    },
    CRANE: {
        id: 'crane',
        name: 'รถบรรทุกติดเครนยกเสา (Crane Truck)',
        category: 'งานก่อสร้างและพาดสายปักเสา',
        icon: 'fa-truck-moving',
        badgeColor: 'bg-amber-600/20 text-amber-300 border-amber-500/40',
        standards: 'มาตรฐานระบบไฮดรอลิกและเครนยก กฟภ.'
    },
    BUCKET: {
        id: 'bucket',
        name: 'รถกระเช้าฉนวนไฟฟ้าแรงสูง (Aerial Bucket Truck)',
        category: 'งานบำรุงรักษาสายส่งแรงสูง (Hotline Maintenance)',
        icon: 'fa-truck-ladder',
        badgeColor: 'bg-purple-600/20 text-purple-300 border-purple-500/40',
        standards: 'มาตรฐานฉนวนกันไฟฟ้า Dielectric Withstand Test (IEEE 107/ANSI A92.2)'
    },
    SEDAN: {
        id: 'sedan',
        name: 'รถตรวจการ / นั่งส่วนกลาง (Corporate Fleet Sedan)',
        category: 'งานบริหารและตรวจการทั่วไป',
        icon: 'fa-car-side',
        badgeColor: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40',
        standards: 'มาตรฐานยานยนต์นั่งส่วนกลาง กฟภ.'
    }
};

// ข้อมูลฟลีตรถยนต์เริ่มต้น (Fleet Inventory)
const INITIAL_VEHICLES = [
    {
        id: 'PEA-PK-4501',
        plate: 'กพ-4501 กาญจนบุรี',
        model: 'Toyota Hilux Revo 4x4 2.8 D-4D',
        type: 'PICKUP',
        department: 'แผนกปฏิบัติการระบบจำหน่าย กฟส.เมืองกาญจนบุรี',
        driver: 'นายสมศักดิ์ สุขใจ (พนักงานขับรถ)',
        mileage: 89450,
        lastPmMileage: 79000, // วิ่งมา 10,450 กม. -> เกิน 10,000 กม. (แจ้งเตือน PM)
        taxExpiry: '2026-10-15', // อีกประมาณ 27 วัน (แจ้งเตือนต่อภาษี)
        status: 'READY', // 'READY', 'WARNING', 'CRITICAL'
        lastInspectDate: '2026-09-17 08:30',
        fuelLevel: 85
    },
    {
        id: 'PEA-CR-8820',
        plate: '82-8820 นครปฐม',
        model: 'Hino 500 Victor + เครน Tadano 5 ตัน',
        type: 'CRANE',
        department: 'แผนกก่อสร้างและบูรณะระบบสายส่ง เขต 3',
        driver: 'นายเกรียงไกร มั่นคง (พนักงานขับรถบรรทุก)',
        mileage: 142300,
        lastPmMileage: 135000, // วิ่งมา 7,300 กม. (ปกติ)
        taxExpiry: '2026-08-28', // ขาดต่อภาษีแล้ว! (Critical Tax Alert)
        status: 'WARNING',
        lastInspectDate: '2026-09-16 16:45',
        fuelLevel: 60
    },
    {
        id: 'PEA-BK-3305',
        plate: 'กง-3305 สุพรรณบุรี',
        model: 'Isuzu Forward 240 + กระเช้าฉนวน Altec 14M',
        type: 'BUCKET',
        department: 'แผนกบำรุงรักษา Hotline 22-115kV',
        driver: 'นายประเสริฐ ช่างทอง (หัวหน้าชุดฮอทไลน์)',
        mileage: 95200,
        lastPmMileage: 88000, // วิ่งมา 7,200 กม.
        taxExpiry: '2026-11-30', // เหลือ 73 วัน (ปกติ)
        status: 'READY',
        lastInspectDate: '2026-09-18 07:15',
        fuelLevel: 92
    },
    {
        id: 'PEA-SD-1102',
        plate: '2ขข-1102 กรุงเทพฯ',
        model: 'Toyota Camry 2.5 HEV Premium',
        type: 'SEDAN',
        department: 'กองบริหารและตรวจการงานระบบ เขต 3',
        driver: 'นายวิเชียร บริการดี (พนักงานขับรถส่วนกลาง)',
        mileage: 63100,
        lastPmMileage: 51000, // วิ่งมา 12,100 กม. -> เกิน 10,000 กม. (แจ้งเตือน PM)
        taxExpiry: '2026-10-02', // เหลือ 14 วัน (แจ้งเตือนด่วนต่อภาษี)
        status: 'READY',
        lastInspectDate: '2026-09-15 13:20',
        fuelLevel: 78
    }
];

// ฐานข้อมูลพนักงาน กฟภ. (PEA Employee Directory)
const PEA_EMPLOYEES = {
    '512446': { name: 'นายเกียรติศักดิ์ พงษ์สว่าง', position: 'วิศวกรไฟฟ้าปฏิบัติการ / ผู้ควบคุมงาน', dept: 'แผนกปฏิบัติการระบบจำหน่าย' },
    '501234': { name: 'นายสมศักดิ์ สุขใจ', position: 'พนักงานขับรถชำนาญงาน', dept: 'แผนกปฏิบัติการระบบจำหน่าย' },
    '502345': { name: 'นายเกรียงไกร มั่นคง', position: 'พนักงานขับรถบรรทุกและเครื่องจักรกล', dept: 'แผนกก่อสร้างและบูรณะระบบสายส่ง' },
    '503456': { name: 'นายประเสริฐ ช่างทอง', position: 'หัวหน้าชุดปฏิบัติการ Hotline', dept: 'แผนกบำรุงรักษา Hotline 22-115kV' },
    '504567': { name: 'นายวิเชียร บริการดี', position: 'พนักงานขับรถส่วนกลาง', dept: 'กองบริหารและตรวจการงานระบบ' },
    '509999': { name: 'นายสมชาย มั่นคงดี', position: 'พนักงานช่าง / ผู้ตรวจสภาพ', dept: 'แผนกยานพาหนะ กฟภ.' }
};
const PEA_CHECKLIST_TEMPLATE = {
    EXTERIOR: {
        id: 'EXTERIOR',
        title: 'หมวดที่ 1: ภายนอกตัวรถ (Exterior)',
        icon: 'fa-car-side',
        items: [
            { id: 'ext_body', name: 'สภาพสีและตัวถังรถ (ไม่มีรอยเฉี่ยวชนขนาดใหญ่ หรือแตกร้าว)', critical: false },
            { id: 'ext_tires', name: 'สภาพยาง ล้อ และความลึกร่องดอกยาง (> 2.0 มม. ไม่มีรอยปริบวม)', critical: true },
            { id: 'ext_lights', name: 'ระบบไฟส่องสว่าง ไฟเลี้ยว ไฟเบรก และไฟถอยหลัง ทำงานครบทุกดวง', critical: true },
            { id: 'ext_mirrors', name: 'กระจกมองข้าง กระจกมองหลัง และกระจกบังลมหน้า ไม่มีรอยร้าวและสะอาด', critical: false },
            { id: 'ext_wipers', name: 'ใบปัดน้ำฝนและหัวฉีดน้ำล้างกระจกทำงานสมบูรณ์', critical: false }
        ]
    },
    INTERIOR: {
        id: 'INTERIOR',
        title: 'หมวดที่ 2: ภายใน & ห้องเครื่อง (Interior & Engine)',
        icon: 'fa-gauge-high',
        items: [
            { id: 'eng_oil', name: 'ระดับและสภาพน้ำมันเครื่องยนต์ (อยู่ระหว่าง MIN-MAX ไม่ดำเหนียว)', critical: true },
            { id: 'eng_coolant', name: 'ระดับน้ำหล่อเย็นและสภาพหม้อน้ำ/ท่อยาง (ไม่แห้ง ไม่รั่วซึม)', critical: true },
            { id: 'eng_brake_fluid', name: 'ระดับน้ำมันเบรกและระยะฟรีแป้นเบรก (ไม่จมลึก ไม่มีรอยรั่ว)', critical: true },
            { id: 'eng_battery', name: 'แรงดันและสภาพขั้วแบตเตอรี่ (ไม่มีคราบขี้เกลือ แน่นหนา)', critical: false },
            { id: 'int_belts_horn', name: 'เข็มขัดนิรภัย แตร และสัญญาณหน้าปัดเตือน (Check Engine/ABS ไม่ค้าง)', critical: true },
            { id: 'int_aircon', name: 'ระบบปรับอากาศและความเย็นในห้องโดยสาร', critical: false }
        ]
    },
    SAFETY: {
        id: 'SAFETY',
        title: 'หมวดที่ 3: อุปกรณ์เซฟตี้ PEA (Safety First)',
        icon: 'fa-shield-halved',
        items: [
            { id: 'safe_extinguisher', name: 'ถังดับเพลิงประจำรถ (เกจ์ชี้แถบเขียว มีสลักล็อก ไม่หมดอายุ)', critical: true },
            { id: 'safe_beacon', name: 'ไฟไซเรนฉุกเฉินสีเหลืองอำพันและสปอตไลต์ปฏิบัติงาน', critical: true },
            { id: 'safe_ground_wire', name: 'สายดินตัวถังพร้อมแคลมป์จับ (Grounding Cable) สภาพสมบูรณ์', critical: true },
            { id: 'safe_cones_tri', name: 'กรวยสะท้อนแสงและป้ายสามเหลี่ยมเตือนฉุกเฉินประจำรถ (อย่างน้อย 4 ชิ้น)', critical: true },
            { id: 'safe_firstaid', name: 'กล่องปฐมพยาบาลฉุกเฉิน (มียาและอุปกรณ์ทำแผลครบถ้วน)', critical: false },
            { id: 'safe_wheel_chocks', name: 'หมอนหนุนล้อป้องกันรถไหล (Wheel Chocks)', critical: true }
        ]
    },
    SPECIAL: {
        id: 'SPECIAL',
        title: 'หมวดที่ 4: เครื่องมือเฉพาะทางและระบบยก (Special Tools)',
        icon: 'fa-screwdriver-wrench',
        // หัวข้อในหมวดนี้จะปรับตามประเภทรถ (Dynamic per Vehicle Type)
        getItemsByVehicleType: function(typeKey) {
            switch(typeKey) {
                case 'BUCKET':
                    return [
                        { id: 'spec_dielectric', name: 'บูมไฟเบอร์กลาสฉนวนไฟฟ้า (Dielectric Leakage < 50 µA ไร้รอยแตก)', critical: true },
                        { id: 'spec_bucket_ctrl', name: 'สวิตช์ควบคุมสองตำแหน่ง (Dual Control: โคนบูมและบนกระเช้า)', critical: true },
                        { id: 'spec_aux_power', name: 'ระบบมอเตอร์ลดกระเช้าฉุกเฉิน (Auxiliary Emergency Lowering)', critical: true },
                        { id: 'spec_harness', name: 'จุดยึดเข็มขัดนิรภัยเต็มตัว (Full-body Safety Harness Anchor)', critical: true },
                        { id: 'spec_outriggers', name: 'ขาค้ำยันไฮดรอลิก (Outriggers) กางได้เต็มที่และล็อกแน่นหนา', critical: true }
                    ];
                case 'CRANE':
                    return [
                        { id: 'spec_crane_hyd', name: 'แรงดันน้ำมันไฮดรอลิกและกระบอกสูบ (ไม่รั่วซึม แรงดัน 2,500-3,000 PSI)', critical: true },
                        { id: 'spec_wire_rope', name: 'ลวดสลิงยกและตะขอ (ไม่มีการแตกลวดเกลียวหรือบิดเบี้ยว)', critical: true },
                        { id: 'spec_a2b', name: 'ระบบตัดการยกชนรอกอัตโนมัติ (Anti-Two Block: A2B Limit Switch)', critical: true },
                        { id: 'spec_outriggers_crane', name: 'ขาค้ำยันไฮดรอลิกพร้อมแผ่นรองหนุน (Outrigger Pads)', critical: true },
                        { id: 'spec_load_chart', name: 'ป้ายพิกัดยกปลอดภัย (Load Chart) ติดตั้งชัดเจนอ่านง่าย', critical: false }
                    ];
                case 'PICKUP':
                    return [
                        { id: 'spec_4wd', name: 'ระบบขับเคลื่อน 4 ล้อ (4H/4L) และเกียร์ Transfer พร้อมเข้าพื้นที่ทุรกันดาร', critical: false },
                        { id: 'spec_tools_box', name: 'กล่องบรรจุเครื่องมือช่างและมิเตอร์วัดไฟฟ้าภาคสนามล็อกแน่นหนา', critical: false },
                        { id: 'spec_ladder_rack', name: 'แร็คบรรทุกบันไดสไลด์และสายรัดล็อกแน่นหนา ปลอดภัย', critical: true },
                        { id: 'spec_inverter', name: 'อินเวอร์เตอร์จ่ายไฟฟ้า 220V ประจำรถและเต้ารับกันน้ำ', critical: false }
                    ];
                default: // SEDAN
                    return [
                        { id: 'spec_spare_tire', name: 'ยางอะไหล่และชุดเครื่องมือแม่แรงประจำรถ', critical: false },
                        { id: 'spec_dashcam', name: 'กล้องบันทึกหน้ารถ (Dashcam) บันทึกภาพได้ปกติ', critical: false },
                        { id: 'spec_fuel_card', name: 'บัตรเติมน้ำมัน กฟภ. (Fleet Card) และเอกสารสมุดคู่มือรถ', critical: false }
                    ];
            }
        }
    }
};

// รูปภาพจำลองสำหรับพรีเซ็ตจุดชำรุด (Defect Presets)
const DEFECT_PRESETS = [
    {
        id: 'PRESET_BRAKE',
        title: 'ระบบเบรกชำรุด / แป้นเบรกจมลึก',
        category: 'INTERIOR',
        targetItem: 'eng_brake_fluid',
        critical: true,
        description: 'ระดับน้ำมันเบรกต่ำกว่าขีด MIN อย่างวิกฤต แป้นเบรกจมลึกเกือบติดพื้น เสี่ยงเบรกไม่อยู่',
        imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="400" height="250" fill="%232b1111"/><text x="50%25" y="40%25" dominant-baseline="middle" text-anchor="middle" fill="%23ef4444" font-family="sans-serif" font-size="20" font-weight="bold">🚨 ภาพหลักฐาน: น้ำมันเบรกรั่วซึม</text><text x="50%25" y="60%25" dominant-baseline="middle" text-anchor="middle" fill="%23fca5a5" font-family="sans-serif" font-size="14">ระดับต่ำกว่า MIN / ปั๊มเบรกหน้าซ้ายรั่ว</text><rect x="40" y="180" width="320" height="30" rx="6" fill="%237f1d1d"/><text x="50%25" y="200" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-family="sans-serif" font-size="12">PEA SMART VEHICLE DEFECT EVIDENCE</text></svg>',
        resolvedImageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="400" height="250" fill="%23062816"/><text x="50%25" y="40%25" dominant-baseline="middle" text-anchor="middle" fill="%2310b981" font-family="sans-serif" font-size="20" font-weight="bold">✅ ภาพหลังซ่อม: เปลี่ยนท่อยางและไล่ลมเบรก</text><text x="50%25" y="60%25" dominant-baseline="middle" text-anchor="middle" fill="%2386efac" font-family="sans-serif" font-size="14">ระดับน้ำมันเบรกเต็ม MAX แป้นแน่นปกติ</text><rect x="40" y="180" width="320" height="30" rx="6" fill="%23064e3b"/><text x="50%25" y="200" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-family="sans-serif" font-size="12">PEA MAINTENANCE RESOLUTION VERIFIED</text></svg>'
    },
    {
        id: 'PRESET_TIRE',
        title: 'ยางหน้าขวาบวมแตกลายงา',
        category: 'EXTERIOR',
        targetItem: 'ext_tires',
        critical: true,
        description: 'พบแก้มยางหน้าขวาปูดบวมและมีรอยฉีกขาด เสี่ยงต่อการระเบิดระหว่างขับขี่ความเร็วสูง',
        imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="400" height="250" fill="%232b1111"/><text x="50%25" y="40%25" dominant-baseline="middle" text-anchor="middle" fill="%23ef4444" font-family="sans-serif" font-size="20" font-weight="bold">🚨 ภาพหลักฐาน: ยางบวมฉีกขาด</text><text x="50%25" y="60%25" dominant-baseline="middle" text-anchor="middle" fill="%23fca5a5" font-family="sans-serif" font-size="14">แก้มยางบวมแตกร้าว 3 ซม. ล้อหน้าขวา</text><rect x="40" y="180" width="320" height="30" rx="6" fill="%237f1d1d"/><text x="50%25" y="200" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-family="sans-serif" font-size="12">PEA SAFETY CRITICAL DEFECT</text></svg>',
        resolvedImageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="400" height="250" fill="%23062816"/><text x="50%25" y="40%25" dominant-baseline="middle" text-anchor="middle" fill="%2310b981" font-family="sans-serif" font-size="20" font-weight="bold">✅ ภาพหลังซ่อม: เปลี่ยนยางเส้นใหม่</text><text x="50%25" y="60%25" dominant-baseline="middle" text-anchor="middle" fill="%2386efac" font-family="sans-serif" font-size="14">เปลี่ยนยาง Bridgestone Duravis R611 ล้อหน้า</text><rect x="40" y="180" width="320" height="30" rx="6" fill="%23064e3b"/><text x="50%25" y="200" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-family="sans-serif" font-size="12">PEA MAINTENANCE RESOLUTION VERIFIED</text></svg>'
    },
    {
        id: 'PRESET_BOOM',
        title: 'สายไฮดรอลิกกระเช้ารั่วซึม',
        category: 'SPECIAL',
        targetItem: 'spec_outriggers',
        critical: true,
        description: 'พบน้ำมันไฮดรอลิกหยดซึมบริเวณข้อต่อกระบอกสูบขาค้ำยัน แรงดันไฮดรอลิกตก',
        imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="400" height="250" fill="%232b1111"/><text x="50%25" y="40%25" dominant-baseline="middle" text-anchor="middle" fill="%23ef4444" font-family="sans-serif" font-size="20" font-weight="bold">🚨 ภาพหลักฐาน: ไฮดรอลิกรั่วซึม</text><text x="50%25" y="60%25" dominant-baseline="middle" text-anchor="middle" fill="%23fca5a5" font-family="sans-serif" font-size="14">ท่อไฮดรอลิกไม่นำไฟฟ้า SAE 100R8 มีรอยซึม</text><rect x="40" y="180" width="320" height="30" rx="6" fill="%237f1d1d"/><text x="50%25" y="200" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-family="sans-serif" font-size="12">PEA CRITICAL EQUIPMENT DEFECT</text></svg>',
        resolvedImageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="400" height="250" fill="%23062816"/><text x="50%25" y="40%25" dominant-baseline="middle" text-anchor="middle" fill="%2310b981" font-family="sans-serif" font-size="20" font-weight="bold">✅ ภาพหลังซ่อม: ย้ำหัวสายไฮดรอลิกใหม่</text><text x="50%25" y="60%25" dominant-baseline="middle" text-anchor="middle" fill="%2386efac" font-family="sans-serif" font-size="14">ทดสอบแรงดัน 3,000 PSI ไม่มีการรั่วซึม</text><rect x="40" y="180" width="320" height="30" rx="6" fill="%23064e3b"/><text x="50%25" y="200" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-family="sans-serif" font-size="12">PEA MAINTENANCE RESOLUTION VERIFIED</text></svg>'
    },
    {
        id: 'PRESET_BEACON',
        title: 'ไฟไซเรนฉุกเฉินไม่ติด',
        category: 'SAFETY',
        targetItem: 'safe_beacon',
        critical: false,
        description: 'หลอดไฟ LED ไซเรนบนหลังคาดับ 2 โมดูล และไฟสปอตไลต์ส่องท้ายรถขัดข้อง',
        imageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="400" height="250" fill="%232b220d"/><text x="50%25" y="40%25" dominant-baseline="middle" text-anchor="middle" fill="%23f59e0b" font-family="sans-serif" font-size="20" font-weight="bold">⚠️ ภาพหลักฐาน: ไฟไซเรนไม่ติด</text><text x="50%25" y="60%25" dominant-baseline="middle" text-anchor="middle" fill="%23fde68a" font-family="sans-serif" font-size="14">โมดูลไฟเลนส์สีเหลืองอำพันไม่ตอบสนอง</text><rect x="40" y="180" width="320" height="30" rx="6" fill="%2378350f"/><text x="50%25" y="200" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-family="sans-serif" font-size="12">PEA SAFETY WARNING DEFECT</text></svg>',
        resolvedImageUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="250" viewBox="0 0 400 250"><rect width="400" height="250" fill="%23062816"/><text x="50%25" y="40%25" dominant-baseline="middle" text-anchor="middle" fill="%2310b981" font-family="sans-serif" font-size="20" font-weight="bold">✅ ภาพหลังซ่อม: เปลี่ยนฟิวส์และชุดสายไฟ</text><text x="50%25" y="60%25" dominant-baseline="middle" text-anchor="middle" fill="%2386efac" font-family="sans-serif" font-size="14">ไฟไซเรนและสปอตไลต์สว่างเต็มกำลัง</text><rect x="40" y="180" width="320" height="30" rx="6" fill="%23064e3b"/><text x="50%25" y="200" dominant-baseline="middle" text-anchor="middle" fill="%23ffffff" font-family="sans-serif" font-size="12">PEA MAINTENANCE RESOLUTION VERIFIED</text></svg>'
    }
];
