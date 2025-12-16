import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth API
export const authApi = {
    register: (data: { email: string; username: string; password: string }) =>
        api.post('/auth/register', data),
    login: (data: { emailOrUsername: string; password: string }) =>
        api.post('/auth/login', data),
    getMe: () => api.get('/auth/me'),
};

// Pages API
export const pagesApi = {
    getAll: () => api.get('/pages'),
    getById: (id: string) => api.get(`/pages/${id}`),
    create: (data: { title: string }) => api.post('/pages', data),
    update: (id: string, data: { title: string }) => api.put(`/pages/${id}`, data),
    delete: (id: string) => api.delete(`/pages/${id}`),
};

// Blocks API
export const blocksApi = {
    getByPage: (pageId: string) => api.get(`/blocks/page/${pageId}`),
    create: (data: { pageId: string; type: string; content: object; orderIndex: number }) =>
        api.post('/blocks', data),
    update: (id: string, data: { content?: object; orderIndex?: number; type?: string }) =>
        api.put(`/blocks/${id}`, data),
    delete: (id: string) => api.delete(`/blocks/${id}`),
    reorder: (pageId: string, blockOrders: { id: string; orderIndex: number }[]) =>
        api.put(`/blocks/reorder/${pageId}`, { blockOrders }),
};

// Folders API
export const foldersApi = {
    getAll: () => api.get('/folders'),
    create: (data: { name: string; parentId?: string }) => api.post('/folders', data),
    update: (id: string, data: { name?: string; parentId?: string }) => api.put(`/folders/${id}`, data),
    delete: (id: string) => api.delete(`/folders/${id}`),
    movePage: (pageId: string, folderId: string | null) =>
        api.put(`/folders/move-page/${pageId}`, { folderId }),
};

export default api;
