import React, { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Server, PlusCircle, Activity, Menu, X, Router, Database } from 'lucide-react';

const MainLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // รายการเมนูทั้งหมด (เพิ่มง่ายขึ้นในอนาคต)
  const navItems = [
    { to: '/devices', icon: Server, label: 'Managed Routers' },
    { to: '/add-device', icon: PlusCircle, label: 'Add New Device' },
    { to: '/models', icon: Database, label: 'Hardware Models' },
    { to: '/audit-logs', icon: Activity, label: 'Audit Logs' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      
      {/* --- Sidebar (Desktop) --- */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white transition-all duration-300 shadow-xl z-10">
        {/* Logo Area */}
        <div className="h-16 flex items-center gap-3 px-6 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Router size={20} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-wide">MikroManager</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Area (Bottom) */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm text-blue-400">
              AD
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Admin User</p>
              <p className="text-[10px] text-slate-500 font-mono">ID: 1 • Role: ADMIN</p>
            </div>
          </div>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-slate-900 text-white flex items-center justify-between px-4 shrink-0 shadow-md relative z-20">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1 rounded">
              <Router size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg">MikroManager</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-900 text-white border-t border-slate-800 absolute top-16 left-0 right-0 z-50 shadow-2xl animate-in slide-in-from-top-2 duration-200">
            <nav className="px-4 py-4 space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)} // ปิดเมนูเมื่อกดเลือก
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-lg transition-all font-medium ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <item.icon size={20} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}

        {/* Overlay สำหรับตอนเปิดเมนูมือถือ (กดข้างนอกเพื่อปิด) */}
        {isMobileMenuOpen && (
           <div 
             className="md:hidden fixed inset-0 bg-black/50 z-40 top-16" 
             onClick={() => setIsMobileMenuOpen(false)}
           />
        )}

        {/* Page Content (ที่ที่เนื้อหาแต่ละหน้าจะถูกนำมาแสดง) */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Component ของหน้าที่เราเรียกใช้ (เช่น DeviceList, ConfigWizard, AuditLog) จะมาโผล่ตรงนี้ */}
            <Outlet /> 
          </div>
        </main>
        
      </div>
    </div>
  );
};

export default MainLayout;