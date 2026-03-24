import { useState, useEffect } from 'react';
import { Save, Globe, Info, Loader2, Server } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingService } from '../../../services/settingService';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const TabSystemSettings = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [heartbeatUrl, setHeartbeatUrl] = useState('');

  // โหลดข้อมูลการตั้งค่าเดิม
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingService.getSettings()
  });

  useEffect(() => {
    if (settings) {
      const systemConfig = settings.find(s => s.key === 'SYSTEM_CONFIG');
      if (systemConfig) {
        try {
          const parsed = typeof systemConfig.value === 'string' ? JSON.parse(systemConfig.value) : systemConfig.value;
          setHeartbeatUrl(parsed.heartbeatUrl || '');
        } catch (e) {
          console.error("Failed to parse SYSTEM_CONFIG", e);
        }
      }
    }
  }, [settings]);

  // Mutation สำหรับบันทึกข้อมูล
  const updateMutation = useMutation({
    mutationFn: (newData) => settingService.updateSetting('SYSTEM_CONFIG', JSON.stringify(newData)),
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
      toast.success(t('settings.system.save_success'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error_default'));
    }
  });

  const handleSave = () => {
    updateMutation.mutate({ heartbeatUrl });
  };

  const getPreviewUrl = () => {
    if (!heartbeatUrl) return `${window.location.origin}/api/devices/heartbeat`;
    const baseUrl = heartbeatUrl.trim().replace(/\/$/, "");
    return baseUrl.endsWith("/api/devices/heartbeat") 
      ? baseUrl 
      : `${baseUrl}/api/devices/heartbeat`;
  };

  if (isLoading) return (
    <div className="flex justify-center items-center py-20">
      <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Server className="text-blue-600" size={24} />
          {t('settings.system.title')}
        </h2>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          {t('settings.system.subtitle')}
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
        <Info className="text-blue-600 shrink-0" size={20} />
        <div className="text-sm text-blue-800 leading-relaxed font-medium">
          <p className="font-bold mb-1">{t('settings.system.info_title')}</p>
          <p dangerouslySetInnerHTML={{ 
            __html: t('settings.system.info_desc', { url: `<code>${window.location.origin}/api/devices/heartbeat</code>` }) 
          }} />
          <p className="mt-1 italic opacity-80">{t('settings.system.info_note')}</p>
        </div>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <Globe size={16} className="text-slate-400" />
            {t('settings.system.label_server')}
          </label>
          <input
            type="url"
            value={heartbeatUrl}
            onChange={(e) => setHeartbeatUrl(e.target.value)}
            placeholder={t('settings.system.placeholder_server')}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700 bg-slate-50/50"
          />
          <p className="text-[11px] text-slate-400 font-medium px-1" dangerouslySetInnerHTML={{ __html: t('settings.system.hint_path') }} />
        </div>

        {/* URL Preview Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t('settings.system.preview_title')}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${heartbeatUrl ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
              {heartbeatUrl ? t('settings.system.preview_manual') : t('settings.system.preview_auto')}
            </span>
          </div>
          <div className="font-mono text-sm text-slate-600 break-all bg-white p-3 rounded-lg border border-slate-100 shadow-inner">
            {getPreviewUrl()}
          </div>
          <p className="text-[11px] text-slate-400 italic">
            {t('settings.system.preview_hint')}
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={updateMutation.isLoading}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
          >
            {updateMutation.isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TabSystemSettings;
