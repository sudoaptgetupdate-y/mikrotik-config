import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { Server, Plus, Trash2, X, PlusCircle, Save } from 'lucide-react';

const ModelManager = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State สำหรับ Modal เพิ่ม Model
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newModel, setNewModel] = useState({ name: '', imageUrl: '', ports: [] });

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/master/models');
      setModels(res.data);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchModels(); }, []);

  // --- Functions สำหรับ Form เพิ่ม Model ---
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

  const handleSaveModel = async () => {
    if (!newModel.name) return alert("Please enter model name");
    if (newModel.ports.length === 0) return alert("Please add at least 1 port");

    try {
      await apiClient.post('/api/master/models', newModel);
      setIsModalOpen(false);
      setNewModel({ name: '', imageUrl: '', ports: [] }); // Reset form
      fetchModels(); // Refresh table
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save model");
    }
  };

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

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Server className="text-blue-600" /> Hardware Models
          </h2>
          <p className="text-slate-500">Manage MikroTik device models and port templates</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus size={20} /> Add New Model
        </button>
      </div>

      {/* Models Grid */}
      {loading ? (
        <div className="p-10 text-center text-slate-400">Loading models...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map(model => (
            <div key={model.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition group">
              <div className="p-4 flex justify-between items-start border-b border-slate-100 bg-slate-50">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  {model.name}
                  {/* แสดงป้าย Popular ถ้ารุ่นนี้ถูกใช้งานบ่อย */}
                  {model._count?.configs > 0 && (
                     <span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-0.5 rounded-full font-bold">
                       🔥 {model._count.configs} Used
                     </span>
                  )}
                </div>
                <button 
                  onClick={() => handleDeleteModel(model.id, model.name)}
                  className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                  title="Delete Model"
                >
                  <Trash2 size={18} />
                </button>
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
      )}

      {/* --- Add Model Modal --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg">Create New Hardware Model</h3>
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
                    
                    {/* ✅ อัปเดตส่วนหัวตารางตรงนี้ ให้เข้าใจง่ายขึ้น */}
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
                <Save size={18} /> Save Model
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelManager;