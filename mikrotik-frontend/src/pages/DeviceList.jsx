import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import { generateMikrotikScript } from '../utils/mikrotikGenerator';
import HistoryModal from './ConfigWizard/components/device/HistoryModal';
import DeviceTableRow from './ConfigWizard/components/device/DeviceTableRow'; 
import { useAuth } from '../context/AuthContext';
import { 
  Search, Plus, RefreshCw, Server, Activity, 
  AlertTriangle, CheckCircle, XCircle, Archive, ChevronDown, X, BellRing, Clock, History, User, Loader2 // ✅ เพิ่ม Loader2
} from 'lucide-react';

const getDeviceStatus = (device) => {
  if (device.status === 'DELETED') {
      return { state: 'deleted', color: 'bg-slate-100 text-slate-500 border-slate-200', icon: <Archive size={14}/>, label: 'Inactive' };
  }
  if (!device.lastSeen) return { state: 'offline', color: 'bg-red-50 text-red-600 border-red-200', icon: <XCircle size={14}/>, label: 'Offline' };
  
  const diffMinutes = (new Date() - new Date(device.lastSeen)) / 1000 / 60;
  if (diffMinutes > 3) return { state: 'offline', color: 'bg-red-50 text-red-600 border-red-200', icon: <XCircle size={14}/>, label: 'Offline' };
  
  const cpu = parseFloat(device.cpu || device.cpuLoad) || 0;
  const ram = parseFloat(device.ram || device.memoryUsage) || 0;
  
  if (cpu > 85 || ram > 85) {
    if (device.isAcknowledged) {
      return { state: 'acknowledged', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: <CheckCircle size={14}/>, label: 'Acknowledged' };
    }
    return { state: 'warning', color: 'bg-orange-50 text-orange-600 border-orange-200', icon: <AlertTriangle size={14}/>, label: 'Warning' };
  }
  
  return { state: 'online', color: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle size={14}/>, label: 'Online' };
};

const FILTER_OPTIONS = [
  { value: 'ACTIVE_ONLY', label: 'Active Devices', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100' },
  { value: 'ONLINE', label: 'Online', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  { value: 'WARNING', label: 'Warning', icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-100' },
  { value: 'OFFLINE', label: 'Offline', icon: XCircle, color: 'text-red-500', bg: 'bg-red-100' },
  { value: 'DELETED', label: 'Inactive (Deleted)', icon: Archive, color: 'text-slate-500', bg: 'bg-slate-200' },
  { value: 'ALL', label: 'All Devices', icon: Server, color: 'text-slate-600', bg: 'bg-slate-100' },
];

const DeviceList = () => {
  const navigate = useNavigate();
  const location = useLocation(); 
  const { user } = useAuth(); 
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(location.state?.filter || 'ACTIVE_ONLY');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef(null);

  const [lastUpdated, setLastUpdated] = useState(new Date());

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedDeviceHistory, setSelectedDeviceHistory] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Modal State
  const [isAckModalOpen, setIsAckModalOpen] = useState(false);
  const [deviceToAck, setDeviceToAck] = useState(null);
  const [ackReason, setAckReason] = useState('');
  const [isAckSubmitting, setIsAckSubmitting] = useState(false);

  // ✅ State & Ref สำหรับ Infinite Scroll
  const [displayLimit, setDisplayLimit] = useState(15);
  const observerTarget = useRef(null);

  useEffect(() => {
    if (location.state?.filter) {
      setStatusFilter(location.state.filter);
    }
  }, [location.state?.filter]);

  const fetchDevices = async () => {
    try {
      const res = await apiClient.get('/api/devices/user/1');
      setDevices(res.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 30000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setIsFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ รีเซ็ตจำนวนที่แสดงเมื่อมีการค้นหา หรือเปลี่ยน Filter
  useEffect(() => {
    setDisplayLimit(15);
  }, [searchTerm, statusFilter]);

  // ✅ ตั้งค่า Intersection Observer เพื่อดักจับตอน Scroll ลงมาสุด
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // เพิ่มจำนวนแถวที่ต้องการแสดงทีละ 15
          setDisplayLimit((prev) => prev + 15);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [loading]); // อัปเดต observer เมื่อ loading เปลี่ยน

  const handleAddClick = () => navigate('/add-device');
  const handleEditClick = (device) => navigate(`/edit-device/${device.id}`, { state: { deviceData: device } });

  const handleDeleteClick = async (device) => {
    if (confirm(`Are you sure you want to delete "${device.name}"? (It will be marked as inactive)`)) {
        try {
            await apiClient.delete(`/api/devices/${device.id}`);
            fetchDevices();
        } catch (e) {
            console.error(e);
            alert("Failed to delete device");
        }
    }
  };

  const handleRestoreClick = async (device) => {
    if (confirm(`Are you sure you want to restore "${device.name}" to active status?`)) {
        try {
            await apiClient.put(`/api/devices/${device.id}/restore`);
            fetchDevices();
        } catch (e) {
            console.error(e);
            alert("Failed to restore device");
        }
    }
  };

  const handleDownloadLatest = async (device) => { 
    if (!device.configData) return alert("No configuration data found for this device.");
    try {
      await apiClient.post(`/api/devices/${device.id}/log-download`, { userId: 1 });
      const script = generateMikrotikScript(device.configData);
      const element = document.createElement("a");
      const file = new Blob([script], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `${device.name.replace(/\s+/g, '_')}_latest.rsc`;
      document.body.appendChild(element); 
      element.click();
      document.body.removeChild(element);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to generate script");
    }
  };

  const handleViewHistory = async (device) => {
    setSelectedDeviceHistory(device);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryData([]);
    try {
      const res = await apiClient.get(`/api/devices/${device.id}/history`);
      setHistoryData(res.data);
    } catch (error) {
      console.error("Fetch history failed:", error);
      alert("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAcknowledgeClick = (device) => {
    setDeviceToAck(device);
    setAckReason(''); 
    setIsAckModalOpen(true);
  };

  const submitAcknowledge = async () => {
    if (!ackReason.trim()) return alert("กรุณากรอกข้อมูลการอัปเดต หรือเหตุผล");
    setIsAckSubmitting(true);
    try {
      await apiClient.post(`/api/devices/${deviceToAck.id}/acknowledge`, {
        userId: user?.id || 1, 
        userName: user?.username || "Unknown User",
        reason: ackReason
      });
      setIsAckModalOpen(false);
      fetchDevices();
    } catch (error) {
      alert("Failed to acknowledge warning");
    } finally {
      setIsAckSubmitting(false);
    }
  };

  const filteredDevices = devices.filter(d => {
    const searchLower = searchTerm.toLowerCase();
    
    const modelName = typeof d.model === 'string' 
      ? d.model 
      : (d.model?.name || '');

    const matchesSearch = 
      (d.name && d.name.toLowerCase().includes(searchLower)) || 
      (d.circuitId && d.circuitId.toLowerCase().includes(searchLower)) ||
      (d.ipAddress && d.ipAddress.toLowerCase().includes(searchLower)) ||
      (d.boardName && d.boardName.toLowerCase().includes(searchLower)) || 
      (modelName && modelName.toLowerCase().includes(searchLower));

    const statusObj = getDeviceStatus(d);
    
    if (statusFilter === 'ACTIVE_ONLY') return statusObj.state !== 'deleted' && matchesSearch;
    if (statusFilter === 'ONLINE') return statusObj.state === 'online' && matchesSearch;
    if (statusFilter === 'WARNING') return statusObj.state === 'warning' && matchesSearch;
    if (statusFilter === 'OFFLINE') return statusObj.state === 'offline' && matchesSearch;
    if (statusFilter === 'DELETED') return statusObj.state === 'deleted' && matchesSearch;
    return matchesSearch; 
  });

  // ✅ ตัดข้อมูลให้แสดงแค่จำนวน displayLimit
  const displayedDevices = filteredDevices.slice(0, displayLimit);

  const currentFilterOpt = FILTER_OPTIONS.find(opt => opt.value === statusFilter);
  const CurrentIcon = currentFilterOpt ? currentFilterOpt.icon : Activity;

  let modalAckHistory = [];
  if (deviceToAck?.ackReason) {
    if (Array.isArray(deviceToAck.ackReason)) {
      modalAckHistory = deviceToAck.ackReason;
    } else if (typeof deviceToAck.ackReason === 'string') {
      try {
        modalAckHistory = JSON.parse(deviceToAck.ackReason);
        if (!Array.isArray(modalAckHistory)) modalAckHistory = [];
      } catch (e) {
        modalAckHistory = [{ timestamp: deviceToAck.ackAt || new Date(), reason: deviceToAck.ackReason }];
      }
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10 flex flex-col min-h-screen">
      
      {/* ส่วน Content หลัก (จะขยายเต็มพื้นที่เมื่อเนื้อหาน้อย) */}
      <div className="flex-grow space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-blue-600" /> Managed Routers
            </h2>
            <p className="text-slate-500 mt-1">
              Monitor and manage your MikroTik devices 
              (Last updated: {lastUpdated.toLocaleTimeString()})
            </p>
          </div>
          <button 
            onClick={handleAddClick}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-sm transition-all font-medium"
          >
            <Plus size={20} /> Add New Device
          </button>
        </div>

        {/* Toolbar */}
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

          <button onClick={() => { setLoading(true); fetchDevices(); }} className="w-full md:w-auto flex justify-center items-center gap-2 px-4 py-2.5 text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition font-medium">
            <RefreshCw size={18} className={loading ? "animate-spin text-blue-500" : ""} />
            <span className="md:hidden lg:inline">Refresh</span>
          </button>
        </div>

        {/* --- Device Table --- */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading && devices.length === 0 ? (
            <div className="p-10 text-center text-slate-400 flex flex-col items-center">
              <Loader2 size={32} className="animate-spin text-blue-500 mb-3" />
              Loading devices...
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="p-10 text-center text-slate-400 flex flex-col items-center">
              <Server size={48} className="mb-4 text-slate-200" />
              <p>No devices found for the selected filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold text-left">
                    <th className="p-4 pl-6 w-[15%]">Status</th>
                    <th className="p-4 w-[25%]">Device Details</th>
                    <th className="p-4 w-[20%]">Resources</th>
                    <th className="p-4 w-[25%]">Health, Net & Uptime</th>
                    <th className="p-4 text-right pr-6 w-[15%]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* ✅ ลูปจากตัวแปร displayedDevices แทน filteredDevices */}
                  {displayedDevices.map((device) => (
                    <DeviceTableRow 
                      key={device.id} 
                      device={device}
                      status={getDeviceStatus(device)}
                      onDownload={handleDownloadLatest}
                      onViewHistory={handleViewHistory}
                      onRestore={handleRestoreClick}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteClick}
                      onAcknowledge={handleAcknowledgeClick}
                      canEdit={canEdit}
                    />
                  ))}
                </tbody>
              </table>

              {/* ✅ ตัวจับการ Scroll (Intersection Observer Target) */}
              {displayLimit < filteredDevices.length && (
                <div ref={observerTarget} className="p-6 flex justify-center items-center gap-2 text-slate-400 bg-slate-50 border-t border-slate-100">
                  <Loader2 size={18} className="animate-spin text-blue-400" />
                  <span className="text-sm font-medium">Loading more devices...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Acknowledge Modal */}
      {isAckModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className={`flex justify-between items-center p-5 border-b border-slate-100 ${deviceToAck?.isAcknowledged ? 'bg-blue-50/50' : 'bg-orange-50/50'}`}>
              <h3 className={`font-bold flex items-center gap-2 ${deviceToAck?.isAcknowledged ? 'text-blue-700' : 'text-orange-700'}`}>
                {deviceToAck?.isAcknowledged ? <BellRing size={18} /> : <AlertTriangle size={18} />} 
                {deviceToAck?.isAcknowledged ? 'Update Acknowledge' : 'Acknowledge Warning'}
              </h3>
              <button onClick={() => setIsAckModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border-b border-slate-100">
              <div className="p-6">
                <p className="text-sm text-slate-600 mb-4">
                  เครื่อง <strong className="text-slate-800">{deviceToAck?.name}</strong> กำลังมีสถานะโหลดสูง 
                </p>
                <label className="block text-sm font-bold text-slate-700 mb-2">ข้อมูลอัปเดตใหม่ (New Note)</label>
                <textarea 
                  className={`w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 transition-all resize-none h-40 ${deviceToAck?.isAcknowledged ? 'focus:ring-blue-200 focus:border-blue-400' : 'focus:ring-orange-200 focus:border-orange-400'}`}
                  placeholder="พิมพ์ข้อมูลอัปเดต หรือเหตุผลที่นี่..."
                  value={ackReason}
                  onChange={(e) => setAckReason(e.target.value)}
                ></textarea>
              </div>

              <div className="p-6 bg-slate-50">
                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <History size={16} className="text-slate-400" /> Acknowledge History
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-3 pr-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {modalAckHistory.length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center py-10">ยังไม่มีประวัติการแจ้งปัญหา</p>
                  ) : (
                    modalAckHistory.slice().reverse().map((entry, idx) => (
                      <div key={idx} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm relative">
                        {idx === 0 && <span className="absolute top-3 right-3 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span></span>}
                        <div className="flex items-center gap-3 mb-1.5">
                          <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <Clock size={10} /> {new Date(entry.timestamp).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                            <User size={10} /> {entry.userName || 'System Admin'}
                          </div>
                        </div>
                        <div className="text-sm text-slate-700">{entry.reason}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 flex justify-end gap-3 bg-white">
              <button 
                onClick={() => setIsAckModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition text-sm font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={submitAcknowledge}
                disabled={isAckSubmitting}
                className={`px-5 py-2.5 rounded-xl text-white transition text-sm font-bold shadow-sm disabled:opacity-70 flex items-center gap-2 ${deviceToAck?.isAcknowledged ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30' : 'bg-orange-500 hover:bg-orange-600 shadow-orange-500/30'}`}
              >
                {isAckSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                {deviceToAck?.isAcknowledged ? 'Add Update' : 'Confirm ACK'}
              </button>
            </div>
          </div>
        </div>
      )}

      <HistoryModal 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        device={selectedDeviceHistory}
        history={historyData}
        loading={historyLoading}
      />

    </div>
  );
};

export default DeviceList;