import { Loader2, Activity } from 'lucide-react';
import DeviceTableRow from './DeviceTableRow';
import { getDeviceStatus } from './deviceHelpers';

const DeviceTable = ({ 
  loading, 
  devices, 
  filteredCount, 
  displayLimit, 
  observerTarget, 
  handlers, 
  canEdit 
}) => {
  if (loading && devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white min-h-[400px]">
        <Loader2 size={36} className="animate-spin text-blue-600 mb-4" />
        <p className="font-medium text-sm">กำลังโหลดข้อมูลอุปกรณ์...</p>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="bg-white border-t border-slate-100 flex flex-col items-center justify-center min-h-[400px] text-center p-8">
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
    <div className="overflow-x-auto">
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

      {/* Intersection Observer Target สำหรับ Infinite Scroll */}
      {displayLimit < filteredCount && (
        <div ref={observerTarget} className="p-6 flex justify-center items-center gap-2 text-slate-500 bg-white border-t border-slate-100">
          <Loader2 size={18} className="animate-spin text-blue-500" />
          <span className="text-sm font-medium">กำลังโหลดข้อมูลเพิ่มเติม...</span>
        </div>
      )}
    </div>
  );
};

export default DeviceTable;