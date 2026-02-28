import { useState } from 'react';
import { Save, Plus, Trash2, Loader2 } from 'lucide-react';
import apiClient from '../../utils/apiClient';

export default function TabManagementIps({ initialData }) {
  const [managementIps, setManagementIps] = useState(initialData || []);
  const [newManagementIp, setNewManagementIp] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const addManagementIp = () => {
    if (!newManagementIp) return;
    setManagementIps([...managementIps, newManagementIp]);
    setNewManagementIp('');
  };
  const removeManagementIp = (index) => setManagementIps(managementIps.filter((_, i) => i !== index));
  const updateManagementIp = (index, val) => {
    const updated = [...managementIps];
    updated[index] = val;
    setManagementIps(updated);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.put(`/api/settings/MANAGEMENT_IPS`, { value: managementIps });
      alert(`บันทึกข้อมูล MANAGEMENT_IPS สำเร็จ!`);
    } catch (error) {
      alert(`เกิดข้อผิดพลาดในการบันทึก: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-6 pb-4 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-800">Management IPs (Allow List)</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {managementIps.map((ip, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-50 transition-all">
            <input type="text" value={ip} onChange={(e) => updateManagementIp(idx, e.target.value)} className="flex-1 bg-transparent px-2 py-1 text-sm font-mono text-emerald-800 outline-none w-full"/>
            <button onClick={() => removeManagementIp(idx)} className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
          </div>
        ))}
      </div>
      
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100 mt-auto">
        <input type="text" placeholder="e.g. 10.234.56.0/24" value={newManagementIp} onChange={e => setNewManagementIp(e.target.value)} onKeyDown={e => e.key === 'Enter' && addManagementIp()} className="w-full sm:flex-1 md:max-w-sm border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500" />
        <div className="flex w-full sm:w-auto gap-3">
          <button onClick={addManagementIp} className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-all whitespace-nowrap"><Plus size={18} /> Add IP</button>
          <div className="w-px h-8 bg-slate-200 hidden sm:block"></div>
          <button onClick={handleSave} disabled={isSaving} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap">
            {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} Save IPs
          </button>
        </div>
      </div>
    </div>
  );
}