import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query'; 
import { Activity, Calendar, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

import { deviceService } from '../../services/deviceService';
import { modelService } from '../../services/modelService';
import { logService } from '../../services/logService';
import { settingService } from '../../services/settingService';

import StatCards from './components/StatCards';
import QuickActions from './components/QuickActions';
import RecentActivity from './components/RecentActivity';
import TopHighLoadDevices from './components/TopHighLoadDevices';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['dashboard', user?.id], 
    queryFn: async () => {
      // 🟢 1. โหลดข้อมูลทั้งหมด และเรียกใช้ settingService แทน apiClient ดิบๆ
      const [allDevices, models, logsData, settingsData] = await Promise.all([
        deviceService.getUserDevices(user?.id || 1),
        modelService.getModels(),
        logService.getActivityLogs({ limit: 5 }),
        settingService.getSettings('ALERT_THRESHOLDS').catch(() => null) // 🟢 ดึงค่า Settings อย่างถูกต้อง
      ]);

      // 🟢 2. แกะกล่องข้อมูล Thresholds อย่างรัดกุม (รองรับทั้ง Array และ Object)
      let thresholds = { cpu: 85, ram: 85, latency: 80, temp: 60, storage: 85 };
      if (settingsData) {
        const targetSetting = Array.isArray(settingsData) ? settingsData[0] : settingsData;
        
        if (targetSetting && targetSetting.value) {
          const parsed = typeof targetSetting.value === 'string' ? JSON.parse(targetSetting.value) : targetSetting.value;
          thresholds = { ...thresholds, ...parsed };
        }
      }

      const activeDevices = (allDevices || []).filter(device => device.status !== 'DELETED');
      const logsArray = Array.isArray(logsData) ? logsData : (logsData?.data || []);
      
      let onlineCount = 0; let offlineCount = 0; let alertCount = 0;
      let highLoadList = []; 

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
          // 🟢 3. ใช้ค่า thresholds ในการประเมินสถานะ High Load
          const isHighLoad = cpuVal > thresholds.cpu || ramVal > thresholds.ram || storageVal > thresholds.storage || tempVal > thresholds.temp || latencyMs > thresholds.latency;
          
          if (isHighLoad) {
            if (!device.isAcknowledged) alertCount++;
            highLoadList.push({ ...device, cpuVal, ramVal, storageVal, tempVal, latencyMs });
          }
        } else {
          offlineCount++;
        }
      });

      highLoadList.sort((a, b) => Math.max(b.cpuVal, b.ramVal) - Math.max(a.cpuVal, a.ramVal));

      return {
        stats: {
          totalDevices: activeDevices.length,
          totalModels: (models || []).length,
          onlineDevices: onlineCount,
          offlineDevices: offlineCount,
          activeAlerts: alertCount
        },
        recentLogs: logsArray.slice(0, 5),
        topHighLoadDevices: highLoadList.slice(0, 5),
        thresholds // ส่ง thresholds ไปให้ Component อื่นใช้งานต่อ
      };
    },
    refetchInterval: 30000, 
    onError: () => toast.error("ไม่สามารถดึงข้อมูลสรุป Dashboard ได้")
  });

  // 🟢 5. รับค่า thresholds ออกมาใช้งาน
  const { stats, recentLogs, topHighLoadDevices, thresholds } = data || { 
    stats: { totalDevices: 0, onlineDevices: 0, offlineDevices: 0, activeAlerts: 0 }, 
    recentLogs: [], 
    topHighLoadDevices: [],
    thresholds: { cpu: 85, ram: 85, latency: 80, temp: 60, storage: 85 } // ค่า Default กันพัง
  };
  
  const onlinePercentage = stats.totalDevices > 0 ? (stats.onlineDevices / stats.totalDevices) * 100 : 0;
  const isSystemHealthy = stats.activeAlerts === 0 && stats.offlineDevices === 0;
  const lastSyncTime = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Syncing...';
  const handleCardClick = (filterState) => navigate('/devices', { state: { filter: filterState } });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-slate-400">
        <Activity size={48} className="animate-spin text-blue-600 mb-6" />
        <p className="font-medium animate-pulse">Syncing system data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* Header Banner (คงเดิม) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-20 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Activity size={16} />
            <span className="text-[11px] font-black uppercase tracking-widest">System Overview</span>
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
                System {isSystemHealthy ? 'Optimal' : 'Attention'}
              </span>
            </div>
            {isSystemHealthy ? <CheckCircle2 size={18} className="ml-1 opacity-80" /> : <AlertTriangle size={18} className="ml-1 opacity-80" />}
          </div>
          <p className="text-[11px] text-slate-400 font-medium tracking-wide">
            Last updated: <span className="text-slate-500">{lastSyncTime}</span>
          </p>
        </div>
      </div>

      <StatCards 
        stats={stats} 
        onlinePercentage={onlinePercentage} 
        onCardClick={handleCardClick} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-3">
          <QuickActions />
        </div>
        
        <div className="lg:col-span-4">
          {/* 🟢 6. ส่ง thresholds ไปให้ TopHighLoadDevices ใช้ในการแสดงผล Badge */}
          <TopHighLoadDevices devices={topHighLoadDevices} thresholds={thresholds} />
        </div>

        <div className="lg:col-span-5">
          <RecentActivity recentLogs={recentLogs} />
        </div>
      </div>

    </div>
  );
};

export default Dashboard;