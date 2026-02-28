import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, CheckCircle, RefreshCw, Activity } from 'lucide-react';
import { FILTER_OPTIONS } from './deviceHelpers';

const DeviceListToolbar = ({ searchTerm, setSearchTerm, statusFilter, setStatusFilter, onRefresh, loading }) => {
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

  const currentFilterOpt = FILTER_OPTIONS.find(opt => opt.value === statusFilter);
  const CurrentIcon = currentFilterOpt ? currentFilterOpt.icon : Activity;

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text"
          placeholder="Search by Name, Circuit ID, IP Address, Model..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="relative w-full md:w-56" ref={filterRef}>
        <button 
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-blue-100"
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-1 rounded-md ${currentFilterOpt?.bg} ${currentFilterOpt?.color}`}>
              <CurrentIcon size={16} />
            </div>
            <span className="font-medium text-slate-700 text-sm">{currentFilterOpt?.label}</span>
          </div>
          <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
        </button>

        {isFilterOpen && (
          <div className="absolute z-50 top-full left-0 mt-2 w-full bg-white border border-slate-100 rounded-xl shadow-lg shadow-slate-200/50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
            {FILTER_OPTIONS.map((opt) => {
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

      <button onClick={onRefresh} className="w-full md:w-auto flex justify-center items-center gap-2 px-4 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition font-medium">
        <RefreshCw size={18} className={loading ? "animate-spin text-blue-500" : ""} />
        <span className="md:hidden lg:inline">Refresh</span>
      </button>
    </div>
  );
};

export default DeviceListToolbar;