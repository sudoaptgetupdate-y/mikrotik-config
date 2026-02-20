import React from 'react';
import { Globe, Plus, Trash2, User, Key, Network, ShieldCheck, Router } from 'lucide-react';

const Step2_WANSetup = ({ selectedModel, wanList, setWanList }) => {
  
  const addWan = () => {
    const usedPorts = wanList.map(w => w.interface);
    const availablePort = selectedModel.ports.find(p => !usedPorts.includes(p.name));
    
    if (!availablePort) {
      alert("No more ports available for WAN!");
      return;
    }

    setWanList([
      ...wanList,
      { 
        id: Date.now(),
        interface: availablePort.name, 
        type: 'pppoe',
        username: '', password: '', 
        ipAddress: '', gateway: '',
        dns: '8.8.8.8,1.1.1.1' 
      }
    ]);
  };

  const removeWan = (id) => {
    if (wanList.length === 1) return;
    setWanList(wanList.filter(w => w.id !== id));
  };

  const updateWan = (id, field, value) => {
    setWanList(wanList.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* --- Header Section --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Globe className="text-blue-600" /> Internet Setup (WAN)
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">Configure your uplink connections</p>
        </div>
        <button 
          onClick={addWan}
          className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 font-bold text-sm"
        >
          <Plus size={18} /> Add WAN Link
        </button>
      </div>

      {/* --- WAN Cards List --- */}
      <div className="space-y-6">
        {wanList.map((wan, index) => (
          <div key={wan.id} className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm relative hover:shadow-lg hover:border-blue-200 transition-all duration-300 group">
            
            {/* Card Header */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider">
                  WAN {index + 1}
                </span>
                <span className="text-sm text-slate-500 font-bold flex items-center gap-1.5">
                  <Router size={16} className="text-slate-400" />
                  {wan.interface}
                </span>
              </div>
              
              {wanList.length > 1 && (
                <button 
                  onClick={() => removeWan(wan.id)} 
                  className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold"
                  title="Remove this WAN"
                >
                  <Trash2 size={16} /> <span className="hidden sm:inline">Remove</span>
                </button>
              )}
            </div>

            {/* Interface & Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Physical Interface</label>
                <div className="relative">
                  <Network className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    value={wan.interface}
                    onChange={(e) => updateWan(wan.id, 'interface', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all cursor-pointer text-sm font-medium text-slate-700 appearance-none"
                  >
                    {selectedModel?.ports.map(port => {
                      const isUsedByOthers = wanList.some(w => w.id !== wan.id && w.interface === port.name);
                      if (isUsedByOthers) return null;
                      return (
                        <option key={port.id} value={port.name}>
                          {port.name} {port.defaultRole === 'wan' ? '(Recommended)' : ''}
                        </option>
                      );
                    })}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    ▼
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Connection Type</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <select 
                    value={wan.type}
                    onChange={(e) => updateWan(wan.id, 'type', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-50 outline-none transition-all cursor-pointer text-sm font-medium text-slate-700 appearance-none"
                  >
                    <option value="pppoe">PPPoE Client (Standard)</option>
                    <option value="static">Static IP (Corporate)</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    ▼
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Inputs Box */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
              
              {/* PPPoE Inputs */}
              {wan.type === 'pppoe' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in zoom-in-95 duration-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">ISP Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="userisp" // เปลี่ยน placeholder ให้ตรงคอนเซปต์เฉพาะอังกฤษตัวเลข
                        value={wan.username || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          // อนุญาตเฉพาะอังกฤษและตัวเลข
                          if (/^[a-zA-Z0-9]*$/.test(val)) {
                            updateWan(wan.id, 'username', val);
                          }
                        }}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">ISP Password</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="••••••••"
                        value={wan.password || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          // ป้องกันการพิมพ์ภาษาไทย (Thai Unicode Range)
                          if (!/[\u0E00-\u0E7F]/.test(val)) {
                            updateWan(wan.id, 'password', val);
                          }
                        }}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Static IP Inputs */}
              {wan.type === 'static' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in zoom-in-95 duration-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">IP Address & Subnet</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Network className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="text" 
                          placeholder="192.168.1.2"
                          value={(wan.ipAddress || '').split('/')[0] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            // อนุญาตเฉพาะตัวเลขและจุด
                            if (/^[0-9.]*$/.test(val)) {
                              const currentSubnet = (wan.ipAddress || '').split('/')[1] || '';
                              updateWan(wan.id, 'ipAddress', currentSubnet ? `${val}/${currentSubnet}` : val);
                            }
                          }}
                          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300 font-mono"
                        />
                      </div>
                      <span className="text-slate-400 font-bold text-lg">/</span>
                      <div className="relative w-24">
                        <input 
                          type="text" 
                          placeholder="24"
                          value={(wan.ipAddress || '').split('/')[1] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            // อนุญาตเฉพาะตัวเลขและจุด
                            if (/^[0-9.]*$/.test(val)) {
                              const currentIp = (wan.ipAddress || '').split('/')[0] || '';
                              updateWan(wan.id, 'ipAddress', val ? `${currentIp}/${val}` : currentIp);
                            }
                          }}
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300 font-mono text-center"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Default Gateway</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="192.168.1.1"
                        value={wan.gateway || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          // อนุญาตเฉพาะตัวเลขและจุด
                          if (/^[0-9.]*$/.test(val)) {
                            updateWan(wan.id, 'gateway', val);
                          }
                        }}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-300 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default Step2_WANSetup;