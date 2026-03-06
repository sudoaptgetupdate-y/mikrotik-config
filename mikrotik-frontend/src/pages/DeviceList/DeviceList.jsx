import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Plus, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';

import { deviceService } from '../../services/deviceService';
import { generateMikrotikScript } from '../../utils/mikrotikGenerator';

import { getDeviceStatus } from './components/deviceHelpers';
import DeviceListToolbar from './components/DeviceListToolbar';
import DeviceTable from './components/DeviceTable';
import AcknowledgeModal from './components/AcknowledgeModal'; 
import HistoryModal from './components/HistoryModal';
import EventLogModal from './components/EventLogModal';

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
  // Filtering & Sorting Logic
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

  const sortedDevices = filteredDevices.sort((a, b) => {
    if (statusFilter === 'ACTIVE_ONLY' || statusFilter === 'ALL') {
      const stateA = getDeviceStatus(a).state;
      const stateB = getDeviceStatus(b).state;
      
      const priority = {
        'offline': 1,
        'warning': 2,
        'online': 3,
        'acknowledged': 4,
        'deleted': 5
      };
      
      const rankA = priority[stateA] || 99;
      const rankB = priority[stateB] || 99;
      
      if (rankA !== rankB) {
        return rankA - rankB;
      }
    }
    return 0; 
  });
  
  const displayedDevices = sortedDevices.slice(0, displayLimit);

  // ==========================================
  // 🟢 Infinite Scroll Logic (ส่วนที่เพิ่มเข้ามา)
  // ==========================================
  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // เมื่อเป้าหมาย (ด้านล่างตาราง) โผล่เข้ามาในหน้าจอ และยังมีข้อมูลเหลือให้โหลด
        if (entries[0].isIntersecting && displayLimit < filteredDevices.length) {
          setDisplayLimit((prev) => prev + 15);
        }
      },
      { threshold: 0.1, rootMargin: '100px' } // เผื่อระยะโหลดล่วงหน้า 100px ก่อนไถถึงล่างสุด
    );

    observer.observe(target);

    return () => {
      if (target) observer.unobserve(target);
    };
  }, [loading, filteredDevices.length, displayLimit]);

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
      
      const payloadForGenerator = {
        ...device.configData,
        token: device.apiToken 
      };

      const script = generateMikrotikScript(payloadForGenerator);
      
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
    
    const diffMinutes = deviceToAck?.lastSeen ? (new Date() - new Date(deviceToAck.lastSeen)) / 1000 / 60 : 999;
    const isOffline = diffMinutes > 3;

    const cpu = parseFloat(deviceToAck?.cpu || deviceToAck?.cpuLoad) || 0;
    const ram = parseFloat(deviceToAck?.ram || deviceToAck?.memoryUsage) || 0;
    const storage = parseFloat(deviceToAck?.storage) || 0;
    const temp = parseFloat(deviceToAck?.temp || 0);

    let latencyMs = 0;
    if (deviceToAck?.latency === "timeout") {
      latencyMs = 999;
    } else if (deviceToAck?.latency) {
      const str = String(deviceToAck.latency).toLowerCase();
      if (str.includes(':')) {
        const parts = str.split(':');
        const secAndMs = parts[parts.length - 1];
        if (secAndMs.includes('.')) {
          const [sec, frac] = secAndMs.split('.');
          latencyMs = (parseInt(sec, 10) * 1000) + parseInt(frac.padEnd(3, '0').substring(0,3), 10);
        } else {
          latencyMs = parseInt(secAndMs, 10) * 1000;
        }
      } else {
        const num = parseFloat(str.replace(/[^0-9.]/g, ''));
        if (str.includes('us')) latencyMs = Math.round(num / 1000);
        else if (str.includes('s') && !str.includes('ms')) latencyMs = Math.round(num * 1000);
        else latencyMs = Math.round(num);
      }
    }
    
    let currentWarning = [];
    if (isOffline) {
      currentWarning.push("Offline");
    } else {
      if (cpu > 85) currentWarning.push(`CPU ${cpu}%`);
      if (ram > 85) currentWarning.push(`RAM ${ram}%`);
      if (storage > 85) currentWarning.push(`Storage ${storage}%`);
      if (temp > 60) currentWarning.push(`Temp ${temp}°C`);
      if (latencyMs > 80) currentWarning.push(`Ping ${latencyMs}ms`);
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

  return (
    <div className="space-y-6 pb-28 animate-in fade-in duration-500">
      
      {/* 1. Page Header (แบบ Classic & Clean) */}
      <div className="space-y-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm font-medium text-slate-500 gap-2">
          <a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-400">Device Management</span>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-800">Managed Routers</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Activity className="text-blue-600" size={28} /> 
              Managed Routers
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              ติดตามสถานะและจัดการอุปกรณ์ MikroTik ในระบบ (อัปเดตล่าสุด: <span className="font-semibold text-slate-700">{lastUpdatedText}</span>)
            </p>
          </div>
          
          {/* ปุ่ม Create สไตล์ Soft/Tonal */}
          <button 
            onClick={handleAddClick} 
            className="shrink-0 bg-blue-50 text-blue-700 px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-100 transition-all font-semibold text-sm border border-blue-100"
          >
            <Plus size={18} strokeWidth={2.5} /> 
            <span>Add New Device</span>
          </button>
        </div>

        {/* เส้นกั้น Solid Divider */}
        <hr className="border-slate-200 mt-2" />
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