import apiClient from '../utils/apiClient';

export const logService = {
  getActivityLogs: async (params) => {
    // params = { page: 1, limit: 10, search: '...', startDate: '...', endDate: '...' }
    const response = await apiClient.get('/api/logs', { params });
    return response.data;
  },
  getEventSummary: async (days = 1) => {
    const response = await apiClient.get('/api/logs/event-summary', { params: { days } });
    return response.data;
  },
  getTopTroubleDevices: async (days = 1) => {
    const response = await apiClient.get('/api/logs/top-trouble-devices', { params: { days } });
    return response.data;
  }
};