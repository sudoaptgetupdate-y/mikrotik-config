import axios from 'axios';

// ตั้งค่า Base URL ให้ชี้ไปที่ Backend
const apiClient = axios.create({
  baseURL: 'http://localhost:3000', // ปรับ URL ตามเซิร์ฟเวอร์ Backend ของคุณ
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