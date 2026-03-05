import React, { useState, useMemo, useEffect } from 'react';
import { Users, Plus, Search, ChevronRight, ChevronLeft } from 'lucide-react';
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // จำนวนผู้ใช้ต่อหน้า 

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
  // Filtering & Pagination Logic
  // ==========================================
  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredUsers, currentPage, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

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
  // Render
  // ==========================================
  return (
    <div className="space-y-6 pb-10 animate-in fade-in duration-500">
      
      {/* 1. Page Header (แบบ Classic & Clean) */}
      <div className="space-y-4">
        {/* Breadcrumbs */}
        <nav className="flex items-center text-sm font-medium text-slate-500 gap-2">
          <a href="/dashboard" className="hover:text-blue-600 transition-colors">Home</a>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-400">System Administration</span>
          <ChevronRight size={14} className="text-slate-400" />
          <span className="text-slate-800">User Management</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <Users className="text-blue-600" size={28} /> 
              User Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              จัดการผู้ใช้งานระบบและกำหนดสิทธิ์การเข้าถึง (RBAC)
            </p>
          </div>
          
          {/* ปุ่ม Create สไตล์ Soft/Tonal */}
          <button 
            onClick={openAddModal} 
            className="shrink-0 bg-blue-50 text-blue-700 px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-100 transition-all font-semibold text-sm border border-blue-100"
          >
            <Plus size={18} strokeWidth={2.5} /> 
            <span>Add New User</span>
          </button>
        </div>

        {/* เส้นกั้น Solid Divider */}
        <hr className="border-slate-200 mt-2" />
      </div>

      {/* 2. Control Toolbar (Search & Filters) */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="ค้นหาชื่อ, อีเมล, หรือ Username..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <div className="text-sm text-slate-500 font-medium px-2">
          พบทั้งหมด <span className="text-slate-800 font-bold">{filteredUsers.length}</span> บัญชีผู้ใช้
        </div>
      </div>

      {/* 3. User Table Component & Pagination (🟢 ล็อคความสูงขั้นต่ำ min-h-[660px]) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[660px]">
        {/* กล่องตาราง */}
        <div className="flex-1">
          <UserTable 
            users={paginatedUsers} 
            loading={loading} 
            onEdit={openEditModal} 
            onDelete={handleDelete} 
          />
        </div>

        {/* 4. Pagination Controls (🟢 ใช้ mt-auto ดันลงไปติดขอบล่างของ Card เสมอ) */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-auto mb-6 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-1 p-1.5 bg-blue-50/80 backdrop-blur-md border border-blue-200/60 rounded-full shadow-[0_4px_20px_rgb(59,130,246,0.1)] transition-all">
              
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1} 
                className="p-2 rounded-full text-blue-500 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-blue-500 transition-all"
              >
                <ChevronLeft size={20} strokeWidth={2.5} />
              </button>
              
              <div className="flex items-center gap-1 px-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${
                      currentPage === page 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' 
                        : 'text-blue-600/70 hover:bg-blue-100 hover:text-blue-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages} 
                className="p-2 rounded-full text-blue-500 hover:bg-blue-100 hover:text-blue-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-blue-500 transition-all"
              >
                <ChevronRight size={20} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}
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