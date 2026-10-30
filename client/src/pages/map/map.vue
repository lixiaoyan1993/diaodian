<template>
  <view class="map-page">
    <!-- #ifdef H5 -->
    <H5Amap
      class="map-surface"
      :latitude="center.lat"
      :longitude="center.lng"
      :markers="markers"
      :scale="14"
      :map-type="mapType"
      @markertap="onMarkerTap"
    />
    <!-- #endif -->
    <!-- #ifndef H5 -->
    <map
      class="map-surface"
      :latitude="center.lat"
      :longitude="center.lng"
      :markers="markers"
      :scale="14"
      :map-type="mapType"
      @markertap="onMarkerTap"
    />
    <!-- #endif -->
    <view class="map-panel dd-card">
      <view class="panel-top">
        <view>
          <text class="panel-title">附近公开标点</text>
          <text class="panel-sub">{{ panelSubText }}</text>
        </view>
        <button
          :class="['nearest-btn', { active: sortMode === 'nearest' }]"
          @tap="loadNearest"
        >{{ locating ? '定位中' : '离我最近' }}</button>
      </view>
    </view>
    <view class="map-type-switch">
      <button
        v-for="item in mapTypeOptions"
        :key="item.value"
        :class="['map-type-btn', { active: mapType === item.value }]"
        @tap="mapType = item.value"
      >{{ item.label }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { spotApi, type SpotItem } from '@/api/spots';
// #ifdef H5
import H5Amap from '@/components/H5Amap.vue';
// #endif

const spots = ref<SpotItem[]>([]);
const tiananmenLocation = { lat: 39.9087, lng: 116.3975 };
const center = ref({ ...tiananmenLocation });
const locating = ref(false);
const sortMode = ref<'default' | 'nearest'>('default');
const mapType = ref<'standard' | 'satellite'>('standard');
const mapTypeOptions = [
  { label: '普通', value: 'standard' as const },
  { label: '卫星', value: 'satellite' as const },
];

const markers = computed(() =>
  spots.value.map(s => ({
    id: s.id,
    latitude: Number(s.latitude || center.value.lat),
    longitude: Number(s.longitude || center.value.lng),
    title: s.name,
    subtitle: markerSubtitle(s),
    style: markerStyle(s),
    iconPath: s.style === '台钓' ? '/static/marker-bait.png' : ((s.style || '').includes(',') || s.style === '都可') ? '/static/marker-both.png' : '/static/marker-lure.png',
    width: 32,
    height: 40,
    callout: {
      content: `${s.name}\n${markerSubtitle(s)}`,
      display: 'ALWAYS',
      padding: 6,
      borderRadius: 8,
      bgColor: '#FFFFFF',
      color: '#16324F',
      fontSize: 12,
      textAlign: 'center',
    },
  }))
);

function shortSpecies(value?: string) {
  const items = (value || '')
    .split(/[、,，/ ]+/)
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 2);
  return items.join('、') || '未填鱼种';
}

function markerStyle(spot: SpotItem) {
  const styleList = spot.style.split(',').map(s => s.trim()).filter(Boolean);
  if (styleList.length >= 2 || spot.style === '都可') return '路亚+台钓';
  if (spot.style === '台钓') return '台钓';
  return '路亚';
}

function markerSubtitle(spot: SpotItem) {
  return `${markerStyle(spot)} · ${shortSpecies(spot.species)}`;
}

const panelSubText = computed(() => {
  const suffix = sortMode.value === 'nearest' ? ' · 已按距离排序' : ' · 点按地图标记查看详情';
  return `${spots.value.length} 个点${suffix}`;
});

async function loadSpots(params: Record<string, string> = {}) {
  try {
    const res = await spotApi.list({ publicOnly: 'true', pageSize: '50', ...params });
    if (res.data?.items) spots.value = res.data.items;
  } catch (e: any) {
    uni.showToast({ title: e?.message || '标点加载失败', icon: 'none' });
  }
}

function loadNearest() {
  if (locating.value) return;
  locating.value = true;
  resolveCurrentLocation({
    silent: true,
    onSuccess: (location) => {
      center.value = { ...location };
      sortMode.value = 'nearest';
      loadSpots({
        sort: 'nearest',
        lat: String(location.lat),
        lng: String(location.lng),
      });
    },
    onFail: () => {
      center.value = { ...tiananmenLocation };
      uni.showToast({ title: '定位失败，请开启定位权限', icon: 'none' });
    },
    onComplete: () => {
      locating.value = false;
    },
  });
}

function resolveCurrentLocation(options: {
  silent?: boolean;
  onSuccess?: (location: { lat: number; lng: number }) => void;
  onFail?: () => void;
  onComplete?: () => void;
} = {}) {
  uni.getLocation({
    type: 'gcj02',
    success: (res) => {
      options.onSuccess?.({ lat: res.latitude, lng: res.longitude });
    },
    fail: () => {
      if (!options.silent) {
        uni.showToast({ title: '定位失败，请开启定位权限', icon: 'none' });
      }
      options.onFail?.();
    },
    complete: () => {
      options.onComplete?.();
    },
  });
}

function initCenter() {
  resolveCurrentLocation({
    silent: true,
    onSuccess: (location) => {
      center.value = { ...location };
    },
    onFail: () => {
      center.value = { ...tiananmenLocation };
    },
  });
}

function onMarkerTap(e: any) {
  const id = e.detail?.markerId;
  if (id) {
    uni.navigateTo({ url: `/pages/spot/spot?id=${id}` });
  }
}

onMounted(() => {
  initCenter();
  loadSpots();
});
</script>

<style scoped>
.map-page { position: relative; width: 100%; height: 100vh; overflow: hidden; }
.map-surface { display: block; width: 100%; height: 100%; }
.map-panel {
  position: absolute;
  left: max(14px, env(safe-area-inset-left));
  right: max(14px, env(safe-area-inset-right));
  top: max(14px, env(safe-area-inset-top));
  padding: 12px 14px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(168, 211, 223, 0.84);
  box-shadow: 0 18px 30px rgba(14, 116, 144, 0.14);
  backdrop-filter: blur(18px);
}
.map-type-switch {
  position: absolute;
  right: max(14px, env(safe-area-inset-right));
  bottom: max(22px, env(safe-area-inset-bottom));
  display: flex;
  gap: 6px;
  padding: 6px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(168, 211, 223, 0.84);
  box-shadow: 0 14px 22px rgba(14, 116, 144, 0.14);
  backdrop-filter: blur(18px);
}
.map-type-btn {
  min-width: 52px;
  min-height: 34px;
  border-radius: 12px;
  background: transparent;
  color: #6C8198;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 900;
}
.map-type-btn.active {
  background: linear-gradient(135deg, #0F766E 0%, #0891B2 100%);
  color: #fff;
  box-shadow: 0 12px 18px rgba(14, 116, 144, 0.18);
}
.panel-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.panel-top > view { flex: 1; min-width: 0; }
.panel-title { display: block; font-size: 17px; line-height: 1.25; font-weight: 950; color: #16324F; }
.panel-sub { display: block; margin-top: 5px; font-size: 12px; line-height: 1.4; color: #6C8198; }
.nearest-btn {
  flex: none;
  min-width: 86px;
  min-height: 38px;
  padding: 0 10px;
  border-radius: 16px;
  border: 1px solid rgba(168, 211, 223, 0.84);
  background: rgba(255, 255, 255, 0.86);
  color: #0E7490;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 900;
}
.nearest-btn.active {
  border-color: transparent;
  background: linear-gradient(135deg, #0F766E 0%, #0891B2 100%);
  color: #fff;
  box-shadow: 0 12px 20px rgba(14, 116, 144, 0.18);
}
@media (max-width: 375px) {
  .map-panel {
    left: max(10px, env(safe-area-inset-left));
    right: max(10px, env(safe-area-inset-right));
    top: max(10px, env(safe-area-inset-top));
  }
  .panel-title { font-size: 16px; }
  .panel-sub { font-size: 11px; }
  .map-type-switch {
    right: max(10px, env(safe-area-inset-right));
    bottom: max(16px, env(safe-area-inset-bottom));
  }
}
</style>
