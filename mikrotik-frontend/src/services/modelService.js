import apiClient from '../utils/apiClient';

export const modelService = {
  getModels: async (showDeleted = false) => {
    // ✅ เพิ่ม /master เข้าไปใน Path
    const response = await apiClient.get(`/api/master/models?showDeleted=${showDeleted}`);
    return response.data;
  },

  createModel: async (modelData) => {
    // ✅ เพิ่ม /master เข้าไปใน Path
    const response = await apiClient.post('/api/master/models', modelData);
    return response.data;
  },

  updateModel: async (id, modelData) => {
    // ✅ เพิ่ม /master เข้าไปใน Path
    const response = await apiClient.put(`/api/master/models/${id}`, modelData);
    return response.data;
  },

  deleteModel: async (id) => {
    // ✅ เพิ่ม /master เข้าไปใน Path
    const response = await apiClient.delete(`/api/master/models/${id}`);
    return response.data;
  },

  restoreModel: async (id) => {
    // ✅ เพิ่ม /master เข้าไปใน Path
    const response = await apiClient.put(`/api/master/models/${id}/restore`);
    return response.data;
  }
};