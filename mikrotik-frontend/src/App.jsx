import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import DeviceList from './components/DeviceList';
import ConfigWizard from './components/ConfigWizard';
import AuditLog from './components/AuditLog'; 
import { useState } from 'react';
import ModelManager from './components/ModelManager';

// --- Wrapper Components (ตัวช่วยจัดการ Data ก่อนส่งเข้า Wizard) ---

// 1. หน้าสร้างอุปกรณ์ใหม่
const CreateDevicePage = () => {
  const navigate = useNavigate();
  return (
    <ConfigWizard 
      mode="create"
      onFinish={() => navigate('/dashboard')} 
    />
  );
};

// 2. หน้าแก้ไขอุปกรณ์เดิม
const EditDevicePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const deviceData = location.state?.deviceData;

  if (!deviceData) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <ConfigWizard 
      mode="edit"
      initialData={deviceData} 
      onFinish={() => navigate('/dashboard')} 
    />
  );
};

// --- Main App Component ---
function App() {
  return (
    // ❌ ไม่ต้องใส่ <BrowserRouter> ตรงนี้ เพราะคุณมีอยู่ใน main.jsx แล้ว
    <Routes>
      <Route path="/" element={<MainLayout />}>
        
        {/* หน้าแรกให้ Redirect ไป Dashboard ทันที */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* หน้า Dashboard (ตารางรายชื่อ) */}
        <Route path="dashboard" element={<DeviceList />} />
        
        {/* หน้าเพิ่มอุปกรณ์ */}
        <Route path="add-device" element={<CreateDevicePage />} />
        
        {/* หน้าแก้ไขอุปกรณ์ (รับ id) */}
        <Route path="edit-device/:id" element={<EditDevicePage />} />

        {/* ✅ 2. เพิ่ม Route สำหรับหน้า Audit Logs */}
        <Route path="audit-logs" element={<AuditLog />} />

        {/* ✅ 3. Catch-all Route: ถ้า URL ไม่ตรงกับด้านบนเลย ให้กลับไปหน้า dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        {/* ✅ 3. เพิ่ม route สำหรับจัดการรุ่นของ mikrotik */}
        <Route path="models" element={<ModelManager />} />

      </Route>
    </Routes>
  );
}

export default App;