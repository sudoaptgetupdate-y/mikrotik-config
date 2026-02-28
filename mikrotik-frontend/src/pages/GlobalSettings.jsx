import { useState, useEffect } from 'react';
import { Shield, Network, Globe, Settings2, Database, Loader2 } from 'lucide-react';
import apiClient from '../utils/apiClient';

// นำเข้าแท็บย่อย (Component ที่เราจะสร้างด้านล่าง)
import TabAdmins from './SettingsTabs/TabAdmins';
import TabManagementIps from './SettingsTabs/TabManagementIps';
import TabPbrTargets from './SettingsTabs/TabPbrTargets';
import TabDefaults from './SettingsTabs/TabDefaults';
import TabMaintenance from './SettingsTabs/TabMaintenance';

const GlobalSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  // ✅ 1. ดึงค่า Tab ล่าสุดจาก localStorage ถ้าไม่มีให้เริ่มที่ 'ADMINS'
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeGlobalSettingsTab') || 'ADMINS';
  });

  const [settingsData, setSettingsData] = useState({});

  // ✅ 2. เมื่อ activeTab เปลี่ยนแปลง ให้บันทึกค่าลง localStorage
  useEffect(() => {
    localStorage.setItem('activeGlobalSettingsTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const res = await apiClient.get('/api/settings');
        
        // จัดกลุ่มข้อมูลให้อ่านง่ายขึ้น
        const parsed = {
          ROUTER_ADMINS: [],
          MANAGEMENT_IPS: [],
          MONITOR_IPS: [],
          DEFAULT_NETWORKS: []
        };

        res.data.forEach(item => {
          if (item.key === 'DEFAULT_NETWORKS') {
            try { parsed[item.key] = typeof item.value === 'string' ? JSON.parse(item.value) : item.value; } catch (e) {}
          } else {
            parsed[item.key] = item.value || [];
          }
        });
        
        setSettingsData(parsed);
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        alert('ไม่สามารถดึงข้อมูลการตั้งค่าได้');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="text-blue-600" size={28} /> Global System Settings
          </h2>
          <p className="text-slate-500 mt-1 font-medium">ตั้งค่าพารามิเตอร์ส่วนกลางและดูแลระบบ</p>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col justify-center items-center">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
          <p className="text-slate-500 font-medium animate-pulse">กำลังโหลดข้อมูลการตั้งค่า...</p>
        </div>
      ) : (
        <>
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <button onClick={() => setActiveTab('ADMINS')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ADMINS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Shield size={18} /> Router Admins
            </button>
            <button onClick={() => setActiveTab('NETWORKS')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'NETWORKS' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Network size={18} /> Management IPs
            </button>
            <button onClick={() => setActiveTab('PBR')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'PBR' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Globe size={18} /> PBR Targets
            </button>
            <button onClick={() => setActiveTab('DEFAULTS')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'DEFAULTS' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Settings2 size={18} /> Default LAN/VLAN
            </button>
            <button onClick={() => setActiveTab('MAINTENANCE')} className={`flex items-center gap-2 px-4 sm:px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'MAINTENANCE' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Database size={18} /> Maintenance
            </button>
          </div>

          <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col">
            {activeTab === 'ADMINS' && <TabAdmins initialData={settingsData.ROUTER_ADMINS} />}
            {activeTab === 'NETWORKS' && <TabManagementIps initialData={settingsData.MANAGEMENT_IPS} />}
            {activeTab === 'PBR' && <TabPbrTargets initialData={settingsData.MONITOR_IPS} />}
            {activeTab === 'DEFAULTS' && <TabDefaults initialData={settingsData.DEFAULT_NETWORKS} />}
            {activeTab === 'MAINTENANCE' && <TabMaintenance />}
          </div>
        </>
      )}
    </div>
  );
};

export default GlobalSettings;