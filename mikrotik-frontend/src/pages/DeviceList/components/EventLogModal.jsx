import { useState, useEffect } from 'react';
import { X, Activity, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Loader2, Search, Filter } from 'lucide-react';

const EventLogModal = ({ isOpen, onClose, device, events, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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

  // ✅ เปลี่ยน UP เป็น ONLINE และ DOWN เป็น OFFLINE
  const getEventIcon = (type) => {
    if (type === 'ONLINE') return <ArrowUpCircle size={20} className="text-emerald-500" />;
    if (type === 'OFFLINE') return <ArrowDownCircle size={20} className="text-rose-500" />;
    if (type === 'WARNING') return <AlertTriangle size={20} className="text-orange-500" />;
    return <Activity size={20} className="text-blue-500" />;
  };

  const getEventColor = (type) => {
    if (type === 'ONLINE') return 'bg-emerald-50 border-emerald-200';
    if (type === 'OFFLINE') return 'bg-rose-50 border-rose-200';
    if (type === 'WARNING') return 'bg-orange-50 border-orange-200';
    return 'bg-blue-50 border-blue-200';
  };

  const filteredEvents = events.filter((ev) => {
    if (statusFilter !== 'ALL' && ev.eventType !== statusFilter) return false;

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const dateStr = new Date(ev.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }).toLowerCase();
      const details = (ev.details || '').toLowerCase();
      const type = (ev.eventType || '').toLowerCase();

      if (!dateStr.includes(term) && !details.includes(term) && !type.includes(term)) {
        return false;
      }
    }
    
    return true;
  });

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

      <div 
        className={`bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] relative z-10 transition-all duration-300 transform ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-2xl">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="font-black text-xl text-slate-800 tracking-tight">Event History Logs</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Device: {device?.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-100 bg-white shrink-0 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="ค้นหาวันที่ (เช่น 28/2), เดือน หรือรายละเอียด..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative sm:w-1/3">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select 
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none bg-white transition cursor-pointer text-slate-700 font-medium"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">ทุกสถานะ</option>
              <option value="ONLINE">🟢 Online</option>
              <option value="OFFLINE">🔴 Offline</option>
              <option value="WARNING">🟠 Warning</option>
            </select>
          </div>
        </div>
        
        {/* Body (Timeline) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/50">
          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center text-slate-400">
              <Loader2 size={32} className="animate-spin text-blue-500 mb-3" />
              <p className="text-sm font-medium">กำลังโหลดประวัติ...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="py-10 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
              ไม่พบประวัติการเปลี่ยนสถานะ
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-10 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
              ไม่พบข้อมูลที่ตรงกับคำค้นหา "<span className="text-slate-600 font-bold">{searchTerm}</span>"
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-5">
              {filteredEvents.map((ev, i) => (
                <div key={ev.id || i} className="relative pl-6">
                  {/* Dot/Icon */}
                  <div className="absolute -left-[11px] top-0.5 bg-white rounded-full shadow-sm">
                    {getEventIcon(ev.eventType)}
                  </div>
                  
                  {/* Content */}
                  <div className={`p-3.5 rounded-xl border shadow-sm ${getEventColor(ev.eventType)} hover:shadow-md transition-shadow bg-white`}>
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <span className={`font-black text-sm ${
                        ev.eventType === 'ONLINE' ? 'text-emerald-700' : 
                        ev.eventType === 'OFFLINE' ? 'text-rose-700' : 
                        ev.eventType === 'WARNING' ? 'text-orange-700' : 'text-slate-700'
                      }`}>
                        {ev.eventType}
                      </span>
                      <span className="text-xs font-bold text-slate-500 whitespace-nowrap bg-white/60 px-2 py-0.5 rounded-md border border-slate-200/50">
                        {new Date(ev.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">{ev.details}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default EventLogModal;