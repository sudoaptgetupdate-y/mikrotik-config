// src/pages/ModelManager/components/ModelCard.jsx
import React from 'react';
import { Server, Edit, Trash2, RotateCcw } from 'lucide-react';

const ModelCard = ({ 
  model, 
  showDeleted, 
  isSuperAdmin, 
  onEdit, 
  onDelete, 
  onRestore 
}) => {
  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition group ${showDeleted ? 'border-red-100 opacity-80 grayscale' : 'border-slate-200'}`}>
      <div className={`p-4 flex justify-between items-start border-b ${showDeleted ? 'bg-red-50/50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
        <div className="font-bold text-slate-800 flex items-center flex-wrap gap-2">
          {model.name}
          {model._count?.configs > 0 && (<span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-0.5 rounded-full font-bold">🔥 {model._count.configs} Used</span>)}
          {showDeleted && (<span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full font-bold">Deleted</span>)}
        </div>
        <div className="flex items-center gap-1">
          {!showDeleted && isSuperAdmin && (
            <button onClick={() => onEdit(model)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg md:opacity-0 group-hover:opacity-100 transition" title="Edit"><Edit size={16} /></button>
          )}
          {showDeleted ? (
            <button onClick={() => onRestore(model.id, model.name)} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg md:opacity-0 group-hover:opacity-100 transition" title="Restore"><RotateCcw size={16} /></button>
          ) : (
            <button onClick={() => onDelete(model.id, model.name)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg md:opacity-0 group-hover:opacity-100 transition" title="Delete"><Trash2 size={16} /></button>
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
              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600" title={`Type: ${p.type}`}>{p.name}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelCard;