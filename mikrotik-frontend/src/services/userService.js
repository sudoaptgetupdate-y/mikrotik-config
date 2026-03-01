import apiClient from '../utils/apiClient';

export const userService = {
  getUsers: async () => {
    const response = await apiClient.get('/api/users');
    return response.data;
  },

  getUserById: async (id) => {
    const response = await apiClient.get(`/api/users/${id}`);
    return response.data;
  },

  createUser: async (userData) => {
    const response = await apiClient.post('/api/users', userData);
    return response.data;
  },

  updateUser: async (id, updateData) => {
    const response = await apiClient.put(`/api/users/${id}`, updateData);
    return response.data;
  },

  deleteUser: async (id) => {
    const response = await apiClient.delete(`/api/users/${id}`);
    return response.data;
  }
};