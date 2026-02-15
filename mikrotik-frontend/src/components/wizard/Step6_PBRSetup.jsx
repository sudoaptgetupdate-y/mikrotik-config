import React from 'react';
import { Route, Zap, Info, ShieldCheck } from 'lucide-react';

const Step6_PBRSetup = ({ networks, wanList, pbrConfig, setPbrConfig }) => {
  
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
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Route className="text-blue-600" /> Policy-Based Routing (PBR)
        </h2>
        <p className="text-sm text-slate-500 mt-1">กำหนดเส้นทางออกอินเทอร์เน็ตเฉพาะเจาะจงสำหรับแต่ละวงเครือข่าย</p>
      </div>

      {/* Global Toggle */}
      <div className={`p-6 rounded-xl border-2 mb-8 transition-all ${pbrConfig.enabled ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className={pbrConfig.enabled ? 'text-blue-600' : 'text-slate-400'} />
            <div>
              <p className="font-bold text-slate-800 text-lg">Enable Policy-Based Routing</p>
              <p className="text-sm text-slate-500">เปิดใช้งานการกำหนดเส้นทางแบบแยก WAN</p>
            </div>
          </div>
          <button 
            onClick={togglePbr}
            className={`w-14 h-7 flex items-center rounded-full p-1 transition-colors ${pbrConfig.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <div className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${pbrConfig.enabled ? 'translate-x-7' : ''}`} />
          </button>
        </div>
      </div>

      {pbrConfig.enabled && (
        <div className="space-y-4">
          <div className="bg-blue-100/50 p-4 rounded-lg border border-blue-200 flex items-start gap-3 mb-6">
            <Info className="text-blue-600 shrink-0" size={20} />
            <div className="text-xs text-blue-800 space-y-1">
              <p className="font-bold uppercase text-[10px]">ระบบจะจัดการสิ่งเหล่านี้ให้โดยอัตโนมัติ:</p>
              <ul className="list-disc ml-4">
                <li>สร้าง Routing Table แยกตามจำนวน WAN</li>
                <li>สร้าง Mangle Rules สำหรับ Mark Routing ตาม Source IP ของ Network</li>
                <li>ตั้งค่า Recursive Route เพื่อเช็คสถานะ Gateway ของแต่ละ WAN</li>
              </ul>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500">Local Network</th>
                  <th className="p-4 text-xs font-bold text-slate-500">Preferred Outbound WAN</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {networks.map((net) => (
                  <tr key={net.id}>
                    <td className="p-4">
                      <p className="font-bold text-slate-700">{net.name}</p>
                      <p className="text-[10px] font-mono text-slate-400 uppercase">VLAN {net.vlanId} | {net.ip}</p>
                    </td>
                    <td className="p-4">
                      <select 
                        value={pbrConfig.mappings?.[net.id] || wanList[0]?.id}
                        onChange={(e) => setNetworkWan(net.id, e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
                      >
                        {wanList.map((wan, idx) => (
                          <option key={wan.id} value={wan.id}>
                            WAN {idx + 1} ({wan.interface} - {wan.type.toUpperCase()})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Step6_PBRSetup;