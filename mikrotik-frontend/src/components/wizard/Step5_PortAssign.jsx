import React, { useState } from 'react';
import { Network, Layers, CheckCircle, Settings, CheckSquare, X, ChevronDown } from 'lucide-react';

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
        newGlobalConfig[portName] = { ...bulkConfig };
      });
      return newGlobalConfig;
    });
    setSelectedPorts([]);
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* --- Header Section --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Layers className="text-blue-600" /> Port Assignment (VLAN)
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            กำหนด VLAN ให้กับพอร์ต LAN (สามารถใช้ Checkbox เพื่อตั้งค่าหลายพอร์ตพร้อมกันได้)
          </p>
        </div>
      </div>

      {/* === แถบควบคุม Bulk Action (Floating & Sticky) === */}
      {selectedPorts.length > 0 && (
        <div className="sticky top-4 z-20 mb-5 bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-xl shadow-slate-900/20 animate-in fade-in slide-in-from-top-4 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
          
          <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
            {/* Selected Count Badge */}
            <div className="flex items-center gap-2 font-bold text-white bg-blue-600 px-3 py-2 rounded-xl shrink-0 shadow-sm text-sm">
              <CheckSquare size={16} /> {selectedPorts.length} Ports Selected
            </div>
            
            {/* Configuration Inputs */}
            <div className="flex-1 flex flex-col xl:flex-row items-start xl:items-center gap-3 bg-slate-800 p-2.5 rounded-xl border border-slate-700/50">
              
              <div className="relative shrink-0">
                <select 
                  value={bulkConfig.mode}
                  onChange={(e) => updateBulkConfig('mode', e.target.value)}
                  className="pl-3 pr-8 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none cursor-pointer"
                >
                  <option value="access">Access Mode</option>
                  <option value="trunk">Trunk Mode</option>
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <div className="w-px h-6 bg-slate-700 hidden xl:block"></div>

              {/* Dynamic Bulk Config based on Mode */}
              {bulkConfig.mode === 'access' ? (
                <div className="flex items-center gap-2 w-full">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider shrink-0">Assign VLAN:</span>
                  <div className="relative w-full md:w-64">
                    <select 
                      value={bulkConfig.pvid}
                      onChange={(e) => updateBulkConfig('pvid', parseInt(e.target.value))}
                      className="w-full pl-3 pr-8 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                    >
                      {networks.map(n => (
                        <option key={n.id} value={n.vlanId}>VLAN {n.vlanId} - {n.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col xl:flex-row xl:items-center gap-3 w-full">
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Native:</span>
                    <select 
                      value={bulkConfig.nativeVlan || 1}
                      onChange={(e) => updateBulkConfig('nativeVlan', parseInt(e.target.value))}
                      className="pl-2 pr-6 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-xs font-medium text-white outline-none focus:ring-2 focus:ring-purple-500 appearance-none cursor-pointer"
                    >
                      <option value={1}>VLAN 1 (Default)</option>
                      {networks.map(n => (
                        <option key={n.id} value={n.vlanId}>VLAN {n.vlanId} - {n.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 xl:hidden">Allowed:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {networks.map(n => {
                        if (n.vlanId === (bulkConfig.nativeVlan || 1)) return null;
                        const isSelected = bulkConfig.allowed?.includes(n.vlanId);
                        return (
                          <button 
                            key={`bulk-${n.id}`}
                            onClick={() => updateBulkConfig('toggleVlan', n.vlanId)}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all flex items-center gap-1 duration-200 ${
                              isSelected 
                                ? 'bg-purple-600 border-purple-500 text-white shadow-sm shadow-purple-500/20' 
                                : 'bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            {isSelected && <CheckCircle size={12} className="text-white" />} VLAN {n.vlanId}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-700/50 mt-1 lg:mt-0 lg:pl-2">
            <button 
              onClick={() => setSelectedPorts([])}
              className="px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors font-bold text-sm flex items-center gap-1"
              title="Cancel Selection"
            >
              <X size={16} /> Cancel
            </button>
            <button 
              onClick={applyBulkConfig}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-900/50"
            >
              <Settings size={16} /> Apply Config
            </button>
          </div>
        </div>
      )}

      {/* === ตารางพอร์ต (Main Port List - Compact & Scrollable) === */}
      <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all duration-300 ${selectedPorts.length > 0 ? 'border-blue-300 ring-4 ring-blue-50' : 'border-slate-200'}`}>
        
        {lanPorts.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-medium bg-slate-50/50">
            ไม่พบพอร์ต LAN ที่ว่าง (พอร์ตทั้งหมดอาจถูกตั้งเป็น WAN ไปแล้ว)
          </div>
        ) : (
          // ใส่ Scroll Container ตรงนี้ max-h-[55vh] คือให้ตารางสูงไม่เกิน 55% ของหน้าจอ
          <div className="max-h-[55vh] overflow-y-auto overflow-x-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full relative">
            <table className="w-full text-left border-collapse min-w-[750px]">
              
              {/* Sticky Header */}
              <thead className="bg-slate-50/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-3 pl-5 w-16 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4.5 h-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={selectedPorts.length === lanPorts.length && lanPorts.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="p-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-36">Interface</th>
                  <th className="p-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-40">Mode</th>
                  <th className="p-3 pr-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">VLAN Configuration</th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-100">
                {lanPorts.map((port) => {
                  const config = portConfig[port.name] || { mode: 'access', pvid: 10, nativeVlan: 1, allowed: [] };
                  const isChecked = selectedPorts.includes(port.name);
                  
                  return (
                    <tr key={port.id || port.name} className={`transition-colors group ${isChecked ? 'bg-blue-50/40' : 'hover:bg-slate-50/50'}`}>
                      
                      {/* Checkbox Column */}
                      <td className="p-3 pl-5 text-center align-top pt-4">
                        <input 
                          type="checkbox" 
                          className="w-4.5 h-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={isChecked}
                          onChange={() => handleSelectPort(port.name)}
                        />
                      </td>

                      {/* Port Name */}
                      <td className="p-3 align-top pt-3">
                        <div 
                          className={`inline-flex items-center gap-1.5 font-black px-2.5 py-1.5 rounded-lg text-sm border transition-colors cursor-pointer ${
                            isChecked 
                              ? 'bg-blue-100 border-blue-200 text-blue-700' 
                              : 'bg-slate-100 border-slate-200 text-slate-700 group-hover:border-blue-200 group-hover:bg-blue-50'
                          }`}
                          onClick={() => handleSelectPort(port.name)}
                        >
                          <Network size={14} className={isChecked ? 'text-blue-500' : 'opacity-70'} />
                          {port.name}
                        </div>
                      </td>

                      {/* Port Mode Selection */}
                      <td className="p-3 align-top pt-3">
                        <div className="relative">
                          <select 
                            value={config.mode}
                            onChange={(e) => updatePortConfig(port.name, 'mode', e.target.value)}
                            disabled={isChecked}
                            className={`w-full pl-3 pr-8 py-2 border rounded-xl text-[13px] font-bold outline-none transition-all appearance-none shadow-sm ${
                              isChecked 
                                ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-500' 
                                : config.mode === 'trunk'
                                  ? 'bg-white border-purple-200 text-purple-700 focus:border-purple-400 focus:ring-2 focus:ring-purple-50 cursor-pointer'
                                  : 'bg-white border-blue-200 text-blue-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 cursor-pointer'
                            }`}
                          >
                            <option value="access">Access</option>
                            <option value="trunk">Trunk</option>
                          </select>
                          <ChevronDown size={14} className={`absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${isChecked ? 'text-slate-300' : 'text-slate-400'}`} />
                        </div>
                      </td>

                      {/* VLAN Configuration */}
                      <td className="p-3 pr-5 pb-3">
                        <div className={`bg-slate-50/80 p-3 rounded-xl border border-slate-100 transition-opacity duration-300 ${isChecked ? 'opacity-40 pointer-events-none' : ''}`}>
                          
                          {config.mode === 'access' ? (
                            <div className="animate-in fade-in zoom-in-95 duration-200 flex items-center gap-3">
                              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">VLAN (PVID)</label>
                              <div className="relative w-full max-w-[200px]">
                                <select 
                                  value={config.pvid}
                                  onChange={(e) => updatePortConfig(port.name, 'pvid', parseInt(e.target.value))}
                                  className="w-full pl-3 pr-8 py-1.5 bg-white border border-slate-200 rounded-lg text-[13px] font-medium text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all cursor-pointer appearance-none"
                                >
                                  {networks.map(n => (
                                    <option key={n.id} value={n.vlanId}>VLAN {n.vlanId} {n.name ? `(${n.name})` : ''}</option>
                                  ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              </div>
                            </div>
                          ) : (
                            <div className="animate-in fade-in zoom-in-95 duration-200 space-y-3">
                              {/* Native VLAN */}
                              <div className="flex items-center gap-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 w-20">Native</label>
                                <div className="relative w-full max-w-[200px]">
                                  <select 
                                    value={config.nativeVlan || 1}
                                    onChange={(e) => updatePortConfig(port.name, 'nativeVlan', parseInt(e.target.value))}
                                    className="w-full pl-3 pr-8 py-1.5 bg-white border border-purple-200 rounded-lg text-[13px] font-medium text-purple-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50 transition-all cursor-pointer appearance-none"
                                  >
                                    <option value={1}>VLAN 1 (Default)</option>
                                    {networks.map(n => (
                                      <option key={n.id} value={n.vlanId}>VLAN {n.vlanId} {n.name ? `(${n.name})` : ''}</option>
                                    ))}
                                  </select>
                                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-purple-400 pointer-events-none" />
                                </div>
                              </div>

                              {/* Allowed VLANs */}
                              <div className="flex items-start gap-3">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 w-20 pt-1.5">Allowed</label>
                                <div className="flex flex-wrap gap-1.5">
                                  {networks.map(n => {
                                    if (n.vlanId === (config.nativeVlan || 1)) return null;
                                    const isSelected = config.allowed?.includes(n.vlanId);
                                    return (
                                      <button 
                                        key={n.id}
                                        onClick={() => updatePortConfig(port.name, 'toggleVlan', n.vlanId)}
                                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all flex items-center gap-1 duration-200 ${
                                          isSelected 
                                            ? 'bg-purple-600 border-purple-600 text-white shadow-sm' 
                                            : 'bg-white border-slate-200 text-slate-500 hover:border-purple-300 hover:text-purple-600'
                                        }`}
                                      >
                                        {isSelected && <CheckCircle size={12} className="text-white" />} VLAN {n.vlanId}
                                      </button>
                                    );
                                  })}
                                  {networks.length === 0 && (
                                    <span className="text-xs text-slate-400 italic pt-1">No VLANs created yet.</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

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

export default Step5_PortAssign;