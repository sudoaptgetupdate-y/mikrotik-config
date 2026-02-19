import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { Activity, Search, RefreshCw, FileText, Plus, Edit, Download, Trash2, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States สำหรับ Pagination & Filtering
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/logs', {
        params: {
          page,
          limit,
          search: searchTerm,
          startDate,
          endDate
        }
      });
      // Backend ส่งมาเป็น { data: [...], meta: {...} }
      setLogs(res.data.data);
      setMeta(res.data.meta);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลใหม่ทุกครั้งที่ page หรือ limit เปลี่ยน
  useEffect(() => {
    fetchLogs();
  }, [page, limit]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // ค้นหาใหม่ ให้กลับไปหน้า 1
    fetchLogs();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    // Note: useEffect จะไม่ trigger ทันทีถ้าล้างค่าเฉยๆ เลยต้องให้ fetchLogs ทำงานแยก
    setTimeout(() => fetchLogs(), 0);
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'CREATE_DEVICE': return { color: 'bg-green-100 text-green-700', icon: <Plus size={14} /> };
      case 'UPDATE_DEVICE': return { color: 'bg-blue-100 text-blue-700', icon: <Edit size={14} /> };
      case 'DELETE_DEVICE': return { color: 'bg-red-100 text-red-700', icon: <Trash2 size={14} /> };
      case 'GENERATE_CONFIG': return { color: 'bg-purple-100 text-purple-700', icon: <Download size={14} /> };
      case 'LOGIN': return { color: 'bg-slate-100 text-slate-700', icon: <Activity size={14} /> };
      default: return { color: 'bg-gray-100 text-gray-700', icon: <FileText size={14} /> };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="text-blue-600" /> System Audit Logs
          </h2>
          <p className="text-slate-500">Track user activities and system changes</p>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search by details or username..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="text-slate-400" size={20} />
            <input 
              type="date" 
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-slate-400">-</span>
            <input 
              type="date" 
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition">
              Search
            </button>
            <button type="button" onClick={handleResetFilters} className="px-4 py-2.5 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition">
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 flex flex-col items-center">
            <RefreshCw size={32} className="animate-spin mb-4 text-blue-500" />
            Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No activity logs found for the selected criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                  <th className="p-4 w-48">Date / Time</th>
                  <th className="p-4 w-32">User</th>
                  <th className="p-4 w-48">Action</th>
                  <th className="p-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 text-sm text-slate-600 font-medium">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 text-sm font-semibold text-slate-800">
                        {log.user?.username || `User #${log.userId}`}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${badge.color}`}>
                          {badge.icon} {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-600">
                        {log.details || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination Footer */}
        {!loading && logs.length > 0 && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              Show
              <select 
                value={limit} 
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1); // รีเซ็ตกลับไปหน้า 1 เมื่อเปลี่ยน limit
                }}
                className="p-1 border border-slate-300 rounded bg-white outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              entries (Total: {meta.total})
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-slate-600 font-medium px-2">
                Page {page} of {meta.totalPages}
              </span>
              <button 
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                disabled={page === meta.totalPages}
                className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default AuditLog;