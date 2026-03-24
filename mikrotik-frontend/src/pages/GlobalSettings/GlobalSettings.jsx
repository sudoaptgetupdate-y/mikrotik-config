import { useState, useEffect, useMemo } from 'react';
import { Shield, Network, Globe, Settings2, Database, Loader2, Bell, ChevronRight, Megaphone, Bot, Server } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { settingService } from '../../services/settingService';
import toast from 'react-hot-toast';

import TabAdmins from './components/TabAdmins';
import TabManagementIps from './components/TabManagementIps';
import TabPbrTargets from './components/TabPbrTargets';
import TabVlanNetwork from './components/TabVlanNetwork';
import TabMaintenance from './components/TabMaintenance';
import TabAlertThresholds from './components/TabAlertThresholds';
import TabDashboardAnnouncement from './components/TabDashboardAnnouncement';
import TabSystemSettings from './components/TabSystemSettings';

const GlobalSettings = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('activeGlobalSettingsTab');
    return (saved && saved !== 'AI') ? saved : 'ADMINS';
  });

  useEffect(() => {
    localStorage.setItem('activeGlobalSettingsTab', activeTab);
  }, [activeTab]);

  const { data: rawSettings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingService.getSettings(),
    onError: () => toast.error(t('settings.loading_error') || 'ไม่สามารถดึงข้อมูลการตั้งค่าได้')
  });

  const settingsData = useMemo(() => {
    const parsed = { 
      ROUTER_ADMINS: [], 
      MANAGEMENT_IPS: [], 
      MONITOR_IPS: [], 
      DEFAULT_NETWORKS: [], 
      ALERT_THRESHOLDS: null, 
      DASHBOARD_ANNOUNCEMENT: '',
      SYSTEM_CONFIG: null
    };
    if (!rawSettings) return parsed;

    rawSettings.forEach(item => {
      const complexKeys = [
        'DEFAULT_NETWORKS', 
        'ALERT_THRESHOLDS',
        'SYSTEM_CONFIG'
      ];

      if (complexKeys.includes(item.key)) {
        try { 
          parsed[item.key] = typeof item.value === 'string' ? JSON.parse(item.value) : item.value; 
        } catch (e) {
          parsed[item.key] = item.value;
        }
      } else {
        parsed[item.key] = item.value;
      }
    });
    return parsed;
  }, [rawSettings]);

  const tabs = [
    { id: 'ADMINS', label: t('settings.tabs.admins'), icon: Shield, color: 'text-blue-600', border: 'border-blue-600', bg: 'bg-blue-50' },
    { id: 'NETWORKS', label: t('settings.tabs.networks'), icon: Network, color: 'text-emerald-600', border: 'border-emerald-600', bg: 'bg-emerald-50' },
    { id: 'PBR', label: t('settings.tabs.pbr'), icon: Globe, color: 'text-orange-600', border: 'border-orange-600', bg: 'bg-orange-50' },
    { id: 'DEFAULTS', label: t('settings.tabs.defaults'), icon: Settings2, color: 'text-purple-600', border: 'border-purple-600', bg: 'bg-purple-50' },
    { id: 'MAINTENANCE', label: t('settings.tabs.maintenance'), icon: Database, color: 'text-rose-600', border: 'border-rose-600', bg: 'bg-rose-50' },
    { id: 'ALERTS', label: t('settings.tabs.alerts'), icon: Bell, color: 'text-rose-500', border: 'border-rose-500', bg: 'bg-rose-50' },
    { id: 'ANNOUNCEMENT', label: t('settings.tabs.announcement'), icon: Megaphone, color: 'text-blue-500', border: 'border-blue-500', bg: 'bg-blue-50' },
    { id: 'SYSTEM', label: t('settings.tabs.system'), icon: Server, color: 'text-slate-600', border: 'border-slate-600', bg: 'bg-slate-50' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 my-4 sm:my-8">
      
      {/* 1. Page Header Section (Island Card) */}
      <div className="space-y-4">
        {/* Header Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Shield className="text-blue-600" size={28} /> 
              {t('settings.title')}
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium italic">
              {t('settings.subtitle')}
            </p>
          </div>
          {/* Accent Blur */}
          <div className="absolute right-0 top-0 w-48 h-48 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-100/50 transition-colors duration-700"></div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center items-center py-20">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
          <p className="text-slate-500 font-medium animate-pulse">{t('settings.loading')}</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Tabs - Left Side (Island Card) */}
          <div className="lg:w-72 flex-shrink-0 space-y-6">
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
                        ? `${tab.bg} ${tab.color} ring-1 ring-inset ring-slate-100 shadow-sm scale-[1.02]` 
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
            
            {/* Help/Status Card */}
            <div className="hidden lg:block p-5 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="relative z-10">
                <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Settings2 size={16} className="text-blue-500" />
                  {t('settings.tip_title')}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  {t('settings.tip_desc')}
                </p>
              </div>
              <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-slate-50 rounded-full blur-xl group-hover:bg-blue-50 transition-colors"></div>
            </div>
          </div>

          {/* Content Area - Right Side (Island Card) */}
          <div className="flex-1 min-w-0">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col transition-all min-h-[600px]">
              {activeTab === 'ADMINS' && <TabAdmins initialData={settingsData.ROUTER_ADMINS} />}
              {activeTab === 'NETWORKS' && <TabManagementIps initialData={settingsData.MANAGEMENT_IPS} />}
              {activeTab === 'PBR' && <TabPbrTargets initialData={settingsData.MONITOR_IPS} />}
              {activeTab === 'DEFAULTS' && <TabVlanNetwork initialData={settingsData.DEFAULT_NETWORKS} />}
              {activeTab === 'MAINTENANCE' && <TabMaintenance />}
              {activeTab === 'ALERTS' && <TabAlertThresholds initialData={settingsData.ALERT_THRESHOLDS} />}
              {activeTab === 'ANNOUNCEMENT' && <TabDashboardAnnouncement initialData={settingsData.DASHBOARD_ANNOUNCEMENT} />}
              {activeTab === 'SYSTEM' && <TabSystemSettings />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSettings;