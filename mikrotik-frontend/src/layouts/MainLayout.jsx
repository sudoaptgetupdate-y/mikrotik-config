// src/layouts/MainLayout.jsx
import { Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, Router, FileText, Settings } from 'lucide-react';

const MainLayout = () => {
  return (
    <div className="flex h-screen bg-slate-50">
      {/* 1. Sidebar (เมนูซ้าย) */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-4 text-xl font-bold border-b border-slate-700">
           MikroTik Manager
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/dashboard" className="flex items-center gap-3 p-3 rounded hover:bg-slate-800">
            <LayoutDashboard size={20} /> Dashboard
          </Link>
          <Link to="/add-device" className="flex items-center gap-3 p-3 rounded hover:bg-slate-800">
            <Router size={20} /> Add Device
          </Link>
          <Link to="/logs" className="flex items-center gap-3 p-3 rounded hover:bg-slate-800">
            <FileText size={20} /> Audit Logs
          </Link>
        </nav>
      </aside>

      {/* 2. Content Area (ส่วนเนื้อหาที่จะเปลี่ยนไปเรื่อยๆ) */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center">
          <h1 className="text-lg font-semibold text-slate-700">Welcome, Admin</h1>
          {/* ใส่ปุ่ม Logout หรือ Profile ตรงนี้ */}
        </header>
        
        <div className="p-8">
          {/* Outlet คือจุดที่ Router จะเอาหน้า Dashboard หรือ Wizard มาเสียบ */}
          <Outlet /> 
        </div>
      </main>
    </div>
  );
};

export default MainLayout;