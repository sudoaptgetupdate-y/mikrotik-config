import React from 'react';
import { Edit, Plus, X, Mail, User, Shield, Lock, CheckCircle2, XCircle } from 'lucide-react';

const UserFormModal = ({ 
  isOpen, 
  onClose, 
  isEditing, 
  formData, 
  handleInputChange, 
  handleSubmit, 
  generatedUsername, 
  passwordRules 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4 py-4 sm:p-0">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-100 bg-slate-50 shrink-0">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            {isEditing ? <Edit size={18} className="text-blue-600" /> : <Plus size={18} className="text-blue-600" />}
            {isEditing ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-slate-700 mb-1">ชื่อจริง (First Name) *</label><input required type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-100" placeholder="ชื่อ" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">นามสกุล (Last Name) *</label><input required type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-100" placeholder="นามสกุล" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">อีเมล (Email) *</label>
                <div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required disabled={isEditing} type="email" name="email" value={formData.email} onChange={handleInputChange} className={`w-full border border-slate-200 rounded-lg pl-9 p-2.5 text-sm focus:ring-2 focus:ring-blue-100 ${isEditing ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`} placeholder="example@domain.com" /></div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อผู้ใช้ (Username)</label>
                <div className="relative"><User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input disabled type="text" value={generatedUsername} className="w-full border border-slate-200 rounded-lg pl-9 p-2.5 text-sm bg-slate-50 text-slate-500" placeholder="สร้างอัตโนมัติจากอีเมล" /></div>
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
              <label className="block text-xs font-bold text-slate-700 mb-1">{isEditing ? 'เปลี่ยนรหัสผ่านใหม่ (เว้นว่างไว้ถ้าไม่ต้องการเปลี่ยน)' : 'ตั้งรหัสผ่าน (Password) *'}</label>
              <div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required={!isEditing} type="password" name="password" value={formData.password} onChange={handleInputChange} className="w-full border border-slate-200 rounded-lg pl-9 p-2.5 text-sm focus:ring-2 focus:ring-blue-100" placeholder="••••••••" /></div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ยืนยันรหัสผ่าน (Confirm Password) *</label>
              <div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required={!isEditing || formData.password} type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} className="w-full border border-slate-200 rounded-lg pl-9 p-2.5 text-sm focus:ring-2 focus:ring-blue-100" placeholder="••••••••" /></div>
              {(!isEditing || formData.password.length > 0) && (
                <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-[11px] font-bold text-slate-600 mb-2">เงื่อนไขรหัสผ่าน:</p>
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
            <button type="button" onClick={onClose} className="px-4 py-2.5 sm:py-2 rounded-xl border border-slate-200 sm:border-transparent text-slate-600 hover:bg-slate-200 transition text-sm font-medium w-full sm:w-auto text-center">ยกเลิก</button>
            <button type="submit" className="px-5 py-2.5 sm:py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition text-sm font-bold shadow-sm w-full sm:w-auto text-center">{isEditing ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างผู้ใช้งาน'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;