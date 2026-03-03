import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Plus, Edit, Trash2, Send, CheckCircle, X, ShieldAlert, 
  Server, Bell, BellOff, Search, MonitorSmartphone, ChevronLeft, ChevronRight,
  MinusCircle, PlusCircle, ArrowRightLeft, Save, PlayCircle
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

import { groupService } from '../services/groupService';
import { deviceService } from '../services/deviceService'; 

const GroupManagement = () => {
  const queryClient = useQueryClient();

  // ==========================================
  // States - Group CRUD
  // ==========================================
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '', description: '', telegramBotToken: '', telegramChatId: '', isNotifyEnabled: true, adminName: '', adminContact: ''
  });

  // ==========================================
  // States - Manage Devices Modal (Side-by-Side)
  // ==========================================
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");
  
  const [originalAssignedIds, setOriginalAssignedIds] = useState([]);
  const [draftAssignedIds, setDraftAssignedIds] = useState([]);
  
  const [availablePage, setAvailablePage] = useState(1);
  const [assignedPage, setAssignedPage] = useState(1);
  const itemsPerModalPage = 5; 

  // ==========================================
  // React Query Fetching
  // ==========================================
  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: groupService.getGroups
  });

  const { data: allDevices = [], isLoading: loadingDevices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => deviceService.getUserDevices() 
  });

  // ==========================================
  // Filtering & Processing
  // ==========================================
  const filteredGroups = useMemo(() => {
    return groups.filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [groups, searchQuery]);

  const searchedDevices = useMemo(() => {
    return allDevices.filter(d => 
      d.name.toLowerCase().includes(deviceSearchQuery.toLowerCase()) || 
      (d.circuitId && d.circuitId.toLowerCase().includes(deviceSearchQuery.toLowerCase()))
    );
  }, [allDevices, deviceSearchQuery]);

  const availableDevices = useMemo(() => {
    return searchedDevices
      .filter(d => !draftAssignedIds.includes(d.id))
      .sort((a, b) => b.id - a.id); 
  }, [searchedDevices, draftAssignedIds]);

  const assignedDevices = useMemo(() => {
    return searchedDevices
      .filter(d => draftAssignedIds.includes(d.id))
      .sort((a, b) => b.id - a.id); 
  }, [searchedDevices, draftAssignedIds]);

  const paginatedAvailable = availableDevices.slice((availablePage - 1) * itemsPerModalPage, availablePage * itemsPerModalPage);
  const totalAvailablePages = Math.ceil(availableDevices.length / itemsPerModalPage) || 1;

  const paginatedAssigned = assignedDevices.slice((assignedPage - 1) * itemsPerModalPage, assignedPage * itemsPerModalPage);
  const totalAssignedPages = Math.ceil(assignedDevices.length / itemsPerModalPage) || 1;

  useEffect(() => {
    setAvailablePage(1);
    setAssignedPage(1);
  }, [deviceSearchQuery]);

  useEffect(() => {
    if (availablePage > totalAvailablePages) setAvailablePage(Math.max(1, totalAvailablePages));
    if (assignedPage > totalAssignedPages) setAssignedPage(Math.max(1, totalAssignedPages));
  }, [totalAvailablePages, totalAssignedPages]);

  // ==========================================
  // Handlers (Group CRUD)
  // ==========================================
  const openAddModal = () => {
    setFormData({ name: '', description: '', telegramBotToken: '', telegramChatId: '', isNotifyEnabled: true });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const openEditModal = (group) => {
    setFormData({ 
      name: group.name, description: group.description || '', 
      telegramBotToken: group.telegramBotToken || '', telegramChatId: group.telegramChatId || '', 
      isNotifyEnabled: group.isNotifyEnabled 
    });
    setEditingId(group.id);
    setIsEditMode(true);
    setIsModalOpen(true);
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
      setIsModalOpen(false); 
      queryClient.invalidateQueries({ queryKey: ['groups'] }); 
    } catch (e) { console.error(e); }
  };

  const handleDeleteGroup = async (group) => {
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

  // 🌟 ฟังก์ชันทดสอบ Telegram (ยิง API จากหน้าเว็บโดยตรง)
  const handleTestTelegram = async () => {
    if (!formData.telegramBotToken || !formData.telegramChatId) {
      toast.error('กรุณากรอก Bot Token และ Chat ID ก่อนทดสอบ');
      return;
    }
    const tid = toast.loading('กำลังส่งข้อความทดสอบ...');
    try {
      const res = await fetch(`https://api.telegram.org/bot${formData.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: formData.telegramChatId,
          text: `✅ <b>[TEST SUCCESS]</b>\nยินดีด้วย! ระบบการแจ้งเตือนของกลุ่ม <b>${formData.name || 'ไม่มีชื่อ'}</b> พร้อมใช้งานแล้วจาก MikrotikPanel`,
          parse_mode: 'HTML'
        })
      });
      const data = await res.json();
      if (data.ok) {
        toast.success('ส่งข้อความสำเร็จ! กรุณาเช็คใน Telegram', { id: tid });
      } else {
        throw new Error(data.description || 'Token หรือ Chat ID ไม่ถูกต้อง');
      }
    } catch (err) {
      toast.error(`ส่งไม่สำเร็จ: ${err.message}`, { id: tid });
    }
  };

  // ==========================================
  // Handlers (Manage Devices)
  // ==========================================
  const openDeviceModal = (group) => {
    setSelectedGroup(group);
    setDeviceSearchQuery("");
    
    const initialIds = allDevices.filter(d => d.groups?.some(g => g.id === group.id)).map(d => d.id);
    setOriginalAssignedIds(initialIds);
    setDraftAssignedIds(initialIds); 
    
    setAvailablePage(1);
    setAssignedPage(1);
    setIsDeviceModalOpen(true);
  };

  const toggleDraftDevice = (deviceId, action) => {
    if (action === 'add') setDraftAssignedIds(prev => [...prev, deviceId]);
    else if (action === 'remove') setDraftAssignedIds(prev => prev.filter(id => id !== deviceId));
  };

  const saveDeviceChanges = async () => {
    const devicesToAdd = draftAssignedIds.filter(id => !originalAssignedIds.includes(id));
    const devicesToRemove = originalAssignedIds.filter(id => !draftAssignedIds.includes(id));

    if (devicesToAdd.length === 0 && devicesToRemove.length === 0) {
      setIsDeviceModalOpen(false); 
      return;
    }

    const toastId = toast.loading('กำลังอัปเดตสมาชิกกลุ่ม...');
    try {
      const promises = [
        ...devicesToAdd.map(id => groupService.addDeviceToGroup(selectedGroup.id, id)),
        ...devicesToRemove.map(id => groupService.removeDeviceFromGroup(selectedGroup.id, id))
      ];
      await Promise.all(promises);
      toast.success('อัปเดตอุปกรณ์ในกลุ่มสำเร็จ!', { id: toastId });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      setIsDeviceModalOpen(false);
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการอัปเดตข้อมูล', { id: toastId });
    }
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-blue-600" /> Device Groups
          </h2>
          <p className="text-slate-500 mt-1">จัดการกลุ่มอุปกรณ์และการแจ้งเตือนผ่าน Telegram</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="ค้นหากลุ่ม..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 transition" />
          </div>
          <button onClick={openAddModal} className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition font-bold shadow-sm whitespace-nowrap">
            <Plus size={20} /> Create Group
          </button>
        </div>
      </div>

      {/* Group List */}
      {loadingGroups ? (
        <div className="p-10 text-center text-slate-400">Loading groups...</div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-10 text-center text-slate-500 bg-white border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center min-h-[300px]">
          <Users size={48} className="text-slate-300 mb-4" />
          <p className="font-bold text-lg text-slate-700">No Groups Found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map(group => (
            <div key={group.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-blue-300 transition-all hover:shadow-md flex flex-col group/card">
              
              <div className="p-5 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                <div className="flex-1 pr-4">
                  <h3 className="font-bold text-slate-800 text-lg truncate">{group.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{group.description || 'ไม่มีคำอธิบาย'}</p>
                </div>
                <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(group)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit size={16} /></button>
                  <button onClick={() => handleDeleteGroup(group)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                </div>
              </div>

              <div className="p-5 space-y-4 flex-1">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-600 flex items-center gap-1.5"><Send size={16} className={group.telegramBotToken ? "text-blue-500" : "text-slate-300"} /> Telegram</span>
                    {group.isNotifyEnabled ? <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-wider"><Bell size={12}/> Active</span> : <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider"><BellOff size={12}/> Muted</span>}
                  </div>
                  {group.telegramChatId ? (
                    <div className="text-xs font-mono text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 break-all">Chat ID: {group.telegramChatId}</div>
                  ) : (
                    <div className="text-xs text-orange-500 bg-orange-50 p-2 rounded-lg font-medium flex items-center gap-1"><ShieldAlert size={14} /> ยังไม่ได้ตั้งค่าแจ้งเตือน</div>
                  )}
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100">
                <button onClick={() => openDeviceModal(group)} className="w-full py-2.5 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-slate-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm">
                  <MonitorSmartphone size={16} /> Manage Devices ({group._count?.devices || 0})
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ✅ Modal สำหรับ Manage Devices (Side-by-Side Version) */}
      {isDeviceModalOpen && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-start shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <MonitorSmartphone className="text-blue-600" /> จัดการสมาชิกกลุ่ม: <span className="text-blue-600">{selectedGroup.name}</span>
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  เลือกอุปกรณ์จากฝั่งซ้ายเพื่อย้ายเข้ากลุ่ม (คลิกแก้ไขไปมาได้ และกด <b>บันทึกการเปลี่ยนแปลง</b> เมื่อเสร็จสิ้น)
                </p>
              </div>
              <button onClick={() => setIsDeviceModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition"><X size={20} /></button>
            </div>

            <div className="p-4 border-b border-slate-100 shrink-0 bg-white">
               <div className="relative max-w-md mx-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="ค้นหาชื่ออุปกรณ์ หรือ Circuit ID ทั้งสองฝั่ง..." 
                    value={deviceSearchQuery}
                    onChange={(e) => setDeviceSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 transition text-sm bg-slate-50"
                  />
                </div>
            </div>

            <div className="flex-1 overflow-hidden p-4 sm:p-6 bg-slate-50/50">
              {loadingDevices ? (
                <div className="text-center py-20 text-slate-400 text-sm">กำลังโหลดรายชื่ออุปกรณ์...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 h-full">
                  
                  {/* === ฝั่งซ้าย: อุปกรณ์อื่นๆ (Available) === */}
                  <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-sm text-slate-700 flex justify-between items-center shrink-0">
                      <span>อุปกรณ์อื่นๆ (ยังไม่ถูกเลือก)</span>
                      <span className="bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded-md text-xs">{availableDevices.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                      {paginatedAvailable.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl m-2">ไม่พบอุปกรณ์</div>
                      ) : (
                        paginatedAvailable.map(device => (
                          <div key={device.id} className="group flex items-center justify-between p-3 rounded-xl border bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all">
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-bold text-sm text-slate-700 truncate">{device.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">IP: {device.currentIp} {device.circuitId && `| CID: ${device.circuitId}`}</p>
                            </div>
                            <button 
                              onClick={() => toggleDraftDevice(device.id, 'add')}
                              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 opacity-0 md:opacity-100 group-hover:opacity-100 hover:bg-blue-600 hover:text-white border border-blue-100 transition-all flex items-center gap-1.5"
                            >
                              เพิ่ม <ArrowRightLeft size={12} className="hidden md:block" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    {totalAvailablePages > 1 && (
                      <div className="p-2 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between">
                        <button onClick={() => setAvailablePage(p => Math.max(1, p - 1))} disabled={availablePage === 1} className="p-1.5 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><ChevronLeft size={16} /></button>
                        <span className="text-xs font-bold text-slate-500">หน้า {availablePage} / {totalAvailablePages}</span>
                        <button onClick={() => setAvailablePage(p => Math.min(totalAvailablePages, p + 1))} disabled={availablePage === totalAvailablePages} className="p-1.5 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><ChevronRight size={16} /></button>
                      </div>
                    )}
                  </div>

                  {/* === ฝั่งขวา: อยู่ในกลุ่ม (Assigned) === */}
                  <div className="flex flex-col h-full bg-white border border-blue-200 rounded-2xl overflow-hidden shadow-sm ring-1 ring-blue-50">
                    <div className="p-3 bg-blue-50 border-b border-blue-100 font-bold text-sm text-blue-800 flex justify-between items-center shrink-0">
                      <span>สมาชิกในกลุ่ม (เลือกแล้ว)</span>
                      <span className="bg-white border border-blue-200 text-blue-600 px-2 py-0.5 rounded-md text-xs">{assignedDevices.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                      {paginatedAssigned.length === 0 ? (
                        <div className="text-center py-10 text-blue-300 text-sm border border-dashed border-blue-100 bg-blue-50/50 rounded-xl m-2">ยังไม่มีอุปกรณ์ในกลุ่มนี้</div>
                      ) : (
                        paginatedAssigned.map(device => (
                          <div key={device.id} className="group flex items-center justify-between p-3 rounded-xl border bg-white border-slate-200 hover:border-red-300 hover:shadow-sm transition-all">
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-bold text-sm text-slate-800 truncate">{device.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">IP: {device.currentIp} {device.circuitId && `| CID: ${device.circuitId}`}</p>
                            </div>
                            <button 
                              onClick={() => toggleDraftDevice(device.id, 'remove')}
                              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 bg-red-50 opacity-0 md:opacity-100 group-hover:opacity-100 hover:bg-red-500 hover:text-white border border-red-100 transition-all flex items-center gap-1.5"
                            >
                              เอาออก <X size={12} className="hidden md:block" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    {totalAssignedPages > 1 && (
                      <div className="p-2 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between">
                        <button onClick={() => setAssignedPage(p => Math.max(1, p - 1))} disabled={assignedPage === 1} className="p-1.5 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><ChevronLeft size={16} /></button>
                        <span className="text-xs font-bold text-slate-500">หน้า {assignedPage} / {totalAssignedPages}</span>
                        <button onClick={() => setAssignedPage(p => Math.min(totalAssignedPages, p + 1))} disabled={assignedPage === totalAssignedPages} className="p-1.5 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><ChevronRight size={16} /></button>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

            <div className="p-4 sm:px-6 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between">
               <button onClick={() => setIsDeviceModalOpen(false)} className="px-5 py-2 text-slate-500 font-bold text-sm hover:bg-slate-100 rounded-xl transition">
                 ยกเลิก
               </button>
               <button onClick={saveDeviceChanges} className="px-8 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-500/20 flex items-center gap-2">
                 <Save size={18} /> บันทึกการเปลี่ยนแปลง
               </button>
            </div>

          </div>
        </div>
      )}

      {/* ✅ Modal สร้างและแก้ไขกลุ่ม (โค้ดฉบับเต็ม) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 sm:p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                {isEditMode ? <Edit size={20} className="text-blue-600" /> : <Plus size={20} className="text-blue-600" />}
                {isEditMode ? 'แก้ไขข้อมูลกลุ่ม' : 'สร้างกลุ่มใหม่'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-1.5 rounded-full transition"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmitGroup}>
              <div className="p-5 sm:p-6 space-y-5">
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Group Details</h4>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">ชื่อกลุ่ม (Group Name) *</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition" placeholder="e.g. ลูกค้า A - สาขาเชียงใหม่" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">คำอธิบาย (Description)</label>
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition min-h-[80px]" placeholder="รายละเอียดเพิ่มเติม..." />
                  </div>
                </div>

                {/* ✅ ส่วนที่เพิ่มใหม่ (ผู้ดูแลกลุ่ม) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 border-t border-slate-100 pt-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">ชื่อผู้ดูแลกลุ่ม</label>
                      <input type="text" value={formData.adminName || ''} onChange={e => setFormData({...formData, adminName: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition" placeholder="เช่น ทีมงาน Network, คุณสมชาย" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">ช่องทางติดต่อ</label>
                      <input type="text" value={formData.adminContact || ''} onChange={e => setFormData({...formData, adminContact: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition" placeholder="เบอร์โทรศัพท์ หรือ Line ID" />
                    </div>
                  </div>

                <div className="pt-5 border-t border-slate-100 space-y-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-xs font-black text-blue-500 uppercase tracking-wider flex items-center gap-1.5"><Send size={14}/> Telegram Notifications</h4>
                    <label className="flex items-center cursor-pointer gap-2">
                      <span className="text-xs font-bold text-slate-600">เปิดแจ้งเตือน</span>
                      <div className="relative">
                        <input type="checkbox" className="sr-only" checked={formData.isNotifyEnabled} onChange={e => setFormData({...formData, isNotifyEnabled: e.target.checked})} />
                        <div className={`block w-10 h-6 rounded-full transition-colors ${formData.isNotifyEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                        <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.isNotifyEnabled ? 'transform translate-x-4' : ''}`}></div>
                      </div>
                    </label>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Bot Token</label>
                    <input type="password" value={formData.telegramBotToken} onChange={e => setFormData({...formData, telegramBotToken: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition" placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz" />
                    <p className="text-[11px] text-slate-400 mt-1">รับจาก @BotFather ใน Telegram</p>
                  </div>
                  
                  {/* ✅ เปลี่ยนช่อง Chat ID ให้มีปุ่ม Test อยู่ข้างๆ */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Chat ID</label>
                    <div className="flex gap-2">
                      <input type="text" value={formData.telegramChatId} onChange={e => setFormData({...formData, telegramChatId: e.target.value})} className="w-full border border-slate-300 rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition" placeholder="-1001234567890 หรือ 123456789" />
                      <button 
                        type="button" 
                        onClick={handleTestTelegram}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl transition flex items-center gap-1.5 shrink-0"
                      >
                        <PlayCircle size={16} /> ทดสอบ
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-3xl">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-200 transition text-sm font-bold">ยกเลิก</button>
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition text-sm font-bold shadow-md shadow-blue-500/30 flex items-center gap-2">
                  <CheckCircle size={18} /> {isEditMode ? 'บันทึกการแก้ไข' : 'สร้างกลุ่ม'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupManagement;