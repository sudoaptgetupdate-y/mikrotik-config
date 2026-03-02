import { Activity, ShieldAlert, ClipboardList } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2'; // ✅ สำคัญ: ต้องนำเข้า SweetAlert2

export default function TabMaintenance() {
  
  // ==========================================
  // Handlers (Actions)
  // ==========================================
  const handleClearAckHistory = async (days) => {
    const result = await Swal.fire({
      title: '⚠️ ยืนยันการล้างข้อมูล?',
      text: `คุณแน่ใจหรือไม่ที่จะลบประวัติ "การกดรับทราบ (Acknowledge)" ที่เก่ากว่า ${days} วัน ออกจากระบบทั้งหมด? (การกระทำนี้ไม่สามารถย้อนกลับได้)`,
      icon: 'warning', 
      showCancelButton: true,
      confirmButtonText: 'ใช่, ล้างข้อมูลเลย!',
      cancelButtonText: 'ยกเลิก',
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl p-6 border-2 border-rose-100 shadow-2xl', 
        title: 'text-xl font-bold text-rose-600', 
        htmlContainer: 'text-sm text-slate-600 font-medium mt-2 leading-relaxed',
        actions: 'flex gap-3 mt-6 w-full justify-center',
        confirmButton: 'bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-bold transition-all'
      }
    });

    if (result.isConfirmed) {
      const clearPromise = apiClient.post('/api/devices/maintenance/clear-ack', { days });
      toast.promise(clearPromise, {
        loading: 'กำลังล้างข้อมูล...',
        success: (res) => `ล้างข้อมูลสำเร็จ! มีผลกับอุปกรณ์จำนวน ${res.data.affectedDevices} เครื่อง`,
        error: (err) => `เกิดข้อผิดพลาด: ${err.response?.data?.error || err.message}`
      });
      try { await clearPromise; } catch (e) {}
    }
  };

  const handleClearEventHistory = async (days) => {
    const result = await Swal.fire({
      title: '⚠️ ยืนยันการล้างข้อมูลสถานะ?',
      text: `คุณแน่ใจหรือไม่ที่จะลบประวัติ "สถานะอุปกรณ์ (Online/Offline/Warning)" ที่เก่ากว่า ${days} วัน? (การกระทำนี้ไม่สามารถย้อนกลับได้)`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ล้างข้อมูลเลย!',
      cancelButtonText: 'ยกเลิก',
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl p-6 border-2 border-orange-100 shadow-2xl',
        title: 'text-xl font-bold text-orange-600',
        htmlContainer: 'text-sm text-slate-600 font-medium mt-2 leading-relaxed',
        actions: 'flex gap-3 mt-6 w-full justify-center',
        confirmButton: 'bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all', 
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-bold transition-all'
      }
    });

    if (result.isConfirmed) {
      const clearPromise = apiClient.post('/api/devices/maintenance/clear-events', { days });
      toast.promise(clearPromise, {
        loading: 'กำลังล้างข้อมูล...',
        success: (res) => `ล้างข้อมูลสำเร็จ! ลบประวัติไปทั้งหมด ${res.data.deletedCount} รายการ`,
        error: (err) => `เกิดข้อผิดพลาด: ${err.response?.data?.error || err.message}`
      });
      try { await clearPromise; } catch (e) {}
    }
  };

  const handleClearActivityLog = async (days) => {
    const result = await Swal.fire({
      title: '⚠️ ยืนยันการล้างประวัติแอดมิน?',
      text: `คุณแน่ใจหรือไม่ที่จะลบ "ประวัติการใช้งานระบบ (Audit Logs)" ที่เก่ากว่า ${days} วัน? (การกระทำนี้ไม่สามารถย้อนกลับได้)`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ล้างข้อมูลเลย!',
      cancelButtonText: 'ยกเลิก',
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl p-6 border-2 border-blue-100 shadow-2xl',
        title: 'text-xl font-bold text-blue-600',
        htmlContainer: 'text-sm text-slate-600 font-medium mt-2 leading-relaxed',
        actions: 'flex gap-3 mt-6 w-full justify-center',
        confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all', 
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-bold transition-all'
      }
    });

    if (result.isConfirmed) {
      const clearPromise = apiClient.post('/api/devices/maintenance/clear-activity-logs', { days });
      toast.promise(clearPromise, {
        loading: 'กำลังล้างข้อมูล...',
        success: (res) => `ล้างข้อมูลสำเร็จ! ลบประวัติไปทั้งหมด ${res.data.deletedCount} รายการ`,
        error: (err) => `เกิดข้อผิดพลาด: ${err.response?.data?.error || err.message}`
      });
      try { await clearPromise; } catch (e) {}
    }
  };

  // ==========================================
  // Render
  // ==========================================
  return (
    <div className="flex-1 space-y-6">
      <div className="mb-6 pb-4 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-800">System Maintenance</h3>
        <p className="text-sm text-slate-500">จัดการข้อมูลและดูแลรักษาพื้นที่ของระบบฐานข้อมูล</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 md:p-6 flex flex-col">
          <h4 className="font-bold text-rose-800 flex items-center gap-2 mb-2">
            <ShieldAlert size={20} /> Clear Acknowledge
          </h4>
          <p className="text-sm text-rose-700 mb-6 leading-relaxed">ลบประวัติการพิมพ์ข้อความรับทราบ ช่วยลดขนาดฟิลด์ JSON ในตารางอุปกรณ์</p>
          <div className="flex flex-wrap gap-2 mt-auto">
            <button onClick={() => handleClearAckHistory(30)} className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-100 px-3 py-2 rounded-lg text-sm font-bold transition-colors">&gt; 30 วัน</button>
            <button onClick={() => handleClearAckHistory(60)} className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-100 px-3 py-2 rounded-lg text-sm font-bold transition-colors">&gt; 60 วัน</button>
            <button onClick={() => handleClearAckHistory(90)} className="bg-rose-600 text-white hover:bg-rose-700 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">&gt; 90 วัน</button>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 md:p-6 flex flex-col">
          <h4 className="font-bold text-orange-800 flex items-center gap-2 mb-2">
            <Activity size={20} /> Clear Event Logs
          </h4>
          <p className="text-sm text-orange-700 mb-6 leading-relaxed">ลบประวัติการเปลี่ยนสถานะของอุปกรณ์ (Online, Offline, Warning)</p>
          <div className="flex flex-wrap gap-2 mt-auto">
            <button onClick={() => handleClearEventHistory(30)} className="bg-white border border-orange-200 text-orange-600 hover:bg-orange-100 px-3 py-2 rounded-lg text-sm font-bold transition-colors">&gt; 30 วัน</button>
            <button onClick={() => handleClearEventHistory(60)} className="bg-white border border-orange-200 text-orange-600 hover:bg-orange-100 px-3 py-2 rounded-lg text-sm font-bold transition-colors">&gt; 60 วัน</button>
            <button onClick={() => handleClearEventHistory(90)} className="bg-orange-600 text-white hover:bg-orange-700 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">&gt; 90 วัน</button>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 md:p-6 flex flex-col">
          <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
            <ClipboardList size={20} /> Clear Audit Logs
          </h4>
          <p className="text-sm text-blue-700 mb-6 leading-relaxed">ลบประวัติการใช้งานระบบของแอดมิน เช่น การเพิ่ม/ลบอุปกรณ์ และดาวน์โหลดสคริปต์</p>
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