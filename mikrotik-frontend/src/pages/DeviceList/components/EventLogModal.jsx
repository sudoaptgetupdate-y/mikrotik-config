import { useState } from 'react';
import { X, Activity, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Loader2, Search, Filter } from 'lucide-react';

const EventLogModal = ({ isOpen, onClose, device, events, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  if (!isOpen) return null;

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
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Activity className="text-blue-600" size={20} />
              Event History Logs
            </h3>
            <div className="text-sm font-medium text-slate-500 mt-1">
              Device: <span className="text-blue-600 font-bold">{device?.name}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition -mt-4">
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