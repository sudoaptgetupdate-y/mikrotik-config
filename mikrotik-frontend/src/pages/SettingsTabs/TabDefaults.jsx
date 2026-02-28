import { useState } from 'react';
import { Save, Plus, Trash2, Loader2, Server, ShieldCheck } from 'lucide-react';
import apiClient from '../../utils/apiClient';

export default function TabDefaults({ initialData }) {
  const [defaultNetworks, setDefaultNetworks] = useState(initialData || []);
  const [isSaving, setIsSaving] = useState(false);

  const addDefaultNetwork = () => {
    const customVlans = defaultNetworks.filter(n => n.vlanId !== 56).map(n => n.vlanId);
    const nextVlan = customVlans.length > 0 ? Math.max(...customVlans) + 10 : 10;
    const newNet = {
      id: `def_${Date.now()}`,
      name: `vlan${nextVlan}`,
      vlanId: nextVlan,
      ip: `192.168.${nextVlan}.1/24`,
      type: 'network', 
      dhcp: true,
      hotspot: false
    };
    setDefaultNetworks([...defaultNetworks, newNet]);
  };

  const removeDefaultNetwork = (id) => setDefaultNetworks(defaultNetworks.filter(n => n.id !== id));
  
  const updateDefaultNetwork = (id, field, value) => {
    setDefaultNetworks(defaultNetworks.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const toggleDefaultHotspot = (id, currentHotspot) => {
    setDefaultNetworks(defaultNetworks.map(n => {
      if (n.id === id) {
        const isTurningOn = !currentHotspot;
        return { ...n, hotspot: isTurningOn, dhcp: isTurningOn ? true : n.dhcp };
      }
      return n;
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.put(`/api/settings/DEFAULT_NETWORKS`, { value: JSON.stringify(defaultNetworks) });
      alert(`บันทึกข้อมูล DEFAULT_NETWORKS สำเร็จ!`);
    } catch (error) {
      alert(`เกิดข้อผิดพลาดในการบันทึก: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Default LAN & VLAN</h3>
          <p className="text-sm text-slate-500">ค่าเริ่มต้นของวงเครือข่ายเมื่อสร้าง Config ใหม่</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={addDefaultNetwork} className="justify-center bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
            <Plus size={16} /> Add Network
          </button>
          <button onClick={handleSave} disabled={isSaving} className="justify-center bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
            {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} Save Defaults
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {defaultNetworks.map((net) => (
          <div key={net.id} className="grid grid-cols-2 md:grid-cols-12 gap-3 items-center bg-slate-50 p-4 rounded-xl border border-slate-200 transition-all hover:border-purple-200 hover:shadow-sm">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">VLAN ID</label>
              <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-center font-mono outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50 transition-all" value={net.vlanId} onChange={(e) => updateDefaultNetwork(net.id, 'vlanId', parseInt(e.target.value))} />
            </div>
            <div className="col-span-1 md:col-span-3">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Network Name</label>
              <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50 transition-all" value={net.name} onChange={(e) => updateDefaultNetwork(net.id, 'name', e.target.value)} />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">IP / CIDR</label>
              <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50 transition-all" value={net.ip} onChange={(e) => updateDefaultNetwork(net.id, 'ip', e.target.value)} />
            </div>
            <div className="col-span-2 md:col-span-4 flex justify-between md:justify-end gap-2 mt-2 md:mt-0 md:pt-4">
              <div className="flex gap-2">
                <button onClick={() => updateDefaultNetwork(net.id, 'dhcp', !net.dhcp)} className={`flex items-center px-3 py-2 rounded-lg border text-[11px] font-bold transition-colors flex-1 md:flex-none justify-center ${net.dhcp ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                  <Server size={14} className="mr-1" /> DHCP
                </button>
                <button onClick={() => toggleDefaultHotspot(net.id, net.hotspot)} className={`flex items-center px-3 py-2 rounded-lg border text-[11px] font-bold transition-colors flex-1 md:flex-none justify-center ${net.hotspot ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                  <ShieldCheck size={14} className="mr-1" /> HOTSPOT
                </button>
              </div>
              <button onClick={() => removeDefaultNetwork(net.id)} className="p-2.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-lg transition-all">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {defaultNetworks.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-300 rounded-xl bg-slate-50">ยังไม่มีการตั้งค่า Network เริ่มต้น</div>
        )}
      </div>
    </div>
  );
}