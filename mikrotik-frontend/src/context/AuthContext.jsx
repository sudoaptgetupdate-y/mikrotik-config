import React, { createContext, useState, useEffect, useContext } from 'react';
import apiClient from '../utils/apiClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // เช็คตอนโหลดเว็บครั้งแรกว่ามี Token ค้างอยู่ไหม
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (identifier, password) => {
    const res = await apiClient.post('/api/auth/login', { identifier, password });
    const { token, user } = res.data;
    
    // เก็บลง LocalStorage
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    
    setUser(user);
    return user;
  };

  const logout = async () => {
    try {
      // 1. ยิง API ไปบอก Backend ให้นำ Token ปัจจุบันไปใส่ใน Blacklist (RevokedToken)
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error("Logout API failed:", error);
    } finally {
      // 2. ไม่ว่าฝั่ง Backend จะตอบกลับสำเร็จหรือมี Error (เช่น Token หมดอายุไปแล้ว)
      // เราก็ต้องเคลียร์ข้อมูลในเครื่องทิ้งเสมอ เพื่อให้ User หลุดออกจากระบบ
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};