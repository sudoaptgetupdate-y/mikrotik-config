import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../utils/apiClient';
import { Activity, Search, RefreshCw, FileText, Plus, Edit, Download, Trash2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZES = [5, 10, 50, 100];

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // === State สำหรับการกรองและ Pagination ===
  const [searchTerm, setSearchTerm] = useState('');
  const [activePreset, setActivePreset] = useState('all'); // all, today, 7days, 30days, custom
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: pageSize,
        search: searchTerm,
        startDate: dateRange.start,
        endDate: dateRange.end,
      });
      
      const res = await apiClient.get(`/api/logs?${params.toString()}`);

      setLogs(res.data?.data || []);
      setTotalLogs(res.data?.meta?.total || 0);
      setTotalPages(res.data?.meta?.totalPages || 0);

    } catch (error) {
      console.error("Error fetching logs:", error);
      setLogs([]);
      setTotalLogs(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm, dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize, dateRange]);


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

  const handlePresetClick = (preset) => {
    setActivePreset(preset);
    
    if (preset === 'all') {
      setDateRange({ start: '', end: '' });
      return;
    }
    if (preset === 'custom') return;

    const end = new Date();
    const start = new Date();
    if (preset === 'today') {
      // no change needed
    } else if (preset === '7days') {
      start.setDate(start.getDate() - 7);
    } else if (preset === '30days') {
      start.setDate(start.getDate() - 30);
    }
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  };

  const from = totalLogs > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const to = Math.min(currentPage * pageSize, totalLogs);

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="text-blue-600" /> System Audit Logs
          </h2>
          <p className="text-slate-500">Track user activities and system changes</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search logs by action, user, or details..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={fetchLogs} className="flex items-center justify-center gap-2 px-4 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition font-medium">
            <RefreshCw size={18} className={loading ? "animate-spin text-blue-600" : ""} /> Refresh
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <Calendar size={18} /> Date Range:
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' },
              { id: 'custom', label: 'Custom' }
            ].map(preset => (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
                  activePreset === preset.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {activePreset === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-left-4">
              <input 
                type="date" 
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-600"
              />
              <span className="text-slate-400">-</span>
              <input 
                type="date" 
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-slate-600"
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-slate-500 bg-slate-50 flex flex-col items-center justify-center border border-dashed border-slate-200 m-4 rounded-xl">
            <Search size={32} className="text-slate-300 mb-2" />
            <p className="font-medium">No activity logs found.</p>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or date filters.</p>
          </div>
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
                          {badge.icon} {log.action.replace('_', ' ')}
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
        
        {/* Pagination Controls */}
        {totalLogs > 0 && (
          <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-white border-t border-slate-200 gap-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-sm text-slate-600">Rows per page:</span>
              <div className="flex flex-wrap items-center justify-center gap-1">
                {PAGE_SIZES.map(size => (
                  <button
                    key={size}
                    onClick={() => setPageSize(size)}
                    className={`px-3 py-1 text-sm font-medium rounded-md border transition-all ${
                      pageSize === size
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-sm text-slate-600 text-center">
              Showing <span className="font-medium">{from}</span>-<span className="font-medium">{to}</span> of <span className="font-medium">{totalLogs}</span> logs
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => p - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1.5 flex items-center gap-1 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="text-sm text-slate-500 font-medium whitespace-nowrap">Page {currentPage} of {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 flex items-center gap-1 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;