import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { 
  Users, Plus, Search, Edit, Trash2, Shield, User, Mail, 
  Lock, CheckCircle2, XCircle, X, ShieldAlert, ShieldCheck 
} from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    firstName: '',
    lastName: '',
    email: '',
    role: 'EMPLOYEE',
    password: '',
    confirmPassword: ''
  });

  // สำหรับดึง Username มาโชว์เป็นตัวอย่างตอนพิมพ์ Email
  const generatedUsername = formData.email ? formData.email.split('@')[0] : '';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/users');
      setUsers(res.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  // กฎการตั้งรหัสผ่าน
  const passwordRules = [
    { id: 'length', label: 'อย่างน้อย 8 ตัวอักษร', regex: /.{8,}/ },
    { id: 'upper', label: 'ตัวพิมพ์ใหญ่ (A-Z)', regex: /[A-Z]/ },
    { id: 'lower', label: 'ตัวพิมพ์เล็ก (a-z)', regex: /[a-z]/ },
    { id: 'number', label: 'ตัวเลข (0-9)', regex: /[0-9]/ },
    { id: 'special', label: 'อักขระพิเศษ (@$!%*?&)', regex: /[@$!%*?&#^]/ }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openAddModal = () => {
    setFormData({ id: null, firstName: '', lastName: '', email: '', role: 'EMPLOYEE', password: '', confirmPassword: '' });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setFormData({ 
      id: user.id, 
      firstName: user.firstName, 
      lastName: user.lastName, 
      email: user.email, 
      role: user.role, 
      password: '', // เว้นว่างไว้ ถ้าไม่กรอกแปลว่าไม่เปลี่ยนรหัสผ่าน
      confirmPassword: ''
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (user) => {
    if (confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ ${user.firstName} ${user.lastName}?`)) {
      try {
        await apiClient.delete(`/api/users/${user.id}`);
        fetchUsers();
      } catch (error) {
        alert(error.response?.data?.error || "ลบผู้ใช้ไม่สำเร็จ");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ตรวจสอบรหัสผ่าน
    if (!isEditing || formData.password) {
      if (formData.password !== formData.confirmPassword) {
        return alert("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
      }
      const isValidPassword = passwordRules.every(rule => rule.regex.test(formData.password));
      if (!isValidPassword) {
        return alert("รหัสผ่านไม่ตรงตามเงื่อนไขความปลอดภัย กรุณาตรวจสอบอีกครั้ง");
      }
    }

    try {
      if (isEditing) {
        const payload = { 
          firstName: formData.firstName, 
          lastName: formData.lastName, 
          role: formData.role 
        };
        if (formData.password) payload.password = formData.password;
        await apiClient.put(`/api/users/${formData.id}`, payload);
      } else {
        await apiClient.post('/api/users', formData);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      alert(error.response?.data?.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    }
  };

  const filteredUsers = users.filter(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role) => {
    if (role === 'SUPER_ADMIN') return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md text-xs font-bold flex items-center gap-1 w-max"><ShieldAlert size={12}/> Super Admin</span>;
    if (role === 'ADMIN') return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold flex items-center gap-1 w-max"><ShieldCheck size={12}/> Admin</span>;
    return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md text-xs font-bold flex items-center gap-1 w-max"><User size={12}/> Employee</span>;
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-blue-600" /> User Management
          </h2>
          <p className="text-slate-500 mt-1">จัดการผู้ใช้งานระบบและกำหนดสิทธิ์การเข้าถึง (RBAC)</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition font-medium w-full md:w-auto"
        >
          <Plus size={20} /> Add New User
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="ค้นหาชื่อ, อีเมล, หรือ Username..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400">Loading users...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold">
                  <th className="p-4 pl-6 whitespace-nowrap">User / Username</th>
                  <th className="p-4 whitespace-nowrap">Email</th>
                  <th className="p-4 whitespace-nowrap">Role</th>
                  <th className="p-4 whitespace-nowrap">Created Date</th>
                  <th className="p-4 text-right pr-6 whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 pl-6">
                      <div className="font-bold text-slate-800 text-sm whitespace-nowrap">{user.firstName} {user.lastName}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">@{user.username}</div>
                    </td>
                    <td className="p-4 text-sm text-slate-600 whitespace-nowrap">{user.email}</td>
                    <td className="p-4">{getRoleBadge(user.role)}</td>
                    <td className="p-4 text-sm text-slate-500 whitespace-nowrap">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="p-4 text-right pr-6 whitespace-nowrap">
                      <button onClick={() => openEditModal(user)} className="p-2 text-slate-400 hover:text-blue-600 transition">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(user)} className="p-2 text-slate-400 hover:text-red-600 transition">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr><td colSpan="5" className="p-10 text-center text-slate-400">ไม่พบข้อมูลผู้ใช้งาน</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4 py-4 sm:p-0">
          {/* ✅ เปลี่ยนให้ Modal จัดการความสูงได้ดีขึ้นบนมือถือ */}
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-100 bg-slate-50 shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                {isEditing ? <Edit size={18} className="text-blue-600" /> : <Plus size={18} className="text-blue-600" />}
                {isEditing ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              {/* ✅ ให้พื้นที่เนื้อหา Form เลื่อนได้ (Scrollable) */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
                
                {/* ✅ เปลี่ยนจาก grid-cols-2 บังคับเป็น grid-cols-1 บนมือถือ และสมาร์ทโฟนแนวนอนเป็น 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อจริง (First Name) *</label>
                    <input required type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-100" placeholder="ชื่อ" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">นามสกุล (Last Name) *</label>
                    <input required type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-100" placeholder="นามสกุล" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">อีเมล (Email) *</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        required 
                        disabled={isEditing} 
                        type="email" 
                        name="email" 
                        value={formData.email} 
                        onChange={handleInputChange} 
                        className={`w-full border border-slate-200 rounded-lg pl-9 p-2.5 text-sm focus:ring-2 focus:ring-blue-100 ${isEditing ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} 
                        placeholder="example@domain.com" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้ใช้ (Username)</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        disabled 
                        type="text" 
                        value={generatedUsername} 
                        className="w-full border border-slate-200 rounded-lg pl-9 p-2.5 text-sm bg-slate-50 text-slate-500" 
                        placeholder="สร้างอัตโนมัติจากอีเมล" 
                      />
                    </div>
                    {!isEditing && <p className="text-[10px] text-slate-400 mt-1">* ระบบจะสร้างจากอีเมลอัตโนมัติ</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ระดับสิทธิ์ (Role) *</label>
                  <div className="relative">
                    <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select name="role" value={formData.role} onChange={handleInputChange} className="w-full border border-slate-200 rounded-lg pl-9 p-2.5 text-sm focus:ring-2 focus:ring-blue-100 bg-white">
                      <option value="SUPER_ADMIN">Super Admin (จัดการได้ทุกอย่าง)</option>
                      <option value="ADMIN">Admin (จัดการ Employee และอุปกรณ์ได้)</option>
                      <option value="EMPLOYEE">Employee (ดูและตั้งค่าอุปกรณ์ของตัวเอง)</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 sm:pt-5">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEditing ? 'เปลี่ยนรหัสผ่านใหม่ (เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)' : 'ตั้งรหัสผ่าน (Password) *'}
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      required={!isEditing}
                      type="password" 
                      name="password" 
                      value={formData.password} 
                      onChange={handleInputChange} 
                      className="w-full border border-slate-200 rounded-lg pl-9 p-2.5 text-sm focus:ring-2 focus:ring-blue-100" 
                      placeholder="••••••••" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ยืนยันรหัสผ่าน (Confirm Password) *
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      required={!isEditing || formData.password}
                      type="password" 
                      name="confirmPassword" 
                      value={formData.confirmPassword} 
                      onChange={handleInputChange} 
                      className="w-full border border-slate-200 rounded-lg pl-9 p-2.5 text-sm focus:ring-2 focus:ring-blue-100" 
                      placeholder="••••••••" 
                    />
                  </div>
                  
                  {/* Password Validator UI */}
                  {(!isEditing || formData.password.length > 0) && (
                    <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <p className="text-[11px] font-bold text-slate-600 mb-2">เงื่อนไขรหัสผ่าน:</p>
                      {/* ✅ ปรับ Grid ให้รองรับหน้าจอมือถือเล็กๆ */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {passwordRules.map(rule => {
                          const isPass = rule.regex.test(formData.password);
                          return (
                            <div key={rule.id} className={`flex items-center gap-1.5 text-[11px] font-medium ${isPass ? 'text-green-600' : 'text-slate-400'}`}>
                              {isPass ? <CheckCircle2 size={14} className="shrink-0" /> : <XCircle size={14} className="shrink-0" />}
                              {rule.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

              </div>
              <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-3 bg-slate-50 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2.5 sm:py-2 rounded-xl border border-slate-200 sm:border-transparent text-slate-600 hover:bg-slate-200 transition text-sm font-medium w-full sm:w-auto text-center">
                  ยกเลิก
                </button>
                <button type="submit" className="px-5 py-2.5 sm:py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition text-sm font-bold shadow-sm w-full sm:w-auto text-center">
                  {isEditing ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างผู้ใช้งาน'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default UserManagement;