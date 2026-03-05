import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Server, Plus, Archive, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

import { modelService } from '../../services/modelService';

// นำเข้า Components ย่อย
import ModelCard from './components/ModelCard';
import ModelFormModal from './components/ModelFormModal';


const ModelManager = () => {
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
  const itemsPerPage = 9;

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
    onError: () => toast.error("ดึงข้อมูล Model ไม่สำเร็จ")
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
    if (!newModel.name) return toast.error("Please enter model name");
    if (newModel.ports.length === 0) return toast.error("Please add at least 1 port");

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
      loading: 'Saving model...',
      success: isEditMode ? 'Model updated successfully!' : 'Model created successfully!',
      error: (err) => err.response?.data?.error || err.response?.data?.message || "Failed to save model"
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
      title: 'ยืนยันการลบ Model?',
      text: `คุณต้องการลบ "${name}" ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก',
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
        loading: 'Deleting...',
        success: `Deleted ${name} successfully!`,
        error: (err) => err.response?.data?.error || "Failed to delete model"
      });
      try {
        await deletePromise;
        queryClient.invalidateQueries({ queryKey: ['models'] });
      } catch (error) {}
    }
  };

  const handleRestoreModel = async (id, name) => {
    const result = await Swal.fire({
      title: 'ยืนยันการกู้คืน?',
      text: `คุณต้องการกู้คืน Model "${name}" ใช่หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, กู้คืนเลย!',
      cancelButtonText: 'ยกเลิก',
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
        loading: 'Restoring...',
        success: `Restored ${name} successfully!`,
        error: "Failed to restore model"
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
  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-500">
      
      {/* 1. Page Header (แบบ Classic & Clean) */}
      <div className="space-y-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm font-medium text-slate-500 gap-2">
          <a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-400">Device Management</span>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-800">Hardware Models</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Server className="text-blue-600" size={28} /> 
              Hardware Models
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              จัดการรุ่นอุปกรณ์ MikroTik และเทมเพลตพอร์ต (Port Templates)
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => {
                setShowDeleted(!showDeleted);
                setCurrentPage(1);
              }}
              className={`px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all font-semibold text-sm border justify-center ${showDeleted ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm'}`}
            >
              <Archive size={18} strokeWidth={2.5} /> {showDeleted ? 'View Active Models' : 'Deleted Models'}
            </button>
            <button 
              onClick={handleOpenCreate} 
              className="shrink-0 bg-blue-50 text-blue-700 px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-100 transition-all font-semibold text-sm border border-blue-100"
            >
              <Plus size={18} strokeWidth={2.5} /> 
              <span>Add New Model</span>
            </button>
          </div>
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
            placeholder="ค้นหารุ่นอุปกรณ์ (Model Name)..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm" 
            value={searchTerm} 
            onChange={handleSearchChange} 
          />
        </div>
        <div className="text-sm text-slate-500 font-medium px-2">
          พบทั้งหมด <span className="text-slate-800 font-bold">{filteredModels.length}</span> รุ่น
        </div>
      </div>

      {/* 3. Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p>กำลังโหลดข้อมูล Models...</p>
        </div>
      ) : filteredModels.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center min-h-[400px] text-center p-8 shadow-sm">
          <div className="bg-slate-50 p-4 rounded-full mb-4">
            <Server size={48} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">ไม่พบข้อมูลรุ่นอุปกรณ์</h3>
          <p className="text-slate-500 text-sm max-w-sm mb-6">
            {searchTerm ? "ไม่พบผลลัพธ์ที่ตรงกับการค้นหา" : (showDeleted ? "ไม่มีข้อมูลรุ่นอุปกรณ์ที่ถูกลบ" : "ยังไม่มีข้อมูลรุ่นอุปกรณ์ในระบบ กรุณาเพิ่มรุ่นใหม่เพื่อเริ่มต้น")}
          </p>
          {!searchTerm && !showDeleted && (
            <button 
              onClick={handleOpenCreate} 
              className="text-blue-600 font-medium text-sm hover:underline flex items-center gap-1"
            >
              <Plus size={16} /> สร้างรุ่นอุปกรณ์ใหม่
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

          {/* 4. Pagination Controls (Tinted Glass) */}
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