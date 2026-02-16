import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ เรียกใช้ Hook สำหรับเปลี่ยนหน้า
import apiClient from '../utils/apiClient';
import { 
  Search, Plus, RefreshCw, Server, Activity, 
  Clock, MoreVertical, Settings, Trash2 
} from 'lucide-react';

const DeviceList = () => {
  const navigate = useNavigate(); // ✅ สร้าง function navigate
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // ฟังก์ชันดึงข้อมูล (เหมือนเดิม)
  const fetchDevices = async () => {
    setLoading(true);
    try {
      // Hardcode userId=1 ไปก่อน (อนาคตค่อยดึงจาก Auth Context)
      const res = await apiClient.get('/api/devices/user/1');
      setDevices(res.data);
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // ✅ ฟังก์ชันกดปุ่ม Add Device -> ไปหน้า /add-device
  const handleAddClick = () => {
    navigate('/add-device');
  };

  // ✅ ฟังก์ชันกดปุ่ม Edit -> ไปหน้า /edit-device/:id
  const handleEditClick = (device) => {
    // ส่ง object device ไปด้วยผ่าน state ไม่ต้องไป fetch ใหม่ในหน้า edit
    navigate(`/edit-device/${device.id}`, { state: { deviceData: device } });
  };

  // Filter Search
  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.circuitId && d.circuitId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Managed Routers</h2>
          <p className="text-slate-500">Monitor and manage your MikroTik devices</p>
        </div>
        <button 
          onClick={handleAddClick} // ✅ เรียกใช้ handleAddClick
          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200 transition-all font-medium"
        >
          <Plus size={20} /> Add New Device
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Search by Name, Circuit ID..."
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={fetchDevices}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg border border-slate-200 transition"
        >
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      {/* Device Table */}
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
                  <th className="p-4 pl-6">Status</th>
                  <th className="p-4">Device Name</th>
                  <th className="p-4">Circuit ID</th>
                  <th className="p-4">IP Address</th>
                  <th className="p-4">Last Seen</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-slate-50 transition group">
                    <td className="p-4 pl-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        device.isOnline 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${device.isOnline ? 'bg-green-500' : 'bg-slate-400'}`}></span>
                        {device.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Server size={18} />
                        </div>
                        {device.name}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 font-mono text-sm">{device.circuitId || '-'}</td>
                    <td className="p-4 text-slate-600 font-mono text-sm">{device.currentIp || '-'}</td>
                    <td className="p-4 text-slate-500 text-sm">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : 'Never'}
                      </div>
                    </td>
                    <td className="p-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditClick(device)} // ✅ ปุ่ม Edit
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Edit Config"
                        >
                          <Settings size={18} />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
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
    </div>
  );
};

export default DeviceList;