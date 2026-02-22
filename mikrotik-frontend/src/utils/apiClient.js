import axios from 'axios';

// ให้ระบบเช็คเองว่ากำลังรันอยู่บน Local (Development) หรือ Server (Production)
// ถ้าเป็น Production (build แล้ว) VITE_API_URL จะเป็นค่าว่าง
// ถ้าเป็น Local (กำลัง dev) VITE_API_URL จะเป็น http://localhost:3000
const baseURL = import.meta.env.PROD ? '' : 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: baseURL, 
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ Interceptor: แอบดูทุก Request ก่อนวิ่งออกไป แล้วแปะ Token ให้
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

// (Option) Interceptor: ถ้า Token หมดอายุ (401) ให้เด้งไปหน้า Login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login'; // เด้งกลับหน้าล็อกอิน
    }
    return Promise.reject(error);
  }
);

export default apiClient;