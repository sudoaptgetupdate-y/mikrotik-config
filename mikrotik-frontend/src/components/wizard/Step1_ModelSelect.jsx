import React, { useState, useMemo, useEffect } from 'react';
import { Router, CheckCircle, Hash, MapPin, Search, Star, ChevronLeft, ChevronRight } from 'lucide-react';

const Step1_ModelSelect = ({ 
  models, 
  selectedModel, 
  setSelectedModel,
  deviceMeta,     
  setDeviceMeta   
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  // === State สำหรับ Pagination ===
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3; // แสดงแค่ 3 การ์ด (1 แถวพอดี)

  // ฟังก์ชันอัปเดตข้อมูล (Name, Circuit ID)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setDeviceMeta(prev => ({ ...prev, [name]: value }));
  };

  // Logic: Filter & Sort (ค้นหา และ เรียงลำดับความนิยม)
  const processedModels = useMemo(() => {
    return [...models]
      .filter(model => 
        model.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        const countA = a._count?.configs || 0;
        const countB = b._count?.configs || 0;
        return countB - countA; 
      });
  }, [models, searchTerm]);

  // รีเซ็ตหน้ากลับไปที่ 1 เสมอเมื่อมีการพิมพ์ค้นหาใหม่
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // === คำนวณการแบ่งหน้า ===
  const totalPages = Math.ceil(processedModels.length / itemsPerPage);
  const paginatedModels = processedModels.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  return (
    <div className="animate-fade-in space-y-8">
      
      {/* --- ส่วนที่ 1: ข้อมูลเบื้องต้น (Device Info) --- */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
          <MapPin size={16} /> Device Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Site Name / Device Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={deviceMeta.name}
              onChange={handleChange}
              placeholder="EngineerOffice"
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Circuit ID / User Ref <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input
                type="text"
                name="circuitId"
                value={deviceMeta.circuitId}
                onChange={handleChange}
                placeholder="7534j7572"
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- ส่วนที่ 2: เลือก Model --- */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Router className="text-blue-600" /> Select Router Model
          </h2>
          
          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search model..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
        </div>

        {/* Model Grid */}
        {processedModels.length === 0 ? (
          <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <Router size={40} className="mx-auto mb-2 opacity-50" />
            <p>No models found matching "{searchTerm}"</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {paginatedModels.map((model, index) => {
                // เช็คว่าเป็นการ์ดแรกของหน้า 1 และมียอดใช้งานเกิน 0 ไหม (เพื่อติดป้าย Popular)
                const usageCount = model._count?.configs || 0;
                const isPopular = currentPage === 1 && index === 0 && usageCount > 0;

                return (
                  <div 
                    key={model.id}
                    onClick={() => setSelectedModel(model)}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-lg relative overflow-hidden group ${
                      selectedModel?.id === model.id 
                        ? 'border-blue-600 bg-blue-50 ring-1 ring-blue-200' 
                        : 'border-slate-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    {isPopular && !searchTerm && (
                      <div className="absolute top-0 left-0 bg-orange-500 text-white text-[10px] px-2 py-1 rounded-br-lg z-10 font-bold flex items-center gap-1">
                        <Star size={10} fill="currentColor" /> POPULAR
                      </div>
                    )}

                    {selectedModel?.id === model.id && (
                      <div className="absolute top-2 right-2 text-blue-600 animate-in zoom-in duration-200">
                        <CheckCircle size={22} fill="white" />
                      </div>
                    )}
                    
                    <div className="aspect-video bg-white rounded-lg mb-4 flex items-center justify-center p-2 border border-slate-100 group-hover:border-blue-100 transition-colors">
                      {model.imageUrl ? (
                        <img src={model.imageUrl} alt={model.name} className="max-h-full object-contain" />
                      ) : <Router size={48} className="text-slate-300" />}
                    </div>
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800">{model.name}</h3>
                        <p className="text-xs text-slate-400">{model.ports?.length || 0} Interfaces</p>
                      </div>
                      {usageCount > 0 && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md" title="Total setups created">
                          Used {usageCount}x
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mt-3">
                      {model.ports?.slice(0, 5).map(p => (
                        <span key={p.id} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase border border-slate-200">
                          {p.name}
                        </span>
                      ))}
                      {(model.ports?.length > 5) && <span className="text-[10px] text-slate-300">...</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 pt-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm font-medium text-slate-600 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-200">
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Step1_ModelSelect;