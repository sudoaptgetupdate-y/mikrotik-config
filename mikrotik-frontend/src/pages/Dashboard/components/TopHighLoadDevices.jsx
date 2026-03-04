import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Cpu, HardDrive, Thermometer, Activity, CheckCircle2 } from 'lucide-react';

const TopHighLoadDevices = ({ devices }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1.5 h-5 bg-orange-500 rounded-full"></div>
        <h3 className="text-base font-black text-slate-800">High-Load Devices</h3>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
        {devices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-slate-500">All systems optimal</p>
            <p className="text-[11px] mt-1 text-slate-400">No high-load devices detected</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto custom-scrollbar">
            {devices.map((device) => (
              <div 
                key={device.id} 
                onClick={() => navigate(`/devices`)}
                className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <Server size={18} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 truncate">{device.name}</h4>
                    <p className="text-xs text-slate-500 font-mono truncate">{device.currentIp}</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex flex-wrap justify-end gap-1 text-[10px] font-bold">
                    {device.cpuVal > 85 && <span className="text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded flex items-center gap-1"><Cpu size={10}/> {device.cpuVal}%</span>}
                    {device.ramVal > 85 && <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-1"><HardDrive size={10}/> {device.ramVal}%</span>}
                    {device.storageVal > 85 && <span className="text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded flex items-center gap-1"><HardDrive size={10}/> {device.storageVal}%</span>}
                    {device.tempVal > 60 && <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex items-center gap-1"><Thermometer size={10}/> {device.tempVal}°C</span>}
                    {device.latencyMs > 80 && <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1"><Activity size={10}/> {device.latencyMs}ms</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopHighLoadDevices;