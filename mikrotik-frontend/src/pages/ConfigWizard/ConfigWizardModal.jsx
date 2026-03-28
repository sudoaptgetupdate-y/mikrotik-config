import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import ConfigWizard from './ConfigWizard';

const ConfigWizardModal = ({ isOpen, onClose, mode = 'create', initialData }) => {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-50 animate-in fade-in duration-300">
      {/* Modal Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <span className="font-black text-xl">M</span>
          </div>
          <div>
            <h2 className="text-lg font-[1000] text-slate-900 uppercase tracking-tight">
              {mode === 'edit' ? 'Edit Device Configuration' : 'Device Setup Wizard'}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              {mode === 'standalone' ? 'Config Builder Mode' : 'Network Infrastructure'}
            </p>
          </div>
        </div>
        
        <button 
          onClick={onClose}
          className="size-10 rounded-xl bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all flex items-center justify-center active:scale-90 group"
        >
          <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      {/* Modal Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12">
        <div className="max-w-5xl mx-auto">
          <ConfigWizard 
            mode={mode} 
            initialData={initialData} 
            onFinish={() => {
              onClose();
            }} 
          />
        </div>
      </div>
    </div>
  );
};

export default ConfigWizardModal;