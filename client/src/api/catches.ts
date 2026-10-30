import { api } from './request';

export interface CatchItem {
  id: number;
  spotId: number | null;
  spotName: string | null;
  species: string;
  lengthCm: number | null;
  weightKg: number | null;
  style: string;
  bait: string;
  note: string;
  photoUrls: string[];
  caughtAt: string;
  createdAt: string;
}

export interface CatchStats {
  total: number;
  speciesTotal: number;
  maxWeightKg: number | null;
  maxLengthCm: number | null;
}

export const catchApi = {
  list: (page = 1, pageSize = 20) => api.get<{ items: CatchItem[]; total: number; page: number; pageSize: number }>(`/api/catches?page=${page}&pageSize=${pageSize}`),
  stats: () => api.get<CatchStats>('/api/catches/stats'),
  create: (data: Record<string, unknown>) => api.post<CatchItem>('/api/catches', data),
  remove: (id: number) => api.del(`/api/catches/${id}`),
};
