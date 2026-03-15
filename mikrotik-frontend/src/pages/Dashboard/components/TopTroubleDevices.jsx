import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { logService } from '../../../services/logService';
import { AlertCircle, WifiOff, AlertTriangle, ChevronRight, Loader2 } from 'lucide-react';

const TopTroubleDevices = () => {
  const [days, setDays] = useState(7); // Default to 7 days for trends
  const navigate = useNavigate();

  const { data: devices, isLoading } = useQuery({
    queryKey: ['top-trouble-devices', days],
    queryFn: () => logService.getTopTroubleDevices(days),
    refetchInterval: 60000
  });

  const periods = [
    { label: '24h', value: 1 },
    { label: '7d', value: 7 },
    { label: '30d', value: 30 }
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 bg-rose-600 rounded-full"></div>
          <h3 className="text-base font-black text-slate-800">Incident Leaderboard</h3>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setDays(p.value)}
              className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${
                days === p.value 
                  ? 'bg-rose-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[300px] flex flex-col">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center flex-1 text-slate-400 gap-2">
            <Loader2 size={24} className="animate-spin text-rose-500" />
            <span className="text-[10px] font-black uppercase">Calculating trends...</span>
          </div>
        ) : !devices || devices.length === 0 ? (
          <div className="p-10 text-center flex-1 flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 text-slate-300">
                <AlertCircle size={24} />
            </div>
            <p className="text-xs font-bold text-slate-400">No recurring incidents found in this period.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {devices.map((device) => (
              <div 
                key={device.id} 
                onClick={() => navigate(`/devices`)}
                className="p-4 hover:bg-rose-50/30 transition-all cursor-pointer group flex items-center justify-between"
              >
                <div className="min-w-0 pr-4">
                  <h4 className="text-sm font-bold text-slate-800 group-hover:text-rose-700 transition-colors truncate">{device.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{device.currentIp}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex gap-2">
                    {device.offlineCount > 0 && (
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-rose-600">{device.offlineCount}</span>
                        <WifiOff size={12} className="text-rose-400" />
                      </div>
                    )}
                    {device.warningCount > 0 && (
                      <div className="flex flex-col items-center border-l border-slate-100 pl-2">
                        <span className="text-[10px] font-black text-orange-600">{device.warningCount}</span>
                        <AlertTriangle size={12} className="text-orange-400" />
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-rose-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!isLoading && devices?.length > 0 && (
            <div className="p-3 bg-rose-50/50 border-t border-rose-100 mt-auto text-center">
                <p className="text-[9px] font-black text-rose-600 uppercase tracking-tighter">
                    Devices requiring technical attention
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

export default TopTroubleDevices;
