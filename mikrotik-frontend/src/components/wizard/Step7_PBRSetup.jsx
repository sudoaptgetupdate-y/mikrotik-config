import React from 'react';
import { Route, Network, Globe, ChevronDown, ShieldAlert } from 'lucide-react';

const Step7_PBRSetup = ({ networks = [], wanList = [], pbrConfig, setPbrConfig }) => {
  
  const togglePbr = () => {
    setPbrConfig(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const setNetworkWan = (netId, wanId) => {
    const currentMappings = pbrConfig.mappings || {};
    setPbrConfig({
      ...pbrConfig,
      mappings: { ...currentMappings, [netId]: wanId }
    });
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* --- Header Section --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Route className="text-blue-600" /> Policy-Based Routing (PBR)
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">กำหนดเส้นทางออกอินเทอร์เน็ตเฉพาะเจาะจงสำหรับแต่ละวงเครือข่าย</p>
        </div>
      </div>

      {/* --- Main Toggle Card --- */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${pbrConfig.enabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
              <Route size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Enable Policy-Based Routing</h3>
              <p className="text-sm text-slate-500 mt-1 font-medium leading-relaxed max-w-xl">
                หากเปิดใช้งาน คุณจะสามารถบังคับให้แต่ละวง LAN (VLAN) วิ่งออกเน็ตผ่านสาย WAN ที่กำหนดได้ (เหมาะสำหรับแยกเน็ตเกม/เน็ตทำงาน หรือแยกแผนก)
              </p>
            </div>
          </div>
          
          {/* Modern Toggle Switch */}
          <div className="shrink-0 flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200">
            <span className={`text-xs font-bold uppercase tracking-wider ${pbrConfig.enabled ? 'text-blue-600' : 'text-slate-400'}`}>
              {pbrConfig.enabled ? 'Active' : 'Disabled'}
            </span>
            <button 
              type="button"
              onClick={togglePbr}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 ${pbrConfig.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-300 ease-in-out ${pbrConfig.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* --- Routing Mapping Table --- */}
      {/* เอฟเฟกต์เบลอและคลิกไม่ได้เมื่อปิด PBR */}
      <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all duration-500 ${pbrConfig.enabled ? 'border-blue-200 ring-4 ring-blue-50' : 'border-slate-200 opacity-60 grayscale-[0.5] pointer-events-none'}`}>
        
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
          <Network size={18} className="text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Routing Map</h3>
        </div>

        {networks.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center">
            <ShieldAlert size={40} className="text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">ยังไม่มีข้อมูล Network (กรุณาสร้าง LAN/VLAN ในหน้าก่อนหน้า)</p>
          </div>
        ) : wanList.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center">
            <ShieldAlert size={40} className="text-orange-300 mb-3" />
            <p className="text-slate-500 font-medium">ยังไม่มีข้อมูล WAN (กรุณาตั้งค่า WAN ในหน้าก่อนหน้า)</p>
          </div>
        ) : (
          <div className="max-h-[55vh] overflow-y-auto overflow-x-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full relative">
            <table className="w-full text-left border-collapse min-w-[600px]">
              
              {/* Sticky Header */}
              <thead className="bg-slate-50/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-4 pl-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-1/2">Local Network (Source)</th>
                  <th className="p-4 pr-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-1/2">Preferred Outbound WAN (Destination)</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-100">
                {networks.map((net) => {
                  const selectedWan = pbrConfig.mappings?.[net.id] || wanList[0]?.id;
                  
                  return (
                    <tr key={net.id} className="hover:bg-slate-50/50 transition-colors group">
                      
                      {/* Local Network Info */}
                      <td className="p-4 pl-6 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                            <Network size={20} />
                          </div>
                          <div>
                            <p className="font-black text-slate-700 text-sm group-hover:text-blue-700 transition-colors">{net.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md">VLAN {net.vlanId}</span>
                              <span className="text-[11px] font-mono text-slate-400">{net.ip}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* WAN Selection */}
                      <td className="p-4 pr-6 align-middle">
                        <div className="relative">
                          <Globe className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${pbrConfig.enabled ? 'text-blue-500' : 'text-slate-400'} z-10`} size={18} />
                          <select 
                            value={selectedWan}
                            onChange={(e) => setNetworkWan(net.id, e.target.value)}
                            className={`w-full pl-10 pr-10 py-3 border rounded-xl text-[13px] font-bold outline-none transition-all appearance-none shadow-sm relative cursor-pointer ${
                              pbrConfig.enabled 
                                ? 'bg-white border-blue-200 text-blue-800 focus:border-blue-400 focus:ring-4 focus:ring-blue-50 hover:border-blue-300'
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}
                          >
                            {wanList.map((wan, idx) => (
                              <option key={wan.id} value={wan.id}>
                                WAN {idx + 1} • {wan.interface} ({wan.type.toUpperCase()})
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={16} className={`absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${pbrConfig.enabled ? 'text-blue-400' : 'text-slate-400'}`} />
                        </div>
                      </td>
                      
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default Step7_PBRSetup;