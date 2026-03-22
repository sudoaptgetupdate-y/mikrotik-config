import React, { useState, useMemo, useEffect } from 'react';
import { Users, Plus, Search, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

import { groupService } from '../../services/groupService'; 
import { deviceService } from '../../services/deviceService'; 

// นำเข้า Components ย่อย
import GroupCard from './components/GroupCard';
import GroupFormModal from './components/GroupFormModal';
import ManageDevicesModal from './components/ManageDevicesModal';
import Pagination from '../../components/Pagination';

const GroupManagement = () => {
  const { t } = useTranslation();
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
    name: '', description: '', telegramBotToken: '', telegramChatId: '', isNotifyEnabled: true, adminName: '', adminContact: '',
    aiEnabled: false, aiGeminiKey: '', aiSystemPrompt: ''
  });
  const [manualMessage, setManualMessage] = useState("");

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
    setFormData({ 
      name: '', description: '', telegramBotToken: '', telegramChatId: '', isNotifyEnabled: true, adminName: '', adminContact: '',
      aiEnabled: false, aiGeminiKey: '', aiSystemPrompt: ''
    });
    setManualMessage("");
    setIsEditMode(false);
    setIsFormModalOpen(true);
  };

  const openEditModal = (group) => {
    setFormData({ 
      name: group.name, description: group.description || '', 
      telegramBotToken: group.telegramBotToken || '', telegramChatId: group.telegramChatId || '', 
      isNotifyEnabled: group.isNotifyEnabled, adminName: group.adminName || '', adminContact: group.adminContact || '',
      aiEnabled: group.aiEnabled || false, aiGeminiKey: group.aiGeminiKey || '', aiSystemPrompt: group.aiSystemPrompt || ''
    });
    setManualMessage("");
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
      loading: isEditMode ? t('groups.form.updating') : t('groups.form.creating'), 
      success: isEditMode ? t('groups.form.update_success') : t('groups.form.create_success'), 
      error: (err) => err?.response?.data?.error || err.message || t('common.error')
    });
    try { 
      await savePromise; 
      setIsFormModalOpen(false); 
      queryClient.invalidateQueries({ queryKey: ['groups'] }); 
    } catch (e) { console.error(e); }
  };

  const handleDeleteGroup = async (group) => {
    if (group.name === 'All Devices') {
      return toast.error(t('groups.delete_confirm.default_group_error'));
    }

    const result = await Swal.fire({
      title: t('groups.delete_confirm.title'), 
      text: t('groups.delete_confirm.text', { name: group.name }), 
      icon: 'warning',
      showCancelButton: true, 
      confirmButtonColor: '#ef4444', 
      confirmButtonText: t('groups.delete_confirm.confirm'), 
      cancelButtonText: t('common.cancel'),
      customClass: {
        confirmButton: 'rounded-lg',
        cancelButton: 'rounded-lg'
      }
    });
    if (result.isConfirmed) {
      const deletePromise = groupService.deleteGroup(group.id);
      toast.promise(deletePromise, { 
        loading: t('common.loading'), 
        success: t('groups.delete_confirm.success'), 
        error: (err) => err.response?.data?.error || t('groups.delete_confirm.error') 
      });
      try { await deletePromise; queryClient.invalidateQueries({ queryKey: ['groups'] }); } catch (e) {}
    }
  };

  const handleSaveDevices = async (groupId, draftIds, originalIds) => {
    const devicesToAdd = draftIds.filter(id => !originalIds.includes(id));
    const devicesToRemove = originalIds.filter(id => !draftIds.includes(id));

    if (devicesToAdd.length === 0 && devicesToRemove.length === 0) {
      setIsDeviceModalOpen(false); return;
    }

    const toastId = toast.loading(t('groups.manage.updating'));
    try {
      const promises = [
        ...devicesToAdd.map(id => groupService.addDeviceToGroup(groupId, id)),
        ...devicesToRemove.map(id => groupService.removeDeviceFromGroup(groupId, id))
      ];
      await Promise.all(promises);
      toast.success(t('groups.manage.success'), { id: toastId });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setIsDeviceModalOpen(false);
    } catch (error) { toast.error(t('groups.manage.error'), { id: toastId }); }
  };

  const handleTestTelegram = async () => {
    if (!formData.telegramBotToken || !formData.telegramChatId) return toast.error(t('groups.form.telegram_missing'));
    const tid = toast.loading(t('groups.form.telegram_sending'));
    try {
      const res = await fetch(`https://api.telegram.org/bot${formData.telegramBotToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: formData.telegramChatId, text: `✅ <b>[TEST SUCCESS]</b>\n${t('groups.form.telegram_success_msg')}`, parse_mode: 'HTML' })
      });
      if ((await res.json()).ok) toast.success(t('groups.form.telegram_success'), { id: tid });
      else throw new Error(t('groups.form.telegram_invalid'));
    } catch (err) { toast.error(`${t('groups.form.telegram_error')}: ${err.message}`, { id: tid }); }
  };

  const handleSendManualMessage = async () => {
    if (!manualMessage.trim()) return;
    if (!formData.telegramBotToken || !formData.telegramChatId) return toast.error(t('groups.form.telegram_incomplete'));

    const tid = toast.loading(t('groups.form.manual_sending'));
    try {
      const res = await fetch(`https://api.telegram.org/bot${formData.telegramBotToken}/sendMessage`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: formData.telegramChatId, 
          text: `📢 <b>[${t('groups.form.manual_announce_title')}]</b>\n\n${manualMessage}`, 
          parse_mode: 'HTML' 
        })
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(t('groups.form.manual_success'), { id: tid });
        setManualMessage("");
      } else {
        throw new Error(data.description || t('groups.form.telegram_invalid'));
      }
    } catch (err) { 
      toast.error(`${t('groups.form.telegram_error')}: ${err.message}`, { id: tid }); 
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 my-4 sm:my-8">
      
      {/* 1. Page Header Section (Island Card) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="text-blue-600" size={28} /> 
            {t('groups.title')}
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium italic">
            {t('groups.subtitle')}
          </p>
        </div>
        
        <div className="relative z-10">
          <button 
            onClick={openAddModal} 
            className="shrink-0 bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all font-bold text-sm shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} strokeWidth={2.5} /> 
            <span>{t('groups.create_button')}</span>
          </button>
        </div>

        {/* Accent Blur */}
        <div className="absolute right-0 top-0 w-48 h-48 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-100/50 transition-colors duration-700"></div>
      </div>

      {/* 2. Control Toolbar (Search & Filters) */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={t('groups.search_placeholder')} 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm" 
          />
        </div>
        <div className="text-sm text-slate-500 font-medium px-2">
          {t('groups.found_total', { count: filteredGroups.length })}
        </div>
      </div>

      {/* 3. Content Area */}
      {loadingGroups ? (
        // 🟢 เปลี่ยนความสูงตอน Loading ให้เป็น Responsive
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 ">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p>{t('groups.loading')}</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        // 🟢 เปลี่ยนความสูงตอน Empty State ให้เป็น Responsive
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center  text-center p-8 shadow-sm">
          <div className="bg-slate-50 p-4 rounded-full mb-4">
            <Layers size={48} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">{t('groups.not_found')}</h3>
          <p className="text-slate-500 text-sm max-w-sm mb-6">
            {t('groups.empty_description')}
          </p>
          <button 
            onClick={openAddModal} 
            className="text-blue-600 font-medium text-sm hover:underline flex items-center gap-1"
          >
            <Plus size={16} /> {t('groups.create_new')}
          </button>
        </div>
      ) : (
        <>
          {/* 🟢 เปลี่ยนความสูงกล่องเนื้อหาหลัก (Grid) ให้เป็น Responsive */}
          <div className="">
            {/* ข้อมูล Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedGroups.map(group => (
                <GroupCard key={group.id} group={group} onEdit={openEditModal} onDelete={handleDeleteGroup} onManageDevices={openDeviceModal} />
              ))}
            </div>
          </div>

          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            setCurrentPage={setCurrentPage} 
          />
        </>
      )}

      {/* Modals */}
      <GroupFormModal 
        isOpen={isFormModalOpen} 
        onClose={() => setIsFormModalOpen(false)} 
        isEditMode={isEditMode} 
        formData={formData} 
        setFormData={setFormData} 
        onSubmit={handleSubmitGroup} 
        onTestTelegram={handleTestTelegram} 
        manualMessage={manualMessage}
        setManualMessage={setManualMessage}
        onSendManualMessage={handleSendManualMessage}
      />
      <ManageDevicesModal isOpen={isDeviceModalOpen} onClose={() => setIsDeviceModalOpen(false)} group={selectedGroup} allDevices={allDevices} loadingDevices={loadingDevices} onSave={handleSaveDevices} />
    </div>
  );
};

export default GroupManagement;