import React from 'react';
import { Network, Wifi, Plus, Trash2, Server, ShieldCheck, Settings2 } from 'lucide-react';

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
    // ✅ แก้ไข: Default Name เป็น vlanXX ตามต้องการ
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
    setNetworks([...networks, newNet]);
  };

  const removeNetwork = (id) => {
    if (id === 'net_56' || id === 'nms') return; // ห้ามลบ NMS
    setNetworks(networks.filter(n => n.id !== id));
  };

  const updateNetwork = (id, field, value) => {
    setNetworks(networks.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings2 className="text-blue-600" /> LAN & VLAN Configuration
          </h2>
          <p className="text-sm text-slate-500 mt-1">กำหนดวงเครือข่ายภายในและระบบ Hotspot</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => addNetwork('network')}
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-200 hover:bg-blue-100 font-bold transition text-sm"
          >
            <Plus size={16} /> New Network
          </button>
          <button 
            onClick={() => addNetwork('hotspot')}
            className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-600 rounded-lg border border-orange-200 hover:bg-orange-100 font-bold transition text-sm"
          >
            <Wifi size={16} /> New Hotspot
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {networks.map((net) => {
          const dnsDisplay = net.hotspot || dnsConfig.allowRemoteRequests 
            ? net.ip.split('/')[0] 
            : dnsConfig.servers.join(', ');

          return (
            <div 
              key={net.id} 
              className={`bg-white p-5 rounded-xl border-2 transition-all ${
                net.hotspot ? 'border-orange-100 shadow-sm shadow-orange-50' : 'border-slate-100'
              }`}
            >
              <div className="flex flex-wrap md:flex-nowrap gap-4 items-start">
                
                {/* VLAN ID */}
                <div className="w-24 shrink-0">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">VLAN ID</label>
                  <input 
                    type="number" 
                    disabled={net.vlanId === 56}
                    className="w-full p-2 border rounded-lg font-mono font-bold text-blue-600 text-center bg-slate-50 disabled:opacity-50"
                    value={net.vlanId}
                    onChange={(e) => updateNetwork(net.id, 'vlanId', parseInt(e.target.value))}
                  />
                </div>

                {/* Name */}
                <div className="flex-grow">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Network Name</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={net.name}
                    onChange={(e) => updateNetwork(net.id, 'name', e.target.value)}
                  />
                </div>

                {/* IP Gateway */}
                <div className="w-48 shrink-0">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Gateway / CIDR</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border rounded-lg font-mono text-sm"
                    value={net.ip}
                    onChange={(e) => updateNetwork(net.id, 'ip', e.target.value)}
                  />
                </div>

                {/* Options & Status */}
                <div className="flex gap-2 pt-5">
                  {!net.hotspot ? (
                    <button 
                      onClick={() => updateNetwork(net.id, 'dhcp', !net.dhcp)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors ${
                        net.dhcp ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-400'
                      }`}
                    >
                      <Server size={16} />
                      <span className="text-xs font-bold">DHCP</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg border bg-orange-50 border-orange-200 text-orange-700">
                      <ShieldCheck size={16} />
                      <span className="text-xs font-bold">HOTSPOT</span>
                    </div>
                  )}

                  {/* Delete Button */}
                  {net.vlanId !== 56 && (
                    <button 
                      onClick={() => removeNetwork(net.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400 border-t border-slate-50 pt-3">
                <div className="flex items-center gap-1">
                  <span className="font-bold">DHCP Server:</span> 
                  <span className={net.dhcp || net.hotspot ? "text-green-600" : "text-slate-400"}>
                    {net.dhcp || net.hotspot ? "Enabled (Auto)" : "Disabled"}
                  </span>
                </div>
                {(net.dhcp || net.hotspot) && (
                  <div className="flex items-center gap-1">
                    <span className="font-bold">DNS:</span> 
                    <span className="text-blue-600 font-mono">{dnsDisplay}</span>
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