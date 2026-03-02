import { useState } from 'react';
import { Plus, Trash2, Loader2, Network } from 'lucide-react';
import apiClient from '../../utils/apiClient';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';

export default function TabManagementIps({ initialData }) {
  const queryClient = useQueryClient();

  // ==========================================
  // States
  // ==========================================
  const [managementIps, setManagementIps] = useState(initialData || []);
  const [newManagementIp, setNewManagementIp] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ==========================================
  // Handlers (Actions)
  // ==========================================
  const handleSaveToBackend = async (updatedList, onSuccess) => {
    setIsSaving(true);
    const savePromise = apiClient.put(`/api/settings/MANAGEMENT_IPS`, { value: updatedList });
    
    toast.promise(savePromise, {
      loading: 'กำลังบันทึกข้อมูล...',
      success: 'อัปเดต Management IPs สำเร็จ!',
      error: (err) => `เกิดข้อผิดพลาด: ${err.message}`
    });

    try {
      await savePromise;
      setManagementIps(updatedList);
      queryClient.invalidateQueries({ queryKey: ['settings'] }); // ✅ ล้าง Cache
      if (onSuccess) onSuccess();
    } catch (error) { console.error(error); } 
    finally { setIsSaving(false); }
  };

  const addManagementIp = () => {
    const cleanIp = newManagementIp.trim();
    if (!cleanIp) return toast.error("กรุณากรอก IP Address หรือ CIDR");
    if (managementIps.includes(cleanIp)) return toast.error(`IP "${cleanIp}" มีอยู่ในระบบแล้ว`);

    const updatedList = [...managementIps, cleanIp];
    handleSaveToBackend(updatedList, () => { setNewManagementIp(''); });
  };

  const removeManagementIp = async (index, ip) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ IP?',
      text: `คุณต้องการลบ IP "${ip}" ออกจาก Allow List ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบออก!',
      cancelButtonText: 'ยกเลิก',
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl p-6 border border-slate-100 shadow-xl',
        title: 'text-xl font-bold text-slate-800',
        htmlContainer: 'text-sm text-slate-500 font-medium mt-2',
        actions: 'flex gap-3 mt-6 w-full justify-center',
        confirmButton: 'bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-bold transition-all'
      }
    });

    if (result.isConfirmed) {
      const updatedList = managementIps.filter((_, i) => i !== index);
      handleSaveToBackend(updatedList);
    }
  };

  // ==========================================
  // Render
  // ==========================================
  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="mb-6 pb-4 border-b border-slate-100">
        <h3 className="text-lg font-bold text-slate-800">Management IPs (Allow List)</h3>
        <p className="text-sm text-slate-500 mt-1">IP ที่ได้รับอนุญาตให้เข้าถึงระบบจัดการของอุปกรณ์ (บันทึกอัตโนมัติ)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {managementIps.map((ip, idx) => (
          <div key={idx} className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-emerald-300">
            <Network size={16} className="text-emerald-500 shrink-0" />
            <span className="flex-1 text-sm font-mono text-emerald-900 font-bold">{ip}</span>
            <button onClick={() => removeManagementIp(idx, ip)} disabled={isSaving} className="text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      {managementIps.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-300 rounded-xl bg-slate-50 mb-6">
          ไม่มี IP ใน Allow List (อุปกรณ์จะอนุญาตให้เข้าจากทุก IP ซึ่งไม่ปลอดภัย)
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-slate-100 mt-auto">
        <input type="text" placeholder="e.g. 10.234.56.0/24 หรือ 192.168.1.100" value={newManagementIp} onChange={e => setNewManagementIp(e.target.value)} onKeyDown={e => e.key === 'Enter' && addManagementIp()} className="w-full sm:flex-1 border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-50 transition-all" />
        <button onClick={addManagementIp} disabled={isSaving} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all shadow-sm whitespace-nowrap">
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Add IP Address
        </button>
      </div>
    </div>
  );
}