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

  // ✅ ระบบตรวจสอบเงื่อนไขรหัสผ่าน (Real-time Validation)
  const passwordCriteria = [
    { label: "At least 8 characters", met: formData.newPassword.length >= 8 },
    { label: "Uppercase (A-Z)", met: /[A-Z]/.test(formData.newPassword) },
    { label: "Lowercase (a-z)", met: /[a-z]/.test(formData.newPassword) },
    { label: "Number (0-9)", met: /\d/.test(formData.newPassword) },
    { label: "Special character (@$!%*?&)", met: /[@$!%*?&]/.test(formData.newPassword) },
  ];

  const allCriteriaMet = passwordCriteria.every(c => c.met);
  const isChangingPassword = formData.newPassword.length > 0 || formData.currentPassword.length > 0;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFieldErrors(prev => ({ ...prev, [name]: null }));
    setError(null);
    setSuccess(null);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = "First name is required";
    if (!formData.lastName.trim()) errors.lastName = "Last name is required";

    if (isChangingPassword) {
      if (!formData.currentPassword) errors.currentPassword = "Required to verify identity";
      if (!allCriteriaMet) errors.newPassword = "Password does not meet requirements";
      if (formData.newPassword !== formData.confirmNewPassword) {
        errors.confirmNewPassword = "Passwords do not match";
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = { firstName: formData.firstName, lastName: formData.lastName };
      if (formData.newPassword) {
        payload.currentPassword = formData.currentPassword;
        payload.newPassword = formData.newPassword;
      }
      await apiClient.put(`/api/users/${user.id}`, payload);
      setSuccess("Profile updated successfully!");
      setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmNewPassword: '' }));
    } catch (err) {
      setError(err.response?.data?.error || "Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse text-slate-400">Loading profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <User className="text-blue-600" /> User Profile
        </h2>
        <p className="text-slate-500">Manage your personal information and security settings.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-center gap-2"><AlertCircle size={18}/>{error}</div>}
        {success && <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-100 flex items-center gap-2"><CheckCircle size={18}/>{success}</div>}

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2 font-bold text-slate-800 border-b pb-2 mb-2">Personal Information</div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">First Name</label>
            <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none" />
            {fieldErrors.firstName && <p className="text-red-500 text-xs mt-1">{fieldErrors.firstName}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Last Name</label>
            <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none" />
            {fieldErrors.lastName && <p className="text-red-500 text-xs mt-1">{fieldErrors.lastName}</p>}
          </div>
          <div className="md:col-span-2 opacity-60">
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Email (Read-only)</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="email" value={formData.email} disabled className="w-full border border-slate-200 rounded-xl pl-10 p-3 text-sm bg-slate-50" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="font-bold text-slate-800 border-b pb-2 flex items-center gap-2"><Shield size={18} className="text-blue-500"/> Security & Password</div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Current Password</label>
                <input type="password" name="currentPassword" value={formData.currentPassword} onChange={handleInputChange} className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Verify old password" />
                {fieldErrors.currentPassword && <p className="text-red-500 text-xs mt-1">{fieldErrors.currentPassword}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">New Password</label>
                <input type="password" name="newPassword" value={formData.newPassword} onChange={handleInputChange} className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none" placeholder="New password" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase">Confirm New Password</label>
                <input type="password" name="confirmNewPassword" value={formData.confirmNewPassword} onChange={handleInputChange} className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-100 outline-none" placeholder="Confirm new password" />
                {fieldErrors.confirmNewPassword && <p className="text-red-500 text-xs mt-1">{fieldErrors.confirmNewPassword}</p>}
              </div>
            </div>

            {/* Password Validation Checklist */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 self-start">
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 tracking-wider">Password Requirements</h4>
              <div className="space-y-2.5">
                {passwordCriteria.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm transition-all duration-300">
                    {c.met ? <CheckCircle size={16} className="text-green-500 shrink-0" /> : <XCircle size={16} className="text-slate-300 shrink-0" />}
                    <span className={c.met ? "text-green-600 font-medium" : "text-slate-400"}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={isSubmitting || (isChangingPassword && !allCriteriaMet)}
            className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            {isSubmitting ? "Saving..." : <><Save size={18}/> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserProfile;