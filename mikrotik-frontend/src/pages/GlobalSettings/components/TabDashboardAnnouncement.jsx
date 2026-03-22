import React, { useState, useEffect } from 'react';
import { Megaphone, Save, Loader2 } from 'lucide-react';
import { settingService } from '../../../services/settingService';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

const TabDashboardAnnouncement = ({ initialData }) => {
  const { t } = useTranslation();
  const [announcement, setAnnouncement] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (initialData) {
      setAnnouncement(initialData);
    }
  }, [initialData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await settingService.updateSettings('DASHBOARD_ANNOUNCEMENT', announcement);
      toast.success(t('settings.announcement.toast_success'));
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (error) {
      console.error('Save announcement error:', error);
      toast.error(t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
          <Megaphone size={24} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">{t('settings.announcement.title')}</h3>
          <p className="text-sm text-slate-500">{t('settings.announcement.desc')}</p>
        </div>
      </div>

      <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
        <div>
          <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-wider">{t('settings.announcement.label_text')}</label>
          <textarea
            value={announcement}
            onChange={(e) => setAnnouncement(e.target.value)}
            className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition min-h-[120px] resize-none"
            placeholder={t('settings.announcement.placeholder')}
          />
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">{t('settings.announcement.label_preview')}</label>
          <div className="bg-slate-900 h-10 rounded-xl flex items-center overflow-hidden border-2 border-slate-800">
            <div className="whitespace-nowrap animate-marquee text-white text-sm font-bold flex gap-10 items-center">
              <span>{announcement || t('settings.announcement.preview_empty')}</span>
              <span>{announcement || t('settings.announcement.preview_empty')}</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition shadow-md shadow-blue-500/20"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {t('settings.announcement.save_button')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TabDashboardAnnouncement;
