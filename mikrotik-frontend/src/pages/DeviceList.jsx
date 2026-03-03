import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';

import { deviceService } from '../services/deviceService';
import { generateMikrotikScript } from '../utils/mikrotikGenerator';

import { getDeviceStatus } from './ConfigWizard/components/device/deviceHelpers';
import DeviceListToolbar from './ConfigWizard/components/device/DeviceListToolbar';
import DeviceTable from './ConfigWizard/components/device/DeviceTable';
import AcknowledgeModal from './ConfigWizard/components/device/AcknowledgeModal'; 
import HistoryModal from './ConfigWizard/components/device/HistoryModal';
import EventLogModal from './ConfigWizard/components/device/EventLogModal';

const DeviceList = () => {
  const navigate = useNavigate();
  const location = useLocation(); 
  const { user } = useAuth(); 
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  
  const queryClient = useQueryClient();

  // ==========================================
  // States
  // ==========================================
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(location.state?.filter || 'ACTIVE_ONLY');
  const [displayLimit, setDisplayLimit] = useState(15);
  const observerTarget = useRef(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedDeviceHistory, setSelectedDeviceHistory] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [isAckModalOpen, setIsAckModalOpen] = useState(false);
  const [deviceToAck, setDeviceToAck] = useState(null);
  const [ackReason, setAckReason] = useState('');
  const [isAckSubmitting, setIsAckSubmitting] = useState(false);
  
  const [isEventOpen, setIsEventOpen] = useState(false);
  const [selectedDeviceEvent, setSelectedDeviceEvent] = useState(null);
  const [eventData, setEventData] = useState([]);
  const [eventLoading, setEventLoading] = useState(false);

  // ==========================================
  // React Query Fetching
  // ==========================================
  const { 
    data: devices = [], 
    isLoading: loading, 
    dataUpdatedAt,
    refetch 
  } = useQuery({
    queryKey: ['devices', user?.id],
    queryFn: () => deviceService.getUserDevices(user?.id || 1),
    refetchInterval: 30000,
    onError: () => toast.error("ดึงข้อมูลอุปกรณ์ไม่สำเร็จ")
  });

  const lastUpdatedText = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '...';

  // ==========================================
  // Effects
  // ==========================================
  useEffect(() => {
    if (location.state?.filter) setStatusFilter(location.state.filter);
  }, [location.state?.filter]);

  useEffect(() => {
    setDisplayLimit(15);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setDisplayLimit((prev) => prev + 15);
    }, { threshold: 0.1 });

    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [loading]);

  // ==========================================
  // Handlers (Actions)
  // ==========================================
  const handleRefresh = () => refetch();
  const handleAddClick = () => navigate('/add-device');
  const handleEditClick = (device) => navigate(`/edit-device/${device.id}`, { state: { deviceData: device } });

  const handleDeleteClick = async (device) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบอุปกรณ์?',
      text: `คุณต้องการลบ "${device.name}" ใช่หรือไม่? (อุปกรณ์จะถูกเปลี่ยนสถานะเป็น Inactive)`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก',
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl p-6 border border-slate-100 shadow-2xl',
        title: 'text-xl font-bold text-slate-800',
        htmlContainer: 'text-sm text-slate-500 font-medium mt-2',
        actions: 'flex gap-3 mt-6 w-full justify-center',
        confirmButton: 'bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-bold transition-all'
      }
    });

    if (result.isConfirmed) {
      const deletePromise = deviceService.deleteDevice(device.id);
      toast.promise(deletePromise, {
        loading: 'กำลังลบอุปกรณ์...',
        success: 'ลบอุปกรณ์สำเร็จ!',
        error: 'ลบอุปกรณ์ไม่สำเร็จ'
      });
      try { 
        await deletePromise;
        queryClient.invalidateQueries({ queryKey: ['devices'] });
      } catch (e) { console.error(e); }
    }
  };

  const handleRestoreClick = async (device) => {
    const result = await Swal.fire({
      title: 'ยืนยันการกู้คืน?',
      text: `คุณต้องการกู้คืนสถานะของ "${device.name}" กลับมาเป็น Active ใช่หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, กู้คืนเลย!',
      cancelButtonText: 'ยกเลิก',
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl p-6 border border-slate-100 shadow-2xl',
        title: 'text-xl font-bold text-slate-800',
        htmlContainer: 'text-sm text-slate-500 font-medium mt-2',
        actions: 'flex gap-3 mt-6 w-full justify-center',
        confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-bold transition-all'
      }
    });

    if (result.isConfirmed) {
      const restorePromise = deviceService.restoreDevice(device.id);
      toast.promise(restorePromise, {
        loading: 'กำลังกู้คืนอุปกรณ์...',
        success: 'กู้คืนอุปกรณ์สำเร็จ!',
        error: 'กู้คืนอุปกรณ์ไม่สำเร็จ'
      });
      try { 
        await restorePromise;
        queryClient.invalidateQueries({ queryKey: ['devices'] });
      } catch (e) { console.error(e); }
    }
  };

  const handleDownloadLatest = async (device) => { 
    if (!device.configData) return toast.error("ไม่พบข้อมูล Config ของอุปกรณ์นี้");
    const processDownload = async () => {
      await deviceService.logDownload(device.id, null); 
      const script = generateMikrotikScript(device.configData);
      const element = document.createElement("a");
      element.href = URL.createObjectURL(new Blob([script], {type: 'text/plain'}));
      element.download = `${device.name.replace(/\s+/g, '_')}_latest.rsc`;
      document.body.appendChild(element); 
      element.click();
      document.body.removeChild(element);
    };
    toast.promise(processDownload(), {
      loading: 'กำลังสร้างสคริปต์...',
      success: 'ดาวน์โหลดสคริปต์สำเร็จ!',
      error: 'เกิดข้อผิดพลาดในการสร้างสคริปต์'
    });
  };

  const handleViewHistory = async (device) => {
    setSelectedDeviceHistory(device);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await deviceService.getDeviceHistory(device.id);
      setHistoryData(data);
    } catch (error) { toast.error("โหลดประวัติไม่สำเร็จ"); } 
    finally { setHistoryLoading(false); }
  };

  const handleViewEvents = async (device) => {
    setSelectedDeviceEvent(device);
    setIsEventOpen(true);
    setEventLoading(true);
    try {
      const data = await deviceService.getDeviceEvents(device.id);
      setEventData(data);
    } catch (error) { toast.error("โหลดประวัติเหตุการณ์ไม่สำเร็จ"); } 
    finally { setEventLoading(false); }
  };

  const handleAcknowledgeClick = (device) => {
    setDeviceToAck(device);
    setAckReason(''); 
    setIsAckModalOpen(true);
  };

  const submitAcknowledge = async () => {
    if (!ackReason.trim()) return toast.error("กรุณากรอกข้อมูลการอัปเดต หรือเหตุผล");
    setIsAckSubmitting(true);
    
    // ✅ เพิ่มการเช็ค Storage และ Offline เข้าไปด้วย
    const diffMinutes = deviceToAck?.lastSeen ? (new Date() - new Date(deviceToAck.lastSeen)) / 1000 / 60 : 999;
    const isOffline = diffMinutes > 3;

    const cpu = parseFloat(deviceToAck?.cpu || deviceToAck?.cpuLoad) || 0;
    const ram = parseFloat(deviceToAck?.ram || deviceToAck?.memoryUsage) || 0;
    const storage = parseFloat(deviceToAck?.storage) || 0;
    
    let currentWarning = [];
    if (isOffline) {
      currentWarning.push("Offline");
    } else {
      if (cpu > 85) currentWarning.push(`CPU ${cpu}%`);
      if (ram > 85) currentWarning.push(`RAM ${ram}%`);
      if (storage > 85) currentWarning.push(`Storage ${storage}%`);
    }

    const ackPromise = deviceService.acknowledgeWarning(deviceToAck.id, {
      reason: ackReason,
      warningData: currentWarning.length > 0 ? currentWarning.join(', ') : 'Unknown Load'
    });

    toast.promise(ackPromise, {
      loading: 'กำลังบันทึกข้อมูล...',
      success: 'รับทราบสถานะเรียบร้อย!',
      error: 'ไม่สามารถบันทึกได้ กรุณาลองใหม่'
    });

    try {
      await ackPromise;
      setIsAckModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (error) { console.error(error); } 
    finally { setIsAckSubmitting(false); }
  };

  // ==========================================
  // Filtering Logic
  // ==========================================
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

  // ==========================================
  // Render
  // ==========================================
  return (
    <div className="space-y-6 animate-fade-in pb-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Activity className="text-blue-600" /> Managed Routers
          </h2>
          <p className="text-slate-500 mt-1">
            Monitor and manage your MikroTik devices 
            (Last updated: {lastUpdatedText})
          </p>
        </div>
        <button onClick={handleAddClick} className="bg-blue-600 text-white w-full md:w-auto px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 shadow-sm transition-all font-medium shrink-0">
          <Plus size={20} /> Add New Device
        </button>
      </div>

      <DeviceListToolbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onRefresh={handleRefresh} loading={loading} />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <DeviceTable loading={loading} devices={displayedDevices} filteredCount={filteredDevices.length} displayLimit={displayLimit} observerTarget={observerTarget} canEdit={canEdit} handlers={{ onDownload: handleDownloadLatest, onViewHistory: handleViewHistory, onViewEvents: handleViewEvents, onRestore: handleRestoreClick, onEdit: handleEditClick, onDelete: handleDeleteClick, onAcknowledge: handleAcknowledgeClick }} />
      </div>

      <AcknowledgeModal isOpen={isAckModalOpen} onClose={() => setIsAckModalOpen(false)} device={deviceToAck} ackReason={ackReason} setAckReason={setAckReason} onSubmit={submitAcknowledge} isSubmitting={isAckSubmitting} />
      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} device={selectedDeviceHistory} history={historyData} loading={historyLoading} />
      <EventLogModal isOpen={isEventOpen} onClose={() => setIsEventOpen(false)} device={selectedDeviceEvent} events={eventData} loading={eventLoading} />
    </div>
  );
};

export default DeviceList;