import React, { useState, useMemo, useEffect } from 'react';
import { Users, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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

  // ตรวจสอบไม่ให้ currentPage เกิน totalPages กรณีลบข้อมูลหน้าสุดท้ายทิ้งจนหมด
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
    // ดักไว้ก่อนเลยว่าห้ามลบ
    if (group.name === 'All Devices') {
      return toast.error('ไม่อนุญาตให้ลบกลุ่มพื้นฐานของระบบ (Default Group) ได้');
    }

    const result = await Swal.fire({
      title: 'ยืนยันการลบกลุ่ม?', text: `คุณแน่ใจหรือไม่ว่าต้องการลบกลุ่ม "${group.name}"?`, icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'ใช่, ลบเลย!', cancelButtonText: 'ยกเลิก',
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
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-blue-600" /> Device Groups</h2>
          <p className="text-slate-500 mt-1">จัดการกลุ่มอุปกรณ์และการแจ้งเตือนผ่าน Telegram</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="ค้นหากลุ่ม..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 transition" />
          </div>
          <button onClick={openAddModal} className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 font-bold shadow-sm whitespace-nowrap"><Plus size={20} /> Create Group</button>
        </div>
      </div>

      {/* Group List */}
      {loadingGroups ? (
        <div className="p-10 text-center text-slate-400">Loading groups...</div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-10 text-center text-slate-500 border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center min-h-[300px]">
          <Users size={48} className="text-slate-300 mb-4" />
          <p className="font-bold text-lg text-slate-700">No Groups Found</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedGroups.map(group => (
              <GroupCard key={group.id} group={group} onEdit={openEditModal} onDelete={handleDeleteGroup} onManageDevices={openDeviceModal} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8 pt-6 border-t border-slate-100">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1} 
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition font-bold text-sm shadow-sm"
              >
                <ChevronLeft size={16} /> ก่อนหน้า
              </button>
              <span className="text-sm font-bold text-slate-500 bg-slate-100 px-4 py-2 rounded-xl">
                หน้า {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages} 
                className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition font-bold text-sm shadow-sm"
              >
                ถัดไป <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <GroupFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} isEditMode={isEditMode} formData={formData} setFormData={setFormData} onSubmit={handleSubmitGroup} onTestTelegram={handleTestTelegram} />
      <ManageDevicesModal isOpen={isDeviceModalOpen} onClose={() => setIsDeviceModalOpen(false)} group={selectedGroup} allDevices={allDevices} loadingDevices={loadingDevices} onSave={handleSaveDevices} />
    </div>
  );
};

export default GroupManagement;