import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Router, CheckCircle, MapPin, Search, Star, ChevronLeft, ChevronRight, FolderKanban, Bell, AlertCircle, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { groupService } from '../../../services/groupService'; 
import apiClient from '../../../utils/apiClient';

const Step1_ModelSelect = ({ 
  models, 
  selectedModel, 
  setSelectedModel,
  deviceMeta,     
  setDeviceMeta,
  mode,
  deviceId // ส่ง id มาด้วยถ้าอยู่ในโหมด Edit
}) => {
  // === State สำหรับการตรวจสอบข้อมูลซ้ำ (Real-time Validation) ===
  const [errors, setErrors] = useState({ name: '', circuitId: '' });
  const [isValidating, setIsValidating] = useState({ name: false, circuitId: false });

  // ฟังก์ชันตรวจสอบข้อมูลซ้ำจาก API
  const checkDuplicate = async (field, value) => {
    // 🎯 [NEW] ถ้าเป็นโหมด standalone (Config Builder) ไม่ต้องเช็คซ้ำ
    if (mode === 'standalone') return;

    if (!value || value.trim() === "") {
      setErrors(prev => ({ ...prev, [field]: '' }));
      return;
    }

    setIsValidating(prev => ({ ...prev, [field]: true }));
    try {
      // เรียก API ตรวจสอบ
      const params = { [field]: value };
      if (deviceId) params.excludeId = deviceId; // ถ้าเป็นโหมด Edit ไม่ต้องเช็คซ้ำกับตัวเอง

      const { data } = await apiClient.get('/api/devices/check-duplicate', { params });
      
      if (field === 'name' && data.nameExists) {
        setErrors(prev => ({ ...prev, name: 'ชื่ออุปกรณ์นี้ถูกใช้งานแล้วในระบบ' }));
      } else if (field === 'circuitId' && data.circuitExists) {
        setErrors(prev => ({ ...prev, circuitId: 'รหัสวงจรนี้ถูกใช้งานแล้วในระบบ' }));
      } else {
        setErrors(prev => ({ ...prev, [field]: '' }));
      }
    } catch (err) {
      console.error("Validation error:", err);
    } finally {
      setIsValidating(prev => ({ ...prev, [field]: false }));
    }
  };

  // === State สำหรับค้นหาและแบ่งหน้า (Models) ===
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3; 

  // === State สำหรับค้นหาและแบ่งหน้า (Groups) ===
  const [groupSearchTerm, setGroupSearchTerm] = useState("");
  const [groupCurrentPage, setGroupCurrentPage] = useState(1);
  const groupsPerPage = 6; // จำกัดให้แสดงแค่ 6 กลุ่มต่อ 1 หน้า

  // ✅ ดึงรายชื่อกลุ่มทั้งหมด
  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: groupService.getGroups
  });

  // 🌟 เพิ่มระบบ Auto-Select กลุ่ม "All Devices" เป็นค่า Default
  const hasAutoSelected = useRef(false);

  useEffect(() => {
    // เมื่อโหลด Groups เสร็จ และยังไม่เคยรัน Auto-select ในรอบนี้
    if (groups.length > 0 && !hasAutoSelected.current) {
      hasAutoSelected.current = true; // ล็อกไว้ไม่ให้มันทำงานซ้ำ (ถ้า User ตั้งใจติ๊กออกเอง มันจะได้ไม่บังคับติ๊กใหม่)
      
      // ถ้าเพิ่งเข้ามาสร้างใหม่ (ยังไม่มี groupIds เลย)
      if (!deviceMeta.groupIds || deviceMeta.groupIds.length === 0) {
        // ค้นหากลุ่มที่ชื่อ 'All Devices' (แปลงตัวเล็กเผื่อการพิมพ์อักษรเล็ก/ใหญ่ไม่ตรงกันตอน Seed)
        const defaultGroup = groups.find(g => g.name.toLowerCase() === 'all devices');
        
        if (defaultGroup) {
          // สั่งอัปเดต state ให้เลือกกลุ่มนี้อัตโนมัติ
          setDeviceMeta(prev => ({ ...prev, groupIds: [defaultGroup.id] }));
        }
      }
    }
  }, [groups, deviceMeta.groupIds, setDeviceMeta]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDeviceMeta(prev => ({ ...prev, [name]: value }));
    // เคลียร์ Error ทันทีที่เริ่มพิมพ์ใหม่
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    checkDuplicate(name, value);
  };

  const toggleGroup = (groupId) => {
    setDeviceMeta(prev => {
      const currentGroups = prev.groupIds || [];
      if (currentGroups.includes(groupId)) {
        return { ...prev, groupIds: currentGroups.filter(id => id !== groupId) }; 
      } else {
        return { ...prev, groupIds: [...currentGroups, groupId] }; 
      }
    });
  };

  // 🌟 จดจำ Model เดิมที่ถูกเลือกไว้ตอนโหลดหน้า Edit เพื่อนำไปดันขึ้นบนสุด
  // (ใช้ useRef เพื่อไม่ให้รายการกระโดดสลับที่ หากเรากดเลือก Model อื่นระหว่างใช้งาน)
  const initialModelIdRef = useRef(selectedModel?.id);

  // === Logic ของ Model ===
  const processedModels = useMemo(() => {
    return [...models]
      .filter(model => model.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        // 🟢 1. ดัน Model เดิมที่ใช้งานอยู่ (โหมด Edit) ขึ้นบนสุด
        if (initialModelIdRef.current) {
          if (a.id === initialModelIdRef.current && b.id !== initialModelIdRef.current) return -1;
          if (b.id === initialModelIdRef.current && a.id !== initialModelIdRef.current) return 1;
        }
        
        // 🟢 2. ที่เหลือให้เรียงตามความ Popular (ใช้งานบ่อยสุด)
        const countA = a._count?.configs || 0;
        const countB = b._count?.configs || 0;
        return countB - countA; 
      });
  }, [models, searchTerm]); // ❌ ไม่ใส่ selectedModel ใน Array นี้ เพื่อป้องกันไม่ให้รายการสลับตำแหน่งเวลา User คลิกเลือก Model ใหม่

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);
  const totalPages = Math.ceil(processedModels.length / itemsPerPage);
  const paginatedModels = processedModels.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // === Logic ของ Group ===
  const processedGroups = useMemo(() => {
    return [...groups] // แตก Array ใหม่เพื่อไม่ให้กระทบข้อมูลต้นฉบับ
      .filter(g => g.name.toLowerCase().includes(groupSearchTerm.toLowerCase()))
      .sort((a, b) => {
        // 1. เช็คว่าใครคือกลุ่ม All Devices
        const isA_All = a.name.toLowerCase() === 'all devices';
        const isB_All = b.name.toLowerCase() === 'all devices';
        
        if (isA_All && !isB_All) return -1; // ดัน A (All Devices) ขึ้นบนสุด
        if (!isA_All && isB_All) return 1;  // ดัน B (All Devices) ขึ้นบนสุด
        
        // 2. กลุ่มที่เหลือ ให้เรียงตาม ID ล่าสุด (สร้างใหม่สุดขึ้นก่อน)
        // ถ้าต้องการให้เก่าสุดขึ้นก่อน ให้สลับเป็น a.id - b.id
        return b.id - a.id; 
      });
  }, [groups, groupSearchTerm]);

  useEffect(() => { setGroupCurrentPage(1); }, [groupSearchTerm]);
  const totalGroupPages = Math.ceil(processedGroups.length / groupsPerPage);
  const paginatedGroups = processedGroups.slice((groupCurrentPage - 1) * groupsPerPage, groupCurrentPage * groupsPerPage);

  return (
    <div className="animate-fade-in space-y-8">
      
      {/* --- ส่วนที่ 1: ข้อมูลเบื้องต้น (Device Info) --- */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
            <MapPin size={16} /> Device Information {mode === 'standalone' && '(For Identification)'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* --- Name Input --- */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Site Name / Device Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  name="name" 
                  value={deviceMeta.name} 
                  onChange={handleChange} 
                  onBlur={handleBlur}
                  placeholder="EngineerOffice" 
                  className={`w-full px-4 py-2 rounded-lg border outline-none transition ${errors.name ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'}`} 
                />
                {isValidating.name && <Loader2 size={16} className="absolute right-3 top-3 animate-spin text-slate-400" />}
              </div>
              {errors.name && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1 font-medium animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={12} /> {errors.name}
                </p>
              )}
            </div>

            {/* --- Circuit ID Input --- */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Circuit ID / User Ref <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  name="circuitId" 
                  value={deviceMeta.circuitId} 
                  onChange={handleChange} 
                  onBlur={handleBlur}
                  placeholder="7534j7572" 
                  className={`w-full px-4 py-2 rounded-lg border outline-none transition ${errors.circuitId ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'}`} 
                />
                {isValidating.circuitId && <Loader2 size={16} className="absolute right-3 top-3 animate-spin text-slate-400" />}
              </div>
              {errors.circuitId && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1 font-medium animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={12} /> {errors.circuitId}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* --- Section: เลือกกลุ่มอุปกรณ์ --- */}
        {mode !== 'standalone' && (
          <div className="pt-6 border-t border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FolderKanban size={18} className="text-blue-600" /> Assign to Groups (Optional)
                </h3>
                <p className="text-xs text-slate-500 mt-1">เลือกกลุ่มเพื่อรับแจ้งเตือน Telegram (เลือกได้หลายกลุ่ม)</p>
              </div>
              
              {/* ✅ กล่องค้นหากลุ่ม */}
              <div className="relative w-full md:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="ค้นหาชื่อกลุ่ม..." 
                  value={groupSearchTerm}
                  onChange={(e) => setGroupSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200 transition" 
                />
              </div>
            </div>

            {isLoadingGroups ? (
              <div className="text-sm text-slate-400 p-4 bg-white rounded-xl border border-slate-200 text-center animate-pulse">กำลังโหลดรายชื่อกลุ่ม...</div>
            ) : groups.length === 0 ? (
              <div className="text-sm text-orange-500 p-4 bg-orange-50 rounded-xl flex items-center gap-2 font-medium border border-orange-100"><Bell size={16} /> ยังไม่มีกลุ่มอุปกรณ์ในระบบ</div>
            ) : (
              <div className="space-y-4">
                {processedGroups.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">ไม่พบกลุ่มที่ค้นหา</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {paginatedGroups.map(group => {
                      const isSelected = deviceMeta.groupIds?.includes(group.id);
                      return (
                        <div key={group.id} onClick={() => toggleGroup(group.id)} className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-3 ${isSelected ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'}`}>
                          <div className={`mt-0.5 shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600' : 'border-2 border-slate-300 bg-white'}`}>
                            {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate transition-colors ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>{group.name}</p>
                            {group.isNotifyEnabled && group.telegramBotToken ? (
                              <p className="text-[10px] font-bold text-emerald-600 mt-0.5 flex items-center gap-1"><Bell size={10} /> Telegram Active</p>
                            ) : (
                              <p className="text-[10px] text-slate-400 mt-0.5">ไม่มีแจ้งเตือน</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ✅ Pagination สำหรับ Group */}
                {totalGroupPages > 1 && (
                  <div className="flex justify-end items-center gap-3 pt-2">
                    <button onClick={() => setGroupCurrentPage(p => Math.max(1, p - 1))} disabled={groupCurrentPage === 1} className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition"><ChevronLeft size={16} /></button>
                    <span className="text-xs font-bold text-slate-500">Page {groupCurrentPage} of {totalGroupPages}</span>
                    <button onClick={() => setGroupCurrentPage(p => Math.min(totalGroupPages, p + 1))} disabled={groupCurrentPage === totalGroupPages} className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition"><ChevronRight size={16} /></button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- ส่วนที่ 2: เลือก Model --- */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Router className="text-blue-600" /> Select Router Model
          </h2>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search model..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 transition" />
          </div>
        </div>

        {processedModels.length === 0 ? (
          <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300"><Router size={40} className="mx-auto mb-2 opacity-50" /><p>No models found matching "{searchTerm}"</p></div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {paginatedModels.map((model, index) => {
                const usageCount = model._count?.configs || 0;
                const isPopular = currentPage === 1 && index === 0 && usageCount > 0;
                return (
                  <div key={model.id} onClick={() => setSelectedModel(model)} className={`cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-lg relative overflow-hidden group ${selectedModel?.id === model.id ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:border-blue-300 bg-white'}`}>
                    {isPopular && !searchTerm && (<div className="absolute top-0 left-0 bg-orange-500 text-white text-[10px] px-2 py-1 rounded-br-lg z-10 font-bold flex items-center gap-1"><Star size={10} fill="currentColor" /> POPULAR</div>)}
                    {selectedModel?.id === model.id && (<div className="absolute top-2 right-2 text-blue-600 animate-in zoom-in duration-200"><CheckCircle size={22} fill="white" /></div>)}
                    <div className="aspect-video bg-white rounded-lg mb-4 flex items-center justify-center p-2 border border-slate-100 group-hover:border-blue-100 transition-colors">
                      {model.imageUrl ? (<img src={model.imageUrl} alt={model.name} className="max-h-full object-contain" />) : <Router size={48} className="text-slate-300" />}
                    </div>
                    <div className="flex justify-between items-start">
                      <div><h3 className="font-bold text-lg text-slate-800">{model.name}</h3><p className="text-xs text-slate-400">{model.ports?.length || 0} Interfaces</p></div>
                      {usageCount > 0 && (<span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md" title="Total setups created">Used {usageCount}x</span>)}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {model.ports?.slice(0, 5).map(p => (<span key={p.id} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase border border-slate-200">{p.name}</span>))}
                      {(model.ports?.length > 5) && <span className="text-[10px] text-slate-300">...</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 pt-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"><ChevronLeft size={20} /></button>
                <span className="text-sm font-medium text-slate-600 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-200">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"><ChevronRight size={20} /></button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Step1_ModelSelect;