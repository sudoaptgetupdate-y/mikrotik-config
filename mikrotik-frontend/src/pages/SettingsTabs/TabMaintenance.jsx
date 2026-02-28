import { Trash2 } from 'lucide-react';
import apiClient from '../../utils/apiClient';

export default function TabMaintenance() {
  const handleClearAckHistory = async (days) => {
    if (confirm(`⚠️ คำเตือน: คุณแน่ใจหรือไม่ที่จะลบประวัติ Warning ที่เก่ากว่า ${days} วัน ออกจากระบบทั้งหมด?\nการกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      try {
        const res = await apiClient.post('/api/devices/maintenance/clear-ack', { days });
        alert(`ล้างข้อมูลสำเร็จ! มีผลกับอุปกรณ์จำนวน ${res.data.affectedDevices} เครื่อง`);
      } catch (error) {
        console.error("Clear history error:", error);
        alert(`เกิดข้อผิดพลาดในการล้างข้อมูล: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  return (
    <div className="flex-1">
      <div className="mb-6 pb-4 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-800">System Maintenance</h3>
        <p className="text-sm text-slate-500">จัดการข้อมูลและดูแลรักษาพื้นที่ของระบบฐานข้อมูล</p>
      </div>

      <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 md:p-6 max-w-3xl">
        <h4 className="font-bold text-rose-800 flex items-center gap-2 mb-2">
          <Trash2 size={20} /> Clear Acknowledge History
        </h4>
        <p className="text-sm text-rose-700 mb-6 leading-relaxed">
          ลบประวัติการกดรับทราบ (Acknowledge) ของอุปกรณ์ทั้งหมดที่เก่ากว่าจำนวนวันที่กำหนด เพื่อลดขนาดของฐานข้อมูล การกระทำนี้ไม่ส่งผลกระทบต่อสถานะการแจ้งเตือนปัจจุบันของอุปกรณ์
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => handleClearAckHistory(30)} 
            className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-100 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            ลบข้อมูลที่เก่ากว่า 30 วัน
          </button>
          <button 
            onClick={() => handleClearAckHistory(60)} 
            className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-100 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
          >
            ลบข้อมูลที่เก่ากว่า 60 วัน
          </button>
          <button 
            onClick={() => handleClearAckHistory(90)} 
            className="bg-rose-600 text-white hover:bg-rose-700 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"
          >
            ลบข้อมูลที่เก่ากว่า 90 วัน
          </button>
        </div>
      </div>
    </div>
  );
}