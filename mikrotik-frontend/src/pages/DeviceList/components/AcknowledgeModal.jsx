import React, { useEffect } from 'react';
import { AlertTriangle, X, History, User, Clock, Loader2, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

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
    warningText.push(t('devices.ack.issueOffline', 'Device Offline'));
  } else {
    // 🟢 2. เปลี่ยนตัวเลขตายตัวให้มาใช้ตัวแปรจาก thresholds แทน
    if (cpu > thresholds.cpu) warningText.push(`${t('devices.table.cpu', 'CPU')} ${cpu}%`);
    if (ram > thresholds.ram) warningText.push(`${t('devices.table.ram', 'RAM')} ${ram}%`);
    if (storage > thresholds.storage) warningText.push(`${t('devices.table.storage', 'Storage')} ${storage}%`);
    if (temp > thresholds.temp) warningText.push(`${t('devices.table.temp', 'Temp')} ${temp}°C`);
    if (latencyMs > thresholds.latency) warningText.push(`${t('devices.table.latency', 'Ping')} ${latencyMs}ms`);
  }
  
  const currentWarning = warningText.length > 0 ? warningText.join(', ') : t('devices.ack.unknownStatus', 'Unknown Status');

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isOpen ? 'opacity-100 visible' : 'opacity-0 pointer-events-none invisible'
      }`}
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      <div 
        className={`bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col relative z-10 transition-all duration-300 transform ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-2xl">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-black text-xl text-slate-800 tracking-tight">{t('devices.ack.title', 'Acknowledge System')}</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('devices.ack.subtitle', 'Update Device Status')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              {t('devices.ack.deviceName', 'Device:')} <span className="text-blue-600">{device?.name}</span>
            </label>

            <div className="bg-orange-50 text-orange-700 p-3 rounded-lg text-sm border border-orange-200 mt-2 mb-3 flex items-center gap-2 font-medium">
               <AlertTriangle size={16}/> 
               {t('devices.ack.currentIssue', 'Current Issue:')} <span className="font-bold text-red-600">{currentWarning}</span>
            </div>

            <p className="text-xs text-slate-500">{t('devices.ack.instruction', 'Please provide a reason or note for acknowledging this status.')}</p>
          </div>
          
          <textarea
            className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition"
            rows="3"
            placeholder={t('devices.ack.placeholder', 'e.g. Device is running backup causing full storage / Power outage in progress...')}
            value={ackReason}
            onChange={(e) => setAckReason(e.target.value)}
          ></textarea>

          {modalAckHistory && modalAckHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                <History size={14} /> {t('devices.ack.previousAcks', 'Previous Acknowledges')}
              </h4>
              <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
                {modalAckHistory.slice().reverse().map((h, i) => (
                  <div key={i} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-slate-700 flex items-center gap-1 flex-wrap">
                        <User size={12} className="text-blue-500"/> {h.userName || t('devices.ack.unknownUser', 'Unknown User')}
                        {h.warningData && (
                          <span className="ml-1 bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-black tracking-wide">
                            {h.warningData}
                          </span>
                        )}
                      </span>
                      <span className="text-slate-400 flex items-center gap-1 font-medium whitespace-nowrap">
                        <Clock size={12}/> {new Date(h.timestamp).toLocaleString(i18n.language, { dateStyle: 'short', timeStyle: 'short' })}
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
            {t('common.cancel', 'Cancel')}
          </button>
          <button 
            onClick={onSubmit}
            disabled={isSubmitting || !ackReason.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white font-bold flex items-center gap-2 rounded-xl hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition shadow-sm"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
            {t('devices.ack.saveButton', 'Save Acknowledge')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AcknowledgeModal;