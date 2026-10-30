import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import type { SpotItem } from '@/api/spots';
import { useAuthStore } from '@/stores/auth';

declare const plus: any;
declare const window: any;

const STORAGE_KEY_PREFIX = 'diaodian_trip_plan';
const ACTIVE_INDEX_STORAGE_KEY_PREFIX = 'diaodian_trip_active_index';

function hasLocation(spot: SpotItem) {
  return spot.latitude != null
    && spot.longitude != null
    && Number.isFinite(Number(spot.latitude))
    && Number.isFinite(Number(spot.longitude));
}

function calcDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const radius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatDistance(distance: number) {
  if (distance >= 1000) return `${Number((distance / 1000).toFixed(1))} km`;
  return `${Math.max(1, Math.round(distance))} m`;
}

function encodePointName(name: string) {
  return encodeURIComponent(name.replace(/[|,&?=]/g, ' ').trim() || '钓点');
}

function buildAmapWebUrl(spots: SpotItem[]) {
  const destination = spots[spots.length - 1];
  const vias = spots.slice(0, 1);
  const params = [
    `to=${Number(destination.longitude)},${Number(destination.latitude)},${encodePointName(destination.name)}`,
    'mode=car',
    'policy=0',
    'coordinate=gaode',
    'callnative=1',
    'src=diaodian',
  ];
  if (vias.length) {
    params.push(`via=${Number(vias[0].longitude)},${Number(vias[0].latitude)},${encodePointName(vias[0].name)}`);
  }
  return `https://uri.amap.com/navigation?${params.join('&')}`;
}

function buildAmapAppUrl(platform: 'android' | 'ios', spots: SpotItem[]) {
  const destination = spots[spots.length - 1];
  const vias = spots.slice(0, -1);
  const params = [
    'sourceApplication=' + encodeURIComponent('鱼标点'),
    'sid=',
    'sname=我的位置',
    'did=',
    `dlat=${Number(destination.latitude)}`,
    `dlon=${Number(destination.longitude)}`,
    `dname=${encodePointName(destination.name)}`,
    'dev=0',
    't=0',
    'm=0',
  ];
  if (vias.length) {
    params.push(`vian=${vias.length}`);
    params.push(`vialons=${vias.map(spot => Number(spot.longitude)).join('|')}`);
    params.push(`vialats=${vias.map(spot => Number(spot.latitude)).join('|')}`);
    params.push(`vianames=${vias.map(spot => encodePointName(spot.name)).join('|')}`);
  }
  return platform === 'ios' ? `iosamap://path?${params.join('&')}` : `amapuri://route/plan/?${params.join('&')}`;
}

function fallbackOpenFirstLocation(spots: SpotItem[]) {
  const first = spots[0];
  uni.openLocation({
    latitude: Number(first.latitude),
    longitude: Number(first.longitude),
    name: first.name,
    address: first.address || '',
    scale: 16,
  });
}

export const useTripStore = defineStore('trip', () => {
  const auth = useAuthStore();
  const items = ref<SpotItem[]>([]);
  const loadedKey = ref('');
  const activeIndex = ref(0);
  const identityKey = computed(() => (
    auth.user?.id ? `user_${auth.user.id}` : 'guest'
  ));

  const navigableItems = computed(() => items.value.filter(hasLocation));
  const currentNavigatingSpot = computed(() => navigableItems.value[activeIndex.value] || null);
  const currentNavigationStep = computed(() => (
    navigableItems.value.length ? Math.min(activeIndex.value + 1, navigableItems.value.length) : 0
  ));
  const hasNextNavigableSpot = computed(() => (
    activeIndex.value < navigableItems.value.length - 1
  ));
  const totalDistance = computed(() => {
    if (navigableItems.value.length < 2) return 0;
    return navigableItems.value.slice(1).reduce((sum, item, index) => {
      const prev = navigableItems.value[index];
      return sum + calcDistanceMeters(Number(prev.latitude), Number(prev.longitude), Number(item.latitude), Number(item.longitude));
    }, 0);
  });
  const distanceText = computed(() => totalDistance.value ? formatDistance(totalDistance.value) : '');

  function getStorageKey() {
    return `${STORAGE_KEY_PREFIX}_${identityKey.value}`;
  }

  function getActiveIndexStorageKey() {
    return `${ACTIVE_INDEX_STORAGE_KEY_PREFIX}_${identityKey.value}`;
  }

  function persist() {
    uni.setStorageSync(getStorageKey(), items.value);
  }

  function persistActiveIndex() {
    uni.setStorageSync(getActiveIndexStorageKey(), activeIndex.value);
  }

  function load(force = false) {
    const storageKey = getStorageKey();
    if (!force && loadedKey.value === storageKey) return;
    loadedKey.value = storageKey;
    try {
      const saved = uni.getStorageSync(storageKey) as SpotItem[] | '';
      items.value = Array.isArray(saved) ? saved.filter(item => item && item.id) : [];
    } catch {
      items.value = [];
    }
    try {
      const savedIndex = Number(uni.getStorageSync(getActiveIndexStorageKey()));
      activeIndex.value = Number.isFinite(savedIndex) && savedIndex >= 0 ? savedIndex : 0;
    } catch {
      activeIndex.value = 0;
    }
    if (activeIndex.value >= navigableItems.value.length) {
      activeIndex.value = 0;
      persistActiveIndex();
    }
  }

  function add(spot: SpotItem) {
    load();
    if (!hasLocation(spot)) {
      uni.showToast({ title: '这个标点没有坐标，不能加入计划', icon: 'none' });
      return false;
    }
    if (items.value.some(item => item.id === spot.id)) {
      uni.showToast({ title: '已在出行计划里', icon: 'none' });
      return true;
    }
    items.value = [...items.value, spot].slice(0, 12);
    persist();
    if (!currentNavigatingSpot.value) {
      activeIndex.value = 0;
      persistActiveIndex();
    }
    uni.showToast({ title: '已加入出行计划', icon: 'none' });
    return true;
  }

  function remove(id: number) {
    load();
    items.value = items.value.filter(item => item.id !== id);
    persist();
    if (activeIndex.value >= navigableItems.value.length) {
      activeIndex.value = Math.max(0, navigableItems.value.length - 1);
      persistActiveIndex();
    }
  }

  function clear() {
    load();
    items.value = [];
    persist();
    activeIndex.value = 0;
    persistActiveIndex();
  }

  function move(id: number, direction: -1 | 1) {
    load();
    const index = items.value.findIndex(item => item.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= items.value.length) return;
    const next = [...items.value];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    items.value = next;
    persist();
  }

  function resetNavigationProgress() {
    load();
    activeIndex.value = 0;
    persistActiveIndex();
  }

  function advanceNavigation() {
    load();
    if (activeIndex.value < navigableItems.value.length - 1) {
      activeIndex.value += 1;
      persistActiveIndex();
      return true;
    }
    return false;
  }

  function openSpotLocation(spot: SpotItem) {
    uni.openLocation({
      latitude: Number(spot.latitude),
      longitude: Number(spot.longitude),
      name: spot.name,
      address: spot.address || '',
      scale: 16,
    });
  }

  function startNavigation() {
    load();
    const spots = navigableItems.value;
    if (!spots.length) {
      uni.showToast({ title: '先加入至少一个有坐标的标点', icon: 'none' });
      return;
    }

    // #ifdef APP-PLUS
    const platform = plus.os.name === 'iOS' ? 'ios' : 'android';
    plus.runtime.openURL(buildAmapAppUrl(platform, spots), () => fallbackOpenFirstLocation(spots));
    return;
    // #endif

    // #ifdef H5
    if (spots.length > 2) {
      uni.showToast({ title: '浏览器拉起高德最多带 1 个途经点', icon: 'none' });
    }
    window.location.href = buildAmapWebUrl(spots);
    return;
    // #endif

    // #ifndef H5
    // #ifndef APP-PLUS
    const current = currentNavigatingSpot.value || spots[0];
    if (!current) {
      uni.showToast({ title: '先加入至少一个可导航钓点', icon: 'none' });
      return;
    }
    openSpotLocation(current);
    // #endif
    // #endif
  }

  watch(identityKey, () => {
    load(true);
  }, { immediate: true });

  return {
    items,
    navigableItems,
    currentNavigatingSpot,
    currentNavigationStep,
    hasNextNavigableSpot,
    activeIndex,
    distanceText,
    load,
    add,
    remove,
    clear,
    move,
    resetNavigationProgress,
    advanceNavigation,
    startNavigation,
    openSpotLocation,
    hasLocation,
    formatDistance,
  };
});
