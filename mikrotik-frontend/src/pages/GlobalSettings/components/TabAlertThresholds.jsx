import { useState } from 'react';
import { Save, Bell, Loader2, Cpu, MemoryStick, Activity, Thermometer, HardDrive } from 'lucide-react';
import apiClient from '../../../utils/apiClient';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export default function TabAlertThresholds({ initialData }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // ✅ เพิ่ม Storage ในค่าเริ่มต้น
  const defaultThresholds = { cpu: 85, ram: 85, latency: 80, temp: 60, storage: 85 };
  
  let parsedData = defaultThresholds;
  if (initialData) {
    try { 
      parsedData = typeof initialData === 'string' ? JSON.parse(initialData) : initialData; 
    } catch(e) {}
  }

  const [thresholds, setThresholds] = useState({ ...defaultThresholds, ...parsedData });
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (key, value) => {
    setThresholds(prev => ({ ...prev, [key]: Number(value) }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    const savePromise = apiClient.put(`/api/settings/ALERT_THRESHOLDS`, { value: JSON.stringify(thresholds) });
    
    toast.promise(savePromise, {
      loading: t('common.saving') || 'กำลังบันทึกข้อมูล...',
      success: t('settings.alerts.toast_success'),
      error: (err) => `${t('common.error')}: ${err.message}`
    });

    try {
      await savePromise;
      queryClient.invalidateQueries({ queryKey: ['settings'] }); 
    } catch (error) { console.error(error); } 
    finally { setIsSaving(false); }
  };

  return (
    <div className="flex-1 flex flex-col h-full animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Bell size={20} className="text-rose-500" /> {t('settings.alerts.title')}
          </h3>
          <p className="text-sm text-slate-500 mt-1">{t('settings.alerts.desc')}</p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm">
          {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} {t('settings.alerts.save_button')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* CPU Setting */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0"><Cpu size={20}/></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">{t('settings.alerts.unit_percent')}</span>
          </div>
          <div className="flex-1 flex flex-col">
            <label className="block text-sm font-bold text-slate-700 mb-3 min-h-[2.5rem] leading-snug">
              {t('settings.alerts.cpu')}
            </label>
            <div className="relative mt-auto">
              <input type="number" min="1" max="100" value={thresholds.cpu} onChange={(e) => handleChange('cpu', e.target.value)} className="w-full text-base font-black text-slate-700 bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
            </div>
          </div>
        </div>

        {/* RAM Usage Setting */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0"><MemoryStick size={20}/></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">{t('settings.alerts.unit_percent')}</span>
          </div>
          <div className="flex-1 flex flex-col">
            <label className="block text-sm font-bold text-slate-700 mb-3 min-h-[2.5rem] leading-snug">
              {t('settings.alerts.ram')}
            </label>
            <div className="relative mt-auto">
              <input type="number" min="1" max="100" value={thresholds.ram} onChange={(e) => handleChange('ram', e.target.value)} className="w-full text-base font-black text-slate-700 bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
            </div>
          </div>
        </div>

        {/* Storage Setting */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-purple-300 hover:shadow-md transition-all flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shrink-0"><HardDrive size={20}/></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">{t('settings.alerts.unit_percent')}</span>
          </div>
          <div className="flex-1 flex flex-col">
            <label className="block text-sm font-bold text-slate-700 mb-3 min-h-[2.5rem] leading-snug">
              {t('settings.alerts.storage')}
            </label>
            <div className="relative mt-auto">
              <input type="number" min="1" max="100" value={thresholds.storage} onChange={(e) => handleChange('storage', e.target.value)} className="w-full text-base font-black text-slate-700 bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
            </div>
          </div>
        </div>

        {/* Latency (Ping) Setting */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-emerald-300 hover:shadow-md transition-all flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0"><Activity size={20}/></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">{t('settings.alerts.unit_ms')}</span>
          </div>
          <div className="flex-1 flex flex-col">
            <label className="block text-sm font-bold text-slate-700 mb-3 min-h-[2.5rem] leading-snug">
              {t('settings.alerts.latency')}
            </label>
            <div className="relative mt-auto">
              <input type="number" min="1" max="999" value={thresholds.latency} onChange={(e) => handleChange('latency', e.target.value)} className="w-full text-base font-black text-slate-700 bg-white border border-slate-200 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">ms</span>
            </div>
          </div>
        </div>

        {/* Temperature Setting */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-orange-300 hover:shadow-md transition-all flex flex-col h-full">
          <div className="flex justify-between items-start mb-4">
            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shrink-0"><Thermometer size={20}/></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">{t('settings.alerts.unit_c')}</span>
          </div>
          <div className="flex-1 flex flex-col">
            <label className="block text-sm font-bold text-slate-700 mb-3 min-h-[2.5rem] leading-snug">
              {t('settings.alerts.temp')}
            </label>
            <div className="relative mt-auto">
              <input type="number" min="1" max="150" value={thresholds.temp} onChange={(e) => handleChange('temp', e.target.value)} className="w-full text-base font-black text-slate-700 bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all shadow-sm" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">°C</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}