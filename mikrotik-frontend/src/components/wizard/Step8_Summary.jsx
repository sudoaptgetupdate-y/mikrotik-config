import React, { useState } from 'react';
import { FileDown, CheckCircle, Network, ShieldCheck, Globe, Loader2 } from 'lucide-react';
import { generateMikrotikScript } from "../../utils/mikrotikGenerator";

const Step8_Summary = ({ 
  selectedModel, 
  wanList, 
  dnsConfig, 
  networks, 
  portConfig, 
  pbrConfig, 
  wirelessConfig, // ✅ 1. เพิ่ม wirelessConfig กลับเข้ามาตรงนี้
  circuitId, 
  token, 
  apiHost,
  onSaveAndFinish 
}) => {

  const [isGenerating, setIsGenerating] = useState(false); // State สำหรับปุ่มหมุนๆ

  // ฟังก์ชันสำหรับ Gen และ Download
  const handleGenAndFinish = async () => { 
    setIsGenerating(true); // เริ่มโหลด
    
    // 1. Prepare Base Data
    let configData = {
      selectedModel, wanList, networks, portConfig, pbrConfig, wirelessConfig,
      dnsConfig, circuitId, token, apiHost
    };

    try {
      // 2. สั่งบันทึกลง Backend ก่อน และ "รอ" (await) จนกว่าจะเสร็จ
      if (onSaveAndFinish) {
        console.log("Saving config to backend...");
        const savedDevice = await onSaveAndFinish(configData);

        // 3. เอา Token จริงที่ Backend สร้างให้ ยัดใส่กลับเข้าไปใน configData
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

      // 4. Generate Script (ตอนนี้ configData มี Token จริงแล้ว!)
      const scriptContent = generateMikrotikScript(configData);

      // 5. Trigger Download
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
      setIsGenerating(false); // หยุดโหลด
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-10">
      
      <div className="text-center mb-10">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-green-50 shadow-sm">
          <CheckCircle size={40} />
        </div>
        <h2 className="text-3xl font-bold text-slate-800">Setup Complete!</h2>
        <p className="text-slate-500 mt-2">ตรวจสอบรายละเอียดการตั้งค่าก่อนดาวน์โหลดไฟล์ Config</p>
      </div>

      {/* --- Summary Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        
        {/* Device & WAN */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
            <Globe size={16} /> Connectivity
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-slate-600 text-sm">Model</span>
              <span className="font-bold text-slate-800">{selectedModel?.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-slate-600 text-sm">Identity</span>
              <span className="font-bold text-blue-600">{circuitId}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
              <span className="text-slate-600 text-sm">WAN Interfaces</span>
              <span className="font-bold text-slate-800">{wanList.length} Ports</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
               <span className="text-slate-600 text-sm">Wireless Configs</span>
               <span className="font-bold text-slate-800">{Object.keys(wirelessConfig || {}).length} WLANs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 text-sm">DNS Mode</span>
              <span className="font-bold text-slate-800">
                {dnsConfig.allowRemoteRequests ? 'Server (Allow Remote)' : 'Client Only'}
              </span>
            </div>
          </div>
        </div>

        {/* Local Network */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
            <Network size={16} /> Local Networks
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
            {networks.map(net => (
              <div key={net.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                <div className="flex flex-col">
                  <span className="font-bold text-xs text-slate-700">{net.name}</span>
                  <span className="text-[10px] text-slate-400">VLAN {net.vlanId}</span>
                </div>
                <div className="flex gap-1">
                  {net.dhcp && <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded">DHCP</span>}
                  {net.hotspot && <span className="text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">Hotspot</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security & PBR */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
            <ShieldCheck size={16} /> Security & Policy
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 rounded-xl text-center">
              <p className="text-xs text-slate-500 mb-1">User Management</p>
              <p className="font-bold text-slate-700">ntadmin (Auto-Created)</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl text-center">
              <p className="text-xs text-slate-500 mb-1">Services</p>
              <p className="font-bold text-green-600">Winbox Only</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl text-center">
              <p className="text-xs text-slate-500 mb-1">PBR Status</p>
              <p className={`font-bold ${pbrConfig.enabled ? 'text-blue-600' : 'text-slate-400'}`}>
                {pbrConfig.enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* --- Action Button --- */}
      <div className="flex justify-center">
        <button 
          onClick={handleGenAndFinish}
          disabled={isGenerating}
          className="group relative flex items-center gap-3 bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-105 transition-all disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <Loader2 size={24} className="animate-spin" />
          ) : (
             <FileDown size={24} className="group-hover:animate-bounce" />
          )}
          {isGenerating ? 'Generating & Saving...' : 'Generate Config & Finish'}
        </button>
      </div>
      <p className="text-center text-xs text-slate-400 mt-4">
        ไฟล์ .rsc จะถูกดาวน์โหลด และคุณจะถูกพาไปยังหน้า Dashboard
      </p>

    </div>
  );
};

export default Step8_Summary;