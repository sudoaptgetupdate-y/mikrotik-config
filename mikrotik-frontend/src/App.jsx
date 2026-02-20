import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './components/Dashboard'; // ✅ อิมพอร์ต Dashboard หน้าใหม่
import DeviceList from './components/DeviceList';
import ConfigWizard from './components/ConfigWizard';
import AuditLog from './components/AuditLog'; 
import ModelManager from './components/ModelManager';

// --- Wrapper Components ---

// 1. หน้าสร้างอุปกรณ์ใหม่
const CreateDevicePage = () => {
  const navigate = useNavigate();
  return (
    <ConfigWizard 
      mode="create"
      // ✅ เมื่อสร้างเสร็จ ให้กลับไปหน้ารายการอุปกรณ์ (devices)
      onFinish={() => navigate('/devices')} 
    />
  );
};

// 2. หน้าแก้ไขอุปกรณ์เดิม
const EditDevicePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const deviceData = location.state?.deviceData;

  if (!deviceData) {
    return <Navigate to="/devices" replace />;
  }

  return (
    <ConfigWizard 
      mode="edit"
      initialData={deviceData} 
      // ✅ เมื่อแก้ไขเสร็จ ให้กลับไปหน้ารายการอุปกรณ์ (devices)
      onFinish={() => navigate('/devices')} 
    />
  );
};

// --- Main App Component ---
function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        
        {/* หน้าแรกให้ Redirect ไป Dashboard ทันที */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* ✅ หน้า Dashboard ตัวจริง (ภาพรวม) */}
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* ✅ ย้ายตารางรายชื่อมาที่ /devices */}
        <Route path="devices" element={<DeviceList />} />
        
        {/* หน้าเพิ่มอุปกรณ์ */}
        <Route path="add-device" element={<CreateDevicePage />} />
        
        {/* หน้าแก้ไขอุปกรณ์ (รับ id) */}
        <Route path="edit-device/:id" element={<EditDevicePage />} />

        {/* หน้า Audit Logs */}
        <Route path="audit-logs" element={<AuditLog />} />

        {/* จัดการรุ่นของ Mikrotik */}
        <Route path="models" element={<ModelManager />} />

        {/* ✅ Catch-all Route: ต้องอยู่ล่างสุดเสมอ! ถ้า URL ไม่ตรง ให้กลับไปหน้า dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

      </Route>
    </Routes>
  );
}

export default App;