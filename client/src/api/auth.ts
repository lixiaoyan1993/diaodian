import { api } from './request';

export interface UserInfo {
  id: number;
  username: string;
  avatar?: string;
  phone?: string;
  role: string;
  createdAt: string;
  spotCount?: number;
  favoriteCount?: number;
}

export interface LoginResult {
  user: { id: number; username: string; role: string };
  token: string;
}

export interface MiniappLoginPayload {
  code: string;
  platform: 'wechat' | 'douyin';
  username?: string;
  avatar?: string;
}

export const authApi = {
  register: (username: string, password: string) =>
    api.post<LoginResult>('/api/auth/register', { username, password }),

  login: (username: string, password: string) =>
    api.post<LoginResult>('/api/auth/login', { username, password }),

  miniappLogin: (data: MiniappLoginPayload) =>
    api.post<LoginResult>('/api/auth/miniapp-login', data),

  profile: () => api.get<UserInfo>('/api/auth/profile'),
};
