import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import { generateMikrotikScript } from '../utils/mikrotikGenerator';
import HistoryModal from './HistoryModal'; // ⚠️ อย่าลืมสร้างไฟล์นี้ (โค้ดอยู่ด้านล่าง)
import { 
  Search, Plus, RefreshCw, Server, Activity, 
  Clock, Settings, Trash2, Cpu, Zap, Download, History
} from 'lucide-react';

const DeviceList = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // State สำหรับ History Modal
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedDeviceHistory, setSelectedDeviceHistory] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 1. Fetch Device List
  const fetchDevices = async () => {
    // ไม่ set loading true ตรงนี้เพื่อให้เวลามัน auto refresh หน้าจอไม่กระพริบ
    try {
      const res = await apiClient.get('/api/devices/user/1'); // Hardcode user 1 ไว้ก่อน
      setDevices(res.data);
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    const interval = setInterval(fetchDevices, 30000); // Auto Refresh ทุก 30 วิ
    return () => clearInterval(interval);
  }, []);

  // 2. Actions
  const handleAddClick = () => navigate('/add-device');
  
  const handleEditClick = (device) => {
    navigate(`/edit-device/${device.id}`, { state: { deviceData: device } });
  };

  const handleDeleteClick = async (id) => {
    if (confirm("Are you sure you want to delete this device? This cannot be undone.")) {
        try {
            // สมมติว่ามี API Delete (คุณอาจต้องไปเพิ่มใน backend หรือใช้การเปลี่ยน status แทน)
            // await apiClient.delete(`/api/devices/${id}`);
            alert("Delete feature coming soon (Soft Delete recommended)");
        } catch (e) {
            console.error(e);
        }
    }
  };

  // 3. Download Latest Config
  const handleDownloadLatest = (device) => {
    if (!device.configData) return alert("No configuration data found for this device.");
    
    try {
      // แปลงข้อมูลเป็น Script
      const script = generateMikrotikScript(device.configData);
      
      // สร้างไฟล์และดาวน์โหลด
      const element = document.createElement("a");
      const file = new Blob([script], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `${device.name.replace(/\s+/g, '_')}_latest.rsc`;
      document.body.appendChild(element); 
      element.click();
      document.body.removeChild(element);
    } catch (err) {
      console.error("Gen script failed:", err);
      alert("Failed to generate script");
    }
  };

  // 4. View History
  const handleViewHistory = async (device) => {
    setSelectedDeviceHistory(device);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryData([]);

    try {
      // เรียก API ดึงประวัติ (ที่เราเพิ่งแก้ Controller ไป)
      const res = await apiClient.get(`/api/devices/${device.id}/history`);
      setHistoryData(res.data);
    } catch (error) {
      console.error("Fetch history failed:", error);
      alert("Failed to load history");
    } finally {
      setHistoryLoading(false);
    }
  };

  // Helper: Color for Progress Bar
  const getProgressColor = (value, type) => {
    if (!value) return 'bg-slate-200';
    if (value > 80) return 'bg-red-500';
    if (value > 50) return 'bg-orange-400';
    return type === 'cpu' ? 'bg-blue-500' : 'bg-green-500';
  };

  // Filter
  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.circuitId && d.circuitId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* --- Header & Search (เหมือนเดิม) --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Managed Routers</h2>
          <p className="text-slate-500">Monitor and manage your MikroTik devices</p>
        </div>
        <button 
          onClick={handleAddClick}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 shadow-sm transition-all font-medium"
        >
          <Plus size={20} /> Add New Device
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Search by Name, Circuit ID..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button onClick={() => { setLoading(true); fetchDevices(); }} className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition">
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      {/* --- Device Table --- */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">Loading devices...</div>
        ) : filteredDevices.length === 0 ? (
          <div className="p-10 text-center text-slate-400 flex flex-col items-center">
            <Server size={48} className="mb-4 text-slate-200" />
            <p>No devices found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                  <th className="p-4 pl-6 w-24">Status</th>
                  <th className="p-4 w-64">Device Details</th>
                  <th className="p-4 w-40">Resources</th>
                  <th className="p-4 w-32">IP Address</th>
                  <th className="p-4 w-40">Uptime / Seen</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-slate-50 transition group">
                    
                    {/* 1. Status */}
                    <td className="p-4 pl-6 align-top">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        device.isOnline 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${device.isOnline ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                        {device.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>

                    {/* 2. Details */}
                    <td className="p-4 align-top">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-1">
                          <Server size={20} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-700">{device.name}</div>
                          <div className="text-xs text-slate-500 font-mono mb-1">{device.circuitId || '-'}</div>
                          {device.version && (
                            <span className="inline-block text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                              v{device.version}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 3. Resources */}
                    <td className="p-4 align-top">
                      {device.isOnline ? (
                        <div className="space-y-3 min-w-[120px]">
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                              <span className="flex items-center gap-1"><Cpu size={10} /> CPU</span>
                              <span className="font-medium">{device.cpuLoad || 0}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-500 ${getProgressColor(device.cpuLoad, 'cpu')}`} style={{ width: `${device.cpuLoad || 0}%` }}></div>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                              <span className="flex items-center gap-1"><Zap size={10} /> RAM</span>
                              <span className="font-medium">{device.memoryUsage || 0}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full transition-all duration-500 ${getProgressColor(device.memoryUsage, 'ram')}`} style={{ width: `${device.memoryUsage || 0}%` }}></div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">- No Data -</span>
                      )}
                    </td>

                    {/* 4. IP */}
                    <td className="p-4 align-top">
                      <div className="text-slate-600 font-mono text-sm mt-1">{device.currentIp || '-'}</div>
                    </td>

                    {/* 5. Uptime */}
                    <td className="p-4 align-top">
                      <div className="flex flex-col gap-1">
                         <div className="text-xs text-slate-700 font-medium" title="Device Uptime">
                           {device.uptime ? `Up: ${device.uptime}` : '-'}
                         </div>
                         <div className="flex items-center gap-1 text-[10px] text-slate-400" title="Last Contact Time">
                           <Clock size={10} />
                           {device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : 'Never'}
                         </div>
                      </div>
                    </td>

                    {/* 6. Actions (Buttons) */}
                    <td className="p-4 align-top text-right pr-6">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        
                        {/* Download Latest */}
                        <button 
                          onClick={() => handleDownloadLatest(device)}
                          className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                          title="Download Latest Config"
                        >
                          <Download size={18} />
                        </button>

                        {/* History */}
                        <button 
                          onClick={() => handleViewHistory(device)}
                          className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                          title="View Config History"
                        >
                          <History size={18} />
                        </button>

                        {/* Edit */}
                        <button 
                          onClick={() => handleEditClick(device)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Config"
                        >
                          <Settings size={18} />
                        </button>

                        {/* Delete */}
                        <button 
                          onClick={() => handleDeleteClick(device.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- History Modal --- */}
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