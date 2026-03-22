import { useState, useEffect } from 'react';
import { Activity, ShieldAlert, ClipboardList, Save, CalendarClock } from 'lucide-react';
import apiClient from '../../../utils/apiClient';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

export default function TabMaintenance() {
  const { t } = useTranslation();
  
  // ==========================================
  // States สำหรับ Auto Cleanup
  // ==========================================
  const [auditDays, setAuditDays] = useState(90);
  const [eventDays, setEventDays] = useState(60);
  const [isSaving, setIsSaving] = useState(false);

  // ดึงค่าการตั้งค่าปัจจุบันจาก Database เมื่อเปิดหน้าเว็บ
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await apiClient.get('/api/settings'); 
        const settings = res.data || [];
        
        const audit = settings.find(s => s.key === 'AUDIT_LOG_RETENTION_DAYS');
        const event = settings.find(s => s.key === 'EVENT_LOG_RETENTION_DAYS');
        
        if (audit) setAuditDays(Number(audit.value));
        if (event) setEventDays(Number(event.value));
      } catch (error) {
        console.error('Failed to load cleanup settings', error);
      }
    };
    fetchSettings();
  }, []);

  // ฟังก์ชันบันทึกการตั้งค่า Auto Cleanup
  const handleSaveAutoCleanup = async () => {
    setIsSaving(true);
    try {
      // ยิง API ไปบันทึกค่าลงตาราง SystemSetting
      await apiClient.post('/api/settings/update', { 
        key: 'AUDIT_LOG_RETENTION_DAYS', 
        value: auditDays.toString(),
        description: 'Audit Log Retention Days'
      });
      await apiClient.post('/api/settings/update', { 
        key: 'EVENT_LOG_RETENTION_DAYS', 
        value: eventDays.toString(),
        description: 'Event Log Retention Days'
      });
      
      toast.success(t('settings.maintenance.toast_auto_success'));
    } catch (error) {
      toast.error(t('common.error'));
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // Handlers สำหรับ Manual Cleanup
  // ==========================================
  const handleClearAckHistory = async (days) => {
    const result = await Swal.fire({
      title: t('settings.maintenance.swal_confirm.title'),
      text: t('settings.maintenance.swal_confirm.text_ack', { days }),
      icon: 'warning', 
      showCancelButton: true,
      confirmButtonText: t('settings.maintenance.swal_confirm.confirm'),
      cancelButtonText: t('common.cancel'),
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl p-6 border-2 border-rose-100 shadow-2xl', 
        title: 'text-xl font-bold text-rose-600', 
        htmlContainer: 'text-sm text-slate-600 font-medium mt-2 leading-relaxed',
        actions: 'flex gap-3 mt-6 w-full justify-center',
        confirmButton: 'bg-rose-600 hover:bg-rose-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-bold transition-all'
      }
    });

    if (result.isConfirmed) {
      const clearPromise = apiClient.post('/api/devices/maintenance/clear-ack', { days });
      toast.promise(clearPromise, {
        loading: t('common.loading'),
        success: (res) => t('settings.maintenance.toast_manual_success', { count: res.data.affectedDevices }),
        error: (err) => `${t('common.error')}: ${err.response?.data?.error || err.message}`
      });
      try { await clearPromise; } catch (e) {}
    }
  };

  const handleClearEventHistory = async (days) => {
    const result = await Swal.fire({
      title: t('settings.maintenance.swal_confirm.title'),
      text: t('settings.maintenance.swal_confirm.text_event', { days }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('settings.maintenance.swal_confirm.confirm'),
      cancelButtonText: t('common.cancel'),
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl p-6 border-2 border-orange-100 shadow-2xl',
        title: 'text-xl font-bold text-orange-600',
        htmlContainer: 'text-sm text-slate-600 font-medium mt-2 leading-relaxed',
        actions: 'flex gap-3 mt-6 w-full justify-center',
        confirmButton: 'bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all', 
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-bold transition-all'
      }
    });

    if (result.isConfirmed) {
      const clearPromise = apiClient.post('/api/devices/maintenance/clear-events', { days });
      toast.promise(clearPromise, {
        loading: t('common.loading'),
        success: (res) => t('settings.maintenance.toast_manual_success', { count: res.data.deletedCount }),
        error: (err) => `${t('common.error')}: ${err.response?.data?.error || err.message}`
      });
      try { await clearPromise; } catch (e) {}
    }
  };

  const handleClearActivityLog = async (days) => {
    const result = await Swal.fire({
      title: t('settings.maintenance.swal_confirm.title'),
      text: t('settings.maintenance.swal_confirm.text_audit', { days }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('settings.maintenance.swal_confirm.confirm'),
      cancelButtonText: t('common.cancel'),
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl p-6 border-2 border-blue-100 shadow-2xl',
        title: 'text-xl font-bold text-blue-600',
        htmlContainer: 'text-sm text-slate-600 font-medium mt-2 leading-relaxed',
        actions: 'flex gap-3 mt-6 w-full justify-center',
        confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all', 
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-bold transition-all'
      }
    });

    if (result.isConfirmed) {
      const clearPromise = apiClient.post('/api/devices/maintenance/clear-activity-logs', { days });
      toast.promise(clearPromise, {
        loading: t('common.loading'),
        success: (res) => t('settings.maintenance.toast_manual_success', { count: res.data.deletedCount }),
        error: (err) => `${t('common.error')}: ${err.response?.data?.error || err.message}`
      });
      try { await clearPromise; } catch (e) {}
    }
  };

  // ==========================================
  // Render
  // ==========================================
  return (
    <div className="flex-1 space-y-10">
      
      {/* ส่วนหัว */}
      <div className="pb-4 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-800">{t('settings.maintenance.title')}</h3>
        <p className="text-sm text-slate-500">{t('settings.maintenance.desc')}</p>
      </div>

      {/* 🟢 ส่วนที่เพิ่มใหม่: Auto Cleanup Settings */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h4 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
              <CalendarClock className="text-blue-600" size={24} /> 
              {t('settings.maintenance.auto_title')}
            </h4>
            <p className="text-sm text-slate-600 mt-1">
              {t('settings.maintenance.auto_desc')}
            </p>
          </div>
          <button 
            onClick={handleSaveAutoCleanup} 
            disabled={isSaving} 
            className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 shrink-0"
          >
            <Save size={18} /> {isSaving ? t('settings.maintenance.saving') : t('settings.maintenance.save_auto')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded-xl border border-slate-200">
          {/* Input: Audit Log */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t('settings.maintenance.audit_label')}</label>
            <div className="relative">
              <input 
                type="number" 
                value={auditDays} 
                onChange={e => setAuditDays(e.target.value)} 
                className="w-full pl-4 pr-16 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-slate-800 outline-none transition-all" 
                min="1" 
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">{t('settings.maintenance.days_unit')}</span>
            </div>
            <p className="text-xs text-slate-500">{t('settings.maintenance.audit_tip')}</p>
          </div>

          {/* Input: Event Log */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">{t('settings.maintenance.event_label')}</label>
            <div className="relative">
              <input 
                type="number" 
                value={eventDays} 
                onChange={e => setEventDays(e.target.value)} 
                className="w-full pl-4 pr-16 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-slate-800 outline-none transition-all" 
                min="1" 
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">{t('settings.maintenance.days_unit')}</span>
            </div>
            <p className="text-xs text-slate-500">{t('settings.maintenance.event_tip')}</p>
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* 🔴 ส่วนเดิม: Manual Emergency Cleanup */}
      <div>
        <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4 text-lg">
          <ShieldAlert className="text-rose-500" size={24} /> 
          {t('settings.maintenance.manual_title')}
        </h4>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 md:p-6 flex flex-col">
            <h4 className="font-bold text-rose-800 flex items-center gap-2 mb-2">
              <ShieldAlert size={20} /> {t('settings.maintenance.clear_ack')}
            </h4>
            <p className="text-sm text-rose-700 mb-6 leading-relaxed">{t('settings.maintenance.clear_ack_desc')}</p>
            <div className="flex flex-wrap gap-2 mt-auto">
              <button onClick={() => handleClearAckHistory(30)} className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-100 px-3 py-2 rounded-lg text-sm font-bold transition-colors">{t('settings.maintenance.clear_btn', { days: 30 })}</button>
              <button onClick={() => handleClearAckHistory(60)} className="bg-white border border-rose-200 text-rose-600 hover:bg-rose-100 px-3 py-2 rounded-lg text-sm font-bold transition-colors">{t('settings.maintenance.clear_btn', { days: 60 })}</button>
              <button onClick={() => handleClearAckHistory(90)} className="bg-rose-600 text-white hover:bg-rose-700 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">{t('settings.maintenance.clear_btn', { days: 90 })}</button>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 md:p-6 flex flex-col">
            <h4 className="font-bold text-orange-800 flex items-center gap-2 mb-2">
              <Activity size={20} /> {t('settings.maintenance.clear_events')}
            </h4>
            <p className="text-sm text-orange-700 mb-6 leading-relaxed">{t('settings.maintenance.clear_events_desc')}</p>
            <div className="flex flex-wrap gap-2 mt-auto">
              <button onClick={() => handleClearEventHistory(30)} className="bg-white border border-orange-200 text-orange-600 hover:bg-orange-100 px-3 py-2 rounded-lg text-sm font-bold transition-colors">{t('settings.maintenance.clear_btn', { days: 30 })}</button>
              <button onClick={() => handleClearEventHistory(60)} className="bg-white border border-orange-200 text-orange-600 hover:bg-orange-100 px-3 py-2 rounded-lg text-sm font-bold transition-colors">{t('settings.maintenance.clear_btn', { days: 60 })}</button>
              <button onClick={() => handleClearEventHistory(90)} className="bg-orange-600 text-white hover:bg-orange-700 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">{t('settings.maintenance.clear_btn', { days: 90 })}</button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 md:p-6 flex flex-col">
            <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
              <ClipboardList size={20} /> {t('settings.maintenance.clear_audit')}
            </h4>
            <p className="text-sm text-blue-700 mb-6 leading-relaxed">{t('settings.maintenance.clear_audit_desc')}</p>
            <div className="flex flex-wrap gap-2 mt-auto">
              <button onClick={() => handleClearActivityLog(30)} className="bg-white border border-blue-200 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg text-sm font-bold transition-colors">{t('settings.maintenance.clear_btn', { days: 30 })}</button>
              <button onClick={() => handleClearActivityLog(60)} className="bg-white border border-blue-200 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg text-sm font-bold transition-colors">{t('settings.maintenance.clear_btn', { days: 60 })}</button>
              <button onClick={() => handleClearActivityLog(90)} className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">{t('settings.maintenance.clear_btn', { days: 90 })}</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}