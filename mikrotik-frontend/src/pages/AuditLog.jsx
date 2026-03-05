import React, { useState, useEffect } from 'react';
import { Activity, Search, RefreshCw, FileText, Plus, Edit, Download, Trash2, Calendar, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { logService } from '../services/logService';
import toast from 'react-hot-toast';

const PAGE_SIZES = [8, 10, 50, 100];

const AuditLog = () => {
  // ==========================================
  // States & Hooks
  // ==========================================
  const [searchTerm, setSearchTerm] = useState('');
  const [activePreset, setActivePreset] = useState('all'); 
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [currentPage, setCurrentPage] = useState(1);

  // ==========================================
  // React Query Fetching
  // ==========================================
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['auditLogs', currentPage, pageSize, searchTerm, dateRange],
    queryFn: () => logService.getActivityLogs({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
      startDate: dateRange.start,
      endDate: dateRange.end,
    }),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
    refetchInterval: 15000,
  });

  const logs = data?.data || [];
  const totalLogs = data?.meta?.total || 0;
  const totalPages = data?.meta?.totalPages || 0;

  // ==========================================
  // Effects & Handlers
  // ==========================================
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, pageSize, dateRange]);

  const handlePresetClick = (preset) => {
    setActivePreset(preset);
    if (preset === 'all') return setDateRange({ start: '', end: '' });
    if (preset === 'custom') return;

    const end = new Date(); const start = new Date();
    if (preset === '7days') start.setDate(start.getDate() - 7);
    else if (preset === '30days') start.setDate(start.getDate() - 30);
    
    setDateRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] });
  };

  // ==========================================
  // Helpers
  // ==========================================
  const getActionBadge = (action) => {
    switch (action) {
      case 'CREATE_DEVICE': return { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <Plus size={14} /> };
      case 'UPDATE_DEVICE': return { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: <Edit size={14} /> };
      case 'DELETE_DEVICE': return { color: 'bg-rose-50 text-rose-700 border-rose-200', icon: <Trash2 size={14} /> };
      case 'GENERATE_CONFIG': return { color: 'bg-purple-50 text-purple-700 border-purple-200', icon: <Download size={14} /> };
      case 'LOGIN': return { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: <Activity size={14} /> };
      default: return { color: 'bg-slate-50 text-slate-600 border-slate-200', icon: <FileText size={14} /> };
    }
  };

  const from = totalLogs > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const to = Math.min(currentPage * pageSize, totalLogs);

  // คำนวณการย่อเลขหน้า (เช่น 1 2 ... 9 10)
  const getVisiblePages = () => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }
    return rangeWithDots;
  };

  // ==========================================
  // Render
  // ==========================================
  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-500">
      
      {/* 1. Page Header (แบบ Classic & Clean) */}
      <div className="space-y-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm font-medium text-slate-500 gap-2">
          <a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-400">System Administration</span>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-800">Audit Logs</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Activity className="text-blue-600" size={28} /> 
              System Audit Logs
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              ติดตามประวัติการใช้งานระบบ การเข้าสู่ระบบ และการเปลี่ยนแปลงตั้งค่า
            </p>
          </div>
          
          {/* ปุ่ม Refresh สไตล์ Soft/Tonal */}
          <button 
            onClick={() => refetch()} 
            className="shrink-0 bg-blue-50 text-blue-700 px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-100 transition-all font-semibold text-sm border border-blue-100"
          >
            <RefreshCw size={18} strokeWidth={2.5} className={isFetching ? "animate-spin" : ""} /> 
            <span>Refresh Logs</span>
          </button>
        </div>

        {/* เส้นกั้น Solid Divider */}
        <hr className="border-slate-200 mt-2" />
      </div>

      {/* 2. Control Toolbar (Search & Filters) */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="ค้นหาตาม User, การกระทำ หรือรายละเอียด..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="text-sm text-slate-500 font-medium px-2 shrink-0">
            พบ <span className="text-slate-800 font-bold">{totalLogs}</span> รายการ
          </div>
        </div>

        {/* Date Filter */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-sm text-slate-500 font-bold px-1"><Calendar size={16} /> ช่วงเวลา:</div>
          <div className="flex flex-wrap gap-2">
            {[{ id: 'all', label: 'ทั้งหมด' }, { id: 'today', label: 'วันนี้' }, { id: '7days', label: '7 วันที่ผ่านมา' }, { id: '30days', label: '30 วันที่ผ่านมา' }, { id: 'custom', label: 'กำหนดเอง' }].map(preset => (
              <button 
                key={preset.id} 
                onClick={() => handlePresetClick(preset.id)} 
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border ${activePreset === preset.id ? 'bg-slate-800 text-white border-slate-800 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          {activePreset === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-left-4 mt-2 md:mt-0">
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all text-slate-600" />
              <span className="text-slate-400 text-xs">-</span>
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-all text-slate-600" />
            </div>
          )}
        </div>
      </div>

      {/* 3. Content Area */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white min-h-[400px]">
            <Loader2 size={36} className="animate-spin text-blue-600 mb-4" />
            <p className="font-medium text-sm">กำลังโหลดข้อมูลประวัติ...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white flex flex-col items-center justify-center min-h-[400px] text-center p-8">
            <div className="bg-slate-50 p-5 rounded-full mb-4">
              <FileText size={48} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">ไม่พบประวัติการใช้งาน</h3>
            <p className="text-slate-500 text-sm max-w-sm">
              ไม่พบประวัติที่ตรงกับเงื่อนไข หรือช่วงเวลาที่คุณเลือก
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto relative">
            <table className={`w-full text-left border-collapse transition-opacity duration-200 ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-4 pl-6 w-48 whitespace-nowrap">Date / Time</th>
                  <th className="p-4 w-40 whitespace-nowrap">User</th>
                  <th className="p-4 w-56 whitespace-nowrap">Action</th>
                  <th className="p-4 whitespace-nowrap">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {logs.map((log) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 pl-6 text-sm text-slate-600 font-medium whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('th-TH', { 
                          year: 'numeric', month: 'short', day: 'numeric', 
                          hour: '2-digit', minute: '2-digit', second: '2-digit' 
                        })}
                      </td>
                      <td className="p-4 text-sm font-bold text-slate-800 whitespace-nowrap">
                        {log.user?.username || `User #${log.userId}`}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${badge.color}`}>
                          {badge.icon} {log.action.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-slate-600 max-w-md truncate" title={log.details || '-'}>
                        {log.details || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Table Footer: Rows per page & Showing summary */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-medium">รายการต่อหน้า:</span>
                <div className="flex gap-1">
                  {PAGE_SIZES.map(size => (
                    <button 
                      key={size} 
                      onClick={() => setPageSize(size)} 
                      className={`px-2 py-1 rounded transition-colors font-bold ${pageSize === size ? 'bg-slate-200 text-slate-700' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-slate-500 font-medium">
                กำลังแสดง <span className="font-bold text-slate-700">{from}</span> ถึง <span className="font-bold text-slate-700">{to}</span> จากทั้งหมด <span className="font-bold text-slate-700">{totalLogs}</span> รายการ
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Pagination Controls (Tinted Glass with Ellipsis Support) */}
      {totalPages > 1 && (
        <div className="sticky bottom-6 z-30 flex justify-center mt-8 pointer-events-none">
          <div className="flex items-center gap-1 p-1.5 bg-blue-50/80 backdrop-blur-md border border-blue-200/60 rounded-full shadow-[0_8px_30px_rgb(59,130,246,0.15)] pointer-events-auto transition-all hover:bg-blue-50/95">
            
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1} 
              className="p-2 rounded-full text-blue-500 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-blue-500 transition-all"
            >
              <ChevronLeft size={20} strokeWidth={2.5} />
            </button>
            
            <div className="flex items-center gap-1 px-1 sm:px-2">
              {getVisiblePages().map((page, index) => (
                page === '...' ? (
                  <span key={`dots-${index}`} className="w-8 text-center text-blue-400 font-bold select-none">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${
                      currentPage === page 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                        : 'text-blue-600/70 hover:bg-blue-100 hover:text-blue-700'
                    }`}
                  >
                    {page}
                  </button>
                )
              ))}
            </div>

            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage === totalPages} 
              className="p-2 rounded-full text-blue-500 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-blue-500 transition-all"
            >
              <ChevronRight size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AuditLog;