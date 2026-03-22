import React, { useEffect, useState } from 'react';
import { X, PlusCircle, Save, Edit, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import apiClient from '../../../utils/apiClient';

const ModelFormModal = ({ 
  isOpen, 
  onClose, 
  isEditMode, 
  newModel, 
  setNewModel, 
  onSave 
}) => {
  const { t } = useTranslation();
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    // รีเซ็ต Error เมื่อเปิด Modal
    if (isOpen) setError('');
  }, [isOpen]);

  const checkDuplicateName = async (name) => {
    if (!name || name.trim() === "") {
      setError('');
      return;
    }

    setIsValidating(true);
    try {
      const params = { name };
      if (isEditMode) params.excludeId = newModel.id;

      const { data } = await apiClient.get('/api/master/models/check-duplicate', { params });
      if (data.exists) {
        setError(t('models.form.error_duplicate', 'ชื่อรุ่นอุปกรณ์นี้มีอยู่ในระบบแล้ว'));
      } else {
        setError('');
      }
    } catch (err) {
      console.error("Validation error:", err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setNewModel({ ...newModel, name: value });
    if (error) setError('');
  };

  const handleNameBlur = (e) => {
    checkDuplicateName(e.target.value);
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

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
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isOpen ? 'opacity-100 visible' : 'opacity-0 pointer-events-none invisible'
      }`}
    >
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Modal Container */}
      <div 
        className={`bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative z-10 transition-all duration-300 transform ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <h3 className="font-black text-xl text-slate-800 flex items-center gap-3 tracking-tight">
            <div className={`p-2 rounded-2xl ${isEditMode ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
              {isEditMode ? <Edit size={24} /> : <PlusCircle size={24} />}
            </div>
            {isEditMode ? t('models.form.edit_title', 'Edit Hardware Model') : t('models.form.create_title', 'Create New Hardware Model')}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all"><X size={24} /></button>
        </div>
        
        <div className="p-5 sm:p-8 overflow-y-auto flex-1 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('models.form.label_name', 'Model Name *')}</label>
              <div className="relative">
                <input 
                  type="text" 
                  className={`w-full p-2 border rounded-lg outline-none transition ${error ? 'border-red-500 focus:ring-2 focus:ring-red-200' : 'border-slate-300 focus:ring-2 focus:ring-blue-500'}`} 
                  placeholder={t('models.form.placeholder_name', "e.g. RB5009UG+S+IN")} 
                  value={newModel.name} 
                  onChange={handleNameChange} 
                  onBlur={handleNameBlur}
                />
                {isValidating && <Loader2 size={16} className="absolute right-3 top-2.5 animate-spin text-slate-400" />}
              </div>
              {error && (
                <p className="mt-1 text-xs text-red-500 flex items-center gap-1 font-medium animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={12} /> {error}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">{t('models.form.label_image', 'Image URL')}</label>
              <input type="text" className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="https://..." value={newModel.imageUrl} onChange={(e) => setNewModel({...newModel, imageUrl: e.target.value})} />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-bold text-slate-700">{t('models.form.section_ports', 'Port Templates')}</label>
              <button onClick={handleAddPort} className="text-sm text-blue-600 flex items-center gap-1 hover:text-blue-800 font-medium bg-blue-50 px-3 py-1.5 rounded-lg transition"><PlusCircle size={16} /> {t('models.form.add_port', 'Add Port')}</button>
            </div>
            
            {newModel.ports.length === 0 ? (
              <div className="text-center p-6 text-sm text-slate-400 border border-dashed rounded-lg bg-slate-50">{t('models.form.no_ports', 'No ports added yet.')}</div>
            ) : (
              <div className="space-y-3 sm:space-y-2">
                <div className="hidden sm:flex gap-2 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  <div className="flex-1">{t('models.form.table_name', 'Port Name')}</div>
                  <div className="w-28">{t('models.form.table_type', 'Hardware Type')}</div>
                  <div className="w-24">{t('models.form.table_role', 'Default Role')}</div>
                  <div className="w-8"></div>
                </div>
                {newModel.ports.map((port, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-3 sm:gap-2 sm:items-center bg-slate-50 p-4 sm:p-2 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                    <div className="flex justify-between items-center sm:hidden pb-2 border-b border-slate-200">
                        <span className="text-sm font-bold text-slate-700">{t('models.form.table_name', 'Port')} {index + 1}</span>
                        <button onClick={() => handleRemovePort(index)} className="p-1.5 text-red-500 hover:bg-red-100 bg-red-50 rounded-md transition"><Trash2 size={16}/></button>
                    </div>
                    <div className="w-full sm:flex-1">
                      <label className="text-xs font-bold text-slate-500 sm:hidden mb-1 block">{t('models.form.table_name', 'Port Name')}</label>
                      <input type="text" className="w-full p-2.5 sm:p-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={port.name} onChange={(e) => handlePortChange(index, 'name', e.target.value)} />
                    </div>
                    <div className="flex gap-3 sm:gap-2 w-full sm:w-auto">
                      <div className="flex-1 sm:w-28">
                        <label className="text-xs font-bold text-slate-500 sm:hidden mb-1 block">{t('models.form.table_type', 'Type')}</label>
                        <select className="w-full p-2.5 sm:p-1.5 border border-slate-300 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none" value={port.type} onChange={(e) => handlePortChange(index, 'type', e.target.value)}>
                          <option value="ETHER">ETHER</option><option value="SFP">SFP</option><option value="WLAN">WLAN</option>
                        </select>
                      </div>
                      <div className="flex-1 sm:w-24">
                        <label className="text-xs font-bold text-slate-500 sm:hidden mb-1 block">{t('models.form.table_role', 'Role')}</label>
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
          <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-200 rounded-xl transition">{t('common.cancel', 'Cancel')}</button>
          <button onClick={onSave} className="px-5 py-2.5 bg-blue-600 text-white font-medium flex items-center gap-2 rounded-xl hover:bg-blue-700 transition shadow-sm">
            <Save size={18} /> {isEditMode ? t('common.save_changes', 'Save Changes') : t('common.save', 'Save Model')}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ModelFormModal;