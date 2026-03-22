import { Activity, CheckCircle, AlertTriangle, XCircle, Archive, Server } from 'lucide-react';

export const getDeviceStatus = (device, thresholds = { cpu: 85, ram: 85, storage: 85, temp: 60, latency: 80 }, t) => {
  if (device.status === 'DELETED') {
      return { state: 'deleted', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: <Archive size={14}/>, label: t ? t('devices.status.deleted') : 'Inactive' };
  }
  if (!device.lastSeen) return { state: 'offline', color: 'bg-red-50 text-red-600 border-red-200', icon: <XCircle size={14}/>, label: t ? t('devices.status.offline') : 'Offline' };
  
  const diffMinutes = (new Date() - new Date(device.lastSeen)) / 1000 / 60;
  if (diffMinutes > 3) return { state: 'offline', color: 'bg-red-50 text-red-600 border-red-200', icon: <XCircle size={14}/>, label: t ? t('devices.status.offline') : 'Offline' };
  
  const cpu = parseFloat(device.cpu || device.cpuLoad) || 0;
  const ram = parseFloat(device.ram || device.memoryUsage) || 0;
  const storage = parseFloat(device.storage) || 0; 
  const temp = parseFloat(device.temp) || 0;       
  
  let latencyMs = 0;
  if (device.latency === "timeout") {
    latencyMs = 999;
  } else if (device.latency) {
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
  
  // 🟢 เอาการ Return 'acknowledged' ออกไป ให้มันโชว์สถานะเป็น 'warning' สีส้มเสมอ
  if (cpu > thresholds.cpu || ram > thresholds.ram || storage > thresholds.storage || temp > thresholds.temp || latencyMs > thresholds.latency) {
    return { state: 'warning', color: 'bg-orange-50 text-orange-600 border-orange-200', icon: <AlertTriangle size={14}/>, label: t ? t('devices.status.warning') : 'Warning' };
  }
  
  return { state: 'online', color: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle size={14}/>, label: t ? t('devices.status.online') : 'Online' };
};

export const getFilterOptions = (t) => [
  { value: 'ACTIVE_ONLY', label: t('devices.filters.ACTIVE_ONLY'), icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100' },
  { value: 'ONLINE', label: t('devices.filters.ONLINE'), icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  { value: 'WARNING', label: t('devices.filters.WARNING'), icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-100' },
  { value: 'OFFLINE', label: t('devices.filters.OFFLINE'), icon: XCircle, color: 'text-red-500', bg: 'bg-red-100' },
  { value: 'DELETED', label: t('devices.filters.DELETED'), icon: Archive, color: 'text-slate-500', bg: 'bg-slate-200' },
  { value: 'ALL', label: t('devices.filters.ALL'), icon: Server, color: 'text-slate-600', bg: 'bg-slate-100' },
];