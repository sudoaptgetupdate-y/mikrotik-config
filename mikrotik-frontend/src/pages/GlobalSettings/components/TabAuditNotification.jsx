import { useState, useEffect } from 'react';
import { Save, Bell, Info, Loader2, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingService } from '../../../services/settingService';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import apiClient from '../../../utils/apiClient';

const TabAuditNotification = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  
  const [config, setConfig] = useState({
    enabled: false,
    botToken: '',
    chatId: ''
  });
  
  const [isTesting, setIsTesting] = useState(false);

  // Load existing settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingService.getSettings()
  });

  useEffect(() => {
    if (settings) {
      const auditConfig = settings.find(s => s.key === 'AUDIT_TELEGRAM_CONFIG');
      if (auditConfig) {
        try {
          const parsed = typeof auditConfig.value === 'string' ? JSON.parse(auditConfig.value) : auditConfig.value;
          setConfig({
            enabled: parsed.enabled || false,
            botToken: parsed.botToken || '',
            chatId: parsed.chatId || ''
          });
        } catch (e) {
          console.error("Failed to parse AUDIT_TELEGRAM_CONFIG", e);
        }
      }
    }
  }, [settings]);

  // Mutation for saving
  const updateMutation = useMutation({
    mutationFn: (newData) => settingService.updateSetting('AUDIT_TELEGRAM_CONFIG', JSON.stringify(newData)),
    onSuccess: () => {
      queryClient.invalidateQueries(['settings']);
      toast.success(t('settings.audit.save_success'));
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || t('common.error_default'));
    }
  });

  const handleSave = () => {
    updateMutation.mutate(config);
  };

  const handleTest = async () => {
    if (!config.botToken || !config.chatId) {
      toast.error(t('groups.form.telegram_missing'));
      return;
    }

    setIsTesting(true);
    try {
      const testMsg = `🔔 <b>Test Audit Notification</b>\n━━━━━━━━━━━━━━━━━━\nThis is a test message to verify your Audit Telegram configuration.\n\n✅ <b>Status:</b> Ready\n━━━━━━━━━━━━━━━━━━`;
      
      // Use the generic telegram test endpoint or a specialized one if exists
      // Assuming there's a utility or we can just call a test API
      await apiClient.post('/api/telegram/test', {
        botToken: config.botToken,
        chatId: config.chatId,
        message: testMsg
      });
      
      toast.success(t('groups.form.telegram_success'));
    } catch (error) {
      console.error("Telegram Test Error:", error);
      toast.error(t('groups.form.telegram_error'));
    } finally {
      setIsTesting(false);
    }
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
          <Bell className="text-blue-600" size={24} />
          {t('settings.audit.title')}
        </h2>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          {t('settings.audit.subtitle')}
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
        <Info className="text-blue-600 shrink-0" size={20} />
        <div className="text-sm text-blue-800 leading-relaxed font-medium">
          <p className="font-bold mb-1">{t('settings.audit.title')}</p>
          <p>{t('settings.audit.info_desc')}</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Toggle Enabled */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <p className="text-sm font-bold text-slate-700">{t('settings.audit.label_enabled')}</p>
            <p className="text-xs text-slate-500">{config.enabled ? 'Notifications are active' : 'Notifications are paused'}</p>
          </div>
          <button
            onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        {/* Bot Token */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">
            {t('settings.audit.label_bot_token')}
          </label>
          <input
            type="password"
            value={config.botToken}
            onChange={(e) => setConfig(prev => ({ ...prev, botToken: e.target.value }))}
            placeholder={t('settings.audit.placeholder_bot_token')}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700 bg-slate-50/50"
          />
        </div>

        {/* Chat ID */}
        <div className="space-y-2">
          <label className="text-sm font-bold text-slate-700">
            {t('settings.audit.label_chat_id')}
          </label>
          <input
            type="text"
            value={config.chatId}
            onChange={(e) => setConfig(prev => ({ ...prev, chatId: e.target.value }))}
            placeholder={t('settings.audit.placeholder_chat_id')}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium text-slate-700 bg-slate-50/50"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={updateMutation.isLoading}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-blue-200"
          >
            {updateMutation.isLoading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            {t('common.save')}
          </button>
          
          <button
            onClick={handleTest}
            disabled={isTesting}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 active:scale-95 transition-all disabled:opacity-50"
          >
            {isTesting ? <Loader2 className="animate-spin" size={20} /> : <Send size={18} />}
            {t('groups.form.test_button')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TabAuditNotification;
