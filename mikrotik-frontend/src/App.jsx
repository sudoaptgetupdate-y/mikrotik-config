import { useState } from 'react';
import { Router, Settings, LogOut } from 'lucide-react';

// Import Components
import DeviceList from './components/DeviceList';
import ConfigWizard from './components/ConfigWizard';

function App() {
  // State สำหรับจัดการหน้าจอ ('dashboard' หรือ 'wizard')
  const [view, setView] = useState('dashboard');
  
  // State สำหรับเก็บข้อมูลอุปกรณ์ที่กำลังแก้ไข (ส่งไปเป็น initialData ให้ Wizard)
  const [currentDevice, setCurrentDevice] = useState(null);

  // สมมติ User ID (ในระบบจริงอาจมาจาก Login Context)
  const USER_ID = 1;

  // 1. เมื่อสร้างอุปกรณ์เสร็จจาก Dashboard -> ไปหน้า Wizard
  const handleDeviceCreated = (newDevice) => {
    setCurrentDevice(newDevice);
    setView('wizard');
  };

  // 2. เมื่อกดปุ่ม Edit จาก Dashboard -> ไปหน้า Wizard พร้อมข้อมูลเดิม
  const handleEditDevice = (device) => {
    setCurrentDevice(device);
    setView('wizard');
  };

  // 3. เมื่อจบ Wizard (หรือกด Back) -> กลับหน้า Dashboard
  const handleWizardFinish = () => {
    setCurrentDevice(null);
    setView('dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {/* --- Global Header --- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Router size={24} />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight text-slate-800">MikroTik Manager</h1>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Configuration Wizard</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-700">Administrator</p>
              <p className="text-[10px] text-slate-400">admin@system</p>
            </div>
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-slate-500">
              <Settings size={16} />
            </div>
          </div>
        </div>
      </header>

      {/* --- Main Content Area --- */}
      <main className="max-w-7xl mx-auto p-6">
        {view === 'dashboard' ? (
          <DeviceList 
            userId={USER_ID} 
            onDeviceCreated={handleDeviceCreated} 
            onEditDevice={handleEditDevice} // ✅ ส่งฟังก์ชัน Edit ลงไป
          />
        ) : (
          <div className="animate-fade-in-up">
            {/* ปุ่มย้อนกลับแบบ Manual กรณีอยากยกเลิกกลางคัน */}
            <div className="mb-4">
              <button 
                onClick={handleWizardFinish}
                className="text-slate-400 hover:text-slate-600 text-sm flex items-center gap-1 transition-colors"
              >
                ← Back to Dashboard
              </button>
            </div>

            <ConfigWizard 
              initialData={currentDevice} // ✅ ส่งข้อมูลอุปกรณ์เข้าไป (ถ้ามี)
              onFinish={handleWizardFinish} // ✅ รับ Callback เมื่อจบงานเพื่อกลับหน้าหลัก
            />
          </div>
        )}
      </main>

    </div>
  );
}

export default App;