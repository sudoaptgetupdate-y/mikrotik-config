import { useState, useEffect } from 'react';
import { CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import apiClient from '../../utils/apiClient';

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
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

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
    token: initialData?.token || initialData?.apiToken || "",
    apiHost: getApiHost()
  });

  const [selectedModel, setSelectedModel] = useState(null);
  const [wanList, setWanList] = useState([]);
  
  const [dnsConfig, setDnsConfig] = useState({
    servers: ['8.8.8.8', '1.1.1.1'],
    allowRemoteRequests: true
  });

  // Default VLANs (รอโหลดจาก Backend)
  const [networks, setNetworks] = useState([]);

  const [portConfig, setPortConfig] = useState({});
  const [pbrConfig, setPbrConfig] = useState({ enabled: false, mappings: {} });
  const [wirelessConfig, setWirelessConfig] = useState({}); 

  // --- 🧠 ระบบอัจฉริยะคำนวณสเต็ป (Dynamic Steps) ---
  const getActiveSteps = () => {
    const hasWLAN = selectedModel?.ports?.some(p => p.type === 'WLAN');
    const steps = [
      { id: 'model', label: 'Device Info' },
      { id: 'wan', label: 'WAN' },
      { id: 'dns', label: 'DNS' },
      { id: 'lan', label: 'LAN' },
      { id: 'assign', label: 'Assign' },
    ];
    
    // แทรกหน้า Wireless ถ้าอุปกรณ์มี Wi-Fi
    if (hasWLAN) steps.push({ id: 'wireless', label: 'Wireless' });
    
    steps.push({ id: 'pbr', label: 'PBR' });
    steps.push({ id: 'summary', label: 'Finish' });
    
    return steps;
  };

  const activeSteps = getActiveSteps();
  const currentStepData = activeSteps[currentStepIndex];

  // --- DATA FETCHING & SYNC ---
  useEffect(() => {
    const initWizard = async () => {
      try {
        // ⭐ 1. โหลด Models
        const resModels = await apiClient.get('/api/master/models');
        const availableModels = resModels.data;
        setModels(availableModels);
        
        // ⭐ 2. โหลด Settings (เพื่อหา DEFAULT_NETWORKS)
        const resSettings = await apiClient.get('/api/settings');
        const defaultNetSetting = resSettings.data.find(s => s.key === 'DEFAULT_NETWORKS');
        
        // ค่าเผื่อฉุกเฉิน กรณีที่ใน Database ยังไม่เคยตั้งค่า DEFAULT_NETWORKS เลย
        let initialNetworks = [
          { id: 'net_10', name: 'vlan10Service1', vlanId: 10, ip: '192.168.10.1/24', type: 'network', dhcp: true, hotspot: false },
          { id: 'net_56', name: 'vlan56NMS', vlanId: 56, ip: '10.234.56.254/24', type: 'network', dhcp: true, hotspot: false },
        ];

        // ถ้า Backend มีค่าเซ็ตไว้ ให้ใช้ค่านั้นแทน
        if (defaultNetSetting && defaultNetSetting.value) {
          try {
            initialNetworks = typeof defaultNetSetting.value === 'string' 
              ? JSON.parse(defaultNetSetting.value) 
              : defaultNetSetting.value;
          } catch (e) {
            console.error("Error parsing DEFAULT_NETWORKS:", e);
          }
        }
        
        // ⭐ 3. กำหนดค่า State
        if (mode === 'edit' && initialData && initialData.configData) {
          const savedConfig = typeof initialData.configData === 'string' ? JSON.parse(initialData.configData) : initialData.configData;
          
          if (savedConfig.selectedModel) {
            const foundModel = availableModels.find(m => m.id === savedConfig.selectedModel.id);
            if (foundModel) setSelectedModel(foundModel);
          }
          if (savedConfig.wanList) setWanList(savedConfig.wanList);
          if (savedConfig.dnsConfig) setDnsConfig(savedConfig.dnsConfig);
          
          // ใช้ค่าจาก Config เดิมที่เคย Save ไว้ ถ้าไม่มีค่อยใช้ initialNetworks
          setNetworks(savedConfig.networks || initialNetworks);
          
          if (savedConfig.portConfig) setPortConfig(savedConfig.portConfig);
          if (savedConfig.wirelessConfig) setWirelessConfig(savedConfig.wirelessConfig);
          if (savedConfig.pbrConfig) setPbrConfig(savedConfig.pbrConfig);
        } else {
          // โหมด Create: โยนค่า initialNetworks (ที่โหลดจาก Global Settings) ไปเป็นค่าเริ่มต้นเลย
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
    try {
      let response;
      if (mode === 'create') {
        const payload = { name: deviceMeta.name, circuitId: deviceMeta.circuitId, userId: 1, configData: finalConfigData };
        response = await apiClient.post('/api/devices', payload);
      } else {
        if (!initialData?.id) throw new Error("Missing Device ID for update");
        response = await apiClient.put(`/api/devices/${initialData.id}`, {
          configData: finalConfigData, name: deviceMeta.name, circuitId: deviceMeta.circuitId
        });
      }
      if (onFinish) onFinish();
      return response.data; 
    } catch (error) {
      console.error("Failed to save config:", error);
      alert(`Error saving configuration: ${error.response?.data?.error || error.message}`);
      throw error;
    }
  };

  const nextStep = () => setCurrentStepIndex(prev => Math.min(prev + 1, activeSteps.length - 1));
  const prevStep = () => setCurrentStepIndex(prev => Math.max(prev - 1, 0));

  // --- Validation Rules ---
  const canGoNext = () => {
    const stepId = currentStepData.id;
    if (stepId === 'model') return !!selectedModel && deviceMeta.name.trim() !== "" && deviceMeta.circuitId.trim() !== "";
    if (stepId === 'wan') return wanList.length > 0 && wanList.every(wan => (wan.type === 'pppoe' ? wan.username : wan.ipAddress));
    if (stepId === 'dns') return dnsConfig.servers.every(ip => ip.trim() !== '');
    if (stepId === 'lan') return networks.every(n => n.name && n.vlanId && n.ip);
    return true;
  };

  return (
    // ✅ จุดที่ 1: ปรับ Padding และ Margin บนมือถือให้แคบลง (p-4 my-4) และกว้างปกติบนจอใหญ่ (sm:p-6 sm:my-8)
    <div className="max-w-6xl mx-auto p-4 sm:p-6 bg-white sm:rounded-xl shadow-sm border-0 sm:border border-slate-200 my-4 sm:my-8">
      
      {/* Dynamic Progress Bar */}
      {/* ✅ จุดที่ 2: เพิ่ม overflow-x-auto และซ่อน Scrollbar เพื่อให้เลื่อนซ้ายขวาได้บนมือถือ */}
      <div className="relative mb-8 sm:mb-10">
        <div className="absolute top-[1.25rem] sm:top-[1.25rem] left-0 w-full h-1 bg-slate-100 hidden sm:block" /> 
        
        <div className="flex items-start justify-between gap-4 sm:gap-0 overflow-x-auto px-1 sm:px-4 md:px-10 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {activeSteps.map((step, idx) => {
            const stepNum = idx + 1;
            const isActive = currentStepIndex >= idx;
            return (
              // ✅ บังคับขนาดความกว้างขั้นต่ำ (min-w) บนมือถือเพื่อไม่ให้โดนบีบ
              <div key={step.id} className="flex flex-col items-center relative z-10 bg-white px-2 min-w-[64px] sm:min-w-[80px]">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-base font-bold transition-all duration-300 border-2 ${
                  isActive ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400'
                } ${currentStepIndex === idx ? 'ring-4 ring-blue-100' : ''}`}>
                  {isActive ? (currentStepIndex > idx ? <CheckCircle size={16} className="sm:w-5 sm:h-5" /> : stepNum) : stepNum}
                </div>
                <span className={`text-[10px] sm:text-xs mt-2 font-medium text-center leading-tight ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ✅ จุดที่ 3: ปรับความสูงขั้นต่ำให้ยืดหยุ่นบนมือถือ */}
      <div className="min-h-[300px] sm:min-h-[450px]">
        {loading ? (
          <div className="text-center py-20 text-slate-400 font-medium italic">Loading...</div>
        ) : (
          <>
            {currentStepData.id === 'model' && <Step1_ModelSelect models={models} selectedModel={selectedModel} setSelectedModel={setSelectedModel} deviceMeta={deviceMeta} setDeviceMeta={setDeviceMeta} />}
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
                onSaveAndFinish={saveConfigToBackend}
              />
            )}
          </>
        )}
      </div>

      {/* ✅ จุดที่ 4: เปลี่ยนปุ่มให้เป็นแถวแนวตั้งบนมือถือ (Back อยู่ล่าง Next อยู่บน) หรือเรียงคู่กันให้เต็มจอ */}
      <div className="flex flex-col-reverse sm:flex-row justify-between items-center mt-8 pt-6 border-t border-slate-100 gap-3">
        <button 
          onClick={prevStep} 
          disabled={currentStepIndex === 0} 
          className="w-full sm:w-auto flex justify-center items-center gap-2 px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-50 border border-slate-200 sm:border-transparent rounded-lg disabled:opacity-50 transition"
        >
          <ArrowLeft size={18} /> Back
        </button>
        {currentStepIndex < activeSteps.length - 1 && (
          <button 
            onClick={nextStep} 
            disabled={!canGoNext()} 
            className="w-full sm:w-auto flex justify-center items-center gap-2 px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition shadow-sm"
          >
            Next Step <ArrowRight size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ConfigWizard;