/**
 * PEA Smart Vehicle Inspection & Maintenance Report Generator
 * เธฃเธฐเธเธเธญเธญเธเนเธเธฃเธฑเธเธฃเธญเธเธ•เธฃเธงเธเธชเธ เธฒเธเนเธฅเธฐเธเธฑเธเธ—เธถเธเธเธฒเธเธเนเธญเธกเธเธณเธฃเธธเธเธ—เธฒเธเธเธฒเธฃ เธเธฒเธฃเนเธเธเนเธฒเธชเนเธงเธเธ เธนเธกเธดเธ เธฒเธ (PEA)
 * เธฃเธญเธเธฃเธฑเธเธเธฒเธฃเน€เธเธฃเธตเธขเธเน€เธ—เธตเธขเธเธฃเธนเธเธ–เนเธฒเธข เธเนเธญเธ-เธซเธฅเธฑเธ เธเนเธญเธก เธญเธขเนเธฒเธเธชเธกเธกเธฒเธ•เธฃ เนเธฅเธฐเธเธดเธกเธเน A4 เธกเธฒเธ•เธฃเธเธฒเธ
 */

class PEAReportGenerator {
    constructor() {}

    generateInspectionReport(inspectionData) {
        const modalContainer = document.getElementById('pea-report-modal');
        if (!modalContainer) return;

        const vehicle = db.getVehicleById(inspectionData.vehicleId) || {
            plate: inspectionData.plate || 'เนเธกเนเธฃเธฐเธเธธ',
            model: inspectionData.model || 'เนเธกเนเธฃเธฐเธเธธ',
            department: 'เธเธฒเธฃเนเธเธเนเธฒเธชเนเธงเธเธ เธนเธกเธดเธ เธฒเธ'
        };

        const isPass = inspectionData.status === 'READY';
        const isCritical = inspectionData.status === 'CRITICAL';
        const statusBadge = isPass 
            ? '<span class="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-400 font-bold rounded text-xs">เธเนเธฒเธเน€เธเธ“เธ‘เนเธกเธฒเธ•เธฃเธเธฒเธเธเธงเธฒเธกเธเธฅเธญเธ”เธ เธฑเธข 100% (READY)</span>'
            : (isCritical 
                ? '<span class="px-3 py-1 bg-red-100 text-red-800 border border-red-500 font-bold rounded text-xs">เธเธ”เนเธเนเธเธฒเธเน€เธ”เนเธ”เธเธฒเธ” / เธฃเธญเธเธฒเธฃเธเนเธญเธกเธเธณเธฃเธธเธ (CRITICAL)</span>'
                : '<span class="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-500 font-bold rounded text-xs">เน€เธเนเธฒเธฃเธฐเธงเธฑเธ / เธเธฑเธ”เธซเธกเธฒเธขเธเนเธญเธกเธเธณเธฃเธธเธ (WARNING)</span>');

        // Render defect table with before/after photos
        let defectPhotosHtml = '';
        if (inspectionData.defects && inspectionData.defects.length > 0) {
            defectPhotosHtml = `
                <div class="mt-4">
                    <h4 class="text-sm font-bold text-purple-950 border-b border-purple-200 pb-1 mb-3">
                        <i class="fa-solid fa-camera mr-1.5"></i> เธ•เธฒเธฃเธฒเธเน€เธเธฃเธตเธขเธเน€เธ—เธตเธขเธเธซเธฅเธฑเธเธเธฒเธเธ เธฒเธเธ–เนเธฒเธขเธเธงเธฒเธกเน€เธชเธตเธขเธซเธฒเธขเนเธฅเธฐเธเธฒเธฃเนเธเนเนเธ (Before / After Evidence)
                    </h4>
                    <div class="space-y-4">
                        ${inspectionData.defects.map((d, idx) => `
                            <div class="border border-slate-300 rounded-lg p-3 bg-slate-50">
                                <div class="flex justify-between items-center mb-2">
                                    <span class="text-xs font-bold text-slate-800">
                                        เธเธธเธ”เธ—เธตเน ${idx + 1}: ${d.name || d.title}
                                    </span>
                                    <span class="text-[11px] px-2 py-0.5 rounded font-bold ${d.critical ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}">
                                        ${d.critical ? 'เธญเธฑเธเธ•เธฃเธฒเธขเธงเธดเธเธคเธ• (Safety Critical)' : 'เธเนเธญเธเธเธเธฃเนเธญเธเธ—เธฑเนเธงเนเธ'}
                                    </span>
                                </div>
                                <p class="text-xs text-slate-600 mb-3 italic">เธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”: ${d.description || 'เนเธกเนเธฃเธฐเธเธธเธเนเธญเธเธงเธฒเธกเน€เธเธดเนเธกเน€เธ•เธดเธก'}</p>
                                
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div class="border border-red-200 rounded p-2 bg-red-50/50 flex flex-col items-center text-center">
                                        <div class="text-[11px] font-bold text-red-700 mb-1">
                                            <i class="fa-solid fa-circle-exclamation mr-1"></i> เธ เธฒเธเธเนเธญเธเธเธฒเธฃเธเนเธญเธก (Before - เธเธธเธ”เธ—เธตเนเธ•เธฃเธงเธเธเธ)
                                        </div>
                                        <div class="w-full h-40 bg-slate-200 rounded overflow-hidden flex items-center justify-center border border-slate-300">
                                            ${d.photoBefore || d.imageUrl 
                                                ? `<img src="${d.photoBefore || d.imageUrl}" class="w-full h-full object-contain" alt="เธ เธฒเธเธเธธเธ”เธเธณเธฃเธธเธ”">`
                                                : `<span class="text-xs text-slate-400">เนเธกเนเธกเธตเธฃเธนเธเธ เธฒเธเนเธเธ</span>`
                                            }
                                        </div>
                                    </div>
                                    <div class="border border-emerald-200 rounded p-2 bg-emerald-50/50 flex flex-col items-center text-center">
                                        <div class="text-[11px] font-bold text-emerald-700 mb-1">
                                            <i class="fa-solid fa-circle-check mr-1"></i> เธ เธฒเธเธซเธฅเธฑเธเธเธฒเธฃเธเนเธญเธกเนเธเธก (After - เธซเธฅเธฑเธเธเธฒเธเธเธฒเธเธเนเธฒเธ)
                                        </div>
                                        <div class="w-full h-40 bg-slate-200 rounded overflow-hidden flex items-center justify-center border border-slate-300">
                                            ${d.photoAfter || d.resolvedImageUrl 
                                                ? `<img src="${d.photoAfter || d.resolvedImageUrl}" class="w-full h-full object-contain" alt="เธ เธฒเธเธซเธฅเธฑเธเธเนเธญเธก">`
                                                : `<div class="text-center p-2">
                                                    <i class="fa-solid fa-clock-rotate-left text-amber-500 text-lg mb-1"></i>
                                                    <div class="text-[11px] font-medium text-amber-700">เธญเธขเธนเนเธฃเธฐเธซเธงเนเธฒเธเธ”เธณเน€เธเธดเธเธเธฒเธฃ / เธฃเธญเธเธฒเธฃเธเธดเธ”เธเธฒเธ</div>
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
                    <div class="text-xs font-bold text-emerald-800">เนเธกเนเธเธเธเธธเธ”เธเธเธเธฃเนเธญเธเธซเธฃเธทเธญเธเธณเธฃเธธเธ”เน€เธชเธตเธขเธซเธฒเธข</div>
                    <div class="text-[11px] text-emerald-600">เธขเธฒเธเธเธฒเธซเธเธฐเธเนเธฒเธเน€เธเธ“เธ‘เนเธเธฒเธฃเธเธฃเธฐเน€เธกเธดเธ 4 เธซเธกเธงเธ”เธซเธกเธนเนเธเธฃเธเธ–เนเธงเธ เธเธฃเนเธญเธกเธญเธญเธเธเธเธดเธเธฑเธ•เธดเธเธฒเธเนเธ”เนเธญเธขเนเธฒเธเธเธฅเธญเธ”เธ เธฑเธข</div>
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
                            <span class="text-xs font-bold uppercase tracking-wider text-amber-400">เนเธเธเธเธญเธฃเนเธกเธฃเธฒเธขเธเธฒเธเธ•เธฃเธงเธเธชเธ เธฒเธเนเธฅเธฐเธเธณเธฃเธธเธเธฃเธฑเธเธฉเธฒเธขเธฒเธเธเธฒเธซเธเธฐ เธเธเธ .</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="window.print()" class="btn-safety-orange px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow">
                                <i class="fa-solid fa-print"></i> เธเธดเธกเธเนเธฃเธฒเธขเธเธฒเธ / เธ”เธฒเธงเธเนเนเธซเธฅเธ” PDF
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
                                    <h2 class="text-base font-black text-purple-950 uppercase tracking-tight">เธเธฒเธฃเนเธเธเนเธฒเธชเนเธงเธเธ เธนเธกเธดเธ เธฒเธ (PROVINCIAL ELECTRICITY AUTHORITY)</h2>
                                    <h3 class="text-xs font-bold text-slate-700">เธฃเธฐเธเธเธ•เธฃเธงเธเธชเธ เธฒเธเนเธฅเธฐเธเธฃเธดเธซเธฒเธฃเธขเธฒเธเธเธฒเธซเธเธฐเธญเธฑเธเธเธฃเธดเธขเธฐ (PEA Smart Vehicle & Safety Fleet)</h3>
                                    <p class="text-[11px] text-slate-500 font-mono">เน€เธญเธเธชเธฒเธฃเธฃเธฑเธเธฃเธญเธเธกเธฒเธ•เธฃเธเธฒเธเธเธงเธฒเธกเธเธฅเธญเธ”เธ เธฑเธขเธขเธฒเธเธขเธเธ•เน เธเธเธ . เธเธเธฑเธเธ—เธฒเธเธเธฒเธฃ (ISO/PEA-SAFE)</p>
                                </div>
                            </div>
                            <div class="text-right text-xs">
                                <div class="font-mono font-bold text-slate-800">เน€เธฅเธเธ—เธตเนเน€เธญเธเธชเธฒเธฃ: ${inspectionData.reportNo || ('PEA-DOC-' + Math.floor(100000 + Math.random() * 900000))}</div>
                                <div class="text-slate-500">เธงเธฑเธเธ—เธตเน: ${inspectionData.date || new Date().toLocaleDateString('th-TH')}</div>
                                <div class="text-slate-500">เน€เธงเธฅเธฒ: ${inspectionData.time || new Date().toLocaleTimeString('th-TH')}</div>
                            </div>
                        </div>

                        <!-- Vehicle & Operational Metadata Grid (เธเธฑเธ”เธเธฅเธธเนเธก 4 เธชเนเธงเธเธ•เธฒเธกเธกเธฒเธ•เธฃเธเธฒเธ เธเธเธ .) -->
                        <div class="space-y-2 text-xs">
                            <div class="bg-purple-50/70 border border-purple-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                    <span class="text-slate-500 block text-[10px]">เธชเนเธงเธเธ—เธตเน 1: เธ—เธฐเน€เธเธตเธขเธเธฃเธ–เธขเธเธ•เน</span>
                                    <span class="font-bold text-purple-950">${vehicle.plate}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block text-[10px]">เธขเธตเนเธซเนเธญ / เธฃเธธเนเธ:</span>
                                    <span class="font-bold text-slate-800">${vehicle.model}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block text-[10px]">เธชเนเธงเธเธ—เธตเน 2: เธฃเธซเธฑเธชเธเธเธฑเธเธเธฒเธ</span>
                                    <span class="font-bold text-slate-800 font-mono">${inspectionData.employeeId || '512446'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block text-[10px]">เธเธนเนเธเธเธดเธเธฑเธ•เธดเธเธฒเธ:</span>
                                    <span class="font-bold text-slate-800">${inspectionData.inspector || vehicle.driver}</span>
                                </div>
                                <div class="sm:col-span-2">
                                    <span class="text-slate-500 block text-[10px]">เธเธฒเธเธ—เธตเนเธ•เนเธญเธเธเธเธดเธเธฑเธ•เธด (เธ เธฒเธฃเธเธดเธ):</span>
                                    <span class="font-bold text-purple-950">${inspectionData.taskDescription || 'เธเธเธดเธเธฑเธ•เธดเธเธฒเธเธเธฃเธฐเธเธณเธงเธฑเธ'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block text-[10px]">เธชเธฑเธเธเธฑเธ”เนเธเธเธ:</span>
                                    <span class="font-bold text-slate-800 truncate block">${vehicle.department}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block text-[10px]">เธเธฅเธเธฒเธฃเธเธฃเธฐเน€เธกเธดเธเธเธงเธฒเธกเธเธฅเธญเธ”เธ เธฑเธข:</span>
                                    <div>${statusBadge}</div>
                                </div>
                            </div>

                            <div class="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div>
                                    <span class="text-slate-500 block text-[10px]">เธชเนเธงเธเธ—เธตเน 3: เนเธกเธฅเนเนเธ (เธเนเธญเธเธเธฒเธ)</span>
                                    <span class="font-bold text-slate-800 font-mono">${(inspectionData.startMileage || vehicle.mileage || 0).toLocaleString()} เธเธก.</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block text-[10px]">เนเธกเธฅเนเธเธฅเธฑเธ (เธซเธฅเธฑเธเธเธฒเธ)</span>
                                    <span class="font-bold text-slate-800 font-mono">${(inspectionData.endMileage || vehicle.mileage || 0).toLocaleString()} เธเธก.</span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block text-[10px]">เธเธฅเธ•เนเธฒเธเธฃเธฐเธขเธฐเธ—เธฒเธ (เธงเธดเนเธเธเธฃเธดเธ)</span>
                                    <span class="font-bold font-mono ${inspectionData.mileageDelta > 10000 ? 'text-red-700 font-black' : 'text-emerald-700'}">
                                        ${(inspectionData.mileageDelta !== undefined ? inspectionData.mileageDelta : 0).toLocaleString()} เธเธก.
                                        ${inspectionData.mileageDelta > 10000 ? '<span class="px-1 py-0.2 bg-red-100 text-red-800 rounded text-[9px] ml-1">เน€เธเธดเธ 10k!</span>' : ''}
                                    </span>
                                </div>
                                <div>
                                    <span class="text-slate-500 block text-[10px]">เธชเนเธงเธเธ—เธตเน 4: เธเนเธณเธกเธฑเธเธ—เธตเนเน€เธ•เธดเธก (เธฅเธดเธ•เธฃ)</span>
                                    <span class="font-bold text-slate-800">${inspectionData.fuelRefill && inspectionData.fuelRefill > 0 ? inspectionData.fuelRefill + ' เธฅเธดเธ•เธฃ' : 'เนเธกเนเธกเธตเธเธฒเธฃเน€เธ•เธดเธก (0 เธฅเธดเธ•เธฃ)'}</span>
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
                                <span class="font-bold text-slate-700">เธเธเธฑเธเธเธฒเธเธเธฑเธเธฃเธ– / เธเธนเนเธ•เธฃเธงเธ</span>
                                <span class="text-[10px] text-slate-500">(เธเธนเนเธชเนเธเธฃเธฒเธขเธเธฒเธเธ•เธฃเธงเธเธชเธ เธฒเธ)</span>
                            </div>
                            <div class="flex flex-col items-center">
                                <div class="h-10 flex items-end font-script text-purple-900 font-bold">${inspectionData.mechanicName || 'เธเธฒเธขเธเนเธฒเธเน€เธเธฃเธทเนเธญเธเธขเธเธ•เน เธเธเธ .'}</div>
                                <div class="w-full border-b border-dashed border-slate-400 my-1"></div>
                                <span class="font-bold text-slate-700">เธเนเธฒเธเน€เธเธฃเธทเนเธญเธเธขเธเธ•เน / เธเนเธฒเธเธเนเธญเธก</span>
                                <span class="text-[10px] text-slate-500">(เธเธนเนเธ”เธณเน€เธเธดเธเธเธฒเธฃเนเธเนเนเธ/เธฃเธฑเธเธฃเธญเธเธเธฒเธ)</span>
                            </div>
                            <div class="flex flex-col items-center">
                                <div class="h-10 flex items-end font-script text-purple-900 font-bold">${inspectionData.approverName || 'เธงเธดเธจเธงเธเธฃ/เธซเธฑเธงเธซเธเนเธฒเนเธเธเธเธขเธฒเธเธเธฒเธซเธเธฐ'}</div>
                                <div class="w-full border-b border-dashed border-slate-400 my-1"></div>
                                <span class="font-bold text-slate-700">เธซเธฑเธงเธซเธเนเธฒเนเธเธเธเธขเธฒเธเธเธฒเธซเธเธฐ</span>
                                <span class="text-[10px] text-slate-500">(เธเธนเนเธญเธเธธเธกเธฑเธ•เธดเธญเธเธธเธเธฒเธ•เนเธซเนเนเธเนเธเธฒเธเธฃเธ–)</span>
                            </div>
                        </div>

                        <!-- Footer Legal Notice -->
                        <div class="text-[10px] text-slate-400 text-center border-t border-slate-200 pt-2 font-mono">
                            เธฃเธฐเธเธเธเธฑเธเธ—เธถเธเธเธงเธฒเธกเธเธฅเธญเธ”เธ เธฑเธขเธขเธฒเธเธเธฒเธซเธเธฐเธญเธฑเธ•เนเธเธกเธฑเธ•เธด PEA Smart Vehicle โ€ข Build v0.7.17 โ€ข เธเธญเธเธขเธฒเธเธเธฒเธซเธเธฐ เธเธฒเธฃเนเธเธเนเธฒเธชเนเธงเธเธ เธนเธกเธดเธ เธฒเธ
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

const reportGen = new PEAReportGenerator();
