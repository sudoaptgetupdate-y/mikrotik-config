import { useState } from 'react';
import { Save, Plus, Trash2, Loader2, Server, ShieldCheck } from 'lucide-react';
import apiClient from '../../../utils/apiClient';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

export default function TabVlanNetwork({ initialData }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // 🟢 1. เรียงลำดับข้อมูลตั้งแต่ตอนโหลดครั้งแรก (vlanId น้อยไปหามาก)
  const [defaultNetworks, setDefaultNetworks] = useState(() => {
    const data = initialData || [];
    return [...data].sort((a, b) => (a.vlanId || 0) - (b.vlanId || 0));
  });
  
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
    // ให้อันที่สร้างใหม่เด้งขึ้นมาบนสุดเพื่อให้ง่ายต่อการแก้ไข พอกด Save ค่อยเรียงใหม่
    setDefaultNetworks([newNet, ...defaultNetworks]);
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

    // 🟢 2. ทำการเรียงลำดับ vlanId จากน้อยไปมาก ก่อนบันทึกลง Database
    const sortedNetworks = [...defaultNetworks].sort((a, b) => (a.vlanId || 0) - (b.vlanId || 0));
    
    // อัปเดต State ให้หน้าจอแสดงผลตามลำดับที่เรียงแล้วทันทีหลังกดเซฟ
    setDefaultNetworks(sortedNetworks);

    const savePromise = apiClient.put(`/api/settings/DEFAULT_NETWORKS`, { value: JSON.stringify(sortedNetworks) });
    
    toast.promise(savePromise, {
      loading: t('common.saving') || 'กำลังบันทึกข้อมูล...',
      success: t('settings.defaults.toast_success'),
      error: (err) => `${t('common.error')}: ${err.message}`
    });

    try {
      await savePromise;
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    } catch (error) { 
      console.error(error); 
    } finally { 
      setIsSaving(false); 
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4 shrink-0">
        <div>
          <h3 className="text-lg font-bold text-slate-800">{t('settings.defaults.title')}</h3>
          <p className="text-sm text-slate-500">{t('settings.defaults.desc')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button onClick={addDefaultNetwork} className="justify-center bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
            <Plus size={16} /> {t('settings.defaults.add_button')}
          </button>
          <button onClick={handleSave} disabled={isSaving} className="justify-center bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm">
            {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} {t('settings.defaults.save_button')}
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-2 pb-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 transition-all">
        {defaultNetworks.map((net) => (
          <div key={net.id} className="grid grid-cols-2 md:grid-cols-12 gap-3 items-center bg-slate-50 p-4 rounded-xl border border-slate-200 transition-all hover:border-purple-200 hover:shadow-sm">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('settings.defaults.label_vlan')}</label>
              <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-center font-mono outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50 transition-all" value={net.vlanId} onChange={(e) => updateDefaultNetwork(net.id, 'vlanId', parseInt(e.target.value))} />
            </div>
            <div className="col-span-1 md:col-span-3">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('settings.defaults.label_name')}</label>
              <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50 transition-all" value={net.name} onChange={(e) => updateDefaultNetwork(net.id, 'name', e.target.value)} />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">{t('settings.defaults.label_ip')}</label>
              <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50 transition-all" value={net.ip} onChange={(e) => updateDefaultNetwork(net.id, 'ip', e.target.value)} />
            </div>
            <div className="col-span-2 md:col-span-4 flex justify-between md:justify-end gap-2 mt-2 md:mt-0 md:pt-4">
              <div className="flex gap-2">
                <button onClick={() => updateDefaultNetwork(net.id, 'dhcp', !net.dhcp)} className={`flex items-center px-3 py-2 rounded-lg border text-[11px] font-bold transition-colors flex-1 md:flex-none justify-center ${net.dhcp ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                  <Server size={14} className="mr-1" /> {t('settings.defaults.btn_dhcp')}
                </button>
                <button onClick={() => toggleDefaultHotspot(net.id, net.hotspot)} className={`flex items-center px-3 py-2 rounded-lg border text-[11px] font-bold transition-colors flex-1 md:flex-none justify-center ${net.hotspot ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}>
                  <ShieldCheck size={14} className="mr-1" /> {t('settings.defaults.btn_hotspot')}
                </button>
              </div>
              <button onClick={() => removeDefaultNetwork(net.id)} className="p-2.5 text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-lg transition-all">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {defaultNetworks.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-300 rounded-xl bg-slate-50">{t('settings.defaults.empty')}</div>
        )}
      </div>
    </div>
  );
}