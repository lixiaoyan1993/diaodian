import { defineStore } from 'pinia';
import { ref } from 'vue';
import { spotApi, type SpotItem } from '@/api/spots';
import { useAuthStore } from './auth';

export const useSpotStore = defineStore('spot', () => {
  const spots = ref<SpotItem[]>([]);
  const currentSpot = ref<SpotItem | null>(null);
  const loading = ref(false);
  const total = ref(0);

  async function fetchList(params?: Record<string, string>) {
    loading.value = true;
    try {
      const res = await spotApi.list({ publicOnly: 'true', ...params });
      if (res.data) {
        spots.value = res.data.items;
        total.value = res.data.total;
      }
    } catch (e: any) {
      uni.showToast({ title: e.message || '加载失败', icon: 'none' });
    } finally {
      loading.value = false;
    }
  }

  async function fetchMySpots(page = 1) {
    loading.value = true;
    const auth = useAuthStore();
    try {
      const res = await spotApi.list({ page: String(page), pageSize: '50' });
      if (res.data) {
        // 自己的标点 = 已登录用户能看到自己的
        spots.value = res.data.items.filter(s => s.userId === auth.user?.id);
        total.value = res.data.total;
      }
    } catch (e: any) {
      uni.showToast({ title: e.message || '加载失败', icon: 'none' });
    } finally {
      loading.value = false;
    }
  }

  async function fetchDetail(id: number) {
    try {
      const res = await spotApi.detail(id);
      if (res.data) currentSpot.value = res.data;
    } catch (e: any) {
      uni.showToast({ title: e.message || '加载失败', icon: 'none' });
    }
  }

  async function createSpot(data: Record<string, unknown>) {
    const res = await spotApi.create(data);
    return res.data;
  }

  return { spots, currentSpot, loading, total, fetchList, fetchMySpots, fetchDetail, createSpot };
});
