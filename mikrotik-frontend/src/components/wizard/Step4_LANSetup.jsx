import React from 'react';
import { Network, Wifi, Plus, Trash2, Server, ShieldCheck, Settings2, Globe } from 'lucide-react';

const Step4_LANSetup = ({ networks, setNetworks, dnsConfig }) => {
  
  // ฟังก์ชันคำนวณ VLAN และ IP ตัวถัดไป
  const getNextVlanAndIp = () => {
    // กรองเอาเฉพาะ VLAN ที่ไม่ใช่ 56 เพื่อหาค่าสูงสุดมาบวกเพิ่มทีละ 10
    const customVlans = networks.filter(n => n.vlanId !== 56).map(n => n.vlanId);
    const nextVlan = customVlans.length > 0 ? Math.max(...customVlans) + 10 : 10;
    return {
      vlanId: nextVlan,
      ip: `192.168.${nextVlan}.1/24`
    };
  };

  // เพิ่ม Network ใหม่
  const addNetwork = (type) => {
    const { vlanId, ip } = getNextVlanAndIp();
    // Default Name เป็น vlanXX ตามต้องการ
    const defaultName = `vlan${vlanId}`;
    
    const newNet = {
      id: Date.now(),
      name: defaultName,
      vlanId: vlanId,
      ip: ip,
      type: type, // 'network' หรือ 'hotspot'
      dhcp: true, // ค่าเริ่มต้นเปิด DHCP เสมอ
      hotspot: type === 'hotspot'
    };
    
    setNetworks([newNet, ...networks]);
  };

  const removeNetwork = (id) => {
    if (id === 'net_56' || id === 'nms') return; // ห้ามลบ NMS
    setNetworks(networks.filter(n => n.id !== id));
  };

  const updateNetwork = (id, field, value) => {
    setNetworks(networks.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* --- Header Section --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Settings2 className="text-blue-600" /> LAN & VLAN Configuration
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium">กำหนดวงเครือข่ายภายในและระบบ Hotspot</p>
        </div>
        
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button 
            onClick={() => addNetwork('network')}
            className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 font-bold text-sm"
          >
            <Plus size={16} /> New Network
          </button>
          <button 
            onClick={() => addNetwork('hotspot')}
            className="bg-orange-500 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-orange-600 hover:shadow-lg hover:shadow-orange-500/20 transition-all duration-300 font-bold text-sm"
          >
            <Wifi size={16} /> New Hotspot
          </button>
        </div>
      </div>

      {/* --- Scrollable Content Area --- */}
      <div className="max-h-[60vh] overflow-y-auto pr-2 pb-4 space-y-5 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 transition-colors">
        
        {networks.map((net) => {
          const dnsDisplay = net.hotspot || (dnsConfig && dnsConfig.allowRemoteRequests)
            ? net.ip.split('/')[0] 
            : (dnsConfig && dnsConfig.servers ? dnsConfig.servers.join(', ') : '');

          return (
            <div 
              key={net.id} 
              className={`bg-white p-6 md:p-8 rounded-2xl border transition-all duration-300 relative group hover:shadow-lg ${
                net.hotspot 
                  ? 'border-orange-100 hover:border-orange-300 shadow-sm shadow-orange-50' 
                  : 'border-slate-200 hover:border-blue-200 shadow-sm'
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                
                {/* VLAN ID */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">VLAN ID</label>
                  <input 
                    type="number" 
                    disabled={net.vlanId === 56}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-mono font-bold text-blue-600 text-center bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all"
                    value={net.vlanId}
                    onChange={(e) => updateNetwork(net.id, 'vlanId', parseInt(e.target.value))}
                  />
                </div>

                {/* Name */}
                <div className="md:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Network Name</label>
                  <div className="relative">
                    <Network className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${net.hotspot ? 'text-orange-400' : 'text-slate-400'}`} size={16} />
                    <input 
                      type="text" 
                      className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:bg-white outline-none transition-all focus:ring-4 ${
                        net.hotspot ? 'focus:ring-orange-50 focus:border-orange-400' : 'focus:ring-blue-50 focus:border-blue-400'
                      }`}
                      value={net.name}
                      onChange={(e) => updateNetwork(net.id, 'name', e.target.value)}
                      placeholder="e.g. vlan10Service"
                    />
                  </div>
                </div>

                {/* IP Gateway */}
                <div className="md:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Gateway / CIDR</label>
                  <input 
                    type="text" 
                    className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-medium text-slate-700 focus:bg-white outline-none transition-all focus:ring-4 ${
                      net.hotspot ? 'focus:ring-orange-50 focus:border-orange-400' : 'focus:ring-blue-50 focus:border-blue-400'
                    }`}
                    value={net.ip}
                    onChange={(e) => updateNetwork(net.id, 'ip', e.target.value)}
                    placeholder="192.168.10.1/24"
                  />
                </div>

                {/* Options & Status (Delete & Hotspot/DHCP icon) */}
                <div className="md:col-span-2 flex justify-between md:justify-end gap-3 md:pt-6">
                  
                  {/* Status Indicator */}
                  {!net.hotspot ? (
                    <div className="flex flex-col items-center justify-center">
                      <button 
                        onClick={() => updateNetwork(net.id, 'dhcp', !net.dhcp)}
                        title="Toggle DHCP Server"
                        className={`flex items-center justify-center h-11 px-3 rounded-xl border transition-all ${
                          net.dhcp 
                            ? 'bg-green-50 border-green-200 text-green-600 shadow-sm' 
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        <Server size={18} />
                      </button>
                    </div>
                  ) : (
                    <div 
                      title="Hotspot Enabled"
                      className="flex items-center justify-center h-11 px-3 rounded-xl border bg-orange-50 border-orange-200 text-orange-500 shadow-sm"
                    >
                      <ShieldCheck size={18} />
                    </div>
                  )}

                  {/* Delete Button */}
                  {net.vlanId !== 56 && (
                    <button 
                      onClick={() => removeNetwork(net.id)}
                      className="h-11 px-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                      title="Remove Network"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>

              {/* Status Footer */}
              <div className="mt-5 flex flex-wrap items-center gap-4 text-[11px] text-slate-500 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1">
                    <Server size={12}/> DHCP Server:
                  </span> 
                  <span className={`font-medium ${net.dhcp || net.hotspot ? "text-green-600" : "text-slate-400"}`}>
                    {net.dhcp || net.hotspot ? "Enabled (Auto)" : "Disabled"}
                  </span>
                </div>
                {(net.dhcp || net.hotspot) && (
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 flex items-center gap-1">
                      <Globe size={12}/> DNS:
                    </span> 
                    <span className="text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded-md font-bold">{dnsDisplay}</span>
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Step4_LANSetup;