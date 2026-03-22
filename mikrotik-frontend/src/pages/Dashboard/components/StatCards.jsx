import React from 'react';
import { Router, Wifi, Radio, Bell, CheckCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const StatCards = ({ stats, onlinePercentage, onCardClick }) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Devices */}
      <div onClick={() => onCardClick('ACTIVE_ONLY')} className="relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden">
        <Router size={76} className="absolute -bottom-4 -right-2 text-blue-50 opacity-60 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500" />
        <div className="relative z-10">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-inner">
            <Router size={20} />
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide group-hover:text-blue-600 transition-colors">{t('dashboard.stats.total_devices')}</p>
          <h3 className="text-3xl font-black text-slate-800 mt-0.5">{stats.totalDevices}</h3>
        </div>
      </div>

      {/* Online Devices */}
      <div onClick={() => onCardClick('ONLINE')} className="relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden">
        <Wifi size={76} className="absolute -bottom-4 -right-2 text-emerald-50 opacity-60 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500" />
        <div className="relative z-10">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-inner">
            <CheckCircle size={20} />
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide group-hover:text-emerald-600 transition-colors">{t('dashboard.stats.online')}</p>
          <div className="flex items-end gap-2 mt-0.5">
            <h3 className="text-3xl font-black text-slate-800">{stats.onlineDevices}</h3>
            {stats.totalDevices > 0 && (<span className="text-xs font-bold text-emerald-500 mb-1">({Math.round(onlinePercentage)}%)</span>)}
          </div>
        </div>
      </div>

      {/* Offline Devices */}
      <div onClick={() => onCardClick('OFFLINE')} className="relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-rose-300 hover:shadow-lg hover:shadow-rose-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden">
        <Radio size={76} className="absolute -bottom-4 -right-2 text-rose-50 opacity-60 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500" />
        <div className="relative z-10">
          <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-rose-500 group-hover:text-white transition-colors duration-300 shadow-inner">
            <Radio size={20} />
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide group-hover:text-rose-600 transition-colors">{t('dashboard.stats.offline')}</p>
          <h3 className="text-3xl font-black text-slate-800 mt-0.5">{stats.offlineDevices}</h3>
        </div>
      </div>

      {/* Alerts */}
      <div onClick={() => onCardClick('WARNING')} className="relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-orange-300 hover:shadow-lg hover:shadow-orange-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden">
        <Bell size={76} className="absolute -bottom-4 -right-2 text-orange-50 opacity-60 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500" />
        <div className="relative z-10">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors duration-300 shadow-inner ${stats.activeAlerts > 0 ? 'bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-800 group-hover:text-white'}`}>
            <AlertTriangle size={20} />
          </div>
          <p className={`text-[11px] font-bold uppercase tracking-wide transition-colors ${stats.activeAlerts > 0 ? 'text-slate-400 group-hover:text-orange-600' : 'text-slate-400 group-hover:text-slate-600'}`}>{t('dashboard.stats.high_load')}</p>
          <h3 className={`text-3xl font-black mt-0.5 ${stats.activeAlerts > 0 ? 'text-orange-500' : 'text-slate-800'}`}>{stats.activeAlerts}</h3>
        </div>
      </div>
    </div>
  );
};

export default StatCards;