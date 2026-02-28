import { useState } from 'react';
import { Save, AlertTriangle, Loader2 } from 'lucide-react';
import apiClient from '../../utils/apiClient';

export default function TabPbrTargets({ initialData }) {
  const [monitorIps, setMonitorIps] = useState([...(initialData || []), '', '', '', '', ''].slice(0, 5));
  const [isSaving, setIsSaving] = useState(false);

  const handleMonitorIpChange = (index, val) => {
    const sanitizedVal = val.replace(/[^0-9.]/g, ''); 
    const newIps = [...monitorIps];
    newIps[index] = sanitizedVal;
    setMonitorIps(newIps);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.put(`/api/settings/MONITOR_IPS`, { value: monitorIps });
      alert(`บันทึกข้อมูล MONITOR_IPS สำเร็จ!`);
    } catch (error) {
      alert(`เกิดข้อผิดพลาดในการบันทึก: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">PBR Check-Gateway Targets</h3>
          <p className="text-xs text-orange-600 mt-1 items-center gap-1 font-bold bg-orange-50 px-2 py-1 rounded inline-flex"><AlertTriangle size={14}/> บังคับ 5 ช่อง และห้ามใช้ IP ซ้ำกัน</p>
        </div>
        <button onClick={handleSave} disabled={isSaving || monitorIps.some(ip => !ip)} className="w-full sm:w-auto justify-center bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
          {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} Save Targets
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {monitorIps.map((ip, idx) => (
          <div key={idx} className="relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 group-focus-within:text-orange-500 transition-colors">WAN {idx + 1}</span>
            <input type="text" value={ip} onChange={(e) => handleMonitorIpChange(idx, e.target.value)} className="w-full border-2 border-slate-200 rounded-xl pl-20 pr-4 py-3 text-sm font-mono text-slate-700 outline-none focus:border-orange-400 focus:bg-orange-50/30 transition-all" placeholder="8.8.8.8"/>
          </div>
        ))}
      </div>
    </div>
  );
}