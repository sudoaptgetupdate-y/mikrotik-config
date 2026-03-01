import axios from 'axios';

// ให้ระบบเช็คเองว่ากำลังรันอยู่บน Local (Development) หรือ Server (Production)
// ถ้าเป็น Production (build แล้ว) จะเป็นค่าว่าง (เพื่อให้มันต่อท้าย Domain ปัจจุบัน)
// ถ้าเป็น Local (กำลัง dev) จะเป็น http://localhost:3000
const baseURL = import.meta.env.PROD ? '' : 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: baseURL, 
  headers: {
    'Content-Type': 'application/json',
  },
});

// ==========================================
// 1. Request Interceptor: แปะ Token ให้ทุกครั้งที่ยิง API
// ==========================================
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ==========================================
// 2. Response Interceptor: ดักจับ 401 เคลียร์ Token และเด้งไปหน้า Login
// ==========================================
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Session expired or unauthorized. Redirecting to login...');
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // ป้องกันไม่ให้มัน Redirect ซ้ำซ้อนถ้าผู้ใช้อยู่หน้า /login อยู่แล้ว
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;