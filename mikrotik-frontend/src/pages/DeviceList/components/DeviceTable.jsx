import { Loader2, Server } from 'lucide-react';
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
      <div className="p-10 text-center text-slate-400 flex flex-col items-center">
        <Loader2 size={32} className="animate-spin text-blue-500 mb-3" />
        Loading devices...
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="p-10 text-center text-slate-400 flex flex-col items-center">
        <Server size={48} className="mb-4 text-slate-200" />
        <p>No devices found for the selected filter.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold text-left">
            <th className="p-4 pl-6 w-[15%] whitespace-nowrap">Status</th>
            <th className="p-4 w-[25%] whitespace-nowrap">Device Details</th>
            <th className="p-4 w-[20%] whitespace-nowrap">Resources</th>
            <th className="p-4 w-[25%] whitespace-nowrap">Health, Net & Uptime</th>
            <th className="p-4 text-right pr-6 w-[15%] whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
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
        <div ref={observerTarget} className="p-6 flex justify-center items-center gap-2 text-slate-400 bg-slate-50 border-t border-slate-100">
          <Loader2 size={18} className="animate-spin text-blue-400" />
          <span className="text-sm font-medium">Loading more devices...</span>
        </div>
      )}
    </div>
  );
};

export default DeviceTable;