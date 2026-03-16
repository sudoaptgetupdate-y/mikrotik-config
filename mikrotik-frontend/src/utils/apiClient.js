import axios from 'axios';

const currentHost = window.location.hostname;
const currentProtocol = window.location.protocol;

const baseURL = import.meta.env.PROD 
  ? '' 
  : `${currentProtocol}//${currentHost}:3000`;

// ✅ 1. สร้างตัวแปรเก็บ Token ไว้ใน Memory ของ JavaScript แทน LocalStorage
let inMemoryToken = null;

// สร้างฟังก์ชันสำหรับจัดการ Token เพื่อให้ไฟล์อื่นเรียกใช้ได้
export const getToken = () => inMemoryToken;
export const setToken = (token) => {
  inMemoryToken = token;
};

const apiClient = axios.create({
  baseURL: baseURL, 
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // สำคัญมาก: ส่ง HTTP-Only Cookie เสมอ
});

let refreshTokenPromise = null;

apiClient.interceptors.request.use(
  (config) => {
    // ✅ 2. ดึง Token จาก Memory
    const token = getToken();
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

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/api/auth/login')) {
      originalRequest._retry = true; 

      if (!refreshTokenPromise) {
        refreshTokenPromise = axios.post(`${baseURL}/api/auth/refresh-token`, {}, { withCredentials: true })
          .then(res => {
            const newToken = res.data.token;
            setToken(newToken); // ✅ 3. อัปเดต Token ลงใน Memory
            return newToken; 
          })
          .catch(err => {
            setToken(null); // ✅ ล้าง Token ทิ้ง
            localStorage.removeItem('user'); // ล้างโปรไฟล์ผู้ใช้
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