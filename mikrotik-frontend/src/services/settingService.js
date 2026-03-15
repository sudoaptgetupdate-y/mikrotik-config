import apiClient from '../utils/apiClient';

export const settingService = {
  getSettings: async (key = '') => {
    const url = key ? `/api/settings?key=${key}` : '/api/settings';
    const response = await apiClient.get(url);
    return response.data;
  },

  updateSettings: async (key, settingData) => {
    // Standardizing to expect an object with value property
    const payload = typeof settingData === 'object' && settingData !== null && 'value' in settingData 
      ? settingData 
      : { value: settingData };
      
    const response = await apiClient.put(`/api/settings/${key}`, payload);
    return response.data;
  },

  updateSetting: async (key, settingData) => {
    // Alias for updateSettings to maintain backward compatibility
    const payload = typeof settingData === 'object' && settingData !== null && 'value' in settingData 
      ? settingData 
      : { value: settingData };
      
    const response = await apiClient.put(`/api/settings/${key}`, payload);
    return response.data;
  }
};