import React from 'react';
import { Globe, Plus, Trash2, CheckCircle } from 'lucide-react';

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
        type: 'pppoe', // ✅ เปลี่ยน Default เป็น PPPoE
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
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Globe className="text-blue-600" /> Internet Connection (WAN)
        </h2>
        <button 
          onClick={addWan}
          className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 font-bold transition flex items-center gap-1"
        >
          <Plus size={16} /> Add WAN
        </button>
      </div>

      <div className="space-y-6">
        {wanList.map((wan, index) => (
          <div key={wan.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative hover:shadow-md transition">
            
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">WAN {index + 1}</span>
                <span className="text-sm text-slate-500 font-mono">{wan.interface}</span>
              </div>
              {wanList.length > 1 && (
                <button 
                  onClick={() => removeWan(wan.id)} 
                  className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                >
                  <Trash2 size={14} /> Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Physical Interface</label>
                <select 
                  value={wan.interface}
                  onChange={(e) => updateWan(wan.id, 'interface', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
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
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Connection Type</label>
                <select 
                  value={wan.type}
                  onChange={(e) => updateWan(wan.id, 'type', e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="pppoe">PPPoE Client</option>
                  <option value="static">Static IP</option>
                  {/* ✅ ลบตัวเลือก DHCP Client ออก */}
                </select>
              </div>
            </div>

            <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
              {wan.type === 'pppoe' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Username</label>
                    <input 
                      type="text" className="w-full p-2 border rounded text-sm outline-none"
                      placeholder="user@isp"
                      value={wan.username || ''}
                      onChange={(e) => updateWan(wan.id, 'username', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Password</label>
                    <input 
                      type="text" className="w-full p-2 border rounded text-sm outline-none"
                      placeholder="password"
                      value={wan.password || ''}
                      onChange={(e) => updateWan(wan.id, 'password', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {wan.type === 'static' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">IP Address (CIDR)</label>
                    <input 
                      type="text" className="w-full p-2 border rounded text-sm outline-none"
                      placeholder="192.168.1.2/24"
                      value={wan.ipAddress || ''}
                      onChange={(e) => updateWan(wan.id, 'ipAddress', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Gateway</label>
                    <input 
                      type="text" className="w-full p-2 border rounded text-sm outline-none"
                      placeholder="192.168.1.1"
                      value={wan.gateway || ''}
                      onChange={(e) => updateWan(wan.id, 'gateway', e.target.value)}
                    />
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