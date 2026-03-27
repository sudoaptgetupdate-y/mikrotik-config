import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Server, Plus, Archive, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

import { modelService } from '../../services/modelService';

// นำเข้า Components ย่อย
import ModelCard from './components/ModelCard';
import ModelFormModal from './components/ModelFormModal';
import Pagination from '../../components/Pagination';


const ModelManager = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const queryClient = useQueryClient();

  // ==========================================
  // States
  // ==========================================
  const [showDeleted, setShowDeleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  // ✅ ปรับลดจำนวนการแสดงผลต่อหน้าให้พอดีกับหน้าจอ (2 แถว แถวละ 3)
  const itemsPerPage = 6;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newModel, setNewModel] = useState({ name: '', imageUrl: '', ports: [] });

  // ==========================================
  // React Query Fetching
  // ==========================================
  const { data: models = [], isLoading: loading } = useQuery({
    queryKey: ['models', showDeleted],
    queryFn: () => modelService.getModels(showDeleted),
    onError: () => toast.error(t('models.fetch_error', "ดึงข้อมูล Model ไม่สำเร็จ"))
  });

  // ==========================================
  // Filtering & Pagination
  // ==========================================
  const filteredModels = models.filter(model => 
    model.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.ceil(filteredModels.length / itemsPerPage) || 1;
  const paginatedModels = filteredModels.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ==========================================
  // Handlers (Actions)
  // ==========================================
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); 
  };

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setEditingId(null);
    setNewModel({ name: '', imageUrl: '', ports: [] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (model) => {
    setIsEditMode(true);
    setEditingId(model.id);
    const cleanPorts = model.ports.map(p => ({
      name: p.name, type: p.type, defaultRole: p.defaultRole || 'lan'
    }));
    setNewModel({ name: model.name, imageUrl: model.imageUrl || '', ports: cleanPorts });
    setIsModalOpen(true);
  };

  const handleSaveModel = async () => {
    if (!newModel.name) return toast.error(t('models.form.error_name', "Please enter model name"));
    if (newModel.ports.length === 0) return toast.error(t('models.form.error_ports', "Please add at least 1 port"));

    const payloadToSend = {
      name: newModel.name,
      imageUrl: newModel.imageUrl.trim() === '' ? null : newModel.imageUrl, 
      ports: newModel.ports.map(p => ({
        name: p.name,
        type: p.type, 
        defaultRole: p.defaultRole.toUpperCase() 
      }))
    };

    const savePromise = isEditMode 
      ? modelService.updateModel(editingId, payloadToSend)
      : modelService.createModel(payloadToSend);

    toast.promise(savePromise, {
      loading: t('common.saving', 'Saving model...'),
      success: isEditMode ? t('models.update_success', 'Model updated successfully!') : t('models.create_success', 'Model created successfully!'),
      error: (err) => err.response?.data?.error || err.response?.data?.message || t('models.save_error', "Failed to save model")
    });

    try {
      await savePromise;
      if (!isEditMode) setShowDeleted(false);
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['models'] });
    } catch (error) {
      console.error("Save Error:", error.response?.data); 
    }
  };

  const handleDeleteModel = async (id, name) => {
    const result = await Swal.fire({
      title: t('models.delete_confirm.title', 'ยืนยันการลบ Model?'),
      text: t('models.delete_confirm.text', { name }, `คุณต้องการลบ "${name}" ใช่หรือไม่?`),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('models.delete_confirm.confirm', 'ใช่, ลบเลย!'),
      cancelButtonText: t('common.cancel', 'ยกเลิก'),
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl p-6 border border-slate-100 shadow-2xl',
        title: 'text-xl font-bold text-slate-800',
        htmlContainer: 'text-sm text-slate-500 font-medium mt-2',
        actions: 'flex gap-3 mt-6 w-full justify-center',
        confirmButton: 'bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-bold transition-all'
      }
    });

    if (result.isConfirmed) {
      const deletePromise = modelService.deleteModel(id);
      toast.promise(deletePromise, {
        loading: t('common.deleting', 'Deleting...'),
        success: t('models.delete_success', { name }, `Deleted ${name} successfully!`),
        error: (err) => err.response?.data?.error || t('models.delete_error', "Failed to delete model")
      });
      try {
        await deletePromise;
        queryClient.invalidateQueries({ queryKey: ['models'] });
      } catch (error) {}
    }
  };

  const handleRestoreModel = async (id, name) => {
    const result = await Swal.fire({
      title: t('models.restore_confirm.title', 'ยืนยันการกู้คืน?'),
      text: t('models.restore_confirm.text', { name }, `คุณต้องการกู้คืน Model "${name}" ใช่หรือไม่?`),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: t('models.restore_confirm.confirm', 'ใช่, กู้คืนเลย!'),
      cancelButtonText: t('common.cancel', 'ยกเลิก'),
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl p-6 border border-slate-100 shadow-2xl',
        title: 'text-xl font-bold text-slate-800',
        htmlContainer: 'text-sm text-slate-500 font-medium mt-2',
        actions: 'flex gap-3 mt-6 w-full justify-center',
        confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-bold transition-all'
      }
    });

    if (result.isConfirmed) {
      const restorePromise = modelService.restoreModel(id);
      toast.promise(restorePromise, {
        loading: t('common.restoring', 'Restoring...'),
        success: t('models.restore_success', { name }, `Restored ${name} successfully!`),
        error: t('models.restore_error', "Failed to restore model")
      });
      try {
        await restorePromise;
        queryClient.invalidateQueries({ queryKey: ['models'] });
      } catch (error) {}
    }
  };

  // ==========================================
  // Render
  // ==========================================
  // 🟢 เปลี่ยนมาใช้โครงสร้างที่สมดุลกับ Dashboard (ลบ max-w-6xl และ Margin ที่ซ้ำซ้อนออก)
  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* 1. Page Header Section (Island Card) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Server className="text-blue-600" size={28} /> 
            {t('models.title', 'Hardware Models')}
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium italic">
            {t('models.subtitle', 'จัดการรุ่นอุปกรณ์ MikroTik และเทมเพลตพอร์ต (Port Templates)')}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button 
            onClick={() => {
              setShowDeleted(!showDeleted);
              setCurrentPage(1);
            }}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all font-bold text-sm border justify-center ${showDeleted ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm'}`}
          >
            <Archive size={18} strokeWidth={2.5} /> {showDeleted ? t('models.view_active', 'View Active') : t('models.view_deleted', 'Deleted Models')}
          </button>
          <button 
            onClick={handleOpenCreate} 
            className="shrink-0 bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all font-bold text-sm shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} strokeWidth={2.5} /> 
            <span>{t('models.add_button', 'Add New Model')}</span>
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
            placeholder={t('models.search_placeholder', "ค้นหารุ่นอุปกรณ์ (Model Name)...")} 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm" 
            value={searchTerm} 
            onChange={handleSearchChange} 
          />
        </div>
        <div className="text-sm text-slate-500 font-medium px-2">
          {t('models.found_total', { count: filteredModels.length }, `พบทั้งหมด ${filteredModels.length} รุ่น`)}
        </div>
      </div>

      {/* 3. Content Area */}
      {loading ? (
        // 🟢 เพิ่ม Responsive Min-Height ตอน Loading
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 min-h-[450px] md:min-h-[600px] xl:min-h-[700px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p>{t('models.loading', 'กำลังโหลดข้อมูล Models...')}</p>
        </div>
      ) : filteredModels.length === 0 ? (
        // 🟢 เพิ่ม Responsive Min-Height ตอนไม่พบข้อมูล
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center min-h-[450px] md:min-h-[600px] xl:min-h-[700px] text-center p-8 shadow-sm">
          <div className="bg-slate-50 p-4 rounded-full mb-4">
            <Server size={48} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">{t('models.no_models', 'ไม่พบข้อมูลรุ่นอุปกรณ์')}</h3>
          <p className="text-slate-500 text-sm max-w-sm mb-6">
            {searchTerm 
              ? t('models.no_models_desc.search', 'ไม่พบผลลัพธ์ที่ตรงกับการค้นหา') 
              : (showDeleted 
                ? t('models.no_models_desc.deleted', 'ไม่มีข้อมูลรุ่นอุปกรณ์ที่ถูกลบ') 
                : t('models.no_models_desc.empty', 'ยังไม่มีข้อมูลรุ่นอุปกรณ์ในระบบ กรุณาเพิ่มรุ่นใหม่เพื่อเริ่มต้น'))}
          </p>
          {!searchTerm && !showDeleted && (
            <button 
              onClick={handleOpenCreate} 
              className="text-blue-600 font-medium text-sm hover:underline flex items-center gap-1"
            >
              <Plus size={16} /> {t('models.add_button', 'สร้างรุ่นอุปกรณ์ใหม่')}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* 🟢 ครอบ Content ด้วย Responsive Min-Height */}
          <div className="min-h-[450px] md:min-h-[600px] xl:min-h-[700px]">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedModels.map(model => (
                <ModelCard 
                  key={model.id}
                  model={model}
                  showDeleted={showDeleted}
                  isSuperAdmin={isSuperAdmin}
                  onEdit={handleOpenEdit}
                  onDelete={handleDeleteModel}
                  onRestore={handleRestoreModel}
                />
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

      {/* Model Form Modal */}
      <ModelFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isEditMode={isEditMode}
        newModel={newModel}
        setNewModel={setNewModel}
        onSave={handleSaveModel}
      />
    </div>
  );
};

export default ModelManager;