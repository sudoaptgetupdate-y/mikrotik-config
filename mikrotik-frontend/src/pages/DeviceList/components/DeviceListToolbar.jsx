import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, CheckCircle, RefreshCw, Activity } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getFilterOptions } from './deviceHelpers';

const DeviceListToolbar = ({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, onRefresh, loading }) => {
  const { t } = useTranslation();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  // ปิด Dropdown เมื่อคลิกที่อื่น
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // สร้างรายการ Filter ที่แปลภาษาแล้ว
  const translatedFilterOptions = getFilterOptions(t);

  const currentFilterOpt = translatedFilterOptions.find(opt => opt.value === statusFilter);
  const CurrentIcon = currentFilterOpt ? currentFilterOpt.icon : Activity;

  return (
    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center">
      
      {/* Search Box */}
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text"
          placeholder={t('devices.searchPlaceholder')}
          className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Status Filter Dropdown */}
      <div className="relative w-full md:w-56 shrink-0" ref={filterRef}>
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="w-full flex items-center justify-between px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-1 rounded-md ${currentFilterOpt?.bg} ${currentFilterOpt?.color}`}>
              <CurrentIcon size={16} />
            </div>
            <span className="font-semibold text-slate-700 text-sm">{currentFilterOpt?.label}</span>
          </div>
          <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
        </button>

        {isFilterOpen && (
          <div className="absolute z-50 top-full right-0 mt-2 w-full md:w-64 bg-white border border-slate-100 rounded-xl shadow-lg shadow-slate-200/50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">{t('devices.filterByStatus')}</div>
            {translatedFilterOptions.map((opt) => {
              const DropdownIcon = opt.icon;
              return (
                <button 
                  key={opt.value}
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setIsFilterOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${statusFilter === opt.value ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                >
                  <div className={`p-1.5 rounded-md ${opt.bg} ${opt.color}`}>
                    <DropdownIcon size={14} strokeWidth={2.5} />
                  </div>
                  <span className={`text-sm ${statusFilter === opt.value ? 'font-bold text-blue-600' : 'font-medium text-slate-600'}`}>
                    {opt.label}
                  </span>
                  {statusFilter === opt.value && <CheckCircle size={14} className="ml-auto text-blue-600" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <button 
        onClick={onRefresh} 
        className="w-full md:w-auto shrink-0 flex justify-center items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 rounded-lg border border-slate-200 transition-all font-semibold text-sm shadow-sm"
      >
        <RefreshCw size={16} className={loading ? "animate-spin text-blue-500" : ""} />
        <span className="md:hidden lg:inline">{t('devices.refresh')}</span>
      </button>
    </div>
  );
};

export default DeviceListToolbar;