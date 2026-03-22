import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, ArrowRight, Activity, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const Login = () => {
  const { t, i18n } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const toggleLanguage = () => {
    const nextLang = i18n.language === 'en' ? 'th' : 'en';
    i18n.changeLanguage(nextLang);
  };

  // ==========================================
  // Handlers (Actions)
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(identifier, password);
      toast.success(t('login.success_toast')); 
      navigate('/dashboard'); 
    } catch (err) {
      toast.error(err.response?.data?.error || t('login.error_default')); 
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // Render
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Language Switcher Float */}
      <button 
        onClick={toggleLanguage}
        className="absolute top-6 right-6 z-20 bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full flex items-center gap-2 hover:bg-white/20 transition-all font-bold text-xs uppercase tracking-widest"
      >
        <Globe size={14} />
        {i18n.language === 'en' ? 'ไทย' : 'EN'}
      </button>

      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-[45vh] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-b-[3rem] sm:rounded-b-[5rem] shadow-2xl pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-[45vh] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-overlay" />

      {/* Login Card */}
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl z-10 overflow-hidden border border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-500">
        
        {/* Header Section */}
        <div className="pt-10 pb-6 px-8 text-center">
          <div className="flex justify-center items-center mb-2 tracking-tight">
            <span className="font-black text-3xl sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 uppercase tracking-widest">
              {t('login.title')}
            </span>
            <span className="font-medium text-2xl sm:text-3xl text-slate-400 ml-2 tracking-wide">
              {t('login.subtitle')}
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium mt-2">
            {t('login.description')}
          </p>
        </div>

        {/* Form Section */}
        <div className="px-8 pb-10">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div className="space-y-4">
              {/* Username Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  {t('login.label_identifier')}
                </label>
                <div className="relative group">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="text" 
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
                    placeholder={t('login.placeholder_identifier')}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {t('login.label_password')}
                  </label>
                </div>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-11 pr-4 py-3.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all text-slate-800 tracking-widest placeholder:tracking-normal placeholder:text-slate-400"
                    placeholder={t('login.placeholder_password')}
                  />
                </div>
              </div>
            </div>

            {/* Login Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl py-3.5 mt-4 font-bold shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Activity className="animate-spin" size={20} />
                  <span>{t('login.button_authenticating')}</span>
                </>
              ) : (
                <>
                  <span>{t('login.button_signin')}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
      
      {/* Footer text */}
      <div className="mt-8 text-center z-10 text-slate-500 text-xs font-medium">
        &copy; {new Date().getFullYear()} {t('login.footer_rights')}
      </div>

    </div>
  );
};

export default Login;