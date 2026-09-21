/**
 * PEA Smart Vehicle Database & Smart Sync Engine
 * LocalStorage Fallback, Offline Queue (pea_offline_sync_queue) & Cloudflare D1 (SQLite) RESTful API Connector
 * Build Version: v0.7.32 (Cache Busting)
 */

const APP_BUILD_VERSION = 'v0.7.32';

class PEADatabase {
    constructor() {
        this.STORAGE_KEYS = {
            VEHICLES: 'pea_vehicles',
            INSPECTIONS: 'pea_inspections',
            REPAIR_TICKETS: 'pea_repair_tickets',
            ACTIVITY_LOGS: 'pea_activity_logs',
            EMPLOYEES: 'pea_employees',
            ACTIVE_MISSIONS: 'pea_active_missions', // รถที่กำลังออกปฏิบัติงาน (Out on duty)
            SYNC_QUEUE: 'pea_offline_sync_queue',
            NETWORK_SIM: 'pea_network_mode', // 'auto', 'offline_forced', 'online_forced'
            LAST_VEHICLE: 'pea_last_inspected_vehicle'
        };

        this.init();
    }

    init() {
        // Initialize default vehicles if not present or empty
        try {
            const currentVehicles = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.VEHICLES) || '[]');
            if (!Array.isArray(currentVehicles) || currentVehicles.length === 0) {
                localStorage.setItem(this.STORAGE_KEYS.VEHICLES, JSON.stringify(INITIAL_VEHICLES));
            }
        } catch(e) {
            localStorage.setItem(this.STORAGE_KEYS.VEHICLES, JSON.stringify(INITIAL_VEHICLES));
        }

        // Initialize default employees if not present
        if (!localStorage.getItem(this.STORAGE_KEYS.EMPLOYEES)) {
            const initialEmployees = Object.keys(PEA_EMPLOYEES).map(id => ({
                id: id,
                name: PEA_EMPLOYEES[id].name,
                position: PEA_EMPLOYEES[id].position || 'พนักงาน กฟภ.',
                dept: PEA_EMPLOYEES[id].dept || 'การไฟฟ้าส่วนภูมิภาค'
            }));
            localStorage.setItem(this.STORAGE_KEYS.EMPLOYEES, JSON.stringify(initialEmployees));
        }

        // Initialize default repair tickets if not present
        if (!localStorage.getItem(this.STORAGE_KEYS.REPAIR_TICKETS)) {
            const initialTickets = [
                {
                    ticketId: 'REP-20260916-001',
                    vehicleId: 'PEA-CR-8820',
                    plate: '82-8820 นครปฐม',
                    model: 'Hino 500 Victor + เครน Tadano 5 ตัน',
                    reporter: 'นายเกรียงไกร มั่นคง',
                    timestamp: '2026-09-16 16:45',
                    status: 'PENDING_REPAIR', // 'PENDING_REPAIR', 'PENDING_APPROVAL', 'RESOLVED'
                    severity: 'WARNING', // 'CRITICAL', 'WARNING'
                    items: [
                        {
                            itemId: 'spec_load_chart',
                            name: 'ป้ายพิกัดยกปลอดภัย (Load Chart) หลุดหาย',
                            category: 'SPECIAL',
                            critical: false,
                            description: 'แผ่นป้ายพิกัดยกชำรุดหลุดออกจากโครงเครน ต้องติดแผ่นใหม่',
                            photoBefore: DEFECT_PRESETS[3].imageUrl,
                            photoAfter: null,
                            mechanicNote: null,
                            repairedAt: null
                        }
                    ]
                }
            ];
            localStorage.setItem(this.STORAGE_KEYS.REPAIR_TICKETS, JSON.stringify(initialTickets));
        }

        // Initialize initial activity logs (Consolidated)
        if (!localStorage.getItem(this.STORAGE_KEYS.ACTIVITY_LOGS)) {
            const initialLogs = [
                {
                    logId: 'LOG-20260916-01',
                    timestamp: '2026-09-16 16:45',
                    actionType: 'INSPECTION_DEFECT',
                    vehicleId: 'PEA-CR-8820',
                    plate: '82-8820 นครปฐม',
                    operator: 'นายเกรียงไกร มั่นคง (พนักงานขับรถ)',
                    role: 'DRIVER',
                    summary: 'ตรวจสภาพพบจุดชำรุด 1 รายการ: ป้ายพิกัดยกปลอดภัยหลุดหาย (เฝ้าระวัง)',
                    statusResult: 'WARNING',
                    ticketId: 'REP-20260916-001'
                },
                {
                    logId: 'LOG-20260915-01',
                    timestamp: '2026-09-15 13:20',
                    actionType: 'INSPECTION_PASS',
                    vehicleId: 'PEA-SD-1102',
                    plate: '2ขข-1102 กรุงเทพฯ',
                    operator: 'นายวิเชียร บริการดี (พนักงานขับรถส่วนกลาง)',
                    role: 'DRIVER',
                    summary: 'ตรวจสภาพประจำวันผ่านเกณฑ์ 100% (พร้อมใช้งาน)',
                    statusResult: 'READY',
                    ticketId: null
                }
            ];
            localStorage.setItem(this.STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(initialLogs));
        }

        // Initialize empty sync queue if not present
        if (!localStorage.getItem(this.STORAGE_KEYS.SYNC_QUEUE)) {
            localStorage.setItem(this.STORAGE_KEYS.SYNC_QUEUE, JSON.stringify([]));
        }
    }

    // =========================================================================
    // Network & Offline Mode Management
    // =========================================================================
    isOnline() {
        const mode = localStorage.getItem(this.STORAGE_KEYS.NETWORK_SIM) || 'auto';
        if (mode === 'offline_forced') return false;
        if (mode === 'online_forced') return true;
        return navigator.onLine;
    }

    setNetworkMode(mode) {
        localStorage.setItem(this.STORAGE_KEYS.NETWORK_SIM, mode);
        window.dispatchEvent(new CustomEvent('pea-network-changed', { detail: { isOnline: this.isOnline() } }));
    }

    getNetworkMode() {
        return localStorage.getItem(this.STORAGE_KEYS.NETWORK_SIM) || 'auto';
    }

    // =========================================================================
    // CRUD Operations with LocalStorage Fallback & D1 Sync
    // =========================================================================
    getAlertEmails() {
        return localStorage.getItem('pea_alert_emails') || '';
    }

    setAlertEmails(emails) {
        if (emails) {
            localStorage.setItem('pea_alert_emails', emails);
        } else {
            localStorage.removeItem('pea_alert_emails');
        }
    }

    getMechanicEmail() {
        return localStorage.getItem('pea_alert_email_mechanic') || '';
    }

    setMechanicEmail(email) {
        if (email) {
            localStorage.setItem('pea_alert_email_mechanic', email.trim());
        } else {
            localStorage.removeItem('pea_alert_email_mechanic');
        }
    }

    getChiefEmail() {
        return localStorage.getItem('pea_alert_email_chief') || '';
    }

    setChiefEmail(email) {
        if (email) {
            localStorage.setItem('pea_alert_email_chief', email.trim());
        } else {
            localStorage.removeItem('pea_alert_email_chief');
        }
    }

    getAlertRecipients() {
        const emails = [];
        const mechanic = this.getMechanicEmail();
        const chief = this.getChiefEmail();
        if (mechanic) emails.push(mechanic);
        if (chief) emails.push(chief);
        if (emails.length === 0) {
            const legacy = this.getAlertEmails();
            if (legacy) {
                legacy.split(',').forEach(e => {
                    const trimmed = e.trim();
                    if (trimmed) emails.push(trimmed);
                });
            }
        }
        return [...new Set(emails.map(e => e.toLowerCase()))];
    }

    // รับอีเมลแยกตามบทบาทผู้รับ:
    //   PM  (ครบ 10,000 กม.)  =>  ['CHIEF','MECHANIC']  (หัวหน้า + ช่างเครื่อง)
    //   Tax (ภาษี ≤ 7 วัน)     =>  ['CHIEF']              (หัวหน้าคนเดียว)
    // กรณีที่ยังไม่เคยตั้งอีเมลแยกบทบาท (ใช้ key เดิม pea_alert_emails) จะส่งให้ครบทุกคนที่ตั้งไว้
    getAlertRecipientsForRoles(roles) {
        const roleSet = (Array.isArray(roles) ? roles : [roles]);
        const emails = [];
        const mechanic = this.getMechanicEmail();
        const chief = this.getChiefEmail();
        if (roleSet.indexOf('MECHANIC') >= 0 && mechanic) emails.push(mechanic);
        if (roleSet.indexOf('CHIEF') >= 0 && chief) emails.push(chief);
        if (emails.length === 0) {
            const legacy = this.getAlertEmails();
            if (legacy) {
                legacy.split(',').forEach(e => {
                    const trimmed = e.trim();
                    if (trimmed) emails.push(trimmed);
                });
            }
        }
        return [...new Set(emails.map(e => e.toLowerCase()))];
    }

    getPmRecipients() {
        return this.getAlertRecipientsForRoles(['CHIEF', 'MECHANIC']);
    }

    getTaxRecipients() {
        return this.getAlertRecipientsForRoles(['CHIEF']);
    }

    getVehicles() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEYS.VEHICLES);
            if (!raw) {
                localStorage.setItem(this.STORAGE_KEYS.VEHICLES, JSON.stringify(INITIAL_VEHICLES));
                return INITIAL_VEHICLES;
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed) || parsed.length === 0) {
                localStorage.setItem(this.STORAGE_KEYS.VEHICLES, JSON.stringify(INITIAL_VEHICLES));
                return INITIAL_VEHICLES;
            }
            return parsed;
        } catch(e) {
            localStorage.setItem(this.STORAGE_KEYS.VEHICLES, JSON.stringify(INITIAL_VEHICLES));
            return INITIAL_VEHICLES;
        }
    }

    getVehicleById(id) {
        const vehicles = this.getVehicles();
        return vehicles.find(v => v.id === id) || null;
    }

    saveVehicle(vehicle) {
        const vehicles = this.getVehicles();
        const index = vehicles.findIndex(v => v.id === vehicle.id);
        if (index >= 0) {
            vehicles[index] = vehicle;
        } else {
            vehicles.push(vehicle);
        }
        // แต้มเวลา ISO ให้ใหม่ทุกครั้งเมื่อเขียนจากเครื่อง (ไม่ใช่แค่ครั้งแรก)
        // ใช้เป็นหลักตัดสิน "ใครใหม่กว่า" ในการ merge กับ Google Sheets —
        // ถ้าไม่รีเฟรชเวลาทุกเซฟ ผู้บันทึกขากลับจะถูกคิดว่า "ข้อมูลเก่า" แล้วเครื่องอื่นไม่ยอมรับเลขไมล์ใหม่
        vehicle.updatedAt = new Date().toISOString();
        localStorage.setItem(this.STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
        this.enqueueSync('UPDATE_VEHICLE', vehicle);
    }

    // ใช้สำหรับนำเข้าข้อมูลจาก Google Sheets ลงเครื่องโดยตรง (ไม่ trigger enqueue กลับ)
    // เพื่อกัน "echo loop" ที่ข้อมูลที่เพิ่งนำเข้า จะถูกส่งกลับขึ้น GSheet ซ้ำ
    replaceVehiclesFromRemote(vehicles) {
        if (!Array.isArray(vehicles)) return false;
        // กรณี remote ว่าง/ไม่พร้อม => ไม่สแตมข้อมูลเดิม
        if (vehicles.length === 0) return false;
        // merge รายคันทำใน googleSheet.mergeVehiclesFromSnapshot ก่อนมาแล้ว
        localStorage.setItem(this.STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
        console.log(`[PEA DB] อัปเดตรถจาก Google Sheets: ${vehicles.length} คัน`);
        return true;
    }

    deleteVehicle(vehicleId) {
        const vehicles = this.getVehicles();
        const filtered = vehicles.filter(v => v.id !== vehicleId);
        localStorage.setItem(this.STORAGE_KEYS.VEHICLES, JSON.stringify(filtered));
        this.enqueueSync('DELETE_VEHICLE', { id: vehicleId });
        return filtered;
    }

    // =========================================================================
    // Employee Master Data CRUD Operations
    // =========================================================================
    getEmployees() {
        try {
            const raw = JSON.parse(localStorage.getItem(this.STORAGE_KEYS.EMPLOYEES)) || [];
            // กรองแถวตั้งค่าระบบ (SYS_ALERT_* ที่ใช้แชร์อีเมลผู้รับข้ามเครื่อง) ออกจากรายการพนักงานจริง
            return raw.filter(e => !(e && e.id && String(e.id).indexOf('SYS_ALERT_') === 0));
        } catch(e) {
            return [];
        }
    }

    getEmployeeById(id) {
        if (!id) return null;
        const employees = this.getEmployees();
        return employees.find(e => e.id.toString().trim() === id.toString().trim()) || null;
    }

    saveEmployee(employee) {
        const employees = this.getEmployees();
        const index = employees.findIndex(e => e.id.toString().trim() === employee.id.toString().trim());
        if (index >= 0) {
            employees[index] = employee;
        } else {
            employees.push(employee);
        }
        // เช่นเดียวกับ saveVehicle: แต้มเวลาใหม่ทุกครั้งเพื่อตัดสิน "ใครใหม่กว่า" ในการ merge ข้ามเครื่อง
        employee.updatedAt = new Date().toISOString();
        localStorage.setItem(this.STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
        this.enqueueSync('UPDATE_EMPLOYEE', employee);
        return employee;
    }

    deleteEmployee(employeeId) {
        const employees = this.getEmployees();
        const filtered = employees.filter(e => e.id.toString().trim() !== employeeId.toString().trim());
        localStorage.setItem(this.STORAGE_KEYS.EMPLOYEES, JSON.stringify(filtered));
        this.enqueueSync('DELETE_EMPLOYEE', { id: employeeId });
        return filtered;
    }

    // ใช้สำหรับนำเข้าพนักงานจาก Google Sheets ลงเครื่องโดยตรง (ไม่ trigger enqueue กลับ)
    replaceEmployeesFromRemote(employees) {
        if (!Array.isArray(employees)) return false;
        if (employees.length === 0) return false;
        localStorage.setItem(this.STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
        console.log(`[PEA DB] อัปเดตพนักงานจาก Google Sheets: ${employees.length} คน`);
        return true;
    }

    // =========================================================================
    // Active Vehicle Missions (รถยนต์ที่กำลังออกไปปฏิบัติงาน Out on Duty)
    // =========================================================================
    getActiveMissions() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ACTIVE_MISSIONS)) || [];
        } catch(e) {
            return [];
        }
    }

    getActiveMissionByVehicleId(vehicleId) {
        if (!vehicleId) return null;
        const missions = this.getActiveMissions();
        return missions.find(m => m.vehicleId === vehicleId) || null;
    }

    startVehicleMission(missionData) {
        const missions = this.getActiveMissions();
        const index = missions.findIndex(m => m.vehicleId === missionData.vehicleId);
        const existing = index >= 0 ? missions[index] : null;
        const mission = {
            // สำคัญ: กรณีอัปเดตภารกิจของคันที่ออกอยู่แล้ว ให้ "ใช้ id เดิม" ไม่สร้างใหม่
            // (มิฉะนั้น GAS DEPARTURE จะสร้างแถวใหม่ id ใหม่ แล้วแถวเก่าจะค้าง "ออกปฏิบัติงาน" ไม่หาย)
            id: (existing && existing.id) ? existing.id : ('MSN-' + Date.now().toString(36).toUpperCase()),
            vehicleId: missionData.vehicleId,
            plate: missionData.plate,
            model: missionData.model,
            operatorName: missionData.operatorName,
            employeeId: missionData.employeeId,
            taskDescription: missionData.taskDescription || 'ปฏิบัติงานภาคสนาม',
            startMileage: missionData.startMileage,
            departureTime: existing && existing.departureTime ? existing.departureTime : (missionData.departureTime || new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })),
            departureDate: existing && existing.departureDate ? existing.departureDate : (missionData.departureDate || new Date().toLocaleDateString('th-TH')),
            status: 'OUT_ON_DUTY'
        };

        if (index >= 0) {
            missions[index] = mission;
        } else {
            missions.unshift(mission);
        }
        localStorage.setItem(this.STORAGE_KEYS.ACTIVE_MISSIONS, JSON.stringify(missions));

        // อัปเดตสถานะรถเป็น 'IN_USE' ใน Master Vehicles
        const vehicles = this.getVehicles();
        const v = vehicles.find(v => v.id === missionData.vehicleId);
        if (v) {
            v.operationalStatus = 'IN_USE'; // กำลังใช้งาน
            localStorage.setItem(this.STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
        }

        return mission;
    }

    completeVehicleMission(vehicleId) {
        const missions = this.getActiveMissions();
        const filtered = missions.filter(m => m.vehicleId !== vehicleId);
        localStorage.setItem(this.STORAGE_KEYS.ACTIVE_MISSIONS, JSON.stringify(filtered));

        // อัปเดตสถานะรถกลับเป็นปกติ
        const vehicles = this.getVehicles();
        const v = vehicles.find(v => v.id === vehicleId);
        if (v) {
            v.operationalStatus = 'AVAILABLE'; // ว่าง/พร้อมใช้งาน
            localStorage.setItem(this.STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
        }
        return filtered;
    }

    // ตั้งสถานะรถตรง ๆ (ไม่ trigger enqueue กลับ กัน echo loop เมื่อนำเข้าจากชีต)
    setVehicleStatusDirect(vehicleId, operationalStatus) {
        if (!vehicleId) return;
        const vehicles = this.getVehicles();
        const v = vehicles.find(x => x.id === vehicleId);
        if (v && v.operationalStatus !== operationalStatus) {
            v.operationalStatus = operationalStatus;
            localStorage.setItem(this.STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
        }
    }

    // ปรับเลขไมล์จากข้อมูลซิงก์ (เช่น ประวัติตรวจสภาพ/ขากลับจากอีกเครื่อง)
    // กฎไมล์เป็นแบบเพิ่มทางเดียว: รับค่าที่สูงกว่าของเก่ากับใหม่เท่านั้น ไม่ยอมให้ "เลขไมล์ถอยหลัง"
    // เขียนตรงโดยไม่ touch updatedAt + ไม่ trigger enqueue กัน echo loop
    applyMileageFromSync(vehicleId, mileage) {
        if (!vehicleId || mileage === undefined || mileage === null) return false;
        const km = Number(mileage);
        if (isNaN(km) || km < 0) return false;
        const vehicles = this.getVehicles();
        const v = vehicles.find(x => String(x.id) === String(vehicleId));
        if (!v) return false;
        const current = Number(v.mileage) || 0;
        if (km > current) {
            v.mileage = km;
            localStorage.setItem(this.STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
            console.log(`[PEA DB] อัปเดตเลขไมล์จากซิงก์ ${vehicleId}: ${current.toLocaleString()} -> ${km.toLocaleString()} กม.`);
            return true;
        }
        return false;
    }

    // แปลงแถว departure จากชีต -> รูปแบบ mission ของระบบ (ขาไป)
    _missionFromRemoteRow(row) {
        if (!row || !row.vehicleId) return null;
        let departureDate = '', departureTime = '';
        const ts = String(row.timestamp || '').trim();
        if (ts) {
            const comma = ts.indexOf(',');
            if (comma >= 0) {
                departureDate = ts.slice(0, comma).trim();
                departureTime = ts.slice(comma + 1).trim().split(' ')[0];
            } else {
                departureDate = ts;
            }
        }
        return {
            id: row.missionId || ('MSN-' + Date.now().toString(36).toUpperCase()),
            vehicleId: String(row.vehicleId),
            plate: row.plate || '',
            model: row.model || '',
            operatorName: row.operatorName || row.driver || 'พนักงาน กฟภ.',
            employeeId: row.employeeId !== undefined && row.employeeId !== null ? String(row.employeeId) : '-',
            taskDescription: row.taskDescription || 'ปฏิบัติงานภาคสนาม',
            startMileage: Number(row.startMileage) || 0,
            departureTime: departureTime,
            departureDate: departureDate,
            status: 'OUT_ON_DUTY',
            fromSync: true
        };
    }

    // ตรวจว่าแถว departure นี้ "จบภารกิจแล้ว" (ไมล์ขากลับมีค่า หรือสถานะบอกเสร็จสิ้น)
    _isCompletedDepartureRow(row) {
        if (!row) return false;
        const statusStr = String(row.status || '').toLowerCase();
        if (statusStr.indexOf('เสร็จสิ้น') >= 0 || statusStr.indexOf('completed') >= 0) return true;
        const em = row.endMileage;
        return em !== undefined && em !== null && em !== '';
    }

    // ปรับสถานะ operationalStatus ของรถทุกคันให้ตรงกับชุด missions (เขียนตรงไม่ echo)
    _syncVehicleStatusFromMissions(missions) {
        const byVehicle = {};
        (missions || []).forEach(m => { if (m && m.vehicleId) byVehicle[String(m.vehicleId)] = true; });
        const vehicles = this.getVehicles();
        let changed = false;
        (vehicles || []).forEach(v => {
            const isInUse = byVehicle[String(v.id)] === true;
            const cur = v.operationalStatus;
            if (isInUse && cur !== 'IN_USE') { v.operationalStatus = 'IN_USE'; changed = true; }
            else if (!isInUse && cur === 'IN_USE') { v.operationalStatus = 'AVAILABLE'; changed = true; }
        });
        if (changed) localStorage.setItem(this.STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
    }

    // นำเข้ารถที่กำลังออกปฏิบัติงาน (Active Trips) จาก Google Sheets เข้าเครื่อง
    // กติกา merge:
    //   - คันที่เครื่องนี้กำลังปิดงานอยู่ (มี mission เดิม) => คงของเครื่อง ไม่ทับ
    //   - ภารกิจที่ชีตบอกว่าจบแล้ว แต่เครื่องยังค้างอยู่ => ลบออก + ปลดสถานะ IN_USE
    //   - ภารกิจใหม่ที่เครื่องยังไม่มี => เพิ่ม + ตั้งสถานะ IN_USE
    mergeActiveMissionsFromRemote(remoteRows, localMissions) {
        if (!Array.isArray(remoteRows) || remoteRows.length === 0) {
            return { changed: false, missions: localMissions || [], added: 0, removed: 0 };
        }

        const activeById = {};
        const completedById = {};
        remoteRows.forEach(row => {
            if (!row || !row.vehicleId) return;
            const id = String(row.missionId || '');
            if (this._isCompletedDepartureRow(row)) {
                if (id) completedById[id] = row;
            } else {
                if (id) activeById[id] = row;
            }
        });

        const byVehicle = {};
        (localMissions || []).forEach(m => { if (m && m.vehicleId) byVehicle[String(m.vehicleId)] = m; });

        const result = [];
        const seenVehicle = {};
        let added = 0, removed = 0;

        // 1) mission ที่เครื่องมีอยู่: คงไว้ เว้นแต่ชีตระบุว่าจบแล้ว => ลบ
        (localMissions || []).forEach(m => {
            const vehicleId = m && String(m.vehicleId);
            if (!vehicleId) { result.push(m); return; }
            seenVehicle[vehicleId] = true;
            // สำคัญ: ถ้ามีแถว "จบแล้ว" (Completed) ของ missionId นี้อยู่แม้แต่แถวเดียว ให้ถือว่าจบแล้ว
            // (เดิมใช้ activeById || completedById ดันเลือกแถว "ออกปฏิบัติงาน" ค้างไว้ → mission ฟื้นคืนทุก pull ไม่หาย)
            const rid = String(m.id || '');
            if (rid && completedById[rid]) {
                removed++;
                return; // ชีตมีหลักฐานว่าภารกิจนี้จบแล้ว → ปลดออก
            }
            result.push(m);
        });

        // 2) ภารกิจ active จากชีตที่เครื่องยังไม่มี => เพิ่ม
        remoteRows.forEach(row => {
            if (!row || !row.vehicleId) return;
            if (this._isCompletedDepartureRow(row)) return;
            const vehicleId = String(row.vehicleId);
            const rid2 = String(row.missionId || '');
            if (rid2 && completedById[rid2]) return; // missionId นี้เคยจบแล้ว → ไม่ฟื้นคืนจากแถวแฝดที่ค้าง
            if (seenVehicle[vehicleId]) return; // เครื่องกำลังทำคันนี้อยู่ (หรือเพิ่มไปแล้ว)
            seenVehicle[vehicleId] = true;
            const mission = this._missionFromRemoteRow(row);
            if (mission) { result.push(mission); added++; }
        });

        const changed = added > 0 || removed > 0;
        if (changed) {
            localStorage.setItem(this.STORAGE_KEYS.ACTIVE_MISSIONS, JSON.stringify(result));
            this._syncVehicleStatusFromMissions(result);
        }
        return { changed, missions: result, added, removed };
    }

    // ลบรายการใน Activity Logs ที่อ้างถึงใบแจ้งซ่อม
    // options.onlyDefectAlerts = true => ลบเฉพาะ entry "พบชำรุด/แจ้งซ่อม" (INSPECTION_DEFECT)
    //                                            เก็บ entry ส่งมอบ/อนุมัติ ไว้เป็นหลักฐาน
    removeActivityLogsByTicketId(ticketId, options) {
        if (!ticketId) return 0;
        const opts = options || {};
        const logs = this.getActivityLogs();
        const filtered = logs.filter(l => {
            const linked = l && l.ticketId && String(l.ticketId) === String(ticketId);
            if (!linked) return true;
            if (opts.onlyDefectAlerts) {
                const isDefectAlert = (l.actionType === 'INSPECTION_DEFECT') ||
                    (l.actionType && String(l.actionType).indexOf('DEFECT') >= 0);
                return !isDefectAlert;
            }
            return false;
        });
        const removed = logs.length - filtered.length;
        if (removed > 0) {
            localStorage.setItem(this.STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(filtered));
        }
        return removed;
    }

    getRepairTickets() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.REPAIR_TICKETS)) || [];
        } catch(e) {
            return [];
        }
    }

    // เขียน localStorage แบบกันโค้ตาล้น: ถ้าเขียนไม่ได้ (QuotaExceededError) ให้ลบรูป base64 หนักๆ ออกแล้วลองใหม่
    // เพื่อไม่ให้ flow การทำงานหลัก (บันทึก/ซิงค์) ตายเงียบเพราะรูปภาพโอก
    _setItemQuotaSafe(key, value, stripPhotos) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (err) {
            if (err && (err.name === 'QuotaExceededError' || err.message && err.message.includes('exceeded'))) {
                if (stripPhotos) {
                    try {
                        let data = JSON.parse(value);
                        const scrub = (arr, fields) => {
                            if (!Array.isArray(arr)) return;
                            arr.forEach(entry => {
                                fields.forEach(f => {
                                    if (entry && entry[f] && /^data:image\//.test(String(entry[f]))) entry[f] = null;
                                });
                                if (entry && Array.isArray(entry.items)) {
                                    entry.items.forEach(it => {
                                        if (it && it.photoBefore && /^data:image\//.test(String(it.photoBefore))) it.photoBefore = null;
                                        if (it && it.photoAfter && /^data:image\//.test(String(it.photoAfter))) it.photoAfter = null;
                                    });
                                }
                            });
                            return;
                        };
                        if (key === this.STORAGE_KEYS.REPAIR_TICKETS) scrub(data, ['photoBefore', 'photoAfter']);
                        if (key === this.STORAGE_KEYS.SYNC_QUEUE) scrub(data, ['photo']);
                        localStorage.setItem(key, JSON.stringify(data));
                        console.warn('[PEA DB] พื้นที่จัดเก็บเต็ม: ตัดภาพ base64 ออกจากข้อมูลเพื่อให้บันทึกต่อได้ (เหตุการณ์สำคัญ: โปรดอัปโหลดภาพไปเก็บที่อื่น)');
                        return true;
                    } catch (e2) {
                        console.warn('[PEA DB] โค้ตาล้นและยังลดขนาดต่อไม่ได้:', e2 && e2.message);
                        return false;
                    }
                }
                console.warn('[PEA DB] พื้นที่จัดเก็บเต็ม:', err.message);
                return false;
            }
            console.warn('[PEA DB] เขียน localStorage ล้มเหลว:', err && err.message ? err.message : err);
            return false;
        }
    }

    saveRepairTicket(ticket) {
        const tickets = this.getRepairTickets();
        const index = tickets.findIndex(t => t.ticketId === ticket.ticketId);
        if (index >= 0) {
            tickets[index] = ticket;
        } else {
            tickets.unshift(ticket);
        }
        this._setItemQuotaSafe(this.STORAGE_KEYS.REPAIR_TICKETS, JSON.stringify(tickets), true);
        this.enqueueSync('SAVE_TICKET', ticket, true);
    }

    // =========================================================================
    // Log Consolidation (ข้อ 3: รวมบันทึกงานซ่อมที่มีหลายจุดใน 1 แถวเดียว)
    // =========================================================================
    getActivityLogs() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ACTIVITY_LOGS)) || [];
        } catch(e) {
            return [];
        }
    }

    addConsolidatedActivityLog(logEntry) {
        const logs = this.getActivityLogs();
        const entryWithId = {
            logId: 'LOG-' + Date.now().toString(36).toUpperCase(),
            timestamp: logEntry.timestamp || new Date().toLocaleString('th-TH'),
            ...logEntry
        };
        logs.unshift(entryWithId);
        // Keep last 100 entries
        if (logs.length > 100) logs.pop();
        localStorage.setItem(this.STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(logs));
        this.enqueueSync('ADD_LOG', entryWithId);
        return entryWithId;
    }

    // =========================================================================
    // Offline Sync Queue (ข้อ 4: pea_offline_sync_queue)
    // =========================================================================
    getSyncQueue() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SYNC_QUEUE)) || [];
        } catch(e) {
            return [];
        }
    }

    enqueueSync(action, payload, allowPhotoStrip) {
        const pushToQueue = () => {
            const queue = this.getSyncQueue();
            queue.push({
                queueId: 'Q-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4),
                action,
                payload,
                enqueuedAt: new Date().toISOString()
            });
            this._setItemQuotaSafe(this.STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue), !!allowPhotoStrip);
            window.dispatchEvent(new CustomEvent('pea-sync-queue-updated', { detail: { queueLength: queue.length } }));
        };

        if (!this.isOnline()) {
            // ไม่มีอินเทอร์เน็ต -> เก็บเข้าคิวสำหรับซิงค์ทีหลัง
            pushToQueue();
        } else if (typeof window.googleSheet === 'undefined' || !window.googleSheet.isConnected()) {
            // ยังไม่ได้ตั้งค่า URL ชีต -> เข้าคิวเสมอ (เดิมปล่อยผ่านเงียบ ๆ ข้อมูลไม่มีทางขึ้นชีต)
            // พอตั้งค่าหรือกดปุ่มซิงค์ ระบบจะส่งคิวนี้ขึ้นไปเอง
            console.log(`[PEA DB] ยังไม่ได้ตั้ง Google Sheets URL, เก็บ "${action}" เข้าคิว`);
            pushToQueue();
        } else {
            // Already online: ส่งขึ้น Google Sheets จริงทันที (ถ้าตั้ง URL ไว้)
            // ให้ผลลัพธ์จริงกลับมา: ถ้าส่งไม่สำเร็จ (ถูกบล็อก/CORS/error) => เก็บเข้าคิว + ประกาศให้ UI รู้
            this.syncToGoogleSheets(action, payload).then(result => {
                if (!result || result.success !== true) {
                    pushToQueue();
                    console.warn(`[PEA DB] ส่ง GSheet ไม่สำเร็จ (${result ? (result.reason || result.error || 'error') : 'unknown'}) เก็บเข้าคิวรอซิงค์:`, action);
                }
            }).catch(e => {
                console.warn('[PEA DB] ส่ง GSheet ขัดข้อง เก็บเข้าคิวรอซิงค์:', e);
                pushToQueue();
            });
        }
    }

    // แผนที่ action ในเครื่อง -> action ที่ Google Sheet รองรับเขียนได้
    getGoogleSheetsActionFor(action) {
        const map = {
            'UPDATE_VEHICLE': 'VEHICLE',
            // DELETE_VEHICLE ไม่มีตารางลบฝั่ง GAS ถ้าส่ง VEHICLE ไปจะถูก "เขียนใหม่" กลับไป = รถที่ลบแล้วกลับมาโผล่ => ข้าม
            'DELETE_VEHICLE': null,
            'UPDATE_EMPLOYEE': 'EMPLOYEE',
            // DELETE_EMPLOYEE เช่นกัน ฝั่ง GAS เป็น Upsert ล้วน => ไม่ส่งขึ้นไป จะไหลหลงกลับมาได้
            'DELETE_EMPLOYEE': null,
            'SAVE_TICKET': 'REPAIR_APPROVAL',
            'ADD_LOG': null,
            'SAVE_INSPECTION': 'INSPECTION',
            'SAVE_DEPARTURE': 'DEPARTURE',
            // ปิดภารกิจ/บันทึกเลขไมล์ขากลับ ไปที่สมุด บันทึกการเข้า-ออกรถยนต์ (GAS: DEPARTURE_END)
            'UPDATE_DEPARTURE': 'DEPARTURE_END'
        };
        return map[action] || null;
    }

    // ส่งรายการใดรายการหนึ่งขึ้น Google Sheets
    async syncToGoogleSheets(action, payload) {
        const gsAction = this.getGoogleSheetsActionFor(action);
        if (!gsAction) {
            console.log(`[PEA DB] ข้ามการซิงค์ action="${action}" (Google Sheets ยังไม่มีตารางรองรับ)`);
            return { status: 200, action, ok: true, skipped: true, success: true };
        }
        if (!window.googleSheet || !googleSheet.isConnected()) {
            // ยังไม่ได้ตั้ง URL Google Sheets -> ยอมรับผลไว้ในเครื่อง (เปิดคิวจริงได้ด้วยปุ่มซิงค์)
            console.log(`[PEA DB] ไม่ได้ตั้งค่า Google Sheets URL, ทำรายการ ${action} เฉพาะในเครื่อง`);
            return { status: 200, action, ok: true, skipped: true, success: true };
        }
        try {
            const result = await googleSheet.sendToGoogleSheet(gsAction, payload);
            if (result && result.success === true) {
                console.log(`[PEA Google Sheets Sync] ${gsAction} สำเร็จ:`, payload.plate || payload.id || payload.ticketId || '');
            } else {
                console.warn(`[PEA Google Sheets Sync] ${gsAction} ไม่สำเร็จ:`, result ? (result.reason || result.error || 'unknown') : 'no result');
            }
            return result;
        } catch (e) {
            console.warn(`[PEA Google Sheets Sync] ${gsAction} ล้มเหลว:`, e && e.message ? e.message : e);
            return { status: 500, action, ok: false, success: false, error: e && e.message ? e.message : String(e) };
        }
    }

    async processSyncQueue() {
        if (!this.isOnline()) return { success: false, message: 'ระบบยังอยู่ในสถานะออฟไลน์ ไม่สามารถซิงค์ได้' };
        
        const queue = this.getSyncQueue();
        if (queue.length === 0) return { success: true, count: 0, message: 'ไม่มีข้อมูลค้างซิงค์ ข้อมูลเป็นปัจจุบันแล้ว' };

        // Max ลองซิงค์ต่อรายการกัน "คิวเป็นพิษ" (payload ที่ส่งไม่ได้ทุกครั้งจะได้ไม่ติดค้างตลอดการใช้งาน)
        const MAX_ATTEMPTS = 10;

        // Flush ทีละรายการ: ส่งได้สำเร็จ => ตัดออก, ส่งไม่ได้ (offline/error) => คงไว้ในคิว
        const remaining = [];
        let successCount = 0;
        let droppedCount = 0;
        // คิว UPDATE เก่าที่ดันไปช้า มี payload เลขไมล์เก่าได้ => ส่ง payload ล่าสุดจาก localStorage แทน
        // เพื่อกัน "คิวเก่าทับข้อมูลใหม่ที่เบียเพิ่ง upload" ทำให้อีกเครื่องเห็นเลขไมล์ถอยหลัง
        const freshPayload = (item) => {
            if (item.action === 'UPDATE_VEHICLE' && item.payload && item.payload.id) {
                const cur = this.getVehicleById(item.payload.id);
                return cur || item.payload;
            }
            if (item.action === 'UPDATE_EMPLOYEE' && item.payload && item.payload.id) {
                const cur = this.getEmployeeById(item.payload.id);
                return cur || item.payload;
            }
            return item.payload;
        };
        for (const item of queue) {
            try {
                const res = await this.syncToGoogleSheets(item.action, freshPayload(item));
                if (res && (res.success === true || res.ok === true)) {
                    successCount++;
                    continue;
                }
                const attempts = Number(item.syncAttempts || 0) + 1;
                if (attempts > MAX_ATTEMPTS) {
                    droppedCount++;
                    console.warn(`[PEA DB] ปล่อยคิวที่ซิงค์ไม่ได้ครบ ${MAX_ATTEMPTS} ครั้ง (id=${item.queueId} action=${item.action}) — มันอาจมี payload ที่ GAS ปฏิเสธตลอด โปรดตรวจสอบข้อมูล`, item.payload);
                    continue;
                }
                remaining.push(Object.assign({}, item, { syncAttempts: attempts }));
            } catch (e) {
                const attempts = Number(item.syncAttempts || 0) + 1;
                if (attempts > MAX_ATTEMPTS) {
                    droppedCount++;
                    console.warn(`[PEA DB] ปล่อยคิวที่เกิด error ซ้ำ ${MAX_ATTEMPTS} ครั้ง (id=${item.queueId} action=${item.action})`, e);
                    continue;
                }
                remaining.push(Object.assign({}, item, { syncAttempts: attempts }));
            }
        }

        this._setItemQuotaSafe(this.STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(remaining), true);
        window.dispatchEvent(new CustomEvent('pea-sync-queue-updated', { detail: { queueLength: remaining.length } }));

        const totalToSync = queue.length;
        const failed = remaining.length;
        if (failed === 0) {
            return {
                success: true,
                count: successCount,
                dropped: droppedCount,
                message: `ซิงค์ข้อมูล ${successCount} รายการขึ้น Google Sheets สำเร็จเรียบร้อย!${droppedCount ? ` (ปล่อยคิวเสีย ${droppedCount} รายการ)` : ''}`
            };
        }
        return {
            success: false,
            count: successCount,
            failed,
            dropped: droppedCount,
            message: `ซิงค์สำเร็จ ${successCount} รายการ, ยังมี ${failed} รายการค้าง (จะลองใหม่ในครั้งถัดไป)${droppedCount ? `, ปล่อยคิวเสีย ${droppedCount} รายการ` : ''}`
        };
    }

    // Last inspected vehicle memory
    getLastInspectedVehicleId() {
        return localStorage.getItem(this.STORAGE_KEYS.LAST_VEHICLE) || 'PEA-PK-4501';
    }

    setLastInspectedVehicleId(vehicleId) {
        localStorage.setItem(this.STORAGE_KEYS.LAST_VEHICLE, vehicleId);
    }
}

// Global instance
const db = new PEADatabase();

