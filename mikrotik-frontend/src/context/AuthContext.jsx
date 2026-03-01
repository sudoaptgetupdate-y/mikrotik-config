import React, { createContext, useState, useEffect, useContext } from 'react';

// ✅ นำเข้า authService แทน apiClient
import { authService } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (identifier, password) => {
    // ✅ เรียกใช้ผ่าน Service 
    const data = await authService.login(identifier, password);
    const { token, user: loggedInUser } = data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(loggedInUser));
    
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = async () => {
    try {
      // ✅ เรียกใช้ผ่าน Service
      await authService.logout();
    } catch (error) {
      console.error("Logout API failed:", error);
    } finally {
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