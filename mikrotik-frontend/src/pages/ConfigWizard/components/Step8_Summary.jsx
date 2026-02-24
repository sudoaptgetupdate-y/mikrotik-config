import React, { useState } from 'react';
import { FileDown, CheckCircle, Network, ShieldCheck, Globe, Loader2, Router, Server } from 'lucide-react';
import { generateMikrotikScript } from "../../../utils/mikrotikGenerator";

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
  onSaveAndFinish 
}) => {

  const [isGenerating, setIsGenerating] = useState(false);

  // === ฟังก์ชันสำหรับ Gen และ Download (ของเดิม 100%) ===
  const handleGenAndFinish = async () => { 
    setIsGenerating(true); 
    
    let configData = {
      selectedModel, wanList, networks, portConfig, pbrConfig, wirelessConfig,
      dnsConfig, circuitId, token, apiHost
    };

    try {
      if (onSaveAndFinish) {
        console.log("Saving config to backend...");
        const savedDevice = await onSaveAndFinish(configData);

        if (savedDevice && savedDevice.apiToken) {
          configData.token = savedDevice.apiToken;
        } else if (savedDevice && savedDevice.configData && savedDevice.configData.token) {
          configData.token = savedDevice.configData.token;
        }
      } else {
        console.error("onSaveAndFinish prop is missing!");
        setIsGenerating(false);
        return;
      }

      const scriptContent = generateMikrotikScript(configData);

      const element = document.createElement("a");
      const file = new Blob([scriptContent], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `${circuitId}_config.rsc`;
      document.body.appendChild(element); 
      element.click();
      document.body.removeChild(element);

    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to save and generate config. See console for details.");
    } finally {
      setIsGenerating(false); 
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* --- Success Header --- */}
      <div className="text-center mb-10 relative">
        <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border-[8px] border-green-50 shadow-sm relative z-10">
          <CheckCircle size={48} className="animate-in zoom-in duration-500 delay-150" strokeWidth={2.5} />
        </div>
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Setup Ready!</h2>
        <p className="text-slate-500 mt-2 font-medium">ตรวจสอบรายละเอียดการตั้งค่าก่อนสร้างสคริปต์ Config</p>
      </div>

      {/* --- Summary Cards Grid --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        
        {/* Card 1: Device & Connectivity */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
            <Globe size={18} className="text-blue-500" />
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Connectivity</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm font-medium flex items-center gap-2">
                <Router size={16} className="text-slate-400" /> Model
              </span>
              <span className="font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg text-sm">{selectedModel?.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm font-medium flex items-center gap-2">
                <Server size={16} className="text-slate-400" /> Identity
              </span>
              <span className="font-bold text-blue-600">{circuitId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm font-medium">WAN Interfaces</span>
              <span className="font-bold text-slate-800">{wanList.length} Ports</span>
            </div>
            <div className="flex justify-between items-center">
               <span className="text-slate-500 text-sm font-medium">Wireless Configs</span>
               <span className="font-bold text-slate-800">{Object.keys(wirelessConfig || {}).length} WLANs</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-50">
              <span className="text-slate-500 text-sm font-medium">DNS Mode</span>
              <span className="font-bold text-slate-800 text-sm">
                {dnsConfig.allowRemoteRequests ? 'Server (Allow Remote)' : 'Client Only'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Local Networks */}
        <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
            <Network size={18} className="text-blue-500" />
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Local Networks</h3>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[240px] pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
            {networks.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-4">ไม่มีข้อมูล Network</div>
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
            <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Security & Policy</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">User Management</p>
              <p className="font-black text-slate-700 text-lg">ntadmin</p>
              <p className="text-[11px] text-slate-500 font-medium">Auto-Created for Centralized Auth</p>
            </div>
            
            <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Enabled Services</p>
              <p className="font-black text-green-600 text-lg flex items-center gap-2">Winbox Only <CheckCircle size={16}/></p>
              <p className="text-[11px] text-slate-500 font-medium">SSH, Telnet, WebFig disabled</p>
            </div>
            
            <div className={`p-5 border rounded-xl flex flex-col justify-center transition-colors ${pbrConfig.enabled ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">PBR Status</p>
              <p className={`font-black text-lg ${pbrConfig.enabled ? 'text-blue-700' : 'text-slate-500'}`}>
                {pbrConfig.enabled ? 'Active' : 'Disabled'}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                {pbrConfig.enabled ? 'Custom routing mappings applied' : 'Standard default routing'}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* --- Action Button --- */}
      <div className="flex flex-col items-center">
        <button 
          onClick={handleGenAndFinish}
          disabled={isGenerating}
          className="group relative flex items-center justify-center gap-3 bg-blue-600 text-white w-full sm:w-auto px-12 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-500 hover:shadow-blue-600/40 hover:-translate-y-1 transition-all duration-300 disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
             <FileDown size={24} className="group-hover:animate-bounce" />
          )}
          {isGenerating ? 'Generating & Saving...' : 'Generate Config & Finish'}
        </button>
        <p className="text-center text-sm font-medium text-slate-400 mt-5">
          ไฟล์ <span className="text-slate-600 font-mono bg-slate-100 px-1.5 py-0.5 rounded">.rsc</span> จะถูกดาวน์โหลด และคุณจะถูกพาไปยังหน้า Dashboard
        </p>
      </div>

    </div>
  );
};

export default Step8_Summary;