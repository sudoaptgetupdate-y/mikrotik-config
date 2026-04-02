import React from 'react';
import { Eye, Globe, User, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PublishSettings = ({ formData, setFormData, categories, user }) => {
  const { t } = useTranslation();

  const visibilityOptions = [
    { id: 'PUBLIC', icon: Globe, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'EMPLOYEE', icon: User, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'ADMIN', icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-50' }
  ];

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
        <div className="w-1 h-3 bg-emerald-500 rounded-full"></div>
        {t('articles.publish_settings')}
      </h4>
      
      <div className="space-y-5">
        {/* Status */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
            {t('devices.table.colStatus')}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {['DRAFT', 'PUBLISHED'].map(s => (
              <button 
                key={s} 
                type="button" 
                onClick={() => setFormData({...formData, status: s})} 
                className={`py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  formData.status === s 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                }`}
              >
                {t(`articles.status.${s.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Visibility */}
        <div className="space-y-2 pt-2 border-t border-slate-50">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 flex items-center gap-1">
            <Eye size={10} /> {t('articles.visibility', 'Visibility Level')}
          </label>
          <div className="flex flex-col gap-2">
            {visibilityOptions.map(v => (
              <button 
                key={v.id} 
                type="button" 
                onClick={() => setFormData({...formData, visibility: v.id})} 
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                  formData.visibility === v.id 
                  ? 'bg-white border-blue-200 shadow-sm ring-2 ring-blue-50' 
                  : 'bg-slate-50 border-slate-100 text-slate-400 opacity-60 hover:opacity-100'
                }`}
              >
                <v.icon size={16} className={formData.visibility === v.id ? v.color : 'text-slate-400'} />
                <div className="flex flex-col items-start text-left">
                  <span className={formData.visibility === v.id ? 'text-slate-800' : ''}>
                    {t(`articles.vis_${v.id.toLowerCase()}`, v.id)}
                  </span>
                </div>
                {formData.visibility === v.id && (
                  <div className="ml-auto bg-blue-500 w-1.5 h-1.5 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2 pt-2 border-t border-slate-50">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">
            {t('articles.category')}
          </label>
          <select 
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all" 
            value={formData.categoryId} 
            onChange={e => setFormData({...formData, categoryId: e.target.value})}
          >
            <option value="">{t('articles.no_category')}</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Pin Article */}
        {user?.role === 'SUPER_ADMIN' && (
          <div className="pt-4 border-t border-slate-50">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative inline-flex items-center">
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={formData.isPinned}
                  onChange={(e) => setFormData({...formData, isPinned: e.target.checked})}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </div>
              <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600 transition-colors uppercase tracking-widest">
                {t('articles.pin_article')}
              </span>
            </label>
            <p className="text-[10px] text-slate-400 mt-2 ml-14 font-medium italic leading-tight">
              {t('articles.pin_hint')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublishSettings;
