/**
 * PEA Smart Vehicle Inspection & Maintenance Report Generator
 * ระบบออกใบรับรองตรวจสภาพและบันทึกงานซ่อมบำรุงทางการ การไฟฟ้าส่วนภูมิภาค (PEA)
 * รองรับการเปรียบเทียบรูปถ่าย ก่อน-หลัง ซ่อม อย่างสมมาตร และพิมพ์ A4 มาตรฐาน
 */

class PEAReportGenerator {
    constructor() {}

    generateInspectionReport(inspectionData) {
        const modalContainer = document.getElementById('pea-report-modal');
        if (!modalContainer) return;

        const vehicle = db.getVehicleById(inspectionData.vehicleId) || {
            plate: inspectionData.plate || 'ไม่ระบุ',
            model: inspectionData.model || 'ไม่ระบุ',
            department: 'การไฟฟ้าส่วนภูมิภาค'
        };

        const isPass = inspectionData.status === 'READY';
        const isCritical = inspectionData.status === 'CRITICAL';
        const statusBadge = isPass 
            ? '<span class="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-400 font-bold rounded text-xs">ผ่านเกณฑ์มาตรฐานความปลอดภัย 100% (READY)</span>'
            : (isCritical 
                ? '<span class="px-3 py-1 bg-red-100 text-red-800 border border-red-500 font-bold rounded text-xs">งดใช้งานเด็ดขาด / รอการซ่อมบำรุง (CRITICAL)</span>'
                : '<span class="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-500 font-bold rounded text-xs">เฝ้าระวัง / นัดหมายซ่อมบำรุง (WARNING)</span>');

        // Render defect table with before/after photos
        let defectPhotosHtml = '';
        if (inspectionData.defects && inspectionData.defects.length > 0) {
            defectPhotosHtml = `
                <div class="mt-4">
                    <h4 class="text-sm font-bold text-purple-950 border-b border-purple-200 pb-1 mb-3">
                        <i class="fa-solid fa-camera mr-1.5"></i> ตารางเปรียบเทียบหลักฐานภาพถ่ายความเสียหายและการแก้ไข (Before / After Evidence)
                    </h4>
                    <div class="space-y-4">
                        ${inspectionData.defects.map((d, idx) => `
                            <div class="border border-slate-300 rounded-lg p-3 bg-slate-50">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-xs font-bold text-slate-800">
                                        จุดที่ ${idx + 1}: ${d.name || d.title}
                                    </span>
                                    <span class="text-[11px] px-2 py-0.5 rounded font-bold ${d.critical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}">
                                        ${d.critical ? 'อันตรายวิกฤต (Safety Critical)' : 'ข้อบกพร่องทั่วไป'}
                                    </span>
                                </div>
                                <p class="text-xs text-slate-600 mb-3 italic">รายละเอียด: ${d.description || 'ไม่ระบุข้อความเพิ่มเติม'}</p>
                                
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div class="border border-red-200 rounded p-2 bg-red-50/50 flex flex-col items-center text-center">
                                        <div class="text-[11px] font-bold text-red-700 mb-1">
                                            <i class="fa-solid fa-circle-exclamation mr-1"></i> ภาพก่อนการซ่อม (Before - จุดที่ตรวจพบ)
                                        </div>
                                        <div class="w-full h-40 bg-slate-200 rounded overflow-hidden flex items-center justify-center border border-slate-300">
                                            ${d.photoBefore || d.imageUrl 
                                                ? `<img src="${d.photoBefore || d.imageUrl}" class="w-full h-full object-contain" alt="ภาพจุดชำรุด">`
                                                : `<span class="text-xs text-slate-400">ไม่มีรูปภาพแนบ</span>`
                                            }
                                        </div>
                                    </div>
                                    <div class="border border-emerald-200 rounded p-2 bg-emerald-50/50 flex flex-col items-center text-center">
                                        <div class="text-[11px] font-bold text-emerald-700 mb-1">
                                            <i class="fa-solid fa-circle-check mr-1"></i> ภาพหลังการซ่อมแซม (After - หลักฐานงานช่าง)
                                        </div>
                                        <div class="w-full h-40 bg-slate-200 rounded overflow-hidden flex items-center justify-center border border-slate-300">
                                            ${d.photoAfter || d.resolvedImageUrl 
                                                ? `<img src="${d.photoAfter || d.resolvedImageUrl}" class="w-full h-full object-contain" alt="ภาพหลังซ่อม">`
                                                : `<div class="text-center p-2">
                                                    <i class="fa-solid fa-clock-rotate-left text-amber-500 text-lg mb-1"></i>
                                                    <div class="text-[11px] font-medium text-amber-700">อยู่ระหว่างดำเนินการ / รอการปิดงาน</div>
                                                   </div>`
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } else {
            defectPhotosHtml = `
                <div class="mt-4 p-4 border border-emerald-200 rounded-lg bg-emerald-50 text-center">
                    <i class="fa-solid fa-circle-check text-emerald-600 text-2xl mb-1"></i>
                    <div class="text-xs font-bold text-emerald-800">ไม่พบจุดบกพร่องหรือชำรุดเสียหาย</div>
                    <div class="text-[11px] text-emerald-600">ยานพาหนะผ่านเกณฑ์การประเมิน 4 หมวดหมู่ครบถ้วน พร้อมออกปฏิบัติงานได้อย่างปลอดภัย</div>
                </div>
            `;
        }

        modalContainer.innerHTML = `
            <div class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onclick="if(event.target === this) this.parentElement.innerHTML = ''">
                <div class="bg-white text-slate-900 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden my-6 border border-purple-300">
                    
                    <!-- Action Toolbar (Hidden in Print) -->
                    <div class="bg-purple-950 text-white px-6 py-3 flex justify-between items-center print:hidden border-b border-purple-800">
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                            <span class="text-xs font-bold uppercase tracking-wider text-amber-400">แบบฟอร์มรายงานตรวจสภาพและบำรุงรักษายานพาหนะ กฟภ.</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="window.print()" class="btn-safety-orange px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow">
                                <i class="fa-solid fa-print"></i> พิมพ์รายงาน / ดาวน์โหลด PDF
                            </button>
                            <button onclick="document.getElementById('pea-report-modal').innerHTML = ''" class="text-slate-300 hover:text-white px-2 py-1 text-sm">
                                <i class="fa-solid fa-xmark text-base"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Printable A4 Document Content -->
                    <div class="p-6 sm:p-8 document-content text-slate-900 space-y-4">
                        
                        <!-- Official Document Header -->
                        <div class="flex justify-between items-start border-b-2 border-purple-900 pb-4">
                            <div class="flex items-center gap-3">
                                <div class="w-14 h-14 rounded-xl bg-purple-900 text-amber-400 flex flex-col items-center justify-center font-black shadow-md border-2 border-amber-400">
                                    <span class="text-xs leading-none">PEA</span>
                                    <i class="fa-solid fa-bolt text-sm mt-0.5"></i>
                                </div>
                                <div>
                                    <h2 class="text-base font-black text-purple-950 uppercase tracking-tight">การไฟฟ้าส่วนภูมิภาค (PROVINCIAL ELECTRICITY AUTHORITY)</h2>
                                    <h3 class="text-xs font-bold text-slate-700">ระบบตรวจสภาพและบริหารยานพาหนะอัจฉริยะ (PEA Smart Vehicle & Safety Fleet)</h3>
                                    <p class="text-[11px] text-slate-500 font-mono">เอกสารรับรองมาตรฐานความปลอดภัยยานยนต์ กฟภ. ฉบับทางการ (ISO/PEA-SAFE)</p>
                                </div>
                            </div>
                            <div class="text-right text-xs">
                                <div class="font-mono font-bold text-slate-800">เลขที่เอกสาร: ${inspectionData.reportNo || ('PEA-DOC-' + Math.floor(100000 + Math.random() * 900000))}</div>
                                <div class="text-slate-500">วันที่: ${inspectionData.date || new Date().toLocaleDateString('th-TH')}</div>
                                <div class="text-slate-500">เวลา: ${inspectionData.time || new Date().toLocaleTimeString('th-TH')}</div>
                            </div>
                        </div>

                        <!-- Vehicle & Operational Metadata Grid (จัดกลุ่ม 4 ส่วนตามมาตรฐาน กฟภ.) -->
                        <div class="space-y-2 text-xs">
                            <div class="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                    <span class="text-slate-500 block text-[10px]">ส่วนที่ 1: ทะเบียนรถยนต์</span>
                                    <span class="font-bold text-purple-950">${vehicle.plate}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block text-[10px]">ยี่ห้อ / รุ่น:</span>
                                    <span class="font-bold text-slate-800">${vehicle.model}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block text-[10px]">ส่วนที่ 2: รหัสพนักงาน</span>
                                    <span class="font-bold text-slate-800 font-mono">${inspectionData.employeeId || '512446'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block text-[10px]">ผู้ปฏิบัติงาน:</span>
                                    <span class="font-bold text-slate-800">${inspectionData.inspector || vehicle.driver}</span>
                                </div>
                                <div class="sm:col-span-2">
                                    <span class="text-slate-500 block text-[10px]">งานที่ต้องปฏิบัติ (ภารกิจ):</span>
                                    <span class="font-bold text-purple-950">${inspectionData.taskDescription || 'ปฏิบัติงานประจำวัน'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block text-[10px]">สังกัดแผนก:</span>
                                    <span class="font-bold text-slate-800 truncate block">${vehicle.department}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block text-[10px]">ผลการประเมินความปลอดภัย:</span>
                                    <div>${statusBadge}</div>
                                </div>
                            </div>

                            <div class="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                    <span class="text-slate-500 block text-[10px]">ส่วนที่ 3: ไมล์ไป (ก่อนงาน)</span>
                                    <span class="font-bold text-slate-800 font-mono">${(inspectionData.startMileage || vehicle.mileage || 0).toLocaleString()} กม.</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block text-[10px]">ไมล์กลับ (หลังงาน)</span>
                                    <span class="font-bold text-slate-800 font-mono">${(inspectionData.endMileage || vehicle.mileage || 0).toLocaleString()} กม.</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block text-[10px]">ผลต่างระยะทาง (วิ่งจริง)</span>
                                    <span class="font-bold font-mono ${inspectionData.mileageDelta > 10000 ? 'text-red-700 font-black' : 'text-emerald-700'}">
                                        ${(inspectionData.mileageDelta !== undefined ? inspectionData.mileageDelta : 0).toLocaleString()} กม.
                                        ${inspectionData.mileageDelta > 10000 ? '<span class="px-1 py-0.2 bg-red-100 text-red-800 rounded text-[9px] ml-1">เกิน 10k!</span>' : ''}
                                    </span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block text-[10px]">ส่วนที่ 4: น้ำมันที่เติม (ลิตร)</span>
                                    <span class="font-bold text-slate-800">${inspectionData.fuelRefill && inspectionData.fuelRefill > 0 ? inspectionData.fuelRefill + ' ลิตร' : 'ไม่มีการเติม (0 ลิตร)'}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Defect Evidence Photos Section -->
                        ${defectPhotosHtml}

                        <!-- Signature Section -->
                        <div class="mt-6 pt-6 border-t border-slate-300 grid grid-cols-3 gap-4 text-center text-xs">
                            <div class="flex flex-col items-center">
                                <div class="h-10 flex items-end font-script text-purple-900 font-bold">${inspectionData.inspector || vehicle.driver}</div>
                                <div class="w-full border-b border-dashed border-slate-400 my-1"></div>
                                <span class="font-bold text-slate-700">พนักงานขับรถ / ผู้ตรวจ</span>
                                <span class="text-[10px] text-slate-500">(ผู้ส่งรายงานตรวจสภาพ)</span>
                            </div>
                            <div class="flex flex-col items-center">
                                <div class="h-10 flex items-end font-script text-purple-900 font-bold">${inspectionData.mechanicName || 'นายช่างเครื่องยนต์ กฟภ.'}</div>
                                <div class="w-full border-b border-dashed border-slate-400 my-1"></div>
                                <span class="font-bold text-slate-700">ช่างเครื่องยนต์ / ช่างซ่อม</span>
                                <span class="text-[10px] text-slate-500">(ผู้ดำเนินการแก้ไข/รับรองงาน)</span>
                            </div>
                            <div class="flex flex-col items-center">
                                <div class="h-10 flex items-end font-script text-purple-900 font-bold">${inspectionData.approverName || 'วิศวกร/หัวหน้าแผนกยานพาหนะ'}</div>
                                <div class="w-full border-b border-dashed border-slate-400 my-1"></div>
                                <span class="font-bold text-slate-700">หัวหน้าแผนกยานพาหนะ</span>
                                <span class="text-[10px] text-slate-500">(ผู้อนุมัติอนุญาตให้ใช้งานรถ)</span>
                            </div>
                        </div>

                        <!-- Footer Legal Notice -->
                        <div class="text-[10px] text-slate-400 text-center border-t border-slate-200 pt-2 font-mono">
                            ระบบบันทึกความปลอดภัยยานพาหนะอัตโนมัติ PEA Smart Vehicle • Build v0.7.28 • กองยานพาหนะ การไฟฟ้าส่วนภูมิภาค
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

const reportGen = new PEAReportGenerator();
