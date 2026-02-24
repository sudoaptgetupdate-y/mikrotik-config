import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, Router, Server, Plus, ArrowRight, 
  CheckCircle, AlertTriangle, Clock, FileText, Database,
  Wifi, ServerOff, Bell, Calendar
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    activeAlerts: 0
  });
  const [recentLogs, setRecentLogs] = useState([]);

  // สร้างคำทักทายตามช่วงเวลา
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const currentDate = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [devicesRes, modelsRes, logsRes] = await Promise.all([
        apiClient.get('/api/devices/user/1'), // ควรดึง User ID จาก Context ในอนาคต
        apiClient.get('/api/master/models'),
        apiClient.get('/api/logs?limit=5')
      ]);

      const allDevices = devicesRes.data || [];
      const models = modelsRes.data || [];
      const logsArray = Array.isArray(logsRes.data) ? logsRes.data : (logsRes.data?.data || []);

      const activeDevices = allDevices.filter(device => device.status !== 'DELETED');
      
      let onlineCount = 0;
      let offlineCount = 0;
      let alertCount = 0;

      activeDevices.forEach(device => {
        let isOnline = false;
        if (device.lastSeen) {
            const diffMinutes = (new Date() - new Date(device.lastSeen)) / 1000 / 60;
            isOnline = diffMinutes <= 3;
        }

        const cpuVal = parseFloat(device.cpu || device.cpuLoad) || 0;
        const ramVal = parseFloat(device.ram || device.memoryUsage) || 0;

        if (isOnline) {
          onlineCount++;
          // ✅ อัปเดตเงื่อนไข: จะนับเป็น Alert ก็ต่อเมื่อโหลดยังสูง "และ" ยังไม่ได้ถูก Acknowledge เท่านั้น
          if ((cpuVal > 85 || ramVal > 85) && !device.isAcknowledged) {
            alertCount++;
          }
        } else {
          offlineCount++;
        }
      });

      setStats({
        totalDevices: activeDevices.length,
        totalModels: models.length,
        onlineDevices: onlineCount,
        offlineDevices: offlineCount,
        activeAlerts: alertCount
      });

      setRecentLogs(logsArray.slice(0, 5));

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleCardClick = (filterState) => {
    navigate('/devices', { state: { filter: filterState } });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-slate-400">
        <Activity size={48} className="animate-spin text-blue-600 mb-6" />
        <p className="font-medium animate-pulse">Syncing system data...</p>
      </div>
    );
  }

  // คำนวณเปอร์เซ็นต์สำหรับ Health Bar
  const onlinePercentage = stats.totalDevices > 0 ? (stats.onlineDevices / stats.totalDevices) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      
      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        {/* ลวดลายตกแต่งพื้นหลัง */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-0 left-20 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-blue-600 mb-1.5">
            <Activity size={16} />
            <span className="text-[11px] font-bold uppercase tracking-wider">System Overview</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
            {getGreeting()}, Admin! 👋
          </h2>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
            <Calendar size={14} /> {currentDate}
          </p>
        </div>

        <div className="relative z-10">
          {canEdit && (
            <button 
              onClick={() => navigate('/add-device')}
              className="w-full md:w-auto bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-600/20 transition-all duration-300 font-medium text-sm"
            >
              <Plus size={18} /> Add Device
            </button>
          )}
        </div>
      </div>

      {/* --- Section 1: Key Metrics --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Devices */}
        <div 
          onClick={() => handleCardClick('ACTIVE_ONLY')}
          className="relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden"
        >
          <Router size={76} className="absolute -bottom-4 -right-2 text-blue-50 opacity-60 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500" />
          
          <div className="relative z-10">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-inner">
              <Router size={20} />
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide group-hover:text-blue-600 transition-colors">Total Devices</p>
            <h3 className="text-3xl font-black text-slate-800 mt-0.5">{stats.totalDevices}</h3>
          </div>
        </div>

        {/* Card 2: Online Devices */}
        <div 
          onClick={() => handleCardClick('ONLINE')}
          className="relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden"
        >
          <Wifi size={76} className="absolute -bottom-4 -right-2 text-emerald-50 opacity-60 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500" />
          
          <div className="relative z-10">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300 shadow-inner">
              <CheckCircle size={20} />
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide group-hover:text-emerald-600 transition-colors">Online</p>
            <div className="flex items-end gap-2 mt-0.5">
               <h3 className="text-3xl font-black text-slate-800">{stats.onlineDevices}</h3>
               {stats.totalDevices > 0 && (
                 <span className="text-xs font-bold text-emerald-500 mb-1">
                   ({Math.round(onlinePercentage)}%)
                 </span>
               )}
            </div>
          </div>
        </div>

        {/* Card 3: Offline Devices */}
        <div 
          onClick={() => handleCardClick('OFFLINE')}
          className="relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-rose-300 hover:shadow-lg hover:shadow-rose-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden"
        >
          <ServerOff size={76} className="absolute -bottom-4 -right-2 text-rose-50 opacity-60 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500" />
          
          <div className="relative z-10">
            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-rose-500 group-hover:text-white transition-colors duration-300 shadow-inner">
              <ServerOff size={20} />
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide group-hover:text-rose-600 transition-colors">Offline</p>
            <h3 className="text-3xl font-black text-slate-800 mt-0.5">{stats.offlineDevices}</h3>
          </div>
        </div>

        {/* Card 4: Active Alerts */}
        <div 
          onClick={() => handleCardClick('WARNING')}
          className="relative bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-orange-300 hover:shadow-lg hover:shadow-orange-500/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer group overflow-hidden"
        >
          <Bell size={76} className="absolute -bottom-4 -right-2 text-orange-50 opacity-60 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500" />
          
          <div className="relative z-10">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-colors duration-300 shadow-inner ${stats.activeAlerts > 0 ? 'bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-800 group-hover:text-white'}`}>
              <AlertTriangle size={20} />
            </div>
            <p className={`text-[11px] font-bold uppercase tracking-wide transition-colors ${stats.activeAlerts > 0 ? 'text-slate-400 group-hover:text-orange-600' : 'text-slate-400 group-hover:text-slate-600'}`}>Alerts</p>
            <h3 className={`text-3xl font-black mt-0.5 ${stats.activeAlerts > 0 ? 'text-orange-500' : 'text-slate-800'}`}>
              {stats.activeAlerts}
            </h3>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- Section 2: Quick Actions --- */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-5 bg-indigo-500 rounded-full"></div>
            <h3 className="text-base font-black text-slate-800">Quick Actions</h3>
          </div>
          
          <div className="grid gap-3">
            <button 
              onClick={() => navigate('/add-device')}
              className="flex items-center justify-between w-full p-4 bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md rounded-2xl transition-all group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Plus size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition">Add New Device</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Create a new router config</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-transform group-hover:translate-x-1" />
            </button>

            <button 
              onClick={() => navigate('/devices')}
              className="flex items-center justify-between w-full p-4 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md rounded-2xl transition-all group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Router size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition">Manage Devices</h4>
                  <p className="text-[11px] text-slate-500 font-medium">View and edit inventory</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-transform group-hover:translate-x-1" />
            </button>

            <button 
              onClick={() => navigate('/models')}
              className="flex items-center justify-between w-full p-4 bg-white border border-slate-200 hover:border-slate-400 hover:shadow-md rounded-2xl transition-all group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl group-hover:bg-slate-800 group-hover:text-white transition-colors">
                  <Database size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition">Hardware Models</h4>
                  <p className="text-[11px] text-slate-500 font-medium">Manage port templates</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-slate-300 group-hover:text-slate-800 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* --- Section 3: Recent Activity --- */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div>
              <h3 className="text-base font-black text-slate-800">Recent Activity</h3>
            </div>
            <button 
              onClick={() => navigate('/audit-logs')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
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
                            <Clock size={10} />
                            {new Date(log.createdAt).toLocaleString()}
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

      </div>
    </div>
  );
};

export default Dashboard;