import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  Server, Activity, Menu, X, 
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

  // ✅ 1. จัดกลุ่มเมนู (Categorization)
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
        { to: '/models', icon: Database, label: 'Hardware Models', roles: ['SUPER_ADMIN', 'ADMIN'] },
      ]
    },
    {
      title: 'System Administration',
      items: [
        { to: '/users', icon: Users, label: 'User Management', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { to: '/audit-logs', icon: Activity, label: 'Audit Logs', roles: ['SUPER_ADMIN', 'ADMIN'] },
        { to: '/settings', icon: Settings, label: 'Global Settings', roles: ['SUPER_ADMIN'] }
      ]
    }
  ];

  const allowedCategories = menuCategories.map(cat => ({
    ...cat,
    items: cat.items.filter(item => item.roles.includes(user?.role))
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="h-screen flex bg-slate-50 font-sans overflow-hidden w-full">
      
      {/* ========================================== */}
      {/* 🖥️ Desktop Sidebar */}
      {/* ========================================== */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-300 flex-col fixed inset-y-0 z-20 shadow-xl">
        
        {/* ✅ 2. Head เป็น Text Logo ไล่สี (Gradient) */}
        <div 
          onClick={() => navigate('/dashboard')}
          className="h-16 flex items-center justify-center px-6 bg-slate-950 border-b border-slate-800/80 cursor-pointer hover:bg-slate-900 transition-colors shrink-0"
        >
          <span className="font-black text-xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 tracking-widest uppercase">
            Mikrotik
          </span>
          <span className="font-medium text-lg text-slate-400 ml-2 tracking-wide">
            Panel
          </span>
        </div>

        <nav className="flex-1 px-4 py-6 overflow-y-auto custom-scrollbar">
          {allowedCategories.map((category) => (
            <div key={category.title} className="mb-6">
              <p className="px-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                {category.title}
              </p>
              <div className="space-y-1">
                {category.items.map((item) => (
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
              </div>
            </div>
          ))}
        </nav>

        {/* ✅ 3. Profile และ Logout ตรึงอยู่ด้านล่างสุด */}
        <div className="p-4 border-t border-slate-800/50 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3 px-3 py-2 mb-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              {user?.firstName?.[0] || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider truncate">{user?.role}</p>
            </div>
          </div>
          
          <div className="space-y-1">
            <NavLink 
              to="/profile" 
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
            >
              <User size={18} /> My Profile
            </NavLink>
            
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================== */}
      {/* 📱 Mobile Layout */}
      {/* ========================================== */}
      <div className="flex-1 md:ml-64 flex flex-col h-screen relative min-w-0">
        
        <header className="md:hidden shrink-0 h-16 bg-slate-950 text-white flex items-center justify-between px-4 z-30 shadow-md border-b border-slate-800">
          <div 
            onClick={() => {
              navigate('/dashboard');
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span className="font-black text-lg text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 tracking-widest uppercase">
              Mikrotik
            </span>
            <span className="font-medium text-base text-slate-400">Panel</span>
          </div>
          
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {isMobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black/60 z-40 top-16 backdrop-blur-sm" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
        )}
        
        <div className={`md:hidden fixed inset-x-0 top-16 bg-slate-900 z-50 border-t border-slate-800 shadow-2xl transition-all duration-300 flex flex-col overflow-hidden ${isMobileMenuOpen ? 'max-h-[85vh] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
            
            {allowedCategories.map((category) => (
              <div key={category.title} className="mb-4 mt-2">
                <p className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {category.title}
                </p>
                <div className="space-y-1">
                  {category.items.map((item) => (
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
              </div>
            ))}
          </div>

          <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
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
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative w-full min-w-0">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet /> 
          </div>
        </main>

        <div className="bg-white shrink-0 border-t border-slate-200 z-10">
          <Footer />
        </div>

      </div>
    </div>
  );
};

export default MainLayout;