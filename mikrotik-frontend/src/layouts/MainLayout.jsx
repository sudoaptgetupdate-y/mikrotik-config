import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  Server, 
  PlusCircle, 
  Activity, 
  Menu, 
  X, 
  Router, 
  Database, 
  LayoutDashboard, 
  Users, 
  LogOut, 
  User,
  Settings // ✅ เพิ่ม Settings icon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext'; 

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
    // ✅ เพิ่มเมนู Global Settings เฉพาะ SUPER_ADMIN เท่านั้น
    { to: '/global-settings', icon: Settings, label: 'Global Settings', roles: ['SUPER_ADMIN'] },
  ];

  // กรองเมนูตาม Role ของ User ที่ Login อยู่
  const navItems = allNavItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className="min-h-screen bg-slate-50 flex">
      
      {/* --- Sidebar (Desktop) --- */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white transition-all duration-300 shadow-xl z-10">
        <div className="h-16 flex items-center gap-3 px-6 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Router size={20} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-wide">MiKroTik NMS</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium ${
                  isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User Area & Logout (Desktop) */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0 flex items-center justify-between gap-2">
          <NavLink 
            to="/profile" 
            className="flex-1 flex items-center gap-3 p-2 -ml-2 rounded-lg hover:bg-slate-800 transition-colors group"
            title="Go to Profile"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 group-hover:bg-blue-600 flex items-center justify-center font-bold text-sm text-blue-400 group-hover:text-white transition-colors uppercase shrink-0">
              {user?.username ? user.username.substring(0, 2) : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                {user?.firstName || 'User'}
              </p>
              <p className="text-[10px] text-slate-500 font-mono truncate">{user?.role}</p>
            </div>
          </NavLink>
          
          <button 
            onClick={handleLogout} 
            className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 hover:shadow-inner rounded-lg transition-all shrink-0" 
            title="Logout"
          >
            <LogOut size={18} />
          </button>
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
          
          <div className="flex items-center gap-1">
            <NavLink 
              to="/profile" 
              className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-blue-400 uppercase mr-1"
            >
              {user?.username ? user.username.substring(0, 2) : 'U'}
            </NavLink>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </header>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-900 text-white border-t border-slate-800 absolute top-16 left-0 right-0 z-50 shadow-2xl animate-in slide-in-from-top-2 duration-200">
            <nav className="px-4 py-4 space-y-2">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-lg transition-all font-medium ${
                      isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <item.icon size={20} />
                  {item.label}
                </NavLink>
              ))}
              
              <div className="border-t border-slate-800 mt-2 pt-2">
                <NavLink 
                  to="/profile" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-3 rounded-lg transition-all font-medium ${
                      isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <User size={20} /> My Profile
                </NavLink>
                <button 
                  onClick={handleLogout} 
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all font-medium"
                >
                  <LogOut size={20} /> Logout
                </button>
              </div>
            </nav>
          </div>
        )}

        {isMobileMenuOpen && (
           <div className="md:hidden fixed inset-0 bg-black/50 z-40 top-16" onClick={() => setIsMobileMenuOpen(false)} />
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet /> 
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;