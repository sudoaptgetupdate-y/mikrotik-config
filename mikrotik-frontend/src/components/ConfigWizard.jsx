import { useState, useEffect } from 'react';
import { CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import apiClient from '../utils/apiClient'; // ✅ ใช้ apiClient ที่ทำไว้

// Import Modular Components
import Step1_ModelSelect from './wizard/Step1_ModelSelect';
import Step2_WANSetup from './wizard/Step2_WANSetup';
import Step3_DNSSettings from './wizard/Step3_DNSSettings';
import Step4_LANSetup from './wizard/Step4_LANSetup';
import Step5_PortAssign from './wizard/Step5_PortAssign';
import Step6_PBRSetup from './wizard/Step6_PBRSetup';
import Step7_Summary from './wizard/Step7_Summary';

const ConfigWizard = ({ initialData, onFinish }) => {
  const [step, setStep] = useState(1);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  // ฟังก์ชันหา Hostname เพื่อส่งให้ Generator สร้าง Script (เช่น http://10.0.0.100:3000 -> 10.0.0.100)
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
    circuitId: initialData?.circuitId || "", 
    // รองรับ Token หลายรูปแบบ
    token: initialData?.token || initialData?.apiToken || initialData?.api_token || "",
    apiHost: getApiHost()
  });

  const [selectedModel, setSelectedModel] = useState(null);
  const [wanList, setWanList] = useState([]);
  
  const [dnsConfig, setDnsConfig] = useState({
    servers: ['8.8.8.8', '1.1.1.1'],
    allowRemoteRequests: true
  });

  // Default Networks
  const [networks, setNetworks] = useState([
    { id: 'net_10', name: 'vlan10Service1', vlanId: 10, ip: '192.168.10.1/24', type: 'network', dhcp: true, hotspot: false },
    { id: 'net_20', name: 'vlan20service2', vlanId: 20, ip: '192.168.20.1/24', type: 'network', dhcp: true, hotspot: false },
    { id: 'net_30', name: 'vlan30FreeWiFi', vlanId: 30, ip: '192.168.30.1/24', type: 'hotspot', dhcp: true, hotspot: true },
    { id: 'net_40', name: 'vlan40CCTV', vlanId: 40, ip: '192.168.40.1/24', type: 'network', dhcp: true, hotspot: false },
    { id: 'net_50', name: 'vlan50Voice', vlanId: 50, ip: '192.168.50.1/24', type: 'network', dhcp: true, hotspot: false },
    { id: 'net_56', name: 'vlan56NMS', vlanId: 56, ip: '10.234.56.254/24', type: 'network', dhcp: true, hotspot: false },
  ]);

  const [portConfig, setPortConfig] = useState({});
  const [pbrConfig, setPbrConfig] = useState({ enabled: false, mappings: {} });

  // --- DATA FETCHING & SYNC ---
  useEffect(() => {
    const initWizard = async () => {
      try {
        // 1. ดึงข้อมูล Models
        const res = await apiClient.get('/api/master/models');
        const availableModels = res.data;
        setModels(availableModels);
        
        // 2. ถ้ามีข้อมูลเดิม (Mode Edit) ให้ Restore State
        if (initialData && initialData.configData) {
          console.log("Restoring config data...");
          const savedConfig = typeof initialData.configData === 'string' 
            ? JSON.parse(initialData.configData) 
            : initialData.configData;

          // Restore: Selected Model
          if (savedConfig.selectedModel) {
            const foundModel = availableModels.find(m => m.id === savedConfig.selectedModel.id);
            if (foundModel) setSelectedModel(foundModel);
          }

          // Restore: Other Configs
          if (savedConfig.wanList) setWanList(savedConfig.wanList);
          if (savedConfig.dnsConfig) setDnsConfig(savedConfig.dnsConfig);
          if (savedConfig.networks) setNetworks(savedConfig.networks);
          if (savedConfig.portConfig) setPortConfig(savedConfig.portConfig);
          if (savedConfig.pbrConfig) setPbrConfig(savedConfig.pbrConfig);
        }

      } catch (error) {
        console.error("Error init wizard:", error);
      } finally {
        setLoading(false);
      }
    };

    initWizard();
  }, [initialData]);

  // --- ACTION: Save Config to Backend ---
  const saveConfigToBackend = async (finalConfigData) => {
    if (!initialData?.id) {
      console.error("No Device ID found to save config");
      alert("Error: No Device ID. Cannot save.");
      return;
    }

    try {
      await apiClient.put(`/api/devices/${initialData.id}`, {
        configData: finalConfigData,
        isConfigured: true 
      });
      
      console.log("Config saved successfully");
      
      // เรียก Callback กลับไปหน้า Dashboard
      if (onFinish) onFinish();

    } catch (error) {
      console.error("Failed to save config:", error);
      alert("Error saving configuration to database!");
    }
  };

  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => setStep(prev => prev - 1);

  const canGoNext = () => {
    if (step === 1) return !!selectedModel;
    // ✅ Step 2: เช็คแค่ PPPoE กับ Static (ตัด DHCP Client ออกแล้ว)
    if (step === 2) return wanList.length > 0 && wanList.every(wan => (wan.type === 'pppoe' ? wan.username : wan.ipAddress));
    if (step === 3) return dnsConfig.servers.every(ip => ip.trim() !== '');
    if (step === 4) return networks.every(n => n.name && n.vlanId && n.ip);
    return true;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-slate-200 my-8">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-10 px-4 md:px-10 relative">
        <div className="absolute top-[1.25rem] left-0 w-full h-1 bg-slate-100 -z-0 hidden md:block" /> 
        {['Model', 'WAN', 'DNS', 'LAN', 'Assign', 'PBR', 'Finish'].map((label, idx) => {
          const stepNum = idx + 1;
          const isActive = step >= stepNum;
          return (
            <div key={idx} className="flex flex-col items-center relative z-10 bg-white px-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 border-2 ${
                isActive ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400'
              } ${step === stepNum ? 'ring-4 ring-blue-100' : ''}`}>
                {isActive ? (step > stepNum ? <CheckCircle size={20} /> : stepNum) : stepNum}
              </div>
              <span className={`text-[10px] md:text-xs mt-2 font-medium ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="min-h-[450px]">
        {loading ? (
          <div className="text-center py-20 text-slate-400 font-medium italic">Loading router definitions...</div>
        ) : (
          <>
            {step === 1 && <Step1_ModelSelect models={models} selectedModel={selectedModel} setSelectedModel={setSelectedModel} />}
            {step === 2 && <Step2_WANSetup selectedModel={selectedModel} wanList={wanList} setWanList={setWanList} />}
            {step === 3 && <Step3_DNSSettings dnsConfig={dnsConfig} setDnsConfig={setDnsConfig} />}
            {step === 4 && <Step4_LANSetup networks={networks} setNetworks={setNetworks} dnsConfig={dnsConfig} />}
            {step === 5 && <Step5_PortAssign selectedModel={selectedModel} wanList={wanList} networks={networks} portConfig={portConfig} setPortConfig={setPortConfig} />}
            {step === 6 && <Step6_PBRSetup networks={networks} wanList={wanList} pbrConfig={pbrConfig} setPbrConfig={setPbrConfig} />}
            {step === 7 && (
              <Step7_Summary 
                {...deviceMeta}
                selectedModel={selectedModel}
                wanList={wanList}
                dnsConfig={dnsConfig}
                networks={networks}
                portConfig={portConfig}
                pbrConfig={pbrConfig}
                // ✅ ส่งฟังก์ชัน Save ไปให้ Step 7
                onSaveAndFinish={saveConfigToBackend}
              />
            )}
          </>
        )}
      </div>

      <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-100">
        <button onClick={prevStep} disabled={step === 1} className="px-6 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg disabled:opacity-50 transition flex items-center gap-2">
          <ArrowLeft size={18} /> Back
        </button>
        {step < 7 && (
          <button onClick={nextStep} disabled={!canGoNext()} className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition shadow-sm">
            Next Step <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ConfigWizard;