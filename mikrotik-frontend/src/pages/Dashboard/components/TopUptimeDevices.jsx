import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Clock, CheckCircle2 } from 'lucide-react';

const TopUptimeDevices = ({ devices }) => {
  const navigate = useNavigate();

  // ฟังก์ชันช่วยจัดรูปแบบ Uptime ให้สั้นและสวยงาม (ถ้าต้องการ)
  const formatUptimeSimple = (uptime) => {
    if (!uptime || uptime === 'N/A') return 'Unknown';
    // MikroTik Format: "2w3d 04:12:00" -> "2w 3d"
    return uptime.split(' ')[0].replace(/([a-z])([0-9])/g, '$1 $2');
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div>
        <h3 className="text-base font-black text-slate-800">Top Performance (Uptime)</h3>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {devices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center min-h-[200px]">
            <p className="text-sm font-medium">No uptime data available</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto custom-scrollbar">
            {devices.map((device, index) => (
              <div 
                key={device.id} 
                onClick={() => navigate(`/devices`)}
                className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                    <Zap size={18} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-emerald-600 transition-colors">{device.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{device.deviceModel?.name || 'MikroTik'}</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                    {device.uptime || 'N/A'}
                  </span>
                  {index === 0 && (
                    <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={10} /> MOST STABLE
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopUptimeDevices;
