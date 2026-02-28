import { Activity, ShieldAlert, ClipboardList } from 'lucide-react';
import apiClient from '../../utils/apiClient';

export default function TabMaintenance() {
  
  // 1. ฟังก์ชันลบประวัติ Acknowledge 
  const handleClearAckHistory = async (days) => {
    if (confirm(`⚠️ คำเตือน: คุณแน่ใจหรือไม่ที่จะลบประวัติ "การกดรับทราบ (Acknowledge)" ที่เก่ากว่า ${days} วัน ออกจากระบบทั้งหมด?\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      try {
        const res = await apiClient.post('/api/devices/maintenance/clear-ack', { days });
        alert(`ล้างข้อมูลสำเร็จ! มีผลกับอุปกรณ์จำนวน ${res.data.affectedDevices} เครื่อง`);
      } catch (error) {
        alert(`เกิดข้อผิดพลาดในการล้างข้อมูล: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  // 2. ฟังก์ชันลบประวัติ Event (Online/Offline/Warning)
  const handleClearEventHistory = async (days) => {
    if (confirm(`⚠️ คำเตือน: คุณแน่ใจหรือไม่ที่จะลบประวัติ "สถานะอุปกรณ์ (Online/Offline/Warning)" ที่เก่ากว่า ${days} วัน?\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      try {
        const res = await apiClient.post('/api/devices/maintenance/clear-events', { days });
        alert(`ล้างข้อมูลสำเร็จ! ลบประวัติไปทั้งหมด ${res.data.deletedCount} รายการ`);
      } catch (error) {
        alert(`เกิดข้อผิดพลาดในการล้างข้อมูล: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  // ✅ 3. ฟังก์ชันใหม่: ลบประวัติ Activity (Audit Logs)
  const handleClearActivityLog = async (days) => {
    if (confirm(`⚠️ คำเตือน: คุณแน่ใจหรือไม่ที่จะลบ "ประวัติการใช้งานระบบ (Audit Logs)" ที่เก่ากว่า ${days} วัน?\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      try {
        const res = await apiClient.post('/api/devices/maintenance/clear-activity-logs', { days });
        alert(`ล้างข้อมูลสำเร็จ! ลบประวัติไปทั้งหมด ${res.data.deletedCount} รายการ`);
      } catch (error) {
        alert(`เกิดข้อผิดพลาดในการล้างข้อมูล: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  return (
    <div className="flex-1 space-y-6">
      <div className="mb-6 pb-4 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-800">System Maintenance</h3>
        <p className="text-sm text-slate-500">จัดการข้อมูลและดูแลรักษาพื้นที่ของระบบฐานข้อมูล</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* กล่องที่ 1: Acknowledge */}
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 md:p-6 flex flex-col">
          <h4 className="font-bold text-rose-800 flex items-center gap-2 mb-2">
            <ShieldAlert size={20} /> Clear Acknowledge
          </h4>
          <p className="text-sm text-rose-700 mb-6 leading-relaxed">
            ลบประวัติการพิมพ์ข้อความรับทราบ (Acknowledge Reason) ช่วยลดขนาดฟิลด์ JSON ในตารางอุปกรณ์
          </p>
          <div className="flex flex-wrap gap-2 mt-auto">
            <button onClick={() => handleClearAckHistory(30)} className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-100 px-3 py-2 rounded-lg text-sm font-bold transition-colors">&gt; 30 วัน</button>
            <button onClick={() => handleClearAckHistory(60)} className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-100 px-3 py-2 rounded-lg text-sm font-bold transition-colors">&gt; 60 วัน</button>
            <button onClick={() => handleClearAckHistory(90)} className="bg-rose-600 text-white hover:bg-rose-700 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">&gt; 90 วัน</button>
          </div>
        </div>

        {/* กล่องที่ 2: Event Log */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 md:p-6 flex flex-col">
          <h4 className="font-bold text-orange-800 flex items-center gap-2 mb-2">
            <Activity size={20} /> Clear Event Logs
          </h4>
          <p className="text-sm text-orange-700 mb-6 leading-relaxed">
            ลบประวัติการเปลี่ยนสถานะของอุปกรณ์ (Online, Offline, Warning) ทำให้ไทม์ไลน์ย้อนหลังหายไป
          </p>
          <div className="flex flex-wrap gap-2 mt-auto">
            <button onClick={() => handleClearEventHistory(30)} className="bg-white border border-orange-200 text-orange-600 hover:bg-orange-100 px-3 py-2 rounded-lg text-sm font-bold transition-colors">&gt; 30 วัน</button>
            <button onClick={() => handleClearEventHistory(60)} className="bg-white border border-orange-200 text-orange-600 hover:bg-orange-100 px-3 py-2 rounded-lg text-sm font-bold transition-colors">&gt; 60 วัน</button>
            <button onClick={() => handleClearEventHistory(90)} className="bg-orange-600 text-white hover:bg-orange-700 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">&gt; 90 วัน</button>
          </div>
        </div>

        {/* ✅ กล่องที่ 3: Activity / Audit Log */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 md:p-6 flex flex-col">
          <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
            <ClipboardList size={20} /> Clear Audit Logs
          </h4>
          <p className="text-sm text-blue-700 mb-6 leading-relaxed">
            ลบประวัติการใช้งานระบบของแอดมิน (Activity Log) เช่น การเพิ่ม/ลบอุปกรณ์ และดาวน์โหลดสคริปต์
          </p>
          <div className="flex flex-wrap gap-2 mt-auto">
            <button onClick={() => handleClearActivityLog(30)} className="bg-white border border-blue-200 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg text-sm font-bold transition-colors">&gt; 30 วัน</button>
            <button onClick={() => handleClearActivityLog(60)} className="bg-white border border-blue-200 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg text-sm font-bold transition-colors">&gt; 60 วัน</button>
            <button onClick={() => handleClearActivityLog(90)} className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">&gt; 90 วัน</button>
          </div>
        </div>

      </div>
    </div>
  );
}