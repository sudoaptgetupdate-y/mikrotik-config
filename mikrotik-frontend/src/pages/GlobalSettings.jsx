import { useState, useEffect } from 'react';
import { Shield, Network, Globe, Save, Plus, Trash2, AlertTriangle, Loader2, Eye, EyeOff, Settings2, Server, ShieldCheck } from 'lucide-react';
import apiClient from '../utils/apiClient';

const GlobalSettings = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('ADMINS');

  // --- States ---
  const [managementIps, setManagementIps] = useState([]);
  const [newManagementIp, setNewManagementIp] = useState('');

  const [monitorIps, setMonitorIps] = useState(['', '', '', '', '']); 

  const [routerAdmins, setRouterAdmins] = useState([]);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', group: 'full' });

  // ⭐ State สำหรับ Default Networks
  const [defaultNetworks, setDefaultNetworks] = useState([]);

  const [showPassword, setShowPassword] = useState({}); 
  const [showNewPassword, setShowNewPassword] = useState(false);

  // --- Fetch Data ---
  useEffect(() => {
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
          // ⭐ โหลด DEFAULT_NETWORKS
          if (item.key === 'DEFAULT_NETWORKS') {
            try {
              setDefaultNetworks(typeof item.value === 'string' ? JSON.parse(item.value) : item.value);
            } catch (e) {
              setDefaultNetworks([]);
            }
          }
        });
      } catch (error) {
        console.error('Failed to fetch settings:', error);
        alert('ไม่สามารถดึงข้อมูลการตั้งค่าได้');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // --- Save Data ---
  const handleSaveSetting = async (key, value) => {
    setIsSaving(true);
    try {
      // ถ้าเป็น DEFAULT_NETWORKS ให้ stringify ก่อนส่ง
      const payloadValue = key === 'DEFAULT_NETWORKS' ? JSON.stringify(value) : value;
      await apiClient.put(`/api/settings/${key}`, { value: payloadValue });
      alert(`บันทึกข้อมูล ${key} สำเร็จ!`);
    } catch (error) {
      alert(`เกิดข้อผิดพลาดในการบันทึก ${key}: ${error.response?.data?.message || error.message}`);
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // Handlers: Router Admins, Management IPs, PBR 
  // ==========================================
  const addAdmin = () => {
    if (!newAdmin.username || !newAdmin.password) return;
    setRouterAdmins([...routerAdmins, newAdmin]);
    setNewAdmin({ username: '', password: '', group: 'full' });
    setShowNewPassword(false);
  };
  const removeAdmin = (index) => setRouterAdmins(routerAdmins.filter((_, i) => i !== index));
  const updateAdmin = (index, field, val) => {
    const updated = [...routerAdmins];
    updated[index][field] = val;
    setRouterAdmins(updated);
  };
  const togglePasswordVisibility = (index) => setShowPassword(prev => ({ ...prev, [index]: !prev[index] }));

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

  const handleMonitorIpChange = (index, val) => {
    const sanitizedVal = val.replace(/[^0-9.]/g, ''); 
    const newIps = [...monitorIps];
    newIps[index] = sanitizedVal;
    setMonitorIps(newIps);
  };

  // ==========================================
  // ⭐ Handlers: Default Networks
  // ==========================================
  const addDefaultNetwork = () => {
    const customVlans = defaultNetworks.filter(n => n.vlanId !== 56).map(n => n.vlanId);
    const nextVlan = customVlans.length > 0 ? Math.max(...customVlans) + 10 : 10;
    const newNet = {
      id: `def_${Date.now()}`,
      name: `vlan${nextVlan}`,
      vlanId: nextVlan,
      ip: `192.168.${nextVlan}.1/24`,
      type: 'network', 
      dhcp: true,
      hotspot: false
    };
    setDefaultNetworks([...defaultNetworks, newNet]);
  };

  const removeDefaultNetwork = (id) => setDefaultNetworks(defaultNetworks.filter(n => n.id !== id));
  
  const updateDefaultNetwork = (id, field, value) => {
    setDefaultNetworks(defaultNetworks.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const toggleDefaultHotspot = (id, currentHotspot) => {
    setDefaultNetworks(defaultNetworks.map(n => {
      if (n.id === id) {
        const isTurningOn = !currentHotspot;
        return { ...n, hotspot: isTurningOn, dhcp: isTurningOn ? true : n.dhcp };
      }
      return n;
    }));
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
          <Shield className="text-blue-600" size={32} /> Global System Settings
        </h1>
        <p className="text-slate-500 mt-2">ตั้งค่าพารามิเตอร์ส่วนกลางสำหรับระบบ Generator</p>
      </div>

      {isLoading ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col justify-center items-center">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
          <p className="text-slate-500 font-medium animate-pulse">กำลังโหลดข้อมูลการตั้งค่า...</p>
        </div>
      ) : (
        <>
          <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
            <button onClick={() => setActiveTab('ADMINS')} className={`flex items-center gap-2 px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ADMINS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Shield size={18} /> Router Admins
            </button>
            <button onClick={() => setActiveTab('NETWORKS')} className={`flex items-center gap-2 px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'NETWORKS' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Network size={18} /> Management IPs
            </button>
            <button onClick={() => setActiveTab('PBR')} className={`flex items-center gap-2 px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'PBR' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Globe size={18} /> PBR Monitor Targets
            </button>
            {/* ⭐ Tab ใหม่สำหรับ Default Networks */}
            <button onClick={() => setActiveTab('DEFAULTS')} className={`flex items-center gap-2 px-6 py-3 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'DEFAULTS' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Settings2 size={18} /> Default LAN/VLAN
            </button>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col">
            
            {/* TAB 1: ROUTER ADMINS (คงเดิม) */}
            {activeTab === 'ADMINS' && (
              // ... โค้ดส่วน Admin เดิม
              <div className="flex-1">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Default Router Admins</h3>
                  </div>
                  <button onClick={() => handleSaveSetting('ROUTER_ADMINS', routerAdmins)} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                    {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} Save Admins
                  </button>
                </div>
                
                <div className="space-y-4">
                  {routerAdmins.map((admin, idx) => (
                    <div key={idx} className="flex flex-wrap md:flex-nowrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
                      <input type="text" value={admin.username} onChange={(e) => updateAdmin(idx, 'username', e.target.value)} placeholder="Username" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none" />
                      <div className="flex-1 relative">
                        <input type={showPassword[idx] ? "text" : "password"} value={admin.password} onChange={(e) => updateAdmin(idx, 'password', e.target.value)} placeholder="Password" className="w-full bg-white border border-slate-200 rounded-lg pl-3 pr-10 py-2 text-sm outline-none font-mono" />
                        <button type="button" onClick={() => togglePasswordVisibility(idx)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
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
                  <div className="flex flex-wrap md:flex-nowrap gap-3 pt-4 mt-4 border-t border-slate-100">
                    <input type="text" placeholder="New Username" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} className="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500" />
                    <div className="flex-1 relative">
                      <input type={showNewPassword ? "text" : "password"} placeholder="New Password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="w-full border border-slate-300 rounded-xl pl-4 pr-10 py-2 text-sm outline-none focus:border-blue-500 font-mono" />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
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

            {/* TAB 2: MANAGEMENT NETWORKS (คงเดิม) */}
            {activeTab === 'NETWORKS' && (
              // ... โค้ดส่วน Management IPs เดิม
              <div className="flex-1 flex flex-col">
                <div className="mb-6 pb-4 border-b border-slate-100">
                  <h3 className="text-lg font-bold text-slate-800">Management IPs (Allow List)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  {managementIps.map((ip, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-50 transition-all">
                      <input type="text" value={ip} onChange={(e) => updateManagementIp(idx, e.target.value)} className="flex-1 bg-transparent px-2 py-1 text-sm font-mono text-emerald-800 outline-none w-full"/>
                      <button onClick={() => removeManagementIp(idx)} className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 pt-4 border-t border-slate-100 mt-auto">
                  <input type="text" placeholder="e.g. 10.234.56.0/24" value={newManagementIp} onChange={e => setNewManagementIp(e.target.value)} onKeyDown={e => e.key === 'Enter' && addManagementIp()} className="flex-1 md:max-w-sm border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-emerald-500" />
                  <button onClick={addManagementIp} className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold transition-all whitespace-nowrap"><Plus size={18} /> Add IP</button>
                  <div className="w-px h-8 bg-slate-200 hidden sm:block mx-1"></div>
                  <button onClick={() => handleSaveSetting('MANAGEMENT_IPS', managementIps)} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all whitespace-nowrap w-full sm:w-auto">
                    {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} Save IPs
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: PBR MONITOR TARGETS (คงเดิม) */}
            {activeTab === 'PBR' && (
              // ... โค้ดส่วน PBR เดิม
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">PBR Check-Gateway Targets</h3>
                    <p className="text-xs text-orange-600 mt-1 items-center gap-1 font-bold bg-orange-50 px-2 py-1 rounded inline-flex"><AlertTriangle size={14}/> บังคับ 5 ช่อง และห้ามใช้ IP ซ้ำกัน</p>
                  </div>
                  <button onClick={() => handleSaveSetting('MONITOR_IPS', monitorIps)} disabled={isSaving || monitorIps.some(ip => !ip)} className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                    {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} Save Targets
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {monitorIps.map((ip, idx) => (
                    <div key={idx} className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 group-focus-within:text-orange-500 transition-colors">WAN {idx + 1}</span>
                      <input type="text" value={ip} onChange={(e) => handleMonitorIpChange(idx, e.target.value)} className="w-full border-2 border-slate-200 rounded-xl pl-20 pr-4 py-3 text-sm font-mono text-slate-700 outline-none focus:border-orange-400 focus:bg-orange-50/30 transition-all" placeholder="8.8.8.8"/>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ⭐ TAB 4: DEFAULT NETWORKS (เพิ่มใหม่) */}
            {activeTab === 'DEFAULTS' && (
              <div className="flex-1 flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Default LAN & VLAN</h3>
                    <p className="text-sm text-slate-500">ค่าเริ่มต้นของวงเครือข่ายเมื่อสร้าง Config ใหม่</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addDefaultNetwork} className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                      <Plus size={16} /> Add Network
                    </button>
                    <button onClick={() => handleSaveSetting('DEFAULT_NETWORKS', defaultNetworks)} disabled={isSaving} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
                      {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} Save Defaults
                    </button>
                  </div>
                </div>

                <div className="space-y-3 overflow-y-auto pr-2 pb-4">
                  {defaultNetworks.map((net) => (
                    <div key={net.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                      
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">VLAN ID</label>
                        <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-center font-mono outline-none" value={net.vlanId} onChange={(e) => updateDefaultNetwork(net.id, 'vlanId', parseInt(e.target.value))} />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Network Name</label>
                        <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none" value={net.name} onChange={(e) => updateDefaultNetwork(net.id, 'name', e.target.value)} />
                      </div>

                      <div className="md:col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">IP / CIDR</label>
                        <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono outline-none" value={net.ip} onChange={(e) => updateDefaultNetwork(net.id, 'ip', e.target.value)} />
                      </div>

                      <div className="md:col-span-4 flex justify-end gap-2 mt-4 md:mt-0">
                        <button onClick={() => updateDefaultNetwork(net.id, 'dhcp', !net.dhcp)} className={`flex items-center px-3 py-2 rounded-lg border text-[11px] font-bold ${net.dhcp ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                          <Server size={14} className="mr-1" /> DHCP
                        </button>
                        <button onClick={() => toggleDefaultHotspot(net.id, net.hotspot)} className={`flex items-center px-3 py-2 rounded-lg border text-[11px] font-bold ${net.hotspot ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                          <ShieldCheck size={14} className="mr-1" /> HOTSPOT
                        </button>
                        <button onClick={() => removeDefaultNetwork(net.id)} className="p-2 text-slate-400 hover:text-red-600 bg-white border border-slate-200 hover:border-red-200 rounded-lg">
                          <Trash2 size={16} />
                        </button>
                      </div>

                    </div>
                  ))}
                  {defaultNetworks.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-sm">ยังไม่มีการตั้งค่า Network เริ่มต้น</div>
                  )}
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