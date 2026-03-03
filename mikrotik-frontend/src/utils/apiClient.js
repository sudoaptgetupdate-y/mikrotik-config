import axios from 'axios';

// ✅ เพิ่มระบบ Auto-Detect จาก URL ปัจจุบัน
const currentHost = window.location.hostname;
const currentProtocol = window.location.protocol;

// ถ้าเป็นโหมด Production ใช้ '' (ยิงเข้า Domain หลัก)
// ถ้าเป็นโหมด Dev ให้ดึง IP หรือ Hostname ปัจจุบันมาใส่ Port 3000
const baseURL = import.meta.env.PROD 
  ? '' 
  : `${currentProtocol}//${currentHost}:3000`;

const apiClient = axios.create({
  baseURL: baseURL, 
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // ✅ สั่งให้ Axios แนบ Cookie ไปด้วยทุกครั้ง
});

// ✅ ตัวแปรสำหรับเก็บ Promise ของการขอ Token ใหม่
let refreshTokenPromise = null;

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest.url.includes('/api/auth/refresh-token')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; 

      if (!refreshTokenPromise) {
        refreshTokenPromise = axios.post(`${baseURL}/api/auth/refresh-token`, {}, { withCredentials: true })
          .then(res => {
            const newToken = res.data.token;
            localStorage.setItem('token', newToken); 
            return newToken; 
          })
          .catch(err => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
              window.location.href = '/login'; 
            }
            return Promise.reject(err);
          })
          .finally(() => {
            refreshTokenPromise = null;
          });
      }

      try {
        const token = await refreshTokenPromise;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest); 
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;