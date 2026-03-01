import apiClient from '../utils/apiClient';

export const authService = {
  login: async (identifier, password) => {
    const response = await apiClient.post('/api/auth/login', { identifier, password });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/api/auth/logout');
    return response.data;
  }
};