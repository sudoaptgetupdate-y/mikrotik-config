import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ServerOff, Clock, MapPin, CheckCircle2 } from 'lucide-react';

const OfflineDevices = ({ devices }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1.5 h-5 bg-rose-500 rounded-full"></div>
        <h3 className="text-base font-black text-slate-800">Offline Devices</h3>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
        {devices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-slate-500">No connectivity issues</p>
            <p className="text-[11px] mt-1 text-slate-400">All managed devices are online</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto custom-scrollbar">
            {devices.map((device) => {
              const lastSeenDate = device.lastSeen ? new Date(device.lastSeen) : null;
              const timeStr = lastSeenDate ? lastSeenDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
              const dateStr = lastSeenDate ? lastSeenDate.toLocaleDateString('th-TH', { day: '2-digit', month: 'short' }) : '';

              return (
                <div 
                  key={device.id} 
                  onClick={() => navigate(`/devices`, { state: { filter: 'OFFLINE' } })}
                  className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                      <ServerOff size={18} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 truncate">{device.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <MapPin size={10} /> {device.currentIp}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                      OFFLINE
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Clock size={10} /> {dateStr} {timeStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflineDevices;
