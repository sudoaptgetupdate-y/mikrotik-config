import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Radio, Clock, MapPin, CheckCircle2 } from 'lucide-react';

const OfflineDevices = ({ devices }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1.5 h-5 bg-rose-500 rounded-full"></div>
        <h3 className="text-base font-black text-slate-800">{t('dashboard.sections.offline_alerts')}</h3>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {devices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center min-h-[200px]">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
              <CheckCircle2 size={28} className="text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-slate-500">{t('common.no_data')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto custom-scrollbar">
            {devices.map((device) => {
              const lastSeenDate = device.lastSeen ? new Date(device.lastSeen) : null;
              const locale = i18n.language === 'en' ? 'en-US' : 'th-TH';
              const timeStr = lastSeenDate ? lastSeenDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : 'N/A';
              const dateStr = lastSeenDate ? lastSeenDate.toLocaleDateString(locale, { day: '2-digit', month: 'short' }) : '';

              return (
                <div 
                  key={device.id} 
                  onClick={() => navigate(`/devices?search=${encodeURIComponent(device.name)}&filter=OFFLINE`)}
                  className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    {/* High-Visibility Radio Alert Icon */}
                    <div className="relative flex items-center justify-center shrink-0">
                        <span className="absolute inline-flex h-full w-full rounded-xl bg-rose-400 opacity-25 animate-ping"></span>
                        <div className="relative w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all duration-500">
                            <Radio size={18} className="animate-pulse" />
                        </div>
                    </div>

                    <div className="min-w-0 ml-1">
                      <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-rose-600 transition-colors">{device.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <MapPin size={10} /> {device.currentIp}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full uppercase tracking-tighter border border-rose-100">
                      OFFLINE
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <Clock size={10} /> {dateStr} {timeStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OfflineDevices;
