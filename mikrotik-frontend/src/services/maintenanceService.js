import apiClient from '../utils/apiClient';

export const maintenanceService = {
  clearAckHistory: async (days) => {
    const response = await apiClient.post('/api/devices/maintenance/clear-ack', { days });
    return response.data;
  },

  clearEventHistory: async (days) => {
    const response = await apiClient.post('/api/devices/maintenance/clear-events', { days });
    return response.data;
  },

  clearActivityLogs: async (days) => {
    const response = await apiClient.post('/api/devices/maintenance/clear-activity-logs', { days });
    return response.data;
  }
};