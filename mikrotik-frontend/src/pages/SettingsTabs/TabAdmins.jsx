import { useState } from 'react';
import { Save, Plus, Trash2, Loader2, Eye, EyeOff } from 'lucide-react';
import apiClient from '../../utils/apiClient';

export default function TabAdmins({ initialData }) {
  const [routerAdmins, setRouterAdmins] = useState(initialData || []);
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '', group: 'full' });
  const [showPassword, setShowPassword] = useState({});
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.put(`/api/settings/ROUTER_ADMINS`, { value: routerAdmins });
      alert(`บันทึกข้อมูล ROUTER_ADMINS สำเร็จ!`);
    } catch (error) {
      alert(`เกิดข้อผิดพลาดในการบันทึก: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-slate-100 gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Default Router Admins</h3>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all">
          {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16} />} Save Admins
        </button>
      </div>
      
      <div className="space-y-4">
        {routerAdmins.map((admin, idx) => (
          <div key={idx} className="grid grid-cols-2 md:flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-50 transition-all">
            <input type="text" value={admin.username} onChange={(e) => updateAdmin(idx, 'username', e.target.value)} placeholder="Username" className="col-span-2 md:flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold outline-none" />
            <div className="col-span-2 md:flex-1 relative">
              <input type={showPassword[idx] ? "text" : "password"} value={admin.password} onChange={(e) => updateAdmin(idx, 'password', e.target.value)} placeholder="Password" className="w-full bg-white border border-slate-200 rounded-lg pl-3 pr-10 py-2 text-sm outline-none font-mono" />
              <button type="button" onClick={() => togglePasswordVisibility(idx)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
                {showPassword[idx] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <select value={admin.group} onChange={(e) => updateAdmin(idx, 'group', e.target.value)} className="col-span-1 md:w-32 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-indigo-700 outline-none">
              <option value="full">Full</option>
              <option value="read">Read</option>
            </select>
            <button onClick={() => removeAdmin(idx)} className="col-span-1 flex justify-center text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2.5 rounded-lg transition-colors"><Trash2 size={18} /></button>
          </div>
        ))}

        <div className="grid grid-cols-2 md:flex items-center gap-3 pt-4 mt-4 border-t border-slate-100">
          <input type="text" placeholder="New Username" value={newAdmin.username} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})} className="col-span-2 md:flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500" />
          <div className="col-span-2 md:flex-1 relative">
            <input type={showNewPassword ? "text" : "password"} placeholder="New Password" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} className="w-full border border-slate-300 rounded-xl pl-4 pr-10 py-2 text-sm outline-none focus:border-blue-500 font-mono" />
            <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none">
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <select value={newAdmin.group} onChange={e => setNewAdmin({...newAdmin, group: e.target.value})} className="col-span-1 md:w-32 border border-slate-300 rounded-xl px-4 py-2 text-sm outline-none focus:border-blue-500">
            <option value="full">Full</option>
            <option value="read">Read</option>
          </select>
          <button onClick={addAdmin} className="col-span-1 justify-center bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl flex items-center gap-2 font-bold transition-all"><Plus size={18} /> Add</button>
        </div>
      </div>
    </div>
  );
}