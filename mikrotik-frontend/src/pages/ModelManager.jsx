import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { useAuth } from '../context/AuthContext'; // ✅ ดึง Context เพื่อเช็คสิทธิ์
import { Server, Plus, Trash2, X, PlusCircle, Save, Archive, RotateCcw, Search, ChevronLeft, ChevronRight, Edit } from 'lucide-react';

const ModelManager = () => {
  const { user } = useAuth(); // ✅ ดึงข้อมูล User ปัจจุบัน
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'; // ✅ เช็คว่าเป็น Super Admin หรือไม่

  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showDeleted, setShowDeleted] = useState(false);
  
  // State สำหรับ Modal เพิ่ม/แก้ไข Model
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // ✅ แยกโหมด
  const [editingId, setEditingId] = useState(null); // ✅ เก็บ ID ที่กำลังแก้
  const [newModel, setNewModel] = useState({ name: '', imageUrl: '', ports: [] });

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/master/models?showDeleted=${showDeleted}`);
      setModels(res.data);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchModels(); 
    setCurrentPage(1);
    setSearchTerm('');
  }, [showDeleted]);

  const filteredModels = models.filter(model => 
    model.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredModels.length / itemsPerPage);
  const paginatedModels = filteredModels.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); 
  };

  // --- Functions สำหรับเปิด Modal ---
  const handleOpenCreate = () => {
    setIsEditMode(false);
    setEditingId(null);
    setNewModel({ name: '', imageUrl: '', ports: [] });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (model) => {
    setIsEditMode(true);
    setEditingId(model.id);
    // ดึงเฉพาะข้อมูล Port ที่จำเป็นไปแสดง
    const cleanPorts = model.ports.map(p => ({
      name: p.name,
      type: p.type,
      defaultRole: p.defaultRole || 'lan'
    }));
    setNewModel({ name: model.name, imageUrl: model.imageUrl || '', ports: cleanPorts });
    setIsModalOpen(true);
  };

  // --- Functions สำหรับ Port ---
  const handleAddPort = () => {
    setNewModel(prev => ({
      ...prev,
      ports: [...prev.ports, { name: `ether${prev.ports.length + 1}`, type: 'ETHER', defaultRole: 'lan' }]
    }));
  };

  const handleRemovePort = (index) => {
    setNewModel(prev => ({
      ...prev,
      ports: prev.ports.filter((_, i) => i !== index)
    }));
  };

  const handlePortChange = (index, field, value) => {
    setNewModel(prev => {
      const updatedPorts = [...prev.ports];
      updatedPorts[index][field] = value;
      return { ...prev, ports: updatedPorts };
    });
  };

  // --- Functions สำหรับ Save (รองรับ Create และ Update) ---
  const handleSaveModel = async () => {
    if (!newModel.name) return alert("Please enter model name");
    if (newModel.ports.length === 0) return alert("Please add at least 1 port");

    try {
      if (isEditMode) {
        // อัปเดต Model เดิม
        await apiClient.put(`/api/master/models/${editingId}`, newModel);
      } else {
        // สร้าง Model ใหม่
        await apiClient.post('/api/master/models', newModel);
        setShowDeleted(false);
      }
      setIsModalOpen(false);
      fetchModels();
    } catch (error) {
      console.error("Save error:", error);
      alert(error.response?.data?.error || "Failed to save model");
    }
  };

  // --- Functions สำหรับ ลบ และ กู้คืน ---
  const handleDeleteModel = async (id, name) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      try {
        await apiClient.delete(`/api/master/models/${id}`);
        fetchModels();
      } catch (error) {
        alert(error.response?.data?.error || "Failed to delete model");
      }
    }
  };

  const handleRestoreModel = async (id, name) => {
    if (confirm(`Are you sure you want to restore ${name}?`)) {
      try {
        await apiClient.put(`/api/master/models/${id}/restore`);
        fetchModels();
      } catch (error) {
        alert("Failed to restore model");
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Server className="text-blue-600" /> Hardware Models
          </h2>
          <p className="text-slate-500">Manage MikroTik device models and port templates</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowDeleted(!showDeleted)}
            className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition font-medium ${
              showDeleted 
                ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Archive size={20} />
            {showDeleted ? 'View Active Models' : 'Deleted Models'}
          </button>

          <button 
            onClick={handleOpenCreate}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition font-medium shadow-sm"
          >
            <Plus size={20} /> Add New Model
          </button>
        </div>
      </div>

      {/* Toolbar: Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Search model name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
      </div>

      {/* Models Grid */}
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
              <div key={model.id} className={`bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition group ${showDeleted ? 'border-red-100 opacity-80 grayscale' : 'border-slate-200'}`}>
                
                <div className={`p-4 flex justify-between items-start border-b ${showDeleted ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="font-bold text-slate-800 flex items-center flex-wrap gap-2">
                    {model.name}
                    {model._count?.configs > 0 && (
                       <span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                         🔥 {model._count.configs} Used
                       </span>
                    )}
                    {showDeleted && (
                       <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                         Deleted
                       </span>
                    )}
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-1">
                    {!showDeleted && isSuperAdmin && (
                      <button 
                        onClick={() => handleOpenEdit(model)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg opacity-0 group-hover:opacity-100 transition"
                        title="Edit Model"
                      >
                        <Edit size={16} />
                      </button>
                    )}

                    {showDeleted ? (
                      <button 
                        onClick={() => handleRestoreModel(model.id, model.name)}
                        className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg opacity-0 group-hover:opacity-100 transition"
                        title="Restore Model"
                      >
                        <RotateCcw size={16} />
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleDeleteModel(model.id, model.name)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition"
                        title="Delete Model"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="p-4 flex gap-4 items-center">
                  {model.imageUrl ? (
                    <img src={model.imageUrl} alt={model.name} className="w-20 object-contain" />
                  ) : (
                    <div className="w-20 h-16 bg-slate-100 rounded flex items-center justify-center text-slate-400"><Server size={24}/></div>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-slate-600 mb-1">Ports ({model.ports.length})</div>
                    <div className="flex flex-wrap gap-1">
                      {model.ports.map((p, i) => (
                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600" title={`Type: ${p.type}`}>
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
              <div className="text-sm text-slate-500">
                Showing <span className="font-medium text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium text-slate-700">{Math.min(currentPage * itemsPerPage, filteredModels.length)}</span> of <span className="font-medium text-slate-700">{filteredModels.length}</span> models
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-medium text-slate-600 px-3 py-1 bg-slate-50 rounded-md border border-slate-100">
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* --- Add / Edit Model Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg flex items-center gap-2">
                {isEditMode ? <Edit className="text-blue-600" size={20} /> : <PlusCircle className="text-green-600" size={20} />}
                {isEditMode ? 'Edit Hardware Model' : 'Create New Hardware Model'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Model Name *</label>
                  <input type="text" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g. RB5009UG+S+IN"
                    value={newModel.name} onChange={(e) => setNewModel({...newModel, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Image URL</label>
                  <input type="text" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="https://..."
                    value={newModel.imageUrl} onChange={(e) => setNewModel({...newModel, imageUrl: e.target.value})} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-bold text-slate-700">Port Templates</label>
                  <button onClick={handleAddPort} className="text-sm text-blue-600 flex items-center gap-1 hover:text-blue-800 font-medium bg-blue-50 px-2 py-1 rounded">
                    <PlusCircle size={16} /> Add Port
                  </button>
                </div>
                
                {newModel.ports.length === 0 ? (
                  <div className="text-center p-6 text-sm text-slate-400 border border-dashed rounded-lg">No ports added yet.</div>
                ) : (
                  <div className="space-y-2">
                    
                    <div className="flex gap-2 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      <div className="flex-1">Port Name (in RouterOS)</div>
                      <div className="w-28">Hardware Type</div>
                      <div className="w-24">Default Role</div>
                      <div className="w-8"></div>
                    </div>
                    
                    {newModel.ports.map((port, index) => (
                      <div key={index} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                        <input type="text" className="flex-1 p-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. ether1"
                          value={port.name} onChange={(e) => handlePortChange(index, 'name', e.target.value)} />
                        
                        <select className="w-28 p-1.5 border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          value={port.type} onChange={(e) => handlePortChange(index, 'type', e.target.value)}>
                          <option value="ETHER">ETHER</option>
                          <option value="SFP">SFP</option>
                          <option value="WLAN">WLAN</option>
                        </select>
                        
                        <select className="w-24 p-1.5 border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                          value={port.defaultRole} onChange={(e) => handlePortChange(index, 'defaultRole', e.target.value)}>
                          <option value="wan">WAN</option>
                          <option value="lan">LAN</option>
                        </select>
                        
                        <button onClick={() => handleRemovePort(index)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition">
                          <Trash2 size={18}/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
              <button onClick={handleSaveModel} className="px-4 py-2 bg-blue-600 text-white flex items-center gap-2 rounded-lg hover:bg-blue-700">
                <Save size={18} /> {isEditMode ? 'Save Changes' : 'Save Model'}
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelManager;