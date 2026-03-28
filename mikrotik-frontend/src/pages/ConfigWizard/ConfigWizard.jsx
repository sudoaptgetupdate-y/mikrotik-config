import { useState, useEffect } from 'react';
import { CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { logService } from '../../services/logService';
import { useTranslation } from 'react-i18next';

// Import Modular Components
import Step1_ModelSelect from './components/Step1_ModelSelect';
import Step2_WANSetup from './components/Step2_WANSetup';
import Step3_DNSSettings from './components/Step3_DNSSettings';
import Step4_LANSetup from './components/Step4_LANSetup';
import Step5_PortAssign from './components/Step5_PortAssign';
import Step6_WirelessSetup from './components/Step6_WirelessSetup';
import Step7_PBRSetup from './components/Step7_PBRSetup';
import Step8_Summary from './components/Step8_Summary';

const ConfigWizard = ({ mode = 'create', initialData, onFinish }) => {
  const { t } = useTranslation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const getApiHost = () => {
    try {
      const url = new URL(import.meta.env.VITE_API_BASE_URL || window.location.origin);
      return url.hostname;
    } catch (e) {
      return window.location.hostname;
    }
  };

  // --- GLOBAL STATE ---
  const [deviceMeta, setDeviceMeta] = useState({
    name: initialData?.name || "",
    circuitId: initialData?.circuitId || "",
    groupIds: initialData?.groups?.map(g => g.id) || [],
    token: initialData?.token || initialData?.apiToken || "",
    apiHost: getApiHost()
  });

  const [selectedModel, setSelectedModel] = useState(null);
  const [wanList, setWanList] = useState([]);
  
  const [dnsConfig, setDnsConfig] = useState({
    servers: ['8.8.8.8', '1.1.1.1'],
    allowRemoteRequests: true
  });

  const [networks, setNetworks] = useState([]);
  const [portConfig, setPortConfig] = useState({});
  const [pbrConfig, setPbrConfig] = useState({ enabled: false, mappings: {} });
  const [wirelessConfig, setWirelessConfig] = useState({}); 
  const [systemConfig, setSystemConfig] = useState(null);

  const getActiveSteps = () => {
    const hasWLAN = selectedModel?.ports?.some(p => p.type === 'WLAN');
    const steps = [
      { id: 'model', label: t('wizard.steps.model') },
      { id: 'wan', label: t('wizard.steps.wan') },
      { id: 'dns', label: t('wizard.steps.dns') },
      { id: 'lan', label: t('wizard.steps.lan') },
      { id: 'assign', label: t('wizard.steps.assign') },
    ];
    
    if (hasWLAN) steps.push({ id: 'wireless', label: t('wizard.steps.wireless') });
    
    steps.push({ id: 'pbr', label: t('wizard.steps.pbr') });
    steps.push({ id: 'summary', label: t('wizard.steps.summary') });
    
    return steps;
  };

  const activeSteps = getActiveSteps();
  const currentStepData = activeSteps[currentStepIndex];

  // ✅ บันทึก Log เมื่อถึงหน้าสุดท้าย (Summary) ในโหมด Standalone
  useEffect(() => {
    if (currentStepData?.id === 'summary' && mode === 'standalone') {
      logService.createActivityLog(
        'GENERATE_CONFIG', 
        `Generate สคริปต์จาก Config Builder (Standalone) สำหรับโมเดล: ${selectedModel?.name || 'N/A'}`
      );
    }
  }, [currentStepData?.id, mode, selectedModel]);

  useEffect(() => {
    const initWizard = async () => {
      try {
        const resModels = await apiClient.get('/api/master/models');
        const availableModels = resModels.data;
        setModels(availableModels);
        
        const resSettings = await apiClient.get('/api/settings');
        const defaultNetSetting = resSettings.data.find(s => s.key === 'DEFAULT_NETWORKS');
        const sysSetting = resSettings.data.find(s => s.key === 'SYSTEM_CONFIG');

        if (sysSetting && sysSetting.value) {
          try {
            const parsed = typeof sysSetting.value === 'string' 
              ? JSON.parse(sysSetting.value) 
              : sysSetting.value;
            setSystemConfig(parsed);
          } catch (e) {
            console.error("Error parsing SYSTEM_CONFIG:", e);
          }
        }
        
        let initialNetworks = [
          { id: 'net_10', name: 'vlan10Service1', vlanId: 10, ip: '192.168.10.1/24', type: 'network', dhcp: true, hotspot: false },
          { id: 'net_56', name: 'vlan56NMS', vlanId: 56, ip: '10.234.56.254/24', type: 'network', dhcp: true, hotspot: false },
        ];

        if (defaultNetSetting && defaultNetSetting.value) {
          try {
            initialNetworks = typeof defaultNetSetting.value === 'string' 
              ? JSON.parse(defaultNetSetting.value) 
              : defaultNetSetting.value;
          } catch (e) {
            console.error("Error parsing DEFAULT_NETWORKS:", e);
          }
        }
        
        if (mode === 'edit' && initialData && initialData.configData) {
          const savedConfig = typeof initialData.configData === 'string' ? JSON.parse(initialData.configData) : initialData.configData;
          
          if (savedConfig.selectedModel) {
            const foundModel = availableModels.find(m => m.id === savedConfig.selectedModel.id);
            if (foundModel) setSelectedModel(foundModel);
          }
          if (savedConfig.wanList) setWanList(savedConfig.wanList);
          if (savedConfig.dnsConfig) setDnsConfig(savedConfig.dnsConfig);
          setNetworks(savedConfig.networks || initialNetworks);
          if (savedConfig.portConfig) setPortConfig(savedConfig.portConfig);
          if (savedConfig.wirelessConfig) setWirelessConfig(savedConfig.wirelessConfig);
          if (savedConfig.pbrConfig) setPbrConfig(savedConfig.pbrConfig);
        } else {
          setNetworks(initialNetworks);
        }
      } catch (error) {
        console.error("Error init wizard:", error);
      } finally {
        setLoading(false);
      }
    };
    initWizard();
  }, [initialData, mode]);

  // --- ACTION: Save Config ---
  const saveConfigToBackend = async (finalConfigData) => {
    const savePromise = (async () => {
      if (mode === 'create') {
        const payload = { 
          name: deviceMeta.name, 
          circuitId: deviceMeta.circuitId, 
          groupIds: deviceMeta.groupIds, 
          configData: finalConfigData 
        };
        return await apiClient.post('/api/devices', payload);
      } else {
        if (!initialData?.id) throw new Error("Missing Device ID for update");
        return await apiClient.put(`/api/devices/${initialData.id}`, {
          name: deviceMeta.name, 
          circuitId: deviceMeta.circuitId, 
          groupIds: deviceMeta.groupIds, 
          configData: finalConfigData
        });
      }
    })();

    toast.promise(savePromise, {
      loading: t('common.saving'),
      success: t('common.save_changes'),
      error: (err) => `${t('common.error')}: ${err.response?.data?.error || err.message}`
    });

    try {
      const response = await savePromise;
      
      // สั่งให้ React Query อัปเดตข้อมูลใหม่รอไว้
      await queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }); 

      // 🌟 ส่ง response.data กลับไปตรงๆ ให้ Step8 (มันมี property 'combinedToken' รออยู่แล้ว)
      return response.data; 
    } catch (error) {
      console.error("Failed to save config:", error);
      throw error;
    }
  };

  const nextStep = () => setCurrentStepIndex(prev => Math.min(prev + 1, activeSteps.length - 1));
  const prevStep = () => setCurrentStepIndex(prev => Math.max(prev - 1, 0));

  const canGoNext = () => {
    const stepId = currentStepData.id;
    if (stepId === 'model') return !!selectedModel && deviceMeta.name.trim() !== "" && deviceMeta.circuitId.trim() !== "";
    if (stepId === 'wan') return wanList.length > 0 && wanList.every(wan => (wan.type === 'pppoe' ? wan.username : wan.ipAddress));
    if (stepId === 'dns') return dnsConfig.servers.every(ip => ip.trim() !== '');
    if (stepId === 'lan') return networks.every(n => n.name && n.vlanId && n.ip);
    return true;
  };

  // 🟢 ปรับโครงสร้างให้ดูเป็น Card ที่ลอยเด่น (Balanced & Premium)
  return (
    <div className="max-w-5xl mx-auto w-full bg-white sm:rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05),0_10px_20px_-10px_rgba(0,0,0,0.02)] border-0 sm:border border-slate-100 overflow-hidden pb-10">
      {/* 1. Header & Stepper Area */}
      <div className="p-6 sm:p-10 bg-slate-50/50 border-b border-slate-100 relative">
        <div className="absolute top-[2.4rem] sm:top-[3.4rem] left-0 w-full h-1 bg-slate-200/50 hidden sm:block" /> 
        
        <div className="flex items-start justify-between gap-4 sm:gap-0 overflow-x-auto px-1 sm:px-4 pb-2 relative z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {activeSteps.map((step, idx) => {
            const stepNum = idx + 1;
            const isActive = currentStepIndex >= idx;
            return (
              <div key={step.id} className="flex flex-col items-center min-w-[64px] sm:min-w-[80px]">
                <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[18px] flex items-center justify-center text-xs sm:text-base font-black transition-all duration-500 border-2 bg-white ${
                  isActive ? 'border-blue-600 text-blue-600 shadow-lg shadow-blue-600/10' : 'border-slate-200 text-slate-300'
                } ${currentStepIndex === idx ? 'ring-4 ring-blue-100 !bg-blue-600 !text-white !border-blue-600 scale-110' : ''}`}>
                  {isActive && currentStepIndex > idx ? <CheckCircle size={20} strokeWidth={2.5} /> : stepNum}
                </div>
                <span className={`text-[10px] sm:text-[11px] mt-3 font-black uppercase tracking-wider text-center leading-tight ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Content Area */}
      <div className="min-h-[350px] sm:min-h-[500px] px-6 sm:px-12 py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <div className="size-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
             <div className="text-slate-400 font-black uppercase tracking-widest text-xs">{t('common.loading')}</div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {currentStepData.id === 'model' && <Step1_ModelSelect models={models} selectedModel={selectedModel} setSelectedModel={setSelectedModel} deviceMeta={deviceMeta} setDeviceMeta={setDeviceMeta} mode={mode} />}
            {currentStepData.id === 'wan' && <Step2_WANSetup selectedModel={selectedModel} wanList={wanList} setWanList={setWanList} />}
            {currentStepData.id === 'dns' && <Step3_DNSSettings dnsConfig={dnsConfig} setDnsConfig={setDnsConfig} />}
            {currentStepData.id === 'lan' && <Step4_LANSetup networks={networks} setNetworks={setNetworks} dnsConfig={dnsConfig} />}
            {currentStepData.id === 'assign' && <Step5_PortAssign selectedModel={selectedModel} wanList={wanList} networks={networks} portConfig={portConfig} setPortConfig={setPortConfig} />}
            {currentStepData.id === 'wireless' && <Step6_WirelessSetup selectedModel={selectedModel} wirelessConfig={wirelessConfig} setWirelessConfig={setWirelessConfig} />}
            {currentStepData.id === 'pbr' && <Step7_PBRSetup networks={networks} wanList={wanList} pbrConfig={pbrConfig} setPbrConfig={setPbrConfig} />}
            {currentStepData.id === 'summary' && (
              <Step8_Summary 
                {...deviceMeta} 
                selectedModel={selectedModel}
                wanList={wanList}
                dnsConfig={dnsConfig}
                networks={networks}
                portConfig={portConfig}
                wirelessConfig={wirelessConfig}
                pbrConfig={pbrConfig}
                heartbeatUrl={systemConfig?.heartbeatUrl}
                onSaveAndFinish={mode === 'standalone' ? null : saveConfigToBackend}
                onFinish={onFinish} 
                mode={mode}
              />
            )}
          </div>
        )}
      </div>

      {/* 3. Navigation Buttons */}
      <div className="flex flex-col-reverse sm:flex-row justify-between items-center px-6 sm:px-12 pt-8 border-t border-slate-50 gap-4">
        <button 
          onClick={prevStep} 
          disabled={currentStepIndex === 0} 
          className="w-full sm:w-auto flex justify-center items-center gap-2 px-8 py-3.5 text-slate-500 font-black uppercase tracking-widest text-[11px] hover:bg-slate-50 rounded-2xl disabled:opacity-30 transition-all active:scale-95"
        >
          <ArrowLeft size={16} /> {t('common.back')}
        </button>
        {currentStepIndex < activeSteps.length - 1 && (
          <button 
            onClick={nextStep} 
            disabled={!canGoNext()} 
            className="w-full sm:w-auto flex justify-center items-center gap-3 px-12 py-3.5 bg-blue-600 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-xl shadow-blue-600/20 active:scale-95"
          >
            {t('common.next')} <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ConfigWizard;