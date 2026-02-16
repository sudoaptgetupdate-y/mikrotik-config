import { useState, useEffect } from 'react';
import { 
  Plus, Router, Activity, LayoutDashboard, Send, X, 
  FileDown, Settings 
} from 'lucide-react';
import apiClient from '../utils/apiClient'; // ✅ ใช้ apiClient แทน axios
import { generateMikrotikScript } from '../utils/mikrotikGenerator'; // Import Generator

const DeviceList = ({ userId, onDeviceCreated, onEditDevice }) => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [circuitId, setCircuitId] = useState('');

  const fetchDevices = async () => {
    try {
      // ✅ ใช้ apiClient (ตัด URL เต็มออก ใส่แค่ Path)
      const res = await apiClient.get(`/api/devices/user/${userId}`);
      setDevices(res.data);
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [userId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // ✅ ใช้ apiClient ยิง POST
      const res = await apiClient.post('/api/devices', {
        name,
        circuitId,
        userId
      });

      if (res.status === 201) {
        // ✅ ลบ Debug Log ออกแล้วตามที่ขอ
        onDeviceCreated(res.data);
        
        // Reset Form & Close
        setName('');
        setCircuitId('');
        setIsAdding(false);
      }
    } catch (error) {
      console.error("Failed to create device:", error);
      alert("ไม่สามารถบันทึกข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อกับ Server");
    }
  };

  // ✅ ฟังก์ชันดาวน์โหลด Config ย้อนหลัง
  const handleDownloadConfig = (device) => {
    // ดึง Config Data จาก Database (ถ้ามี) หรือใช้ข้อมูลพื้นฐาน
    const configData = device.configData || {
        circuitId: device.circuitId,
        token: device.apiToken || device.token, // รองรับชื่อตัวแปรหลายแบบ
        apiHost: window.location.hostname || '10.0.0.100', // Fallback
        wanList: [], networks: [], portConfig: {} 
    };

    try {
        const script = generateMikrotikScript(configData);
        const element = document.createElement("a");
        const file = new Blob([script], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `${device.circuitId || 'router'}_config.rsc`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    } catch (err) {
        alert("ไม่สามารถสร้าง Config ได้ เนื่องจากข้อมูลไม่ครบถ้วน");
        console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutDashboard className="text-blue-600" /> Device Dashboard
          </h1>
          <p className="text-slate-500 text-sm">จัดการและติดตามสถานะอุปกรณ์ทั้งหมดของคุณ</p>
        </div>
        
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition shadow-lg ${
            isAdding 
            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
          }`}
        >
          {isAdding ? <><X size={18} /> Cancel</> : <><Plus size={18} /> Add New Device</>}
        </button>
      </div>

      {/* Provision Form */}
      {isAdding && (
        <section className="bg-white p-8 rounded-2xl border-2 border-blue-500 shadow-xl shadow-blue-50 animate-scale-in">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Plus className="text-blue-600" size={24} /> Provision New Device
            </h2>
            <p className="text-sm text-slate-500">กรอกข้อมูลเพื่อลงทะเบียนอุปกรณ์ใหม่และเริ่มการตั้งค่า</p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Site Name</label>
              <input 
                type="text" required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                placeholder="เช่น Home Office"
                value={name} onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2 ml-1">Circuit ID (Identity)</label>
              <input 
                type="text"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                placeholder="เช่น CCT-8899"
                value={circuitId} onChange={(e) => setCircuitId(e.target.value)}
              />
            </div>

            <button 
              type="submit"
              className="flex items-center justify-center gap-2 bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100"
            >
              <Send size={18} /> Create & Start Config
            </button>
          </form>
        </section>
      )}

      {/* Device List */}
      <section className="pt-4">
        {loading ? (
          <div className="text-center py-10 text-slate-400 italic">กำลังโหลดข้อมูลอุปกรณ์...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {devices.length > 0 ? devices.map((device) => (
              <div key={device.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition group relative overflow-hidden">
                
                {/* Status Badge */}
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${device.isOnline ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                    <Router size={24} />
                  </div>
                  <span className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full ${
                    device.isOnline ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Activity size={12} /> {device.isOnline ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>

                <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{device.name}</h3>
                <p className="text-xs text-slate-400 font-mono mb-6">{device.circuitId || 'No Circuit ID'}</p>

                {/* ✅ Action Buttons (Download & Edit) */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button 
                    onClick={() => handleDownloadConfig(device)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-blue-50 hover:text-blue-600 transition"
                  >
                    <FileDown size={14} /> Config
                  </button>
                  <button 
                    onClick={() => onEditDevice && onEditDevice(device)}
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-orange-50 hover:text-orange-600 transition"
                  >
                    <Settings size={14} /> Edit
                  </button>
                </div>

                <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 italic">
                    Last Seen: {device.lastSeen ? new Date(device.lastSeen).toLocaleTimeString() : 'Never'}
                  </span>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
                ยังไม่มีอุปกรณ์ในระบบ กดปุ่ม "Add New Device" เพื่อเริ่มต้น
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default DeviceList;