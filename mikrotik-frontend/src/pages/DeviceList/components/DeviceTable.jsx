import { Loader2, Activity } from 'lucide-react';
import DeviceTableRow from './DeviceTableRow';
import { getDeviceStatus } from './deviceHelpers';

const DeviceTable = ({ 
  loading, 
  devices, 
  handlers, 
  canEdit,
  // 🟢 รับ Props ของ Pagination
  pageSizes,
  itemsPerPage,
  setItemsPerPage,
  from,
  to,
  total
}) => {
  if (loading && devices.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 bg-white">
        <Loader2 size={36} className="animate-spin text-blue-600 mb-4" />
        <p className="font-medium text-sm">กำลังโหลดข้อมูลอุปกรณ์...</p>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="flex-1 bg-white flex flex-col items-center justify-center text-center p-8">
        <div className="bg-slate-50 p-5 rounded-full mb-4">
          <Activity size={48} className="text-slate-300" />
        </div>
        <h3 className="text-lg font-bold text-slate-700 mb-1">ไม่พบข้อมูลอุปกรณ์</h3>
        <p className="text-slate-500 text-sm max-w-sm">
          ไม่พบอุปกรณ์ที่ตรงกับเงื่อนไขการค้นหาหรือตัวกรองที่คุณเลือก กรุณาลองปรับการค้นหาใหม่อีกครั้ง
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto flex-1 flex flex-col">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold text-left">
            <th className="p-4 pl-6 w-[15%] whitespace-nowrap">Status</th>
            <th className="p-4 w-[25%] whitespace-nowrap">Device Details</th>
            <th className="p-4 w-[20%] whitespace-nowrap">Resources</th>
            <th className="p-4 w-[25%] whitespace-nowrap">Health, Net & Uptime</th>
            <th className="p-4 text-right pr-6 w-[15%] whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {devices.map((device) => (
            <DeviceTableRow 
              key={device.id} 
              device={device}
              status={getDeviceStatus(device)}
              canEdit={canEdit}
              {...handlers}
            />
          ))}
        </tbody>
      </table>

      {/* 🟢 Table Footer: เลือกจำนวนหน้า & สรุปรายการ (mt-auto ดันติดขอบล่างเสมอ) */}
      <div className="bg-slate-50 border-t border-slate-100 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs mt-auto">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">รายการต่อหน้า:</span>
          <div className="flex gap-1">
            {pageSizes?.map(size => (
              <button 
                key={size} 
                onClick={() => setItemsPerPage(size)} 
                className={`px-2 py-1 rounded transition-colors font-bold ${itemsPerPage === size ? 'bg-slate-200 text-slate-700' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
        <div className="text-slate-500 font-medium">
          กำลังแสดง <span className="font-bold text-slate-700">{from}</span> ถึง <span className="font-bold text-slate-700">{to}</span> จากทั้งหมด <span className="font-bold text-slate-700">{total}</span> รายการ
        </div>
      </div>
    </div>
  );
};

export default DeviceTable;