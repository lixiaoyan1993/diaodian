import http from './request';

export interface Stats {
  userCount: number;
  spotCount: number;
  pendingCount: number;
  verificationCount: number;
  weeklyActiveUsers: number;
}

export interface AdminUser {
  id: number;
  username: string;
  avatar?: string;
  phone?: string;
  role: string;
  createdAt: string;
  _count: { spots: number; verifications: number };
}

export interface AdminSpot {
  id: number;
  name: string;
  style: string;
  species?: string;
  tags?: string[];
  sourceLink?: string;
  status: string;
  score: number;
  createdAt: string;
  user: { id: number; username: string };
  _count: { verifications: number; favorites: number };
}

export interface AdminVerification {
  id: number;
  feedback: string;
  note?: string;
  createdAt: string;
  user: { id: number; username: string };
  spot: { id: number; name: string };
}

export interface AdminTravelPost {
  id: number;
  travelType: 'companion' | 'find_car' | 'carpool';
  departAt: string;
  departurePlace: string;
  seatTotal: number | null;
  expiresAt: string;
  status: string;
  createdAt: string;
  memberCount: number;
  description: string;
  user: { id: number; username: string };
  spot: { id: number; name: string };
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

function api(path: string) {
  return {
    get: (params?: Record<string, string>) => http.get(path, { params }),
    post: (data?: unknown) => http.post(path, data),
    put: (data?: unknown) => http.put(path, data),
    del: () => http.delete(path),
  };
}

export const adminApi = {
  login: (username: string, password: string) =>
    http.post('/api/auth/login', { username, password }),

  stats: () => http.get<{ code: number; data: Stats }>('/api/admin/stats'),
  users: (page = 1) => http.get<{ code: number; data: PageResult<AdminUser> }>('/api/admin/users', { params: { page: String(page), pageSize: '20' } }),
  spots: (params?: Record<string, string>) => http.get<{ code: number; data: PageResult<AdminSpot> }>('/api/admin/spots', { params }),
  updateSpotStatus: (id: number, status: string) => http.put(`/api/admin/spots/${id}/status`, { status }),
  deleteSpot: (id: number) => http.delete(`/api/admin/spots/${id}`),
  verifications: (page = 1) => http.get<{ code: number; data: PageResult<AdminVerification> }>('/api/admin/verifications', { params: { page: String(page), pageSize: '20' } }),
  travelPosts: (params?: Record<string, string>) => http.get<{ code: number; data: PageResult<AdminTravelPost> }>('/api/admin/travel-posts', { params }),
  updateTravelPostStatus: (id: number, status: string) => http.put(`/api/admin/travel-posts/${id}/status`, { status }),
};
