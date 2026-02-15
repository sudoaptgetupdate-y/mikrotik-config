import React from 'react';
import { Router, CheckCircle } from 'lucide-react';

const Step1_ModelSelect = ({ models, selectedModel, setSelectedModel }) => {
  return (
    <div className="animate-fade-in">
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Router className="text-blue-600" /> Select Your Router Model
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {models.map((model) => (
          <div 
            key={model.id}
            onClick={() => setSelectedModel(model)}
            className={`cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-lg relative overflow-hidden ${
              selectedModel?.id === model.id 
                ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-200' 
                : 'border-slate-200 hover:border-blue-300'
            }`}
          >
            {selectedModel?.id === model.id && (
              <div className="absolute top-2 right-2 text-blue-600">
                <CheckCircle size={20} />
              </div>
            )}
            
            <div className="aspect-video bg-white rounded-lg mb-4 flex items-center justify-center p-2 border border-slate-100">
              {model.imageUrl ? (
                 <img src={model.imageUrl} alt={model.name} className="max-h-full object-contain" />
              ) : <Router size={48} className="text-slate-300" />}
            </div>
            
            <h3 className="font-bold text-lg text-slate-800">{model.name}</h3>
            <p className="text-sm text-slate-500 mb-3">{model.ports?.length || 0} Interfaces</p>
            
            <div className="flex flex-wrap gap-1">
              {model.ports?.slice(0, 6).map(p => (
                <span key={p.id} className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded uppercase">
                  {p.name}
                </span>
              ))}
              {(model.ports?.length > 6) && <span className="text-[10px] text-slate-400">...</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Step1_ModelSelect;