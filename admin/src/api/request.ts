import axios from 'axios';
import { ElMessage } from 'element-plus';

const http = axios.create({ baseURL: '/' });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => {
    if (res.data?.code !== 0 && res.data?.code !== undefined) {
      ElMessage.error(res.data?.message || '请求失败');
      return Promise.reject(res.data);
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/admin/#/login';
    }
    ElMessage.error(err.response?.data?.message || err.message || '网络错误');
    return Promise.reject(err);
  },
);

export default http;
