import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, Plus, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';

import { deviceService } from '../../services/deviceService';
import { settingService } from '../../services/settingService'; // 🟢 เพิ่ม settingService
import { generateMikrotikScript } from '../../utils/mikrotikGenerator';

import { getDeviceStatus } from './components/deviceHelpers';
import DeviceListToolbar from './components/DeviceListToolbar';
import DeviceTable from './components/DeviceTable';
import AcknowledgeModal from './components/AcknowledgeModal'; 
import HistoryModal from './components/HistoryModal';
import EventLogModal from './components/EventLogModal';

// กำหนดตัวเลือกจำนวนรายการต่อหน้า (เริ่มที่ 5)
const PAGE_SIZES = [5, 10, 20, 50];

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
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(PAGE_SIZES[0]);

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

  // 🟢 ดึงข้อมูลการตั้งค่า (Settings) เพื่อเอามาทำ Thresholds
  const { data: rawSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingService.getSettings(),
  });

  // 🟢 คำนวณ Thresholds เตรียมไว้
  const thresholds = useMemo(() => {
    const defaultTh = { cpu: 85, ram: 85, latency: 80, temp: 60, storage: 85 };
    if (!rawSettings) return defaultTh;
    const alertSetting = rawSettings.find(s => s.key === 'ALERT_THRESHOLDS');
    if (alertSetting && alertSetting.value) {
      try {
        return { ...defaultTh, ...(typeof alertSetting.value === 'string' ? JSON.parse(alertSetting.value) : alertSetting.value) };
      } catch (e) { return defaultTh; }
    }
    return defaultTh;
  }, [rawSettings]);

  const lastUpdatedText = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '...';

  // ==========================================
  // Filtering & Sorting & Pagination Logic
  // ==========================================
  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const searchLower = searchTerm.toLowerCase();
      const modelName = typeof d.model === 'string' ? d.model : (d.model?.name || '');
      const matchesSearch = 
        (d.name?.toLowerCase().includes(searchLower)) || 
        (d.circuitId?.toLowerCase().includes(searchLower)) ||
        (d.ipAddress?.toLowerCase().includes(searchLower)) ||
        (d.boardName?.toLowerCase().includes(searchLower)) || 
        (modelName?.toLowerCase().includes(searchLower));

      const statusObj = getDeviceStatus(d, thresholds); // 🟢 ส่ง thresholds ไปคำนวณสถานะ
      
      if (statusFilter === 'ACTIVE_ONLY') return statusObj.state !== 'deleted' && matchesSearch;
      if (statusFilter === 'ONLINE') return statusObj.state === 'online' && matchesSearch;
      if (statusFilter === 'WARNING') return statusObj.state === 'warning' && matchesSearch;
      if (statusFilter === 'OFFLINE') return statusObj.state === 'offline' && matchesSearch;
      if (statusFilter === 'DELETED') return statusObj.state === 'deleted' && matchesSearch;
      return matchesSearch; 
    });
  }, [devices, searchTerm, statusFilter, thresholds]);

  const sortedDevices = useMemo(() => {
    return [...filteredDevices].sort((a, b) => {
      if (statusFilter === 'ACTIVE_ONLY' || statusFilter === 'ALL') {
        const stateA = getDeviceStatus(a, thresholds).state;
        const stateB = getDeviceStatus(b, thresholds).state;
        
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
  }, [filteredDevices, statusFilter, thresholds]);
  
  // คำนวณหน้าและการหั่นข้อมูล (Pagination)
  const totalPages = Math.ceil(sortedDevices.length / itemsPerPage) || 1;
  const paginatedDevices = useMemo(() => {
    return sortedDevices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [sortedDevices, currentPage, itemsPerPage]);

  const totalFiltered = sortedDevices.length;
  const fromItem = totalFiltered > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const toItem = Math.min(currentPage * itemsPerPage, totalFiltered);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(Math.max(1, totalPages));
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1); 
  }, [searchTerm, statusFilter, itemsPerPage]);

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
      toast.promise(deletePromise, { loading: 'กำลังลบอุปกรณ์...', success: 'ลบอุปกรณ์สำเร็จ!', error: 'ลบอุปกรณ์ไม่สำเร็จ' });
      try { await deletePromise; queryClient.invalidateQueries({ queryKey: ['devices'] }); } catch (e) { console.error(e); }
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
      toast.promise(restorePromise, { loading: 'กำลังกู้คืนอุปกรณ์...', success: 'กู้คืนอุปกรณ์สำเร็จ!', error: 'กู้คืนอุปกรณ์ไม่สำเร็จ' });
      try { await restorePromise; queryClient.invalidateQueries({ queryKey: ['devices'] }); } catch (e) { console.error(e); }
    }
  };

  const handleDownloadLatest = async (device) => { 
    if (!device.configData) return toast.error("ไม่พบข้อมูล Config ของอุปกรณ์นี้");
    
    const processDownload = async () => {
      await deviceService.logDownload(device.id, null); 
      const payloadForGenerator = { ...device.configData, token: device.apiToken };
      const script = generateMikrotikScript(payloadForGenerator);
      
      const element = document.createElement("a");
      element.href = URL.createObjectURL(new Blob([script], {type: 'text/plain'}));
      element.download = `${device.name.replace(/\s+/g, '_')}_latest.rsc`;
      document.body.appendChild(element); 
      element.click();
      document.body.removeChild(element);
    };

    toast.promise(processDownload(), { loading: 'กำลังสร้างสคริปต์...', success: 'ดาวน์โหลดสคริปต์สำเร็จ!', error: 'เกิดข้อผิดพลาดในการสร้างสคริปต์' });
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
      if (cpu > thresholds.cpu) currentWarning.push(`CPU ${cpu}%`);
      if (ram > thresholds.ram) currentWarning.push(`RAM ${ram}%`);
      if (storage > thresholds.storage) currentWarning.push(`Storage ${storage}%`);
      if (temp > thresholds.temp) currentWarning.push(`Temp ${temp}°C`);
      if (latencyMs > thresholds.latency) currentWarning.push(`Ping ${latencyMs}ms`);
    }

    const ackPromise = deviceService.acknowledgeWarning(deviceToAck.id, {
      reason: ackReason,
      warningData: currentWarning.length > 0 ? currentWarning.join(', ') : 'Unknown Load'
    });

    toast.promise(ackPromise, { loading: 'กำลังบันทึกข้อมูล...', success: 'รับทราบสถานะเรียบร้อย!', error: 'ไม่สามารถบันทึกได้ กรุณาลองใหม่' });

    try {
      await ackPromise;
      setIsAckModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (error) { console.error(error); } 
    finally { setIsAckSubmitting(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. Page Header */}
      <div className="space-y-4">
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
          
          <button 
            onClick={handleAddClick} 
            className="shrink-0 bg-blue-50 text-blue-700 px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-100 transition-all font-semibold text-sm border border-blue-100"
          >
            <Plus size={18} strokeWidth={2.5} /> 
            <span>Add New Device</span>
          </button>
        </div>

        <hr className="border-slate-200 mt-2" />
      </div>

      <DeviceListToolbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onRefresh={handleRefresh} loading={loading} />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[450px] md:min-h-[600px] xl:min-h-[700px]">
        <DeviceTable 
          loading={loading} 
          devices={paginatedDevices} 
          canEdit={canEdit} 
          handlers={{ onDownload: handleDownloadLatest, onViewHistory: handleViewHistory, onViewEvents: handleViewEvents, onRestore: handleRestoreClick, onEdit: handleEditClick, onDelete: handleDeleteClick, onAcknowledge: handleAcknowledgeClick }} 
          pageSizes={PAGE_SIZES}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          from={fromItem}
          to={toItem}
          total={totalFiltered}
          thresholds={thresholds} // 🟢 ส่ง thresholds เข้าตาราง
        />
      </div>

      {/* Pagination Controls */}
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
            
            <div className="flex items-center gap-1 px-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
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

      {/* Modals */}
      <AcknowledgeModal isOpen={isAckModalOpen} onClose={() => setIsAckModalOpen(false)} device={deviceToAck} ackReason={ackReason} setAckReason={setAckReason} onSubmit={submitAcknowledge} isSubmitting={isAckSubmitting} thresholds={thresholds} />
      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} device={selectedDeviceHistory} history={historyData} loading={historyLoading} />
      <EventLogModal isOpen={isEventOpen} onClose={() => setIsEventOpen(false)} device={selectedDeviceEvent} events={eventData} loading={eventLoading} />
    </div>
  );
};

export default DeviceList;