import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, FileText, ArrowRight } from 'lucide-react';

const RecentActivity = ({ recentLogs }) => {
  const navigate = useNavigate();

  const getActionBadge = (action) => {
    switch (action) {
      case 'CREATE_DEVICE': return { color: 'bg-green-100 text-green-700' };
      case 'UPDATE_DEVICE': return { color: 'bg-blue-100 text-blue-700' };
      case 'DELETE_DEVICE': return { color: 'bg-red-100 text-red-700' };
      case 'GENERATE_CONFIG': return { color: 'bg-purple-100 text-purple-700' };
      case 'LOGIN': return { color: 'bg-slate-100 text-slate-700' };
      default: return { color: 'bg-gray-100 text-gray-700' };
    }
  };

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div>
          <h3 className="text-base font-black text-slate-800">Recent Activity</h3>
        </div>
        <button onClick={() => navigate('/audit-logs')} className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
          View All Log <ArrowRight size={14} />
        </button>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {recentLogs.length === 0 ? (
          <div className="p-10 text-center text-slate-400 flex flex-col items-center">
            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-3">
              <Clock size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">No recent activity found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentLogs.map((log) => {
              const badge = getActionBadge(log.action);
              return (
                <div key={log.id} className="p-4 flex items-start gap-3 hover:bg-slate-50/80 transition-colors group">
                  <div className="mt-0.5 p-2 bg-slate-100 rounded-xl text-slate-500 shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-slate-200">
                    <FileText size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-slate-700 font-medium truncate">
                      <span className="font-bold text-slate-900">{log.user?.username || 'System'}</span> {log.details || 'performed an action'}
                    </p>
                    <div className="flex items-center gap-2.5 mt-1.5 text-xs">
                      <span className="text-slate-500 font-medium flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded-md text-[11px]">
                        <Clock size={10} />{new Date(log.createdAt).toLocaleString()}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black tracking-wide uppercase ${badge.color}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;