import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  Server, PlusCircle, Activity, Menu, X, Router, 
  Database, LayoutDashboard, Users, LogOut, User, Settings 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext'; 
import Footer from '../components/Footer';

const MainLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] },
    { to: '/devices', icon: Server, label: 'Managed Routers', roles: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] },
    { to: '/add-device', icon: PlusCircle, label: 'Add New Device', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { to: '/models', icon: Database, label: 'Hardware Models', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { to: '/users', icon: Users, label: 'User Management', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { to: '/audit-logs', icon: Activity, label: 'Audit Logs', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { to: '/settings', icon: Settings, label: 'Global Settings', roles: ['SUPER_ADMIN'] }
  ];

  // กรองเมนูตามสิทธิ์ของ User ปัจจุบัน
  const navItems = allNavItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans">
      
      {/* ========================================== */}
      {/* 🖥️ Desktop Sidebar (ซ่อนในมือถือ) */}
      {/* ========================================== */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col fixed inset-y-0 z-20 shadow-xl">
        <div className="h-16 flex items-center px-6 bg-slate-950/50 border-b border-slate-800/50">
          <div className="bg-blue-500 p-1.5 rounded-lg mr-3 shadow-lg shadow-blue-500/20">
            <Router size={22} className="text-white" />
          </div>
          <span className="font-bold text-lg text-white tracking-wide">MikroManager</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                  isActive 
                    ? 'bg-blue-600/10 text-blue-400 font-bold' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <item.icon size={18} className="transition-transform group-hover:scale-110" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800/50 bg-slate-900/50">
          <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              {user?.firstName?.[0] || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">{user?.role}</p>
            </div>
          </div>
          <NavLink 
            to="/profile" 
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
          >
            <User size={18} /> My Profile
          </NavLink>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors mt-1"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* ========================================== */}
      {/* Main Content Wrapper */}
      {/* ========================================== */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen relative">
        
        {/* 📱 Mobile Top Header */}
        <header className="md:hidden h-16 bg-slate-900 text-white flex items-center justify-between px-4 sticky top-0 z-30 shadow-md">
          <div className="flex items-center gap-2">
            <div className="bg-blue-500 p-1.5 rounded-lg shadow-sm">
              <Router size={20} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-wide">MikroManager</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* 📱 Mobile Menu Dropdown & Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/60 z-40 top-16 backdrop-blur-sm" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
        )}
        
        <div className={`md:hidden fixed inset-x-0 top-16 bg-slate-900 z-50 border-t border-slate-800 shadow-2xl transition-all duration-300 overflow-hidden ${isMobileMenuOpen ? 'max-h-[85vh] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="flex flex-col p-4 overflow-y-auto custom-scrollbar max-h-[85vh]">
            <div className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                      isActive 
                        ? 'bg-blue-600/10 text-blue-400 font-bold' 
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`
                  }
                >
                  <item.icon size={20} />
                  {item.label}
                </NavLink>
              ))}
            </div>

            <div className="h-px bg-slate-800 my-4"></div>
            
            <div className="space-y-1">
              <NavLink 
                to="/profile" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <User size={20} /> My Profile
              </NavLink>
              <button 
                onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }} 
                className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors"
              >
                <LogOut size={20} /> Logout
              </button>
            </div>
          </div>
        </div>

        {/* 💻 Content Area */}
        {/* ✅ ให้ <main> เป็นตัวที่ Scroll ได้เพียงตัวเดียว เพื่อให้ Footer ติดด้านล่าง */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet /> 
          </div>
        </main>

        {/* ✅ นำ Footer มาวางไว้นอก main และให้มันอยู่ติดขอบล่างเสมอ */}
        <div className="bg-white shrink-0 border-t border-slate-200">
          <Footer />
        </div>

      </div>
    </div>
  );
};

export default MainLayout;