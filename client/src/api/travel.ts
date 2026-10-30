import { api } from './request';

export type TravelType = 'companion' | 'find_car' | 'carpool';
export type TravelStatus = 'active' | 'closed' | 'deleted' | 'admin_removed';

export interface TravelMember {
  id: number;
  userId: number;
  username: string;
  avatar?: string;
  joinedAt: string;
  status: string;
}

export interface TravelPostItem {
  id: number;
  userId: number;
  spotId: number;
  travelType: TravelType;
  departAt: string;
  departurePlace: string;
  seatTotal: number | null;
  seatAvailable: number | null;
  expiresAt: string;
  description: string;
  contactMasked: string;
  contact?: string;
  status: TravelStatus;
  shareToken: string;
  sharePath: string;
  shareUrl: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  joined: boolean;
  isOwner: boolean;
  user: { id: number; username: string; avatar?: string };
  spot: { id: number; name: string; address?: string; city?: string; district?: string };
  members?: TravelMember[];
}

export interface TravelListResult {
  items: TravelPostItem[];
  total: number;
  page: number;
  pageSize: number;
}

function buildQuery(params?: Record<string, string>) {
  if (!params) return '';
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return query ? `?${query}` : '';
}

export const travelApi = {
  list: (params?: Record<string, string>) => api.get<TravelListResult>(`/api/travel-posts${buildQuery(params)}`),
  detail: (id: number) => api.get<TravelPostItem>(`/api/travel-posts/${id}`),
  detailByShare: (share: string) => api.get<TravelPostItem>(`/api/travel-posts/share/${encodeURIComponent(share)}`),
  create: (data: Record<string, unknown>) => api.post<TravelPostItem>('/api/travel-posts', data),
  update: (id: number, data: Record<string, unknown>) => api.put<TravelPostItem>(`/api/travel-posts/${id}`, data),
  close: (id: number) => api.put(`/api/travel-posts/${id}/close`),
  join: (id: number) => api.post<TravelPostItem>(`/api/travel-posts/${id}/join`),
  delete: (id: number) => api.del(`/api/travel-posts/${id}`),
};
