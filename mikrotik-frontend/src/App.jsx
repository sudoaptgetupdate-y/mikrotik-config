import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import DeviceList from './components/DeviceList';
import ConfigWizard from './components/ConfigWizard';
import { useState } from 'react';

// --- Wrapper Components (ตัวช่วยจัดการ Data ก่อนส่งเข้า Wizard) ---

// 1. หน้าสร้างอุปกรณ์ใหม่
const CreateDevicePage = () => {
  const navigate = useNavigate();
  return (
    <ConfigWizard 
      mode="create"
      onFinish={() => navigate('/dashboard')} // เสร็จแล้วกลับไปหน้า Dashboard
    />
  );
};

// 2. หน้าแก้ไขอุปกรณ์เดิม
const EditDevicePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // รับข้อมูลที่ส่งมาจากหน้า DeviceList (ผ่าน state)
  const deviceData = location.state?.deviceData;

  // ถ้าไม่มี data (เช่น User กด Refresh หน้าจอเอง) อาจจะให้ Redirect กลับไป Dashboard หรือ Fetch ใหม่
  // ในที่นี้ถ้าไม่มี data ให้กลับไป dashboard ก่อนเพื่อความง่าย
  if (!deviceData) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <ConfigWizard 
      mode="edit"
      initialData={deviceData} // ส่งข้อมูลเดิมเข้าไป
      onFinish={() => navigate('/dashboard')} 
    />
  );
};

// --- Main App Component ---
function App() {
  return (
    <Routes>
      {/* ใช้ MainLayout เป็นโครงหลัก (มี Sidebar, Header) */}
      <Route path="/" element={<MainLayout />}>
        
        {/* หน้าแรกให้ Redirect ไป Dashboard ทันที */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* หน้า Dashboard (ตารางรายชื่อ) */}
        <Route path="dashboard" element={<DeviceList />} />
        
        {/* หน้าเพิ่มอุปกรณ์ */}
        <Route path="add-device" element={<CreateDevicePage />} />
        
        {/* หน้าแก้ไขอุปกรณ์ (รับ id) */}
        <Route path="edit-device/:id" element={<EditDevicePage />} />

      </Route>
    </Routes>
  );
}

export default App;