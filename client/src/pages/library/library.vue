<template>
  <view class="library-page dd-page">
    <view class="profile-hero dd-card">
      <view class="profile-body">
        <view class="profile-overview">
      <view class="profile-top">
        <view class="avatar">{{ avatarText }}</view>
        <view class="profile-main">
          <text class="hello">{{ auth.isLoggedIn ? '我的钓友档案' : '欢迎来到鱼标点' }}</text>
          <text class="nickname">{{ displayName }}</text>
          <text class="profile-sub">{{ profileSubtitle }}</text>
        </view>
      </view>

      <view class="identity-row">
        <text class="identity-badge">{{ anglerTitle }}</text>
        <text class="identity-chip">{{ mainWaterText }}</text>
        <text class="identity-chip">{{ shareText }}</text>
      </view>

        </view>

        <view class="profile-side">
      <view class="profile-stats">
        <view class="profile-stat">
          <text class="stat-value">{{ stats.total }}</text>
          <text class="stat-label">标点</text>
        </view>
        <view class="profile-stat">
          <text class="stat-value">{{ stats.lure }}</text>
          <text class="stat-label">路亚</text>
        </view>
        <view class="profile-stat">
          <text class="stat-value">{{ stats.bait }}</text>
          <text class="stat-label">台钓</text>
        </view>
        <view class="profile-stat">
          <text class="stat-value">{{ stats.public }}</text>
          <text class="stat-label">公开</text>
        </view>
      </view>

      <view v-if="auth.isLoggedIn" class="quick-actions">
        <button class="quick-btn primary" @tap="goRecord">记新标点</button>
        <button class="quick-btn" @tap="goHall">逛标点池</button>
        <button v-if="auth.isAdmin" class="quick-btn admin" @tap="goAdmin">管理后台</button>
      </view>
        </view>
      </view>
    </view>

    <view v-if="auth.isLoggedIn" class="section-line list-head">
      <text class="section-title">我的点库</text>
      <view class="list-actions">
        <text class="section-meta">{{ filteredSpots.length }} 个</text>
        <button class="distance-btn" @tap="loadDistances()">
          {{ distanceLoading ? '定位中' : userLocation ? '刷新距离' : '显示距离' }}
        </button>
      </view>
    </view>

    <view v-if="auth.isLoggedIn" class="filter-bar">
      <button
        v-for="s in filters"
        :key="s"
        :class="['dd-chip', { 'dd-chip-active': filter === s }]"
        @tap="filter = s"
      >{{ s }}</button>
    </view>

    <scroll-view scroll-y class="list-wrap" @scrolltolower="loadMore">
      <view v-if="!auth.isLoggedIn" class="login-empty dd-card">
        <text class="empty-title">登录后开启你的私人点库</text>
        <text class="empty-desc">保存标点、沉淀鱼情、管理是否分享到标点池，让每一次出钓都有记录可复盘。</text>
        <button class="login-action dd-primary-btn" @tap="goLogin">登录</button>
      </view>

      <view v-else-if="filteredSpots.length === 0 && !loading" class="empty dd-empty dd-card">
        <text>{{ emptyText }}</text>
      </view>

      <view v-for="s in filteredSpots" :key="s.id" class="spot-row">
        <view class="spot-row-card">
          <SpotCard
            :spot="s"
            @select="onSpotSelect"
            @plan="togglePlanSpot"
          />
        </view>
      </view>
      <view v-if="loading" class="loading-hint">加载中…</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { spotApi, type SpotItem } from '@/api/spots';
import { useAuthStore } from '@/stores/auth';
import { useTripStore } from '@/stores/trip';
import SpotCard from '@/components/SpotCard.vue';

const auth = useAuthStore();
const trip = useTripStore();
const mySpots = ref<SpotItem[]>([]);
const filter = ref('全部');
const filters = ['全部', '路亚', '台钓'];
const loading = ref(false);
const distanceLoading = ref(false);
const userLocation = ref<{ lat: number; lng: number } | null>(null);

const filteredSpots = computed(() => {
  return mySpots.value.filter(item => {
    const matchStyle = filter.value === '全部' || item.style .includes(filter.value);
    return matchStyle;
  });
});

const stats = computed(() => {
  const lure = mySpots.value.filter(item => item.style .includes("路亚")).length;
  const bait = mySpots.value.filter(item => item.style .includes("台钓")).length;
  return {
    total: mySpots.value.length,
    lure,
    bait,
    public: mySpots.value.filter(item => item.isPublic).length,
    verified: mySpots.value.reduce((sum, item) => sum + (item._count?.verifications || 0), 0),
  };
});

const displayName = computed(() => auth.username || '未登录钓友');
const avatarText = computed(() => (auth.username || '钓').slice(0, 1).toUpperCase());

const anglerTitle = computed(() => {
  if (!auth.isLoggedIn) return '待登录钓友';
  if (stats.value.total === 0) return '新手建点中';
  if (stats.value.lure > 0 && stats.value.bait > 0) return '全能钓手';
  if (stats.value.lure >= stats.value.bait) return '路亚选手';
  return '台钓选手';
});

const profileSubtitle = computed(() => {
  if (!auth.isLoggedIn) return '登录后展示你的钓友身份、偏好钓法和私人点库';
  if (stats.value.total === 0) return '还没有记录标点，先从第一个常去水域开始';
  return `已记录 ${stats.value.total} 个标点，累计 ${stats.value.verified} 次验点反馈`;
});

const mainWaterText = computed(() => {
  if (!auth.isLoggedIn || stats.value.total === 0) return '未设置偏好';
  if (stats.value.lure === stats.value.bait) return '双修路线';
  return stats.value.lure > stats.value.bait ? '偏爱路亚' : '偏爱台钓';
});

const shareText = computed(() => {
  if (!auth.isLoggedIn) return '登录可分享';
  return stats.value.public > 0 ? `已公开 ${stats.value.public} 个` : '全部私密';
});

const emptyText = computed(() => {
  if (filter.value === '全部') return '还没有标点，去记录一个常去水域吧。';
  return `还没有${filter.value}标点，切换筛选或去记录一个。`;
});

async function loadMySpots() {
  if (!auth.isLoggedIn) return;
  loading.value = true;
  try {
    const res = await spotApi.list({ pageSize: '100' });
    if (res.data) {
      mySpots.value = applyDistance(res.data.items.filter(s => s.userId === auth.user?.id));
    }
  } finally {
    loading.value = false;
  }
}

function applyDistance(spots: SpotItem[]) {
  if (!userLocation.value) return spots;
  return spots.map(item => {
    if (item.latitude == null || item.longitude == null) return item;
    return {
      ...item,
      distance: calcDistanceMeters(userLocation.value!.lat, userLocation.value!.lng, Number(item.latitude), Number(item.longitude)),
    };
  });
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

function loadDistances(showFailToast = true) {
  if (distanceLoading.value) return;
  distanceLoading.value = true;
  uni.getLocation({
    type: 'wgs84',
    success: (res) => {
      userLocation.value = { lat: res.latitude, lng: res.longitude };
      mySpots.value = applyDistance(mySpots.value);
      uni.showToast({ title: '距离已更新', icon: 'none' });
    },
    fail: () => {
      if (showFailToast) uni.showToast({ title: '定位失败，请开启定位权限', icon: 'none' });
    },
    complete: () => {
      distanceLoading.value = false;
    },
  });
}

function loadMore() {}

function hasSpotLocation(spot: SpotItem) {
  return spot.latitude != null
    && spot.longitude != null
    && Number.isFinite(Number(spot.latitude))
    && Number.isFinite(Number(spot.longitude));
}

function requireLogin() {
  if (auth.isLoggedIn) return true;
  uni.navigateTo({ url: '/pages/login/login' });
  return false;
}

function togglePlanSpot(spot: SpotItem) {
  if (!requireLogin()) return;
  trip.add(spot);
}

function onSpotSelect(id: number) {
  goDetail(id);
}

function formatDistance(distance: number) {
  if (distance >= 1000) return `${Number((distance / 1000).toFixed(1))} km`;
  return `${Math.max(1, Math.round(distance))} m`;
}

function goDetail(id: number | string) {
  if (!requireLogin()) return;
  const spotId = Number(id);
  if (!Number.isFinite(spotId) || spotId <= 0) {
    uni.showToast({ title: '标点 ID 异常，请重新进入', icon: 'none' });
    return;
  }
  uni.navigateTo({ url: `/pages/spot/spot?id=${spotId}` });
}
function goLogin() { uni.navigateTo({ url: '/pages/login/login' }); }
function goHall() { uni.switchTab({ url: '/pages/hall/hall' }); }
function goRecord() { uni.switchTab({ url: '/pages/record/record' }); }
function goAdmin() {
  // #ifdef H5
  window.location.href = 'http://127.0.0.1:3777/admin/';
  // #endif
  // #ifndef H5
  uni.showToast({ title: '请在浏览器中打开管理后台', icon: 'none' });
  // #endif
}

onMounted(async () => {
  if (!auth.isLoggedIn) return;
  await loadMySpots();
  loadDistances(false);
});
</script>

<style scoped>
.library-page { padding-bottom: 28px; }
.profile-hero {
  padding: 18px;
  margin-bottom: 14px;
  border-radius: 30px;
  background:
    linear-gradient(135deg, rgba(15, 118, 110, 0.96) 0%, rgba(8, 145, 178, 0.96) 100%);
  border-color: rgba(255,255,255,0.18);
  box-shadow: 0 24px 44px rgba(8, 145, 178, 0.16);
}
.profile-body {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(240px, 320px);
  gap: 14px;
  align-items: start;
}
.profile-overview { min-width: 0; }
.profile-side {
  display: grid;
  gap: 10px;
  align-content: start;
}
.profile-top { display: flex; align-items: center; gap: 10px; }
.avatar {
  flex: none;
  width: 52px;
  height: 52px;
  border-radius: 20px;
  background: rgba(255,255,255,0.18);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 950;
}
.profile-main { flex: 1; min-width: 0; }
.hello { display: block; color: rgba(255,255,255,0.72); font-size: 12px; line-height: 1.35; font-weight: 800; }
.nickname { display: block; margin-top: 2px; color: #FFFFFF; font-size: 21px; font-weight: 950; line-height: 1.15; }
.profile-sub { display: block; margin-top: 6px; color: rgba(255,255,255,0.78); font-size: 12px; line-height: 1.5; }
.identity-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.identity-badge,
.identity-chip {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
}
.identity-badge { background: rgba(255,255,255,0.18); color: #fff; }
.identity-chip { background: rgba(255,255,255,0.14); color: rgba(255,255,255,0.82); }
.profile-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.profile-stat {
  padding: 10px 8px;
  border-radius: 20px;
  background: rgba(255,255,255,0.14);
  text-align: center;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
}
.stat-value { display: block; color: #FFFFFF; font-size: 18px; font-weight: 950; line-height: 1; }
.stat-label { display: block; margin-top: 4px; color: rgba(255,255,255,0.72); font-size: 11px; font-weight: 800; }
.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.quick-btn {
  width: 100%;
  min-height: 40px;
  padding: 0 10px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.12);
  color: #fff;
  font-size: 13px;
  line-height: 1.2;
  font-weight: 900;
  box-sizing: border-box;
}
.quick-btn.primary { border: 0; background: rgba(255,255,255,0.98); color: #0E7490; }
.quick-btn.admin { grid-column: 1 / -1; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.08); color: #fff; }
.section-line { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.section-title { color: #16324F; font-size: 17px; font-weight: 950; }
.section-meta { color: #6C8198; font-size: 12px; font-weight: 800; }
.list-head { margin: 6px 0 12px; }
.list-actions { display: flex; align-items: center; gap: 8px; }
.distance-btn { min-height: 36px; padding: 0 12px; border-radius: 16px; background: rgba(255,255,255,0.82); color: #0E7490; border: 1px solid rgba(155, 189, 210, 0.72); font-size: 12px; line-height: 1.2; font-weight: 900; }
.filter-bar { display: flex; gap: 8px; margin-bottom: 12px; }
.spot-row { display: flex; align-items: flex-start; gap: 8px; }
.spot-row-card { flex: 1; min-width: 0; }
.list-wrap { max-height: calc(100vh - 300px); }
.empty { margin-top: 4px; }
.login-empty { margin-top: 4px; padding: 24px 20px; text-align: center; }
.empty-title { display: block; color: #16324F; font-size: 19px; font-weight: 950; }
.empty-desc { display: block; margin-top: 8px; color: #6C8198; font-size: 13px; line-height: 1.6; }
.login-action { width: 100%; margin-top: 16px; }
.empty-actions { display: flex; gap: 10px; margin-top: 18px; }
.browse-action { flex: 1; }
.loading-hint { text-align: center; padding: 16px; color: #6C8198; font-size: 13px; }

@media (max-width: 430px) {
  .profile-body {
    grid-template-columns: 1fr;
  }

  .profile-side {
    gap: 8px;
  }

  .profile-stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .stat-value {
    font-size: 16px;
  }

  .quick-actions,
  .empty-actions {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .filter-bar {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .filter-bar .dd-chip {
    width: 100%;
    padding: 0 8px;
  }

  .list-wrap {
    max-height: none;
  }

  .login-action,
  .browse-action,
  .browse-action {
    width: 100%;
  }
}

@media (max-width: 360px) {
  .profile-top {
    align-items: flex-start;
  }

  .avatar {
    width: 46px;
    height: 46px;
  }

  .nickname {
    font-size: 18px;
  }

  .profile-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
