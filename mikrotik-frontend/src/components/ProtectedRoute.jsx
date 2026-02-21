import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity } from 'lucide-react';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

  // 1. ระหว่างรอโหลดข้อมูลจาก LocalStorage ให้แสดงหน้าต่างโหลด
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-400">
        <Activity size={48} className="animate-spin text-blue-600 mb-4" />
        <p className="font-medium animate-pulse">Checking authentication...</p>
      </div>
    );
  }

  // 2. ถ้ายังไม่ได้ล็อกอิน ให้เด้งไปหน้า /login ทันที
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. ถ้าหน้านั้นๆ มีการจำกัดสิทธิ์ (Role) แล้วสิทธิ์ไม่ถึง ให้เด้งกลับหน้า Dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // แจ้งเตือนเล็กน้อยก่อนเด้งกลับ (ใช้ alert ง่ายๆ ไปก่อนได้ครับ หรือจะไม่ใช้ก็ได้)
    alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (Access Denied)");
    return <Navigate to="/dashboard" replace />;
  }

  // ถ้าผ่านทุกด่าน ก็อนุญาตให้เข้าไปดูเนื้อหา (Children/Outlet) ได้
  return <Outlet />;
};

export default ProtectedRoute;