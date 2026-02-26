import React, { useState, useEffect } from 'react';
import apiClient from '../utils/apiClient';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Mail, Save, AlertCircle, Shield, CheckCircle, XCircle } from 'lucide-react';

const UserProfile = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await apiClient.get(`/api/users/${user.id}`);
        const { firstName, lastName, email } = response.data;
        setFormData(prev => ({ ...prev, firstName, lastName, email }));
      } catch (err) {
        setError('Failed to load user data.');
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchUserData();
  }, [user?.id]);

  // ✅ ระบบตรวจสอบเงื่อนไขรหัสผ่าน
  const isChangingPassword = formData.newPassword.length > 0 || formData.confirmNewPassword.length > 0;
  
  const passwordCriteria = [
    { label: "At least 8 characters", met: formData.newPassword.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(formData.newPassword) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(formData.newPassword) },
    { label: "Contains number", met: /[0-9]/.test(formData.newPassword) },
    { label: "Passwords match", met: formData.newPassword === formData.confirmNewPassword && formData.newPassword !== '' }
  ];

  const allCriteriaMet = passwordCriteria.every(c => c.met);

  const validateForm = () => {
    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required";
    
    if (isChangingPassword) {
      if (!formData.currentPassword) errors.currentPassword = "Current password is required to set a new one";
      if (!allCriteriaMet) errors.newPassword = "Password does not meet all requirements";
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: null }); // เคลียร์ Error เมื่อพิมพ์แก้ไข
    setSuccess(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
      };
      
      if (isChangingPassword) {
        payload.currentPassword = formData.currentPassword;
        payload.newPassword = formData.newPassword;
      }

      await apiClient.put(`/api/users/${user.id}`, payload);
      setSuccess('Profile updated successfully!');
      
      // Reset password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      }));

      // ลบแจ้งเตือนอัตโนมัติหลังผ่านไป 3 วินาที
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while updating profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Cover Photo & Profile Header (แนวนอนเต็มจอ) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
          <div className="absolute inset-0 bg-black/10"></div>
        </div>
        <div className="px-8 pb-8 pt-0 relative flex flex-col sm:flex-row items-center sm:items-end gap-6">
          <div className="w-24 h-24 rounded-2xl bg-white p-1.5 shadow-xl -mt-12 relative z-10">
            <div className="w-full h-full bg-blue-50 text-blue-600 flex items-center justify-center rounded-xl text-4xl font-black">
              {formData.firstName?.[0] || 'U'}
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left mb-1 sm:mb-0">
            <h1 className="text-2xl font-black text-slate-800">{formData.firstName} {formData.lastName}</h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mt-1">{user?.role}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 shadow-sm animate-in fade-in zoom-in-95">
          <AlertCircle size={20} className="shrink-0"/> 
          <span className="font-bold text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl flex items-center gap-3 shadow-sm animate-in fade-in zoom-in-95">
          <CheckCircle size={20} className="shrink-0"/> 
          <span className="font-bold text-sm">{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* เลย์เอาต์ Grid แบ่งซ้าย-ขวา */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* ฝั่งซ้าย: Personal Information */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden h-full">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <User size={120} />
            </div>

            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-6">
              <User className="text-blue-600" size={20} /> Personal Information
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">First Name</label>
                <input 
                  type="text" name="firstName" value={formData.firstName} onChange={handleChange} 
                  className={`w-full p-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-4 outline-none transition-all font-medium text-slate-700 ${fieldErrors.firstName ? 'border-red-300 focus:ring-red-50 focus:border-red-400' : 'border-slate-200 focus:ring-blue-50 focus:border-blue-400'}`} 
                />
                {fieldErrors.firstName && <p className="text-xs text-red-500 mt-1.5 font-bold flex items-center gap-1"><AlertCircle size={12}/> {fieldErrors.firstName}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Last Name</label>
                <input 
                  type="text" name="lastName" value={formData.lastName} onChange={handleChange} 
                  className={`w-full p-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-4 outline-none transition-all font-medium text-slate-700 ${fieldErrors.lastName ? 'border-red-300 focus:ring-red-50 focus:border-red-400' : 'border-slate-200 focus:ring-blue-50 focus:border-blue-400'}`} 
                />
                {fieldErrors.lastName && <p className="text-xs text-red-500 mt-1.5 font-bold flex items-center gap-1"><AlertCircle size={12}/> {fieldErrors.lastName}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" value={formData.email} disabled 
                  className="w-full pl-11 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium cursor-not-allowed" 
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2 font-medium">Email cannot be changed as it is used for login identification.</p>
            </div>
          </div>

          {/* ฝั่งขวา: Security & Password */}
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-6">
              <Shield className="text-emerald-600" size={20} /> Security & Password
            </h3>
            
            <div className="space-y-6 flex-1">
              
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange} placeholder="Required if changing password"
                      className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-4 outline-none transition-all font-mono text-sm ${fieldErrors.currentPassword ? 'border-red-300 focus:ring-red-50 focus:border-red-400' : 'border-slate-200 focus:ring-blue-50 focus:border-blue-400'}`} 
                    />
                  </div>
                  {fieldErrors.currentPassword && <p className="text-xs text-red-500 mt-1.5 font-bold flex items-center gap-1"><AlertCircle size={12}/> {fieldErrors.currentPassword}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} placeholder="New password"
                        className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-4 outline-none transition-all font-mono text-sm ${fieldErrors.newPassword ? 'border-red-300 focus:ring-red-50 focus:border-red-400' : 'border-slate-200 focus:ring-blue-50 focus:border-blue-400'}`} 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm New</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="password" name="confirmNewPassword" value={formData.confirmNewPassword} onChange={handleChange} placeholder="Confirm password"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none transition-all font-mono text-sm" 
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Password Validation Checklist (ย้ายลงมาเรียงต่อกัน) */}
              {isChangingPassword && (
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 mt-4 animate-in fade-in slide-in-from-top-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">Password Requirements</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {passwordCriteria.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm transition-all duration-300">
                        {c.met ? <CheckCircle size={16} className="text-green-500 shrink-0" /> : <XCircle size={16} className="text-slate-300 shrink-0" />}
                        <span className={c.met ? "text-green-600 font-medium" : "text-slate-400"}>{c.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
            </div>
          </div>
        </div>

        {/* Submit Button Section */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button 
            type="submit" 
            disabled={isSubmitting || (isChangingPassword && !allCriteriaMet)}
            className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...</>
            ) : (
              <><Save size={18} /> Save Changes</>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};

export default UserProfile;