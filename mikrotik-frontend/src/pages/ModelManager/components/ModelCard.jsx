import React from 'react';
import { Edit, Trash2, RotateCcw, Network, Wifi, Zap, Server } from 'lucide-react';

const ModelCard = ({ model, showDeleted, isSuperAdmin, onEdit, onDelete, onRestore }) => {
  const portCounts = model.ports?.reduce((acc, port) => {
    acc[port.type] = (acc[port.type] || 0) + 1;
    return acc;
  }, {}) || {};

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all flex flex-col group/card ${
      showDeleted 
        ? 'border-red-200 opacity-80 grayscale-[0.5]' 
        : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
    }`}>
      
      {/* 1. Image Section - ✅ ลดความสูงลงมาที่ h-32 sm:h-36 และ p-4 เพื่อให้สมดุลกับ GroupCard */}
      <div className="h-32 sm:h-36 bg-slate-50/50 p-4 flex items-center justify-center relative border-b border-slate-100">
        {model.imageUrl ? (
          <img 
            src={model.imageUrl} 
            alt={model.name} 
            className="max-w-full max-h-full object-contain drop-shadow-sm group-hover/card:scale-105 transition-transform duration-500" 
            onError={(e) => { e.target.src = 'https://via.placeholder.com/400x300?text=No+Image+Available' }} 
          />
        ) : (
          <Server size={48} className="text-slate-200" strokeWidth={1.5} />
        )}
        
        {!model.isActive && (
          <span className="absolute top-3 left-3 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
            Inactive
          </span>
        )}
      </div>

      {/* 2. Content Section - ✅ ใช้ p-5 เท่ากับ GroupCard */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="font-bold text-slate-800 text-lg truncate mb-3" title={model.name}>
          {model.name}
        </h3>
        
        {/* 3. Port Summary Badges - ✅ ปรับขนาด Badge ให้เล็กลงเท่ากับสถานะใน GroupCard */}
        <div className="mt-auto">
          <div className="flex flex-wrap gap-1.5">
            {portCounts.ETHER && (
              <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider border border-blue-100/50">
                <Network size={12} /> {portCounts.ETHER} ETHER
              </span>
            )}
            
            {portCounts.SFP && (
              <span className="flex items-center gap-1 bg-purple-50 text-purple-600 px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider border border-purple-100/50">
                <Zap size={12} /> {portCounts.SFP} SFP
              </span>
            )}
            
            {portCounts.WLAN && (
              <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider border border-emerald-100/50">
                <Wifi size={12} /> {portCounts.WLAN} WLAN
              </span>
            )}
            
            {Object.keys(portCounts).length === 0 && (
              <span className="text-[11px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded uppercase tracking-wider">
                ไม่มีข้อมูลพอร์ต
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Footer Actions - ✅ ใช้ p-3 และปุ่มกว้างเต็มกล่อง (w-full) แบบเดียวกับ GroupCard */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
        {showDeleted ? (
          <button 
            onClick={() => onRestore(model.id, model.name)} 
            className="w-full py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
          >
            <RotateCcw size={16} /> กู้คืนข้อมูล
          </button>
        ) : (
          <div className="flex w-full gap-2">
            <button 
              onClick={() => onEdit(model)} 
              className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm"
            >
              <Edit size={16} /> แก้ไข
            </button>
            {isSuperAdmin && (
              <button 
                onClick={() => onDelete(model.id, model.name)} 
                className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-all shadow-sm"
              >
                <Trash2 size={16} /> ลบ
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default ModelCard;