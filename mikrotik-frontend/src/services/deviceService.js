import apiClient from '../utils/apiClient';

export const deviceService = {
  getDevices: async () => {
    const response = await apiClient.get('/api/devices');
    return response.data;
  },

  getUserDevices: async (userId) => {
    const response = await apiClient.get(`/api/devices/user/${userId}`);
    return response.data;
  },

  getDeviceById: async (id) => {
    const response = await apiClient.get(`/api/devices/${id}`);
    return response.data;
  },

  createDevice: async (deviceData) => {
    const response = await apiClient.post('/api/devices', deviceData);
    return response.data;
  },

  updateDevice: async (id, updateData) => {
    const response = await apiClient.put(`/api/devices/${id}`, updateData);
    return response.data;
  },

  deleteDevice: async (id) => {
    const response = await apiClient.delete(`/api/devices/${id}`);
    return response.data;
  },

  restoreDevice: async (id) => {
    const response = await apiClient.put(`/api/devices/${id}/restore`);
    return response.data;
  },

  // 🟢 เพิ่มฟังก์ชัน Hard Delete ตรงนี้ครับ
  hardDeleteDevice: async (id) => {
    const response = await apiClient.delete(`/api/devices/${id}/hard`);
    return response.data;
  },

  getDeviceHistory: async (id) => {
    const response = await apiClient.get(`/api/devices/${id}/history`);
    return response.data;
  },

  getDeviceEvents: async (id) => {
    const response = await apiClient.get(`/api/devices/${id}/events`);
    return response.data;
  },

  acknowledgeWarning: async (id, reasonData) => {
    // reasonData = { reason: "...", warningData: {...} }
    const response = await apiClient.post(`/api/devices/${id}/acknowledge`, reasonData);
    return response.data;
  },

  logDownload: async (id, configId = null) => {
    const response = await apiClient.post(`/api/devices/${id}/log-download`, { configId });
    return response.data;
  },
};