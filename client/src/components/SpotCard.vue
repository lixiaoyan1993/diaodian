<template>
  <view class="spot-card dd-card" @tap="onSelect">
    <view class="spot-card-head">
      <view class="spot-title-wrap">
        <view class="spot-kicker-row">
          <text class="spot-style-badge">{{ spot.style || '钓点' }}</text>
        </view>

        <view class="spot-name-row">
          <text class="spot-name">{{ spot.name }}</text>
          <text v-if="hasDistance" class="distance-inline">{{ distanceText }}</text>
        </view>

        <text v-if="spot.district" class="spot-subline">{{ spot.district }}</text>
      </view>

      <view class="spot-side">
        <text class="spot-time-label">收录时间</text>
        <text class="spot-time">{{ createdAtText }}</text>
      </view>
    </view>

    <view class="spot-detail-panel">
      <view class="detail-pill detail-pill-primary">
        <text class="detail-pill-kicker">鱼情与线索</text>
        <text class="detail-pill-text">{{ fishText }}</text>
      </view>

      <view v-if="visibleTags.length" class="tag-list">
        <text v-for="tag in visibleTags" :key="tag" class="spot-tag"># {{ tag }}</text>
      </view>
    </view>

    <view class="card-actions">
      <button class="action-btn action-secondary" :disabled="!hasLocation" @tap.stop="addToPlan">
        <text class="action-label">计划</text>
      </button>
      <button class="action-btn action-secondary" :disabled="favoriteLoading" @tap.stop="addFavorite">
        <text class="action-label">{{ favorited ? '已收藏' : '收藏' }}</text>
      </button>
      <button class="action-btn action-secondary" :disabled="!hasLocation" @tap.stop="navigateToSpot">
        <text class="action-label">导航</text>
      </button>
      <button class="action-btn action-primary" @tap.stop="onSelect">
        <text class="action-label">详情</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { favoriteApi, type SpotItem } from '@/api/spots';
import { useAuthStore } from '@/stores/auth';

const props = withDefaults(defineProps<{
  spot: SpotItem;
  initiallyFavorited?: boolean;
}>(), {
  initiallyFavorited: false,
});

const emit = defineEmits<{ select: [id: number]; plan: [spot: SpotItem] }>();
const auth = useAuthStore();
const favoriteLoading = ref(false);
const favorited = ref(props.initiallyFavorited);

const onSelect = () => {
  if (!requireLogin()) return;
  emit('select', props.spot.id);
};

watch(() => props.spot.id, () => {
  favorited.value = props.initiallyFavorited;
});

const createdAtText = computed(() => formatDate(props.spot.createdAt));
const hasDistance = computed(() => props.spot.distance !== undefined);
const visibleTags = computed(() => props.spot.tags?.slice(0, 4) || []);

const hasLocation = computed(() => (
  props.spot.latitude != null
  && props.spot.longitude != null
  && Number.isFinite(Number(props.spot.latitude))
  && Number.isFinite(Number(props.spot.longitude))
));

const distanceText = computed(() => {
  if (props.spot.distance !== undefined) return formatDistance(props.spot.distance);
  return '';
});

const fishText = computed(() => {
  const parts = [props.spot.species, props.spot.lure, props.spot.bait, props.spot.depth, props.spot.note]
    .map(item => item?.trim())
    .filter(Boolean);
  if (!parts.length) return `${props.spot.style || '钓点'} · 暂未补充鱼情`;
  return parts.join(' · ');
});

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间待确认';
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDistance(distance: number) {
  if (distance >= 1000) return `${Number((distance / 1000).toFixed(1))} km`;
  return `${Math.max(1, Math.round(distance))} m`;
}

function buildAmapUrl() {
  const lat = Number(props.spot.latitude);
  const lng = Number(props.spot.longitude);
  const name = encodeURIComponent(props.spot.name || '钓点');
  return `https://uri.amap.com/marker?position=${lng},${lat}&name=${name}&coordinate=gaode&callnative=1&src=diaodian`;
}

function addToPlan() {
  if (!requireLogin()) return;
  if (!hasLocation.value) {
    uni.showToast({ title: '这个标点没有坐标，不能加入计划', icon: 'none' });
    return;
  }
  emit('plan', props.spot);
}

async function addFavorite() {
  if (!auth.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  if (favorited.value || favoriteLoading.value) {
    uni.showToast({ title: '已在收藏列表', icon: 'none' });
    return;
  }

  favoriteLoading.value = true;
  try {
    await favoriteApi.add(props.spot.id);
    favorited.value = true;
    uni.showToast({ title: '收藏成功', icon: 'success' });
  } catch (e: any) {
    if (String(e?.message || '').includes('已收藏')) {
      favorited.value = true;
      uni.showToast({ title: '已在收藏列表', icon: 'none' });
      return;
    }
    uni.showToast({ title: e?.message || '收藏失败', icon: 'none' });
  } finally {
    favoriteLoading.value = false;
  }
}

function navigateToSpot() {
  if (!requireLogin()) return;
  if (!hasLocation.value) {
    uni.showToast({ title: '这个标点没有坐标', icon: 'none' });
    return;
  }

  // #ifdef H5
  window.location.href = buildAmapUrl();
  // #endif

  // #ifndef H5
  uni.openLocation({
    latitude: Number(props.spot.latitude),
    longitude: Number(props.spot.longitude),
    name: props.spot.name,
    address: props.spot.address || '',
    scale: 16,
  });
  // #endif
}

function requireLogin() {
  if (auth.isLoggedIn) return true;
  uni.navigateTo({ url: '/pages/login/login' });
  return false;
}
</script>

<style scoped>
.spot-card {
  --card-accent: #ff385c;
  --card-accent-soft: #fff1f4;
  --card-ink: #222222;
  --card-muted: #6a6a6a;
  --card-muted-soft: #929292;
  --card-line: #ebebeb;
  margin-bottom: 14px;
  padding: 18px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.99) 0%, rgba(249, 249, 249, 0.97) 100%);
  border: 1px solid var(--card-line);
  box-shadow: 0 16px 30px rgba(34, 34, 34, 0.07);
}

.spot-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.spot-title-wrap {
  flex: 1;
  min-width: 0;
}

.spot-kicker-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.spot-style-badge {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 12px;
  border-radius: 999px;
  background: var(--card-accent-soft);
  color: var(--card-accent);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
}

.spot-name {
  display: block;
  color: var(--card-ink);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.25;
  min-width: 0;
  flex: 1;
}

.spot-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 7px;
  min-width: 0;
}

.spot-subline {
  display: block;
  margin-top: 6px;
  color: var(--card-muted);
  font-size: 12px;
  line-height: 1.4;
}

.spot-side {
  flex: none;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  max-width: 108px;
  text-align: right;
}

.spot-time-label {
  color: var(--card-muted-soft);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.04em;
}

.spot-time {
  color: var(--card-muted);
  font-size: 11px;
  font-weight: 500;
  line-height: 1.45;
}

.distance-inline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--card-accent);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 10px 20px rgba(255, 56, 92, 0.18);
  white-space: nowrap;
}

.spot-detail-panel {
  margin-top: 16px;
  padding: 14px;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 248, 249, 0.95) 0%, rgba(250, 250, 250, 0.95) 100%);
  border: 1px solid #f0f0f0;
}

.detail-pill {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-pill-kicker {
  color: var(--card-muted-soft);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
}

.detail-pill-text {
  color: #3f3f3f;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.55;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.spot-tag {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--card-line);
  color: var(--card-muted);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
}

.card-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 16px;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 42px;
  padding: 0 6px;
  border-radius: 18px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.action-label {
  display: block;
  line-height: 1;
}

.action-secondary {
  border: 1px solid var(--card-line);
  background: rgba(255, 255, 255, 0.95);
  color: #3f3f3f;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.82);
}

.action-primary {
  border: 0;
  background: var(--card-accent);
  color: #fff;
  box-shadow: 0 14px 24px rgba(255, 56, 92, 0.18);
}

.action-btn[disabled] {
  opacity: 0.5;
}

@media (max-width: 430px) {
  .spot-card {
    padding: 16px;
    border-radius: 24px;
  }

  .spot-card-head {
    flex-direction: column;
  }

  .spot-side {
    width: 100%;
    max-width: none;
    align-items: flex-start;
    text-align: left;
  }
}

@media (max-width: 360px) {
  .spot-name {
    font-size: 15px;
  }

  .spot-name-row {
    gap: 6px;
    align-items: flex-start;
    flex-direction: column;
  }

  .spot-detail-panel {
    padding: 12px;
  }

  .action-btn {
    min-height: 40px;
    padding: 0 4px;
    font-size: 11px;
  }
}
</style>
