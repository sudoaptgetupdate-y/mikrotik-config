import { Activity, CheckCircle, AlertTriangle, XCircle, Archive, Server } from 'lucide-react';

// ✅ ฟังก์ชันช่วยแปลงค่า Latency สำหรับใช้ใน Helper
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
  if (isNaN(num)) return 0;
  if (str.includes('us')) return Math.round(num / 1000);
  if (str.includes('s') && !str.includes('ms')) return Math.round(num * 1000);
  return Math.round(num);
};

export const getDeviceStatus = (device) => {
  if (device.status === 'DELETED') {
    return { state: 'deleted', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: <Archive size={14}/>, label: 'Inactive' };
  }
  if (!device.lastSeen) return { state: 'offline', color: 'bg-red-50 text-red-600 border-red-200', icon: <XCircle size={14}/>, label: 'Offline' };
  
  const diffMinutes = (new Date() - new Date(device.lastSeen)) / 1000 / 60;
  if (diffMinutes > 3) return { state: 'offline', color: 'bg-red-50 text-red-600 border-red-200', icon: <XCircle size={14}/>, label: 'Offline' };
  
  const cpu = parseFloat(device.cpuLoad || 0);
  const ram = parseFloat(device.memoryUsage || 0);
  const storage = parseFloat(device.storage || 0);
  const temp = parseFloat(device.temp || 0);
  const latencyMs = parseLatencyToMs(device.latency); // ✅ ใช้ฟังก์ชันแปลงหน่วย
  
  // เช็คเงื่อนไข Warning (อ้างอิงค่า Default)
  if (cpu > 85 || ram > 85 || storage > 85 || temp > 60 || latencyMs > 80) {
    if (device.isAcknowledged) {
      return { state: 'acknowledged', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: <CheckCircle size={14}/>, label: 'Acknowledged' };
    }
    return { state: 'warning', color: 'bg-orange-50 text-orange-600 border-orange-200', icon: <AlertTriangle size={14}/>, label: 'Warning' };
  }
  
  return { state: 'online', color: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle size={14}/>, label: 'Online' };
};

export const FILTER_OPTIONS = [
  { value: 'ACTIVE_ONLY', label: 'Active Devices', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100' },
  { value: 'ONLINE', label: 'Online', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  { value: 'WARNING', label: 'Warning', icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-100' },
  { value: 'OFFLINE', label: 'Offline', icon: XCircle, color: 'text-red-500', bg: 'bg-red-100' },
  { value: 'DELETED', label: 'Inactive (Deleted)', icon: Archive, color: 'text-slate-500', bg: 'bg-slate-200' },
  { value: 'ALL', label: 'All Devices', icon: Server, color: 'text-slate-600', bg: 'bg-slate-100' },
];