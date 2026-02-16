import axios from 'axios';

// สร้าง instance ของ axios ที่มีการตั้งค่า base URL จาก .env
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;