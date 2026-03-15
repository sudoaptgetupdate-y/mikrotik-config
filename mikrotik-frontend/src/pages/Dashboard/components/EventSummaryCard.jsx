import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { logService } from '../../../services/logService';
import { BarChart3, Clock, ArrowUpCircle, ArrowDownCircle, AlertTriangle, Loader2 } from 'lucide-react';

const EventSummaryCard = () => {
  const [days, setDays] = useState(1); // Default to 24h

  const { data, isLoading } = useQuery({
    queryKey: ['event-summary', days],
    queryFn: () => logService.getEventSummary(days),
    refetchInterval: 60000 // Refresh every minute
  });

  const summary = data || { ONLINE: 0, OFFLINE: 0, WARNING: 0, ACK: 0, TOTAL: 0 };

  // Calculate percentages for the bar
  const getPercent = (value) => {
    if (!summary.TOTAL) return 0;
    return (value / summary.TOTAL) * 100;
  };

  const periods = [
    { label: '24h', value: 1 },
    { label: '7d', value: 7 },
    { label: '30d', value: 30 }
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 bg-blue-500 rounded-full"></div>
          <h3 className="text-base font-black text-slate-800">Event Summary</h3>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => setDays(p.value)}
              className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${
                days === p.value 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 gap-2">
            <Loader2 size={24} className="animate-spin text-blue-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Analyzing logs...</span>
          </div>
        ) : (
          <>
            {/* Proportion Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Incident Distribution</span>
                <span className="text-xs font-bold text-slate-700">{summary.TOTAL} Events</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div 
                  style={{ width: `${getPercent(summary.ONLINE)}%` }} 
                  className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                  title={`Online: ${summary.ONLINE}`}
                />
                <div 
                  style={{ width: `${getPercent(summary.WARNING)}%` }} 
                  className="h-full bg-orange-500 transition-all duration-1000 ease-out"
                  title={`Warning: ${summary.WARNING}`}
                />
                <div 
                  style={{ width: `${getPercent(summary.OFFLINE)}%` }} 
                  className="h-full bg-rose-500 transition-all duration-1000 ease-out"
                  title={`Offline: ${summary.OFFLINE}`}
                />
              </div>
            </div>

            {/* Stats List */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                  <ArrowUpCircle size={14} />
                  <span className="text-[10px] font-black uppercase">Online</span>
                </div>
                <span className="text-xl font-black text-slate-800">{summary.ONLINE}</span>
                <div className="w-full h-1 bg-emerald-50 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-200" style={{ width: `${getPercent(summary.ONLINE)}%` }} />
                </div>
              </div>

              <div className="flex flex-col gap-1 border-x border-slate-50 px-3">
                <div className="flex items-center gap-1.5 text-orange-500 mb-1">
                  <AlertTriangle size={14} />
                  <span className="text-[10px] font-black uppercase">Warning</span>
                </div>
                <span className="text-xl font-black text-slate-800">{summary.WARNING}</span>
                <div className="w-full h-1 bg-orange-50 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-200" style={{ width: `${getPercent(summary.WARNING)}%` }} />
                </div>
              </div>

              <div className="flex flex-col gap-1 pl-3">
                <div className="flex items-center gap-1.5 text-rose-500 mb-1">
                  <ArrowDownCircle size={14} />
                  <span className="text-[10px] font-black uppercase">Offline</span>
                </div>
                <span className="text-xl font-black text-slate-800">{summary.OFFLINE}</span>
                <div className="w-full h-1 bg-rose-50 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-200" style={{ width: `${getPercent(summary.OFFLINE)}%` }} />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Clock size={12} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Report for last {days} day(s)</span>
                </div>
                {summary.TOTAL > 0 && (
                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        {Math.round((summary.ONLINE / summary.TOTAL) * 100)}% Stability
                    </span>
                )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EventSummaryCard;
