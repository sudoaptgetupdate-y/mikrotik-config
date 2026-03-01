import apiClient from '../utils/apiClient';

export const settingService = {
  getSettings: async (key = '') => {
    const url = key ? `/api/settings?key=${key}` : '/api/settings';
    const response = await apiClient.get(url);
    return response.data;
  },

  updateSetting: async (key, settingData) => {
    // settingData = { value: [...], description: "..." }
    const response = await apiClient.put(`/api/settings/${key}`, settingData);
    return response.data;
  }
};