import { Activity, CheckCircle, AlertTriangle, XCircle, Archive, Server } from 'lucide-react';

export const getDeviceStatus = (device) => {
  if (device.status === 'DELETED') {
      return { state: 'deleted', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: <Archive size={14}/>, label: 'Inactive' };
  }
  if (!device.lastSeen) return { state: 'offline', color: 'bg-red-50 text-red-600 border-red-200', icon: <XCircle size={14}/>, label: 'Offline' };
  
  const diffMinutes = (new Date() - new Date(device.lastSeen)) / 1000 / 60;
  if (diffMinutes > 3) return { state: 'offline', color: 'bg-red-50 text-red-600 border-red-200', icon: <XCircle size={14}/>, label: 'Offline' };
  
  const cpu = parseFloat(device.cpu || device.cpuLoad) || 0;
  const ram = parseFloat(device.ram || device.memoryUsage) || 0;
  
  if (cpu > 85 || ram > 85) {
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