import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Plus } from 'lucide-react';
import apiClient from '../utils/apiClient';
import { generateMikrotikScript } from '../utils/mikrotikGenerator';
import { useAuth } from '../context/AuthContext';

// นำเข้า Components ย่อยที่เราเพิ่งแยก
import { getDeviceStatus } from './ConfigWizard/components/device/deviceHelpers';
import DeviceListToolbar from './ConfigWizard/components/device/DeviceListToolbar';
import DeviceTable from './ConfigWizard/components/device/DeviceTable';
import AcknowledgeModal from './ConfigWizard/components/device/AcknowledgeModal'; 
import HistoryModal from './ConfigWizard/components/device/HistoryModal';

const DeviceList = () => {
  const navigate = useNavigate();
  const location = useLocation(); 
  const { user } = useAuth(); 
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(location.state?.filter || 'ACTIVE_ONLY');

  // Infinite Scroll States
  const [displayLimit, setDisplayLimit] = useState(15);
  const observerTarget = useRef(null);

  // Modal States
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedDeviceHistory, setSelectedDeviceHistory] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [isAckModalOpen, setIsAckModalOpen] = useState(false);
  const [deviceToAck, setDeviceToAck] = useState(null);
  const [ackReason, setAckReason] = useState('');
  const [isAckSubmitting, setIsAckSubmitting] = useState(false);

  // --- Effects ---
  useEffect(() => {
    if (location.state?.filter) setStatusFilter(location.state.filter);
  }, [location.state?.filter]);

  useEffect(() => {
    setDisplayLimit(15);
  }, [searchTerm, statusFilter]);

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
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setDisplayLimit((prev) => prev + 15);
    }, { threshold: 0.1 });

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [loading]);

  // --- Handlers ---
  const handleRefresh = () => {
    setLoading(true);
    fetchDevices();
  };

  const handleAddClick = () => navigate('/add-device');
  const handleEditClick = (device) => navigate(`/edit-device/${device.id}`, { state: { deviceData: device } });

  const handleDeleteClick = async (device) => {
    if (confirm(`Are you sure you want to delete "${device.name}"? (It will be marked as inactive)`)) {
        try { await apiClient.delete(`/api/devices/${device.id}`); fetchDevices(); } 
        catch (e) { alert("Failed to delete device"); }
    }
  };

  const handleRestoreClick = async (device) => {
    if (confirm(`Are you sure you want to restore "${device.name}" to active status?`)) {
        try { await apiClient.put(`/api/devices/${device.id}/restore`); fetchDevices(); } 
        catch (e) { alert("Failed to restore device"); }
    }
  };

  const handleDownloadLatest = async (device) => { 
    if (!device.configData) return alert("No configuration data found for this device.");
    try {
      await apiClient.post(`/api/devices/${device.id}/log-download`, {});
      const script = generateMikrotikScript(device.configData);
      const element = document.createElement("a");
      element.href = URL.createObjectURL(new Blob([script], {type: 'text/plain'}));
      element.download = `${device.name.replace(/\s+/g, '_')}_latest.rsc`;
      document.body.appendChild(element); 
      element.click();
      document.body.removeChild(element);
    } catch (err) { alert("Failed to generate script"); }
  };

  const handleViewHistory = async (device) => {
    setSelectedDeviceHistory(device);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const res = await apiClient.get(`/api/devices/${device.id}/history`);
      setHistoryData(res.data);
    } catch (error) { alert("Failed to load history"); } 
    finally { setHistoryLoading(false); }
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
      const cpu = parseFloat(deviceToAck?.cpu || deviceToAck?.cpuLoad) || 0;
      const ram = parseFloat(deviceToAck?.ram || deviceToAck?.memoryUsage) || 0;
      let currentWarning = [];
      if (cpu > 85) currentWarning.push(`CPU ${cpu}%`);
      if (ram > 85) currentWarning.push(`RAM ${ram}%`);

      await apiClient.post(`/api/devices/${deviceToAck.id}/acknowledge`, {
        reason: ackReason,
        warningData: currentWarning.length > 0 ? currentWarning.join(', ') : 'Unknown Load'
      });
      setIsAckModalOpen(false);
      fetchDevices();
    } catch (error) { alert("Failed to acknowledge warning"); } 
    finally { setIsAckSubmitting(false); }
  };

  // --- Filtering Logic ---
  const filteredDevices = devices.filter(d => {
    const searchLower = searchTerm.toLowerCase();
    const modelName = typeof d.model === 'string' ? d.model : (d.model?.name || '');
    const matchesSearch = 
      (d.name?.toLowerCase().includes(searchLower)) || 
      (d.circuitId?.toLowerCase().includes(searchLower)) ||
      (d.ipAddress?.toLowerCase().includes(searchLower)) ||
      (d.boardName?.toLowerCase().includes(searchLower)) || 
      (modelName?.toLowerCase().includes(searchLower));

    const statusObj = getDeviceStatus(d);
    
    if (statusFilter === 'ACTIVE_ONLY') return statusObj.state !== 'deleted' && matchesSearch;
    if (statusFilter === 'ONLINE') return statusObj.state === 'online' && matchesSearch;
    if (statusFilter === 'WARNING') return statusObj.state === 'warning' && matchesSearch;
    if (statusFilter === 'OFFLINE') return statusObj.state === 'offline' && matchesSearch;
    if (statusFilter === 'DELETED') return statusObj.state === 'deleted' && matchesSearch;
    return matchesSearch; 
  });

  const displayedDevices = filteredDevices.slice(0, displayLimit);

  return (
    <div className="space-y-6 animate-fade-in pb-4">
      
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
          className="bg-blue-600 text-white w-full md:w-auto px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 shadow-sm transition-all font-medium shrink-0"
        >
          <Plus size={20} /> Add New Device
        </button>
      </div>

      <DeviceListToolbar 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onRefresh={handleRefresh}
        loading={loading}
      />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <DeviceTable 
          loading={loading}
          devices={displayedDevices}
          filteredCount={filteredDevices.length}
          displayLimit={displayLimit}
          observerTarget={observerTarget}
          canEdit={canEdit}
          handlers={{
            onDownload: handleDownloadLatest,
            onViewHistory: handleViewHistory,
            onRestore: handleRestoreClick,
            onEdit: handleEditClick,
            onDelete: handleDeleteClick,
            onAcknowledge: handleAcknowledgeClick
          }}
        />
      </div>

      <AcknowledgeModal 
        isOpen={isAckModalOpen}
        onClose={() => setIsAckModalOpen(false)}
        device={deviceToAck}
        ackReason={ackReason}
        setAckReason={setAckReason}
        onSubmit={submitAcknowledge}
        isSubmitting={isAckSubmitting}
      />
      
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