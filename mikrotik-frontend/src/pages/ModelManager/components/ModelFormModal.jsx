import React from 'react';
import { X, PlusCircle, Save, Edit, Trash2 } from 'lucide-react';

const ModelFormModal = ({ 
  isOpen, 
  onClose, 
  isEditMode, 
  newModel, 
  setNewModel, 
  onSave 
}) => {
  if (!isOpen) return null;

  const handleAddPort = () => {
    setNewModel(prev => ({
      ...prev,
      ports: [...prev.ports, { name: `ether${prev.ports.length + 1}`, type: 'ETHER', defaultRole: 'lan' }]
    }));
  };

  const handleRemovePort = (index) => {
    setNewModel(prev => ({ ...prev, ports: prev.ports.filter((_, i) => i !== index) }));
  };

  const handlePortChange = (index, field, value) => {
    setNewModel(prev => {
      const updatedPorts = [...prev.ports];
      updatedPorts[index][field] = value;
      return { ...prev, ports: updatedPorts };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      {/* 🔴 ตรงนี้คือ div ที่ผมทำหล่นหายไปในตอนแรกครับ (กล่อง Modal สีขาว) */}
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="font-bold text-lg flex items-center gap-2">
            {isEditMode ? <Edit className="text-blue-600" size={20} /> : <PlusCircle className="text-green-600" size={20} />}
            {isEditMode ? 'Edit Hardware Model' : 'Create New Hardware Model'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
        </div>
        
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Model Name *</label>
              <input type="text" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="e.g. RB5009UG+S+IN" value={newModel.name} onChange={(e) => setNewModel({...newModel, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Image URL</label>
              <input type="text" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="https://..." value={newModel.imageUrl} onChange={(e) => setNewModel({...newModel, imageUrl: e.target.value})} />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-bold text-slate-700">Port Templates</label>
              <button onClick={handleAddPort} className="text-sm text-blue-600 flex items-center gap-1 hover:text-blue-800 font-medium bg-blue-50 px-3 py-1.5 rounded-lg transition"><PlusCircle size={16} /> Add Port</button>
            </div>
            
            {newModel.ports.length === 0 ? (
              <div className="text-center p-6 text-sm text-slate-400 border border-dashed rounded-lg bg-slate-50">No ports added yet.</div>
            ) : (
              <div className="space-y-3 sm:space-y-2">
                <div className="hidden sm:flex gap-2 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <div className="flex-1">Port Name</div>
                  <div className="w-28">Hardware Type</div>
                  <div className="w-24">Default Role</div>
                  <div className="w-8"></div>
                </div>
                {newModel.ports.map((port, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:items-center bg-slate-50 p-4 sm:p-2 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-center sm:hidden pb-2 border-b border-slate-200">
                        <span className="text-sm font-bold text-slate-700">Port {index + 1}</span>
                        <button onClick={() => handleRemovePort(index)} className="p-1.5 text-red-500 hover:bg-red-100 bg-red-50 rounded-md transition"><Trash2 size={16}/></button>
                    </div>
                    <div className="w-full sm:flex-1">
                      <label className="text-xs font-bold text-slate-500 sm:hidden mb-1 block">Port Name</label>
                      <input type="text" className="w-full p-2.5 sm:p-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={port.name} onChange={(e) => handlePortChange(index, 'name', e.target.value)} />
                    </div>
                    <div className="flex gap-3 sm:gap-2 w-full sm:w-auto">
                      <div className="flex-1 sm:w-28">
                        <label className="text-xs font-bold text-slate-500 sm:hidden mb-1 block">Type</label>
                        <select className="w-full p-2.5 sm:p-1.5 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={port.type} onChange={(e) => handlePortChange(index, 'type', e.target.value)}>
                          <option value="ETHER">ETHER</option><option value="SFP">SFP</option><option value="WLAN">WLAN</option>
                        </select>
                      </div>
                      <div className="flex-1 sm:w-24">
                        <label className="text-xs font-bold text-slate-500 sm:hidden mb-1 block">Role</label>
                        <select className="w-full p-2.5 sm:p-1.5 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={port.defaultRole} onChange={(e) => handlePortChange(index, 'defaultRole', e.target.value)}>
                          <option value="wan">WAN</option><option value="lan">LAN</option>
                        </select>
                      </div>
                    </div>
                    <button onClick={() => handleRemovePort(index)} className="hidden sm:block p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition">Cancel</button>
          <button onClick={onSave} className="px-5 py-2.5 bg-blue-600 text-white font-medium flex items-center gap-2 rounded-xl hover:bg-blue-700 transition shadow-sm">
            <Save size={18} /> {isEditMode ? 'Save Changes' : 'Save Model'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ModelFormModal;