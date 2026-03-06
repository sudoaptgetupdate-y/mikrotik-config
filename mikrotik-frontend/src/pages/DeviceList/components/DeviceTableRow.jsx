import React from 'react';
import { 
  Cpu, Zap, HardDrive, Thermometer, Wifi, ServerOff, 
  Clock, Download, History, RotateCcw, Settings, Trash2, BellRing, CheckCircle, Activity, AlertTriangle
} from 'lucide-react';
import { formatUptime, formatLatency } from '../../../utils/formatters';

// รับค่า limit (thresholds) เข้ามาใช้ในการคำนวณสีหลอด
const getProgressColor = (value, type, limit = 85) => {
  const num = parseFloat(value) || 0;
  if (num > limit) return 'bg-red-500';
  if (num > limit - 15) return 'bg-orange-400';
  if (type === 'cpu') return 'bg-blue-500';
  if (type === 'storage') return 'bg-purple-500';
  return 'bg-green-500';
};

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

const DeviceTableRow = ({ device, status, thresholds, onDownload, onViewHistory, onViewEvents, onRestore, onEdit, onDelete, onAcknowledge, canEdit }) => {
  const isDeleted = status.state === 'deleted'; 
  
  const diffMinutes = device.lastSeen ? (new Date() - new Date(device.lastSeen)) / 1000 / 60 : 999;
  const isDeviceOffline = diffMinutes > 3;

  const cpuVal = device.cpu || device.cpuLoad || 0;
  const ramVal = device.ram || device.memoryUsage || 0;
  const storageVal = device.storage || 0;

  // 🟢 เพิ่มตัวแปรสำหรับรับค่า Issue เพื่อนำไปแสดงใน Tooltip
  let latestAckReason = 'No reason provided';
  let latestAckWarning = ''; 
  let ackCount = 0;
  
  if (device.ackReason) {
    if (Array.isArray(device.ackReason)) {
      if (device.ackReason.length > 0) {
        const last = device.ackReason[device.ackReason.length - 1];
        latestAckReason = last.reason;
        latestAckWarning = last.warningData || ''; // ดึง Issue ล่าสุดออกมา
        ackCount = device.ackReason.length;
      }
    } else if (typeof device.ackReason === 'string') {
      try {
        const historyArr = JSON.parse(device.ackReason);
        if (Array.isArray(historyArr) && historyArr.length > 0) {
          const last = historyArr[historyArr.length - 1];
          latestAckReason = last.reason;
          latestAckWarning = last.warningData || ''; // ดึง Issue ล่าสุดออกมา
          ackCount = historyArr.length;
        }
      } catch (e) {
        latestAckReason = device.ackReason;
        ackCount = 1;
      }
    }
  }

  // 🟢 ยกเลิกการบังคับสีเขียว ปล่อยให้แสดงผลสีส้ม/แดง ตามความเป็นจริง (รับมาจาก getDeviceStatus)
  let mainStateLabel = status.label;
  let mainStateColor = status.color;
  let mainStateIcon = status.icon;

  return (
    <tr className={`transition group ${isDeleted ? 'bg-slate-50 opacity-75' : 'hover:bg-slate-50'}`}>
      
      {/* 1. Status */}
      <td className="p-4 pl-6 align-top">
        <div className="flex flex-col items-start gap-1.5">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${mainStateColor}`}>
            {mainStateIcon} {mainStateLabel}
          </span>
          {device.isAcknowledged && (
            <span 
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border bg-blue-50 text-blue-600 border-blue-200 cursor-help mt-1"
              // 🟢 แสดง Issue และ Note ใน Tooltip
              title={`Issue: ${latestAckWarning || 'Unknown'}\nNote: ${latestAckReason}`}
            >
              <CheckCircle size={12}/> {ackCount > 1 ? `Ack (${ackCount})` : 'Acknowledged'}
            </span>
          )}
        </div>
      </td>

      {/* 2. Details */}
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

      {/* 3. Resources */}
      <td className="p-4 align-top">
        {!isDeviceOffline && !isDeleted ? (
          <div className="space-y-3 min-w-[140px]">
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span className="flex items-center gap-1"><Cpu size={10} /> CPU</span>
                <span className="font-medium">{parseFloat(cpuVal).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                {/* 🟢 ส่ง thresholds ลงไปเพื่อเปลี่ยนสีหลอดให้ถูกต้อง */}
                <div className={`h-full transition-all duration-500 ${getProgressColor(cpuVal, 'cpu', thresholds?.cpu)}`} style={{ width: `${Math.min(cpuVal, 100)}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span className="flex items-center gap-1"><Zap size={10} /> RAM</span>
                <span className="font-medium">{parseFloat(ramVal).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-500 ${getProgressColor(ramVal, 'ram', thresholds?.ram)}`} style={{ width: `${Math.min(ramVal, 100)}%` }}></div>
              </div>
            </div>
            {device.storage !== null && device.storage !== undefined && (
              <div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span className="flex items-center gap-1"><HardDrive size={10} /> HDD</span>
                  <span className="font-medium">{parseFloat(storageVal).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${getProgressColor(storageVal, 'storage', thresholds?.storage)}`} style={{ width: `${Math.min(storageVal, 100)}%` }}></div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">- No Data -</span>
        )}
      </td>

      {/* 4. Health, Net & Uptime */}
      <td className="p-4 align-top">
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded w-max mb-0.5" title="Current IP Address">
            {device.currentIp || 'No IP Address'}
          </div>

          {!isDeviceOffline && !isDeleted && (
            <div className="flex items-center gap-3 text-slate-500 mb-1">
              <div className="flex items-center gap-1">
                <Thermometer size={14} className="text-orange-500" />
                <span>{device.temp && device.temp !== "N/A" ? `${device.temp}°C` : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Wifi size={14} className={getLatencyColor(device.latency)} />
                <span>{device.latency && device.latency !== "timeout" ? formatLatency(device.latency) : 'Timeout'}</span>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 mt-1">
            <div className="mt-0.5" title="Uptime">
              <Activity size={14} className="text-blue-500" />
            </div>
            <span className={`font-medium ${isDeleted ? 'text-slate-400' : 'text-slate-700'}`}>
              {device.uptime ? formatUptime(device.uptime) : '-'}
            </span>
          </div>

          <div className="flex items-start gap-2 mt-0.5">
            <div className="mt-0.5" title="Last Seen">
              <Clock size={14} className="text-slate-400" />
            </div>
            <div className="text-slate-500">
              {device.lastSeen ? (
                <span>
                  {new Date(device.lastSeen).toLocaleDateString()} {new Date(device.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              ) : (
                'Never'
              )}
            </div>
          </div>
        </div>
      </td>

      {/* 5. Actions */}
      <td className="p-4 align-middle text-right pr-6">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          
          {canEdit && (status.state === 'warning' || isDeviceOffline || device.isAcknowledged) && !isDeleted && (
            <button 
              onClick={() => onAcknowledge(device)} 
              className={`p-2 rounded-lg transition mr-2 ${
                (!device.isAcknowledged && (status.state === 'warning' || isDeviceOffline))
                  ? 'text-orange-500 hover:text-white hover:bg-orange-500 animate-pulse' 
                  : 'text-blue-500 hover:text-white hover:bg-blue-500'
              }`}
              title={!device.isAcknowledged ? "Acknowledge Warning / Offline" : "Update Acknowledge Note"}
            >
              <BellRing size={16} />
            </button>
          )}

          {canEdit && !isDeleted && (
              <button onClick={() => onDownload(device)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="Download Latest Config">
                <Download size={16} />
              </button>
          )}

          <button onClick={() => onViewHistory(device)} className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition" title="View Config History">
            <History size={16} />
          </button>

          <button onClick={() => onViewEvents(device)} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition" title="View Event Logs">
            <Activity size={16} />
          </button>

          {canEdit && (
            isDeleted ? (
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
            )
          )}
        </div>
      </td>
    </tr>
  );
};

export default DeviceTableRow;