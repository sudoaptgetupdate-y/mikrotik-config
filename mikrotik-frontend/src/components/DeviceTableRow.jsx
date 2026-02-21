import React from 'react';
import { 
  Cpu, Zap, HardDrive, Thermometer, Wifi, 
  Clock, Download, History, RotateCcw, Settings, Trash2 
} from 'lucide-react';
import { formatUptime, formatLatency } from '../utils/formatters';

// ฟังก์ชันคำนวณสีหลอด Resource
const getProgressColor = (value, type) => {
  const num = parseFloat(value) || 0;
  if (num > 85) return 'bg-red-500';
  if (num > 70) return 'bg-orange-400';
  if (type === 'cpu') return 'bg-blue-500';
  if (type === 'storage') return 'bg-purple-500';
  return 'bg-green-500';
};

// ฟังก์ชันคำนวณสีของ Ping
const getLatencyColor = (latency) => {
  if (!latency || latency === 'timeout') return 'text-red-500';
  
  let ms = 0;
  if (latency.includes(':')) {
    const timeParts = latency.split(':');
    const secAndMs = timeParts[timeParts.length - 1]; 
    if (secAndMs.includes('.')) {
      const [sec, frac] = secAndMs.split('.');
      ms = (parseInt(sec, 10) * 1000) + parseInt(frac.padEnd(3, '0').substring(0,3), 10);
    } else {
      ms = parseInt(secAndMs, 10) * 1000;
    }
  } else {
    ms = parseInt(latency.replace(/[^0-9]/g, ''), 10);
  }

  if (isNaN(ms)) return 'text-red-500';
  if (ms > 100) return 'text-red-500';
  if (ms > 80) return 'text-orange-500';
  if (ms < 30) return 'text-green-500';
  return 'text-blue-500';
};

const DeviceTableRow = ({ device, status, onDownload, onViewHistory, onRestore, onEdit, onDelete }) => {
  const isDeleted = status.state === 'deleted'; 
  const cpuVal = device.cpu || device.cpuLoad || 0;
  const ramVal = device.ram || device.memoryUsage || 0;
  const storageVal = device.storage || 0;

  return (
    <tr className={`transition group ${isDeleted ? 'bg-slate-50 opacity-75' : 'hover:bg-slate-50'}`}>
      
      {/* 1. Status (ชิดบนเหมือนเดิม) */}
      <td className="p-4 pl-6 align-top">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${status.color}`}>
          {status.icon} {status.label}
        </span>
      </td>

      {/* 2. Details (ชิดบนเหมือนเดิม) */}
      <td className="p-4 align-top">
        <div className="flex flex-col gap-1.5">
          <div>
            <div className={`font-bold text-sm ${isDeleted ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
              {device.name}
            </div>
          </div>
          
          <div className="flex flex-col items-start gap-1.5 mt-1.5">
            <span className={`text-xs font-mono font-medium px-2.5 py-0.5 rounded-md border ${isDeleted ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-purple-50 text-purple-700 border-purple-200 shadow-sm'}`}>
              {device.circuitId || 'No Circuit ID'}
            </span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${isDeleted ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-slate-100 text-slate-700 border-slate-200 shadow-sm'}`}>
              {device.boardName || device.model?.name || 'Unknown Model'}
            </span>
            {device.version && (
              <span className="text-[10px] font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 shadow-sm">
                RouterOS v{device.version}
              </span>
            )}
          </div>
        </div>
      </td>

      {/* 3. Resources (ชิดบนเหมือนเดิม) */}
      <td className="p-4 align-top">
        {status.state !== 'offline' && !isDeleted ? (
          <div className="space-y-3 min-w-[140px]">
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span className="flex items-center gap-1"><Cpu size={10} /> CPU</span>
                <span className="font-medium">{parseFloat(cpuVal).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-500 ${getProgressColor(cpuVal, 'cpu')}`} style={{ width: `${Math.min(cpuVal, 100)}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span className="flex items-center gap-1"><Zap size={10} /> RAM</span>
                <span className="font-medium">{parseFloat(ramVal).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-500 ${getProgressColor(ramVal, 'ram')}`} style={{ width: `${Math.min(ramVal, 100)}%` }}></div>
              </div>
            </div>
            {device.storage !== null && device.storage !== undefined && (
              <div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span className="flex items-center gap-1"><HardDrive size={10} /> HDD</span>
                  <span className="font-medium">{parseFloat(storageVal).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${getProgressColor(storageVal, 'storage')}`} style={{ width: `${Math.min(storageVal, 100)}%` }}></div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">- No Data -</span>
        )}
      </td>

      {/* 4. Health & Net (✅ แก้เป็น align-middle) */}
      <td className="p-4 align-middle">
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="font-mono text-slate-600 mb-1" title="Current IP Address">
            {device.currentIp || '-'}
          </div>
          {status.state !== 'offline' && !isDeleted && (
            <>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Thermometer size={14} className="text-orange-500" />
                {device.temp && device.temp !== "N/A" ? `${device.temp}°C` : 'N/A'}
              </div>
              <div className="flex items-center gap-1.5 text-slate-500">
                <Wifi size={14} className={getLatencyColor(device.latency)} />
                {device.latency && device.latency !== "timeout" ? formatLatency(device.latency) : 'Timeout'}
              </div>
            </>
          )}
        </div>
      </td>

      {/* 5. Uptime & Last Seen (✅ แก้เป็น align-middle) */}
      <td className="p-4 align-middle">
        <div className="flex flex-col gap-2">
            <div className={`text-xs font-medium ${isDeleted ? 'text-slate-400' : 'text-slate-700'}`} title="Device Uptime">
              {formatUptime(device.uptime)}
            </div>
            
            <div className="flex flex-col text-xs text-slate-500" title="Last Contact Time">
              <div className="flex items-center gap-1.5">
                <Clock size={14} /> 
                <span>{device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : 'Never'}</span>
              </div>
              {device.lastSeen && (
                <span className="pl-5 opacity-80 mt-0.5"> 
                  {new Date(device.lastSeen).toLocaleDateString()}
                </span>
              )}
            </div>
        </div>
      </td>

      {/* 6. Actions (✅ แก้เป็น align-middle เพื่อให้ปุ่มอยู่กึ่งกลางด้วย) */}
      <td className="p-4 align-middle text-right pr-6">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!isDeleted && (
              <button onClick={() => onDownload(device)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="Download Latest Config">
                <Download size={16} />
              </button>
          )}
          <button onClick={() => onViewHistory(device)} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition" title="View Config History">
            <History size={16} />
          </button>
          {isDeleted ? (
            <button onClick={() => onRestore(device)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Restore Device">
                <RotateCcw size={16} />
            </button>
          ) : (
            <>
              <button onClick={() => onEdit(device)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit Config">
                <Settings size={16} />
              </button>
              <button onClick={() => onDelete(device)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Deactivate Device">
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

export default DeviceTableRow;