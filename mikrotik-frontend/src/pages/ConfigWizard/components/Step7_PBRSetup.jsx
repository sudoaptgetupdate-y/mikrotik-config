import React, { useEffect } from 'react';
import { Route, Network, Globe, ChevronDown, ShieldAlert, Lock } from 'lucide-react';

const Step7_PBRSetup = ({ networks = [], wanList = [], pbrConfig, setPbrConfig }) => {
  
  // ✅ 1. ตัวแปรสำหรับเช็คว่ามี WAN ตั้งแต่ 2 ช่องทางขึ้นไปหรือไม่
  const isMultiWan = wanList.length >= 2;

  // ✅ 2. บังคับปิด PBR อัตโนมัติ ถ้าผู้ใช้ย้อนกลับไปลบ WAN จนเหลือน้อยกว่า 2
  useEffect(() => {
    if (!isMultiWan && pbrConfig.enabled) {
      setPbrConfig(prev => ({ ...prev, enabled: false, mappings: {} }));
    }
  }, [isMultiWan, pbrConfig.enabled, setPbrConfig]);

  const togglePbr = () => {
    if (!isMultiWan) return; // ป้องกันการกดเปลี่ยน State ถ้า WAN ไม่ถึง 2
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
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Route className="text-blue-600" /> Policy-Based Routing (PBR)
          </h2>
          <p className="text-sm text-slate-500 mt-1">กำหนดเส้นทางออกอินเทอร์เน็ตเฉพาะเจาะจงให้กับแต่ละวงเครือข่าย</p>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center gap-3">
          {/* ✅ แสดงข้อความแจ้งเตือนข้างๆ ปุ่มปิด-เปิด กรณีที่ WAN ไม่ถึง 2 */}
          {!isMultiWan && (
            <span className="text-xs font-bold text-red-500 flex items-center gap-1 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100">
              <Lock size={14} /> ต้องมี 2 WAN ขึ้นไป
            </span>
          )}

          <button
            onClick={togglePbr}
            disabled={!isMultiWan}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
              pbrConfig.enabled ? 'bg-blue-600' : 'bg-slate-300'
            } ${!isMultiWan ? 'opacity-50 cursor-not-allowed grayscale' : 'cursor-pointer hover:ring-4 ring-blue-50'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
              pbrConfig.enabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* --- Content Section --- */}
      {/* ✅ ถ้า WAN ไม่ถึง 2 ให้โชว์หน้าจอแจ้งเตือนแทนตาราง */}
      {!isMultiWan ? (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
          <div className="bg-slate-200 p-4 rounded-full mb-4">
            <ShieldAlert size={40} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">ฟีเจอร์นี้รองรับเฉพาะระบบ Multi-WAN</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            ปัจจุบันคุณตั้งค่าอินเทอร์เน็ต (WAN) ไว้เพียง <b>{wanList.length} ช่องทาง</b><br/>
            ระบบ Policy-Based Routing จะสามารถเปิดใช้งานได้เมื่อมีการตั้งค่า WAN ตั้งแต่ 2 ช่องทางขึ้นไปเท่านั้น
          </p>
        </div>
      ) : (
        /* ✅ ตาราง PBR เดิม (ซ่อนไว้เมื่อปิด PBR) */
        <div className={`transition-all duration-300 ${pbrConfig.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none grayscale-[50%]'}`}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                    <th className="p-4 pl-6 w-1/3">LAN / VLAN Network</th>
                    <th className="p-4 w-1/3">Target WAN Interface</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {networks.map((net) => {
                    const selectedWan = pbrConfig.mappings?.[net.id] || (wanList[0]?.id || '');
                    return (
                      <tr key={net.id} className="hover:bg-slate-50/50 transition-colors">
                        
                        {/* คอลัมน์ที่ 1: ชื่อเครือข่าย */}
                        <td className="p-4 pl-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg border border-purple-100">
                              <Network size={18} />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-sm">{net.name}</div>
                              <div className="text-[11px] font-mono text-slate-500 mt-0.5">{net.ip} (VLAN {net.vlanId})</div>
                            </div>
                          </div>
                        </td>
                        
                        {/* คอลัมน์ที่ 2: Dropdown เลือก WAN */}
                        <td className="p-4 pr-6">
                          <div className="relative max-w-sm">
                            <Globe size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${pbrConfig.enabled ? 'text-blue-500' : 'text-slate-400'}`} />
                            <select 
                              value={selectedWan}
                              onChange={(e) => setNetworkWan(net.id, e.target.value)}
                              className={`w-full pl-10 pr-10 py-3 border rounded-xl text-[13px] font-medium outline-none transition-all appearance-none shadow-sm relative cursor-pointer ${
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
          </div>
        </div>
      )}

    </div>
  );
};

export default Step7_PBRSetup;