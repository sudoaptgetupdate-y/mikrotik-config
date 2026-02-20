import React, { useState } from 'react';
import { Network, Layers, CheckCircle, Settings, CheckSquare, X } from 'lucide-react';

const Step5_PortAssign = ({ selectedModel, wanList, networks, portConfig, setPortConfig }) => {
  
  // === State สำหรับ Bulk Action ===
  const [selectedPorts, setSelectedPorts] = useState([]);
  const [bulkConfig, setBulkConfig] = useState({ 
    mode: 'access', 
    pvid: 10, 
    nativeVlan: 1, 
    allowed: [] 
  });

  const getLanPorts = () => {
    if (!selectedModel) return [];
    const wanPorts = wanList.map(w => w.interface);
    return selectedModel.ports.filter(p => !wanPorts.includes(p.name));
  };

  const lanPorts = getLanPorts();

  // === ฟังก์ชันสำหรับ Single Port (ของเดิม) ===
  const updatePortConfig = (portName, field, value) => {
    setPortConfig(prev => {
      const current = prev[portName] || { mode: 'access', pvid: 10, nativeVlan: 1, allowed: [] };
      
      if (field === 'mode') {
        return {
          ...prev,
          [portName]: { 
            ...current, 
            mode: value,
            nativeVlan: value === 'trunk' ? 1 : undefined,
            pvid: value === 'access' ? 10 : 1, 
            allowed: [] 
          }
        };
      }
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

  // === ฟังก์ชันสำหรับ Checkbox ===
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedPorts(lanPorts.map(p => p.name));
    } else {
      setSelectedPorts([]);
    }
  };

  const handleSelectPort = (portName) => {
    setSelectedPorts(prev => 
      prev.includes(portName) ? prev.filter(p => p !== portName) : [...prev, portName]
    );
  };

  // === ฟังก์ชันสำหรับอัปเดตค่า Bulk Config ในแถบควบคุม ===
  const updateBulkConfig = (field, value) => {
    setBulkConfig(prev => {
      if (field === 'mode') {
        return {
          ...prev,
          mode: value,
          nativeVlan: value === 'trunk' ? 1 : undefined,
          pvid: value === 'access' ? 10 : 1,
          allowed: []
        };
      }
      if (field === 'toggleVlan') {
        const currentAllowed = prev.allowed || [];
        const newAllowed = currentAllowed.includes(value)
          ? currentAllowed.filter(v => v !== value)
          : [...currentAllowed, value];
        return { ...prev, allowed: newAllowed };
      }
      return { ...prev, [field]: value };
    });
  };

  // === ฟังก์ชัน Apply (นำค่าจาก Bulk ไปใส่ในพอร์ตที่เลือก) ===
  const applyBulkConfig = () => {
    setPortConfig(prev => {
      const newGlobalConfig = { ...prev };
      selectedPorts.forEach(portName => {
        // คัดลอกค่าจาก bulkConfig ไปใส่ให้แต่ละพอร์ตที่ถูกเลือก
        newGlobalConfig[portName] = { ...bulkConfig };
      });
      return newGlobalConfig;
    });
    // เคลียร์การเลือกหลังตั้งค่าเสร็จ
    setSelectedPorts([]);
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-10">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Layers className="text-blue-600" /> Port Assignment
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Assign VLANs to your LAN interfaces. Use checkboxes for bulk assignment.
        </p>
      </div>

      {/* === แถบควบคุม Bulk Action (จะแสดงเมื่อมีการเลือกพอร์ต) === */}
      {selectedPorts.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6 shadow-sm animate-in fade-in slide-in-from-top-4 flex flex-col lg:flex-row gap-4 lg:items-center justify-between sticky top-4 z-10">
          <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
            <div className="flex items-center gap-2 font-bold text-blue-800 bg-blue-100 px-3 py-1.5 rounded-lg shrink-0">
              <CheckSquare size={18} /> {selectedPorts.length} Ports Selected
            </div>
            
            <div className="flex-1 flex flex-col md:flex-row items-start md:items-center gap-3">
              <select 
                value={bulkConfig.mode}
                onChange={(e) => updateBulkConfig('mode', e.target.value)}
                className={`p-2 rounded-lg border-2 text-sm font-bold outline-none cursor-pointer transition-colors ${
                  bulkConfig.mode === 'trunk' 
                    ? 'border-purple-300 bg-purple-100 text-purple-800' 
                    : 'border-blue-300 bg-blue-100 text-blue-800'
                }`}
              >
                <option value="access">Access</option>
                <option value="trunk">Trunk</option>
              </select>

              {bulkConfig.mode === 'access' ? (
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <span className="text-xs text-blue-600 font-bold">VLAN ID:</span>
                  <select 
                    value={bulkConfig.pvid}
                    onChange={(e) => updateBulkConfig('pvid', parseInt(e.target.value))}
                    className="p-2 border border-blue-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-48"
                  >
                    {networks.map(n => (
                      <option key={n.id} value={n.vlanId}>{n.vlanId} - {n.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-purple-700 uppercase">Native (Untagged):</span>
                    <select 
                      value={bulkConfig.nativeVlan || 1}
                      onChange={(e) => updateBulkConfig('nativeVlan', parseInt(e.target.value))}
                      className="p-1.5 border border-purple-200 rounded text-xs bg-white outline-none"
                    >
                      <option value={1}>VLAN 1 (Default)</option>
                      {networks.map(n => (
                        <option key={n.id} value={n.vlanId}>{n.vlanId} - {n.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {networks.map(n => {
                      if (n.vlanId === (bulkConfig.nativeVlan || 1)) return null;
                      const isSelected = bulkConfig.allowed?.includes(n.vlanId);
                      return (
                        <button 
                          key={`bulk-${n.id}`}
                          onClick={() => updateBulkConfig('toggleVlan', n.vlanId)}
                          className={`px-2 py-1 rounded text-[10px] font-bold border transition-all flex items-center gap-1 ${
                            isSelected 
                              ? 'bg-purple-600 border-purple-600 text-white' 
                              : 'bg-white border-purple-200 text-purple-600 hover:bg-purple-50'
                          }`}
                        >
                          {isSelected && <CheckCircle size={10} />} VLAN {n.vlanId}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 border-blue-200 pt-3 lg:pt-0">
            <button 
              onClick={() => setSelectedPorts([])}
              className="p-2 text-slate-500 hover:bg-blue-100 rounded-lg transition"
              title="Cancel Selection"
            >
              <X size={20} />
            </button>
            <button 
              onClick={applyBulkConfig}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition shadow-sm"
            >
              <Settings size={16} /> Apply to Selected
            </button>
          </div>
        </div>
      )}

      {/* === ตารางพอร์ต === */}
      <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${selectedPorts.length > 0 ? 'ring-2 ring-blue-100' : ''}`}>
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 w-12 text-center">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  checked={selectedPorts.length === lanPorts.length && lanPorts.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Interface</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-40">Mode</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Configuration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lanPorts.map((port) => {
              const config = portConfig[port.name] || { mode: 'access', pvid: 10, nativeVlan: 1, allowed: [] };
              const isChecked = selectedPorts.includes(port.name);
              
              return (
                <tr key={port.id} className={`transition-colors ${isChecked ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'}`}>
                  
                  {/* Checkbox Column */}
                  <td className="p-4 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={isChecked}
                      onChange={() => handleSelectPort(port.name)}
                    />
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isChecked ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                        <Network size={18} />
                      </div>
                      <div className="cursor-pointer" onClick={() => handleSelectPort(port.name)}>
                        <span className="font-bold text-slate-700">{port.name}</span>
                        <div className="text-[10px] text-slate-400 uppercase">{port.type}</div>
                      </div>
                    </div>
                  </td>

                  {/* Single Port Configuration (ถูก Disable อัตโนมัติถ้าถูกติ๊กเลือกอยู่) */}
                  <td className="p-4">
                    <select 
                      value={config.mode}
                      onChange={(e) => updatePortConfig(port.name, 'mode', e.target.value)}
                      disabled={isChecked}
                      className={`w-full p-2 rounded-lg border-2 text-sm font-bold outline-none cursor-pointer transition-colors ${
                        isChecked ? 'opacity-50 cursor-not-allowed' : ''
                      } ${
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
                      <div className={`flex items-center gap-3 ${isChecked ? 'opacity-50 pointer-events-none' : ''}`}>
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
                      <div className={`space-y-3 ${isChecked ? 'opacity-50 pointer-events-none' : ''}`}>
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

                        <div className="flex flex-wrap gap-2">
                          {networks.map(n => {
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