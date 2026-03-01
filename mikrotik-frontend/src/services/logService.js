import apiClient from '../utils/apiClient';

export const logService = {
  getActivityLogs: async (params) => {
    // params = { page: 1, limit: 10, search: '...', startDate: '...', endDate: '...' }
    const response = await apiClient.get('/api/logs', { params });
    return response.data;
  }
};