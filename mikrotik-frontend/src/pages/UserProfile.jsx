import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Mail, Save, AlertCircle, Shield, CheckCircle, XCircle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/userService';
import toast from 'react-hot-toast';

const UserProfile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ==========================================
  // States
  // ==========================================
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '',
    currentPassword: '', newPassword: '', confirmNewPassword: ''
  });
  
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ==========================================
  // React Query Fetching
  // ==========================================
  const { data: userData, isLoading: loading } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: () => userService.getUserById(user.id),
    enabled: !!user?.id, 
    onError: () => toast.error('Failed to load user data.')
  });

  // ==========================================
  // Effects
  // ==========================================
  useEffect(() => {
    if (userData) {
      setFormData(prev => ({ ...prev, firstName: userData.firstName, lastName: userData.lastName, email: userData.email }));
    }
  }, [userData]);

  // ==========================================
  // Validation Logic
  // ==========================================
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
    if (Object.keys(errors).length > 0) toast.error("กรุณาตรวจสอบข้อมูลให้ถูกต้อง"); 
    return Object.keys(errors).length === 0;
  };

  // ==========================================
  // Handlers (Actions)
  // ==========================================
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setFieldErrors({ ...fieldErrors, [e.target.name]: null });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    const payload = { firstName: formData.firstName, lastName: formData.lastName };
    if (isChangingPassword) {
      payload.currentPassword = formData.currentPassword;
      payload.newPassword = formData.newPassword;
    }

    const updatePromise = userService.updateUser(user.id, payload);

    toast.promise(updatePromise, {
      loading: 'Saving profile...',
      success: 'Profile updated successfully!',
      error: (err) => err.response?.data?.error || 'An error occurred while updating profile.'
    });

    try {
      await updatePromise;
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmNewPassword: '' }));
      queryClient.invalidateQueries({ queryKey: ['userProfile', user.id] });
    } catch (err) {
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // Render
  // ==========================================
  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 my-4 sm:my-8">
      
      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden group relative">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Accent Blur */}
          <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/20 transition-colors duration-700"></div>
        </div>
        <div className="px-8 pb-8 pt-0 relative flex flex-col sm:flex-row items-center sm:items-end gap-6">
          <div className="w-24 h-24 rounded-2xl bg-white p-1.5 shadow-xl -mt-12 relative z-10">
            <div className="w-full h-full bg-blue-50 text-blue-600 flex items-center justify-center rounded-xl text-4xl font-bold">
              {formData.firstName?.[0] || 'U'}
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left mb-1 sm:mb-0 relative z-10">
            <h1 className="text-2xl font-bold text-slate-800">{formData.firstName} {formData.lastName}</h1>
            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mt-1">{user?.role}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden h-full group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700"><User size={120} /></div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6"><User className="text-blue-600" size={20} /> Personal Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
              <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">First Name</label><input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className={`w-full p-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-4 outline-none transition-all font-medium text-slate-700 ${fieldErrors.firstName ? 'border-red-300 focus:ring-red-50 focus:border-red-400' : 'border-slate-200 focus:ring-blue-50 focus:border-blue-400'}`} />{fieldErrors.firstName && <p className="text-xs text-red-500 mt-1.5 font-bold flex items-center gap-1"><AlertCircle size={12}/> {fieldErrors.firstName}</p>}</div>
              <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Last Name</label><input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={`w-full p-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-4 outline-none transition-all font-medium text-slate-700 ${fieldErrors.lastName ? 'border-red-300 focus:ring-red-50 focus:border-red-400' : 'border-slate-200 focus:ring-blue-50 focus:border-blue-400'}`} />{fieldErrors.lastName && <p className="text-xs text-red-500 mt-1.5 font-bold flex items-center gap-1"><AlertCircle size={12}/> {fieldErrors.lastName}</p>}</div>
            </div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label><div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="email" value={formData.email} disabled className="w-full pl-11 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium cursor-not-allowed" /></div></div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm h-full flex flex-col group relative overflow-hidden">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6"><Shield className="text-emerald-600" size={20} /> Security & Password</h3>
            <div className="space-y-6 flex-1 relative z-10">
              <div className="space-y-5">
                <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Current Password</label><div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="password" name="currentPassword" value={formData.currentPassword} onChange={handleChange} placeholder="Required if changing password" className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-4 outline-none transition-all font-mono text-sm ${fieldErrors.currentPassword ? 'border-red-300 focus:ring-red-50 focus:border-red-400' : 'border-slate-200 focus:ring-blue-50 focus:border-blue-400'}`} /></div>{fieldErrors.currentPassword && <p className="text-xs text-red-500 mt-1.5 font-bold flex items-center gap-1"><AlertCircle size={12}/> {fieldErrors.currentPassword}</p>}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">New Password</label><div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} placeholder="New password" className={`w-full pl-11 pr-4 py-3 bg-slate-50 border rounded-xl focus:bg-white focus:ring-4 outline-none transition-all font-mono text-sm ${fieldErrors.newPassword ? 'border-red-300 focus:ring-red-50 focus:border-red-400' : 'border-slate-200 focus:ring-blue-50 focus:border-blue-400'}`} /></div></div>
                  <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm New</label><div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input type="password" name="confirmNewPassword" value={formData.confirmNewPassword} onChange={handleChange} placeholder="Confirm password" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-50 border-blue-400 outline-none transition-all font-mono text-sm" /></div></div>
                </div>
              </div>
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
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50 rounded-full blur-2xl opacity-50 group-hover:bg-emerald-50 transition-colors duration-700"></div>
          </div>
        </div>
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <button type="submit" disabled={isSubmitting || (isChangingPassword && !allCriteriaMet)} className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed">
            {isSubmitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Saving...</> : <><Save size={18} /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserProfile;