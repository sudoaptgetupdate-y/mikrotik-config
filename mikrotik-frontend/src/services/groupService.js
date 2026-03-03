import apiClient from '../utils/apiClient';

export const groupService = {
  // ดึงข้อมูลกลุ่มทั้งหมด
  getGroups: async () => {
    const response = await apiClient.get('/api/groups');
    return response.data.data;
  },

  // สร้างกลุ่มใหม่
  createGroup: async (data) => {
    const response = await apiClient.post('/api/groups', data);
    return response.data.data;
  },

  // อัปเดตข้อมูลกลุ่มและ Telegram
  updateGroup: async (id, data) => {
    const response = await apiClient.put(`/api/groups/${id}`, data);
    return response.data.data;
  },

  // ลบกลุ่ม
  deleteGroup: async (id) => {
    const response = await apiClient.delete(`/api/groups/${id}`);
    return response.data;
  },

  // เพิ่มอุปกรณ์เข้ากลุ่ม
  addDeviceToGroup: async (groupId, deviceId) => {
    const response = await apiClient.post(`/api/groups/${groupId}/devices`, { deviceId });
    return response.data;
  },

  // ลบอุปกรณ์ออกจากกลุ่ม
  removeDeviceFromGroup: async (groupId, deviceId) => {
    const response = await apiClient.delete(`/api/groups/${groupId}/devices/${deviceId}`);
    return response.data;
  }
};