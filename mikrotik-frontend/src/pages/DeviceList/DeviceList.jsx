import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { Activity, Plus, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';

import { deviceService } from '../../services/deviceService';
import { settingService } from '../../services/settingService';
import { generateMikrotikScript } from '../../utils/mikrotikGenerator';
import { generateMikrotikScriptV6 } from '../../utils/mikrotikGeneratorV6';

import { getDeviceStatus } from './components/deviceHelpers';
import DeviceListToolbar from './components/DeviceListToolbar';
import DeviceTable from './components/DeviceTable';
import AcknowledgeModal from './components/AcknowledgeModal'; 
import HistoryModal from './components/HistoryModal';
import EventLogModal from './components/EventLogModal';
import Pagination from '../../components/Pagination';

// กำหนดตัวเลือกจำนวนรายการต่อหน้า (เริ่มที่ 5)
const PAGE_SIZES = [5, 10, 20, 50];

const DeviceList = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { openWizard } = useOutletContext(); // ดึงฟังก์ชันเปิด Wizard จาก Layout
  const { user } = useAuth(); 
  const canEdit = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  
  const queryClient = useQueryClient();

  // ==========================================
  // States
  // ==========================================
  const [searchTerm, setSearchTerm] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('search') || '';
  });
  
  const [statusFilter, setStatusFilter] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('filter') || location.state?.filter || 'ACTIVE_ONLY';
  });

  // อัปเดต State เมื่อ URL เปลี่ยน (กรณีลิงก์จากหน้าเดิมไปหน้าเดิมแต่เปลี่ยน Parameter)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlSearch = params.get('search');
    const urlFilter = params.get('filter');
    
    if (urlSearch !== null) setSearchTerm(urlSearch);
    if (urlFilter !== null) setStatusFilter(urlFilter);
  }, [location.search]);
  
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
    onError: () => toast.error(t('devices.fetchError', 'ดึงข้อมูลอุปกรณ์ไม่สำเร็จ'))
  });

  const { data: rawSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingService.getSettings(),
  });

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

  const lastUpdatedText = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString(i18n.language) : '...';

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

      const statusObj = getDeviceStatus(d, thresholds, t);
      
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
  const handleAddClick = () => openWizard('create');
  const handleEditClick = (device) => openWizard('edit', device);

  const handleDeleteClick = async (device) => {
    const result = await Swal.fire({
      title: t('devices.actions.deleteConfirmTitle'),
      text: t('devices.actions.deleteConfirmText', { name: device.name }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('common.yesDelete', 'Yes, delete it!'),
      cancelButtonText: t('common.cancel'),
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
        loading: t('devices.actions.deleting'), 
        success: t('devices.actions.deleteSuccess'), 
        error: t('devices.actions.deleteError') 
      });
      try { await deletePromise; queryClient.invalidateQueries({ queryKey: ['devices'] }); } catch (e) { console.error(e); }
    }
  };

  const handleRestoreClick = async (device) => {
    const result = await Swal.fire({
      title: t('devices.actions.restoreConfirmTitle'),
      text: t('devices.actions.restoreConfirmText', { name: device.name }),
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: t('common.yesRestore', 'Yes, restore it!'),
      cancelButtonText: t('common.cancel'),
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
        loading: t('devices.actions.restoring'), 
        success: t('devices.actions.restoreSuccess'), 
        error: t('devices.actions.restoreError') 
      });
      try { await restorePromise; queryClient.invalidateQueries({ queryKey: ['devices'] }); } catch (e) { console.error(e); }
    }
  };

  // 🟢 ฟังก์ชัน Hard Delete สำหรับลบถาวร
  const handleHardDeleteClick = async (device) => {
    const result = await Swal.fire({
      title: t('devices.actions.hardDeleteConfirmTitle'),
      text: t('devices.actions.hardDeleteConfirmText', { name: device.name }),
      icon: 'error',
      showCancelButton: true,
      confirmButtonText: t('common.yesHardDelete', 'Yes, delete permanently!'),
      cancelButtonText: t('common.cancel'),
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl p-6 border border-slate-100 shadow-2xl',
        title: 'text-xl font-bold text-red-600',
        htmlContainer: 'text-sm text-slate-500 font-medium mt-2',
        actions: 'flex gap-3 mt-6 w-full justify-center',
        confirmButton: 'bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-bold transition-all'
      }
    });

    if (result.isConfirmed) {
      const hardDeletePromise = deviceService.hardDeleteDevice(device.id);
      toast.promise(hardDeletePromise, { 
        loading: t('devices.actions.hardDeleting'), 
        success: t('devices.actions.hardDeleteSuccess'), 
        error: t('devices.actions.hardDeleteError') 
      });
      try { await hardDeletePromise; queryClient.invalidateQueries({ queryKey: ['devices'] }); } catch (e) { console.error(e); }
    }
  };

  const handleDownloadLatest = async (device) => { 
    if (!device.configData) return toast.error(t('devices.actions.noConfigData'));
    
    const result = await Swal.fire({
      title: t('devices.actions.selectOsTitle'),
      text: t('devices.actions.selectOsText'),
      icon: 'question',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: t('devices.actions.rosV7'),
      denyButtonText: t('devices.actions.rosV6'),
      cancelButtonText: t('common.cancel'),
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl p-6 border border-slate-100 shadow-2xl',
        title: 'text-xl font-bold text-slate-800',
        htmlContainer: 'text-sm text-slate-500 font-medium mt-2',
        actions: 'flex flex-wrap gap-2 mt-6 w-full justify-center',
        confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all',
        denyButton: 'bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-bold transition-all w-full sm:w-auto mt-2 sm:mt-0'
      }
    });

    if (!result.isConfirmed && !result.isDenied) return; 
    
    const isV6 = result.isDenied; 

    const processDownload = async () => {
      await deviceService.logDownload(device.id, null); 
      const payloadForGenerator = { ...device.configData, token: device.apiToken };
      const script = isV6 ? generateMikrotikScriptV6(payloadForGenerator) : generateMikrotikScript(payloadForGenerator);
      
      const element = document.createElement("a");
      element.href = URL.createObjectURL(new Blob([script], {type: 'text/plain'}));
      element.download = `${device.name.replace(/\s+/g, '_')}_latest_${isV6 ? 'v6' : 'v7'}.rsc`;
      document.body.appendChild(element); 
      element.click();
      document.body.removeChild(element);
    };

    toast.promise(processDownload(), { 
      loading: t('devices.actions.generatingScript'), 
      success: t('devices.actions.downloadSuccess', { version: isV6 ? 'v6' : 'v7' }), 
      error: t('devices.actions.downloadError') 
    });
  };

  const handleViewHistory = async (device) => {
    setSelectedDeviceHistory(device);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const data = await deviceService.getDeviceHistory(device.id);
      setHistoryData(data);
    } catch (error) { toast.error(t('devices.actions.historyLoadError')); } 
    finally { setHistoryLoading(false); }
  };

  const handleViewEvents = async (device) => {
    setSelectedDeviceEvent(device);
    setIsEventOpen(true);
    setEventLoading(true);
    try {
      const data = await deviceService.getDeviceEvents(device.id);
      setEventData(data);
    } catch (error) { toast.error(t('devices.actions.eventLoadError')); } 
    finally { setEventLoading(false); }
  };

  const handleAcknowledgeClick = (device) => {
    setDeviceToAck(device);
    setAckReason(''); 
    setIsAckModalOpen(true);
  };

  const submitAcknowledge = async () => {
    if (!ackReason.trim()) return toast.error(t('devices.actions.ackReasonRequired'));
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

    toast.promise(ackPromise, { 
      loading: t('common.saving'), 
      success: t('devices.actions.ackSuccess'), 
      error: t('common.saveError') 
    });

    try {
      await ackPromise;
      setIsAckModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (error) { console.error(error); } 
    finally { setIsAckSubmitting(false); }
  };

  // 🟢 เปลี่ยนมาใช้โครงสร้างที่สมดุลกับ Dashboard (ลบ max-w-6xl และ Margin ที่ซ้ำซ้อนออก)
  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* 1. Page Header Section (Island Card) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Activity className="text-blue-600" size={28} /> 
            {t('devices.title')}
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium italic">
            {t('devices.subtitle')} ({t('devices.last_updated')}: <span className="font-semibold text-slate-700">{lastUpdatedText}</span>)
          </p>
        </div>
        
        <div className="relative z-10">
          <button 
            onClick={handleAddClick} 
            className="shrink-0 bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all font-bold text-sm shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} strokeWidth={2.5} /> 
            <span>{t('devices.addNew')}</span>
          </button>
        </div>

        {/* Accent Blur */}
        <div className="absolute right-0 top-0 w-48 h-48 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-100/50 transition-colors duration-700"></div>
      </div>

      <DeviceListToolbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onRefresh={handleRefresh} loading={loading} />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[450px] md:min-h-[600px] xl:min-h-[700px]">
        <DeviceTable 
          loading={loading} 
          devices={paginatedDevices} 
          canEdit={canEdit} 
          handlers={{ onDownload: handleDownloadLatest, onViewHistory: handleViewHistory, onViewEvents: handleViewEvents, onRestore: handleRestoreClick, onEdit: handleEditClick, onDelete: handleDeleteClick, onHardDelete: handleHardDeleteClick, onAcknowledge: handleAcknowledgeClick }} 
          pageSizes={PAGE_SIZES}
          itemsPerPage={itemsPerPage}
          setItemsPerPage={setItemsPerPage}
          from={fromItem}
          to={toItem}
          total={totalFiltered}
          thresholds={thresholds} 
        />
      </div>

      <Pagination 
        currentPage={currentPage} 
        totalPages={totalPages} 
        setCurrentPage={setCurrentPage} 
      />

      {/* Modals */}
      <AcknowledgeModal isOpen={isAckModalOpen} onClose={() => setIsAckModalOpen(false)} device={deviceToAck} ackReason={ackReason} setAckReason={setAckReason} onSubmit={submitAcknowledge} isSubmitting={isAckSubmitting} thresholds={thresholds} />
      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} device={selectedDeviceHistory} history={historyData} loading={historyLoading} />
      <EventLogModal isOpen={isEventOpen} onClose={() => setIsEventOpen(false)} device={selectedDeviceEvent} events={eventData} loading={eventLoading} />
    </div>
  );
};

export default DeviceList;