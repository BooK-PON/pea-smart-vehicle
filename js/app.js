/**
 * PEA Smart Vehicle Inspection & Fleet Management System
 * Main Application Logic & Controller
 * Build Version: v0.7.17
 */

class PEASmartVehicleApp {
    constructor() {
        this.currentRole = 'DRIVER'; // 'DRIVER', 'MECHANIC', 'CHIEF'
        this.currentTab = 'inspect';  // 'inspect', 'mechanic', 'supervisor', 'logs'
        this.currentVehicle = null;
        this.checklistStep = 'EXTERIOR'; // 'EXTERIOR', 'INTERIOR', 'SAFETY', 'SPECIAL'
        this.checklistResponses = {}; // { itemId: { status: 'PASS' | 'FAIL', description: '', photo: null, critical: bool, name: '' } }
        this.fleetFilter = 'ALL'; // 'ALL', 'READY', 'WARNING', 'CRITICAL'
        this.mechanicFilter = 'ALL'; // 'ALL', 'CRITICAL', 'WARNING'
        this.sunlightMode = localStorage.getItem('pea_sunlight_mode') === 'true';

        this.init();
    }

    init() {
        try { this.applySunlightMode(this.sunlightMode); } catch(e) { console.error('[PEA] Sunlight mode error:', e); }
        try { this.setupLiveClock(); } catch(e) { console.error('[PEA] Live clock error:', e); }
        try { this.setupEventListeners(); } catch(e) { console.error('[PEA] Setup listeners error:', e); }
        try { this.loadInitialVehicle(); } catch(e) { console.error('[PEA] Load vehicle error:', e); }
        try { this.renderChecklist(); } catch(e) { console.error('[PEA] Checklist error:', e); }
        try { this.renderMechanicTickets(); } catch(e) { console.error('[PEA] Mechanic error:', e); }
        try { this.renderSupervisorDashboard(); } catch(e) { console.error('[PEA] Supervisor error:', e); }
        try { this.renderActivityLogs(); } catch(e) { console.error('[PEA] Logs error:', e); }
        try { this.renderActiveTripsTab(); } catch(e) { console.error('[PEA] Active trips error:', e); }
try { this.updateNetworkUI(); } catch(e) { console.error('[PEA] Network UI error:', e); }
        try { this.autoLoadFromGoogleSheetIfNewDay(); } catch(e) { console.error('[PEA] Auto GSheet load error:', e); }
        try { this.checkFleetAlerts(); } catch(e) { console.error('[PEA] Fleet email alert scan error:', e); }

        console.log(`[PEA Smart Vehicle] Initialized version ${APP_BUILD_VERSION}`);
    }

    // =========================================================================
    // UI Theme & Live Clock
    // =========================================================================
    setupLiveClock() {
        const update = () => {
            const el = document.getElementById('live-clock');
            if (el) {
                const now = new Date();
                el.innerText = now.toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                }) + ' ' + now.toLocaleTimeString('th-TH');
            }
        };
        update();
        setInterval(update, 1000);
    }

    toggleSunlightMode() {
        this.sunlightMode = !this.sunlightMode;
        localStorage.setItem('pea_sunlight_mode', this.sunlightMode);
        this.applySunlightMode(this.sunlightMode);
        notifier.showToast(
            this.sunlightMode ? 'เปิดโหมดกลางแดด (Sunlight Mode)' : 'เปิดโหมดห้องควบคุม (Dark Mode)',
            this.sunlightMode ? 'ปรับหน้าจอคอนทราสต์สูงเพื่อการตรวจสภาพกลางแจ้ง' : 'สลับกลับสู่โหมดหน้าจอถนอมสายตา',
            'INFO'
        );
    }

    applySunlightMode(enable) {
        if (enable) {
            document.body.classList.add('sunlight-mode');
            const icon = document.getElementById('sunlight-icon');
            if (icon) icon.className = 'fa-solid fa-moon text-amber-500';
            const label = document.getElementById('sunlight-label');
            if (label) label.innerText = 'โหมดมืด';
        } else {
            document.body.classList.remove('sunlight-mode');
            const icon = document.getElementById('sunlight-icon');
            if (icon) icon.className = 'fa-solid fa-sun text-pea-gold';
            const label = document.getElementById('sunlight-label');
            if (label) label.innerText = 'โหมดกลางแดด';
        }
    }

    // =========================================================================
    // Network & Online/Offline Mode UI
    // =========================================================================
    updateNetworkUI() {
        const isOnline = db.isOnline();
        const mode = db.getNetworkMode();
        const statusBadge = document.getElementById('network-status-badge');
        const queueBadge = document.getElementById('sync-queue-badge');
        const queue = db.getSyncQueue();

        if (statusBadge) {
            if (isOnline) {
                statusBadge.innerHTML = `
                    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1"></span>
                    <span class="text-emerald-400 font-bold">Online (D1 Cloud)</span>
                `;
            } else {
                statusBadge.innerHTML = `
                    <span class="w-2 h-2 rounded-full bg-red-400 animate-ping mr-1"></span>
                    <span class="text-red-400 font-bold">Offline (Local)</span>
                `;
            }
        }

        if (queueBadge) {
            if (queue.length > 0) {
                queueBadge.classList.remove('hidden');
                queueBadge.innerText = `${queue.length} รายการค้างซิงค์`;
            } else {
                queueBadge.classList.add('hidden');
            }
        }
    }

    toggleNetworkSimulation() {
        const current = db.getNetworkMode();
        let nextMode = 'auto';
        if (current === 'auto') nextMode = 'offline_forced';
        else if (current === 'offline_forced') nextMode = 'online_forced';
        else nextMode = 'auto';

        db.setNetworkMode(nextMode);
        this.updateNetworkUI();

        const desc = nextMode === 'offline_forced' 
            ? 'จำลองสถานะออฟไลน์ (Offline Mode): บันทึกข้อมูลลง LocalStorage + คิวซิงค์' 
            : (nextMode === 'online_forced' ? 'จำลองสถานะออนไลน์ (Online Mode): เชื่อมต่อ Cloudflare D1' : 'โหมดตรวจเช็กเน็ตอัตโนมัติ (Auto Detect)');
        
        notifier.showToast('สลับสถานะเครือข่าย', desc, nextMode === 'offline_forced' ? 'WARNING' : 'SUCCESS');
    }

    async triggerSyncNow() {
        const result = await db.processSyncQueue();
        this.updateNetworkUI();
        if (result.success) {
            notifier.showToast('การซิงค์ข้อมูล Cloudflare D1', result.message, 'SUCCESS');
        } else {
            notifier.showToast('การซิงค์ข้อมูลล้มเหลว', result.message, 'CRITICAL');
        }
    }

    // =========================================================================
    // Role & Tab Switching
    // =========================================================================
    setRole(role) {
        this.currentRole = role;
        
        // Auto-switch to matching view
        if (role === 'DRIVER') this.setTab('inspect');
        else if (role === 'MECHANIC') this.setTab('mechanic');
        else if (role === 'CHIEF') this.setTab('supervisor');

        // Update selector
        const selectEl = document.getElementById('user-role-select');
        if (selectEl) selectEl.value = role;

        notifier.showToast('สลับบทบาทผู้ใช้งาน', `เข้าสู่โหมด: ${this.getRoleName(role)}`, 'INFO');
    }

    getRoleName(role) {
        if (role === 'DRIVER') return 'พนักงานขับรถ / ผู้ตรวจสภาพ (Driver)';
        if (role === 'MECHANIC') return 'ช่างเครื่องยนต์ / ช่างซ่อม (Mechanic)';
        if (role === 'CHIEF') return 'หัวหน้าแผนกยานพาหนะ (Supervisor)';
        return role;
    }

    setTab(tabName) {
        this.currentTab = tabName;

        // Hide all views
        const views = ['view-driver-inspect', 'view-mechanic-tickets', 'view-supervisor-dashboard', 'view-activity-logs', 'view-active-trips'];
        views.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });

        // Show selected view
        let targetId = 'view-driver-inspect';
        if (tabName === 'mechanic') targetId = 'view-mechanic-tickets';
        if (tabName === 'supervisor') targetId = 'view-supervisor-dashboard';
        if (tabName === 'logs') targetId = 'view-activity-logs';
        if (tabName === 'trips') targetId = 'view-active-trips';

        const targetEl = document.getElementById(targetId);
        if (targetEl) targetEl.classList.remove('hidden');

        // Update Navigation Button States
        document.querySelectorAll('.nav-tab-btn').forEach(btn => {
            if (btn.getAttribute('data-tab') === tabName) {
                btn.className = 'nav-tab-btn px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 border-b-2 bg-purple-900 text-amber-300 border-amber-400';
            } else {
                btn.className = 'nav-tab-btn px-4 py-2.5 text-xs font-bold transition flex items-center gap-2 border-b-2 border-transparent text-slate-300 hover:bg-slate-800';
            }
        });

        // Update active trips badge in nav
        this.updateActiveTripsNavBadge();

        // Re-render data for target tab
        try {
            if (tabName === 'mechanic') this.renderMechanicTickets();
            if (tabName === 'supervisor') this.renderSupervisorDashboard();
            if (tabName === 'logs') this.renderActivityLogs();
            if (tabName === 'trips') this.renderActiveTripsTab();
        } catch(e) {
            console.error('[PEA] Error rendering tab view:', e);
        }
    }

    // =========================================================================
    // Vehicle Selection & Mileage / PM & Tax Tracking
    // =========================================================================
    loadInitialVehicle() {
        const vehicles = db.getVehicles();
        if (!vehicles || vehicles.length === 0) {
            console.warn('[PEA] No vehicles found, re-seeding...');
            db.init();
        }
        const validVehicles = db.getVehicles();
        const lastId = db.getLastInspectedVehicleId();
        const vehicle = db.getVehicleById(lastId) || (validVehicles && validVehicles.length > 0 ? validVehicles[0] : null);
        if (vehicle) {
            this.selectVehicle(vehicle.id);
        } else {
            this.updateVehicleHeaderCard();
        }
    }

    selectVehicle(vehicleId) {
        let vehicle = db.getVehicleById(vehicleId);
        if (!vehicle) {
            const list = db.getVehicles();
            vehicle = list && list.length > 0 ? list[0] : null;
        }
        if (!vehicle) return;

        this.currentVehicle = vehicle;
        db.setLastInspectedVehicleId(vehicle.id);

        // Reset checklist responses
        this.checklistResponses = {};
        this.checklistStep = 'EXTERIOR';

        // Update UI
        this.updateVehicleHeaderCard();
        this.renderChecklist();
    }

    updateVehicleHeaderCard() {
        const vehicles = db.getVehicles();
        const v = this.currentVehicle || (vehicles && vehicles.length > 0 ? vehicles[0] : null);
        if (!v) return;
        if (!this.currentVehicle) this.currentVehicle = v;

        const typeInfo = PEA_VEHICLE_TYPES[v.type] || PEA_VEHICLE_TYPES.PICKUP;

        // Vehicle selector dropdown options
        const selector = document.getElementById('vehicle-select-dropdown');
        if (selector) {
            selector.innerHTML = vehicles.map(item => `
                <option value="${item.id}" ${item.id === v.id ? 'selected' : ''}>
                    ${item.plate} - ${item.model} (${item.id})
                </option>
            `).join('');
        }

        // Plate, Model, Driver Info
        const plateEl = document.getElementById('active-vehicle-plate');
        if (plateEl) plateEl.innerText = v.plate;

        const modelEl = document.getElementById('active-vehicle-model');
        if (modelEl) modelEl.innerText = `${v.model} • ${typeInfo.category}`;

        const driverInput = document.getElementById('inspector-name-input');
        const empIdInput = document.getElementById('employee-id-input');
        // เงื่อนไข: หากไม่มีการกรอกรหัสพนักงาน ให้ช่องรหัสและช่องชื่อว่างเปล่าเสมอ
        if (empIdInput && !empIdInput.value.trim()) {
            empIdInput.value = '';
            if (driverInput) driverInput.value = '';
            this.handleEmployeeIdInput('');
        } else if (empIdInput && empIdInput.value.trim()) {
            this.handleEmployeeIdInput(empIdInput.value.trim());
        }

        // Populate Start Mileage (ดึงเลขไมล์ล่าสุดของรถมาแสดงอัตโนมัติ)
        const startMileageInput = document.getElementById('start-mileage-input');
        if (startMileageInput) startMileageInput.value = v.mileage || 0;

        const fuelRefillInput = document.getElementById('fuel-refill-input');
        if (fuelRefillInput) fuelRefillInput.value = 0;

        // Check Active Duty / Mission Status
        const activeMission = db.getActiveMissionByVehicleId(v.id);
        const dutyBadge = document.getElementById('vehicle-duty-status-badge');
        const btnStartDuty = document.getElementById('btn-start-duty');
        if (dutyBadge && btnStartDuty) {
            if (activeMission) {
                dutyBadge.className = 'text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-900/80 text-blue-300 border border-blue-500/50 flex items-center gap-1 animate-pulse';
                dutyBadge.innerHTML = `<i class="fa-solid fa-truck-fast"></i> ออกปฏิบัติงาน (${activeMission.departureTime})`;
                dutyBadge.classList.remove('hidden');

                btnStartDuty.className = 'text-[11px] px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition flex items-center gap-1.5 shadow';
                btnStartDuty.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> กำลังใช้งาน (แก้ไขภารกิจ)';
            } else {
                dutyBadge.classList.add('hidden');
                btnStartDuty.className = 'text-[11px] px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition flex items-center gap-1.5 shadow';
                btnStartDuty.innerHTML = '<i class="fa-solid fa-truck-fast"></i> บันทึกรถออกปฏิบัติงาน';
            }
        }

        // Update Nav Badge
        this.updateActiveTripsNavBadge();

        // Calculate PM & Tax & Fuel
        this.renderPmAndTaxBadges(v);
    }

    renderPmAndTaxBadges(v) {
        const container = document.getElementById('vehicle-alert-badges');
        if (!container) return;

        let badges = [];

        // 1. ระดับน้ำมันเชื้อเพลิงคงเหลือ (Fuel Level Badge - ภาษาทางการ)
        const fuel = v.fuelLevel !== undefined ? v.fuelLevel : 100;
        if (fuel <= 15) {
            badges.push(`
                <div class="px-2.5 py-1 rounded-lg bg-red-600/30 border border-red-500 text-red-300 text-xs flex items-center gap-1.5 font-bold animate-pulse">
                    <i class="fa-solid fa-gas-pump text-red-400"></i>
                    <span>ระดับน้ำมันเชื้อเพลิงวิกฤต: ร้อยละ ${fuel}% (ควรเติมทันทีก่อนออกปฏิบัติงาน)</span>
                </div>
            `);
        } else if (fuel <= 25) {
            badges.push(`
                <div class="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/60 text-amber-300 text-xs flex items-center gap-1.5 font-bold">
                    <i class="fa-solid fa-gas-pump text-amber-400"></i>
                    <span>ระดับน้ำมันเชื้อเพลิงต่ำ: ร้อยละ ${fuel}%</span>
                </div>
            `);
        } else {
            badges.push(`
                <div class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] flex items-center gap-1">
                    <i class="fa-solid fa-gas-pump text-pea-gold"></i>
                    <span>ระดับน้ำมันเชื้อเพลิงคงเหลือ: ร้อยละ ${fuel}%</span>
                </div>
            `);
        }

        // 2. PM 10,000 km calculation
        const distanceSincePm = v.mileage - v.lastPmMileage;
        if (distanceSincePm >= 10000) {
            badges.push(`
                <div class="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs flex items-center gap-1.5 font-bold animate-pulse">
                    <i class="fa-solid fa-triangle-exclamation text-amber-400"></i>
                    <span>ถึงกำหนด PM 10,000 กม. (วิ่งแล้ว ${distanceSincePm.toLocaleString()} กม. - ควรเปลี่ยนถ่ายของเหลว)</span>
                </div>
            `);
        } else {
            badges.push(`
                <div class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] flex items-center gap-1">
                    <i class="fa-solid fa-wrench text-pea-gold"></i>
                    <span>รอบ PM ถัดไป: อีก ${(10000 - distanceSincePm).toLocaleString()} กม.</span>
                </div>
            `);
        }

        // 3. Tax Expiration Calculation
        if (v.taxExpiry) {
            const expDate = new Date(v.taxExpiry);
            const today = new Date();
            const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                badges.push(`
                    <div class="px-2.5 py-1 rounded-lg bg-red-600/30 border border-red-500 text-red-300 text-xs flex items-center gap-1.5 font-bold">
                        <i class="fa-solid fa-gavel text-red-400"></i>
                        <span>ภาษีหมดอายุแล้ว ${Math.abs(diffDays)} วัน! (มีผลทางกฎหมาย ห้ามขับขี่)</span>
                    </div>
                `);
            } else if (diffDays <= 30) {
                badges.push(`
                    <div class="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/60 text-amber-300 text-xs flex items-center gap-1.5 font-bold">
                        <i class="fa-solid fa-calendar-xmark text-amber-400"></i>
                        <span>ภาษีจะหมดอายุในอีก ${diffDays} วัน (${v.taxExpiry})</span>
                    </div>
                `);
            } else {
                badges.push(`
                    <div class="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] flex items-center gap-1">
                        <i class="fa-solid fa-calendar-check text-emerald-400"></i>
                        <span>ภาษีหมดอายุ: ${v.taxExpiry}</span>
                    </div>
                `);
            }
        }

        container.innerHTML = badges.join('');
    }

    // =========================================================================
    // Step-by-Step Checklist (Driver Role)
    // =========================================================================
    setChecklistStep(stepKey) {
        this.checklistStep = stepKey;
        this.renderChecklist();
    }

    renderChecklist() {
        if (!this.currentVehicle) return;
        const v = this.currentVehicle;
        const categoryData = PEA_CHECKLIST_TEMPLATE[this.checklistStep];
        if (!categoryData) return;

        // Render Step Navigation Buttons
        const steps = ['EXTERIOR', 'INTERIOR', 'SAFETY', 'SPECIAL'];
        steps.forEach(key => {
            const btn = document.getElementById(`step-btn-${key.toLowerCase()}`);
            if (btn) {
                if (key === this.checklistStep) {
                    btn.className = 'px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-purple-800 text-amber-300 border-2 border-amber-400 shadow-md';
                } else {
                    btn.className = 'px-3 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700';
                }
            }
        });

        // Get checklist items for this step
        let items = [];
        if (this.checklistStep === 'SPECIAL') {
            items = categoryData.getItemsByVehicleType(v.type);
        } else {
            items = categoryData.items;
        }

        // Checklist title & description
        const titleEl = document.getElementById('checklist-category-title');
        if (titleEl) {
            titleEl.innerHTML = `<i class="fa-solid ${categoryData.icon} text-amber-400 mr-2"></i> ${categoryData.title}`;
        }

        // Render Checklist Rows
        const listContainer = document.getElementById('checklist-items-container');
        if (!listContainer) return;

        listContainer.innerHTML = items.map(item => {
            const response = this.checklistResponses[item.id] || { status: null, description: '', photo: null };
            const isPass = response.status === 'PASS';
            const isFail = response.status === 'FAIL';

            return `
                <div class="pea-glass p-4 rounded-xl border transition-all ${isFail ? 'border-red-500/80 bg-red-950/20' : (isPass ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-slate-800')} flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    
                    <!-- Item Label -->
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-xs font-bold text-white">${item.name}</span>
                            ${item.critical ? '<span class="text-[10px] px-1.5 py-0.5 rounded bg-red-600/30 text-red-300 border border-red-500/50 font-bold">จุดวิกฤต (Critical)</span>' : ''}
                        </div>
                        ${isFail ? `
                            <div class="text-xs text-red-300 flex items-center gap-2 mt-1.5">
                                <i class="fa-solid fa-triangle-exclamation"></i>
                                <span>ระบุชำรุด: ${response.description || 'ยังไม่ได้กรอกรายละเอียด'}</span>
                                ${response.photo ? '<span class="text-emerald-400 font-bold ml-2"><i class="fa-solid fa-camera"></i> แนบรูปถ่ายแล้ว</span>' : '<span class="text-amber-400 font-bold ml-2 animate-pulse"><i class="fa-solid fa-circle-exclamation"></i> บังคับแนบรูปถ่าย!</span>'}
                            </div>
                        ` : ''}
                    </div>

                    <!-- Evaluation Action Buttons -->
                    <div class="flex items-center gap-2 w-full md:w-auto">
                        <!-- PASS Button -->
                        <button onclick="app.recordChecklistResponse('${item.id}', 'PASS', '${item.name.replace(/'/g, "\\'")}', ${item.critical})" 
                            class="flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${isPass ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-700/50 border border-emerald-400' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'}">
                            <i class="fa-solid fa-check"></i> ผ่านเกณฑ์
                        </button>

                        <!-- FAIL Button -->
                        <button onclick="app.openDefectModal('${item.id}', '${item.name.replace(/'/g, "\\'")}', ${item.critical})" 
                            class="flex-1 md:flex-initial px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${isFail ? 'bg-red-600 text-white shadow-lg shadow-red-700/50 border border-red-400' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'}">
                            <i class="fa-solid fa-xmark"></i> ชำรุด / ไม่ครบ
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Update Bottom "Next" button text/action
        const nextStepBtn = document.getElementById('checklist-next-step-btn');
        if (nextStepBtn) {
            const stepIndex = steps.indexOf(this.checklistStep);
            if (stepIndex < steps.length - 1) {
                const nextStepKey = steps[stepIndex + 1];
                nextStepBtn.innerHTML = `ถัดไป: ${PEA_CHECKLIST_TEMPLATE[nextStepKey].title} <i class="fa-solid fa-arrow-right ml-1"></i>`;
                nextStepBtn.onclick = () => {
                    this.setChecklistStep(nextStepKey);
                    window.scrollTo({ top: 180, behavior: 'smooth' });
                };
            } else {
                nextStepBtn.innerHTML = `<i class="fa-solid fa-check-double mr-1"></i> ตรวจครบ 4 หมวดแล้ว พร้อมสรุปผล`;
                nextStepBtn.onclick = () => {
                    const submitBtn = document.getElementById('submit-inspection-btn');
                    if (submitBtn) submitBtn.scrollIntoView({ behavior: 'smooth' });
                };
            }
        }
    }

    recordChecklistResponse(itemId, status, name, critical, description = '', photo = null) {
        this.checklistResponses[itemId] = {
            itemId,
            status,
            name,
            critical,
            description,
            photo
        };
        this.renderChecklist();
    }

    // =========================================================================
    // Defect Reporting Modal & Real-Time Photo Capture
    // =========================================================================
    openDefectModal(itemId, itemName, isCritical) {
        const modal = document.getElementById('pea-defect-modal');
        if (!modal) return;

        const currentResponse = this.checklistResponses[itemId] || {};

        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onclick="if(event.target === this) this.parentElement.innerHTML = ''">
                <div class="bg-slate-900 border border-red-500/60 rounded-2xl max-w-lg w-full shadow-2xl p-6 text-white space-y-4 animate-fade-in">
                    
                    <div class="flex justify-between items-start border-b border-slate-800 pb-3">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 rounded bg-red-600/30 border border-red-500 text-red-400 text-[10px] font-black uppercase">DEFECT REPORT</span>
                                ${isCritical ? '<span class="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold">อันตรายวิกฤต (Safety Critical)</span>' : ''}
                            </div>
                            <h3 class="text-sm font-bold text-white mt-1">${itemName}</h3>
                        </div>
                        <button onclick="document.getElementById('pea-defect-modal').innerHTML = ''" class="text-slate-400 hover:text-white">
                            <i class="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>

                    <!-- Defect Description Input -->
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1">
                            รายละเอียดจุดบกพร่อง / ความเสียหายที่ตรวจพบ: <span class="text-red-400">*</span>
                        </label>
                        <textarea id="modal-defect-desc" rows="3" placeholder="ระบุอาการชำรุด เช่น น้ำมันเครื่องแห้ง, ล้อบวม, ไฮดรอลิกซึม..." 
                            class="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 font-medium">${currentResponse.description || ''}</textarea>
                    </div>

                    <!-- Photo Capture / Upload (Mandatory) -->
                    <div>
                        <label class="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                            <span>ภาพถ่ายหลักฐานจุดชำรุด (Photo Evidence): <span class="text-red-400 font-bold">* บังคับแนบ</span></span>
                            <span class="text-[11px] text-amber-400 font-mono" id="photo-status-text">${currentResponse.photo ? '✅ มีภาพถ่ายแล้ว' : '⚠️ ยังไม่มีภาพถ่าย'}</span>
                        </label>

                        <!-- Preview Box -->
                        <div id="modal-photo-preview" class="w-full h-44 bg-slate-950/80 rounded-xl border border-dashed border-slate-700 flex flex-col items-center justify-center overflow-hidden relative mb-2">
                            ${currentResponse.photo 
                                ? `<img src="${currentResponse.photo}" class="w-full h-full object-contain" alt="ภาพจุดชำรุด">`
                                : `
                                    <i class="fa-solid fa-camera text-slate-600 text-3xl mb-1"></i>
                                    <span class="text-xs text-slate-500">แตะเพื่อถ่ายรูปด้วยกล้อง หรือเลือกไฟล์จากเครื่อง</span>
                                `
                            }
                        </div>

                        <!-- Upload Buttons -->
                        <div class="grid grid-cols-2 gap-2">
                            <label class="btn-safety-orange px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow">
                                <i class="fa-solid fa-camera"></i> เปิดกล้อง / เลือกรูป
                                <input type="file" id="modal-photo-input" accept="image/*" capture="environment" class="hidden" onchange="app.handlePhotoUpload(event)">
                            </label>

                            <!-- Preset Guideline Photo Button -->
                            <button type="button" onclick="app.applyPresetPhoto('${itemId}')" class="bg-purple-900/80 hover:bg-purple-800 text-amber-300 border border-purple-500/50 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                                <i class="fa-solid fa-wand-magic-sparkles text-amber-400"></i> ใช้ภาพตัวอย่าง กฟภ.
                            </button>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
                        <button onclick="document.getElementById('pea-defect-modal').innerHTML = ''" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800">
                            ยกเลิก
                        </button>
                        <button onclick="app.saveDefectFromModal('${itemId}', '${itemName.replace(/'/g, "\\'")}', ${isCritical})" class="btn-safety-orange px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow">
                            <i class="fa-solid fa-floppy-disk"></i> บันทึกจุดชำรุดนี้
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    handlePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            const preview = document.getElementById('modal-photo-preview');
            if (preview) {
                preview.innerHTML = `<img src="${dataUrl}" class="w-full h-full object-contain" alt="ภาพชำรุด">`;
                preview.dataset.photoUrl = dataUrl;
            }
            const statusText = document.getElementById('photo-status-text');
            if (statusText) statusText.innerText = '✅ อัปโหลดภาพเรียบร้อย';
        };
        reader.readAsDataURL(file);
    }

    applyPresetPhoto(itemId) {
        // Find matching or fallback preset
        const preset = DEFECT_PRESETS.find(p => p.targetItem === itemId) || DEFECT_PRESETS[0];
        const preview = document.getElementById('modal-photo-preview');
        if (preview) {
            preview.innerHTML = `<img src="${preset.imageUrl}" class="w-full h-full object-contain" alt="ภาพตัวอย่างชำรุด">`;
            preview.dataset.photoUrl = preset.imageUrl;
        }
        const descInput = document.getElementById('modal-defect-desc');
        if (descInput && !descInput.value) {
            descInput.value = preset.description;
        }
        const statusText = document.getElementById('photo-status-text');
        if (statusText) statusText.innerText = '✅ ใช้ภาพจำลองตัวอย่าง กฟภ.';
        notifier.showToast('ใช้งานภาพตัวอย่าง', preset.title, 'INFO');
    }

    saveDefectFromModal(itemId, itemName, isCritical) {
        const descInput = document.getElementById('modal-defect-desc');
        const preview = document.getElementById('modal-photo-preview');
        const desc = descInput ? descInput.value.trim() : '';
        const photo = preview ? preview.dataset.photoUrl : null;

        // Validation: Mandatory photo upload
        if (!photo) {
            notifier.showToast('จำเป็นต้องแนบรูปถ่าย', 'ระบบป้องกันการส่งแบบฟอร์มหากมีจุดชำรุดที่ยังไม่ได้ถ่ายภาพแนบไว้ เพื่อความถูกต้องของข้อมูล', 'CRITICAL');
            return;
        }

        if (!desc) {
            notifier.showToast('กรุณาระบุรายละเอียด', 'พิมพ์คำอธิบายจุดชำรุดเพื่อให้ช่างซ่อมดำเนินการได้อย่างถูกต้อง', 'WARNING');
            return;
        }

        this.recordChecklistResponse(itemId, 'FAIL', itemName, isCritical, desc, photo);
        document.getElementById('pea-defect-modal').innerHTML = '';
        notifier.showToast('บันทึกจุดชำรุดแล้ว', `${itemName}: มีหลักฐานภาพถ่ายพร้อมส่งซ่อม`, 'WARNING');
    }

    // =========================================================================
    // Submit Form & Instant Analysis (Driver Role)
    // =========================================================================
    submitInspection() {
        if (!this.currentVehicle) return;
        const v = this.currentVehicle;

        const startMileageInput = document.getElementById('start-mileage-input');
        const endMileageInput = document.getElementById('end-mileage-input');
        const inspectorInput = document.getElementById('inspector-name-input');
        const employeeIdInput = document.getElementById('employee-id-input');
        const taskDescriptionInput = document.getElementById('task-description-input');
        const fuelSelect = document.getElementById('fuel-level-select');
        const fuelRefillInput = document.getElementById('fuel-refill-input');

        const startMileage = parseInt(startMileageInput ? startMileageInput.value : v.mileage) || 0;
        const endMileage = endMileageInput ? (parseInt(endMileageInput.value) || startMileage) : startMileage;
        const mileageDelta = endMileage - startMileage;

        // Validation: หากมีช่องเลขไมล์กลับ เลขไมล์หลังปฏิบัติงานต้องไม่น้อยกว่าเลขไมล์ก่อนปฏิบัติงาน
        if (endMileageInput && endMileage < startMileage) {
            notifier.showToast('ข้อมูลเลขไมล์ไม่ถูกต้อง', 'เลขไมล์กลับ (หลังปฏิบัติงาน) ต้องไม่น้อยกว่าเลขไมล์ไป (ก่อนปฏิบัติงาน)', 'CRITICAL');
            return;
        }

        const mileage = endMileage;
        const inspector = inspectorInput ? inspectorInput.value.trim() : v.driver;
        const employeeId = employeeIdInput ? employeeIdInput.value.trim() : '512446';
        const taskDescription = taskDescriptionInput ? taskDescriptionInput.value.trim() : 'ปฏิบัติงานประจำวัน';

        const fuelLevel = parseInt(fuelSelect ? fuelSelect.value : (v.fuelLevel !== undefined ? v.fuelLevel : 100));
        const fuelRefill = parseFloat(fuelRefillInput ? fuelRefillInput.value : 0) || 0;

        // Check if any failed items are missing photos
        const failedItems = Object.values(this.checklistResponses).filter(r => r.status === 'FAIL');
        for (const item of failedItems) {
            if (!item.photo) {
                notifier.showToast('ไม่สามารถส่งรายงานได้', `รายการ "${item.name}" ระบุว่าชำรุดแต่ยังไม่ได้ถ่ายภาพแนบ`, 'CRITICAL');
                return;
            }
        }

        // Instant Risk Assessment
        const criticalFailures = failedItems.filter(r => r.critical);
        const hasWarningFailures = failedItems.length > 0;

        let overallStatus = 'READY';
        if (criticalFailures.length > 0) {
            overallStatus = 'CRITICAL';
        } else if (hasWarningFailures) {
            overallStatus = 'WARNING';
        }

        // Update Vehicle State with Fuel Data
        v.mileage = mileage;
        v.fuelLevel = fuelLevel;
        v.status = overallStatus;
        v.lastInspectDate = new Date().toLocaleString('th-TH');
        db.saveVehicle(v);

        // If defects exist, create a consolidated repair ticket
        let newTicket = null;
        if (failedItems.length > 0) {
            newTicket = {
                ticketId: 'REP-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(100 + Math.random() * 900),
                vehicleId: v.id,
                plate: v.plate,
                model: v.model,
                reporter: inspector,
                timestamp: new Date().toLocaleString('th-TH'),
                status: 'PENDING_REPAIR',
                severity: overallStatus,
                items: failedItems.map(f => ({
                    itemId: f.itemId,
                    name: f.name,
                    critical: f.critical,
                    description: f.description,
                    photoBefore: f.photo,
                    photoAfter: null,
                    mechanicNote: null,
                    repairedAt: null
                }))
            };
            db.saveRepairTicket(newTicket);

            // Role-based Alert Broadcast to Mechanics & Supervisors
            notifier.broadcastAlert({
                targetRoles: ['MECHANIC', 'CHIEF'],
                title: overallStatus === 'CRITICAL' ? '🚨 พบรถชำรุดวิกฤต: สั่งห้ามใช้งาน!' : '⚠️ พบรถชำรุด: เปิดใบแจ้งซ่อม',
                message: `ทะเบียน ${v.plate} ชำรุด ${failedItems.length} จุด (${failedItems.map(f => f.name).join(', ')})`,
                type: overallStatus === 'CRITICAL' ? 'CRITICAL' : 'WARNING'
            });
        } else {
            notifier.broadcastAlert({
                targetRoles: ['DRIVER', 'CHIEF'],
                title: '✅ ผ่านการตรวจเช็ก 100%',
                message: `ทะเบียน ${v.plate} พร้อมออกปฏิบัติงานได้อย่างปลอดภัย (เชื้อเพลิงคงเหลือร้อยละ ${fuelLevel}%)`,
                type: 'SUCCESS'
            });
        }

        // LOG CONSOLIDATION (ข้อ 3: รวมบันทึกงานซ่อมที่มีหลายจุดชำรุดเป็น 1 รายการแถวเดียว)
        let summaryText = `[ภารกิจ: ${taskDescription}] `;
        summaryText += failedItems.length > 0 
            ? `ตรวจสภาพพบชำรุด ${failedItems.length} จุด: ${failedItems.map(f => f.name).join(', ')} (${overallStatus})`
            : 'ตรวจสภาพประจำวันผ่านเกณฑ์ 100% (พร้อมใช้งาน)';
        summaryText += ` • ระยะทาง: ${startMileage.toLocaleString()} ➔ ${endMileage.toLocaleString()} กม. (วิ่ง ${mileageDelta.toLocaleString()} กม.)`;
        summaryText += ` • ระดับน้ำมันเชื้อเพลิงคงเหลือ: ร้อยละ ${fuelLevel}%${fuelRefill > 0 ? ' (บันทึกเติม ' + fuelRefill + ' ลิตร)' : ''}`;

        db.addConsolidatedActivityLog({
            actionType: failedItems.length > 0 ? 'INSPECTION_DEFECT' : 'INSPECTION_PASS',
            vehicleId: v.id,
            plate: v.plate,
            operator: `${inspector} (รหัส ${employeeId})`,
            role: 'DRIVER',
            summary: summaryText,
            statusResult: overallStatus,
            ticketId: newTicket ? newTicket.ticketId : null
        });

        // 🚨 แจ้งเตือนระยะทางผิดปกติเกิน 10,000 กม. (ตาม feature_request.md)
        // เงื่อนไข: หากผลต่างระยะทาง (เลขไมล์หลัง - เลขไมล์ก่อน) เกิน 10,000 กิโลเมตร
        // ส่งการแจ้งเตือนทันทีไปยัง: 1. หัวหน้างาน (Supervisor) 2. ช่างซ่อมบำรุง (Maintenance Technician)
        if (mileageDelta > 10000) {
            notifier.broadcastAlert({
                targetRoles: ['CHIEF', 'MECHANIC'],
                title: '⚠️ แจ้งเตือนด่วน: ระยะทางวิ่งเกินกำหนด 10,000 กม.!',
                message: `ยานพาหนะทะเบียน ${v.plate} (${taskDescription}) มีการบันทึกระยะทางวิ่งในรอบนี้สูงถึง ${mileageDelta.toLocaleString()} กม. (ก่อน: ${startMileage.toLocaleString()} กม. / หลัง: ${endMileage.toLocaleString()} กม.) โปรดตรวจสอบความถูกต้องของข้อมูลหรือนำรถเข้าตรวจสภาพโดยด่วน`,
                type: 'CRITICAL',
                icon: 'fa-gauge-simple-high'
            });

            db.addConsolidatedActivityLog({
                actionType: 'MILEAGE_ANOMALY_ALERT',
                vehicleId: v.id,
                plate: v.plate,
                operator: 'ระบบเฝ้าระวังอัตโนมัติ (AI Alert)',
                role: 'CHIEF',
                summary: `ตรวจพบผลต่างเลขไมล์ผิดปกติ (${mileageDelta.toLocaleString()} กม. > 10,000 กม.) ในภารกิจ "${taskDescription}" ส่งสัญญาณเตือนถึงหัวหน้างานและช่างซ่อมบำรุงแล้ว`,
                statusResult: 'CRITICAL'
            });
        }

        const existingMission = db.getActiveMissionByVehicleId(v.id);
        const activeMissionId = existingMission ? existingMission.id : '-';

        // 🔗 บันทึกข้อมูลลงใน Google Sheets อัตโนมัติ (Google Sheets Integration)
        if (typeof googleSheet !== 'undefined') {
            googleSheet.logInspection({
                missionId: activeMissionId,
                vehicleId: v.id,
                plate: v.plate,
                model: v.model,
                department: v.department,
                driver: inspector,
                employeeId: employeeId,
                taskDescription: taskDescription,
                startMileage: startMileage,
                endMileage: endMileage,
                mileageDelta: mileageDelta,
                mileage: mileage,
                fuelLevel: fuelLevel,
                fuelRefill: fuelRefill,
                status: overallStatus,
                defects: failedItems.map(f => `${f.name}${f.critical ? ' [วิกฤต]' : ''}: ${f.description || 'พบอาการชำรุด'}`).join('; '),
                ticketId: newTicket ? newTicket.ticketId : '-',
                mileageAlert: mileageDelta > 10000 ? 'เกิน 10,000 กม. (เฝ้าระวัง)' : 'ปกติ'
            }).then(res => {
                if (res && res.success) {
                    console.log('[GoogleSheet] Inspection synchronized successfully');
                }
            }).catch(err => console.warn('[GoogleSheet] Inspection sync error:', err));
        }

        // เมื่อบันทึกผลการเดินทาง/ตรวจสภาพขากลับเรียบร้อย เคลียร์ภารกิจ Active Mission ออกจากระบบ
        db.completeVehicleMission(v.id);

        // Show Instant Analysis Result Modal
        this.showInstantAnalysisModal(overallStatus, failedItems, v, inspector, mileage, fuelLevel, fuelRefill, newTicket, startMileage, endMileage, mileageDelta, employeeId, taskDescription);

        // Refresh components
        this.updateVehicleHeaderCard();
        this.renderMechanicTickets();
        this.renderSupervisorDashboard();
        this.renderActivityLogs();
        this.updateNetworkUI();
    }

    showInstantAnalysisModal(status, failedItems, vehicle, inspector, mileage, fuelLevel, fuelRefill, ticket, startMileage = 0, endMileage = 0, mileageDelta = 0, employeeId = '512446', taskDescription = 'ปฏิบัติงานประจำวัน') {
        const modal = document.getElementById('pea-analysis-modal');
        if (!modal) return;

        let statusColor = 'emerald';
        let statusTitle = 'พร้อมใช้งาน (READY)';
        let statusDesc = 'รถผ่านเกณฑ์ตรวจเช็กทุกข้อ 100% สามารถนำออกปฏิบัติงานได้ทันทีตามมาตรฐานความปลอดภัย กฟภ.';
        let icon = 'fa-circle-check';

        if (status === 'CRITICAL') {
            statusColor = 'red';
            statusTitle = 'งดใช้งานเด็ดขาด (CRITICAL)';
            statusDesc = 'ตรวจพบจุดบกพร่องในระบบความปลอดภัยวิกฤต! รถจะถูกระงับการใช้งานในระบบทันทีจนกว่าจะได้รับการซ่อมและผ่านการอนุมัติ';
            icon = 'fa-ban';
        } else if (status === 'WARNING') {
            statusColor = 'amber';
            statusTitle = 'เฝ้าระวัง / นัดหมายซ่อม (WARNING)';
            statusDesc = 'พบจุดชำรุดทั่วไปที่ยังสามารถขับเคลื่อนได้ แต่ต้องเฝ้าระวังและดำเนินการซ่อมแซมโดยเร็ว';
            icon = 'fa-triangle-exclamation';
        }

        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div class="bg-slate-900 border-2 border-${statusColor}-500 rounded-3xl max-w-lg w-full shadow-2xl p-6 sm:p-8 text-white space-y-5 animate-fade-in">
                    
                    <div class="text-center space-y-2">
                        <div class="w-16 h-16 rounded-2xl bg-${statusColor}-500/20 text-${statusColor}-400 border border-${statusColor}-500/50 flex items-center justify-center mx-auto text-3xl shadow-lg">
                            <i class="fa-solid ${icon}"></i>
                        </div>
                        <h3 class="text-lg font-black tracking-tight text-${statusColor}-400 uppercase">${statusTitle}</h3>
                        <p class="text-xs text-slate-300 leading-relaxed">${statusDesc}</p>
                    </div>

                    <!-- Summary Card (4 ส่วน) -->
                    <div class="pea-glass rounded-xl p-4 text-xs space-y-2 border border-slate-800">
                        <div class="flex justify-between">
                            <span class="text-slate-400">ทะเบียนรถที่ใช้:</span>
                            <span class="font-bold text-white">${vehicle.plate} (${vehicle.model})</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-400">ผู้ปฏิบัติงาน:</span>
                            <span class="font-medium text-white">${inspector} (รหัส: ${employeeId})</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-400">งานที่ต้องปฏิบัติ:</span>
                            <span class="font-medium text-amber-300 truncate max-w-[240px]">${taskDescription}</span>
                        </div>
                        <div class="flex justify-between items-center pt-1 border-t border-slate-800/80">
                            <span class="text-slate-400">เลขไมล์ไป ➔ กลับ:</span>
                            <span class="font-mono font-bold text-slate-200">${startMileage.toLocaleString()} ➔ ${endMileage.toLocaleString()} กม.</span>
                        </div>
                        <div class="flex justify-between items-center">
                            <span class="text-slate-400">ระยะทางวิ่งในรอบนี้:</span>
                            <span class="font-mono font-bold ${mileageDelta > 10000 ? 'text-red-400 font-black animate-pulse' : 'text-emerald-400'}">
                                ${mileageDelta.toLocaleString()} กม. ${mileageDelta > 10000 ? '<span class="px-1.5 py-0.5 rounded bg-red-900 text-white text-[10px] ml-1">เกิน 10,000 กม.!</span>' : ''}
                            </span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-400">น้ำมันเชื้อเพลิงที่เติม:</span>
                            <span class="font-medium text-slate-200">${fuelRefill > 0 ? fuelRefill + ' ลิตร' : 'ไม่มีการเติม (0 ลิตร)'}</span>
                        </div>
                        ${ticket ? `
                            <div class="flex justify-between border-t border-slate-800 pt-2 text-red-400">
                                <span>เลขที่ใบแจ้งซ่อมด่วน:</span>
                                <span class="font-mono font-bold">${ticket.ticketId}</span>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Defect List if any -->
                    ${failedItems.length > 0 ? `
                        <div>
                            <span class="text-xs font-bold text-slate-300 block mb-2">รายการจุดชำรุดที่พบ (${failedItems.length} จุด):</span>
                            <div class="space-y-1.5 max-h-36 overflow-y-auto">
                                ${failedItems.map(f => `
                                    <div class="text-xs p-2 rounded-lg bg-slate-950/70 border border-slate-800 flex justify-between items-center">
                                        <span class="font-medium text-slate-200 truncate pr-2">${f.name}</span>
                                        <span class="text-[10px] px-1.5 py-0.5 rounded font-bold ${f.critical ? 'bg-red-600/30 text-red-400' : 'bg-amber-600/30 text-amber-400'}">
                                            ${f.critical ? 'วิกฤต' : 'ทั่วไป'}
                                        </span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Action Buttons -->
                    <div class="pt-3 border-t border-slate-800 grid grid-cols-2 gap-3">
                        <button onclick="document.getElementById('pea-analysis-modal').innerHTML = ''" class="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold">
                            ปิดหน้าต่าง
                        </button>
                        <button onclick="app.viewInspectionReportFromModal('${vehicle.id}', '${status}', ${fuelLevel}, ${fuelRefill}, ${startMileage}, ${endMileage}, ${mileageDelta}, '${employeeId}', '${taskDescription.replace(/'/g, "\\'")}')" class="btn-safety-orange px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow">
                            <i class="fa-solid fa-file-lines"></i> ดูรายงานฉบับเต็ม (PDF)
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    viewInspectionReportFromModal(vehicleId, status, fuelLevel, fuelRefill, startMileage = 0, endMileage = 0, mileageDelta = 0, employeeId = '512446', taskDescription = 'ปฏิบัติงานประจำวัน') {
        document.getElementById('pea-analysis-modal').innerHTML = '';
        const v = db.getVehicleById(vehicleId);
        const failedItems = Object.values(this.checklistResponses).filter(r => r.status === 'FAIL');

        reportGen.generateInspectionReport({
            vehicleId: v.id,
            plate: v.plate,
            model: v.model,
            employeeId: employeeId,
            taskDescription: taskDescription,
            startMileage: startMileage || v.mileage,
            endMileage: endMileage || v.mileage,
            mileageDelta: mileageDelta,
            mileage: endMileage || v.mileage,
            fuelLevel: fuelLevel !== undefined ? fuelLevel : (v.fuelLevel || 100),
            fuelRefill: fuelRefill || 0,
            inspector: v.driver,
            status: status,
            date: new Date().toLocaleDateString('th-TH'),
            time: new Date().toLocaleTimeString('th-TH'),
            defects: failedItems
        });
    }

    // =========================================================================
    // Mechanic View (Active Tickets, Resolution & Photo Evidence)
    // =========================================================================
    setMechanicFilter(filter) {
        this.mechanicFilter = filter;
        this.renderMechanicTickets();
    }

    renderMechanicTickets() {
        const container = document.getElementById('mechanic-tickets-container');
        if (!container) return;

        const tickets = db.getRepairTickets();
        let filtered = tickets;
        if (this.mechanicFilter === 'CRITICAL') filtered = tickets.filter(t => t.severity === 'CRITICAL');
        if (this.mechanicFilter === 'WARNING') filtered = tickets.filter(t => t.severity === 'WARNING');

        // Update Filter Buttons
        ['all', 'critical', 'warning'].forEach(f => {
            const btn = document.getElementById(`mech-filter-${f}`);
            if (btn) {
                if (f.toUpperCase() === this.mechanicFilter) {
                    btn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-black border border-amber-400';
                } else {
                    btn.className = 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700';
                }
            }
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="pea-glass p-8 rounded-2xl text-center text-slate-400 border border-slate-800">
                    <i class="fa-solid fa-clipboard-check text-emerald-400 text-4xl mb-2"></i>
                    <h4 class="text-sm font-bold text-white">ไม่มีงานแจ้งซ่อมค้างอยู่ในระบบ</h4>
                    <p class="text-xs text-slate-400 mt-1">ยานพาหนะทุกคันอยู่ในสถานะพร้อมใช้งาน หรือไม่มีงานที่ตรงกับตัวกรองนี้</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(t => {
            const isPendingApproval = t.status === 'PENDING_APPROVAL';
            const isResolved = t.status === 'RESOLVED';
            const isCritical = t.severity === 'CRITICAL';

            return `
                <div class="pea-glass p-5 rounded-2xl border ${isCritical ? 'border-red-500/60 shadow-lg shadow-red-950/20' : 'border-slate-800'} space-y-4">
                    <div class="flex flex-wrap justify-between items-start gap-2 border-b border-slate-800 pb-3">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="font-mono text-xs font-bold text-pea-gold">${t.ticketId}</span>
                                <span class="text-[10px] px-2 py-0.5 rounded font-bold ${isCritical ? 'bg-red-600 text-white' : 'bg-amber-600 text-black'}">
                                    ${isCritical ? '🚨 งดใช้งาน (ด่วนที่สุด)' : '⚠️ เฝ้าระวัง'}
                                </span>
                                ${isPendingApproval ? '<span class="text-[10px] px-2 py-0.5 rounded bg-purple-900 text-amber-300 font-bold border border-purple-500/40">รอหัวหน้าอนุมัติ</span>' : ''}
                                ${isResolved ? '<span class="text-[10px] px-2 py-0.5 rounded bg-emerald-900 text-emerald-300 font-bold border border-emerald-500/40">อนุมัติเรียบร้อย</span>' : ''}
                            </div>
                            <h3 class="text-base font-black text-white mt-1">${t.plate} - ${t.model}</h3>
                            <div class="text-xs text-slate-400">ผู้แจ้ง: ${t.reporter} • เวลา: ${t.timestamp}</div>
                        </div>

                        <!-- Ticket Action Status -->
                        <div>
                            ${t.status === 'PENDING_REPAIR' ? `
                                <button onclick="app.openRepairActionModal('${t.ticketId}')" class="btn-safety-orange px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow">
                                    <i class="fa-solid fa-wrench"></i> บันทึกผลการซ่อม / แนบภาพ
                                </button>
                            ` : `
                                <button onclick="app.viewTicketReport('${t.ticketId}')" class="btn-safety-orange px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                                    <i class="fa-solid fa-file-pdf"></i> ดูใบงานซ่อม
                                </button>
                            `}
                        </div>
                    </div>

                    <!-- Defect Items Inside this Ticket -->
                    <div class="space-y-3">
                        <span class="text-xs font-bold text-slate-300">รายการจุดชำรุด (${t.items.length} รายการ):</span>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            ${t.items.map((item, idx) => `
                                <div class="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
                                    <div class="flex justify-between items-start">
                                        <span class="font-bold text-amber-300">จุดที่ ${idx + 1}: ${item.name}</span>
                                        ${item.photoAfter ? '<span class="text-emerald-400 font-bold"><i class="fa-solid fa-check"></i> ซ่อมแล้ว</span>' : '<span class="text-amber-400 font-bold"><i class="fa-solid fa-clock"></i> รอซ่อม</span>'}
                                    </div>
                                    <p class="text-slate-400 text-[11px] italic">อาการ: ${item.description}</p>
                                    
                                    <div class="grid grid-cols-2 gap-2 pt-1">
                                        <div>
                                            <span class="text-[10px] text-red-400 block mb-0.5">ภาพก่อนซ่อม (คนขับถ่าย):</span>
                                            <div class="w-full h-24 bg-slate-900 rounded border border-slate-800 overflow-hidden flex items-center justify-center">
                                                ${item.photoBefore ? `<img src="${item.photoBefore}" class="w-full h-full object-contain cursor-pointer" onclick="app.previewImage('${item.photoBefore}')">` : '<span class="text-slate-600">ไม่มีรูป</span>'}
                                            </div>
                                        </div>
                                        <div>
                                            <span class="text-[10px] text-emerald-400 block mb-0.5">ภาพหลังซ่อม (ช่างแนบ):</span>
                                            <div class="w-full h-24 bg-slate-900 rounded border border-slate-800 overflow-hidden flex items-center justify-center">
                                                ${item.photoAfter ? `<img src="${item.photoAfter}" class="w-full h-full object-contain cursor-pointer" onclick="app.previewImage('${item.photoAfter}')">` : '<span class="text-slate-600 text-[10px] text-center p-1">ยังไม่ได้แนบหลักฐาน</span>'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    openRepairActionModal(ticketId) {
        const ticket = db.getRepairTickets().find(t => t.ticketId === ticketId);
        if (!ticket) return;

        const modal = document.getElementById('pea-repair-modal');
        if (!modal) return;

        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onclick="if(event.target === this) this.parentElement.innerHTML = ''">
                <div class="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-2xl w-full shadow-2xl p-6 text-white space-y-4 animate-fade-in my-6">
                    
                    <div class="flex justify-between items-start border-b border-slate-800 pb-3">
                        <div>
                            <span class="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-black uppercase">MECHANIC RESOLUTION</span>
                            <h3 class="text-base font-bold text-white mt-1">บันทึกผลการซ่อมแซม: ${ticket.plate}</h3>
                            <p class="text-xs text-slate-400">เลขที่ใบงาน: ${ticket.ticketId}</p>
                        </div>
                        <button onclick="document.getElementById('pea-repair-modal').innerHTML = ''" class="text-slate-400 hover:text-white">
                            <i class="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>

                    <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                        ${ticket.items.map((item, idx) => `
                            <div class="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3" id="repair-item-card-${idx}">
                                <div class="flex justify-between items-center">
                                    <span class="text-xs font-bold text-amber-300">จุดที่ ${idx + 1}: ${item.name}</span>
                                    <span class="text-[10px] text-slate-400">อาการเดิม: ${item.description}</span>
                                </div>

                                <div>
                                    <label class="block text-xs text-slate-300 mb-1">บันทึกงานช่าง (วิธีการแก้ไข / อะไหล่ที่เปลี่ยน):</label>
                                    <input type="text" id="mech-note-${idx}" placeholder="เช่น เปลี่ยนผ้าเบรกใหม่, ย้ำสายไฮดรอลิก..." value="${item.mechanicNote || ''}" 
                                        class="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400 font-medium">
                                </div>

                                <!-- After Photo Upload Section -->
                                <div>
                                    <label class="block text-xs text-slate-300 mb-1 flex justify-between">
                                        <span>ถ่ายภาพหรือแนบหลักฐานผลงานการซ่อมเสร็จ: <span class="text-red-400">* บังคับ</span></span>
                                        <span id="mech-photo-status-${idx}" class="text-[11px] text-amber-400">${item.photoAfter ? '✅ แนบแล้ว' : '⚠️ ยังไม่แนบ'}</span>
                                    </label>

                                    <div class="flex items-center gap-3">
                                        <div id="mech-preview-${idx}" data-photo="${item.photoAfter || ''}" class="w-28 h-20 bg-slate-900 rounded border border-dashed border-slate-700 overflow-hidden flex items-center justify-center">
                                            ${item.photoAfter ? `<img src="${item.photoAfter}" class="w-full h-full object-contain">` : '<span class="text-[10px] text-slate-500">รอภาพ</span>'}
                                        </div>

                                        <div class="space-y-1.5 flex-1">
                                            <label class="btn-safety-orange px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow">
                                                <i class="fa-solid fa-camera"></i> ถ่ายภาพผลงานช่าง
                                                <input type="file" accept="image/*" capture="environment" class="hidden" onchange="app.handleMechanicPhotoUpload(event, ${idx})">
                                            </label>

                                            <!-- Preset Resolved Photo -->
                                            <button type="button" onclick="app.applyPresetResolvedPhoto('${item.itemId}', ${idx})" class="w-full bg-purple-900/70 hover:bg-purple-800 text-amber-300 border border-purple-500/40 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                                                <i class="fa-solid fa-wand-magic-sparkles mr-1"></i> ใช้ภาพตัวอย่างหลังซ่อม กฟภ.
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Modal Actions -->
                    <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
                        <button onclick="document.getElementById('pea-repair-modal').innerHTML = ''" class="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold">
                            ยกเลิก
                        </button>
                        <button onclick="app.submitRepairCompletion('${ticket.ticketId}')" class="btn-safety-orange px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow">
                            <i class="fa-solid fa-paper-plane"></i> กดส่งมอบงานซ่อม (Mark as Repaired)
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    handleMechanicPhotoUpload(event, itemIdx) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            const preview = document.getElementById(`mech-preview-${itemIdx}`);
            if (preview) {
                preview.innerHTML = `<img src="${dataUrl}" class="w-full h-full object-contain">`;
                preview.dataset.photo = dataUrl;
            }
            const status = document.getElementById(`mech-photo-status-${itemIdx}`);
            if (status) status.innerText = '✅ แนบภาพสำเร็จ';
        };
        reader.readAsDataURL(file);
    }

    applyPresetResolvedPhoto(itemId, itemIdx) {
        const preset = DEFECT_PRESETS.find(p => p.targetItem === itemId) || DEFECT_PRESETS[0];
        const preview = document.getElementById(`mech-preview-${itemIdx}`);
        if (preview) {
            preview.innerHTML = `<img src="${preset.resolvedImageUrl}" class="w-full h-full object-contain">`;
            preview.dataset.photo = preset.resolvedImageUrl;
        }
        const note = document.getElementById(`mech-note-${itemIdx}`);
        if (note && !note.value) {
            note.value = 'ดำเนินการเปลี่ยนอะไหล่แท้ กฟภ. และทดสอบการทำงานตามมาตรฐานความปลอดภัยเรียบร้อย';
        }
        const status = document.getElementById(`mech-photo-status-${itemIdx}`);
        if (status) status.innerText = '✅ ใช้ภาพตัวอย่าง กฟภ.';
        notifier.showToast('ใช้งานภาพตัวอย่างหลังซ่อม', preset.title, 'INFO');
    }

    submitRepairCompletion(ticketId) {
        const ticket = db.getRepairTickets().find(t => t.ticketId === ticketId);
        if (!ticket) return;

        // Check if all items have photos
        for (let i = 0; i < ticket.items.length; i++) {
            const preview = document.getElementById(`mech-preview-${i}`);
            const noteInput = document.getElementById(`mech-note-${i}`);
            const photo = preview ? preview.dataset.photo : null;
            const note = noteInput ? noteInput.value.trim() : '';

            if (!photo) {
                notifier.showToast('จำเป็นต้องแนบภาพหลังซ่อม', `จุดที่ ${i + 1}: ${ticket.items[i].name} ยังไม่ได้แนบภาพถ่ายยืนยันผลงาน`, 'CRITICAL');
                return;
            }

            ticket.items[i].photoAfter = photo;
            ticket.items[i].mechanicNote = note || 'แก้ไขเสร็จสมบูรณ์';
            ticket.items[i].repairedAt = new Date().toLocaleString('th-TH');
        }

        // Change ticket status to PENDING_APPROVAL
        ticket.status = 'PENDING_APPROVAL';
        ticket.mechanicCompletedAt = new Date().toLocaleString('th-TH');
        db.saveRepairTicket(ticket);

        // LOG CONSOLIDATION: บันทึกประวัติงานซ่อมเป็น 1 แถวเดียว
        db.addConsolidatedActivityLog({
            actionType: 'REPAIR_RESOLVED_PENDING_APPROVAL',
            vehicleId: ticket.vehicleId,
            plate: ticket.plate,
            operator: 'ช่างเครื่องยนต์ กฟภ.',
            role: 'MECHANIC',
            summary: `ดำเนินการซ่อมครบ ${ticket.items.length} จุดเรียบร้อยแล้ว ส่งมอบงานรอหัวหน้าอนุมัติ`,
            statusResult: 'PENDING_APPROVAL',
            ticketId: ticket.ticketId
        });

        // Broadcast to Supervisor
        notifier.broadcastAlert({
            targetRoles: ['CHIEF'],
            title: '👨‍💼 งานซ่อมเสร็จสมบูรณ์: รออนุมัติ',
            message: `ทะเบียน ${ticket.plate} ได้รับการซ่อมแซมแล้ว ช่างส่งมอบงานรอการตรวจสอบเปรียบเทียบภาพ ก่อน-หลัง`,
            type: 'INFO'
        });

        document.getElementById('pea-repair-modal').innerHTML = '';
        this.renderMechanicTickets();
        this.renderSupervisorDashboard();
        this.renderActivityLogs();
        this.updateNetworkUI();
    }

    // =========================================================================
    // Supervisor Dashboard (Control Room, Approval, PM & Tax, Add Vehicle)
    // =========================================================================
    setFleetFilter(filter) {
        this.fleetFilter = filter;
        this.renderSupervisorDashboard();
    }

    renderSupervisorDashboard() {
        const vehicles = db.getVehicles();
        const tickets = db.getRepairTickets();

        // Calculate Stats
        const total = vehicles.length;
        const readyCount = vehicles.filter(v => v.status === 'READY').length;
        const warningCount = vehicles.filter(v => v.status === 'WARNING').length;
        const criticalCount = vehicles.filter(v => v.status === 'CRITICAL').length;
        const pmDueCount = vehicles.filter(v => (v.mileage - v.lastPmMileage) >= 10000).length;
        
        const now = new Date();
        const taxDueCount = vehicles.filter(v => {
            if (!v.taxExpiry) return false;
            const exp = new Date(v.taxExpiry);
            const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
            return diff <= 30;
        }).length;

        // Render Stat Numbers
        const statTotal = document.getElementById('stat-total-vehicles');
        if (statTotal) statTotal.innerText = total;

        const statReady = document.getElementById('stat-ready-vehicles');
        if (statReady) statReady.innerText = readyCount;

        const statWarning = document.getElementById('stat-warning-vehicles');
        if (statWarning) statWarning.innerText = warningCount;

        const statCritical = document.getElementById('stat-critical-vehicles');
        if (statCritical) statCritical.innerText = criticalCount;

        const statPm = document.getElementById('stat-pm-due');
        if (statPm) statPm.innerText = pmDueCount;

        const statTax = document.getElementById('stat-tax-due');
        if (statTax) statTax.innerText = taxDueCount;

        // Render Status Pie / Doughnut Chart (กราฟวงกลมสรุปสภาพรถยนต์)
        this.renderFleetPieChart(readyCount, warningCount, criticalCount);

        // Render Approvals Queue (Pending Supervisor Signoff)
        const pendingApprovals = tickets.filter(t => t.status === 'PENDING_APPROVAL');
        const approvalContainer = document.getElementById('supervisor-approval-queue');
        if (approvalContainer) {
            if (pendingApprovals.length === 0) {
                approvalContainer.innerHTML = `
                    <div class="text-center py-6 text-slate-500 text-xs">
                        <i class="fa-solid fa-check-circle text-slate-600 text-2xl mb-1"></i>
                        <div>ไม่มีงานซ่อมที่รอการอนุมัติ ณ ขณะนี้</div>
                    </div>
                `;
            } else {
                approvalContainer.innerHTML = pendingApprovals.map(t => `
                    <div class="bg-slate-950/70 border border-purple-500/50 rounded-xl p-3.5 space-y-2 text-xs">
                        <div class="flex justify-between items-start">
                            <div>
                                <span class="font-bold text-white text-sm">${t.plate}</span>
                                <span class="text-slate-400 block text-[11px]">${t.model}</span>
                            </div>
                            <span class="px-2 py-0.5 rounded bg-purple-900 text-amber-300 font-bold border border-purple-500/30 text-[10px]">
                                ซ่อมเสร็จแล้ว (${t.items.length} จุด)
                            </span>
                        </div>
                        <div class="text-slate-300 text-[11px]">
                            ช่างได้ทำการซ่อมแซมและแนบภาพถ่ายเรียบร้อยแล้ว
                        </div>
                        <div class="flex gap-2 pt-1">
                            <button onclick="app.viewTicketReport('${t.ticketId}')" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 py-1.5 rounded-lg font-semibold text-[11px]">
                                <i class="fa-solid fa-eye"></i> ตรวจสอบเปรียบเทียบภาพ
                            </button>
                            <button onclick="app.approveRepairTicket('${t.ticketId}')" class="btn-safety-orange flex-1 py-1.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow">
                                <i class="fa-solid fa-check"></i> อนุมัติการซ่อม (Approve)
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        }

        // Render Fleet Table
        const tableBody = document.getElementById('fleet-table-body');
        if (tableBody) {
            let filtered = vehicles;
            if (this.fleetFilter === 'READY') filtered = vehicles.filter(v => v.status === 'READY');
            if (this.fleetFilter === 'WARNING') filtered = vehicles.filter(v => v.status === 'WARNING');
            if (this.fleetFilter === 'CRITICAL') filtered = vehicles.filter(v => v.status === 'CRITICAL');

            tableBody.innerHTML = filtered.map(v => {
                const distanceSincePm = v.mileage - v.lastPmMileage;
                const isPmDue = distanceSincePm >= 10000;

                const exp = v.taxExpiry ? new Date(v.taxExpiry) : null;
                const diff = exp ? Math.ceil((exp - now) / (1000 * 60 * 60 * 24)) : 999;
                const isTaxCritical = diff < 0;
                const isTaxWarning = diff >= 0 && diff <= 30;

                let statusBadge = '';
                const activeMission = db.getActiveMissionByVehicleId(v.id);
                if (activeMission || v.operationalStatus === 'IN_USE') {
                    statusBadge = '<span class="px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-500/40 text-[10px] font-bold animate-pulse"><i class="fa-solid fa-truck-fast"></i> กำลังใช้งาน</span>';
                } else if (v.status === 'READY') {
                    statusBadge = '<span class="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">พร้อมใช้งาน</span>';
                } else if (v.status === 'WARNING') {
                    statusBadge = '<span class="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-bold">เฝ้าระวัง</span>';
                } else {
                    statusBadge = '<span class="px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-500/40 text-[10px] font-bold animate-pulse">งดใช้งาน</span>';
                }

                return `
                    <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 text-xs transition">
                        <td class="py-3 px-3">
                            <div class="font-bold text-white">${v.plate}</div>
                            <div class="text-[10px] text-slate-400">${v.id}</div>
                        </td>
                        <td class="py-3 px-3">
                            <div class="text-slate-200">${v.model}</div>
                            <div class="text-[10px] text-slate-400">${v.department}</div>
                        </td>
                        <td class="py-3 px-3">
                            <div class="font-mono text-slate-200 font-bold">${v.mileage.toLocaleString()} กม.</div>
                            ${isPmDue ? '<span class="text-[10px] text-amber-400 font-bold"><i class="fa-solid fa-wrench"></i> ถึงรอบ PM 10,000 กม.</span>' : `<span class="text-[10px] text-slate-500">อีก ${(10000 - distanceSincePm).toLocaleString()} กม.</span>`}
                        </td>
                        <td class="py-3 px-3">
                            <div class="text-slate-200">${v.taxExpiry || '-'}</div>
                            ${isTaxCritical ? '<span class="text-[10px] text-red-400 font-bold animate-pulse"><i class="fa-solid fa-gavel"></i> ขาดต่อภาษีแล้ว</span>' : (isTaxWarning ? `<span class="text-[10px] text-amber-400 font-bold">อีก ${diff} วันหมดอายุ</span>` : '<span class="text-[10px] text-emerald-400">ปกติ</span>')}
                        </td>
                        <td class="py-3 px-3">${statusBadge}</td>
                        <td class="py-3 px-3 text-right">
                            <button onclick="app.viewVehicleDirectReport('${v.id}')" class="btn-safety-orange px-2.5 py-1 rounded-lg text-[11px] font-bold shadow">
                                <i class="fa-solid fa-file-lines"></i> ดูรายงาน
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Render Active Duty Widget
        this.renderActiveDutyWidget();
    }

    approveRepairTicket(ticketId) {
        const ticket = db.getRepairTickets().find(t => t.ticketId === ticketId);
        if (!ticket) return;

        // Change ticket status to RESOLVED
        ticket.status = 'RESOLVED';
        ticket.approvedAt = new Date().toLocaleString('th-TH');
        ticket.approver = 'หัวหน้าแผนกยานพาหนะ กฟภ.';
        db.saveRepairTicket(ticket);

        // Unlock Vehicle back to READY!
        const vehicle = db.getVehicleById(ticket.vehicleId);
        if (vehicle) {
            vehicle.status = 'READY';
            db.saveVehicle(vehicle);
        }

        // LOG CONSOLIDATION
        db.addConsolidatedActivityLog({
            actionType: 'SUPERVISOR_APPROVAL',
            vehicleId: ticket.vehicleId,
            plate: ticket.plate,
            operator: 'หัวหน้าแผนกยานพาหนะ (Supervisor)',
            role: 'CHIEF',
            summary: `อนุมัติผลการซ่อมแซมทะเบียน ${ticket.plate} ปปลดล็อกรถกลับสู่สถานะพร้อมใช้งาน (READY)`,
            statusResult: 'READY',
            ticketId: ticket.ticketId
        });

        // 🔗 บันทึกข้อมูลลงใน Google Sheets อัตโนมัติ (Google Sheets Integration)
        if (typeof googleSheet !== 'undefined') {
            googleSheet.logRepairApproval({
                ticketId: ticket.ticketId,
                plate: ticket.plate,
                model: ticket.model,
                approver: ticket.approver,
                approvedAt: ticket.approvedAt,
                itemsSummary: ticket.items.map(i => `${i.name}: ${i.repairNotes || 'ซ่อมแซมเรียบร้อย'}`).join('; ')
            }).then(res => {
                if (res && res.success) console.log('[GoogleSheet] Repair approval synchronized');
            }).catch(err => console.warn('[GoogleSheet] Repair approval sync error:', err));
        }

        // Broadcast to Driver & Mechanic
        notifier.broadcastAlert({
            targetRoles: ['DRIVER', 'MECHANIC'],
            title: '🎉 รถผ่านการอนุมัติความปลอดภัยแล้ว!',
            message: `ทะเบียน ${ticket.plate} ได้รับการอนุมัติจากหัวหน้าแผนกแล้ว พร้อมนำออกปฏิบัติงานได้ตามปกติ`,
            type: 'SUCCESS'
        });

        this.renderSupervisorDashboard();
        this.renderMechanicTickets();
        this.renderActivityLogs();
        this.updateNetworkUI();
    }

    viewTicketReport(ticketId) {
        const ticket = db.getRepairTickets().find(t => t.ticketId === ticketId);
        if (!ticket) return;

        reportGen.generateInspectionReport({
            reportNo: ticket.ticketId,
            vehicleId: ticket.vehicleId,
            plate: ticket.plate,
            model: ticket.model,
            inspector: ticket.reporter,
            status: ticket.status === 'RESOLVED' ? 'READY' : (ticket.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING'),
            date: ticket.timestamp ? ticket.timestamp.split(' ')[0] : new Date().toLocaleDateString('th-TH'),
            time: ticket.timestamp ? ticket.timestamp.split(' ')[1] : new Date().toLocaleTimeString('th-TH'),
            defects: ticket.items
        });
    }

    viewVehicleDirectReport(vehicleId) {
        const v = db.getVehicleById(vehicleId);
        if (!v) return;

        // Find any active defects or tickets for this vehicle
        const activeTicket = db.getRepairTickets().find(t => t.vehicleId === vehicleId && t.status !== 'RESOLVED');
        const defects = activeTicket ? activeTicket.items : [];

        reportGen.generateInspectionReport({
            vehicleId: v.id,
            plate: v.plate,
            model: v.model,
            mileage: v.mileage,
            fuelLevel: v.fuelLevel !== undefined ? v.fuelLevel : 100,
            fuelRefill: 0,
            inspector: v.driver,
            status: v.status,
            date: v.lastInspectDate ? v.lastInspectDate.split(' ')[0] : new Date().toLocaleDateString('th-TH'),
            time: v.lastInspectDate ? v.lastInspectDate.split(' ')[1] : new Date().toLocaleTimeString('th-TH'),
            defects: defects
        });
    }

    // Modal to add new vehicle to fleet
    openAddVehicleModal() {
        const modal = document.getElementById('pea-add-vehicle-modal');
        if (!modal) return;

        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onclick="if(event.target === this) this.parentElement.innerHTML = ''">
                <div class="bg-slate-900 border border-purple-500/50 rounded-2xl max-w-lg w-full shadow-2xl p-6 text-white space-y-4 animate-fade-in">
                    <div class="flex justify-between items-start border-b border-slate-800 pb-3">
                        <div>
                            <span class="px-2 py-0.5 rounded bg-purple-800 text-amber-300 text-[10px] font-bold">FLEET REGISTRATION</span>
                            <h3 class="text-base font-bold text-white mt-1">ลงทะเบียนเพิ่มรถใหม่เข้าสู่ฟลีต กฟภ.</h3>
                        </div>
                        <button onclick="document.getElementById('pea-add-vehicle-modal').innerHTML = ''" class="text-slate-400 hover:text-white">
                            <i class="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>

                    <form id="add-vehicle-form" onsubmit="app.saveNewVehicle(event)" class="space-y-3.5 text-xs">
                        <div>
                            <label class="block text-slate-300 mb-1 font-semibold">หมายเลขทะเบียนรถ (เช่น 2ขข-1102 กรุงเทพฯ):</label>
                            <input type="text" id="new-v-plate" placeholder="เช่น 1ฒฒ-5599 กรุงเทพฯ" required 
                                class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-amber-400">
                        </div>
                        <div>
                            <label class="block text-slate-300 mb-1 font-semibold">ยี่ห้อและรุ่นรถ (เช่น Toyota Hilux Revo 4x4):</label>
                            <input type="text" id="new-v-model" placeholder="เช่น Isuzu D-Max Hi-Lander 4x4" required 
                                class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-400">
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-slate-300 mb-1 font-semibold">ประเภทยานพาหนะ:</label>
                                <select id="new-v-type" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-400 cursor-pointer">
                                    <option value="PICKUP">รถกระบะปฏิบัติการ 4x4</option>
                                    <option value="CRANE">รถบรรทุกติดเครน</option>
                                    <option value="BUCKET">รถกระเช้าไฟฟ้าแรงสูง</option>
                                    <option value="SEDAN">รถตรวจการ/ส่วนกลาง</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1 font-semibold">เลขไมล์เริ่มต้น (กม.):</label>
                                <input type="number" inputmode="numeric" id="new-v-mileage" placeholder="0" value="0" required 
                                    class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-amber-400">
                            </div>
                        </div>
                        <div>
                            <div class="flex items-center justify-between mb-1.5">
                                <label class="block text-slate-300 font-semibold">วันหมดอายุภาษี (วัน / เดือน / ปี พ.ศ.):</label>
                                <span class="text-[11px] text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md font-mono font-bold">
                                    พ.ศ. 2569 เป็นต้นไป
                                </span>
                            </div>
                            <!-- เรียงเป็นรูปแบบ วัน / เดือน / ปี พ.ศ. ชัดเจน 100% ไม่ขึ้นกับ Locale ของเบราว์เซอร์ -->
                            <div class="grid grid-cols-3 gap-2">
                                <div>
                                    <label class="block text-[10px] text-slate-400 mb-0.5">วัน (Day)</label>
                                    <select id="new-v-tax-day" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-mono font-bold text-center focus:outline-none focus:border-amber-400 cursor-pointer">
                                        ${Array.from({length: 31}, (_, i) => {
                                            const d = (i + 1).toString().padStart(2, '0');
                                            return `<option value="${d}" ${d === '31' ? 'selected' : ''}>${d}</option>`;
                                        }).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[10px] text-slate-400 mb-0.5">เดือน (Month)</label>
                                    <select id="new-v-tax-month" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-mono font-bold text-center focus:outline-none focus:border-amber-400 cursor-pointer">
                                        <option value="01">1</option>
                                        <option value="02">2</option>
                                        <option value="03">3</option>
                                        <option value="04">4</option>
                                        <option value="05">5</option>
                                        <option value="06">6</option>
                                        <option value="07">7</option>
                                        <option value="08">8</option>
                                        <option value="09">9</option>
                                        <option value="10">10</option>
                                        <option value="11">11</option>
                                        <option value="12" selected>12</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[10px] text-slate-400 mb-0.5">ปี พ.ศ. (Year)</label>
                                    <select id="new-v-tax-year" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-mono font-bold text-center focus:outline-none focus:border-amber-400 cursor-pointer">
                                        <option value="2026" selected>2569</option>
                                        <option value="2027">2570</option>
                                        <option value="2028">2571</option>
                                        <option value="2029">2572</option>
                                        <option value="2030">2573</option>
                                        <option value="2031">2574</option>
                                    </select>
                                </div>
                            </div>
                            <input type="hidden" id="new-v-tax" value="2026-12-31">
                            <p class="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                                <i class="fa-solid fa-calendar-days text-amber-400"></i>
                                <span>รูปแบบ วัน/เดือน/ปี พ.ศ. (ค่าเริ่มต้น: <strong>31 / 12 / 2569</strong>)</span>
                            </p>
                        </div>

                        <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
                            <button type="button" onclick="document.getElementById('pea-add-vehicle-modal').innerHTML = ''" class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl font-semibold transition">
                                ยกเลิก
                            </button>
                            <button type="submit" class="btn-safety-orange px-5 py-2.5 rounded-xl font-bold shadow-lg transition flex items-center gap-1.5">
                                <i class="fa-solid fa-plus"></i> เพิ่มรถเข้าฟลีต
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    saveNewVehicle(event) {
        event.preventDefault();
        const plate = document.getElementById('new-v-plate').value.trim();
        const model = document.getElementById('new-v-model').value.trim();
        const type = document.getElementById('new-v-type').value;
        const mileage = parseInt(document.getElementById('new-v-mileage').value) || 0;
        
        // อ่านค่าจากตัวเลือก วัน / เดือน / ปี (พ.ศ.)
        const taxDay = document.getElementById('new-v-tax-day')?.value || '31';
        const taxMonth = document.getElementById('new-v-tax-month')?.value || '12';
        const taxYear = document.getElementById('new-v-tax-year')?.value || '2026';
        const taxExpiry = `${taxYear}-${taxMonth}-${taxDay}`;

        // สร้างรหัสยานพาหนะ กฟภ. (Vehicle ID) อัตโนมัติจากประเภทและเลขทะเบียน
        const prefix = type === 'PICKUP' ? 'PK' : (type === 'CRANE' ? 'CR' : (type === 'BUCKET' ? 'BK' : 'SD'));
        const numPart = plate.replace(/\D/g, '').slice(-4) || Math.floor(1000 + Math.random() * 9000);
        const id = `PEA-${prefix}-${numPart}`;

        // ค่าเริ่มต้นสำหรับเชื้อเพลิงและพนักงานขับรถ
        const fuelLevel = 100;
        const driver = 'พนักงานขับรถส่วนกลาง';

        const newVehicle = {
            id,
            plate,
            type,
            model,
            mileage,
            lastPmMileage: mileage,
            fuelLevel,
            taxExpiry,
            driver,
            department: 'กองยานพาหนะ การไฟฟ้าส่วนภูมิภาค',
            status: 'READY',
            lastInspectDate: new Date().toLocaleString('th-TH')
        };

        db.saveVehicle(newVehicle);
        db.addConsolidatedActivityLog({
            actionType: 'ADD_VEHICLE',
            vehicleId: id,
            plate: plate,
            operator: 'หัวหน้าแผนกยานพาหนะ',
            role: 'CHIEF',
            summary: `ลงทะเบียนยานพาหนะคันใหม่เข้าสู่ระบบ: ${plate} (${model})`,
            statusResult: 'READY'
        });

        // 🔗 บันทึกข้อมูลลงใน Google Sheets อัตโนมัติ (Google Sheets Integration)
        if (typeof googleSheet !== 'undefined') {
            googleSheet.logVehicle(newVehicle).then(res => {
                if (res && res.success) console.log('[GoogleSheet] Vehicle registration synchronized');
            }).catch(err => console.warn('[GoogleSheet] Vehicle registration sync error:', err));
        }

        document.getElementById('pea-add-vehicle-modal').innerHTML = '';
        notifier.showToast('ลงทะเบียนรถใหม่สำเร็จ', `${plate} ถูกเพิ่มเข้าสู่ฟลีตเรียบร้อยแล้ว`, 'SUCCESS');
        
        // สลับมาเลือกคันที่เพิ่งเพิ่มเข้าไปทันที
        this.selectVehicle(newVehicle.id);
        this.renderSupervisorDashboard();
        this.renderActivityLogs();
        this.updateNetworkUI();
    }

    // =========================================================================
    // Edit Vehicle Modal & Logic
    // =========================================================================
    openEditVehicleModal() {
        if (!this.currentVehicle) {
            notifier.showToast('ไม่สามารถดำเนินการได้', 'กรุณาเลือกยานพาหนะที่ต้องการแก้ไข', 'WARNING');
            return;
        }

        const v = this.currentVehicle;
        const modal = document.getElementById('pea-add-vehicle-modal');
        if (!modal) return;

        // แยกวัน เดือน ปี จาก taxExpiry (รูปแบบ YYYY-MM-DD หรือ fallback)
        let curYear = '2026', curMonth = '12', curDay = '31';
        if (v.taxExpiry && v.taxExpiry.includes('-')) {
            const parts = v.taxExpiry.split('-');
            if (parts.length === 3) {
                curYear = parts[0];
                curMonth = parts[1].padStart(2, '0');
                curDay = parts[2].padStart(2, '0');
            }
        }

        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onclick="if(event.target === this) this.parentElement.innerHTML = ''">
                <div class="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-lg w-full shadow-2xl p-6 text-white space-y-4 animate-fade-in">
                    <div class="flex justify-between items-start border-b border-slate-800 pb-3">
                        <div>
                            <span class="px-2 py-0.5 rounded bg-amber-950 text-amber-300 text-[10px] font-bold border border-amber-500/40">VEHICLE PROFILE EDIT</span>
                            <h3 class="text-base font-bold text-white mt-1 flex items-center gap-2">
                                <i class="fa-solid fa-pen-to-square text-amber-400"></i> แก้ไขข้อมูลยานพาหนะ กฟภ.
                            </h3>
                            <p class="text-xs text-slate-400">รหัสยานพาหนะ: <span class="font-mono text-amber-400 font-bold">${v.id}</span></p>
                        </div>
                        <button onclick="document.getElementById('pea-add-vehicle-modal').innerHTML = ''" class="text-slate-400 hover:text-white">
                            <i class="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>

                    <form id="edit-vehicle-form" onsubmit="app.saveEditedVehicle(event, '${v.id}')" class="space-y-3.5 text-xs">
                        <div>
                            <label class="block text-slate-300 mb-1 font-semibold">หมายเลขทะเบียนรถ:</label>
                            <input type="text" id="edit-v-plate" value="${v.plate || ''}" placeholder="เช่น 1ฒฒ-5599 กรุงเทพฯ" required 
                                class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-amber-400">
                        </div>
                        <div>
                            <label class="block text-slate-300 mb-1 font-semibold">ยี่ห้อและรุ่นรถ:</label>
                            <input type="text" id="edit-v-model" value="${v.model || ''}" placeholder="เช่น Toyota Hilux Revo 4x4" required 
                                class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-400">
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="block text-slate-300 mb-1 font-semibold">ประเภทยานพาหนะ:</label>
                                <select id="edit-v-type" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-400 cursor-pointer">
                                    <option value="PICKUP" ${v.type === 'PICKUP' ? 'selected' : ''}>รถกระบะปฏิบัติการ 4x4</option>
                                    <option value="CRANE" ${v.type === 'CRANE' ? 'selected' : ''}>รถบรรทุกติดเครน</option>
                                    <option value="BUCKET" ${v.type === 'BUCKET' ? 'selected' : ''}>รถกระเช้าไฟฟ้าแรงสูง</option>
                                    <option value="SEDAN" ${v.type === 'SEDAN' ? 'selected' : ''}>รถตรวจการ/ส่วนกลาง</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-slate-300 mb-1 font-semibold">เลขไมล์สะสมล่าสุด (กม.):</label>
                                <input type="number" inputmode="numeric" id="edit-v-mileage" value="${v.mileage || 0}" required 
                                    class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono font-bold focus:outline-none focus:border-amber-400">
                            </div>
                        </div>
                        <div>
                            <div class="flex items-center justify-between mb-1.5">
                                <label class="block text-slate-300 font-semibold">วันหมดอายุภาษี (วัน / เดือน / ปี พ.ศ.):</label>
                                <span class="text-[11px] text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md font-mono font-bold">
                                    พ.ศ. 2569 เป็นต้นไป
                                </span>
                            </div>
                            <div class="grid grid-cols-3 gap-2">
                                <div>
                                    <label class="block text-[10px] text-slate-400 mb-0.5">วัน (Day)</label>
                                    <select id="edit-v-tax-day" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-mono font-bold text-center focus:outline-none focus:border-amber-400 cursor-pointer">
                                        ${Array.from({length: 31}, (_, i) => {
                                            const d = (i + 1).toString().padStart(2, '0');
                                            return `<option value="${d}" ${d === curDay ? 'selected' : ''}>${d}</option>`;
                                        }).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[10px] text-slate-400 mb-0.5">เดือน (Month)</label>
                                    <select id="edit-v-tax-month" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-mono font-bold text-center focus:outline-none focus:border-amber-400 cursor-pointer">
                                        ${Array.from({length: 12}, (_, i) => {
                                            const m = (i + 1).toString().padStart(2, '0');
                                            const mNum = (i + 1).toString();
                                            return `<option value="${m}" ${m === curMonth ? 'selected' : ''}>${mNum}</option>`;
                                        }).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-[10px] text-slate-400 mb-0.5">ปี พ.ศ. (Year)</label>
                                    <select id="edit-v-tax-year" class="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-white font-mono font-bold text-center focus:outline-none focus:border-amber-400 cursor-pointer">
                                        <option value="2026" ${curYear === '2026' ? 'selected' : ''}>2569</option>
                                        <option value="2027" ${curYear === '2027' ? 'selected' : ''}>2570</option>
                                        <option value="2028" ${curYear === '2028' ? 'selected' : ''}>2571</option>
                                        <option value="2029" ${curYear === '2029' ? 'selected' : ''}>2572</option>
                                        <option value="2030" ${curYear === '2030' ? 'selected' : ''}>2573</option>
                                        <option value="2031" ${curYear === '2031' ? 'selected' : ''}>2574</option>
                                    </select>
                                </div>
                            </div>
                            <p class="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                                <i class="fa-solid fa-calendar-days text-amber-400"></i>
                                <span>ระบุ วัน/เดือน/ปี พ.ศ. ที่หมดอายุภาษีประจำปี</span>
                            </p>
                        </div>

                        <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
                            <button type="button" onclick="document.getElementById('pea-add-vehicle-modal').innerHTML = ''" class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl font-semibold transition">
                                ยกเลิก
                            </button>
                            <button type="submit" class="btn-safety-orange px-5 py-2.5 rounded-xl font-bold shadow-lg transition flex items-center gap-1.5">
                                <i class="fa-solid fa-floppy-disk"></i> บันทึกการแก้ไข
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    saveEditedVehicle(event, vehicleId) {
        event.preventDefault();
        const vehicle = db.getVehicleById(vehicleId);
        if (!vehicle) {
            notifier.showToast('ข้อผิดพลาด', 'ไม่พบข้อมูลยานพาหนะในระบบ', 'DANGER');
            return;
        }

        const oldPlate = vehicle.plate;
        const plate = document.getElementById('edit-v-plate').value.trim();
        const model = document.getElementById('edit-v-model').value.trim();
        const type = document.getElementById('edit-v-type').value;
        const mileage = parseInt(document.getElementById('edit-v-mileage').value) || 0;

        const taxDay = document.getElementById('edit-v-tax-day')?.value || '31';
        const taxMonth = document.getElementById('edit-v-tax-month')?.value || '12';
        const taxYear = document.getElementById('edit-v-tax-year')?.value || '2026';
        const taxExpiry = `${taxYear}-${taxMonth}-${taxDay}`;

        // อัปเดตข้อมูลรถ
        vehicle.plate = plate;
        vehicle.model = model;
        vehicle.type = type;
        vehicle.mileage = mileage;
        vehicle.taxExpiry = taxExpiry;

        db.saveVehicle(vehicle);

        // Activity log
        db.addConsolidatedActivityLog({
            actionType: 'EDIT_VEHICLE',
            vehicleId: vehicleId,
            plate: plate,
            operator: 'หัวหน้าแผนกยานพาหนะ',
            role: 'CHIEF',
            summary: `แก้ไขประวัติข้อมูลยานพาหนะ: ${plate} (${model}) เลขไมล์ ${mileage.toLocaleString()} กม.`,
            statusResult: 'READY'
        });

        // ซิงค์ Google Sheets หากเชื่อมต่ออยู่
        if (typeof googleSheet !== 'undefined') {
            googleSheet.logVehicle(vehicle).then(res => {
                if (res && res.success) console.log('[GoogleSheet] Vehicle update synchronized');
            }).catch(err => console.warn('[GoogleSheet] Vehicle update sync error:', err));
        }

        document.getElementById('pea-add-vehicle-modal').innerHTML = '';
        notifier.showToast('บันทึกการแก้ไขสำเร็จ', `อัปเดตข้อมูลรถยนต์ ${plate} เรียบร้อยแล้ว`, 'SUCCESS');

        // รีเฟรชหน้าจอ
        this.selectVehicle(vehicleId);
        this.renderSupervisorDashboard();
        this.renderActivityLogs();
        this.updateNetworkUI();
    }

    // =========================================================================
    // Delete Vehicle with Confirmation Dialog
    // =========================================================================
    confirmDeleteCurrentVehicle() {
        if (!this.currentVehicle) {
            notifier.showToast('ไม่สามารถดำเนินการได้', 'กรุณาเลือกยานพาหนะที่ต้องการลบ', 'WARNING');
            return;
        }

        const vehicles = db.getVehicles();
        if (vehicles.length <= 1) {
            notifier.showToast('ไม่สามารถลบได้', 'ระบบต้องมียานพาหนะคงอยู่อย่างน้อย 1 คันในฐานข้อมูล', 'WARNING');
            return;
        }

        const v = this.currentVehicle;
        const modal = document.getElementById('pea-add-vehicle-modal');
        if (!modal) return;

        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
                <div class="bg-slate-900 border-2 border-red-500/80 rounded-2xl max-w-md w-full p-6 text-white space-y-4 shadow-2xl">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-xl bg-red-950 border border-red-500 flex items-center justify-center text-red-400 text-xl flex-shrink-0">
                            <i class="fa-solid fa-triangle-exclamation"></i>
                        </div>
                        <div>
                            <h3 class="text-sm font-black text-red-400 uppercase tracking-wide">ยืนยันการลบข้อมูลยานพาหนะ</h3>
                            <p class="text-xs text-slate-300">กรุณาตรวจสอบก่อนดำเนินการ ข้อมูลจะถูกลบออกจากระบบ</p>
                        </div>
                    </div>

                    <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
                        <div class="flex justify-between">
                            <span class="text-slate-400">หมายเลขทะเบียน:</span>
                            <span class="font-bold text-white">${v.plate}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-400">ยี่ห้อ / รุ่น:</span>
                            <span class="font-medium text-slate-200">${v.model}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-400">รหัสยานพาหนะ:</span>
                            <span class="font-mono text-amber-400 font-bold">${v.id}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-400">เลขไมล์ล่าสุด:</span>
                            <span class="font-mono text-slate-200">${(v.mileage || 0).toLocaleString()} กม.</span>
                        </div>
                    </div>

                    <p class="text-[11px] text-slate-400">
                        * เมื่อลบแล้ว รถคันนี้จะไม่ปรากฏในช่องเลือกตรวจสภาพและแดชบอร์ดอีกต่อไป
                    </p>

                    <div class="pt-2 border-t border-slate-800 flex justify-end gap-2">
                        <button type="button" onclick="document.getElementById('pea-add-vehicle-modal').innerHTML = ''" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition">
                            ยกเลิก
                        </button>
                        <button type="button" onclick="app.deleteCurrentVehicle('${v.id}')" class="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5">
                            <i class="fa-solid fa-trash-can"></i> ยืนยันการลบรถคันนี้
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    deleteCurrentVehicle(vehicleId) {
        const v = db.getVehicleById(vehicleId);
        if (!v) return;

        const plate = v.plate;
        const remaining = db.deleteVehicle(vehicleId);

        // Activity log
        db.addConsolidatedActivityLog({
            actionType: 'DELETE_VEHICLE',
            vehicleId: vehicleId,
            plate: plate,
            operator: 'หัวหน้าแผนกยานพาหนะ',
            role: 'CHIEF',
            summary: `ลบข้อมูลยานพาหนะทะเบียน ${plate} (${vehicleId}) ออกจากฐานข้อมูลระบบ`,
            statusResult: 'WARNING'
        });

        document.getElementById('pea-add-vehicle-modal').innerHTML = '';
        notifier.showToast('ลบข้อมูลรถยนต์เรียบร้อย', `ลบข้อมูลทะเบียน ${plate} ออกจากระบบแล้ว`, 'SUCCESS');

        // สลับไปเลือกคันแรกที่เหลืออยู่
        if (remaining && remaining.length > 0) {
            this.selectVehicle(remaining[0].id);
        } else {
            this.loadInitialVehicle();
        }

        this.renderSupervisorDashboard();
        this.renderActivityLogs();
        this.updateNetworkUI();
    }

    // =========================================================================
    // Activity Logs (Log Consolidation - ข้อ 3)
    // =========================================================================
    renderActivityLogs() {
        const container = document.getElementById('activity-logs-table-body');
        if (!container) return;

        const logs = db.getActivityLogs();
        if (logs.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-6 text-slate-500 text-xs">ยังไม่มีบันทึกประวัติกิจกรรม</td>
                </tr>
            `;
            return;
        }

        container.innerHTML = logs.map(l => {
            let roleBadge = '<span class="text-[10px] px-1.5 py-0.5 rounded bg-blue-900 text-blue-200">คนขับ</span>';
            if (l.role === 'MECHANIC') roleBadge = '<span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-900 text-amber-200">ช่างซ่อม</span>';
            if (l.role === 'CHIEF') roleBadge = '<span class="text-[10px] px-1.5 py-0.5 rounded bg-purple-900 text-purple-200">หัวหน้างาน</span>';

            let statusBadge = '<span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30 font-bold">READY</span>';
            if (l.statusResult === 'CRITICAL') statusBadge = '<span class="text-[10px] px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-500/30 font-bold">CRITICAL</span>';
            if (l.statusResult === 'WARNING') statusBadge = '<span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/30 font-bold">WARNING</span>';
            if (l.statusResult === 'PENDING_APPROVAL') statusBadge = '<span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30 font-bold">PENDING</span>';

            return `
                <tr class="border-b border-slate-800/80 hover:bg-slate-800/40 text-xs transition">
                    <td class="py-3 px-3 font-mono text-[11px] text-slate-400">${l.timestamp}</td>
                    <td class="py-3 px-3">
                        <div class="font-bold text-white">${l.plate}</div>
                        <div class="text-[10px] text-slate-400">${l.vehicleId}</div>
                    </td>
                    <td class="py-3 px-3">
                        <div class="flex items-center gap-1.5">
                            ${roleBadge}
                            <span class="text-slate-200">${l.operator}</span>
                        </div>
                    </td>
                    <td class="py-3 px-3 text-slate-300 leading-snug">
                        ${l.summary}
                    </td>
                    <td class="py-3 px-3 text-right">
                        ${statusBadge}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // =========================================================================
    // Fleet Status Pie / Doughnut Chart (สรุปผลการตรวจสอบสภาพรถยนต์เป็นกราฟวงกลม)
    // =========================================================================
    renderFleetPieChart(readyCount, warningCount, criticalCount) {
        const canvas = document.getElementById('fleet-status-pie-chart');
        if (!canvas) return;

        const total = readyCount + warningCount + criticalCount;
        const pReady = total > 0 ? Math.round((readyCount / total) * 100) : 0;
        const pWarning = total > 0 ? Math.round((warningCount / total) * 100) : 0;
        const pCritical = total > 0 ? Math.round((criticalCount / total) * 100) : 0;

        // Render Custom Interactive Metric Legend Below Chart
        const legendMetrics = document.getElementById('pie-chart-legend-metrics');
        if (legendMetrics) {
            legendMetrics.innerHTML = `
                <div class="cursor-pointer hover:bg-emerald-950/40 p-1.5 rounded-lg border ${this.fleetFilter === 'READY' ? 'border-emerald-400 bg-emerald-950/30' : 'border-transparent'}" onclick="app.setFleetFilter('READY')">
                    <div class="flex items-center justify-center gap-1 text-emerald-400 font-bold">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> พร้อมใช้
                    </div>
                    <div class="text-white font-black text-xs mt-0.5">${readyCount} คัน <span class="text-[10px] text-emerald-400 font-normal">(${pReady}%)</span></div>
                </div>
                <div class="cursor-pointer hover:bg-amber-950/40 p-1.5 rounded-lg border ${this.fleetFilter === 'WARNING' ? 'border-amber-400 bg-amber-950/30' : 'border-transparent'}" onclick="app.setFleetFilter('WARNING')">
                    <div class="flex items-center justify-center gap-1 text-amber-400 font-bold">
                        <span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span> เฝ้าระวัง
                    </div>
                    <div class="text-white font-black text-xs mt-0.5">${warningCount} คัน <span class="text-[10px] text-amber-400 font-normal">(${pWarning}%)</span></div>
                </div>
                <div class="cursor-pointer hover:bg-red-950/40 p-1.5 rounded-lg border ${this.fleetFilter === 'CRITICAL' ? 'border-red-400 bg-red-950/30' : 'border-transparent'}" onclick="app.setFleetFilter('CRITICAL')">
                    <div class="flex items-center justify-center gap-1 text-red-400 font-bold">
                        <span class="w-2 h-2 rounded-full bg-red-400 inline-block"></span> งดใช้งาน
                    </div>
                    <div class="text-white font-black text-xs mt-0.5">${criticalCount} คัน <span class="text-[10px] text-red-400 font-normal">(${pCritical}%)</span></div>
                </div>
            `;
        }

        if (typeof Chart === 'undefined') {
            console.warn('[Chart.js] Chart library not loaded');
            return;
        }

        const chartData = [readyCount, warningCount, criticalCount];
        const chartColors = ['#10b981', '#f59e0b', '#ef4444'];
        const chartHoverColors = ['#34d399', '#fbbf24', '#f87171'];

        // If chart already exists, update data
        if (this.fleetPieChart) {
            this.fleetPieChart.data.datasets[0].data = chartData;
            this.fleetPieChart.update();
            return;
        }

        // Initialize Chart.js Doughnut Chart
        try {
            const ctx = canvas.getContext('2d');
            this.fleetPieChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['พร้อมใช้งาน (READY)', 'เฝ้าระวัง (WARNING)', 'งดใช้งาน (CRITICAL)'],
                    datasets: [{
                        data: chartData,
                        backgroundColor: chartColors,
                        hoverBackgroundColor: chartHoverColors,
                        borderWidth: 2,
                        borderColor: '#0f172a',
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '68%',
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: '#090d16',
                            titleColor: '#f1f5f9',
                            bodyColor: '#cbd5e1',
                            borderColor: '#8b5cf6',
                            borderWidth: 1,
                            padding: 10,
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed || 0;
                                    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                                    return ` ${context.label}: ${value} คัน (${pct}%)`;
                                }
                            }
                        }
                    },
                    onClick: (evt, elements) => {
                        if (elements.length > 0) {
                            const index = elements[0].index;
                            if (index === 0) this.setFleetFilter(this.fleetFilter === 'READY' ? 'ALL' : 'READY');
                            else if (index === 1) this.setFleetFilter(this.fleetFilter === 'WARNING' ? 'ALL' : 'WARNING');
                            else if (index === 2) this.setFleetFilter(this.fleetFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL');
                        }
                    }
                }
            });
        } catch (e) {
            console.error('[Chart.js] Error initializing pie chart:', e);
        }
    }

    // =========================================================================
    // Google Sheets Integration Modal & Actions (ฐานข้อมูล Google Sheets)
    // =========================================================================
    openGoogleSheetModal() {
        const modal = document.getElementById('pea-googlesheet-modal');
        if (!modal) return;

        const currentUrl = (typeof googleSheet !== 'undefined') ? googleSheet.getWebAppUrl() : '';

        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
                <div class="bg-slate-900 border border-purple-500/50 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-fade-in my-8 text-xs">
                    <!-- Modal Header -->
                    <div class="bg-gradient-to-r from-purple-950 via-slate-900 to-emerald-950 p-4 border-b border-slate-700/80 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 text-lg">
                                <i class="fa-solid fa-table"></i>
                            </div>
                            <div>
                                <h3 class="text-sm font-black text-white flex items-center gap-2">
                                    เชื่อมต่อฐานข้อมูล Google Sheets (PEA Fleet Database)
                                </h3>
                                <div class="text-[11px] text-slate-300">
                                    บันทึกผลการตรวจสภาพ ทะเบียนรถ และการอนุมัติงานซ่อมลงใน Google Sheet แบบ Real-time
                                </div>
                            </div>
                        </div>
                        <button onclick="document.getElementById('pea-googlesheet-modal').innerHTML = ''" class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition">
                            <i class="fa-solid fa-xmark text-sm"></i>
                        </button>
                    </div>

                    <!-- Modal Body -->
                    <div class="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                        <!-- Step 1: Web App URL Setup -->
                        <div class="pea-glass p-4 rounded-xl border border-emerald-500/30 space-y-2">
                            <div class="flex items-center justify-between">
                                <label class="font-bold text-emerald-300 flex items-center gap-2">
                                    <span class="w-5 h-5 rounded-full bg-emerald-900 text-emerald-300 flex items-center justify-center text-[10px]">1</span>
                                    URL ของ Google Apps Script Web App:
                                </label>
                                <span class="text-[10px] text-slate-400">Deploy as Web App (Anyone can access)</span>
                            </div>
                            <div class="flex gap-2">
                                <input type="text" id="gsheet-url-input" value="${currentUrl}" placeholder="https://script.google.com/macros/s/.../exec" class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono">
                                <button onclick="app.saveGoogleSheetUrl()" class="btn-safety-orange px-4 py-2 rounded-lg font-bold flex items-center gap-1 shadow">
                                    <i class="fa-solid fa-floppy-disk"></i> บันทึก URL
                                </button>
                            </div>
<div class="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                                <span id="gsheet-test-status" class="text-slate-400">สถานะ: ${currentUrl ? '<span class="text-emerald-400 font-bold">กำหนด URL แล้ว</span>' : '<span class="text-amber-400">ยังไม่ได้ระบุ URL (ทำงานในโหมด LocalStorage + Export CSV)</span>'}</span>
                                <button onclick="app.loadFromGoogleSheet()" class="text-emerald-300 hover:text-emerald-200 underline font-semibold flex items-center gap-1">
                                    <i class="fa-solid fa-download"></i> โหลดข้อมูลจาก Google Sheet (ซิงก์ลงเครื่อง)
                                </button>
                                <button onclick="app.testGoogleSheetConnection()" class="text-purple-300 hover:text-purple-200 underline font-semibold flex items-center gap-1 ml-auto">
                                    <i class="fa-solid fa-bolt"></i> ทดสอบส่งข้อมูลทดสอบ
                                </button>
                            </div>
                            <div class="text-[10px] text-slate-500 leading-relaxed">
                                * ปุ่มโหลดจะอ่านรถทั้งหมดจาก Google Sheet มาเก็บไว้ในเครื่อง (ตัดสินข้อมูลด้วย updatedAt ล่าสุด เพื่อไม่ให้ข้อมูลถอยหลัง) — ระบบยังเปิดหน้าต่างนี้แล้วโหลดอัตโนมัติวันละครั้งอีกด้วย
                            </div>
                        </div>

                        <!-- Step 2: Apps Script Code Ready to Copy -->
                        <div class="pea-glass p-4 rounded-xl border border-purple-500/30 space-y-2">
                            <div class="flex items-center justify-between">
                                <label class="font-bold text-purple-300 flex items-center gap-2">
                                    <span class="w-5 h-5 rounded-full bg-purple-900 text-purple-300 flex items-center justify-center text-[10px]">2</span>
                                    โค้ด Google Apps Script (คัดลอกไปวางในส่วนขยาย > Apps Script ของ Google Sheet):
                                </label>
                                <button onclick="app.copyGoogleAppsScriptCode()" class="px-2.5 py-1 rounded bg-purple-800 hover:bg-purple-700 text-amber-300 font-bold flex items-center gap-1 text-[11px]">
                                    <i class="fa-solid fa-copy"></i> คัดลอกโค้ดทั้งหมด
                                </button>
                            </div>
                            <div class="relative">
                                <pre class="bg-slate-950 text-slate-300 p-3 rounded-lg border border-slate-800 text-[10px] font-mono h-36 overflow-y-auto" id="pea-apps-script-code-block">${typeof PEA_GOOGLE_APPS_SCRIPT_CODE !== 'undefined' ? PEA_GOOGLE_APPS_SCRIPT_CODE.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '// Code ready in js/googleSheetService.js'}</pre>
                            </div>
                            <div class="text-[11px] text-slate-400 space-y-1 pt-1">
                                <div><b>ขั้นตอนการติดตั้ง:</b></div>
                                <ol class="list-decimal list-inside space-y-0.5 text-slate-400 pl-1 text-[10px]">
                                    <li>เปิด Google Sheet เปล่าขึ้นมา 1 ไฟล์</li>
                                    <li>ไปที่เมนูด้านบน <b>ส่วนขยาย (Extensions) &gt; Apps Script</b></li>
                                    <li>ลบโค้ดเดิมออก แล้วกดปุ่ม <b>"คัดลอกโค้ดทั้งหมด"</b> ด้านบนมาวางแทน</li>
                                    <li>กดปุ่ม <b>ทำให้ใช้งานได้ (Deploy) &gt; รายการทำให้ใช้งานได้ใหม่ (New deployment)</b></li>
                                    <li>เลือกประเภทเป็น <b>เว็บแอป (Web app)</b>, ช่อง "ผู้ที่มีสิทธิ์เข้าถึง (Who has access)" ให้เลือกเป็น <b>ทุกคน (Anyone)</b></li>
                                    <li>กด "ทำให้ใช้งานได้ (Deploy)" แล้วนำ URL เว็บแอปที่ได้มาใส่ในช่องข้อ 1 ด้านบน</li>
                                </ol>
                            </div>
                        </div>

<!-- Step 4: Email Alert Setup -->
                        <div class="pea-glass p-4 rounded-xl border border-rose-500/30 space-y-2">
                            <div class="flex items-center justify-between">
                                <label class="font-bold text-rose-400 flex items-center gap-2">
                                    <span class="w-5 h-5 rounded-full bg-rose-900 text-rose-300 flex items-center justify-center text-[10px]">4</span>
                                    อีเมลสำหรับรับแจ้งเตือน (PM และ ภาษี):
                                </label>
                                <span class="text-[10px] text-slate-400">ระบบจะส่งอีเมลอัตโนมัติเมื่อถึงกำหนด</span>
                            </div>
                            <div class="space-y-2">
                                <div class="flex items-center gap-2">
                                    <span class="text-[11px] text-rose-300 font-bold shrink-0 w-24">หัวหน้างาน:</span>
                                    <input type="text" id="alert-chief-input" value="${(typeof db !== 'undefined' && db.getChiefEmail) ? db.getChiefEmail() : ''}" placeholder="e.g. หัวหน้า@pea.co.th (ตอนทดสอบ = pon60562@gmail.com)" class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400 font-mono">
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-[11px] text-rose-300 font-bold shrink-0 w-24">ช่างเครื่องยนต์:</span>
                                    <input type="text" id="alert-mechanic-input" value="${(typeof db !== 'undefined' && db.getMechanicEmail) ? db.getMechanicEmail() : ''}" placeholder="e.g. ช่าง@pea.co.th (ตอนทดสอบ = pon60562@gmail.com)" class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400 font-mono">
                                </div>
                            </div>
                            <div class="flex items-center gap-2 pt-1">
                                <button onclick="app.saveAlertEmails()" class="bg-rose-700 hover:bg-rose-600 px-4 py-2 rounded-lg font-bold text-white flex items-center gap-1 shadow transition">
                                    <i class="fa-solid fa-envelope"></i> บันทึกอีเมล
                                </button>
                                <button onclick="app.sendTestAlertEmail()" class="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-lg font-bold text-white flex items-center gap-1 shadow transition text-[11px]">
                                    <i class="fa-solid fa-paper-plane"></i> ส่งอีเมลทดสอบ
                                </button>
                            </div>
                            <div class="text-[10px] text-slate-400 pt-1 leading-relaxed">
                                * ส่งแจ้งเตือนเฉพาะ <b>2 อีเมลนี้เท่านั้น</b> (ช่างเครื่องยนต์ + หัวหน้างาน) เมื่อรถถึง <b>รอบ PM (ระยะวิ่งตั้งแต่ PM รอบก่อน ≥ 10,000 กม.)</b> และ <b>ภาษีใกล้หมดอายุล่วงหน้า 7 วัน</b>
                                * ระบบสแกนทั้งกองยานตอนเปิดโปรแกรม + ทุกครั้งที่ "บันทึกขากลับ" และจะส่งซ้ำอีกครั้งทุกวันตราบใดที่ยังไม่แก้ไข (กันสแปมด้วยการส่งวันละครั้ง)
                            </div>
                        </div>

                        <!-- Step 3: Offline Backup & CSV Export -->
                        <div class="pea-glass p-4 rounded-xl border border-slate-700 space-y-2">
                            <div class="flex items-center justify-between">
                                <label class="font-bold text-slate-200 flex items-center gap-2">
                                    <span class="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px]">3</span>
                                    สำรองข้อมูล / ส่งออกเป็นไฟล์ CSV (Direct Excel / Google Sheet Import):
                                </label>
                                <button onclick="app.exportGoogleSheetCSV()" class="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold flex items-center gap-1.5 shadow">
                                    <i class="fa-solid fa-file-csv"></i> ดาวน์โหลด CSV (UTF-8 BOM)
                                </button>
                            </div>
                            <div class="text-[11px] text-slate-400">
                                กรณีไม่ได้เชื่อมต่ออินเทอร์เน็ต สามารถกดดาวน์โหลดไฟล์ CSV นี้เพื่อนำไป Import เข้า Google Sheets ได้ทันที (รองรับภาษาไทย 100%)
                            </div>
                        </div>
                    </div>

                    <!-- Modal Footer -->
                    <div class="p-3.5 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
                        <button onclick="document.getElementById('pea-googlesheet-modal').innerHTML = ''" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition">
                            ปิดหน้าต่าง
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    saveGoogleSheetUrl() {
        const input = document.getElementById('gsheet-url-input');
        if (!input) return;
        const url = input.value.trim();
        if (typeof googleSheet !== 'undefined') {
            googleSheet.setWebAppUrl(url);
            notifier.showToast('บันทึกการตั้งค่า Google Sheets', url ? 'บันทึก URL เว็บแอปสำเร็จ ระบบจะส่งข้อมูลอัตโนมัติ' : 'ล้างการตั้งค่า URL เรียบร้อย', 'SUCCESS');
            const status = document.getElementById('gsheet-test-status');
            if (status) {
                status.innerHTML = url 
                    ? '<span class="text-emerald-400 font-bold">กำหนด URL แล้ว</span>' 
                    : '<span class="text-amber-400">ยังไม่ได้ระบุ URL</span>';
            }
        }
    }

    copyGoogleAppsScriptCode() {
        const codeBlock = document.getElementById('pea-apps-script-code-block');
        const codeText = typeof PEA_GOOGLE_APPS_SCRIPT_CODE !== 'undefined' ? PEA_GOOGLE_APPS_SCRIPT_CODE : (codeBlock ? codeBlock.innerText : '');
        navigator.clipboard.writeText(codeText).then(() => {
            notifier.showToast('คัดลอกโค้ดสำเร็จ', 'โค้ด Google Apps Script ถูกบันทึกลงในคลิปบอร์ดแล้ว', 'SUCCESS');
        }).catch(err => {
            notifier.showToast('ไม่สามารถคัดลอกอัตโนมัติ', 'กรุณาลากคลุมแถบโค้ดเพื่อคัดลอก', 'WARNING');
        });
    }

async testGoogleSheetConnection() {
        const status = document.getElementById('gsheet-test-status');
        if (status) status.innerHTML = '<span class="text-amber-400"><i class="fa-solid fa-spinner animate-spin"></i> กำลังทดสอบแบบครบวงจร (เขียนข้อมูลทดสอบ + อ่านกลับ)...</span>';
        
        if (typeof googleSheet !== 'undefined') {
            // ใช้แบบครบวงจร: เขียน row ทดสอบจริง -> อ่านกลับจาก GSheet -> ยืนยันได้จริง
            const res = await googleSheet.testConnectionFull();
            if (res.success) {
                if (status) status.innerHTML = `<span class="text-emerald-400 font-bold"><i class="fa-solid fa-check"></i> ${res.message}</span>`;
                notifier.showToast('ทดสอบ Google Sheets ผ่านแบบครบวงจร', res.message, 'SUCCESS');
            } else {
                if (status) status.innerHTML = `<span class="text-red-400 font-bold"><i class="fa-solid fa-xmark"></i> ${res.message}</span>`;
                notifier.showToast('ทดสอบการเชื่อมต่อไม่ผ่าน', res.message, 'CRITICAL');
            }
        }
    }

exportGoogleSheetCSV() {
        if (typeof googleSheet !== 'undefined') {
            googleSheet.exportCSV();
            notifier.showToast('ดาวน์โหลดไฟล์ CSV สำเร็จ', 'นำไฟล์นี้ไปเปิดหรือ Import เข้า Google Sheets ได้ทันที', 'SUCCESS');
        }
    }

    // =========================================================================
    // Google Sheets -> Local Import (อ่านกลับจากชีตแบบ JSONP)
    // =========================================================================
    // Handler ของปุ่มใน modal: เรียก import พร้อมแจ้งผลบน UI
    async loadFromGoogleSheet() {
        const result = await this.importFromGoogleSheet(true);
        return result;
    }

    // ตัว import หลัก: readSnapshot -> merge -> บันทึกลงเครื่อง -> render
    // silent=true: ไม่โชว์ toast กับผู้ใช้ (ใช้สำหรับ auto-load เฉพาะวันที่) แต่ล็อก console
    async importFromGoogleSheet(showToast = true) {
        const show = (type, title, body) => {
            if (showToast) notifier.showToast(title, body, type);
            else console.log(`[PEA GSheet auto-load] ${title} - ${body}`);
        };

        if (typeof googleSheet === 'undefined' || typeof db === 'undefined') {
            show('CRITICAL', 'โหลดข้อมูลไม่สำเร็จ', 'ไม่พบระบบฐานข้อมูลในระบบนี้');
            return { success: false };
        }

        if (!googleSheet.isConnected()) {
            show('WARNING', 'ไม่สามารถโหลดข้อมูลได้', 'ยังไม่ได้กำหนด URL ของ Google Apps Script Web App');
            return { success: false, reason: 'NO_URL' };
        }

        const snapshot = await googleSheet.readSnapshotWithRetry(12000, 3);
        if (!snapshot.success) {
            show('CRITICAL', 'โหลดข้อมูลไม่สำเร็จ', snapshot.message || 'ไม่สามารถติดต่อ Google Sheet ได้');
            return { success: false, reason: snapshot.reason, message: snapshot.message };
        }

        const payload = snapshot.payload || snapshot.data || snapshot;
        if (!googleSheet.hasValidSnapshotData(payload)) {
            show('WARNING', 'ข้อมูลไม่ครบถ้วน', 'Google Sheet ยังไม่มีข้อมูลรถในตารางที่ถูกต้อง (อาจยังไม่เคยส่งข้อมูลขึ้นไป)');
            return { success: false, reason: 'EMPTY' };
        }

        const remoteVehicles = (payload.data && Array.isArray(payload.data.vehicles)) ? payload.data.vehicles : [];
        const localVehicles = db.getVehicles();

        try {
            const merged = googleSheet.mergeVehiclesFromSnapshot(remoteVehicles, localVehicles);
            if (!merged || merged.length === 0) {
                show('INFO', 'ไม่มีข้อมูลให้โหลด', 'Google Sheet ไม่มีรายการรถที่นำมาใช้ได้ ไม่แตะข้อมูลในเครื่อง');
                return { success: false, reason: 'EMPTY', count: 0 };
            }

            const saved = db.replaceVehiclesFromRemote(merged);
            if (!saved) {
                show('WARNING', 'โหลดข้อมูลล้มเหลว', 'สงวนข้อมูลเดิมไว้ เนื่องจากข้อมูลที่รับมาไม่ถูกต้อง');
                return { success: false, reason: 'EMPTY' };
            }

            // อัปเดต UI ทั้งหมดที่เกี่ยวกับรถ
            try { this.renderSupervisorDashboard(); } catch(e) {}
            try { this.renderActiveTripsTab(); } catch(e) {}
            try { this.updateNetworkUI(); } catch(e) {}
            try { this.loadInitialVehicle(); } catch(e) {}

            // ล็อก activity
            try {
                const logs = db.getActivityLogs();
                const entry = {
                    timestamp: new Date().toLocaleString('th-TH'),
                    logId: 'SYNC-FROM-GS-' + Date.now().toString(36).toUpperCase(),
                    plate: '-',
                    operator: 'ระบบ',
                    role: 'SYSTEM',
                    summary: `ซิงก์ข้อมูลจาก Google Sheets ลงเครื่อง ${merged.length} คัน`,
                    statusResult: 'SUCCESS'
                };
                logs.unshift(entry);
                if (logs.length > 100) logs.pop();
                localStorage.setItem(db.STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(logs));
                try { this.renderActivityLogs(); } catch(e) {}
            } catch(e) { console.warn('[PEA] Activity log after import error:', e); }

            show('SUCCESS', 'โหลดข้อมูลจาก Google Sheet สำเร็จ', `นำเข้ารถ ${merged.length} คัน ลงเครื่องเรียบร้อย (อัปเดตเฉพาะรายการที่ใหม่กว่า)`);
            return { success: true, count: merged.length };
        } catch (e) {
            console.error('[PEA] importFromGoogleSheet error:', e);
            show('CRITICAL', 'โหลดข้อมูลไม่สำเร็จ', 'เกิดข้อผิดพลาดระหว่างนำเข้าข้อมูล (ข้อมูลในเครื่องคงเดิม)');
            return { success: false, reason: 'ERROR', message: e && e.message ? e.message : String(e) };
        }
    }

    // Auto-load: เปิดแอปครั้งแรกของวัน จะโหลดจาก Google Sheets อัตโนมัติ (ครั้งเดียว/วัน, เงียบ)
    async autoLoadFromGoogleSheetIfNewDay() {
        const KEY = 'pea_last_gsheet_autoload_date';
        try {
            if (typeof googleSheet === 'undefined' || !googleSheet.isConnected()) return;
        } catch(e) { return; }

        const today = new Date().toLocaleDateString('th-TH');
        let last = '';
        try { last = localStorage.getItem(KEY) || ''; } catch(e) {}
        if (last === today) {
            console.log('[PEA GSheet] โหลดอัตโนมัติแล้วในวันนี้ (ข้าม)');
            return;
        }

        const result = await this.importFromGoogleSheet(false);
        if (result && result.success) {
            try { localStorage.setItem(KEY, today); } catch(e) {}
        } else {
            // offline / ไม่มี URL / ข้อมูลไม่พร้อม => ไม่ over-ride แฟลก ปล่อยให้ลองอีกทีในวันนี้ (ใส่ console เท่านั้น)
            console.log('[PEA GSheet] auto-load วันนี้ยังไม่สำเร็จ:', result && result.reason ? result.reason : 'unknown');
        }
    }

    // =========================================================================
    // Mileage Tracking & Delta Calculation (ตาม feature_request.md)
    // =========================================================================
    calculateTripMileage() {
        const startInput = document.getElementById('start-mileage-input');
        const endInput = document.getElementById('end-mileage-input');
        const deltaBadge = document.getElementById('mileage-delta-badge');
        if (!startInput || !endInput || !deltaBadge) return;

        const start = parseInt(startInput.value) || 0;
        const end = parseInt(endInput.value) || 0;
        const delta = end - start;

        if (end < start) {
            deltaBadge.className = 'bg-red-950 border border-red-500 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-red-300 min-w-[120px] text-center animate-pulse';
            deltaBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ไมล์ลดลง (${delta.toLocaleString()} กม.)`;
        } else if (delta > 10000) {
            deltaBadge.className = 'bg-red-950 border border-red-500 rounded-xl px-3 py-1.5 text-xs font-mono font-black text-red-300 min-w-[120px] text-center animate-pulse';
            deltaBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber-400"></i> +${delta.toLocaleString()} กม. (เกิน 10k)`;
        } else if (delta > 0) {
            deltaBadge.className = 'bg-emerald-950/80 border border-emerald-500/50 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-emerald-300 min-w-[120px] text-center';
            deltaBadge.innerHTML = `+${delta.toLocaleString()} กม.`;
        } else {
            deltaBadge.className = 'bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono font-bold text-slate-400 min-w-[120px] text-center';
            deltaBadge.innerHTML = `0 กม.`;
        }
    }

    // Image Zoom Modal
    previewImage(src) {
        const modal = document.getElementById('pea-defect-modal');
        if (!modal) return;
        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer" onclick="this.parentElement.innerHTML = ''">
                <div class="max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border border-slate-700 p-2 bg-slate-950">
                    <img src="${src}" class="w-full h-full object-contain max-h-[80vh]">
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Vehicle select dropdown listener
        const selector = document.getElementById('vehicle-select-dropdown');
        if (selector) {
            selector.addEventListener('change', (e) => {
                this.selectVehicle(e.target.value);
            });
        }

        // Role select dropdown listener
        const roleSelect = document.getElementById('user-role-select');
        if (roleSelect) {
            roleSelect.addEventListener('change', (e) => {
                this.setRole(e.target.value);
            });
        }

        // Network change events
        window.addEventListener('pea-network-changed', () => {
            this.updateNetworkUI();
        });
        window.addEventListener('pea-sync-queue-updated', () => {
            this.updateNetworkUI();
        });
        window.addEventListener('online', () => {
            this.updateNetworkUI();
            this.triggerSyncNow();
        });
        window.addEventListener('offline', () => {
            this.updateNetworkUI();
        });
    }

    // =========================================================================
    // Employee Auto-fetch & Master Data Management System
    // =========================================================================
    handleEmployeeIdInput(empId) {
        const cleanId = (empId || '').trim();
        const nameInput = document.getElementById('inspector-name-input');
        const badgeEl = document.getElementById('emp-lookup-badge');
        const msgEl = document.getElementById('emp-lookup-msg');
        const deptEl = document.getElementById('emp-dept-msg');

        if (!cleanId) {
            if (nameInput) {
                nameInput.value = '';
                nameInput.classList.remove('border-emerald-500', 'border-red-500');
                nameInput.classList.add('border-slate-700');
            }
            if (badgeEl) badgeEl.classList.add('hidden');
            if (msgEl) msgEl.innerHTML = '';
            if (deptEl) deptEl.innerHTML = '';
            return;
        }

        // ค้นหาในฐานข้อมูลพนักงาน กฟภ. (จาก db.getEmployeeById หรือ PEA_EMPLOYEES)
        let emp = db.getEmployeeById(cleanId);
        if (!emp && typeof PEA_EMPLOYEES !== 'undefined' && PEA_EMPLOYEES[cleanId]) {
            emp = {
                id: cleanId,
                name: PEA_EMPLOYEES[cleanId].name,
                position: PEA_EMPLOYEES[cleanId].position || 'พนักงาน กฟภ.',
                dept: PEA_EMPLOYEES[cleanId].dept || 'การไฟฟ้าส่วนภูมิภาค'
            };
        }

        if (emp) {
            if (nameInput) {
                nameInput.value = emp.name;
                nameInput.classList.remove('border-slate-700', 'border-red-500');
                nameInput.classList.add('border-emerald-500', 'bg-slate-900/90');
            }
            if (badgeEl) {
                badgeEl.classList.remove('hidden', 'bg-red-950/80', 'text-red-400', 'border-red-500/40');
                badgeEl.classList.add('bg-emerald-950/80', 'text-emerald-300', 'border', 'border-emerald-500/40');
                badgeEl.innerText = 'พบข้อมูล กฟภ.';
            }
            if (msgEl) {
                msgEl.className = 'text-[10px] mt-1 text-emerald-400 flex items-center gap-1 font-semibold';
                msgEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>ตำแหน่ง: ${emp.position || 'พนักงาน กฟภ.'}</span>`;
            }
            if (deptEl) {
                deptEl.className = 'text-[10px] mt-1 text-slate-300 truncate flex items-center gap-1';
                deptEl.innerHTML = `<i class="fa-solid fa-building text-amber-400"></i> <span>สังกัด: ${emp.dept || 'การไฟฟ้าส่วนภูมิภาค'}</span>`;
            }
        } else {
            // กรณีไม่พบรหัสพนักงาน: ล้างชื่อให้ว่างเปล่าตามเงื่อนไข
            if (nameInput) {
                nameInput.value = '';
                nameInput.classList.remove('border-emerald-500');
                nameInput.classList.add('border-slate-700');
                nameInput.placeholder = 'ระบุชื่อ-นามสกุล';
            }
            if (badgeEl) {
                badgeEl.classList.remove('hidden', 'bg-emerald-950/80', 'text-emerald-300', 'border-emerald-500/40');
                badgeEl.classList.add('bg-red-950/80', 'text-red-400', 'border', 'border-red-500/40');
                badgeEl.innerText = 'ไม่พบรหัส';
            }
            if (msgEl) {
                msgEl.className = 'text-[10px] mt-1 text-amber-400 flex items-center gap-1 font-medium animate-pulse';
                msgEl.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber-400"></i> <span>ไม่พบข้อมูลพนักงาน กรุณาตรวจสอบรหัสอีกครั้ง</span>`;
            }
            if (deptEl) {
                deptEl.className = 'text-[10px] mt-1 text-slate-400';
                deptEl.innerHTML = `<span>(สามารถพิมพ์ระบุชื่อผู้ปฏิบัติงานเองได้)</span>`;
            }
        }
    }

    // Modal จัดการฐานข้อมูลพนักงาน กฟภ. (Employee Master Data Manager)
    openEmployeeManagementModal() {
        const modal = document.getElementById('pea-add-vehicle-modal');
        if (!modal) return;

        const employees = db.getEmployees();

        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onclick="if(event.target === this) this.parentElement.innerHTML = ''">
                <div class="bg-slate-900 border border-purple-500/50 rounded-2xl max-w-2xl w-full shadow-2xl p-6 text-white space-y-4 animate-fade-in max-h-[90vh] flex flex-col">
                    
                    <!-- Header -->
                    <div class="flex justify-between items-start border-b border-slate-800 pb-3 flex-shrink-0">
                        <div>
                            <span class="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-bold border border-purple-500/40">MASTER DATA</span>
                            <h3 class="text-base font-bold text-white mt-1 flex items-center gap-2">
                                <i class="fa-solid fa-users text-amber-400"></i> ฐานข้อมูลพนักงาน กฟภ. (Employee Master Data)
                            </h3>
                            <p class="text-xs text-slate-400">จัดการรายชื่อ รหัสพนักงาน และตำแหน่ง สำหรับระบบค้นหาอัตโนมัติ</p>
                        </div>
                        <button onclick="document.getElementById('pea-add-vehicle-modal').innerHTML = ''" class="text-slate-400 hover:text-white">
                            <i class="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>

                    <!-- Action Bar -->
                    <div class="flex items-center justify-between gap-3 flex-shrink-0">
                        <div class="text-xs text-slate-300">
                            จำนวนพนักงานในระบบ: <strong class="text-amber-400 font-mono">${employees.length}</strong> คน
                        </div>
                        <button type="button" onclick="app.openAddOrEditEmployeeModal()" class="btn-safety-orange px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5">
                            <i class="fa-solid fa-user-plus"></i> + เพิ่มพนักงานใหม่
                        </button>
                    </div>

                    <!-- Employee Table Container -->
                    <div class="flex-1 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950/60 divide-y divide-slate-800/80">
                        ${employees.length === 0 ? `
                            <div class="p-8 text-center text-slate-400 text-xs">
                                <i class="fa-solid fa-user-slash text-2xl mb-2 text-slate-600 block"></i>
                                ยังไม่มีข้อมูลพนักงานในระบบ คลิกปุ่ม <strong>+ เพิ่มพนักงานใหม่</strong> เพื่อลงทะเบียน
                            </div>
                        ` : `
                            <table class="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr class="bg-slate-900/90 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                                        <th class="p-3">รหัสพนักงาน</th>
                                        <th class="p-3">ชื่อ-นามสกุล</th>
                                        <th class="p-3 hidden sm:table-cell">ตำแหน่ง / สังกัด</th>
                                        <th class="p-3 text-right">จัดการ</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-800/60">
                                    ${employees.map(emp => `
                                        <tr class="hover:bg-slate-800/50 transition">
                                            <td class="p-3 font-mono font-bold text-amber-400">${emp.id}</td>
                                            <td class="p-3 font-semibold text-white">
                                                ${emp.name}
                                                <div class="text-[10px] text-slate-400 sm:hidden mt-0.5">${emp.position || '-'}</div>
                                            </td>
                                            <td class="p-3 hidden sm:table-cell text-slate-300">
                                                <div>${emp.position || '-'}</div>
                                                <div class="text-[10px] text-slate-500">${emp.dept || '-'}</div>
                                            </td>
                                            <td class="p-3 text-right whitespace-nowrap">
                                                <button type="button" onclick="app.openAddOrEditEmployeeModal('${emp.id}')" title="แก้ไขข้อมูล" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white transition mr-1">
                                                    <i class="fa-solid fa-pen-to-square"></i>
                                                </button>
                                                <button type="button" onclick="app.deleteEmployeeRecord('${emp.id}', '${emp.name}')" title="ลบข้อมูล" class="p-1.5 rounded-lg bg-red-950/70 hover:bg-red-900 text-red-300 hover:text-white transition">
                                                    <i class="fa-solid fa-trash-can"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `}
                    </div>

                    <!-- Footer -->
                    <div class="pt-3 border-t border-slate-800 flex justify-end flex-shrink-0">
                        <button type="button" onclick="document.getElementById('pea-add-vehicle-modal').innerHTML = ''" class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold transition">
                            ปิดหน้าต่าง
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Modal เพิ่มหรือแก้ไขข้อมูลพนักงานรายคน
    openAddOrEditEmployeeModal(empId = null) {
        const modal = document.getElementById('pea-add-vehicle-modal');
        if (!modal) return;

        const isEdit = !!empId;
        const emp = isEdit ? db.getEmployeeById(empId) : { id: '', name: '', position: '', dept: '' };

        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onclick="if(event.target === this) app.openEmployeeManagementModal()">
                <div class="bg-slate-900 border border-purple-500/60 rounded-2xl max-w-md w-full shadow-2xl p-6 text-white space-y-4 animate-fade-in">
                    
                    <div class="flex justify-between items-start border-b border-slate-800 pb-3">
                        <div>
                            <span class="px-2 py-0.5 rounded bg-purple-950 text-purple-300 text-[10px] font-bold border border-purple-500/40">EMPLOYEE PROFILE</span>
                            <h3 class="text-base font-bold text-white mt-1 flex items-center gap-2">
                                <i class="fa-solid ${isEdit ? 'fa-pen-to-square text-amber-400' : 'fa-user-plus text-emerald-400'}"></i>
                                ${isEdit ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มข้อมูลพนักงานใหม่'}
                            </h3>
                        </div>
                        <button onclick="app.openEmployeeManagementModal()" class="text-slate-400 hover:text-white">
                            <i class="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>

                    <form id="employee-form" onsubmit="app.saveEmployeeRecord(event, ${isEdit ? `'${empId}'` : 'null'})" class="space-y-3.5 text-xs">
                        <div>
                            <label class="block text-slate-300 mb-1 font-semibold">รหัสพนักงาน (Employee ID):</label>
                            <input type="text" inputmode="numeric" id="form-emp-id" value="${emp.id || ''}" placeholder="เช่น 512446" required ${isEdit ? 'readonly' : ''}
                                class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-amber-400 font-mono font-bold focus:outline-none focus:border-amber-400 ${isEdit ? 'opacity-80 cursor-not-allowed bg-slate-950' : ''}">
                            ${isEdit ? '<p class="text-[10px] text-slate-500 mt-0.5">รหัสพนักงานไม่สามารถแก้ไขได้</p>' : ''}
                        </div>

                        <div>
                            <label class="block text-slate-300 mb-1 font-semibold">ชื่อ-นามสกุล (Full Name):</label>
                            <input type="text" id="form-emp-name" value="${emp.name || ''}" placeholder="เช่น นายเกียรติศักดิ์ พงษ์สว่าง" required 
                                class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-semibold focus:outline-none focus:border-amber-400">
                        </div>

                        <div>
                            <label class="block text-slate-300 mb-1 font-semibold">ตำแหน่งงาน (Position):</label>
                            <input type="text" id="form-emp-position" value="${emp.position || ''}" placeholder="เช่น วิศวกรไฟฟ้าปฏิบัติการ / ผู้ควบคุมงาน" 
                                class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-400">
                        </div>

                        <div>
                            <label class="block text-slate-300 mb-1 font-semibold">แผนก / สังกัด (Department):</label>
                            <input type="text" id="form-emp-dept" value="${emp.dept || ''}" placeholder="เช่น แผนกปฏิบัติการระบบจำหน่าย กฟส." 
                                class="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-400">
                        </div>

                        <div class="pt-3 border-t border-slate-800 flex justify-end gap-2">
                            <button type="button" onclick="app.openEmployeeManagementModal()" class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl font-semibold transition">
                                ย้อนกลับ
                            </button>
                            <button type="submit" class="btn-safety-orange px-5 py-2 rounded-xl font-bold shadow-lg transition flex items-center gap-1.5">
                                <i class="fa-solid fa-floppy-disk"></i> บันทึกข้อมูล
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    // บันทึกข้อมูลพนักงาน
    saveEmployeeRecord(event, originalId = null) {
        event.preventDefault();
        const id = document.getElementById('form-emp-id').value.trim();
        const name = document.getElementById('form-emp-name').value.trim();
        const position = document.getElementById('form-emp-position').value.trim() || 'พนักงาน กฟภ.';
        const dept = document.getElementById('form-emp-dept').value.trim() || 'การไฟฟ้าส่วนภูมิภาค';

        if (!id || !name) {
            notifier.showToast('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกรหัสพนักงานและชื่อ-นามสกุล', 'WARNING');
            return;
        }

        const employee = { id, name, position, dept };
        db.saveEmployee(employee);

        // บันทึกลง Activity Logs
        db.addConsolidatedActivityLog({
            actionType: originalId ? 'EDIT_EMPLOYEE' : 'ADD_EMPLOYEE',
            vehicleId: '-',
            plate: '-',
            operator: 'ผู้ดูแลระบบ',
            role: 'CHIEF',
            summary: `${originalId ? 'แก้ไข' : 'เพิ่ม'}ข้อมูลพนักงานรหัส ${id}: ${name} (${position})`,
            statusResult: 'READY'
        });

        notifier.showToast('บันทึกสำเร็จ', `ข้อมูลพนักงาน ${name} (${id}) ได้รับการบันทึกแล้ว`, 'SUCCESS');

        // หากกำลังใช้งานรหัสพนักงานนี้ในฟอร์มหน้าจอหลักอยู่ ให้อัปเดตชื่อทันที
        const currentEmpIdInput = document.getElementById('employee-id-input');
        if (currentEmpIdInput && currentEmpIdInput.value.trim() === id) {
            this.handleEmployeeIdInput(id);
        }

        // กลับสู่หน้าต่างรายการพนักงาน
        this.openEmployeeManagementModal();
    }

    // ลบข้อมูลพนักงาน
    deleteEmployeeRecord(empId, empName) {
        if (!confirm(`คุณต้องการลบข้อมูลพนักงาน "${empName}" (รหัส ${empId}) ออกจากระบบใช่หรือไม่?`)) {
            return;
        }

        db.deleteEmployee(empId);

        db.addConsolidatedActivityLog({
            actionType: 'DELETE_EMPLOYEE',
            vehicleId: '-',
            plate: '-',
            operator: 'ผู้ดูแลระบบ',
            role: 'CHIEF',
            summary: `ลบข้อมูลพนักงานรหัส ${empId}: ${empName} ออกจากฐานข้อมูลระบบ`,
            statusResult: 'WARNING'
        });

        notifier.showToast('ลบข้อมูลเรียบร้อย', `ลบพนักงาน ${empName} (${empId}) แล้ว`, 'SUCCESS');

        // รีเฟรชฟอร์มหลักถ้าเป็นรหัสที่แสดงอยู่
        const currentEmpIdInput = document.getElementById('employee-id-input');
        if (currentEmpIdInput && currentEmpIdInput.value.trim() === empId) {
            this.handleEmployeeIdInput(empId);
        }

        this.openEmployeeManagementModal();
    }

    // =========================================================================
    // Active Vehicles / Out on Duty Tracking & Return Mileage Shortcut System
    // =========================================================================
    
    // 1. บันทึกรถออกปฏิบัติงาน (Departure)
    recordDeparture() {
        if (!this.currentVehicle) {
            notifier.showToast('แจ้งเตือน', 'กรุณาเลือกยานพาหนะก่อนบันทึกออกปฏิบัติงาน', 'WARNING');
            return;
        }

        const v = this.currentVehicle;
        const empIdInput = document.getElementById('employee-id-input');
        const inspectorInput = document.getElementById('inspector-name-input');
        const taskInput = document.getElementById('task-description-input');
        const startMileageInput = document.getElementById('start-mileage-input');

        const employeeId = (empIdInput ? empIdInput.value : '').trim();
        const operatorName = (inspectorInput ? inspectorInput.value : '').trim();
        const taskDescription = (taskInput && taskInput.value.trim()) ? taskInput.value.trim() : 'ปฏิบัติงานภาคสนาม กฟภ.';
        const startMileage = startMileageInput ? parseInt(startMileageInput.value, 10) : (v.mileage || 0);

        if (!employeeId) {
            notifier.showToast('กรุณากรอกรหัสพนักงาน', 'ต้องระบุรหัสพนักงานผู้ปฏิบัติงานก่อนนำรถออก', 'WARNING');
            if (empIdInput) empIdInput.focus();
            return;
        }

        if (!operatorName) {
            notifier.showToast('กรุณาระบุชื่อผู้ปฏิบัติงาน', 'ไม่พบชื่อผู้ปฏิบัติงานในระบบ', 'WARNING');
            if (inspectorInput) inspectorInput.focus();
            return;
        }

        if (isNaN(startMileage) || startMileage < 0) {
            notifier.showToast('เลขไมล์ไม่ถูกต้อง', 'กรุณาระบุเลขไมล์เริ่มต้นให้ถูกต้อง', 'WARNING');
            if (startMileageInput) startMileageInput.focus();
            return;
        }

        // Check if already in active mission
        const existingMission = db.getActiveMissionByVehicleId(v.id);
        const isUpdate = !!existingMission;

        const mission = db.startVehicleMission({
            vehicleId: v.id,
            plate: v.plate,
            model: v.model,
            operatorName: operatorName,
            employeeId: employeeId,
            taskDescription: taskDescription,
            startMileage: startMileage,
            departureTime: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            departureDate: new Date().toLocaleDateString('th-TH')
        });

        // Activity Log Consolidation
        db.addConsolidatedActivityLog({
            actionType: 'VEHICLE_DEPARTURE',
            vehicleId: v.id,
            plate: v.plate,
            operator: `${operatorName} (รหัส ${employeeId})`,
            role: 'DRIVER',
            summary: `${isUpdate ? 'อัปเดตข้อมูลภารกิจ' : 'นำรถออกปฏิบัติงาน'}: "${taskDescription}" เลขไมล์เริ่มต้น ${startMileage.toLocaleString()} กม. เวลา ${mission.departureTime} น.`,
            statusResult: 'READY'
        });

        notifier.broadcastAlert({
            targetRoles: ['CHIEF', 'MECHANIC'],
            title: '🚗 บันทึกรถออกปฏิบัติงาน',
            message: `ทะเบียน ${v.plate} ออกปฏิบัติงาน "${taskDescription}" โดย ${operatorName} (${employeeId}) เลขไมล์ ${startMileage.toLocaleString()} กม.`,
            type: 'INFO'
        });

        notifier.showToast('บันทึกสำเร็จ', `รถทะเบียน ${v.plate} อยู่ในสถานะออกปฏิบัติงานแล้ว`, 'SUCCESS');

        // 🔗 บันทึกข้อมูลลงใน Google Sheets อัตโนมัติ (Google Sheets Integration)
        if (typeof googleSheet !== 'undefined') {
            googleSheet.logDeparture({
                missionId: mission.id,
                vehicleId: v.id,
                plate: v.plate,
                model: v.model,
                employeeId: employeeId,
                operatorName: operatorName,
                taskDescription: taskDescription,
                startMileage: startMileage
            }).catch(e => console.warn('[GoogleSheet] Departure sync warning:', e));
        }

        // Update UI
        this.updateVehicleHeaderCard();
        this.renderActiveTripsTab();
        this.renderSupervisorDashboard();
        this.updateActiveTripsNavBadge();
    }

    // 2. Render ตาราง/การ์ดรถที่กำลังออกปฏิบัติงานบน Dashboard
    renderActiveDutyWidget() {
        const container = document.getElementById('active-duty-container');
        const badgeCount = document.getElementById('active-duty-count-badge');
        if (!container) return;

        const activeMissions = db.getActiveMissions();

        if (badgeCount) {
            badgeCount.innerText = `${activeMissions.length} คัน`;
            if (activeMissions.length > 0) {
                badgeCount.className = 'px-2 py-0.5 rounded-full bg-blue-600 text-white font-mono font-bold text-[10px] border border-blue-400 animate-pulse';
            } else {
                badgeCount.className = 'px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono font-bold text-[10px] border border-slate-700';
            }
        }

        if (activeMissions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-slate-400">
                    <div class="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-2 text-slate-500 text-xl">
                        <i class="fa-solid fa-parking"></i>
                    </div>
                    <div class="text-sm font-semibold text-slate-300">ขณะนี้ไม่มียานพาหนะที่ออกปฏิบัติงานนอกสถานที่</div>
                    <div class="text-xs text-slate-500 mt-1">รถทุกคันพร้อมใช้งานหรือจอดสแตนด์บาย ณ สำนักงานการไฟฟ้าส่วนภูมิภาค</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-900/90 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                            <th class="py-2.5 px-3">ทะเบียน / รุ่นรถ</th>
                            <th class="py-2.5 px-3">ผู้ปฏิบัติงาน / รหัสพนักงาน</th>
                            <th class="py-2.5 px-3">งานที่ต้องปฏิบัติ (ภารกิจ)</th>
                            <th class="py-2.5 px-3">เวลาออก / ไมล์เริ่มต้น</th>
                            <th class="py-2.5 px-3 text-center">สถานะ</th>
                            <th class="py-2.5 px-3 text-right">ดำเนินการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activeMissions.map(m => `
                            <tr class="border-b border-slate-800/70 hover:bg-slate-800/40 text-xs transition">
                                <td class="py-3 px-3">
                                    <div class="font-bold text-white flex items-center gap-1.5">
                                        <i class="fa-solid fa-car text-blue-400"></i> ${m.plate}
                                    </div>
                                    <div class="text-[10px] text-slate-400">${m.model}</div>
                                </td>
                                <td class="py-3 px-3">
                                    <div class="text-slate-200 font-semibold">${m.operatorName}</div>
                                    <div class="text-[10px] text-amber-400 font-mono font-bold">รหัส: ${m.employeeId}</div>
                                </td>
                                <td class="py-3 px-3">
                                    <div class="text-amber-200 font-medium max-w-xs truncate" title="${m.taskDescription}">
                                        ${m.taskDescription}
                                    </div>
                                    <div class="text-[10px] text-slate-400">${m.departureDate}</div>
                                </td>
                                <td class="py-3 px-3">
                                    <div class="text-blue-300 font-mono font-bold">
                                        <i class="fa-regular fa-clock"></i> ${m.departureTime} น.
                                    </div>
                                    <div class="text-[10px] text-slate-300 font-mono">
                                        ไมล์เริ่ม: ${(m.startMileage || 0).toLocaleString()} กม.
                                    </div>
                                </td>
                                <td class="py-3 px-3 text-center">
                                    <span class="px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-500/50 text-[10px] font-bold inline-flex items-center gap-1 animate-pulse">
                                        <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span> กำลังปฏิบัติงาน
                                    </span>
                                </td>
                                <td class="py-3 px-3 text-right">
                                    <div class="flex items-center justify-end gap-1.5">
                                        <button onclick="app.openReturnMileageModal('${m.vehicleId}')" 
                                            class="btn-safety-orange px-2.5 py-1.5 rounded-lg text-[11px] font-bold shadow flex items-center gap-1">
                                            <i class="fa-solid fa-flag-checkered"></i> บันทึกขากลับ
                                        </button>
                                        <button onclick="app.focusReturnMileageInForm('${m.vehicleId}')" 
                                            title="เปิดฟอร์มตรวจสภาพเต็มรูปแบบ"
                                            class="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700">
                                            <i class="fa-solid fa-clipboard-check"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // 3. เปิด Modal บันทึกเลขไมล์ขากลับอย่างรวดเร็ว (Quick Return Mileage Modal)
    openReturnMileageModal(vehicleId) {
        const mission = db.getActiveMissionByVehicleId(vehicleId);
        if (!mission) {
            notifier.showToast('ไม่พบภารกิจ', 'ไม่พบข้อมูลการออกปฏิบัติงานของรถคันนี้', 'WARNING');
            return;
        }

        const modal = document.getElementById('pea-return-mileage-modal');
        if (!modal) return;

        const defaultEndMileage = (mission.startMileage || 0) + 10;

        modal.innerHTML = `
            <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div class="bg-slate-900 border-2 border-amber-500 rounded-2xl max-w-lg w-full shadow-2xl p-6 text-white space-y-5 animate-fade-in">
                    
                    <!-- Header -->
                    <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div class="flex items-center gap-2.5">
                            <div class="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
                                <i class="fa-solid fa-flag-checkered text-base"></i>
                            </div>
                            <div>
                                <h3 class="text-base font-black text-white">บันทึกเลขไมล์ขากลับ (Return Mileage)</h3>
                                <p class="text-[11px] text-slate-400">ปิดภารกิจและปลดสถานะรถกลับสู่ความพร้อมใช้งาน</p>
                            </div>
                        </div>
                        <button onclick="app.closeReturnMileageModal()" class="text-slate-400 hover:text-white transition">
                            <i class="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>

                    <!-- Mission Details Card -->
                    <div class="pea-glass p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5">
                        <div class="flex justify-between">
                            <span class="text-slate-400">ทะเบียน / รุ่น:</span>
                            <span class="font-bold text-white">${mission.plate} (${mission.model})</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-400">ผู้ปฏิบัติงาน:</span>
                            <span class="font-medium text-amber-300">${mission.operatorName} (รหัส: ${mission.employeeId})</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-400">ภารกิจ:</span>
                            <span class="font-medium text-white truncate max-w-[240px]">${mission.taskDescription}</span>
                        </div>
                        <div class="flex justify-between pt-1 border-t border-slate-800/80">
                            <span class="text-slate-400">เวลาออกปฏิบัติงาน:</span>
                            <span class="font-mono text-blue-300 font-bold">${mission.departureDate} เวลา ${mission.departureTime} น.</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-400">เลขไมล์เริ่มต้น:</span>
                            <span class="font-mono text-emerald-400 font-bold">${(mission.startMileage || 0).toLocaleString()} กม.</span>
                        </div>
                    </div>

                    <!-- Input Form -->
                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
                                <span class="flex items-center gap-1.5">
                                    <i class="fa-solid fa-stop text-red-400"></i> เลขไมล์กลับ (หลังสิ้นสุดปฏิบัติงาน):
                                </span>
                                <span class="text-[10px] text-slate-400">กิโลเมตร</span>
                            </label>
                            <input type="number" id="quick-end-mileage-input" 
                                value="${defaultEndMileage}"
                                min="${mission.startMileage || 0}"
                                oninput="app.calculateQuickReturnDelta(${mission.startMileage || 0})"
                                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-400 transition"
                                placeholder="ระบุเลขไมล์ขากลับ">
                        </div>

                        <!-- Live Trip Calculation Summary -->
                        <div class="grid grid-cols-2 gap-2 text-xs">
                            <div class="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                                <div class="text-[10px] text-slate-400">ระยะทางที่วิ่งในรอบนี้:</div>
                                <div id="quick-trip-delta" class="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                                    +${(defaultEndMileage - (mission.startMileage || 0)).toLocaleString()} กม.
                                </div>
                            </div>
                            <div class="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                                <div class="text-[10px] text-slate-400">สถานะการตรวจสอบ:</div>
                                <div id="quick-trip-status" class="text-[11px] font-bold text-emerald-400 mt-0.5">
                                    <i class="fa-solid fa-check"></i> ปกติ
                                </div>
                            </div>
                        </div>

                        <!-- Optional Fuel Level & Refill -->
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label class="block text-[11px] font-semibold text-slate-300 mb-1">ระดับน้ำมันคงเหลือ:</label>
                                <select id="quick-fuel-level" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-400">
                                    <option value="100">เต็มถัง (100%)</option>
                                    <option value="75">3/4 ถัง (75%)</option>
                                    <option value="50" selected>1/2 ถัง (50%)</option>
                                    <option value="25">1/4 ถัง (25%)</option>
                                    <option value="10">เตือนน้ำมันหมด (10%)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-[11px] font-semibold text-slate-300 mb-1">เติมน้ำมันเพิ่ม (ลิตร):</label>
                                <input type="number" id="quick-fuel-refill" value="0" min="0" 
                                    class="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-400">
                            </div>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex gap-2 pt-2 border-t border-slate-800">
                        <button type="button" onclick="app.closeReturnMileageModal()" 
                            class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl font-bold text-xs transition">
                            ยกเลิก
                        </button>
                        <button type="button" onclick="app.submitReturnMileageModal('${mission.vehicleId}')" 
                            class="btn-safety-orange flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow">
                            <i class="fa-solid fa-check"></i> ยืนยันบันทึกขากลับ
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    calculateQuickReturnDelta(startMileage) {
        const input = document.getElementById('quick-end-mileage-input');
        const deltaEl = document.getElementById('quick-trip-delta');
        const statusEl = document.getElementById('quick-trip-status');
        if (!input || !deltaEl || !statusEl) return;

        const endMileage = parseInt(input.value, 10) || 0;
        const delta = endMileage - startMileage;

        if (delta < 0) {
            deltaEl.innerText = `${delta.toLocaleString()} กม.`;
            deltaEl.className = 'text-sm font-bold font-mono text-red-400 mt-0.5';
            statusEl.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> ไมล์ลดลง (ผิดปกติ)';
            statusEl.className = 'text-[11px] font-bold text-red-400 mt-0.5';
        } else if (delta > 10000) {
            deltaEl.innerText = `+${delta.toLocaleString()} กม.`;
            deltaEl.className = 'text-sm font-bold font-mono text-red-400 mt-0.5 animate-pulse';
            statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> เกิน 10,000 กม. (แจ้งเตือนด่วน)';
            statusEl.className = 'text-[11px] font-bold text-red-400 mt-0.5';
        } else {
            deltaEl.innerText = `+${delta.toLocaleString()} กม.`;
            deltaEl.className = 'text-sm font-bold font-mono text-emerald-400 mt-0.5';
            statusEl.innerHTML = '<i class="fa-solid fa-check"></i> ปกติ';
            statusEl.className = 'text-[11px] font-bold text-emerald-400 mt-0.5';
        }
    }

    closeReturnMileageModal() {
        const modal = document.getElementById('pea-return-mileage-modal');
        if (modal) modal.innerHTML = '';
    }

    // 4. บันทึกผลขากลับจาก Modal ทางลัด
    submitReturnMileageModal(vehicleId) {
        const mission = db.getActiveMissionByVehicleId(vehicleId);
        if (!mission) {
            this.closeReturnMileageModal();
            return;
        }

        const endMileageInput = document.getElementById('quick-end-mileage-input');
        const fuelSelect = document.getElementById('quick-fuel-level');
        const refillInput = document.getElementById('quick-fuel-refill');

        const endMileage = endMileageInput ? parseInt(endMileageInput.value, 10) : 0;
        const fuelLevel = fuelSelect ? parseInt(fuelSelect.value, 10) : 50;
        const fuelRefill = refillInput ? parseFloat(refillInput.value) || 0 : 0;

        if (isNaN(endMileage) || endMileage < 0) {
            notifier.showToast('เลขไมล์ไม่ถูกต้อง', 'กรุณาระบุเลขไมล์ขากลับให้ถูกต้อง', 'WARNING');
            return;
        }

        const startMileage = mission.startMileage || 0;
        const mileageDelta = endMileage - startMileage;

        if (mileageDelta < 0) {
            if (!confirm(`คำเตือน: เลขไมล์ขากลับ (${endMileage.toLocaleString()}) น้อยกว่าเลขไมล์เริ่มต้น (${startMileage.toLocaleString()}) คุณต้องการยืนยันบันทึกหรือไม่?`)) {
                return;
            }
        }

        // อัปเดตข้อมูลรถในฐานข้อมูล
        const vehicle = db.getVehicleById(vehicleId);
        if (vehicle) {
            vehicle.mileage = endMileage;
            vehicle.fuelLevel = fuelLevel;
            vehicle.operationalStatus = 'AVAILABLE';
            db.saveVehicle(vehicle);
        }

        // แจ้งเตือนระยะทางผิดปกติหากเกิน 10,000 กม.
        if (mileageDelta > 10000) {
            notifier.broadcastAlert({
                targetRoles: ['CHIEF', 'MECHANIC'],
                title: '⚠️ แจ้งเตือนด่วน: ระยะทางวิ่งเกินกำหนด 10,000 กม.!',
                message: `ยานพาหนะทะเบียน ${mission.plate} (${mission.taskDescription}) บันทึกระยะทางวิ่งสูงถึง ${mileageDelta.toLocaleString()} กม. (ก่อน: ${startMileage.toLocaleString()} กม. / หลัง: ${endMileage.toLocaleString()} กม.) โปรดตรวจสอบ`,
                type: 'CRITICAL',
                icon: 'fa-gauge-simple-high'
            });
        }

        // Log Consolidation
        const summaryText = `[ภารกิจ: ${mission.taskDescription}] บันทึกสิ้นสุดภารกิจเดินทางกลับ • ระยะทาง: ${startMileage.toLocaleString()} ➔ ${endMileage.toLocaleString()} กม. (วิ่ง ${mileageDelta.toLocaleString()} กม.) • เชื้อเพลิงคงเหลือ: ร้อยละ ${fuelLevel}%${fuelRefill > 0 ? ' (เติม ' + fuelRefill + ' ลิตร)' : ''}`;
        db.addConsolidatedActivityLog({
            actionType: 'VEHICLE_RETURN',
            vehicleId: mission.vehicleId,
            plate: mission.plate,
            operator: `${mission.operatorName} (รหัส ${mission.employeeId})`,
            role: 'DRIVER',
            summary: summaryText,
            statusResult: 'READY'
        });

        // Google Sheets Integration Sync
        if (typeof googleSheet !== 'undefined') {
            googleSheet.logInspection({
                missionId: mission.id,
                vehicleId: mission.vehicleId,
                plate: mission.plate,
                model: mission.model,
                department: vehicle ? vehicle.department : 'กฟภ.',
                driver: mission.operatorName,
                employeeId: mission.employeeId,
                taskDescription: mission.taskDescription,
                startMileage: startMileage,
                endMileage: endMileage,
                mileageDelta: mileageDelta,
                mileage: endMileage,
                fuelLevel: fuelLevel,
                fuelRefill: fuelRefill,
                status: 'READY',
                defects: 'ตรวจรับขากลับปกติ (ทางลัดบันทึกเลขไมล์)',
                ticketId: '-',
                mileageAlert: mileageDelta > 10000 ? 'เกิน 10,000 กม. (เฝ้าระวัง)' : 'ปกติ'
            }).catch(e => console.warn('[GoogleSheet] Return mileage sync warning:', e));
        }

        // จบภารกิจ เคลียร์ออกจาก Active Missions
        db.completeVehicleMission(vehicleId);

        // Check and send email alerts
        this.checkMaintenanceAlerts(db.getVehicleById(vehicleId));

        this.closeReturnMileageModal();

        notifier.showToast('บันทึกขากลับเรียบร้อย', `รถทะเบียน ${mission.plate} ปลดล็อกกลับสู่สถานะพร้อมใช้งานแล้ว`, 'SUCCESS');

        // รีเฟรชหน้าจอทั้งหมด
        if (this.currentVehicle && this.currentVehicle.id === vehicleId) {
            this.currentVehicle = db.getVehicleById(vehicleId);
            this.updateVehicleHeaderCard();
        }
        this.renderActiveTripsTab();
        this.renderSupervisorDashboard();
        this.renderActivityLogs();
        this.updateActiveTripsNavBadge();
    }

    // 5. สลับไปยังหน้าฟอร์มตรวจเช็กหลัก และเติมข้อมูลรถคันนี้ให้อัตโนมัติ
    focusReturnMileageInForm(vehicleId) {
        const mission = db.getActiveMissionByVehicleId(vehicleId);
        this.setTab('inspect');
        this.selectVehicle(vehicleId);

        if (mission) {
            const empIdInput = document.getElementById('employee-id-input');
            const inspectorInput = document.getElementById('inspector-name-input');
            const taskInput = document.getElementById('task-description-input');
            const startMileageInput = document.getElementById('start-mileage-input');
            const endMileageInput = document.getElementById('end-mileage-input');

            if (empIdInput) empIdInput.value = mission.employeeId;
            if (inspectorInput) inspectorInput.value = mission.operatorName;
            if (taskInput) taskInput.value = mission.taskDescription;
            if (startMileageInput) startMileageInput.value = mission.startMileage;
            if (endMileageInput) {
                endMileageInput.value = (mission.startMileage || 0) + 10;
                endMileageInput.focus();
            }
            this.calculateTripMileage();
        }

        notifier.showToast('เลือกยานพาหนะแล้ว', 'กำลังเข้าสู่ฟอร์มตรวจสภาพและบันทึกเลขไมล์ขากลับ', 'INFO');
    }

    // 6. อัปเดตตัวเลขแจ้งเตือนบนแท็บเมนู '5. บันทึกขากลับ'
    updateActiveTripsNavBadge() {
        const badge = document.getElementById('nav-active-trips-badge');
        if (!badge) return;
        const missions = db.getActiveMissions();
        if (missions.length > 0) {
            badge.innerText = missions.length;
            badge.classList.remove('hidden');
        } else {
            badge.innerText = '0';
            badge.classList.add('hidden');
        }
    }

    // 7. Render หน้าจอแท็บ '5. บันทึกขากลับ (Active Trips List)'
    renderActiveTripsTab() {
        const container = document.getElementById('active-trips-table-container');
        const countNum = document.getElementById('trips-count-number');
        if (!container) return;

        const activeMissions = db.getActiveMissions();
        if (countNum) countNum.innerText = activeMissions.length;
        this.updateActiveTripsNavBadge();

        if (activeMissions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-slate-400">
                    <div class="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500 text-2xl shadow-inner">
                        <i class="fa-solid fa-parking"></i>
                    </div>
                    <h3 class="text-base font-bold text-white">ไม่มีรถยนต์ที่กำลังออกปฏิบัติงานในขณะนี้</h3>
                    <p class="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                        ยานพาหนะทุกคันจอดสแตนด์บาย ณ สำนักงานการไฟฟ้าส่วนภูมิภาค หรือได้ทำการปิดงานบันทึกขากลับเรียบร้อยแล้ว
                    </p>
                    <div class="mt-4">
                        <button onclick="app.setTab('inspect')" class="btn-safety-orange px-4 py-2 rounded-xl text-xs font-bold shadow inline-flex items-center gap-2">
                            <i class="fa-solid fa-truck-fast"></i> ไปยังหน้าตรวจสภาพเพื่อนำรถออกปฏิบัติงาน
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-slate-900/90 text-slate-400 text-[11px] font-semibold border-b border-slate-800">
                            <th class="py-3 px-3">หมายเลขทะเบียน / รุ่นรถ</th>
                            <th class="py-3 px-3">ผู้ปฏิบัติงาน / รหัสพนักงาน</th>
                            <th class="py-3 px-3">งานที่ต้องปฏิบัติ (ภารกิจ)</th>
                            <th class="py-3 px-3">เวลาออก / เลขไมล์ขาไป</th>
                            <th class="py-3 px-3 text-center">สถานะ</th>
                            <th class="py-3 px-3 text-right">ดำเนินการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activeMissions.map(m => `
                            <tr class="border-b border-slate-800/70 hover:bg-slate-800/40 text-xs transition">
                                <td class="py-3.5 px-3">
                                    <div class="font-bold text-white text-sm flex items-center gap-2">
                                        <div class="w-7 h-7 rounded-lg bg-blue-950/80 border border-blue-500/40 flex items-center justify-center text-blue-400 text-xs">
                                            <i class="fa-solid fa-car"></i>
                                        </div>
                                        <span>${m.plate}</span>
                                    </div>
                                    <div class="text-[10px] text-slate-400 pl-9">${m.model}</div>
                                </td>
                                <td class="py-3.5 px-3">
                                    <div class="text-slate-200 font-semibold">${m.operatorName}</div>
                                    <div class="text-[10px] text-amber-400 font-mono font-bold flex items-center gap-1">
                                        <i class="fa-solid fa-hashtag text-[9px]"></i> รหัส: ${m.employeeId}
                                    </div>
                                </td>
                                <td class="py-3.5 px-3">
                                    <div class="text-amber-200 font-medium max-w-sm" title="${m.taskDescription}">
                                        ${m.taskDescription}
                                    </div>
                                    <div class="text-[10px] text-slate-400 mt-0.5">วันที่ออก: ${m.departureDate}</div>
                                </td>
                                <td class="py-3.5 px-3">
                                    <div class="text-blue-300 font-mono font-bold flex items-center gap-1">
                                        <i class="fa-regular fa-clock text-xs"></i> ${m.departureTime} น.
                                    </div>
                                    <div class="text-[11px] text-emerald-400 font-mono font-bold mt-0.5">
                                        ไมล์ขาไป: ${(m.startMileage || 0).toLocaleString()} กม.
                                    </div>
                                </td>
                                <td class="py-3.5 px-3 text-center">
                                    <span class="px-2.5 py-1 rounded-full bg-blue-950 text-blue-300 border border-blue-500/50 text-[10px] font-bold inline-flex items-center gap-1.5 animate-pulse">
                                        <span class="w-2 h-2 rounded-full bg-blue-400"></span> กำลังปฏิบัติงาน
                                    </span>
                                </td>
                                <td class="py-3.5 px-3 text-right">
                                    <div class="flex items-center justify-end gap-2">
                                        <button onclick="app.openReturnMileageModal('${m.vehicleId}')" 
                                            class="btn-safety-orange px-3.5 py-2 rounded-xl text-xs font-black shadow-lg flex items-center gap-1.5">
                                            <i class="fa-solid fa-flag-checkered"></i> บันทึกขากลับ
                                        </button>
                                        <button onclick="app.focusReturnMileageInForm('${m.vehicleId}')" 
                                            title="เปิดฟอร์มตรวจสภาพเต็มรูปแบบ (Full Checklist)"
                                            class="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition">
                                            <i class="fa-solid fa-clipboard-check"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }


saveAlertEmails() {
        if (typeof db === 'undefined') return;
        const chiefInput = document.getElementById('alert-chief-input');
        const mechanicInput = document.getElementById('alert-mechanic-input');
        const chief = chiefInput ? chiefInput.value.trim() : '';
        const mechanic = mechanicInput ? mechanicInput.value.trim() : '';
        db.setChiefEmail(chief);
        db.setMechanicEmail(mechanic);
        const summary = `หัวหน้างาน: ${chief || '—'}`;
        notifier.showToast('บันทึกอีเมลสำเร็จ', `${summary} / ช่างเครื่องยนต์: ${mechanic || '—'}`, 'SUCCESS');
    }

    // ฟังก์ชันส่งอีเมลทดสอบ (เพื่อตรวจว่าปลอดภัยและเข้า Gmail กล่องข้อความหลัก)
    sendTestAlertEmail() {
        if (typeof googleSheet === 'undefined' || typeof db === 'undefined') return;
        const recipients = db.getAlertRecipients();
        if (recipients.length === 0) {
            notifier.showToast('ยังไม่ได้ตั้งอีเมลผู้รับ', 'กรุณากรอกอีเมลหัวหน้างานและช่างเครื่องยนต์ แล้วกด "บันทึกอีเมล" ก่อน', 'WARNING');
            return;
        }
        const now = new Date().toLocaleString('th-TH');
        const subject = '[PEA Fleet Alert] การแจ้งเตือนอัตโนมัติพร้อมใช้งาน (ทดสอบ)';
        const body = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <div style="background-color: #581c87; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h2 style="color: #fcd34d; margin: 0;">ระบบจัดการยานพาหนะ กฟภ. (PEA Fleet)</h2>
                </div>
                <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                    <p style="font-size:16px;">อีเมลทดสอบการแจ้งเตือน</p>
                    <p style="font-size:14px;">ระบบพร้อมส่งการแจ้งเตือน <strong>ระยะวิ่งเกิน 10,000 กม. (รอบ PM)</strong> และ <strong>ภาษีใกล้หมดอายุภายใน 7 วัน</strong> ไปยังช่างเครื่องยนต์และหัวหน้างานแล้ว</p>
                    <p style="font-size:12px; color:#6b7280;">เวลาทดสอบ: ${now}</p>
                    <p style="font-size:12px; color:#6b7280; margin-top:30px; border-top:1px solid #e5e7eb; padding-top:15px;">
                        อีเมลฉบับนี้ถูกส่งอัตโนมัติจากระบบ PEA Smart Vehicle Application
                    </p>
                </div>
            </div>
        `;
        googleSheet.sendEmailAlert(recipients, subject, body).then(res => {
            if (res && res.success) {
                console.log('[Email Alert] Test email sent to', recipients);
                notifier.showToast('ส่งอีเมลทดสอบสำเร็จ', `ส่งไปยัง: ${recipients.join(', ')}`, 'SUCCESS');
            } else {
                console.warn('[Email Alert] Test failed', res);
                notifier.showToast('ส่งอีเมลทดสอบล้มเหลว', 'ตรวจสอบการ Deploy Apps Script (ต้องมีสิทธิ์ MailApp)', 'WARNING');
            }
        }).catch(e => {
            console.warn('[Email Alert] Test error', e);
            notifier.showToast('เชื่อมต่ออีเมลขัดข้อง', 'ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือ URL', 'ERROR');
        });
    }

    // =========================================================================
    // Email Alerts: Preventive Maintenance & Tax Expiry
    // =========================================================================
    _buildVehicleAlerts(vehicle) {
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        let alertsHTML = "";
        let alertsCount = 0;

        // 1. เช็ก PM (ระยะวิ่งตั้งแต่ PM รอบก่อน >= 10,000 กม.)
        const lastPmMileage = vehicle.lastPmMileage || 0;
        const distanceSinceLastPM = vehicle.mileage - lastPmMileage;

        if (distanceSinceLastPM >= 10000) {
            // ผูก lock กับระยะไมล์ล่าสุด + วัน เพื่อให้เตือนซ้ำวันละครั้งถ้ายังไม่เข้าศูนย์เปลี่ยน lastPmMileage
            const alertKey = `pea_alert_pm_${vehicle.id}_${vehicle.mileage}_${today}`;
            const lastAlert = localStorage.getItem(alertKey);
            if (lastAlert !== "sent") {
                alertsHTML += `
                    <div style="margin-bottom:15px; padding:15px; background-color:#fff5f5; border-left:5px solid #dc2626; border-radius:4px;">
                        <h3 style="margin:0 0 10px 0; color:#dc2626;">🚨 [ถึงกำหนด PM] ทะเบียน: ${vehicle.plate}</h3>
                        <p style="margin:0; font-size:14px;"><strong>เลขไมล์ปัจจุบัน:</strong> ${vehicle.mileage.toLocaleString()} กม.</p>
                        <p style="margin:0; font-size:14px;"><strong>ระยะวิ่งตั้งแต่ PM รอบก่อน:</strong> ${distanceSinceLastPM.toLocaleString()} กม.</p>
                        <p style="margin:5px 0 0 0; font-size:14px; color:#b91c1c;"><em>กรุณานำรถเข้าศูนย์บริการเพื่อบำรุงรักษาตามระยะ</em></p>
                    </div>
                `;
                alertsCount++;
                localStorage.setItem(alertKey, "sent");
            }
        }

        // 2. เช็กภาษี (เหลือ <= 7 วัน รวมขาดแล้ว)
        const taxThresholdDays = 7;
        if (vehicle.taxExpiry) {
            const taxDate = new Date(vehicle.taxExpiry);
            const now = new Date();
            // ปรับให้อ่านแค่วันที่ ตัดเวลาทิ้ง
            now.setHours(0,0,0,0);
            taxDate.setHours(0,0,0,0);
            const diffTime = taxDate - now;
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= taxThresholdDays) {
                // ผูก lock แบบรายวัน
                const alertKey = `pea_alert_tax_${vehicle.id}_${today}`;
                const lastAlert = localStorage.getItem(alertKey);
                if (lastAlert !== "sent") {
                    const statusText = diffDays < 0 ? `🚨 [ภาษีขาดต่อ!] เลยกำหนด: ${Math.abs(diffDays)} วัน` : (diffDays === 0 ? `🚨 [ภาษีหมดอายุวันนี้!]` : `⚠️ [ภาษีใกล้หมดอายุ] เหลืออีก: ${diffDays} วัน`);
                    const color = diffDays <= 0 ? '#dc2626' : '#d97706';
                    const bgColor = diffDays <= 0 ? '#fff5f5' : '#fffbeb';
                    alertsHTML += `
                        <div style="margin-bottom:15px; padding:15px; background-color:${bgColor}; border-left:5px solid ${color}; border-radius:4px;">
                            <h3 style="margin:0 0 10px 0; color:${color};">${statusText}</h3>
                            <p style="margin:0; font-size:14px;"><strong>ทะเบียน:</strong> ${vehicle.plate}</p>
                            <p style="margin:5px 0 0 0; font-size:14px;"><strong>วันหมดอายุ:</strong> ${vehicle.taxExpiry}</p>
                        </div>
                    `;
                    alertsCount++;
                    localStorage.setItem(alertKey, "sent");
                }
            }
        }

        return { html: alertsHTML, count: alertsCount };
    }

    _composeAlertEmail(vehicleLabel, alertsHTML) {
        return `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <div style="background-color: #581c87; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h2 style="color: #fcd34d; margin: 0;">ระบบจัดการยานพาหนะ กฟภ. (PEA Fleet)</h2>
                </div>
                <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                    <p style="font-size:16px;">เรียน ช่างเครื่องยนต์และหัวหน้างาน,</p>
                    <p style="font-size:14px; margin-bottom: 20px;">มีรายการแจ้งเตือนสำหรับรถยนต์ <strong>${vehicleLabel}</strong> ดังนี้:</p>
                    ${alertsHTML}
                    <p style="font-size:12px; color:#6b7280; margin-top:30px; border-top:1px solid #e5e7eb; padding-top:15px;">
                        อีเมลฉบับนี้ถูกส่งอัตโนมัติจากระบบ PEA Smart Vehicle Application
                    </p>
                </div>
            </div>
        `;
    }

    _sendAlertEmail(subject, body) {
        if (typeof googleSheet === 'undefined' || typeof db === 'undefined') return;
        const recipients = db.getAlertRecipients();
        if (recipients.length === 0) return; // หากยังไม่ตั้งอีเมล จะไม่ส่ง

        googleSheet.sendEmailAlert(recipients, subject, body).then(res => {
            if (res && res.success) {
                console.log(`[Email Alert] Sent to ${recipients.join(', ')}`);
                notifier.showToast('แจ้งเตือนอัตโนมัติสำเร็จ', `ส่งอีเมลไปยังช่างเครื่องยนต์และหัวหน้างานแล้ว (${recipients.length} คน)`, 'SUCCESS');
            } else {
                console.warn('[Email Alert] Failed to send', res);
                notifier.showToast('การส่งอีเมลล้มเหลว', 'อาจเกิดจากสิทธิ์การเข้าถึง Google Apps Script โปรดตรวจสอบการ Deploy', 'WARNING');
            }
        }).catch(e => {
            console.warn('[Email Alert] Error', e);
            notifier.showToast('เชื่อมต่ออีเมลขัดข้อง', 'โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ตหรือ URL', 'ERROR');
        });
    }

    // เช็กครั้งเดียวสำหรับรถคันที่เพิ่ง "บันทึกขากลับ"
    checkMaintenanceAlerts(vehicle) {
        if (!vehicle || typeof db === 'undefined' || typeof googleSheet === 'undefined') return;
        const res = this._buildVehicleAlerts(vehicle);
        if (res.count > 0) {
            const subject = `[PEA Fleet Alert] แจ้งเตือนรถยนต์ทะเบียน ${vehicle.plate}`;
            this._sendAlertEmail(subject, this._composeAlertEmail(`${vehicle.plate} (${vehicle.model})`, res.html));
        }
    }

    // สแกนทั้งกองยาน (เรียกตอนเปิดโปรแกรม) ส่งเป็นสรุปเดียวถ้ามีคันใดถึงกำหนด
    checkFleetAlerts() {
        if (typeof db === 'undefined' || typeof googleSheet === 'undefined') return;
        const vehicles = db.getVehicles();
        let combinedHTML = "";
        let totalCount = 0;
        const flaggedCars = [];

        vehicles.forEach(v => {
            const res = this._buildVehicleAlerts(v);
            if (res.count > 0) {
                combinedHTML += res.html;
                totalCount += res.count;
                flaggedCars.push(`${v.plate}${v.model ? ' (' + v.model + ')' : ''}`);
            }
        });

        if (totalCount > 0) {
            const subject = `[PEA Fleet Alert] พบ ${flaggedCars.length} คัน ถึงกำหนด PM/ภาษี ภายใน 7 วัน`;
            this._sendAlertEmail(subject, this._composeAlertEmail(flaggedCars.join(', '), combinedHTML));
        }
    }
}

// Global Application Instance
window.app = new PEASmartVehicleApp();


