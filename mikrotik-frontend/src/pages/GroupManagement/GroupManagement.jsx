import React, { useState, useMemo, useEffect } from 'react';
import { Users, Plus, Search, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

import { groupService } from '../../services/groupService'; 
import { deviceService } from '../../services/deviceService'; 

// นำเข้า Components ย่อย
import GroupCard from './components/GroupCard';
import GroupFormModal from './components/GroupFormModal';
import ManageDevicesModal from './components/ManageDevicesModal';

const GroupManagement = () => {
  const queryClient = useQueryClient();

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // แสดงหน้าละ 6 กลุ่ม
  
  const [formData, setFormData] = useState({
    name: '', description: '', telegramBotToken: '', telegramChatId: '', isNotifyEnabled: true, adminName: '', adminContact: ''
  });

  // Fetching
  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: groupService.getGroups
  });

  const { data: allDevices = [], isLoading: loadingDevices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => deviceService.getUserDevices() 
  });

  // กรองข้อมูลตามการค้นหา
  const filteredGroups = useMemo(() => {
    const filtered = groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // จัดเรียงให้ All Devices ขึ้นเป็นอันดับ 1 เสมอ
    return filtered.sort((a, b) => {
      if (a.name === 'All Devices') return -1;
      if (b.name === 'All Devices') return 1;
      return 0; // กลุ่มอื่นๆ ให้เรียงตามปกติ
    });
  }, [groups, searchQuery]);

  // คำนวณข้อมูลสำหรับ Pagination
  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage) || 1;
  const paginatedGroups = useMemo(() => {
    return filteredGroups.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredGroups, currentPage]);

  // ตรวจสอบไม่ให้ currentPage เกิน totalPages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  // Handlers
  const openAddModal = () => {
    setFormData({ name: '', description: '', telegramBotToken: '', telegramChatId: '', isNotifyEnabled: true, adminName: '', adminContact: '' });
    setIsEditMode(false);
    setIsFormModalOpen(true);
  };

  const openEditModal = (group) => {
    setFormData({ 
      name: group.name, description: group.description || '', 
      telegramBotToken: group.telegramBotToken || '', telegramChatId: group.telegramChatId || '', 
      isNotifyEnabled: group.isNotifyEnabled, adminName: group.adminName || '', adminContact: group.adminContact || ''
    });
    setEditingId(group.id);
    setIsEditMode(true);
    setIsFormModalOpen(true);
  };

  const openDeviceModal = (group) => {
    setSelectedGroup(group);
    setIsDeviceModalOpen(true);
  };

  const handleSubmitGroup = async (e) => {
    e.preventDefault();
    const savePromise = isEditMode ? groupService.updateGroup(editingId, formData) : groupService.createGroup(formData);
    toast.promise(savePromise, {
      loading: isEditMode ? 'กำลังอัปเดตข้อมูล...' : 'กำลังสร้างกลุ่ม...', 
      success: isEditMode ? 'อัปเดตกลุ่มสำเร็จ!' : 'สร้างกลุ่มใหม่สำเร็จ!', 
      error: (err) => err?.response?.data?.error || err.message || 'เกิดข้อผิดพลาด'
    });
    try { 
      await savePromise; 
      setIsFormModalOpen(false); 
      queryClient.invalidateQueries({ queryKey: ['groups'] }); 
    } catch (e) { console.error(e); }
  };

  const handleDeleteGroup = async (group) => {
    if (group.name === 'All Devices') {
      return toast.error('ไม่อนุญาตให้ลบกลุ่มพื้นฐานของระบบ (Default Group) ได้');
    }

    const result = await Swal.fire({
      title: 'ยืนยันการลบกลุ่ม?', text: `คุณแน่ใจหรือไม่ว่าต้องการลบกลุ่ม "${group.name}"?`, icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ใช่, ลบเลย!', cancelButtonText: 'ยกเลิก',
      customClass: {
        confirmButton: 'rounded-lg',
        cancelButton: 'rounded-lg'
      }
    });
    if (result.isConfirmed) {
      const deletePromise = groupService.deleteGroup(group.id);
      toast.promise(deletePromise, { loading: 'Deleting...', success: 'ลบสำเร็จ!', error: (err) => err.response?.data?.error || 'ไม่สำเร็จ' });
      try { await deletePromise; queryClient.invalidateQueries({ queryKey: ['groups'] }); } catch (e) {}
    }
  };

  const handleSaveDevices = async (groupId, draftIds, originalIds) => {
    const devicesToAdd = draftIds.filter(id => !originalIds.includes(id));
    const devicesToRemove = originalIds.filter(id => !draftIds.includes(id));

    if (devicesToAdd.length === 0 && devicesToRemove.length === 0) {
      setIsDeviceModalOpen(false); return;
    }

    const toastId = toast.loading('กำลังอัปเดตสมาชิกกลุ่ม...');
    try {
      const promises = [
        ...devicesToAdd.map(id => groupService.addDeviceToGroup(groupId, id)),
        ...devicesToRemove.map(id => groupService.removeDeviceFromGroup(groupId, id))
      ];
      await Promise.all(promises);
      toast.success('อัปเดตอุปกรณ์ในกลุ่มสำเร็จ!', { id: toastId });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setIsDeviceModalOpen(false);
    } catch (error) { toast.error('เกิดข้อผิดพลาดในการอัปเดตข้อมูล', { id: toastId }); }
  };

  const handleTestTelegram = async () => {
    if (!formData.telegramBotToken || !formData.telegramChatId) return toast.error('กรุณากรอก Bot Token และ Chat ID ก่อน');
    const tid = toast.loading('กำลังส่งข้อความ...');
    try {
      const res = await fetch(`https://api.telegram.org/bot${formData.telegramBotToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: formData.telegramChatId, text: `✅ <b>[TEST SUCCESS]</b>\nระบบพร้อมใช้งานจาก MikrotikPanel`, parse_mode: 'HTML' })
      });
      if ((await res.json()).ok) toast.success('สำเร็จ! เช็คใน Telegram ได้เลย', { id: tid });
      else throw new Error('Token หรือ Chat ID ไม่ถูกต้อง');
    } catch (err) { toast.error(`ส่งไม่สำเร็จ: ${err.message}`, { id: tid }); }
  };

  return (
    // 🟢 เปลี่ยนกลับมาใช้ pb-28 เพื่อเว้นพื้นที่ด้านล่างให้กล่อง Pagination ลอยได้โดยไม่บังการ์ด
    <div className="space-y-6 pb-28 animate-in fade-in duration-500">
      
      {/* 1. Page Header (แบบ Classic & Clean) */}
      <div className="space-y-4">
        <nav className="flex items-center text-sm font-medium text-slate-500 gap-2">
          <a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a>
          <ChevronRight size={14} className="text-slate-400" />
          <a href="/devices" className="hover:text-blue-600 transition-colors">Devices</a>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-800">Groups</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Users className="text-blue-600" size={28} /> 
              Device Groups
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              จัดการกลุ่มอุปกรณ์ การแบ่งสิทธิ์ และการแจ้งเตือนผ่าน Telegram
            </p>
          </div>
          
          {/* ปุ่ม Create สไตล์ Soft/Tonal */}
          <button 
            onClick={openAddModal} 
            className="shrink-0 bg-blue-50 text-blue-700 px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-100 transition-all font-semibold text-sm border border-blue-100"
          >
            <Plus size={18} strokeWidth={2.5} /> 
            <span>Create Group</span>
          </button>
        </div>

        {/* เส้นกั้น Solid Divider */}
        <hr className="border-slate-200 mt-2" />
      </div>

      {/* 2. Control Toolbar (Search & Filters) */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="ค้นหากลุ่มอุปกรณ์..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm" 
          />
        </div>
        <div className="text-sm text-slate-500 font-medium px-2">
          พบทั้งหมด <span className="text-slate-800 font-bold">{filteredGroups.length}</span> กลุ่ม
        </div>
      </div>

      {/* 3. Content Area */}
      {loadingGroups ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p>กำลังโหลดข้อมูลกลุ่ม...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center min-h-[400px] text-center p-8 shadow-sm">
          <div className="bg-slate-50 p-4 rounded-full mb-4">
            <Layers size={48} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">ไม่พบกลุ่มอุปกรณ์</h3>
          <p className="text-slate-500 text-sm max-w-sm mb-6">
            คุณยังไม่มีกลุ่มอุปกรณ์ หรือไม่พบผลลัพธ์จากการค้นหา กรุณาสร้างกลุ่มใหม่เพื่อเริ่มต้น
          </p>
          <button 
            onClick={openAddModal} 
            className="text-blue-600 font-medium text-sm hover:underline flex items-center gap-1"
          >
            <Plus size={16} /> สร้างกลุ่มอุปกรณ์ใหม่
          </button>
        </div>
      ) : (
        <>
          {/* 🟢 ครอบตรงนี้ด้วย min-h-[700px] เพื่อล็อคความสูงให้การ์ดไม่กระตุกเวลาข้อมูลน้อย */}
          <div className="min-h-[700px]">
            {/* ข้อมูล Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedGroups.map(group => (
                <GroupCard key={group.id} group={group} onEdit={openEditModal} onDelete={handleDeleteGroup} onManageDevices={openDeviceModal} />
              ))}
            </div>
          </div>

          {/* 🟢 Pagination Controls ลอยได้ตามปกติ (sticky) */}
          {totalPages > 1 && (
            <div className="sticky bottom-6 z-30 flex justify-center mt-8 pointer-events-none">
              <div className="flex items-center gap-1 p-1.5 bg-blue-50/80 backdrop-blur-md border border-blue-200/60 rounded-full shadow-[0_8px_30px_rgb(59,130,246,0.15)] pointer-events-auto transition-all hover:bg-blue-50/95">
                
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1} 
                  className="p-2 rounded-full text-blue-500 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-blue-500 transition-all"
                >
                  <ChevronLeft size={20} strokeWidth={2.5} />
                </button>
                
                <div className="flex items-center gap-1 px-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${
                        currentPage === page 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                          : 'text-blue-600/70 hover:bg-blue-100 hover:text-blue-700'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages} 
                  className="p-2 rounded-full text-blue-500 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-blue-500 transition-all"
                >
                  <ChevronRight size={20} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <GroupFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} isEditMode={isEditMode} formData={formData} setFormData={setFormData} onSubmit={handleSubmitGroup} onTestTelegram={handleTestTelegram} />
      <ManageDevicesModal isOpen={isDeviceModalOpen} onClose={() => setIsDeviceModalOpen(false)} group={selectedGroup} allDevices={allDevices} loadingDevices={loadingDevices} onSave={handleSaveDevices} />
    </div>
  );
};

export default GroupManagement;