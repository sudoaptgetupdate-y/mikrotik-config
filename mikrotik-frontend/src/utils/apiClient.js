import axios from 'axios';

const baseURL = import.meta.env.PROD ? '' : 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: baseURL, 
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true // ✅ สั่งให้ Axios แนบ Cookie ไปด้วยทุกครั้ง
});

// ✅ ตัวแปรสำหรับเก็บ Promise ของการขอ Token ใหม่ (ทำหน้าที่เป็นแม่กุญแจล็อคคิว)
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

    // 1. ป้องกันการวนลูป (Infinite Loop): ถ้าตัวที่พังคือ API ขอ Refresh Token เอง ให้หยุดทำงานทันที
    if (originalRequest.url.includes('/api/auth/refresh-token')) {
      return Promise.reject(error);
    }

    // 2. ถ้าเจอ Error 401 (Unauthorized) และยังไม่เคย Retry ใน Request นี้
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // ทำเครื่องหมายว่ากำลังจะลองใหม่

      // 3. ถ้ายังไม่มีใครเริ่มสร้าง Promise (ยังไม่มีคนไปขอ Token ใหม่)
      if (!refreshTokenPromise) {
        // ให้ Request แรกสุดที่เข้ามา ทำการยิง API และเก็บสถานะไว้ใน refreshTokenPromise
        refreshTokenPromise = axios.post(`${baseURL}/api/auth/refresh-token`, {}, { withCredentials: true })
          .then(res => {
            const newToken = res.data.token;
            localStorage.setItem('token', newToken); // ได้ของใหม่มา อัปเดตลงระบบ
            return newToken; // ส่ง Token กลับไปให้คนที่รออยู่
          })
          .catch(err => {
            // ถ้าขอไม่ผ่าน (เช่น Refresh Token หมดอายุด้วย หรือ Cookie หายไปแล้ว)
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
              window.location.href = '/login'; // บังคับเด้งไปหน้า Login
            }
            return Promise.reject(err);
          })
          .finally(() => {
            // 4. เมื่อจัดการเสร็จ (ทั้งสำเร็จและล้มเหลว) ให้เคลียร์ค่าทิ้ง เพื่อให้รอบหน้าขอใหม่ได้
            refreshTokenPromise = null;
          });
      }

      // 5. 🌟 หัวใจสำคัญ: ทุกๆ Request ที่พังพร้อมกัน จะลงมารอ (await) ที่ Promise ตัวเดียวกันตรงนี้!
      // จะไม่มีการยิง API ซ้ำซ้อนอีกต่อไป ทุกตัวจะได้ Token คืนมาพร้อมๆ กันเมื่อ Request แรกทำสำเร็จ
      try {
        const token = await refreshTokenPromise;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest); // เอา Token ใหม่แนบไป แล้วยิง Request เดิมที่ค้างไว้ออกไปใหม่
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;