import React, { useState } from 'react';
import { FileDown, CheckCircle, Network, ShieldCheck, Globe, Loader2, Router, Server, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generateMikrotikScript } from "../../../utils/mikrotikGenerator";
import { generateMikrotikScriptV6 } from "../../../utils/mikrotikGeneratorV6";
import apiClient from '../../../utils/apiClient';

const Step8_Summary = ({ 
  selectedModel, 
  wanList, 
  dnsConfig, 
  networks, 
  portConfig, 
  pbrConfig, 
  wirelessConfig, 
  circuitId, 
  token, 
  apiHost,
  heartbeatUrl,
  onSaveAndFinish,
  onFinish,
  mode
}) => {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeRos, setActiveRos] = useState(null); // 'v7' or 'v6'

  // 🎯 หาพอร์ต Ether สุดท้ายจาก Selected Model
  const lastEther = selectedModel?.ports?.filter(p => p.type === 'ETHER').pop()?.name || 'etherX';

  const handleGenAndFinish = async (targetVersion) => { 
    setIsGenerating(true); 
    setActiveRos(targetVersion);

    try {
      // 1. ดึงข้อมูล Global Settings จาก Backend
      const settingsRes = await apiClient.get('/api/settings');
      const globalSettings = {};
      
      settingsRes.data.forEach(s => {
        globalSettings[s.key] = s.value;
      });

      // ดึง Heartbeat URL สำรองจาก Database (เผื่อกรณี Standalone หรือค่าใน Props ยังไม่มา)
      let dbHeartbeatUrl = '';
      if (globalSettings.SYSTEM_CONFIG) {
        try {
          const sys = typeof globalSettings.SYSTEM_CONFIG === 'string' 
            ? JSON.parse(globalSettings.SYSTEM_CONFIG) 
            : globalSettings.SYSTEM_CONFIG;
          dbHeartbeatUrl = sys.heartbeatUrl;
        } catch (e) { console.error("Error parsing SYSTEM_CONFIG in Step8", e); }
      }

      // 2. เตรียมข้อมูลทั้งหมด (Priority: Props > DB)
      let configData = {
        selectedModel, wanList, networks, portConfig, pbrConfig, wirelessConfig,
        dnsConfig, circuitId, token, apiHost,
        heartbeatUrl: heartbeatUrl || dbHeartbeatUrl,
        managementIps: globalSettings.MANAGEMENT_IPS,
        monitorIps: globalSettings.MONITOR_IPS,
        adminUsers: globalSettings.ROUTER_ADMINS,
        isStandalone: mode === 'standalone'
      };

      // 3. บันทึกลง Database
      if (onSaveAndFinish) {
        const savedDevice = await onSaveAndFinish(configData);
        
        // 🚨 จับ Token ชื่อ combinedToken ที่ Backend ส่งมาให้ตรงๆ
        let finalToken = configData.token || "";
        
        if (savedDevice?.combinedToken) {
          finalToken = savedDevice.combinedToken;
        } else if (savedDevice?.data?.combinedToken) {
          finalToken = savedDevice.data.combinedToken;
        } else if (savedDevice?.apiToken) {
          finalToken = savedDevice.apiToken;
        }

        configData.token = finalToken;
      }

      // 4. สร้างสคริปต์ MikroTik โดยใช้ข้อมูลที่มี Token แล้ว และเลือก Generator ตาม ROS Version
      const scriptContent = targetVersion === 'v7' 
        ? generateMikrotikScript(configData)
        : generateMikrotikScriptV6(configData);

      // 5. ดาวน์โหลดไฟล์ .rsc
      const element = document.createElement("a");
      const file = new Blob([scriptContent], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `${circuitId}_config_${targetVersion}.rsc`;
      document.body.appendChild(element); 
      element.click();
      document.body.removeChild(element);

      // 6. ชะลอเวลา 1.5 วินาทีเพื่อให้ Browser เรียกกล่องโหลดไฟล์ขึ้นมาก่อน 
      // แต่ถ้าเป็นโหมด Standalone จะไม่ Redirect
      if (onFinish && mode !== 'standalone') {
        setTimeout(() => {
          onFinish();
        }, 1500);
      }

    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setIsGenerating(false); 
      setActiveRos(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* --- Success Header (Smaller) --- */}
      <div className="text-center mb-6 relative">
        <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border-[6px] border-green-50 shadow-sm relative z-10">
          <CheckCircle size={32} className="animate-in zoom-in duration-500 delay-150" strokeWidth={2.5} />
        </div>
        <h2 className="text-xl font-black text-slate-800 tracking-tight">
          {mode === 'standalone' ? t('wizard.step8.title_builder') : t('wizard.step8.title_setup')}
        </h2>
        <p className="text-slate-400 mt-1 text-sm font-medium">
          {mode === 'standalone' 
            ? t('wizard.step8.desc_builder') 
            : t('wizard.step8.desc_setup')}
        </p>
      </div>

      {/* --- Access Notice --- */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3 shadow-sm">
        <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
          <ShieldCheck size={18} />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-black text-amber-900 uppercase tracking-wider">{t('wizard.step8.access_note_title')}</p>
          <p className="text-xs text-amber-800 font-medium leading-relaxed" 
             dangerouslySetInnerHTML={{ __html: t('wizard.step8.access_note_desc', { port: lastEther }) }} />
        </div>
      </div>

      {/* --- Summary Cards Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* Card 1: Device & Connectivity */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
            <Globe size={18} className="text-blue-500" />
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">{t('wizard.step8.card_conn')}</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm font-medium flex items-center gap-2">
                <Router size={16} className="text-slate-400" /> {t('wizard.step8.label_model')}
              </span>
              <span className="font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg text-sm">{selectedModel?.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm font-medium flex items-center gap-2">
                <Server size={16} className="text-slate-400" /> {t('wizard.step8.label_identity')}
              </span>
              <span className="font-bold text-blue-600">{circuitId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm font-medium">{t('wizard.step8.label_wan_count')}</span>
              <span className="font-bold text-slate-800">{t('wizard.step8.unit_ports', { count: wanList.length })}</span>
            </div>
            <div className="flex justify-between items-center">
               <span className="text-slate-500 text-sm font-medium">{t('wizard.step8.label_wlan_count')}</span>
               <span className="font-bold text-slate-800">{t('wizard.step8.unit_wlans', { count: Object.keys(wirelessConfig || {}).length })}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-50">
              <span className="text-slate-500 text-sm font-medium">{t('wizard.step8.label_dns_mode')}</span>
              <span className="font-bold text-slate-800 text-sm">
                {dnsConfig.allowRemoteRequests ? t('wizard.step8.dns_server') : t('wizard.step8.dns_client')}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Local Networks */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
            <Network size={18} className="text-blue-500" />
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">{t('wizard.step8.card_lan')}</h3>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[240px] pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
            {networks.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-4">{t('wizard.step8.no_lan')}</div>
            ) : (
              networks.map(net => (
                <div key={net.id} className="flex justify-between items-center p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-100 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-xs font-black text-slate-600 shadow-sm">
                      {net.vlanId}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm text-slate-700">{net.name}</span>
                      <span className="text-[11px] font-mono text-slate-400">{net.ip}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-1.5">
                    {net.dhcp && <span className="text-[10px] font-bold px-2 py-1 bg-green-100 border border-green-200 text-green-700 rounded-md text-center">DHCP</span>}
                    {net.hotspot && <span className="text-[10px] font-bold px-2 py-1 bg-orange-100 border border-orange-200 text-orange-700 rounded-md text-center">HOTSPOT</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 3: Security & Policy */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 md:col-span-2">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
            <ShieldCheck size={18} className="text-blue-500" />
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">{t('wizard.step8.card_security')}</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('wizard.step8.label_user_mgmt')}</p>
              <p className="font-black text-slate-700 text-lg">{t('wizard.step8.val_central_api')}</p>
              <p className="text-[11px] text-slate-500 font-medium">{t('wizard.step8.desc_provisioned')}</p>
            </div>
            
            <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('wizard.step8.label_services')}</p>
              <p className="font-black text-green-600 text-lg flex items-center gap-2">{t('wizard.step8.val_winbox_only')} <CheckCircle size={16}/></p>
              <p className="text-[11px] text-slate-500 font-medium">{t('wizard.step8.desc_disabled_others')}</p>
            </div>
            
            <div className={`p-5 border rounded-xl flex flex-col justify-center transition-colors ${pbrConfig.enabled ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{t('wizard.step8.label_pbr_status')}</p>
              <p className={`font-black text-lg ${pbrConfig.enabled ? 'text-blue-700' : 'text-slate-500'}`}>
                {pbrConfig.enabled ? t('wizard.step8.val_active') : t('wizard.step8.val_disabled')}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                {pbrConfig.enabled ? t('wizard.step8.desc_pbr_active') : t('wizard.step8.desc_pbr_disabled')}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* --- Action Buttons --- */}
      <div className="flex flex-col items-center border-t border-slate-100 pt-10">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6">{t('wizard.step8.select_ver')}</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full sm:w-auto">
          {/* v7 Button */}
          <button 
            onClick={() => handleGenAndFinish('v7')}
            disabled={isGenerating}
            className="group relative flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-white bg-blue-600 shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all hover:-translate-y-1 disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isGenerating && activeRos === 'v7' ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Zap size={20} className="group-hover:animate-pulse" />
            )}
            <span>{t('wizard.step8.btn_v7')}</span>
          </button>

          {/* v6 Button */}
          <button 
            onClick={() => handleGenAndFinish('v6')}
            disabled={isGenerating}
            className="group relative flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-bold text-white bg-orange-600 shadow-xl shadow-orange-600/20 hover:bg-orange-500 transition-all hover:-translate-y-1 disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isGenerating && activeRos === 'v6' ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <FileDown size={20} className="group-hover:animate-bounce" />
            )}
            <span>{t('wizard.step8.btn_v6')}</span>
          </button>
        </div>

        {mode !== 'standalone' ? (
          <p className="text-center text-sm font-medium text-slate-400 mt-6">
            {t('wizard.step8.footer_setup')}
          </p>
        ) : (
          <p className="text-center text-sm font-medium text-slate-400 mt-6 italic">
            {t('wizard.step8.footer_builder')}
          </p>
        )}
      </div>

    </div>
  );
};

export default Step8_Summary;