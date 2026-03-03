import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const AcknowledgeModal = ({ isOpen, onClose, device, reason, setReason, onSubmit, isSubmitting }) => {
  if (!isOpen || !device) return null;

  // ✅ ฟังก์ชันช่วยแปลงค่า Latency
  const parseLatencyToMs = (latencyStr) => {
    if (!latencyStr || latencyStr === "timeout") return 999;
    const str = String(latencyStr).toLowerCase();
    if (str.includes(':')) {
      const parts = str.split(':');
      const secAndMs = parts[parts.length - 1];
      if (secAndMs.includes('.')) {
        const [sec, frac] = secAndMs.split('.');
        return (parseInt(sec, 10) * 1000) + parseInt(frac.padEnd(3, '0').substring(0,3), 10);
      }
      return parseInt(secAndMs, 10) * 1000;
    }
    const num = parseFloat(str.replace(/[^0-9.]/g, ''));
    if (str.includes('us')) return Math.round(num / 1000);
    if (str.includes('s') && !str.includes('ms')) return Math.round(num * 1000);
    return Math.round(num);
  };

  const cpu = parseFloat(device.cpuLoad || 0);
  const ram = parseFloat(device.memoryUsage || 0);
  const storage = parseFloat(device.storage || 0);
  const temp = parseFloat(device.temp || 0);
  const latencyMs = parseLatencyToMs(device.latency);

  let warningText = [];
  if (cpu > 85) warningText.push(`CPU ${cpu}%`);
  if (ram > 85) warningText.push(`RAM ${ram}%`);
  if (storage > 85) warningText.push(`Storage ${storage}%`);
  if (temp > 60) warningText.push(`Temp ${temp}°C`);
  if (latencyMs > 80) warningText.push(`Ping ${latencyMs}ms`);

  const currentWarning = warningText.join(', ') || 'High Load Detected';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
        <div className="bg-orange-50 p-6 border-b border-orange-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Acknowledge Issue</h3>
              <p className="text-orange-700 text-sm font-medium">{device.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Current Issue</p>
            <p className="text-slate-700 font-bold">{currentWarning}</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Update / Reason</label>
            <textarea
              className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none min-h-[100px] text-slate-700"
              placeholder="กรุณาระบุสาเหตุหรือสถานะการแก้ไข..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <div className="p-6 bg-slate-50 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitting || !reason.trim()}
            className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 transition-all"
          >
            {isSubmitting ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcknowledgeModal;