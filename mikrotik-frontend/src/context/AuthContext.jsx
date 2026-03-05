import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/authService';
// ✅ นำเข้าฟังก์ชันจัดการ Token ใน Memory
import { setToken } from '../utils/apiClient';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ ฟังก์ชัน Silent Refresh ทำงานตอนเปิดเว็บใหม่ หรือกด F5
    const initializeAuth = async () => {
      try {
        // แอบยิง API เพื่อขอ Access Token ใบใหม่ โดยใช้ HTTP-Only Cookie ที่เบราว์เซอร์ส่งให้เอง
        const data = await authService.refreshToken();
        setToken(data.token); // นำ Token ที่ได้ไปเก็บใน Memory
        
        // กู้คืนข้อมูล Profile จาก LocalStorage มาแสดงผล
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        // หากขอ Token ไม่ผ่าน (เช่น ยังไม่ได้ล็อกอิน หรือ Cookie หมดอายุ)
        setToken(null);
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (identifier, password) => {
    const data = await authService.login(identifier, password);
    const { token, user: loggedInUser } = data;
    
    setToken(token); // ✅ เก็บ Token ไว้ใน Memory แทน LocalStorage (ปลอดภัยจาก XSS)
    localStorage.setItem('user', JSON.stringify(loggedInUser)); // ข้อมูล User ปกติเก็บได้ไม่เป็นไร
    
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error("Logout API failed:", error);
    } finally {
      setToken(null); // ✅ ล้างค่าจาก Memory
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