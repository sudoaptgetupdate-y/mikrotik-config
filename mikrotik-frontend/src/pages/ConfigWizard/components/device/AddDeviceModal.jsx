//src/components/AddDeviceModal.jsx
import { useState } from 'react';
import axios from 'axios';
import { X, Copy, Check, Plus, Terminal } from 'lucide-react';

const AddDeviceModal = ({ userId, onDeviceAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', circuitId: '' });
  const [generatedScript, setGeneratedScript] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // ฟังก์ชันสลับเปิด/ปิด Modal
  const toggleModal = () => {
    setIsOpen(!isOpen);
    setGeneratedScript(null); // Reset เมื่อเปิดใหม่
    setFormData({ name: '', circuitId: '' });
  };

  // ฟังก์ชันส่งข้อมูลไป Backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. ยิง API สร้างอุปกรณ์
      const res = await axios.post('http://localhost:3000/api/devices', {
        ...formData,
        userId
      });

      // 2. สร้าง Script จาก Token ที่ได้มา
      const token = res.data.apiToken;
      const script = `/system scheduler add name="CloudHeartbeat" interval=1m on-event={
  :local url "http://10.0.0.16:3000/api/devices/heartbeat"
  :local token "${token}"
  :local payload "{\\"token\\":\\"$token\\"}"
  :do {
    :local result ([/tool fetch url=$url http-method=post http-header-field="content-type: application/json" http-data=$payload output=user as-value])
    :local responseData ($result->"data")
    :if ($responseData ~ "reboot") do={ /system reboot }
  } on-error={ /log error "Cloud Connect Failed" }
}`;
      
      setGeneratedScript(script);
      onDeviceAdded(); // บอกให้หน้าหลักโหลดรายการใหม่

    } catch (error) {
      alert("Error creating device: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันก๊อปปี้สคริปต์
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* ปุ่มเปิด Modal */}
      <button 
        onClick={toggleModal}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm font-medium"
      >
        <Plus size={20} /> Add Device
      </button>

      {/* ตัว Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 text-lg">
                {generatedScript ? 'Device Created! 🎉' : 'New Device Setup'}
              </h3>
              <button onClick={toggleModal} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {!generatedScript ? (
                // Form กรอกข้อมูล
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Device Name / Customer</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                      placeholder="e.g. Office HQ Router"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Circuit ID (Optional)</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                      placeholder="e.g. 9600xxxxxx"
                      value={formData.circuitId}
                      onChange={e => setFormData({...formData, circuitId: e.target.value})}
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-300 transition mt-2"
                  >
                    {loading ? 'Creating...' : 'Create & Get Script'}
                  </button>
                </form>
              ) : (
                // แสดง Script ผลลัพธ์
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-4 bg-green-50 text-green-800 rounded-lg text-sm">
                    <Check className="shrink-0 mt-0.5" size={18} />
                    <p>Device created successfully! Copy this script and paste it into your MikroTik Terminal.</p>
                  </div>
                  
                  <div className="relative group">
                    <div className="absolute top-2 right-2">
                      <button 
                        onClick={copyToClipboard}
                        className="p-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition text-xs flex items-center gap-1"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-gray-700 leading-relaxed">
                      {generatedScript}
                    </pre>
                  </div>

                  <button 
                    onClick={toggleModal}
                    className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default AddDeviceModal;