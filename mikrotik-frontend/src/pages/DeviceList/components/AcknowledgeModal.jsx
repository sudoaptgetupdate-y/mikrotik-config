import { AlertTriangle, X, History, User, Clock, Loader2, CheckCircle } from 'lucide-react';

const AcknowledgeModal = ({ 
  isOpen, 
  onClose, 
  device, 
  ackReason, 
  setAckReason, 
  onSubmit, 
  isSubmitting,
  // 🟢 1. รับค่า thresholds เข้ามา พร้อมค่าตั้งต้นเผื่อมีปัญหา
  thresholds = { cpu: 85, ram: 85, storage: 85, temp: 60, latency: 80 } 
}) => {
  if (!isOpen) return null;

  let modalAckHistory = [];
  if (device?.ackReason) {
    if (Array.isArray(device.ackReason)) {
      modalAckHistory = device.ackReason;
    } else if (typeof device.ackReason === 'string') {
      try {
        modalAckHistory = JSON.parse(device.ackReason);
        if (!Array.isArray(modalAckHistory)) modalAckHistory = [];
      } catch (e) {
        modalAckHistory = [{ timestamp: device.ackAt || new Date(), reason: device.ackReason }];
      }
    }
  }

 
  const diffMinutes = device?.lastSeen ? (new Date() - new Date(device.lastSeen)) / 1000 / 60 : 999;
  const isOffline = diffMinutes > 3;

  const cpu = parseFloat(device?.cpu || device?.cpuLoad) || 0;
  const ram = parseFloat(device?.ram || device?.memoryUsage) || 0;
  const storage = parseFloat(device?.storage) || 0;
  const temp = parseFloat(device?.temp) || 0;
  
  // แปลงค่า Latency ที่ถูกต้อง
  let latencyMs = 0;
  if (device?.latency === "timeout") {
    latencyMs = 999;
  } else if (device?.latency) {
    const str = String(device.latency).toLowerCase();
    if (str.includes(':')) {
      const parts = str.split(':');
      const secAndMs = parts[parts.length - 1];
      if (secAndMs.includes('.')) {
        const [sec, frac] = secAndMs.split('.');
        latencyMs = (parseInt(sec, 10) * 1000) + parseInt(frac.padEnd(3, '0').substring(0,3), 10);
      } else {
        latencyMs = parseInt(secAndMs, 10) * 1000;
      }
    } else {
      const num = parseFloat(str.replace(/[^0-9.]/g, ''));
      if (str.includes('us')) latencyMs = Math.round(num / 1000);
      else if (str.includes('s') && !str.includes('ms')) latencyMs = Math.round(num * 1000);
      else latencyMs = Math.round(num);
    }
  }
  
  let warningText = [];
  if (isOffline) {
    warningText.push("Device Offline");
  } else {
    // 🟢 2. เปลี่ยนตัวเลขตายตัวให้มาใช้ตัวแปรจาก thresholds แทน
    if (cpu > thresholds.cpu) warningText.push(`CPU ${cpu}%`);
    if (ram > thresholds.ram) warningText.push(`RAM ${ram}%`);
    if (storage > thresholds.storage) warningText.push(`Storage ${storage}%`);
    if (temp > thresholds.temp) warningText.push(`Temp ${temp}°C`);
    if (latencyMs > thresholds.latency) warningText.push(`Ping ${latencyMs}ms`);
  }
  
  const currentWarning = warningText.length > 0 ? warningText.join(', ') : 'Unknown Status';

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <AlertTriangle className="text-orange-500" size={20} />
            Acknowledge System
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Device: <span className="text-blue-600">{device?.name}</span>
            </label>

            <div className="bg-orange-50 text-orange-700 p-3 rounded-lg text-sm border border-orange-200 mt-2 mb-3 flex items-center gap-2 font-medium">
               <AlertTriangle size={16}/> 
               Current Issue: <span className="font-bold text-red-600">{currentWarning}</span>
            </div>

            <p className="text-xs text-slate-500">กรุณาระบุสาเหตุหรือหมายเหตุสำหรับการรับทราบสถานะนี้</p>
          </div>
          
          <textarea
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition"
            rows="3"
            placeholder="เช่น อุปกรณ์กำลังรัน Backup ทำให้ Storage เต็ม / ไฟดับกำลังดำเนินการ..."
            value={ackReason}
            onChange={(e) => setAckReason(e.target.value)}
          ></textarea>

          {modalAckHistory && modalAckHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                <History size={14} /> Previous Acknowledges
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
                {modalAckHistory.slice().reverse().map((h, i) => (
                  <div key={i} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-slate-700 flex items-center gap-1 flex-wrap">
                        <User size={12} className="text-blue-500"/> {h.userName || "Unknown"}
                        {h.warningData && (
                          <span className="ml-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-black tracking-wide">
                            {h.warningData}
                          </span>
                        )}
                      </span>
                      <span className="text-slate-400 flex items-center gap-1 font-medium whitespace-nowrap">
                        <Clock size={12}/> {new Date(h.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1">{h.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition">
            Cancel
          </button>
          <button 
            onClick={onSubmit}
            disabled={isSubmitting || !ackReason.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white font-bold flex items-center gap-2 rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition shadow-sm"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            Save Acknowledge
          </button>
        </div>

      </div>
    </div>
  );
};

export default AcknowledgeModal;