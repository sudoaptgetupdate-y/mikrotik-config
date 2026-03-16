import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  Server, Activity, Menu, X, 
  Database, LayoutDashboard, Users, LogOut, User, Settings, FolderKanban, Wand2, ShieldCheck,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext'; 
import Footer from '../components/Footer';

const MainLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ==========================================
  // Menu Categorization
  // ==========================================
  const menuCategories = [
    {
      title: 'Main',
      items: [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] },
      ]
    },
    {
      title: 'Device Management',
      items: [
        { to: '/devices', icon: Server, label: 'Managed Routers', roles: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] },
        { to: '/groups', icon: FolderKanban, label: 'Device Groups', roles: ['SUPER_ADMIN', 'ADMIN'] }, 
        { to: '/models', icon: Database, label: 'Hardware Models', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { to: '/config-builder', icon: Wand2, label: 'Config Builder', roles: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] },
        { to: '/vpn-tools', icon: ShieldCheck, label: 'VPN Tools', roles: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'] },
      ]
    },
    {
      title: 'System Administration',
      items: [
        { to: '/audit-logs', icon: Activity, label: 'Audit Logs', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { to: '/users', icon: Users, label: 'User Management', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { to: '/settings', icon: Settings, label: 'Global Settings', roles: ['SUPER_ADMIN'] },
      ]
    }
  ];

  // กรองเมนูตาม Role ของผู้ใช้
  const filterMenuItems = (items) => {
    return items.filter(item => item.roles.includes(user?.role));
  };

  // ==========================================
  // Render
  // ==========================================
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">

      {/* 📱 Mobile Menu Button */}
      <div className="md:hidden fixed top-4 right-4 z-50">
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-slate-900 text-white rounded-xl shadow-xl hover:bg-slate-800 transition-colors"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* 🌑 Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 🖥️ Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-40 
        w-72 ${isSidebarCollapsed ? 'md:w-20' : 'md:w-72'} 
        bg-slate-950 text-slate-300 transform transition-all duration-300 ease-in-out flex flex-col shadow-2xl md:shadow-none 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>

        {/* Sidebar Header (Logo) */}
        <div 
          className="h-16 flex items-center justify-between px-4 bg-slate-950 border-b border-slate-800/80 shrink-0 relative overflow-hidden"
        >
          <div 
            onClick={() => navigate('/dashboard')}
            className={`flex items-center cursor-pointer hover:opacity-80 transition-all duration-300 ${isSidebarCollapsed ? 'md:mx-auto ml-2' : 'ml-2'}`}
          >
            <span className="font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 tracking-widest uppercase shrink-0">
              M
            </span>
            <div className={`flex items-center transition-all duration-300 ${isSidebarCollapsed ? 'md:hidden opacity-0 w-0' : 'opacity-100 w-auto'}`}>
              <span className="font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 tracking-widest uppercase">
                ikrotik
              </span>
              <span className="font-medium text-lg text-slate-400 ml-2 tracking-wide whitespace-nowrap">
                Panel
              </span>
            </div>
          </div>

          {/* Desktop Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 p-1.5 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 hover:text-white transition-colors"
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-3 space-y-8 custom-scrollbar scroll-smooth">
          {menuCategories.map((category, idx) => (
            <div key={idx}>
              <h3 className={`px-4 text-[11px] font-black text-slate-500 uppercase tracking-widest mb-3 transition-all duration-300 ${isSidebarCollapsed ? 'md:hidden opacity-0' : 'opacity-100'}`}>
                {category.title}
              </h3>
              {isSidebarCollapsed && (
                <div className="hidden md:block h-4 border-b border-slate-800/50 mb-3 mx-2"></div>
              )}
              <div className="space-y-1">
                {filterMenuItems(category.items).map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink 
                      key={item.to} 
                      to={item.to}
                      title={isSidebarCollapsed ? item.label : ''}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) => `
                        flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative
                        ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}
                        ${isActive 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }
                      `}
                    >
                      {({ isActive }) => (
                        <>
                          <Icon size={20} className={`shrink-0 ${isActive ? "text-white" : "text-slate-500 group-hover:text-blue-400 transition-colors"}`} />
                          <span className={`truncate transition-all duration-300 ${isSidebarCollapsed ? 'md:hidden opacity-0 w-0' : 'opacity-100 w-auto'}`}>
                            {item.label}
                          </span>
                          {isSidebarCollapsed && isActive && (
                             <div className="hidden md:block absolute left-0 w-1 h-6 bg-white rounded-r-full"></div>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer (User & Logout) */}
        <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0">
           <div className="space-y-1">
            <NavLink 
              to="/profile" 
              title={isSidebarCollapsed ? "My Profile" : ""}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({isActive}) => `
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200
                ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}
                ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}
              `}
            >
              <User size={20} className="shrink-0" />
              <span className={`transition-all duration-300 ${isSidebarCollapsed ? 'md:hidden opacity-0 w-0' : 'opacity-100 w-auto'}`}>My Profile</span>
            </NavLink>
            <button 
              onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }} 
              title={isSidebarCollapsed ? "Logout" : ""}
              className={`
                flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-all duration-200
                ${isSidebarCollapsed ? 'md:justify-center md:px-0' : ''}
              `}
            >
              <LogOut size={20} className="shrink-0" />
              <span className={`transition-all duration-300 ${isSidebarCollapsed ? 'md:hidden opacity-0 w-0' : 'opacity-100 w-auto'}`}>Logout</span>
            </button>
          </div>
        </div>
      </div>
      {/* 💻 Content Area */}
      <main className="flex-1 overflow-y-auto relative w-full min-w-0 flex flex-col bg-slate-50/50">

        {/* 1. ส่วนเนื้อหาหลัก */}
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet /> 
        </div>

        {/* 2. ส่วน Footer */}
        <div className="w-full mt-auto mb-4">
          <div className="max-w-7xl mx-auto w-full px-4 md:px-8">
            <Footer />
          </div>
        </div>

      </main>

    </div>
  );
};

export default MainLayout;