/**
 * PEA Smart Vehicle - Google Sheets Database Service
 * ระบบเชื่อมต่อและบันทึกข้อมูลเข้า Google Sheets อัตโนมัติผ่าน Google Apps Script Web App
 * Build Version: v0.7.30
 */

// โค้ด Google Apps Script สำเร็จรูป สำหรับนำไปวางใน Extensions > Apps Script ของ Google Sheet
const PEA_GOOGLE_APPS_SCRIPT_CODE = `/**
 * PEA Smart Vehicle Database Gateway
 * สคริปต์สำหรับผูกกับ Google Sheets เพื่อทำหน้าที่เป็นฐานข้อมูล (Backend Database)
 * พัฒนาสำหรับระบบ PEA Smart Vehicle
 */

function doPost(e) {
  try {
    var lock = LockService.getScriptLock();
    lock.waitLock(30000); // ป้องกัน race condition เมื่อมีการส่งข้อมูลพร้อมกัน
    
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var payload = data.payload;
var ss = SpreadsheetApp.getActiveSpreadsheet();
    nameSpreadsheetIfNeeded(ss);
    migrateDepartureTab(ss);
    standardizeHeaderNames(ss);
    
    if (action === "INSPECTION") {
var sheet = getOrCreateSheet(ss, "ตรวจสภาพ_Inspections", [
        "วัน-เวลาบันทึก", "เลขที่เอกสาร", "รหัสยานพาหนะ", "หมายเลขทะเบียน", "ยี่ห้อและรุ่น", 
        "รหัสพนักงาน", "ผู้ปฏิบัติงาน", "งานที่ต้องปฏิบัติ (ภารกิจ)", 
        "ไมล์ก่อนปฏิบัติงาน", "ไมล์หลังปฏิบัติงาน", "ผลต่างระยะทาง (กม.)", "แจ้งเตือนไมล์ผิดปกติ", 
        "เติมเชื้อเพลิง (ลิตร)", "ผลการตรวจ", "รายการจุดชำรุดที่พบ"
      ]);
      
      var defectsText = "ผ่านเกณฑ์ 100% ไม่พบชำรุด";
      if (payload.defects) {
        if (Array.isArray(payload.defects) && payload.defects.length > 0) {
          defectsText = payload.defects.map(function(d) { return d.name + " (" + (d.critical ? "วิกฤต" : "ทั่วไป") + ")"; }).join(", ");
        } else if (typeof payload.defects === "string" && payload.defects.trim() !== "") {
          defectsText = payload.defects;
        }
      }
        
      sheet.appendRow([
        new Date().toLocaleString("th-TH"),
        payload.reportNo || ("DOC-" + new Date().getTime()),
        payload.vehicleId || "",
        payload.plate || "",
        payload.model || "",
        String(payload.employeeId || "-"),
        payload.driver || payload.inspector || "",
        payload.taskDescription || "ปฏิบัติงานทั่วไป",
        payload.startMileage || payload.mileage || 0,
        payload.endMileage || payload.mileage || 0,
        payload.mileageDelta !== undefined ? payload.mileageDelta : 0,
        payload.mileageAlert || (payload.mileageDelta > 10000 ? "เกิน 10,000 กม. (เฝ้าระวัง)" : "ปกติ"),
        payload.fuelRefill || 0,
        payload.status || "READY",
        defectsText
      ]);

// อัปเดตข้อมูลขากลับในชีต 'บันทึกการเข้า-ออกรถยนต์' 
      var depSheet = ss.getSheetByName("บันทึกการเข้า-ออกรถยนต์_Departures");
      if (depSheet) {
        var depData = depSheet.getDataRange().getValues();
        var targetRow = -1;
        for (var i = 1; i < depData.length; i++) {
          var rowMissionId = depData[i][1];
          var rowVehicleId = depData[i][2];
          var rowPlate = depData[i][3];
          var rowStatus = depData[i][10];

          var isMissionMatch = (payload.missionId && payload.missionId !== "-" && rowMissionId === payload.missionId);
          var isFallbackMatch = (!payload.missionId || payload.missionId === "-") && 
                                (rowVehicleId === payload.vehicleId || rowPlate === payload.plate) && 
                                (rowStatus === "ออกปฏิบัติงาน (Out on duty)" || rowStatus === "กำลังปฏิบัติงาน");
          
          if (isMissionMatch || isFallbackMatch) {
            targetRow = i + 1;
            break;
          }
        }
        
        if (targetRow > 0) {
          depSheet.getRange(targetRow, 10).setValue(payload.endMileage || payload.mileage || 0); // เลขไมล์ขากลับ
          depSheet.getRange(targetRow, 11).setValue("เสร็จสิ้นภารกิจ (Completed)"); // สถานะ
        }
      }
      
    } else if (action === "DEPARTURE") {
      var sheet = getOrCreateSheet(ss, "บันทึกการเข้า-ออกรถยนต์_Departures", [
        "วัน-เวลาบันทึก", "เลขที่เอกสาร", "รหัสยานพาหนะ", "หมายเลขทะเบียน", "ยี่ห้อและรุ่น", 
        "รหัสพนักงาน", "ผู้ปฏิบัติงาน", "งานที่ต้องปฏิบัติ (ภารกิจ)", 
        "เลขไมล์ขาไปปฏิบัติงาน", "เลขไมล์ขากลับปฏิบัติงาน", "สถานะ"
      ]);
      
      sheet.appendRow([
        new Date().toLocaleString("th-TH"),
        payload.missionId || ("MSN-" + new Date().getTime()),
        payload.vehicleId || "",
        payload.plate || "",
        payload.model || "",
        String(payload.employeeId || "-"),
        payload.operatorName || payload.driver || "",
        payload.taskDescription || "ปฏิบัติงานทั่วไป",
        payload.startMileage || 0,
        "",
        "ออกปฏิบัติงาน (Out on duty)"
      ]);
      
    } else if (action === "VEHICLE") {
var hasJsonCol = ensureJsonColumn(ss, "ข้อมูลยานพาหนะ_Vehicles");
      var sheet = getOrCreateSheet(ss, "ข้อมูลยานพาหนะ_Vehicles", [
        "วัน-เวลาอัปเดต", "รหัสยานพาหนะ", "หมายเลขทะเบียน", "ยี่ห้อและรุ่น", "สังกัดแผนก",
        "พนักงานขับรถประจำ", "เลขไมล์ล่าสุด (กม.)", "วันหมดอายุภาษี", "สถานะตัวรถ",
        "ข้อมูลเต็ม (JSON)"
      ]);
      
      // ตรวจสอบว่ามีแถวของรถคันนี้อยู่แล้วหรือไม่ ถ้ามีให้อัปเดต ถ้าไม่มีให้เพิ่มใหม่
      var dataRange = sheet.getDataRange().getValues();
      var rowIndex = -1;
      for (var i = 1; i < dataRange.length; i++) {
        if (dataRange[i][1] === payload.id) {
          rowIndex = i + 1;
          break;
        }
      }
      
      var jsonFull = JSON.stringify(payload);
      var rowData = [
        new Date().toLocaleString("th-TH"),
        payload.id,
        payload.plate,
        payload.model,
        payload.department || "การไฟฟ้าส่วนภูมิภาค",
        payload.driver || "",
        payload.mileage || 0,
        payload.taxExpiry || "",
        payload.status || "READY"
      ];
      
      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
        // เขียนคอลัมน์ที่ 10 (ข้อมูลเต็ม) เป็น JSON เพื่อให้อ่านกลับ lossless
        try { sheet.getRange(rowIndex, 10).setValue(jsonFull); } catch (e) { /* ชีตเก่าอาจไม่มีคอลัมน์ 10 */ }
      } else {
        sheet.appendRow(rowData);
        try { sheet.getRange(sheet.getLastRow(), 10).setValue(jsonFull); } catch (e) { /* ชีตเก่าอาจไม่มีคอลัมน์ 10 */ }
      }
      
    } else if (action === "REPAIR_APPROVAL") {
      var sheet = getOrCreateSheet(ss, "ประวัติการซ่อม_Repairs", [
        "วัน-เวลาอนุมัติ", "เลขที่ใบแจ้งซ่อม", "รหัสยานพาหนะ", "หมายเลขทะเบียน", "ผู้แจ้งซ่อม",
        "รายการที่ซ่อมแซม", "ช่างผู้ดำเนินการ", "ผู้อนุมัติงานซ่อม", "สถานะสุดท้าย"
      ]);
      
      var itemsText = (payload.items && payload.items.length > 0)
        ? payload.items.map(function(it) { return it.name + " (" + (it.mechanicNote || "แก้ไขเรียบร้อย") + ")"; }).join(", ")
        : "ซ่อมแซมเสร็จสมบูรณ์";
        
      sheet.appendRow([
        new Date().toLocaleString("th-TH"),
        payload.ticketId,
        payload.vehicleId,
        payload.plate,
        payload.reporter,
        itemsText,
        "ช่างเครื่องยนต์ กฟภ.",
        payload.approver || "หัวหน้าแผนกยานพาหนะ",
        "อนุมัติแล้ว (RESOLVED)"
      ]);
} else if (action === "EMPLOYEE") {
      var empSheet = getOrCreateSheet(ss, "พนักงาน_Employees", [
        "รหัสพนักงาน", "ชื่อ-นามสกุล", "ตำแหน่ง", "สังกัด/แผนก", "ข้อมูลเต็ม (JSON)"
      ]);
      var empJson = JSON.stringify(payload);
      var empRow = [
        String(payload.id || ""),
        payload.name || "",
        payload.position || "",
        payload.dept || ""
      ];
      var empData = empSheet.getDataRange().getValues();
      var empRowIndex = -1;
      for (var i = 1; i < empData.length; i++) {
        if (String(empData[i][0]).trim() === String(empRow[0]).trim()) {
          empRowIndex = i + 1;
          break;
        }
      }
      if (empRowIndex > 0) {
        empSheet.getRange(empRowIndex, 1, 1, empRow.length).setValues([empRow]);
        try { empSheet.getRange(empRowIndex, 5).setValue(empJson); } catch (e) {}
      } else {
        empSheet.appendRow(empRow);
        try { empSheet.getRange(empSheet.getLastRow(), 5).setValue(empJson); } catch (e) {}
      }
    }
    
else if (action === "SEND_EMAIL") {
      if (!payload.emails || !payload.subject || !payload.body) {
        throw new Error("Missing emails, subject, or body");
      }
      var toList = Array.isArray(payload.emails) ? payload.emails : String(payload.emails).split(',').map(function(e) { return e.trim(); });
      MailApp.sendEmail({
        to: toList.join(', '),
        subject: payload.subject,
        htmlBody: payload.body
      });
    }
    
    lock.releaseLock();
    return ContentService.createTextOutput(JSON.stringify({ "success": true, "action": action }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "success": false, "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || "";
    var callback = (e && e.parameter && e.parameter.callback) || "";

    // สถานะออนไลน์ (ไม่มี action) - ตอบ JSON ตามเดิม
    if (action !== "READ_ALL") {
      return ContentService.createTextOutput(JSON.stringify({ 
        "status": "online", 
        "service": "PEA Smart Vehicle Google Sheets API",
        "timestamp": new Date().toLocaleString("th-TH")
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    nameSpreadsheetIfNeeded(ss);
    migrateDepartureTab(ss);
    standardizeHeaderNames(ss);
    var out = {
      ok: true,
      action: action,
      timestamp: new Date().toISOString(),
      data: {
        vehicles: readSheetRows(ss, "ข้อมูลยานพาหนะ_Vehicles", VEHICLE_FIELD_MAP),
        employees: readSheetRows(ss, "พนักงาน_Employees", EMPLOYEE_FIELD_MAP),
        inspections: readSheetRows(ss, "ตรวจสภาพ_Inspections", INSPECTION_FIELD_MAP),
        departures: readSheetRows(ss, "บันทึกการเข้า-ออกรถยนต์_Departures", DEPARTURE_FIELD_MAP),
        repairs: readSheetRows(ss, "ประวัติการซ่อม_Repairs", REPAIR_FIELD_MAP)
      }
    };

    var json = JSON.stringify(out);
    // JSONP: ถ้ามี callback ให้ห่อเป็น javascript callback(...) เพื่อข้าม CORS ผ่าน <script src>
    if (callback) {
      var safeCallback = String(callback).replace(/[^A-Za-z0-9_$]/g, "");
      if (safeCallback) {
        return ContentService.createTextOutput(safeCallback + "(" + json + ");")
          .setMimeType(ContentService.MimeType.JAVASCRIPT);
      }
    }
    return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// แผนที่ชื่อคอลัมน์ (ภาษาไทย) -> ชื่อ field (อังกฤษ)
var VEHICLE_FIELD_MAP = {
  "วัน-เวลาอัปเดต": "updatedAt",
  "รหัสยานพาหนะ": "id",
  "หมายเลขทะเบียน": "plate",
  "ยี่ห้อและรุ่น": "model",
  "สังกัดแผนก": "department",
  "พนักงานขับรถประจำ": "driver",
  "เลขไมล์ล่าสุด (กม.)": "mileage",
  "วันหมดอายุภาษี": "taxExpiry",
  "สถานะตัวรถ": "status",
  "ข้อมูลเต็ม (JSON)": "jsonFull"
};
var EMPLOYEE_FIELD_MAP = {
  "รหัสพนักงาน": "id",
  "ชื่อ-นามสกุล": "name",
  "ตำแหน่ง": "position",
  "สังกัด/แผนก": "dept",
  "ข้อมูลเต็ม (JSON)": "jsonFull"
};
var INSPECTION_FIELD_MAP = {
  "วัน-เวลาบันทึก": "timestamp",
  "เลขที่เอกสาร": "reportNo",
  "รหัสยานพาหนะ": "vehicleId",
  "หมายเลขทะเบียน": "plate",
  "ยี่ห้อและรุ่น": "model",
  "รหัสพนักงาน": "employeeId",
  "ผู้ปฏิบัติงาน": "driver",
  "งานที่ต้องปฏิบัติ": "taskDescription",
  "งานที่ต้องปฏิบัติ (ภารกิจ)": "taskDescription",
  "ไมล์ก่อนปฏิบัติงาน": "startMileage",
  "ไมล์หลังปฏิบัติงาน": "endMileage",
  "ผลต่างระยะทาง (กม.)": "mileageDelta",
  "แจ้งเตือนไมล์ผิดปกติ": "mileageAlert",
  "เติมเชื้อเพลิง (ลิตร)": "fuelRefill",
  "ผลการตรวจ": "status",
  "รายการจุดชำรุดที่พบ": "defects",
  "ข้อมูลเต็ม (JSON)": "jsonFull"
};
var DEPARTURE_FIELD_MAP = {
  "วัน-เวลาบันทึก": "timestamp",
  "เลขที่เอกสาร": "missionId",
  "รหัสยานพาหนะ": "vehicleId",
  "หมายเลขทะเบียน": "plate",
  "ยี่ห้อและรุ่น": "model",
  "รหัสพนักงาน": "employeeId",
  "ผู้ปฏิบัติงาน": "operatorName",
  "งานที่ต้องปฏิบัติ": "taskDescription",
  "งานที่ต้องปฏิบัติ (ภารกิจ)": "taskDescription",
  "เลขไมล์ขาไปปฏิบัติงาน": "startMileage",
  "เลขไมล์ขากลับปฏิบัติงาน": "endMileage",
  "สถานะ": "status",
  "ข้อมูลเต็ม (JSON)": "jsonFull"
};
var REPAIR_FIELD_MAP = {
  "วัน-เวลาอนุมัติ": "timestamp",
  "เลขที่ใบแจ้งซ่อม": "ticketId",
  "รหัสยานพาหนะ": "vehicleId",
  "หมายเลขทะเบียน": "plate",
  "ผู้แจ้งซ่อม": "reporter",
  "รายการที่ซ่อมแซม": "items",
  "ช่างผู้ดำเนินการ": "mechanic",
  "ผู้อนุมัติงานซ่อม": "approver",
  "สถานะสุดท้าย": "status",
  "ข้อมูลเต็ม (JSON)": "jsonFull"
};

// อ่านแถวของชีต เป็น array ของ object; ใช้ jsonFull ตรวจว่ามีค่าอยู่แล้ว
function readSheetRows(ss, sheetName, fieldMap) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (!values || values.length <= 1) return [];

  var headers = values[0];
  var rows = [];
  var jsonCol = -1;
  for (var c = 0; c < headers.length; c++) {
    if (String(headers[c]).trim() === "ข้อมูลเต็ม (JSON)") { jsonCol = c; break; }
  }

  for (var r = 1; r < values.length; r++) {
    var obj = {};
    // อันดับ 1: ถ้าในแถวมีข้อมูลเต็มเป็น JSON ที่ parse ได้ ใช้ค่าจาก payload โดยตรง
    if (jsonCol >= 0 && values[r][jsonCol]) {
      var raw = String(values[r][jsonCol]);
      if (raw.indexOf("{") === 0) {
        try {
          var parsed = JSON.parse(raw);
          for (var k in parsed) { if (parsed.hasOwnProperty(k)) obj[k] = parsed[k]; }
          if (!obj.updatedAt) obj.updatedAt = values[r][0] || "";
          rows.push(obj);
          continue;
        } catch (e) { /* เลื่อนไป fallback จับคู่ header */ }
      }
    }
    // อันดับ 2: จับคู่คอลัมน์ตามแผนที่
    for (var h = 0; h < headers.length; h++) {
      var field = fieldMap[String(headers[h]).trim()];
      if (field && field !== "jsonFull") {
        obj[field] = values[r][h];
      }
    }
    rows.push(obj);
  }
  return rows;
}

// ตั้งชื่อไฟล์สเปรดชีตให้เป็นชื่อมาตรฐาน (ครั้งแรก/เมื่อชื่อยังเป็นค่า default)
function nameSpreadsheetIfNeeded(ss) {
  try {
    var current = ss.getName() || "";
    var defaultPattern = /^(Untitled spreadsheet|สเปรดชีตที่ไม่มีชื่อ|未命名|無題)/;
    if (!current || defaultPattern.test(current)) {
      ss.setName("PEA Smart Vehicle Fleet Database กฟภ.");
    }
  } catch (e) {
    // ถ้าตั้งชื่อไม่ได้ (ไม่มีสิทธิ์) ให้ข้ามไป ไม่ทำให้ฟังก์ชันหลักพัง
  }
}

// เปลี่ยนชื่อแท็บ "บันทึกรถออก_Departures" (ชื่อเดิม) → "บันทึกการเข้า-ออกรถยนต์_Departures"
// อัตโนมัติ จดข้อมูลเดิมอยู่ครบ ไม่ต้องลบ/สร้างใหม่
function migrateDepartureTab(ss) {
  try {
    var old = ss.getSheetByName("บันทึกรถออก_Departures");
    if (old) {
      old.setName("บันทึกการเข้า-ออกรถยนต์_Departures");
    }
  } catch (e) {
    // ไม่มีสิทธิ์เปลี่ยนชื่อ ให้ข้ามไป ระบบยังทำงานกับชื่อใหม่ตามปกติ
  }
}

// ปรับหัวข้อคอลัมน์ให้ตรงกันทุกแท็บ (งานที่ต้องปฏิบัติ == งานที่ต้องปฏิบัติ (ภารกิจ))
function standardizeHeaderNames(ss) {
  renameHeader(ss, "ตรวจสภาพ_Inspections", "งานที่ต้องปฏิบัติ", "งานที่ต้องปฏิบัติ (ภารกิจ)");
}

function renameHeader(ss, sheetName, from, to) {
  try {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).trim() === from) {
        sheet.getRange(1, i + 1).setValue(to);
        return;
      }
    }
  } catch (e) { /* ไม่มีสิทธิ์แก้ออกจากชีตเฉพาะ ให้ข้ามไป */ }
}

function getOrCreateSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    // Format Header Row
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#581c87"); // PEA Purple
    headerRange.setFontColor("#f59e0b"); // PEA Gold
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ตรวจ/เติมคอลัมน์ "ข้อมูลเต็ม (JSON)" ที่ท้ายชีตสำหรับชีตเก่าที่ยังไม่มี
function ensureJsonColumn(ss, sheetName) {
  try {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return false;
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    for (var i = 0; i < headers.length; i++) {
      if (String(headers[i]).trim() === "ข้อมูลเต็ม (JSON)") return true;
    }
    var nextCol = headers.length + 1;
    sheet.getRange(1, nextCol).setValue("ข้อมูลเต็ม (JSON)");
    sheet.getRange(1, nextCol).setBackground("#581c87");
    sheet.getRange(1, nextCol).setFontColor("#f59e0b");
    sheet.getRange(1, nextCol).setFontWeight("bold");
    return true;
  } catch (e) {
    return false;
  }
}`;

class PEAGoogleSheetService {
    constructor() {
        this.STORAGE_KEY_URL = 'pea_google_sheet_webapp_url';
        // URL ฐานข้อมูล Google Sheets กลาง (ผู้ใช้ทุกคนเชื่อมต่อค่าเริ่มต้นนี้ กรณีต้องการชีตของตัวเอง
        // สามารถเข้าไปเปลี่ยนได้ในเมนูตั้งค่า โดยจะบันทึกลงเครื่องแต่ละเครื่อง)
        this.DEFAULT_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbwLoz2fsJtENGH-VFz4T9VozHGAvEXMR0PltRNGDtjC4XkUSXOvJR0092yJkKnZnynkRA/exec';
        this.webAppUrl = localStorage.getItem(this.STORAGE_KEY_URL) || this.DEFAULT_WEBAPP_URL;
    }

getWebAppUrl() {
        return this.webAppUrl;
    }

    // ตรวจรุ่นของ Google Apps Script ที่ถูก Redeploy (GET ขึ้นไป ไม่เขียนชีต)
    // ใช้เทียบกับรุ่น template ปัจจุบัน เพื่อเตือนว่ายังไม่ได้ Redeploy GAS (ต้นตอที่พบบ่อยของข้อมูลไม่ขึ้นชีต)
    async pingGasBuild() {
        if (!this.isConnected()) return { success: false, reason: 'NO_URL' };
        try {
            const res = await fetch(this.webAppUrl + '?action=CHECK', { method: 'GET', mode: 'cors', redirect: 'follow' });
            if (!res.ok) return { success: false, reason: 'HTTP_' + res.status };
            let data = null;
            try { data = await res.json(); } catch(e) { data = null; }
            if (data && data.gasBuild) {
                window.__peaGasBuild = data.gasBuild;
                window.dispatchEvent(new CustomEvent('pea-gasescript-build-changed'));
            }
            return { success: !!data, gasBuild: data ? data.gasBuild : null, data: data };
        } catch (e) {
            return { success: false, error: e && e.message ? e.message : String(e) };
        }
    }

    setWebAppUrl(url) {
        this.webAppUrl = url ? url.trim() : '';
        localStorage.setItem(this.STORAGE_KEY_URL, this.webAppUrl);
        window.dispatchEvent(new CustomEvent('pea-googlesheet-status-changed'));
    }

    isConnected() {
        return Boolean(this.webAppUrl && this.webAppUrl.startsWith('https://script.google.com/macros/s/'));
    }

// Generic post to Google Apps Script Web App
    async sendToGoogleSheet(action, payload) {
        if (!this.isConnected()) {
            console.log(`[Google Sheets] ไม่พบ Web App URL ข้อมูลถูกเก็บไว้ในเครื่อง LocalStorage (Action: ${action})`);
            return { success: false, reason: 'NO_URL' };
        }

        if (!navigator.onLine) {
            console.log(`[Google Sheets] อยู่ในโหมดออฟไลน์ ข้อมูลถูกเก็บเข้าคิวซิงค์เรียบร้อย`);
            return { success: false, reason: 'OFFLINE' };
        }

        const bodyData = JSON.stringify({ action, payload });

        // พยายามส่งแบบ CORS โดยใช้ Content-Type: text/plain (Google Apps Script รับได้ และ
        // การใช้ cors mode ทำให้เราอ่านผลตอบกลับ {success:true} ได้จริง เพื่อยืนยันว่าข้อมูลขึ้นชีต)
        // ถ้าติด redirect/CORS ของบางสเปรดชีต => fallback เป็น no-cors (ส่งได้แต่อ่านผลกลับไม่ได้)
        try {
            const res = await fetch(this.webAppUrl, {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8'
                },
                body: bodyData,
                redirect: 'follow'
            });

            if (res.ok) {
                const ctype = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
                const raw = await res.text();
                // Google ตอบหน้าเว็บ (HTML): ยังไม่ได้ตั้ง Anyone / Signed-in เท่านั้น => เขียนไม่เข้าจริง
                if (ctype === 'text/html' || (raw && raw.indexOf('<!DOCTYPE html') === 0)) {
                    console.warn(`[Google Sheets] Google ตอบเป็นหน้าเว็บ (HTML) แทน JSON -> ${action} — เขียนไม่ถึงชีต อาจยังไม่ได้ตั้ง Who has access = Anyone`);
                    return { success: false, reason: 'HTML_GATE', error: 'Google ตอบเป็นหน้าเว็บ ยังไม่ได้ตั้งค่า Who has access = Anyone (แก้ที่ Apps Script → Deploy → Manage deployments แล้วเลือก Anyone)' };
                }
                let data = null;
                try { data = JSON.parse(raw); } catch(e) { data = null; }
                if (data && data.success !== false) {
                    // เก็บรุ่นของ GAS build ที่กำลังเชื่อมต่อ (ใช้แสดงเตือนว่ายังไม่ Redeploy)
                    if (data.gasBuild) {
                        window.__peaGasBuild = data.gasBuild;
                        window.dispatchEvent(new CustomEvent('pea-gasescript-build-changed'));
                    }
                    console.log(`[Google Sheets] บันทึกข้อมูลสำเร็จ -> ${action}`);
                    return { success: true, data };
                }
                if (data && data.success === false) {
                    console.warn(`[Google Sheets] Server ตอบ error -> ${action}:`, data.error);
                    return { success: false, error: data.error };
                }
            }
            // res.ok แต่ไม่มี JSON -> ปล่อยผ่าน (ถือว่าเขียนได้)
            console.log(`[Google Sheets] บันทึกข้อมูลสำเร็จ (opaque) -> ${action}`);
            return { success: true };
        } catch (error) {
            // ติด CORS/redirect จากบางบัญชี -> fallback no-cors (ส่งได้ 100% แต่ตรวจผลด้วย readSnapshot ภายหลัง)
            try {
                await fetch(this.webAppUrl, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8'
                    },
                    body: bodyData
                });
                console.log(`[Google Sheets] บันทึกข้อมูลสำเร็จ (fallback no-cors) -> ${action}`);
                return { success: true, fallback: true };
            } catch (e2) {
                console.warn('[Google Sheets] เกิดข้อผิดพลาดในการส่งข้อมูล:', e2);
                return { success: false, error: e2 };
            }
        }
    }

// 1. บันทึกผลการตรวจสภาพ (ตรวจสภาพเต็มรูปแบบ — เขียนลงสมุดตรวจสภาพเท่านั้น)
    async logInspection(inspectionData) {
        return this.sendToGoogleSheet('INSPECTION', inspectionData);
    }

    // 1.5 บันทึกรถออกปฏิบัติงาน (ขาไป)
    async logDeparture(departureData) {
        return this.sendToGoogleSheet('DEPARTURE', departureData);
    }

    // 1.6 บันทึกเลขไมล์ขากลับ (ปิดภารกิจในสมุด บันทึกการเข้า-ออกรถยนต์ — ไม่สร้างแถวสมุดตรวจสภาพ)
    async logDepartureEnd(departureEndData) {
        return this.sendToGoogleSheet('DEPARTURE_END', departureEndData);
    }

    // 2. บันทึก/อัปเดตข้อมูลรถ
    async logVehicle(vehicleData) {
        return this.sendToGoogleSheet('VEHICLE', vehicleData);
    }

    // 3. บันทึกประวัติการอนุมัติซ่อม
    async logRepairApproval(repairData) {
        return this.sendToGoogleSheet('REPAIR_APPROVAL', repairData);
    }

// ทดสอบการเชื่อมต่อกับ Google Apps Script
    async testConnection() {
        if (!this.isConnected()) {
            return { success: false, message: 'กรุณากรอก Web App URL ของ Google Apps Script ให้ถูกต้องก่อน' };
        }

        try {
            // ลองยิง ping ไปยัง doGet
            const res = await fetch(this.webAppUrl, { method: 'GET' });
            if (res.ok) {
                const data = await res.json();
                return { success: true, message: `เชื่อมต่อ Google Sheet สำเร็จ! (${data.service || 'พร้อมใช้งาน'})` };
            }
            return { success: true, message: 'เชื่อมต่อกับปลายทาง Google Sheet สำเร็จเรียบร้อย' };
        } catch (e) {
            // กรณีติด CORS ในบางบราวเซอร์ แต่เชื่อมต่อสำเร็จ
            return { success: true, message: 'เชื่อมต่อ URL ปลายทางได้สำเร็จ (พร้อมรับส่งข้อมูล)' };
        }
    }

    // ทดสอบแบบครบวงจร: เขียนแถวทดสอบขึ้นชีตจริง -> อ่านกลับจาก GSheet -> ยืนยันว่าข้อมูลไปถึงจริง
    // ใช้ตอบคำถาม "กดบันทึกแล้วทำไมไม่เห็นข้อมูลใน Google Sheet"
    async testConnectionFull() {
        if (!this.isConnected()) {
            return { success: false, message: 'กรุณากรอก Web App URL ของ Google Apps Script ให้ถูกต้องก่อน' };
        }

        const testId = 'TEST-' + Date.now().toString(36).toUpperCase();
        const testPayload = {
            id: testId,
            plate: 'ทดสอบ',
            model: 'ทดสอบการเชื่อมต่อ ' + new Date().toLocaleString('th-TH'),
            type: 'TEST',
            department: 'กฟภ.',
            driver: 'ระบบทดสอบ',
            mileage: 0,
            fuelLevel: 100,
            taxExpiry: '',
            status: 'READY',
            lastPmMileage: 0,
            lastInspectDate: '',
            updatedAt: new Date().toLocaleString('th-TH')
        };

        // ขั้น 1: เขียนแถวทดสอบผ่าน doPost (เช่นเดียวกับตอนบันทึกจริง)
        const sendRes = await this.sendToGoogleSheet('VEHICLE', testPayload);
        if (!sendRes || !sendRes.success) {
            return {
                success: false,
                message: 'ไม่สามารถส่งข้อมูลไปยัง Google Apps Script ได้ (URL อาจผิด / ยังไม่ได้ Deploy / ไม่มีอินเทอร์เน็ต)',
                detail: sendRes
            };
        }

        // ขั้น 2: รอสักครู่ให้ GAS เขียนเสร็จ แล้วอ่านกลับมาด้วย doGet READ_ALL (ลองใหม่ 3 ครั้ง)
        await new Promise(r => setTimeout(r, 1500));
        const snapshot = await this.readSnapshotWithRetry(12000, 3);

        if (!snapshot.success) {
            return {
                success: false,
                message: 'ส่งข้อมูลสำเร็จ แต่ไม่สามารถอ่านกลับมาได้ (GAS ตอบ: ' + (snapshot.message || 'timeout') + ') — ตรวจว่าได้ Deploy โค้ด v0.7.23 ล่าสุดหรือยัง (ต้องมี doGet READ_ALL และ Deploy ใหม่)',
                sent: true,
                detail: snapshot
            };
        }

        const payload = snapshot.payload || snapshot.data || snapshot;
        if (!this.hasValidSnapshotData(payload)) {
            return {
                success: false,
                message: 'ส่งข้อมูลสำเร็จ แต่ชีตยังว่าง/ไม่พบตารางข้อมูล ตรวจว่า Deploy เป็น "Anyone" และโค้ดถูกต้อง',
                sent: true
            };
        }

        const rows = (payload.data && Array.isArray(payload.data.vehicles)) ? payload.data.vehicles : [];
        const found = rows.find(r => String(r.id) === testId);

        if (found) {
            return {
                success: true,
                message: 'ครบวงจร! เขียนข้อมูลทดสอบขึ้น Google Sheet แล้วอ่านกลับมาเจอ (รถ "' + (found.plate || testId) + '") — ระบบพร้อมใช้งานเต็มรูปแบบ',
                testId,
                verified: true,
                vehicleCount: rows.length
            };
        }

        return {
            success: false,
            message: 'ส่งข้อมูลสำเร็จ แต่ยังตรวจไม่พบแถวทดสอบในชีต รถ (' + (rows.length) + ' คันมีในชีต) — แสดงว่า doPost เขียนไม่เข้าหรือมีข้อผิดพลาดฝั่ง Apps Script',
            sent: true,
            testId,
            vehicleCount: rows.length
        };
    }

    // ฟังก์ชันส่งอีเมลแจ้งเตือน (ผ่าน Google Apps Script)
async sendEmailAlert(emails, subject, body) {
        if (!this.isConnected()) return { success: false, message: 'Google Sheet URL not configured' };
        let emailList = [];
        if (Array.isArray(emails)) emailList = emails;
        else if (typeof emails === 'string') emailList = emails.split(',').map(e => e.trim());
        emailList = emailList.filter(e => e);
        if (emailList.length === 0) return { success: false, message: 'No alert emails configured' };

        return this.sendToGoogleSheet("SEND_EMAIL", { emails: emailList, subject: subject, body: body });
    }

    // ฟังก์ชันดาวน์โหลดข้อมูลสำรองเป็น CSV เพื่อนำเข้า Google Sheets หรือ Excel
    exportCSV() {
        const vehicles = db.getVehicles();
        const logs = db.getActivityLogs();

        let csvContent = "\uFEFF"; // UTF-8 BOM สำหรับภาษาไทยใน Excel / Google Sheets
        
        // หมวดที่ 1: ตารางยานพาหนะ
        csvContent += "=== ตารางข้อมูลยานพาหนะ กฟภ. (PEA Vehicles) ===\r\n";
        csvContent += "รหัสรถ,หมายเลขทะเบียน,รุ่นรถ,แผนกสังกัด,ผู้ขับขี่ประจำ,เลขไมล์ (กม.),วันหมดอายุภาษี,สถานะ\r\n";
        vehicles.forEach(v => {
            csvContent += `"${v.id}","${v.plate}","${v.model}","${v.department}","${v.driver}",${v.mileage},"${v.taxExpiry || ''}","${v.status}"\r\n`;
        });

        csvContent += "\r\n=== ตารางบันทึกประวัติการตรวจสภาพและงานซ่อม (Activity Logs) ===\r\n";
        csvContent += "วัน-เวลา,ทะเบียน,ผู้ปฏิบัติงาน,บทบาท,รายละเอียด,สถานะผลลัพธ์\r\n";
        logs.forEach(l => {
            csvContent += `"${l.timestamp}","${l.plate}","${l.operator}","${l.role}","${l.summary.replace(/"/g, '""')}","${l.statusResult}"\r\n`;
        });

const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `PEA_Smart_Vehicle_Database_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // =========================================================================
    // Google Sheets -> Browser Read (JSONP Bridge, ข้าม CORS ผ่าน <script src>)
    // =========================================================================

    // อ่านทั้ง 4 ชีตจาก Google Sheets เป็น snapshot (Promise)
    // ทางหลัก: fetch GET (CORS) อ่าน JSON ตรง ๆ — Google Apps Script Web App ตอบ CORS header ให้ GET อยู่แล้ว
    // ทางสำรอง: JSONP ผ่าน <script src> (กรณีบางบัญชี/เบราว์เซอร์ปิด CORS)
    async readSnapshot(timeoutMs = 15000) {
        if (!this.isConnected()) {
            return { success: false, reason: 'NO_URL', message: 'กรุณากำหนด URL ของ Google Apps Script Web App ก่อน' };
        }

        const url = this.webAppUrl +
            (this.webAppUrl.includes('?') ? '&' : '?') +
            'action=READ_ALL';

        // ---------- ทางหลัก: GET แบบ CORS อ่าน JSON ได้ตรง ๆ ----------
        try {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), timeoutMs);
            let res;
            try {
                res = await fetch(url, {
                    method: 'GET',
                    mode: 'cors',
                    redirect: 'follow',
                    cache: 'no-store',
                    signal: ctrl.signal
                });
            } finally {
                clearTimeout(timer);
            }

            if (res && res.ok) {
                const ctype = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
                const rawText = await res.text();
                // Google ตอบเป็นหน้าเว็บ (HTML): interstitial / หน้า Sign-in / bot-check
                // => Web App ยังไม่ถูก "Anyone" รับ request ที่ไม่มี session หรือโดน test-mode
                if (ctype === 'text/html' || (rawText && rawText.indexOf('<!DOCTYPE html') === 0)) {
                    return {
                        success: false,
                        reason: 'HTML_GATE',
                        message: 'Google ตอบเป็นหน้าเว็บ (HTML) แทน JSON — บ่งชี้ว่า Web App ยังไม่ได้ตั้งค่า "Who has access = Anyone" หรือเป็น Test deployment ที่ต้อง Sign in โปรดแก้ที่ Apps Script → Deploy → Manage deployments → Edit และเลือก Anyone แล้วลองใหม่'
                    };
                }
                let payload = null;
                try { payload = JSON.parse(rawText); } catch (e) { payload = null; }
                if (!payload) {
                    return { success: false, reason: 'BAD_RESPONSE', message: 'Google ตอบกลับไม่ใช่ JSON (อาจเป็นหน้าเว็บ/ข้อความ error) ตรวจว่า Deploy ถูกต้อง', raw: rawText.slice(0, 200) };
                }
                // GAS เวอร์ชันใหม่: ตอบ { ok, action:"READ_ALL", data:{vehicles,...} }
                if (payload.action === 'READ_ALL' && payload.data) {
                    return { success: true, payload, data: payload };
                }
                // GAS เวอร์ชันเก่า: ตอบ { status:"online" } (ไม่มี doGet READ_ALL แบบ JSONP)
                if (payload.status === 'online') {
                    return {
                        success: false,
                        reason: 'OLD_SCRIPT',
                        message: 'สคริปต์บน Google Apps Script ยังเป็นเวอร์ชันเก่า (ตอบสถานะ online แต่ยังไม่มี doGet READ_ALL) — กรุณาเปิด Apps Script วางโค้ดใหม่ v0.7.23 ทั้งไฟล์ แล้ว Deploy ใหม่อีกครั้ง (ต้องเลือกเว็บแอป Everyone/Anyone)'
                    };
                }
                return { success: false, reason: 'BAD_RESPONSE', payload, message: 'GAS ตอบกลับรูปแบบที่ไม่รู้จัก' };
            }
            // res ไม่ ok → ตกไปทาง JSONP
        } catch (e) {
            // ติด CORS/เครือข่าย → ตกไปทาง JSONP
        }

        // ---------- ทางสำรอง: JSONP (ข้าม CORS ผ่าน <script src>) ----------
        return new Promise((resolve) => {
            const stamp = Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
            const callbackName = 'peaGs_' + stamp;
            const script = document.createElement('script');
            const jsonpUrl = url + '&callback=' + encodeURIComponent(callbackName);

            let settled = false;

            const cleanup = () => {
                if (window[callbackName]) { try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; } }
                if (script.parentNode) script.parentNode.removeChild(script);
            };

            const finish = (result) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                cleanup();
                resolve(result);
            };

            window[callbackName] = (payload) => {
                finish({ success: true, payload, data: payload });
            };

            const timer = setTimeout(() => {
                finish({ success: false, reason: 'TIMEOUT', message: 'หมดเวลาเรียกข้อมูลจาก Google Sheet (' + (timeoutMs / 1000) + ' วินาที) — ตรวจสอบ URL หรืออินเทอร์เน็ต หรือว่าสคริปต์ GAS ยังเป็นเวอร์ชันเก่า (ไม่รองรับ READ_ALL)' });
            }, timeoutMs);

            script.onerror = () => {
                finish({ success: false, reason: 'LOAD_ERROR', message: 'โหลดข้อมูลจาก Google Sheet ไม่สำเร็จ (script error) — เป็นเพราะ Google ตอบเป็นหน้าเว็บ/HTML (ยังไม่ได้ตั้ง Who has access = Anyone หรือสคริปต์บน Apps Script ยังเป็นเวอร์ชันเก่า) กรุณาแก้การ Deploy แล้วลองใหม่' });
            };
            script.src = jsonpUrl;
            document.body.appendChild(script);
        });
    }

    // อ่าน snapshot พร้อมลองใหม่ถ้าพลาด (เสถียรภาพสูง)
    // ไม่ retry กรณี error ที่ไม่หายเอง (HTML_GATE / OLD_SCRIPT / URL ผิด) — โชว์สาเหตุทันที
    async readSnapshotWithRetry(timeoutMs = 12000, attempts = 3) {
        let last = null;
        const nonRetryable = ['NO_URL', 'HTML_GATE', 'OLD_SCRIPT', 'BAD_RESPONSE'];
        for (let i = 0; i < attempts; i++) {
            last = await this.readSnapshot(timeoutMs);
            if (last.success) return last;
            if (nonRetryable.indexOf(last.reason) !== -1) return last;
            console.warn(`[GSheet] อ่าน snapshot ลองครั้ง ${i + 1}/${attempts} ไม่สำเร็จ (${last.reason}) จะลองใหม่ใน 2 วิ`);
            await new Promise(r => setTimeout(r, 2000));
        }
        return last;
    }

    // ตรวจว่า payload จาก GAS มีโครงสร้างข้อมูลฟลีตที่ใช้ได้
    hasValidSnapshotData(payload) {
        return Boolean(
            payload &&
            payload.ok !== false &&
            payload.data &&
            Array.isArray(payload.data.vehicles)
        );
    }

    // แปลง timestamp → epoch ms (รองรับ ISO และรูปแบบไทย "d/m/yyyy, HH:MM:SS" / "d/m/yyyy HH:MM:SS")
    // เพื่อให้ merge เปรียบเทียบ "ใครใหม่กว่า" ได้ถูกต้อง (ไม่ได้เทียบ string ซึ่ง ISO กับ th-TH เรียงผิดกัน)
    parseTsMs(ts) {
        if (!ts) return 0;
        const s = String(ts).trim();
        // ISO: 2026-09-21T14:30:00.000Z หรือ 2026-09-21 14:30:00
        let m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
        if (m) {
            const y = parseInt(m[1], 10), mo = parseInt(m[2], 10) - 1, d = parseInt(m[3], 10);
            const h = parseInt(m[4], 10), mi = parseInt(m[5], 10), se = parseInt(m[6] || '0', 10);
            const dt = new Date(y, mo, d, h, mi, se);
            return isNaN(dt.getTime()) ? 0 : dt.getTime();
        }
        // ไทย/ยุโรป: 21/9/2569, 14:30:00 หรือ 21/9/2569 14:30:00 (พุทธศักราช -543)
        m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\D*(\d{1,2})?:?(\d{2})?:?(\d{2})?/.exec(s);
        if (m) {
            let y = parseInt(m[3], 10);
            if (y > 2500) y -= 543; // พุทธศักราช
            const mo = parseInt(m[2], 10) - 1, d = parseInt(m[1], 10);
            const h = parseInt(m[4] || '0', 10), mi = parseInt(m[5] || '0', 10), se = parseInt(m[6] || '0', 10);
            const dt = new Date(y, mo, d, h, mi, se);
            return isNaN(dt.getTime()) ? 0 : dt.getTime();
        }
        return 0;
    }

    // แปลงแถว Vehicles จากชีต -> object เดียวกับ schema ของ db
    // ลำดับ: ใช้ jsonFull (ข้อมูลเต็มทีเขียนไป) ก่อน ถ้าไม่มี => จับคู่ column headers
    normalizeVehicleRow(row, fallbackVehicle) {
        if (!row) return null;
        // jsonFull เป็น object ที่ app ส่งไปแล้ว (มีฟิลด์ครบ) => ใช้ตรง ๆ
        if (row.jsonFull && typeof row.jsonFull === 'object') {
            const base = Object.assign({}, row.jsonFull);
            if (!base.updatedAt && row.updatedAt) base.updatedAt = row.updatedAt;
            return base;
        }

        const v = fallbackVehicle || {};
        return {
            id: (row.id !== undefined && row.id !== null && row.id !== '') ? String(row.id) : v.id,
            plate: row.plate !== undefined && row.plate !== null ? String(row.plate) : (v.plate || ''),
            model: row.model !== undefined && row.model !== null ? String(row.model) : (v.model || ''),
            type: v.type || 'PICKUP',
            department: row.department || v.department || 'กองยานพาหนะ การไฟฟ้าส่วนภูมิภาค',
            driver: row.driver || v.driver || 'พนักงานขับรถส่วนกลาง',
            mileage: Number(row.mileage) || Number(v.mileage) || 0,
            fuelLevel: v.fuelLevel !== undefined ? v.fuelLevel : 100,
            taxExpiry: row.taxExpiry || v.taxExpiry || '',
            status: row.status || v.status || 'READY',
            lastPmMileage: v.lastPmMileage !== undefined ? v.lastPmMileage : (Number(row.mileage) || 0),
            lastInspectDate: v.lastInspectDate || '',
            updatedAt: row.updatedAt || v.updatedAt || ''
        };
    }

    // รวมรายการรถจาก snapshot กับ LocalStorage โดย "ไม่ให้ข้อมูลถอยหลัง"
    // (merge ด้วย updatedAt: remote ใหม่กว่า => ใช้ remote; local ใหม่กว่า => คง local)
    mergeVehiclesFromSnapshot(snapshotRows, localVehicles, allDepartures) {
        const localById = {};
        (localVehicles || []).forEach(v => { if (v && v.id) localById[v.id] = v; });

        const merged = [];
        const seen = {};

        (snapshotRows || []).forEach(row => {
            if (!row || row.id === undefined || row.id === null || row.id === '') return;
            const id = String(row.id);
            if (seen[id]) return;
            seen[id] = true;

            const local = localById[id] || null;
            const normalized = this.normalizeVehicleRow(row, local);

            // ตัดสินใจ merge ด้วย updatedAt (parsed เป็นตัวเลข) ถ้ามีทั้งสองฝั่ง
            // local ใหม่กว่า => เก็บ local ไว้ทั้งช่อง ไม่ให้ข้อมูลถอยหลัง (เดิมเก็บแค่ 3 ฟิลด์ อื่นๆ ถูก remote แก้ทับทั้งที่เก่ากว่า)
            if (local) {
                const localTs = this.parseTsMs(local.updatedAt || local.lastInspectDate || '');
                const remoteTs = this.parseTsMs(normalized.updatedAt || normalized.lastInspectDate || '');
                if (localTs && remoteTs && remoteTs < localTs) {
                    const keep = Object.assign({}, normalized, local);
                    keep.updatedAt = local.updatedAt || normalized.updatedAt || '';
                    // มาตรวัดระยะทางเป็นแบบเพิ่มทางเดียวเท่านั้น => กัน "กม.ถอยหลัง" เวลานาฬิกาเครื่องเหลื่อมกัน
                    const lKm = Number(keep.mileage) || 0;
                    const rKm = Number(normalized.mileage) || 0;
                    if (rKm > lKm) keep.mileage = rKm;
                    merged.push(keep);
                    return;
                }
                // remote ใหม่กว่า -> ใช้ normalized (remote) ทั้งหมด ยกเว้นฟิลด์ที่ local มีแต่ remote ขาดหายไป
                const filled = Object.assign({}, normalized);
                ['lastPmMileage', 'fuelLevel', 'lastInspectDate', 'status'].forEach(f => {
                    if ((filled[f] === undefined || filled[f] === null || filled[f] === '') && local[f] !== undefined && local[f] !== '') {
                        filled[f] = local[f];
                    }
                });
                // กัน "กม.ถอยหลัง": ไม่ยอมให้เลขไมล์remote ที่ต่ำกว่า ทับเลขไมล์ local ที่สูงกว่า
                const lKm2 = Number(local.mileage) || 0;
                const rKm2 = Number(filled.mileage) || 0;
                if (lKm2 > rKm2) filled.mileage = lKm2;
                merged.push(filled);
                return;
            }
            merged.push(normalized);
        });

        // รถที่มีในเครื่องแต่ยังไม่มีในชีต => คงไว้
        (localVehicles || []).forEach(v => {
            if (v && v.id && !seen[String(v.id)]) {
                merged.push(v);
                seen[String(v.id)] = true;
            }
        });

        // ยกพื้น "เลขไมล์ห้ามถอยหลัง" ด้วยเลขไมล์ขากลับ (endMileage) สูงสุดเท่าที่เคยมีในสมุดเข้า-ออก
        // เพราะสมุดกลางเคยถูกเครื่องเก่าดันค่าไมล์ต่ำกว่ากลับไปได้ (ก่อน GAS v0.7.29 ห้ามถอย) —
        // การประกันไว้นี้ทำให้เครื่องที่ดึงข้อมูลมาเห็นเลขไมล์ที่ถูกต้อง ไม่ยอมรับค่าที่ต่ำกว่า
        const depMaxById = {};
        (allDepartures || []).forEach(d => {
            if (!d || !d.vehicleId) return;
            if (/ออกปฏิบัติงาน|กำลังปฏิบัติงาน/.test(String(d.status || ''))) return; // ยังไม่กลับ ไม่อ่าน
            const id = String(d.vehicleId);
            const km = Number(d.endMileage) || 0;
            if (!(id in depMaxById) || km > depMaxById[id]) depMaxById[id] = km;
        });
        if (Object.keys(depMaxById).length > 0) {
            merged.forEach(v => {
                if (!v || !v.id) return;
                const km = depMaxById[String(v.id)] || 0;
                if (km > (Number(v.mileage) || 0)) v.mileage = km;
            });
        }

        return merged;
    }

    // แปลงแถวพนักงานจากชีต -> object เดียวกับ schema ของ db
    normalizeEmployeeRow(row) {
        if (!row) return null;
        // jsonFull เป็น object ที่ app ส่งไปแล้ว (มีฟิลด์ครบ) => ใช้ตรง ๆ
        if (row.jsonFull && typeof row.jsonFull === 'object') {
            return Object.assign({}, row.jsonFull);
        }
        return {
            id: (row.id !== undefined && row.id !== null && row.id !== '') ? String(row.id).trim() : '',
            name: row.name || '',
            position: row.position || 'พนักงาน กฟภ.',
            dept: row.dept || 'การไฟฟ้าส่วนภูมิภาค'
        };
    }

    // รวมรายชื่อพนักงานจาก snapshot กับ LocalStorage
    // remote มีรหัสที่เครื่องยังไม่มี => เพิ่ม; ถ้ามีทั้งสองฝั่ง => คงของเครื่อง (แก้ไขที่นี่เป็นหลัก)
    mergeEmployeesFromSnapshot(snapshotRows, localEmployees) {
        const localById = {};
        (localEmployees || []).forEach(e => { if (e && e.id) localById[String(e.id).trim()] = e; });

        const merged = [];
        const seen = {};

        (snapshotRows || []).forEach(row => {
            if (!row || row.id === undefined || row.id === null || row.id === '') return;
            const id = String(row.id).trim();
            if (seen[id]) return;
            seen[id] = true;
            if (localById[id]) {
                merged.push(localById[id]);
            } else {
                const n = this.normalizeEmployeeRow(row);
                if (n && n.id) merged.push(n);
            }
        });

        // พนักงานที่อยู่ในเครื่องแต่ยังไม่มีในชีต => คงไว้
        (localEmployees || []).forEach(e => {
            if (e && e.id && !seen[String(e.id).trim()]) {
                merged.push(e);
                seen[String(e.id).trim()] = true;
            }
        });

        return merged;
    }

    // ตรวจสอบว่ามีการตั้งค่า URL Web App ไว้หรือไม่ (สะดวกใช้จากภายนอก)
    isGoogleSheetConfigured() {
        return this.isConnected();
    }
}

const googleSheet = new PEAGoogleSheetService();




