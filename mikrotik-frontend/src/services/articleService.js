import apiClient, { getToken } from '../utils/apiClient';

// --- Attachments Functions (Exported individually for reliability) ---
export const uploadAttachment = async (articleId, file) => {
  const formData = new FormData();
  formData.append('articleId', articleId);
  formData.append('file', file);
  const response = await apiClient.post('/api/articles/attachments/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const deleteAttachment = async (id) => {
  const response = await apiClient.delete(`/api/articles/attachments/${id}`);
  return response.data;
};

export const toggleAttachmentVisibility = async (id) => {
  const response = await apiClient.patch(`/api/articles/attachments/${id}/visibility`);
  return response.data;
};

export const getDownloadUrl = (id) => {
  const token = getToken();
  return `${apiClient.defaults.baseURL}/api/articles/attachments/download/${id}?token=${token}`;
};

const articleService = {
  getArticles: async (params = {}) => {
    const response = await apiClient.get('/api/articles', { params });
    return response.data;
  },

  getArticle: async (slug) => {
    const response = await apiClient.get(`/api/articles/view/${slug}`);
    return response.data;
  },

  getArticleById: async (id) => {
    const response = await apiClient.get(`/api/articles/${id}`);
    return response.data;
  },

  createArticle: async (data) => {
    const response = await apiClient.post('/api/articles', data);
    return response.data;
  },

  updateArticle: async (id, data) => {
    const response = await apiClient.put(`/api/articles/${id}`, data);
    return response.data;
  },

  deleteArticle: async (id) => {
    const response = await apiClient.delete(`/api/articles/${id}`);
    return response.data;
  },

  uploadImage: async (formData) => {
    const response = await apiClient.post('/api/articles/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  uploadVideo: async (formData) => {
    const response = await apiClient.post('/api/articles/upload-video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deleteVideo: async (id) => {
    const response = await apiClient.delete(`/api/articles/videos/${id}`);
    return response.data;
  },

  // --- Category Methods ---
  getCategories: async () => {
    const response = await apiClient.get('/api/articles/categories');
    return response.data;
  },

  createCategory: async (data) => {
    const response = await apiClient.post('/api/articles/categories', data);
    return response.data;
  },

  updateCategory: async (id, data) => {
    const response = await apiClient.put(`/api/articles/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id) => {
    const response = await apiClient.delete(`/api/articles/categories/${id}`);
    return response.data;
  },

  // --- Tag Methods ---
  getTags: async () => {
    const response = await apiClient.get('/api/articles/tags');
    return response.data;
  },

  deleteTag: async (id) => {
    const response = await apiClient.delete(`/api/articles/tags/${id}`);
    return response.data;
  },

  // Favorites Management
  toggleFavorite: async (id) => {
    const response = await apiClient.post(`/api/articles/favorites/${id}`);
    return response.data;
  },

  getFavoriteStatus: async (id) => {
    const response = await apiClient.get(`/api/articles/favorites/${id}/status`);
    return response.data;
  },

  // --- Comment Methods ---
  getComments: async (articleId) => {
    const response = await apiClient.get(`/api/articles/${articleId}/comments`);
    return response.data;
  },

  createComment: async (articleId, data) => {
    const response = await apiClient.post(`/api/articles/${articleId}/comments`, data);
    return response.data;
  },

  deleteComment: async (commentId) => {
    const response = await apiClient.delete(`/api/articles/comments/${commentId}`);
    return response.data;
  },

  // Attachment shortcuts in object
  uploadAttachment,
  deleteAttachment,
  toggleAttachmentVisibility,
  getDownloadUrl
};

export default articleService;
