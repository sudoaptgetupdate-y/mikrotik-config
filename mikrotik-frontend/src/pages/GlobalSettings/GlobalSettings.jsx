import { useState, useEffect, useMemo } from 'react';
import { Shield, Network, Globe, Settings2, Database, Loader2, Bell, ChevronRight, Megaphone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { settingService } from '../../services/settingService';
import toast from 'react-hot-toast';

import TabAdmins from './components/TabAdmins';
import TabManagementIps from './components/TabManagementIps';
import TabPbrTargets from './components/TabPbrTargets';
import TabVlanNetwork from './components/TabVlanNetwork';
import TabMaintenance from './components/TabMaintenance';
import TabAlertThresholds from './components/TabAlertThresholds';
import TabDashboardAnnouncement from './components/TabDashboardAnnouncement';

const GlobalSettings = () => {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeGlobalSettingsTab') || 'ADMINS');

  useEffect(() => {
    localStorage.setItem('activeGlobalSettingsTab', activeTab);
  }, [activeTab]);

  const { data: rawSettings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingService.getSettings(),
    onError: () => toast.error('ไม่สามารถดึงข้อมูลการตั้งค่าได้')
  });

  const settingsData = useMemo(() => {
    const parsed = { ROUTER_ADMINS: [], MANAGEMENT_IPS: [], MONITOR_IPS: [], DEFAULT_NETWORKS: [], ALERT_THRESHOLDS: null, DASHBOARD_ANNOUNCEMENT: '' };
    if (!rawSettings) return parsed;

    rawSettings.forEach(item => {
      if (item.key === 'DEFAULT_NETWORKS' || item.key === 'ALERT_THRESHOLDS') {
        try { parsed[item.key] = typeof item.value === 'string' ? JSON.parse(item.value) : item.value; } catch (e) {}
      } else {
        parsed[item.key] = item.value;
      }
    });
    return parsed;
  }, [rawSettings]);

  const tabs = [
    { id: 'ADMINS', label: 'Router Admins', icon: Shield, color: 'text-blue-600', border: 'border-blue-600', bg: 'bg-blue-50' },
    { id: 'NETWORKS', label: 'Management IPs', icon: Network, color: 'text-emerald-600', border: 'border-emerald-600', bg: 'bg-emerald-50' },
    { id: 'PBR', label: 'PBR Targets', icon: Globe, color: 'text-orange-600', border: 'border-orange-600', bg: 'bg-orange-50' },
    { id: 'DEFAULTS', label: 'Default LAN/VLAN', icon: Settings2, color: 'text-purple-600', border: 'border-purple-600', bg: 'bg-purple-50' },
    { id: 'MAINTENANCE', label: 'Maintenance', icon: Database, color: 'text-rose-600', border: 'border-rose-600', bg: 'bg-rose-50' },
    { id: 'ALERTS', label: 'Alert Thresholds', icon: Bell, color: 'text-rose-500', border: 'border-rose-500', bg: 'bg-rose-50' },
    { id: 'ANNOUNCEMENT', label: 'Announcement', icon: Megaphone, color: 'text-blue-500', border: 'border-blue-500', bg: 'bg-blue-50' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. Page Header */}
      <div className="space-y-4">
        <nav className="flex items-center text-sm font-medium text-slate-500 gap-2">
          <a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-400">System Administration</span>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-800">Global Settings</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Shield className="text-blue-600" size={28} /> 
              Global System Settings
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              ตั้งค่าพารามิเตอร์ส่วนกลาง ระบบแจ้งเตือน และการดูแลรักษา
            </p>
          </div>
        </div>

        <hr className="border-slate-200 mt-2" />
      </div>

      {isLoading ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center py-20">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
          <p className="text-slate-500 font-medium animate-pulse">กำลังโหลดข้อมูลการตั้งค่า...</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Tabs - Left Side */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-2 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all whitespace-nowrap lg:whitespace-normal
                      ${isActive 
                        ? `${tab.bg} ${tab.color} ring-1 ring-inset ring-slate-100 shadow-sm` 
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
                    `}
                  >
                    <Icon size={20} className={isActive ? tab.color : 'text-slate-400'} />
                    <span className="flex-1 text-left">{tab.label}</span>
                    {isActive && <div className={`hidden lg:block w-1.5 h-1.5 rounded-full ${tab.color.replace('text-', 'bg-')}`} />}
                  </button>
                );
              })}
            </div>
            
            {/* Help/Status Card in Sidebar (Optional) */}
            <div className="hidden lg:block mt-6 p-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Settings2 size={16} className="text-blue-500" />
                Setting Tip
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                การตั้งค่าในหน้านี้จะมีผลกับอุปกรณ์ทุกเครื่องในระบบ โปรดตรวจสอบความถูกต้องก่อนบันทึกข้อมูล
              </p>
            </div>
          </div>

          {/* Content Area - Right Side */}
          <div className="flex-1 min-w-0">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col transition-all min-h-[600px]">
              {activeTab === 'ADMINS' && <TabAdmins initialData={settingsData.ROUTER_ADMINS} />}
              {activeTab === 'NETWORKS' && <TabManagementIps initialData={settingsData.MANAGEMENT_IPS} />}
              {activeTab === 'PBR' && <TabPbrTargets initialData={settingsData.MONITOR_IPS} />}
              {activeTab === 'DEFAULTS' && <TabVlanNetwork initialData={settingsData.DEFAULT_NETWORKS} />}
              {activeTab === 'MAINTENANCE' && <TabMaintenance />}
              {activeTab === 'ALERTS' && <TabAlertThresholds initialData={settingsData.ALERT_THRESHOLDS} />}
              {activeTab === 'ANNOUNCEMENT' && <TabDashboardAnnouncement initialData={settingsData.DASHBOARD_ANNOUNCEMENT} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSettings;