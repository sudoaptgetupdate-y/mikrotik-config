import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query'; 
import { Activity, Calendar, CheckCircle2, AlertTriangle, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import { deviceService } from '../../services/deviceService';
import { modelService } from '../../services/modelService';
import { logService } from '../../services/logService';
import { settingService } from '../../services/settingService';

import StatCards from './components/StatCards';
import QuickActions from './components/QuickActions';
import TopHighLoadDevices from './components/TopHighLoadDevices';
import OfflineDevices from './components/OfflineDevices';
import TopUptimeDevices from './components/TopUptimeDevices';
import EventSummaryCard from './components/EventSummaryCard';
import TopTroubleDevices from './components/TopTroubleDevices';

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
// ฟังก์ชันช่วยแปลง Uptime ของ MikroTik ให้เป็นวินาทีเพื่อใช้ในการเรียงลำดับ
const uptimeToSeconds = (uptimeStr) => {
  if (!uptimeStr || uptimeStr === 'N/A') return 0;

  let totalSeconds = 0;

  // ใช้ Regex ดึงค่า y (years), w (weeks), d (days), และ HH:MM:SS
  // รูปแบบที่รองรับ: 1y2w3d04:12:34 หรือ 2w3d04:12:34 หรือ 04:12:34
  const yearsMatch = uptimeStr.match(/(\d+)y/);
  const weeksMatch = uptimeStr.match(/(\d+)w/);
  const daysMatch = uptimeStr.match(/(\d+)d/);
  const timeMatch = uptimeStr.match(/(\d{1,2}):(\d{2}):(\d{2})/);

  if (yearsMatch) totalSeconds += parseInt(yearsMatch[1]) * 365 * 24 * 3600;
  if (weeksMatch) totalSeconds += parseInt(weeksMatch[1]) * 7 * 24 * 3600;
  if (daysMatch) totalSeconds += parseInt(daysMatch[1]) * 24 * 3600;

  if (timeMatch) {
    const h = parseInt(timeMatch[1]);
    const m = parseInt(timeMatch[2]);
    const s = parseInt(timeMatch[3]);
    totalSeconds += (h * 3600) + (m * 60) + s;
  }

  return totalSeconds;
};

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.morning');
    if (hour < 18) return t('dashboard.greeting.afternoon');
    return t('dashboard.greeting.evening');
  };

  const currentDate = new Date().toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'th-TH', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard', user?.id], 
    queryFn: async () => {
      // 🟢 1. โหลดข้อมูลทั้งหมด
      const [allDevices, models, settingsData, announcementData] = await Promise.all([
        deviceService.getUserDevices(user?.id || 1),
        modelService.getModels(),
        settingService.getSettings('ALERT_THRESHOLDS').catch(() => null),
        settingService.getSettings('DASHBOARD_ANNOUNCEMENT').catch(() => null)
      ]);

      // 🟢 2. แกะกล่องข้อมูล Thresholds
      let thresholds = { cpu: 85, ram: 85, latency: 80, temp: 60, storage: 85 };
      if (settingsData) {
        const targetSetting = Array.isArray(settingsData) ? settingsData[0] : settingsData;
        if (targetSetting && targetSetting.value) {
          const parsed = typeof targetSetting.value === 'string' ? JSON.parse(targetSetting.value) : targetSetting.value;
          thresholds = { ...thresholds, ...parsed };
        }
      }

      // 🟢 3. แกะกล่องข้อมูล Announcement
      let announcement = "";
      if (announcementData) {
        const targetAnnounce = Array.isArray(announcementData) ? announcementData[0] : announcementData;
        announcement = targetAnnounce?.value || "";
      }

      const activeDevices = (allDevices || []).filter(device => device.status !== 'DELETED');
      
      let onlineCount = 0; let offlineCount = 0; let alertCount = 0;
      let highLoadList = []; 
      let offlineList = [];
      let uptimeList = [...activeDevices];

      activeDevices.forEach(device => {
        let isOnline = false;
        if (device.lastSeen) {
            const diffMinutes = (new Date() - new Date(device.lastSeen)) / 1000 / 60;
            isOnline = diffMinutes <= 3;
        }

        const cpuVal = parseFloat(device.cpu || device.cpuLoad) || 0;
        const ramVal = parseFloat(device.ram || device.memoryUsage) || 0;
        const storageVal = parseFloat(device.storage) || 0;
        const tempVal = parseFloat(device.temp) || 0;
        
        let latencyMs = 0;
        if (device.latency === "timeout") {
            latencyMs = 999;
        } else if (device.latency) {
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

        if (isOnline) {
          onlineCount++;
          const isHighLoad = cpuVal > thresholds.cpu || ramVal > thresholds.ram || storageVal > thresholds.storage || tempVal > thresholds.temp || latencyMs > thresholds.latency;
          if (isHighLoad) {
            if (!device.isAcknowledged) alertCount++;
            highLoadList.push({ ...device, cpuVal, ramVal, storageVal, tempVal, latencyMs });
          }
        } else {
          offlineCount++;
          offlineList.push(device);
        }
      });

      highLoadList.sort((a, b) => Math.max(b.cpuVal, b.ramVal) - Math.max(a.cpuVal, a.ramVal));
      offlineList.sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
      uptimeList.sort((a, b) => uptimeToSeconds(b.uptime) - uptimeToSeconds(a.uptime));

      return {
        stats: {
          totalDevices: activeDevices.length,
          totalModels: (models || []).length,
          onlineDevices: onlineCount,
          offlineDevices: offlineCount,
          activeAlerts: alertCount
        },
        topHighLoadDevices: highLoadList.slice(0, 5),
        offlineDevicesList: offlineList.slice(0, 5),
        topUptimeDevices: uptimeList.slice(0, 5),
        thresholds,
        announcement
      };
    },
    refetchInterval: 30000, 
    onError: () => toast.error(t('common.error_default', 'Error loading data'))
  });

  const { stats, topHighLoadDevices, offlineDevicesList, topUptimeDevices, thresholds, announcement } = data || { 
    stats: { totalDevices: 0, onlineDevices: 0, offlineDevices: 0, activeAlerts: 0 }, 
    topHighLoadDevices: [],
    offlineDevicesList: [],
    topUptimeDevices: [],
    thresholds: { cpu: 85, ram: 85, latency: 80, temp: 60, storage: 85 },
    announcement: ""
  };
  
  const onlinePercentage = stats.totalDevices > 0 ? (stats.onlineDevices / stats.totalDevices) * 100 : 0;
  const isSystemHealthy = stats.activeAlerts === 0 && stats.offlineDevices === 0;
  const lastSyncTime = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString(i18n.language === 'en' ? 'en-US' : 'th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Syncing...';
  const handleCardClick = (filterState) => navigate('/devices', { state: { filter: filterState } });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-slate-400">
        <Activity size={48} className="animate-spin text-blue-600 mb-6" />
        <p className="font-medium animate-pulse">{t('dashboard.status.syncing')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        
        {/* Banner Content */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 p-6 md:p-8 relative z-10">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Activity size={16} />
              <span className="text-[11px] font-black uppercase tracking-widest">{t('dashboard.title')}</span>
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">
              {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{user?.username || user?.firstName || 'User'}</span>! 👋
            </h2>
            <p className="text-sm text-slate-500 mt-1.5 flex items-center gap-1.5 font-medium">
              <Calendar size={14} /> {currentDate}
            </p>
          </div>

          <div className="relative z-10 flex flex-col items-start md:items-end gap-2 mt-4 md:mt-0">
            <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xl border backdrop-blur-sm transition-all duration-300 ${
              isSystemHealthy 
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-700' 
                : 'bg-orange-50/80 border-orange-200 text-orange-700'
            }`}>
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSystemHealthy ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isSystemHealthy ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-wider">
                  {isSystemHealthy ? t('dashboard.status.optimal') : t('dashboard.status.attention')}
                </span>
              </div>
              {isSystemHealthy ? <CheckCircle2 size={18} className="ml-1 opacity-80" /> : <AlertTriangle size={18} className="ml-1 opacity-80" />}
            </div>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">
              {t('dashboard.status.last_updated')}: <span className="text-slate-500">{lastSyncTime}</span>
            </p>
          </div>
        </div>

        {/* 🟢 Marquee Announcement Area */}
        {announcement && (
          <div className="bg-slate-900 border-t border-slate-800 py-2.5 relative flex items-center">
            <div className="absolute left-0 top-0 bottom-0 bg-slate-900 px-4 flex items-center z-20 border-r border-slate-800 shadow-[10px_0_15px_rgba(0,0,0,0.5)]">
              <Megaphone size={16} className="text-blue-400 animate-bounce" />
              <span className="ml-2 text-[10px] font-black text-white uppercase tracking-tighter">{t('dashboard.news')}</span>
            </div>
            <div className="overflow-hidden whitespace-nowrap w-full">
              <div className="inline-block animate-marquee pl-32 text-blue-100 text-xs font-bold tracking-wide">
                <span className="inline-block px-10">{announcement}</span>
                <span className="inline-block px-10 text-blue-400">|</span>
                <span className="inline-block px-10">{announcement}</span>
                <span className="inline-block px-10 text-blue-400">|</span>
                <span className="inline-block px-10">{announcement}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <StatCards 
        stats={stats} 
        onlinePercentage={onlinePercentage} 
        onCardClick={handleCardClick} 
      />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Real-time Alerts */}
        <div className="space-y-6">
          <OfflineDevices devices={offlineDevicesList} />
          <TopHighLoadDevices devices={topHighLoadDevices} thresholds={thresholds} />
        </div>

        {/* Column 2: Trends & Analytics */}
        <div className="space-y-6">
          <EventSummaryCard />
          <TopTroubleDevices />
        </div>

        {/* Column 3: Performance & Tools */}
        <div className="space-y-6">
          <TopUptimeDevices devices={topUptimeDevices} />
          <QuickActions />
        </div>

      </div>

    </div>
  );
};

export default Dashboard;