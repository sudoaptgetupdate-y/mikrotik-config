import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Zap, Clock, CheckCircle2 } from 'lucide-react';

const TopUptimeDevices = ({ devices }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ฟังก์ชันแปลง Uptime ของ MikroTik (ที่มักจะหยุดแค่ weeks) ให้แสดงเป็น years
  const formatUptimeWithYears = (uptimeStr) => {
    if (!uptimeStr || uptimeStr === 'N/A') return 'Unknown';
    
    // ดึงค่า weeks
    const weeksMatch = uptimeStr.match(/(\d+)w/);
    if (!weeksMatch) return uptimeStr;

    let weeks = parseInt(weeksMatch[1]);
    if (weeks < 52) return uptimeStr; // ถ้าไม่ถึงปี ให้แสดงแบบเดิม

    const years = Math.floor(weeks / 52);
    const remainingWeeks = weeks % 52;
    
    // สร้างข้อความใหม่ เช่น "1y 14w 1d..."
    let newUptime = `${years}y ${remainingWeeks > 0 ? remainingWeeks + 'w ' : ''}`;
    // เติมส่วนที่เหลือ (days และ time)
    const restOfUptime = uptimeStr.replace(/^\d+w/, '').trim();
    return newUptime + restOfUptime;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div>
        <h3 className="text-base font-black text-slate-800">{t('dashboard.sections.top_uptime')}</h3>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
        {devices.length === 0 ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center min-h-[200px]">
            <p className="text-sm font-medium">{t('common.no_data')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto custom-scrollbar">
            {devices.map((device, index) => (
              <div 
                key={device.id} 
                onClick={() => navigate(`/devices?search=${encodeURIComponent(device.name)}`)}
                className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                    <Zap size={18} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-emerald-600 transition-colors">{device.name}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{device.deviceModel?.name || 'MikroTik'}</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs font-black text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                    {formatUptimeWithYears(device.uptime)}
                  </span>
                  {index === 0 && (
                    <span className="text-[9px] font-black text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={10} /> MOST STABLE
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopUptimeDevices;
