import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { Activity, Search, RefreshCw, FileText, Plus, Edit, Download, Trash2 } from 'lucide-react';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/logs');
      setLogs(res.data);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // ฟังก์ชันจัดสีและไอคอนตาม Action
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

  // Filter การค้นหา
  const filteredLogs = logs.filter(log => 
    log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Search logs by action, user, or details..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">Loading logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No activity logs found.</div>
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
                {filteredLogs.map((log) => {
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
      </div>

    </div>
  );
};

export default AuditLog;