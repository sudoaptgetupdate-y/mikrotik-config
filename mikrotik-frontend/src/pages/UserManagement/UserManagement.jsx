import React, { useState, useMemo, useEffect } from 'react';
import { Users, Plus, Search, ChevronRight, ChevronLeft } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';

import { userService } from '../../services/userService';
import UserFormModal from './components/UserFormModal';
import UserTable from './components/UserTable';
import Pagination from '../../components/Pagination';

const UserManagement = () => {
  const queryClient = useQueryClient();

  // ==========================================
  // States
  // ==========================================
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'inactive'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ id: null, firstName: '', lastName: '', email: '', role: 'EMPLOYEE', isActive: true, password: '', confirmPassword: '' });

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
    return users.filter(u => {
      const matchesSearch = `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            u.username.toLowerCase().includes(searchTerm.toLowerCase());
      
      // แท็บ 1: แสดงทุกคนที่ยังไม่โดน Archive (ทั้งคน Active และ Inactive)
      // แท็บ 2: แสดงคนที่โดน Archive แล้ว
      const matchesTab = activeTab === 'active' ? !u.isArchived : u.isArchived;
      
      return matchesSearch && matchesTab;
    });
  }, [users, searchTerm, activeTab]);

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
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const openAddModal = () => {
    setFormData({ id: null, firstName: '', lastName: '', email: '', role: 'EMPLOYEE', isActive: true, isArchived: false, password: '', confirmPassword: '' });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (user) => {
    setFormData({ id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role, isActive: user.isActive, isArchived: user.isArchived, password: '', confirmPassword: '' });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (user) => {
    const newStatus = !user.isActive;
    const updatePromise = userService.updateUser(user.id, { isActive: newStatus });
    
    toast.promise(updatePromise, {
      loading: 'กำลังอัปเดตสถานะ...',
      success: `เปลี่ยนสถานะเป็น ${newStatus ? 'Active' : 'Inactive'} เรียบร้อย!`,
      error: (err) => err.response?.data?.error || "ไม่สามารถเปลี่ยนสถานะได้"
    });

    try {
      await updatePromise;
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {}
  };

  const handleRestoreUser = async (user) => {
    const updatePromise = userService.updateUser(user.id, { isArchived: false, isActive: true });
    
    toast.promise(updatePromise, {
      loading: 'กำลังกู้คืนบัญชี...',
      success: 'กู้คืนบัญชีผู้ใช้เรียบร้อย!',
      error: (err) => err.response?.data?.error || "กู้คืนบัญชีไม่สำเร็จ"
    });

    try {
      await updatePromise;
      queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {}
  };

  const handleDelete = async (user) => {
    const result = await Swal.fire({
      title: user.isArchived ? 'ยืนยันการลบถาวร?' : 'ยืนยันการลบผู้ใช้งาน?',
      text: user.isArchived 
        ? `ระวัง! ข้อมูลของ "${user.firstName}" จะถูกลบออกจากฐานข้อมูลอย่างถาวรและไม่สามารถกู้คืนได้`
        : `คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้ "${user.firstName} ${user.lastName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: user.isArchived ? 'ใช่, ลบถาวร!' : 'ใช่, ลบเลย!',
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
        success: (res) => res.type === 'SOFT_DELETE' ? 'ย้ายผู้ใช้ไปห้องเก็บประวัติ (Archived) เนื่องจากมีข้อมูลผูกพัน' : 'ลบผู้ใช้สำเร็จ!',
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

    const payload = isEditing ? { firstName: formData.firstName, lastName: formData.lastName, role: formData.role, isActive: formData.isActive, isArchived: formData.isArchived, ...(formData.password && {password: formData.password}) } : formData;
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
  // 🟢 เปลี่ยนจาก pb-10 เป็น pb-28 เพื่อเว้นที่ให้ Pagination ลอยได้
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 my-4 sm:my-8">
      
      {/* 1. Page Header Section (Island Card) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Users className="text-blue-600" size={28} /> 
            User Management
          </h1>
          <p className="text-sm text-slate-500 mt-1 font-medium italic">
            จัดการผู้ใช้งานระบบและกำหนดสิทธิ์การเข้าถึง (RBAC)
          </p>
        </div>
        
        <div className="relative z-10">
          <button 
            onClick={openAddModal} 
            className="shrink-0 bg-blue-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 transition-all font-bold text-sm shadow-lg shadow-blue-500/20"
          >
            <Plus size={18} strokeWidth={2.5} /> 
            <span>Add New User</span>
          </button>
        </div>

        {/* Accent Blur */}
        <div className="absolute right-0 top-0 w-48 h-48 bg-blue-50/50 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-100/50 transition-colors duration-700"></div>
      </div>

      {/* 2. Control Toolbar (Tabs & Search) */}
      <div className="space-y-4">
        {/* Tab Selection */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-max border border-slate-200 shadow-inner">
          <button 
            onClick={() => { setActiveTab('active'); setCurrentPage(1); }}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'active' 
              ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
            }`}
          >
            Users
            <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
              {users.filter(u => !u.isArchived).length}
            </span>
          </button>
          <button 
            onClick={() => { setActiveTab('inactive'); setCurrentPage(1); }}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'inactive' 
              ? 'bg-white text-orange-600 shadow-sm ring-1 ring-slate-200' 
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
            }`}
          >
            Archived
            <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === 'inactive' ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-500'}`}>
              {users.filter(u => u.isArchived).length}
            </span>
          </button>
        </div>

        {/* Search Toolbar */}
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={`ค้นหาใน ${activeTab === 'active' ? 'รายชื่อผู้ใช้' : 'จดหมายเหตุ'}...`} 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <div className="text-sm text-slate-500 font-medium px-2">
            พบ <span className={`font-bold ${activeTab === 'active' ? 'text-blue-600' : 'text-orange-600'}`}>{filteredUsers.length}</span> รายการ
          </div>
        </div>
      </div>

      {/* 3. Content Area (🟢 เปลี่ยนมาใช้ Responsive Min-Height ให้กล่องตาราง) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[450px] md:min-h-[600px] xl:min-h-[700px]">
        <div className="flex-1">
          <UserTable 
            users={paginatedUsers} 
            loading={loading} 
            onEdit={openEditModal} 
            onDelete={handleDelete} 
            onToggleStatus={handleToggleStatus}
            onRestore={handleRestoreUser}
            isArchivedTab={activeTab === 'inactive'}
          />
        </div>
      </div>

      <Pagination 
        currentPage={currentPage} 
        totalPages={totalPages} 
        setCurrentPage={setCurrentPage} 
      />

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