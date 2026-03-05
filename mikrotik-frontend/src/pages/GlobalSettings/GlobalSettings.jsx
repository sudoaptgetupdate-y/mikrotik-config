import { useState, useEffect, useMemo } from 'react';
import { Shield, Network, Globe, Settings2, Database, Loader2, Bell, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { settingService } from '../../services/settingService';
import toast from 'react-hot-toast';

import TabAdmins from './components/TabAdmins';
import TabManagementIps from './components/TabManagementIps';
import TabPbrTargets from './components/TabPbrTargets';
import TabVlanNetwork from './components/TabVlanNetwork';
import TabMaintenance from './components/TabMaintenance';
import TabAlertThresholds from './components/TabAlertThresholds';

const GlobalSettings = () => {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeGlobalSettingsTab') || 'ADMINS');

  useEffect(() => {
    localStorage.setItem('activeGlobalSettingsTab', activeTab);
  }, [activeTab]);

  // ✅ ใช้ React Query ดึงข้อมูล Setting ทั้งหมดครั้งเดียว แล้วจับใส่ Cache
  const { data: rawSettings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingService.getSettings(),
    onError: () => toast.error('ไม่สามารถดึงข้อมูลการตั้งค่าได้')
  });

  // แปลงข้อมูลที่ได้จาก API ให้อยู่ในรูปแบบ Object พร้อมใช้งาน
  const settingsData = useMemo(() => {
    const parsed = { ROUTER_ADMINS: [], MANAGEMENT_IPS: [], MONITOR_IPS: [], DEFAULT_NETWORKS: [], ALERT_THRESHOLDS: null };
    if (!rawSettings) return parsed;

    rawSettings.forEach(item => {
      if (item.key === 'DEFAULT_NETWORKS') {
        try { parsed[item.key] = typeof item.value === 'string' ? JSON.parse(item.value) : item.value; } catch (e) {}
      } else {
        parsed[item.key] = item.value || [];
      }
    });
    return parsed;
  }, [rawSettings]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      
      {/* 1. Page Header (แบบ Classic & Clean) */}
      <div className="space-y-4">
        {/* Breadcrumbs */}
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
          
          {/* หมายเหตุ: หน้า Global Settings มักจะไม่มีปุ่ม Create ที่ Header 
              เพราะ Action ต่างๆ จะไปอยู่แยกกันในแต่ละ Tab ครับ */}
        </div>

        {/* เส้นกั้น Solid Divider */}
        <hr className="border-slate-200 mt-2" />
      </div>

      {isLoading ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col justify-center items-center">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
          <p className="text-slate-500 font-medium animate-pulse">กำลังโหลดข้อมูลการตั้งค่า...</p>
        </div>
      ) : (
        <>
          {/* Tabs Menu */}
          <div className="flex border-b border-slate-200 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button onClick={() => setActiveTab('ADMINS')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ADMINS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Shield size={18} /> Router Admins</button>
            <button onClick={() => setActiveTab('NETWORKS')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'NETWORKS' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Network size={18} /> Management IPs</button>
            <button onClick={() => setActiveTab('PBR')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'PBR' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Globe size={18} /> PBR Targets</button>
            <button onClick={() => setActiveTab('DEFAULTS')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'DEFAULTS' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Settings2 size={18} /> Default LAN/VLAN</button>
            <button onClick={() => setActiveTab('MAINTENANCE')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'MAINTENANCE' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Database size={18} /> Maintenance</button>
            <button onClick={() => setActiveTab('ALERTS')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ALERTS' ? 'border-rose-500 text-rose-500' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Bell size={18} /> Alert Thresholds</button>
          </div>

          {/* Tab Content Area */}
          <div className="bg-white p-4 sm:p-6 md:p-8 rounded-b-2xl rounded-tr-2xl border border-t-0 border-slate-200 shadow-sm min-h-[400px] flex flex-col transition-all">
            {activeTab === 'ADMINS' && <TabAdmins initialData={settingsData.ROUTER_ADMINS} />}
            {activeTab === 'NETWORKS' && <TabManagementIps initialData={settingsData.MANAGEMENT_IPS} />}
            {activeTab === 'PBR' && <TabPbrTargets initialData={settingsData.MONITOR_IPS} />}
            {activeTab === 'DEFAULTS' && <TabVlanNetwork initialData={settingsData.DEFAULT_NETWORKS} />}
            {activeTab === 'MAINTENANCE' && <TabMaintenance />}
            {activeTab === 'ALERTS' && <TabAlertThresholds initialData={settingsData.ALERT_THRESHOLDS} />}
          </div>
        </>
      )}
    </div>
  );
};

export default GlobalSettings;