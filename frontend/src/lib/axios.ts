import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    
    // Nếu lỗi 401 và chưa thử refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) {
          useAuthStore.getState().logout();
          return Promise.reject(error);
        }
        
        // Gọi API refresh token
        const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/auth/refresh`, {
          refreshToken,
        });
        
        if (res.data.success) {
          useAuthStore.getState().setTokens(res.data.data.accessToken, refreshToken);
          originalRequest.headers.Authorization = `Bearer ${res.data.data.accessToken}`;
          // Gọi lại request ban đầu với token mới
          const originalRes = await axios(originalRequest);
          return originalRes.data;
        }
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    // Ném lỗi với message chuẩn hóa
    const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại';
    return Promise.reject(new Error(errorMessage));
  }
);

export default api;
