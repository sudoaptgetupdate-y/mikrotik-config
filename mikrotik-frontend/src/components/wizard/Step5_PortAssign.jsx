import React from 'react';
import { Network, Layers, CheckCircle, Info } from 'lucide-react';

const Step5_PortAssign = ({ selectedModel, wanList, networks, portConfig, setPortConfig }) => {
  
  const getLanPorts = () => {
    if (!selectedModel) return [];
    const wanPorts = wanList.map(w => w.interface);
    return selectedModel.ports.filter(p => !wanPorts.includes(p.name));
  };

  const updatePortConfig = (portName, field, value) => {
    setPortConfig(prev => {
      // ✅ Default Config: Access VLAN 10 (เมื่อเริ่มแก้ไข)
      const current = prev[portName] || { mode: 'access', pvid: 10, nativeVlan: 1, allowed: [] };
      
      if (field === 'mode') {
        return {
          ...prev,
          [portName]: { 
            ...current, 
            mode: value,
            // ถ้าเปลี่ยนเป็น Trunk: Default Native = 1, Allowed = ว่าง
            // ถ้าเปลี่ยนเป็น Access: PVID = 10 (Default)
            nativeVlan: value === 'trunk' ? 1 : undefined,
            pvid: value === 'access' ? 10 : 1, 
            allowed: [] 
          }
        };
      }

      // กรณีเปลี่ยน Native VLAN บน Trunk (ซึ่งก็คือ PVID ของพอร์ต Trunk)
      if (field === 'nativeVlan') {
        return { ...prev, [portName]: { ...current, nativeVlan: value, pvid: value } };
      }

      if (field === 'toggleVlan') {
        const currentAllowed = current.allowed || [];
        const newAllowed = currentAllowed.includes(value)
          ? currentAllowed.filter(v => v !== value)
          : [...currentAllowed, value];
        return { ...prev, [portName]: { ...current, allowed: newAllowed } };
      }

      return { ...prev, [portName]: { ...current, [field]: value } };
    });
  };

  const lanPorts = getLanPorts();

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Layers className="text-blue-600" /> Port Assignment
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Default: Access VLAN 10. สำหรับ Trunk สามารถเลือก Native VLAN ได้ (Untagged)
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Interface</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-40">Mode</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Configuration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lanPorts.map((port) => {
              // ✅ Default State แสดงผลเป็น Access VLAN 10 ถ้ายังไม่ได้ตั้งค่า
              const config = portConfig[port.name] || { mode: 'access', pvid: 10, nativeVlan: 1, allowed: [] };
              
              return (
                <tr key={port.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                        <Network size={18} />
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">{port.name}</span>
                        <div className="text-[10px] text-slate-400 uppercase">{port.type}</div>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <select 
                      value={config.mode}
                      onChange={(e) => updatePortConfig(port.name, 'mode', e.target.value)}
                      className={`w-full p-2 rounded-lg border-2 text-sm font-bold outline-none cursor-pointer transition-colors ${
                        config.mode === 'trunk' 
                          ? 'border-purple-200 bg-purple-50 text-purple-700' 
                          : 'border-blue-200 bg-blue-50 text-blue-700'
                      }`}
                    >
                      <option value="access">Access</option>
                      <option value="trunk">Trunk</option>
                    </select>
                  </td>

                  <td className="p-4">
                    {config.mode === 'access' ? (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-medium">VLAN ID:</span>
                        <select 
                          value={config.pvid}
                          onChange={(e) => updatePortConfig(port.name, 'pvid', parseInt(e.target.value))}
                          className="flex-grow max-w-xs p-2 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {networks.map(n => (
                            <option key={n.id} value={n.vlanId}>
                              {n.vlanId} - {n.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* ✅ Trunk Native VLAN Selector */}
                        <div className="flex items-center gap-3 bg-purple-50/50 p-2 rounded-lg border border-purple-100">
                          <span className="text-[11px] font-bold text-purple-700 uppercase">Native VLAN (Untagged):</span>
                          <select 
                            value={config.nativeVlan || 1}
                            onChange={(e) => updatePortConfig(port.name, 'nativeVlan', parseInt(e.target.value))}
                            className="p-1.5 border border-purple-200 rounded text-xs bg-white focus:ring-1 focus:ring-purple-500 outline-none"
                          >
                            <option value={1}>VLAN 1 (Default)</option>
                            {networks.map(n => (
                              <option key={n.id} value={n.vlanId}>
                                {n.vlanId} - {n.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Allowed VLANs */}
                        <div className="flex flex-wrap gap-2">
                          {networks.map(n => {
                            // ไม่แสดง VLAN ที่เป็น Native ในปุ่ม Tagged (เพราะมัน Untagged)
                            if (n.vlanId === (config.nativeVlan || 1)) return null;
                            
                            const isSelected = config.allowed?.includes(n.vlanId);
                            return (
                              <button 
                                key={n.id}
                                onClick={() => updatePortConfig(port.name, 'toggleVlan', n.vlanId)}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border-2 transition-all flex items-center gap-1.5 ${
                                  isSelected 
                                    ? 'bg-purple-600 border-purple-600 text-white shadow-sm' 
                                    : 'bg-white border-slate-100 text-slate-400 hover:border-purple-200'
                                }`}
                              >
                                {isSelected && <CheckCircle size={12} />}
                                VLAN {n.vlanId}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Step5_PortAssign;