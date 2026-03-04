import React, { useState } from 'react';
import { Users, Plus, Search } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

import { userService } from '../../services/userService';
import UserFormModal from './components/UserFormModal';
import UserTable from './components/UserTable';

const UserManagement = () => {
  const queryClient = useQueryClient();

  // ==========================================
  // States
  // ==========================================
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ id: null, firstName: '', lastName: '', email: '', role: 'EMPLOYEE', password: '', confirmPassword: '' });

  const generatedUsername = formData.email ? formData.email.split('@')[0] : '';

  // ==========================================
  // React Query Fetching
  // ==========================================
  const { data: users = [], isLoading: loading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getUsers(),
    onError: () => toast.error("ดึงข้อมูลผู้ใช้ไม่สำเร็จ")
  });

  // ==========================================
  // Validation Rules
  // ==========================================
  const passwordRules = [
    { id: 'length', label: 'อย่างน้อย 8 ตัวอักษร', regex: /.{8,}/ },
    { id: 'upper', label: 'ตัวพิมพ์ใหญ่ (A-Z)', regex: /[A-Z]/ },
    { id: 'lower', label: 'ตัวพิมพ์เล็ก (a-z)', regex: /[a-z]/ },
    { id: 'number', label: 'ตัวเลข (0-9)', regex: /[0-9]/ },
    { id: 'special', label: 'อักขระพิเศษ (@$!%*?&)', regex: /[@$!%*?&#^]/ }
  ];

  // ==========================================
  // Handlers (Actions)
  // ==========================================
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
    setFormData({ id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, password: '', confirmPassword: '' });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (user) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบผู้ใช้งาน?',
      text: `คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ "${user.firstName} ${user.lastName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก',
      buttonsStyling: false,
      customClass: {
        popup: 'rounded-3xl p-6 border border-slate-100 shadow-2xl',
        title: 'text-xl font-bold text-slate-800',
        htmlContainer: 'text-sm text-slate-500 font-medium mt-2',
        actions: 'flex gap-3 mt-6 w-full justify-center',
        confirmButton: 'bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all',
        cancelButton: 'bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl text-sm font-bold transition-all'
      }
    });

    if (result.isConfirmed) {
      const deletePromise = userService.deleteUser(user.id);
      toast.promise(deletePromise, {
        loading: 'Deleting user...',
        success: 'ลบผู้ใช้สำเร็จ!',
        error: (err) => err.response?.data?.error || "ลบผู้ใช้ไม่สำเร็จ"
      });
      try {
        await deletePromise;
        queryClient.invalidateQueries({ queryKey: ['users'] });
      } catch (error) {}
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isEditing || formData.password) {
      if (formData.password !== formData.confirmPassword) return toast.error("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
      const isValidPassword = passwordRules.every(rule => rule.regex.test(formData.password));
      if (!isValidPassword) return toast.error("รหัสผ่านไม่ตรงตามเงื่อนไขความปลอดภัย");
    }

    const payload = isEditing ? { firstName: formData.firstName, lastName: formData.lastName, role: formData.role, ...(formData.password && {password: formData.password}) } : formData;
    const savePromise = isEditing ? userService.updateUser(formData.id, payload) : userService.createUser(payload);

    toast.promise(savePromise, {
      loading: 'Saving user...',
      success: isEditing ? 'อัปเดตผู้ใช้สำเร็จ!' : 'สร้างผู้ใช้ใหม่สำเร็จ!',
      error: (err) => err.response?.data?.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
    });

    try {
      await savePromise;
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {}
  };

  // ==========================================
  // Filtering Logic
  // ==========================================
  const filteredUsers = users.filter(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ==========================================
  // Render
  // ==========================================
  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Users className="text-blue-600" /> User Management</h2>
          <p className="text-slate-500 mt-1">จัดการผู้ใช้งานระบบและกำหนดสิทธิ์การเข้าถึง (RBAC)</p>
        </div>
        <button onClick={openAddModal} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition font-medium w-full md:w-auto"><Plus size={20} /> Add New User</button>
      </div>

      {/* Search Box */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="ค้นหาชื่อ, อีเมล, หรือ Username..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 transition" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* User Table Component */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <UserTable 
          users={filteredUsers} 
          loading={loading} 
          onEdit={openEditModal} 
          onDelete={handleDelete} 
        />
      </div>

      {/* User Form Modal Component */}
      <UserFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isEditing={isEditing}
        formData={formData}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        generatedUsername={generatedUsername}
        passwordRules={passwordRules}
      />
    </div>
  );
};

export default UserManagement;