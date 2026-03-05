import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Loader2, Eye, EyeOff, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import apiClient from '../../../utils/apiClient';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';

export default function TabAdmins({ initialData }) {
  const queryClient = useQueryClient();

  // ==========================================
  // States
  // ==========================================
  const [routerAdmins, setRouterAdmins] = useState(initialData || []);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', group: 'full' });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; 

  // ==========================================
  // Pagination Logic
  // ==========================================
  const totalPages = Math.ceil(routerAdmins.length / itemsPerPage) || 1;
  const paginatedAdmins = useMemo(() => {
    return routerAdmins.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [routerAdmins, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  // ==========================================
  // Handlers (Actions)
  // ==========================================
  const handleSaveToBackend = async (updatedList, onSuccess) => {
    setIsSaving(true);
    const savePromise = apiClient.put(`/api/settings/ROUTER_ADMINS`, { value: updatedList });
    
    toast.promise(savePromise, {
      loading: 'กำลังบันทึกข้อมูล...',
      success: 'อัปเดต Router Admins สำเร็จ!',
      error: (err) => `เกิดข้อผิดพลาด: ${err.message}`
    });

    try {
      await savePromise;
      setRouterAdmins(updatedList);
      queryClient.invalidateQueries({ queryKey: ['settings'] }); 
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const addAdmin = () => {
    if (!newAdmin.username || !newAdmin.password) {
      return toast.error("กรุณากรอก Username และ Password ให้ครบถ้วน");
    }
    const isDuplicate = routerAdmins.some(admin => admin.username.toLowerCase() === newAdmin.username.toLowerCase());
    if (isDuplicate) return toast.error(`มี Username "${newAdmin.username}" อยู่ในระบบแล้ว`);

    const updatedList = [...routerAdmins, newAdmin];
    handleSaveToBackend(updatedList, () => {
      setNewAdmin({ username: '', password: '', group: 'full' });
      setShowNewPassword(false);
      setCurrentPage(Math.ceil(updatedList.length / itemsPerPage));
    });
  };

  const removeAdmin = async (index, username) => {
    const realIndex = (currentPage - 1) * itemsPerPage + index;

    const result = await Swal.fire({
      title: 'ยืนยันการลบ Admin?',
      text: `คุณต้องการลบ "${username}" ออกจาก Default Config ใช่หรือไม่?`,
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
      const updatedList = routerAdmins.filter((_, i) => i !== realIndex);
      handleSaveToBackend(updatedList);
    }
  };

  // ==========================================
  // Render
  // ==========================================
  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="mb-6 pb-4 border-b border-slate-100 shrink-0">
        <h3 className="text-lg font-bold text-slate-800">Default Router Admins</h3>
        <p className="text-sm text-slate-500 mt-1">รายชื่อผู้ดูแลระบบที่จะถูกฝังเข้าไปในสคริปต์ MikroTik (บันทึกอัตโนมัติ)</p>
      </div>
      
      {/* ฟอร์มเพิ่มข้อมูล */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 mb-6 shrink-0">
        <div className="grid grid-cols-2 md:flex items-center gap-3">
          <input type="text" placeholder="New Username" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value.replace(/\s/g, '')})} className="col-span-2 md:flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all" />
          <div className="col-span-2 md:flex-1 relative">
            <input type={showNewPassword ? "text" : "password"} placeholder="New Password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="w-full border border-slate-300 rounded-xl pl-4 pr-10 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 transition-all font-mono" />
            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <select value={newAdmin.group} onChange={e => setNewAdmin({...newAdmin, group: e.target.value})} className="col-span-1 md:w-32 border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-50 bg-white">
            <option value="full">Full</option>
            <option value="read">Read</option>
          </select>
          <button onClick={addAdmin} disabled={isSaving} className="col-span-1 justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-all shadow-sm">
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Add User
          </button>
        </div>
      </div>

      {/* 🟢 Container ล็อคความสูงขั้นต่ำ (480px) เผื่อเนื้อหาหายไปในหน้าสุดท้าย */}
      <div className="flex-1 flex flex-col min-h-[480px]">
        {/* รายการข้อมูล (ปรับให้เหมือนหน้า IP) */}
        <div className="flex-1 space-y-4">
          {paginatedAdmins.map((admin, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-sm transition-all hover:border-blue-300">
              <div className="flex-1 min-w-[120px] flex items-center gap-2">
                <ShieldCheck size={16} className="text-blue-500 shrink-0" />
                <span className="flex-1 text-sm font-mono text-slate-800 font-bold">{admin.username}</span>
              </div>
              <div className="flex-1 min-w-[120px] text-slate-400 font-mono text-sm tracking-widest">••••••••</div>
              <div className="w-24 text-center">
                <span className={`px-2 py-1 rounded text-[11px] font-bold uppercase ${admin.group === 'full' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                  Group: {admin.group}
                </span>
              </div>
              <button onClick={() => removeAdmin(idx, admin.username)} disabled={isSaving} className="text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:bg-red-50 p-2 rounded-lg transition-colors disabled:opacity-50">
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          {routerAdmins.length === 0 && (
            <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-300 rounded-xl bg-slate-50">ยังไม่มีรายชื่อ Admin เริ่มต้น</div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-auto mb-2 pt-4">
            <div className="flex items-center gap-1 p-1.5 bg-blue-50/80 backdrop-blur-md border border-blue-200/60 rounded-full shadow-[0_4px_20px_rgb(59,130,246,0.1)] transition-all">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-full text-blue-500 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-40 disabled:hover:bg-transparent transition-all">
                <ChevronLeft size={20} strokeWidth={2.5} />
              </button>
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${currentPage === page ? 'bg-blue-600 text-white shadow-md' : 'text-blue-600/70 hover:bg-blue-100'}`}>
                    {page}
                  </button>
                ))}
              </div>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-full text-blue-500 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-40 disabled:hover:bg-transparent transition-all">
                <ChevronRight size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}