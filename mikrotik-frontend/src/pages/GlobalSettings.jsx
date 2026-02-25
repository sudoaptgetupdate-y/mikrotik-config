import React, { useState, useEffect } from 'react';
import { Shield, Network, Globe, Save, Plus, Trash2, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';
import apiClient from '../utils/apiClient';

const GlobalSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('ADMINS');

  // --- States ---
  const [managementIps, setManagementIps] = useState([]);
  const [newManagementIp, setNewManagementIp] = useState('');

  const [monitorIps, setMonitorIps] = useState(['', '', '', '', '']); // บังคับ 5 ช่อง

  const [routerAdmins, setRouterAdmins] = useState([]);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', group: 'full' });

  // ✅ State สำหรับซ่อน/แสดงรหัสผ่าน
  const [showPassword, setShowPassword] = useState({}); 
  const [showNewPassword, setShowNewPassword] = useState(false);

  // --- Fetch Data ---
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/api/settings');
      const data = res.data;

      data.forEach(item => {
        if (item.key === 'MANAGEMENT_IPS') setManagementIps(item.value || []);
        if (item.key === 'MONITOR_IPS') {
          const loadedIps = item.value || [];
          setMonitorIps([...loadedIps, '', '', '', '', ''].slice(0, 5));
        }
        if (item.key === 'ROUTER_ADMINS') setRouterAdmins(item.value || []);
      });
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      alert('ไม่สามารถดึงข้อมูลการตั้งค่าได้');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Save Data ---
  const handleSaveSetting = async (key, value) => {
    setIsSaving(true);
    try {
      await apiClient.put(`/api/settings/${key}`, { value });
      alert(`บันทึกข้อมูล ${key} สำเร็จ!`);
    } catch (error) {
      alert(`เกิดข้อผิดพลาดในการบันทึก ${key}: ${error.response?.data?.message || error.message}`);
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // Handlers: Router Admins
  // ==========================================
  const addAdmin = () => {
    if (!newAdmin.username || !newAdmin.password) return;
    setRouterAdmins([...routerAdmins, newAdmin]);
    setNewAdmin({ username: '', password: '', group: 'full' });
    setShowNewPassword(false); // ซ่อนรหัสผ่านเมื่อเพิ่มเสร็จ
  };
  
  const removeAdmin = (index) => setRouterAdmins(routerAdmins.filter((_, i) => i !== index));
  
  const updateAdmin = (index, field, val) => {
    const updated = [...routerAdmins];
    updated[index][field] = val;
    setRouterAdmins(updated);
  };

  const togglePasswordVisibility = (index) => {
    setShowPassword(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // ==========================================
  // Handlers: Management Networks
  // ==========================================
  const addManagementIp = () => {
    if (!newManagementIp) return;
    setManagementIps([...managementIps, newManagementIp]);
    setNewManagementIp('');
  };
  const removeManagementIp = (index) => setManagementIps(managementIps.filter((_, i) => i !== index));
  const updateManagementIp = (index, val) => {
    const updated = [...managementIps];
    updated[index] = val;
    setManagementIps(updated);
  };

  // ==========================================
  // Handlers: PBR Monitor Targets
  // ==========================================
  const handleMonitorIpChange = (index, val) => {
    const sanitizedVal = val.replace(/[^0-9.]/g, ''); 
    const newIps = [...monitorIps];
    newIps[index] = sanitizedVal;
    setMonitorIps(newIps);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
          <Shield className="text-blue-600" size={32} /> Global System Settings
        </h1>
        <p className="text-slate-500 mt-2">ตั้งค่าพารามิเตอร์ส่วนกลางสำหรับระบบ Generator (สำหรับ Super Admin เท่านั้น)</p>
      </div>

      {isLoading ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col justify-center items-center">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
          <p className="text-slate-500 font-medium animate-pulse">กำลังโหลดข้อมูลการตั้งค่า...</p>
        </div>
      ) : (
        <>
          {/* --- Tab Navigation --- */}
          <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('ADMINS')} 
              className={`flex items-center gap-2 px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ADMINS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <Shield size={18} /> Router Admins
            </button>
            <button 
              onClick={() => setActiveTab('NETWORKS')} 
              className={`flex items-center gap-2 px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'NETWORKS' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <Network size={18} /> Management IPs
            </button>
            <button 
              onClick={() => setActiveTab('PBR')} 
              className={`flex items-center gap-2 px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'PBR' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              <Globe size={18} /> PBR Monitor Targets
            </button>
          </div>

          {/* --- Tab Content --- */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col">
            
            {/* TAB 1: ROUTER ADMINS */}
            {activeTab === 'ADMINS' && (
              <div className="flex-1">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Default Router Admins</h3>
                    <p className="text-sm text-slate-500">จัดการบัญชีผู้ดูแลระบบที่จะถูกสร้างลงในอุปกรณ์ MikroTik อัตโนมัติ</p>
                  </div>
                  <button onClick={() => handleSaveSetting('ROUTER_ADMINS', routerAdmins)} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                    {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} Save Admins
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* รายการแอดมินที่มีอยู่ */}
                  {routerAdmins.map((admin, idx) => (
                    <div key={idx} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
                      <input type="text" value={admin.username} onChange={(e) => updateAdmin(idx, 'username', e.target.value)} placeholder="Username" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none" />
                      
                      {/* ช่องกรอก Password พร้อมปุ่มเปิด/ปิด */}
                      <div className="flex-1 relative">
                        <input 
                          type={showPassword[idx] ? "text" : "password"} 
                          value={admin.password} 
                          onChange={(e) => updateAdmin(idx, 'password', e.target.value)} 
                          placeholder="Password" 
                          className="w-full bg-white border border-slate-200 rounded-lg pl-3 pr-10 py-2 text-sm outline-none font-mono" 
                        />
                        <button 
                          type="button"
                          onClick={() => togglePasswordVisibility(idx)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                        >
                          {showPassword[idx] ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>

                      <select value={admin.group} onChange={(e) => updateAdmin(idx, 'group', e.target.value)} className="w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-indigo-700 outline-none">
                        <option value="full">Full</option>
                        <option value="read">Read</option>
                      </select>
                      <button onClick={() => removeAdmin(idx)} className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2.5 rounded-lg transition-colors"><Trash2 size={18} /></button>
                    </div>
                  ))}

                  {/* ฟอร์มเพิ่มแอดมินใหม่ */}
                  <div className="flex flex-wrap md:flex-nowrap gap-3 pt-4 mt-4 border-t border-slate-100">
                    <input type="text" placeholder="New Username" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} className="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500" />
                    
                    {/* ช่องกรอก New Password พร้อมปุ่มเปิด/ปิด */}
                    <div className="flex-1 relative">
                      <input 
                        type={showNewPassword ? "text" : "password"} 
                        placeholder="New Password" 
                        value={newAdmin.password} 
                        onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} 
                        className="w-full border border-slate-300 rounded-xl pl-4 pr-10 py-2 text-sm outline-none focus:border-blue-500 font-mono" 
                      />
                      <button 
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    <select value={newAdmin.group} onChange={e => setNewAdmin({...newAdmin, group: e.target.value})} className="w-32 border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500">
                      <option value="full">Full</option>
                      <option value="read">Read</option>
                    </select>
                    <button onClick={addAdmin} className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl flex items-center gap-2 font-bold transition-all"><Plus size={18} /> Add</button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MANAGEMENT NETWORKS */}
            {activeTab === 'NETWORKS' && (
              <div className="flex-1 flex flex-col">
                <div className="mb-6 pb-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800">Management IPs (Allow List)</h3>
                  <p className="text-sm text-slate-500">กลุ่ม IP หรือ Subnet ที่ได้รับอนุญาตให้เข้าถึง Winbox/API ของเราเตอร์ได้</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  {managementIps.map((ip, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-50 transition-all">
                      <input 
                        type="text" 
                        value={ip} 
                        onChange={(e) => updateManagementIp(idx, e.target.value)}
                        className="flex-1 bg-transparent px-2 py-1 text-sm font-mono text-emerald-800 outline-none w-full"
                      />
                      <button onClick={() => removeManagementIp(idx)} className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 pt-4 border-t border-slate-100 mt-auto">
                  <input 
                    type="text" 
                    placeholder="e.g. 10.234.56.0/24" 
                    value={newManagementIp} 
                    onChange={e => setNewManagementIp(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && addManagementIp()} 
                    className="flex-1 md:max-w-sm border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500" 
                  />
                  <button onClick={addManagementIp} className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-all whitespace-nowrap">
                    <Plus size={18} /> Add IP
                  </button>
                  
                  <div className="w-px h-8 bg-slate-200 hidden sm:block mx-1"></div>
                  
                  <button onClick={() => handleSaveSetting('MANAGEMENT_IPS', managementIps)} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap w-full sm:w-auto">
                    {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} Save IPs
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: PBR MONITOR TARGETS */}
            {activeTab === 'PBR' && (
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">PBR Check-Gateway Targets</h3>
                    <p className="text-sm text-slate-500">เป้าหมายสำหรับเช็ค Ping ของ WAN แต่ละเส้น (ระบบ PBR Failover)</p>
                    <p className="text-xs text-orange-600 mt-1 flex items-center gap-1 font-bold bg-orange-50 px-2 py-1 rounded inline-flex"><AlertTriangle size={14}/> บังคับ 5 ช่อง และห้ามใช้ IP ซ้ำกัน</p>
                  </div>
                  <button onClick={() => handleSaveSetting('MONITOR_IPS', monitorIps)} disabled={isSaving || monitorIps.some(ip => !ip)} className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                    {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} Save Targets
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {monitorIps.map((ip, idx) => (
                    <div key={idx} className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 group-focus-within:text-orange-500 transition-colors">WAN {idx + 1}</span>
                      <input 
                        type="text" 
                        value={ip} 
                        onChange={(e) => handleMonitorIpChange(idx, e.target.value)} 
                        className="w-full border-2 border-slate-200 rounded-xl pl-20 pr-4 py-3 text-sm font-mono text-slate-700 outline-none focus:border-orange-400 focus:bg-orange-50/30 transition-all"
                        placeholder="8.8.8.8"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
};

export default GlobalSettings;