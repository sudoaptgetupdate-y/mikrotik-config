import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Router, User, Lock, ArrowRight, Activity } from 'lucide-react';

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const user = await login(identifier, password);
      navigate('/dashboard'); // ล็อกอินสำเร็จ ไปหน้า Dashboard
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-96 bg-blue-600 rounded-b-[4rem] shadow-xl pointer-events-none opacity-90" />
      
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-100">
        <div className="p-8 sm:p-10">
          
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
              <Router size={32} />
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-center text-slate-800 tracking-tight mb-2">
            Mikrotik Managemnet
          </h2>
          <p className="text-center text-slate-500 text-sm mb-8 font-medium">
            Sign in to manage your network devices
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-6 border border-red-100 font-medium text-center animate-in fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Username or Email
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                  placeholder="admin / admin@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-bold shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-blue-600/40 transition-all disabled:opacity-70 flex justify-center items-center gap-2 mt-2"
            >
              {isLoading ? (
                <Activity className="animate-spin" size={20} />
              ) : (
                <>Sign In <ArrowRight size={18} /></>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default Login;