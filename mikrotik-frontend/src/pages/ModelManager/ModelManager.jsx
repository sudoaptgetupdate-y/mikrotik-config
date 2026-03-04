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
  const itemsPerPage = 12;

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

    // 🔴 1. สร้าง Payload ใหม่เพื่อจัดฟอร์แมตข้อมูลก่อนส่ง
    const payloadToSend = {
      name: newModel.name,
      // ถ้าไม่ได้กรอกรูป ให้ส่งเป็น null หรือ undefined แทนค่าว่าง ("")
      imageUrl: newModel.imageUrl.trim() === '' ? null : newModel.imageUrl, 
      
      // แปลงข้อมูล Port ให้ตรงกับที่ Backend ต้องการ
      ports: newModel.ports.map(p => ({
        name: p.name,
        type: p.type, // เช่น 'ETHER', 'SFP'
        defaultRole: p.defaultRole.toUpperCase() // 🔴 ลองแปลงเป็นตัวใหญ่ 'LAN', 'WAN' เผื่อ Backend บังคับ
      }))
    };

    // 🔴 2. เปลี่ยนมาส่ง payloadToSend แทน newModel
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
      console.error("Save Error:", error.response?.data); // พิมพ์ Error ลง Console เพื่อให้เราดูง่ายๆ
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Server className="text-blue-600" /> Hardware Models
          </h2>
          <p className="text-slate-500">Manage MikroTik device models and port templates</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => {
              setShowDeleted(!showDeleted);
              setCurrentPage(1);
            }}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition font-medium w-full md:w-auto justify-center ${showDeleted ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <Archive size={20} /> {showDeleted ? 'View Active Models' : 'Deleted Models'}
          </button>
          <button onClick={handleOpenCreate} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition font-medium shadow-sm w-full md:w-auto justify-center">
            <Plus size={20} /> Add New Model
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Search model name..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 transition" value={searchTerm} onChange={handleSearchChange} />
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-slate-400">Loading models...</div>
      ) : filteredModels.length === 0 ? (
        <div className="p-10 text-center text-slate-400 border border-dashed border-slate-300 rounded-xl bg-slate-50">
           {searchTerm ? "No models match your search." : (showDeleted ? "No deleted models found." : "No models found. Create a new one!")}
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

          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
              <div className="text-sm text-slate-500">Showing <span className="font-medium text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-slate-700">{Math.min(currentPage * itemsPerPage, filteredModels.length)}</span> of <span className="font-medium text-slate-700">{filteredModels.length}</span> models</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"><ChevronLeft size={18} /></button>
                <span className="text-sm font-medium text-slate-600 px-3 py-1 bg-slate-50 rounded-md border border-slate-100">Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"><ChevronRight size={18} /></button>
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