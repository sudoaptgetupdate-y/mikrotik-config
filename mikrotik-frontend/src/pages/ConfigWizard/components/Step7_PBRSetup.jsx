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
          <p className="text-sm text-slate-500 mt-1 font-medium">กำหนดเส้นทางออกอินเทอร์เน็ตเฉพาะเจาะจงให้กับแต่ละวงเครือข่าย (VLAN)</p>
        </div>

        {/* Toggle PBR Switch */}
        <button 
          onClick={togglePbr}
          className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
            pbrConfig.enabled ? 'bg-blue-600' : 'bg-slate-300'
          }`}
        >
          <span className="sr-only">Enable PBR</span>
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
              pbrConfig.enabled ? 'translate-x-7' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* --- Content Area --- */}
      <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all duration-300 relative ${pbrConfig.enabled ? 'border-blue-300 ring-4 ring-blue-50' : 'border-slate-200'}`}>
        
        {/* Overlay Block (เมื่อปิด PBR) */}
        {!pbrConfig.enabled && (
          <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <div className="bg-white px-6 py-4 rounded-2xl shadow-lg border border-slate-200 flex items-center gap-3">
              <ShieldAlert className="text-orange-500" size={24} />
              <div>
                <p className="font-bold text-slate-800">PBR is Disabled</p>
                <p className="text-xs text-slate-500">Enable to configure specific routing rules.</p>
              </div>
            </div>
          </div>
        )}

        {networks.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium bg-slate-50/50">
            ไม่พบข้อมูล Network (VLAN) กรุณาสร้าง Network ก่อนใช้งาน PBR
          </div>
        ) : (
          /* เอา max-h-[...] และ overflow-y-auto ออก ปล่อยให้ตารางสูงตามจริง */
          <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full relative">
            <table className="w-full text-left border-collapse min-w-[700px]">
              
              <thead className="bg-slate-50/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-4 pl-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[40%]">Local Network (Source)</th>
                  <th className="p-4 pr-6 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[60%]">Route via WAN (Destination)</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-100">
                {networks.map((net) => {
                  const selectedWan = (pbrConfig.mappings && pbrConfig.mappings[net.id]) || (wanList.length > 0 ? wanList[0].id : '');

                  return (
                    <tr key={net.id} className={`transition-colors group hover:bg-slate-50/50 ${!pbrConfig.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                      
                      <td className="p-4 pl-6 align-middle">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${pbrConfig.enabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Network size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">VLAN {net.vlanId} • {net.name}</p>
                            <p className="text-xs font-mono text-slate-500 mt-0.5">{net.ip}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 pr-6 align-middle">
                        <div className="relative">
                          <Globe className={`absolute left-3.5 top-1/2 -translate-y-1/2 z-10 ${pbrConfig.enabled ? 'text-blue-500' : 'text-slate-400'}`} size={16} />
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