import { api } from './request';

export interface SpotItem {
  id: number;
  userId: number;
  name: string;
  style: string;
  species?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  province?: string;
  city?: string;
  district?: string;
  accuracy?: string;
  tags?: string[];
  photoUrls?: string[];
  isPublic: boolean;
  status: string;
  lure?: string;
  action?: string;
  bait?: string;
  depth?: string;
  sourceLink?: string;
  note?: string;
  score: number;
  distance?: number;
  createdAt: string;
  user?: { id: number; username: string; avatar?: string };
  _count?: { verifications: number; favorites: number };
  spotLinks?: SpotLinkItem[];
}

export interface SpotLinkItem {
  id: number;
  spotId: number;
  userId: number;
  platform: 'douyin' | 'xiaohongshu' | 'wechat_channels' | string;
  url: string;
  title?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: number; username: string; avatar?: string };
}

export interface SpotListResult {
  items: SpotItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FavoriteItem {
  id: number;
  spotId: number;
  createdAt: string;
  spot: SpotItem;
}

export interface FavoriteListResult {
  items: FavoriteItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SpotCityResult {
  items: string[];
}

export interface SpotRegionItem {
  province: string;
  cities: string[];
}

export interface SpotRegionResult {
  items: SpotRegionItem[];
}

export interface SpotSummaryResult {
  total: number;
  provinceTotal: number;
}

export interface HotKeywordItem {
  keyword: string;
  count: number;
}

export interface HotKeywordResult {
  items: HotKeywordItem[];
}

export interface VerificationItem {
  id: number;
  spotId: number;
  userId: number;
  feedback: string;
  note?: string;
  photoUrls?: string[];
  createdAt: string;
  user?: { id: number; username: string; avatar?: string };
  spot?: { id: number; name: string; style?: string; species?: string; city?: string };
}

export interface VerificationListResult {
  items: VerificationItem[];
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

export const spotApi = {
  list: (params?: Record<string, string>) => {
    const q = buildQuery(params);
    return api.get<SpotListResult>(`/api/spots${q}`);
  },

  summary: (params?: Record<string, string>) => {
    const q = buildQuery(params);
    return api.get<SpotSummaryResult>(`/api/spots/summary${q}`);
  },

  hotKeywords: (params?: Record<string, string>) => {
    const q = buildQuery(params);
    return api.get<HotKeywordResult>(`/api/spots/hot-keywords${q}`);
  },

  cities: () => api.get<SpotCityResult>('/api/spots/cities?publicOnly=true'),

  regions: () => api.get<SpotRegionResult>('/api/spots/regions?publicOnly=true'),

  detail: (id: number) => api.get<SpotItem>(`/api/spots/${id}`),

  createLink: (spotId: number, data: { url: string }) =>
    api.post<SpotLinkItem>(`/api/spots/${spotId}/links`, data),

  addPhotos: (spotId: number, data: { photoUrls: string[] }) =>
    api.post<SpotItem>(`/api/spots/${spotId}/photos`, data),

  deleteLink: (id: number) => api.del(`/api/spot-links/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post<SpotItem>('/api/spots', data),

  update: (id: number, data: Record<string, unknown>) =>
    api.put<SpotItem>(`/api/spots/${id}`, data),

  delete: (id: number) => api.del(`/api/spots/${id}`),

  nearby: (lat: number, lng: number, radius?: number) =>
    api.get<SpotItem[]>(`/api/spots/nearby?lat=${lat}&lng=${lng}&radius=${radius || 10}`),

  verify: (spotId: number, feedback: string, note?: string, tags?: string[], photoUrls?: string[]) =>
    api.post<VerificationItem>(`/api/spots/${spotId}/verify`, { feedback, note, tags, photoUrls }),

  verifications: (spotId: number) =>
    api.get<VerificationItem[]>(`/api/spots/${spotId}/verifications`),

  myVerifications: (page = 1, pageSize = 20) =>
    api.get<VerificationListResult>(`/api/verifications/mine?page=${page}&pageSize=${pageSize}`),
};

export const favoriteApi = {
  list: (page = 1, pageSize = 20) => api.get<FavoriteListResult>(`/api/favorites?page=${page}&pageSize=${pageSize}`),
  add: (spotId: number) => api.post('/api/favorites', { spotId }),
  remove: (spotId: number) => api.del(`/api/favorites/${spotId}`),
};
