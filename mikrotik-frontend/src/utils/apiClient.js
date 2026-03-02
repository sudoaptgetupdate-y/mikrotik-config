import axios from 'axios';

const baseURL = import.meta.env.PROD ? '' : 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: baseURL, 
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // ✅ สั่งให้ Axios แนบ Cookie ไปด้วยทุกครั้ง
});

// ตัวแปรสำหรับคิวคำขอในกรณีที่ Token กำลังถูกรีเฟรชอยู่
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) { prom.reject(error); }
    else { prom.resolve(token); }
  });
  failedQueue = [];
};

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

    // ถ้า Error 401 (หมดอายุ) และยังไม่เคยลองขอ Token ใหม่
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // ถ้ากำลังมี API อื่นขอ Token ใหม่อยู่ ให้ตัวนี้ไปต่อคิวรอ
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = 'Bearer ' + token;
          return apiClient(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // แอบยิงไปขอ Token ใหม่
        const res = await axios.post(`${baseURL}/api/auth/refresh-token`, {}, { withCredentials: true });
        
        const newToken = res.data.token;
        localStorage.setItem('token', newToken);
        
        processQueue(null, newToken);
        
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;