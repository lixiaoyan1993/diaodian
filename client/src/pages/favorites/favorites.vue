<template>
  <view class="favorites-page dd-page">
    <view class="page-head dd-card">
      <view class="head-main">
        <text class="page-title">我的收藏</text>
        <text class="page-sub">{{ auth.isLoggedIn ? `${total} 个收藏标点` : '登录后查看收藏的标点' }}</text>
        <view v-if="auth.isLoggedIn" class="head-chips">
          <text class="head-chip">常用点位</text>
          <text class="head-chip">出钓前快速翻看</text>
        </view>
      </view>
      <button v-if="auth.isLoggedIn" class="refresh-btn" @tap="refresh">刷新</button>
    </view>

    <view v-if="!auth.isLoggedIn" class="login-empty dd-card">
      <text class="empty-title">先登录，再整理收藏点位</text>
      <text class="empty-desc">在大厅或详情里收藏的标点，会集中展示在这里。</text>
      <button class="login-action dd-primary-btn" @tap="goLogin">登录 / 注册</button>
    </view>

    <scroll-view v-else scroll-y class="list-wrap" @scrolltolower="loadMore">
      <view v-if="spots.length === 0 && !loading" class="empty dd-empty dd-card">
        <text>还没有收藏标点，去大厅挑几个常用点位吧。</text>
        <button class="browse-btn dd-primary-btn" @tap="goHall">去大厅</button>
      </view>

      <view v-for="spot in spots" :key="spot.id" class="favorite-row">
        <SpotCard :spot="spot" :initially-favorited="true" @select="goDetail" @plan="addToPlan" />
      </view>

      <view v-if="loading" class="loading-hint">加载中...</view>
      <view v-else-if="spots.length && !hasMore" class="loading-hint">已经到底了</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { favoriteApi, type SpotItem } from '@/api/spots';
import { useAuthStore } from '@/stores/auth';
import { useTripStore } from '@/stores/trip';
import SpotCard from '@/components/SpotCard.vue';

const auth = useAuthStore();
const trip = useTripStore();
const spots = ref<SpotItem[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = 20;
const total = ref(0);

const hasMore = computed(() => spots.value.length < total.value);

async function loadFavorites(reset = false) {
  if (!auth.isLoggedIn || loading.value) return;
  loading.value = true;
  try {
    const nextPage = reset ? 1 : page.value;
    const res = await favoriteApi.list(nextPage, pageSize);
    if (!res.data) return;
    total.value = res.data.total;
    const nextItems = res.data.items.map(item => item.spot).filter(Boolean);
    spots.value = reset ? nextItems : [...spots.value, ...nextItems];
    page.value = nextPage + 1;
  } finally {
    loading.value = false;
  }
}

function refresh() {
  loadFavorites(true);
}

function loadMore() {
  if (hasMore.value) loadFavorites(false);
}

function requireLogin() {
  if (auth.isLoggedIn) return true;
  uni.navigateTo({ url: '/pages/login/login' });
  return false;
}

function addToPlan(spot: SpotItem) {
  if (!requireLogin()) return;
  trip.add(spot);
}

function goDetail(id: number | string) {
  if (!requireLogin()) return;
  uni.navigateTo({ url: `/pages/spot/spot?id=${Number(id)}` });
}

function goHall() {
  uni.switchTab({ url: '/pages/hall/hall' });
}

function goLogin() {
  uni.navigateTo({ url: '/pages/login/login' });
}

onMounted(() => {
  loadFavorites(true);
});

onShow(() => {
  loadFavorites(true);
});
</script>

<style scoped>
.favorites-page {
  padding-bottom: 28px;
}
.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 18px;
  border-radius: 30px;
  background:
    linear-gradient(135deg, rgba(15, 118, 110, 0.96) 0%, rgba(8, 145, 178, 0.96) 100%);
  border-color: rgba(255,255,255,0.18);
  box-shadow: 0 24px 44px rgba(8, 145, 178, 0.16);
}
.head-main {
  flex: 1;
  min-width: 0;
}
.page-title {
  display: block;
  color: #FFFFFF;
  font-size: 24px;
  font-weight: 950;
  line-height: 1.2;
}
.page-sub {
  display: block;
  margin-top: 6px;
  color: rgba(255,255,255,0.78);
  font-size: 12px;
  font-weight: 800;
}
.head-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.head-chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255,255,255,0.14);
  color: rgba(255,255,255,0.92);
  font-size: 11px;
  font-weight: 900;
}
.refresh-btn {
  flex: none;
  height: 40px;
  padding: 0 14px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.16);
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 900;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.16);
}
.list-wrap { max-height: calc(100vh - 132px); }
.favorite-row { margin-bottom: 12px; }
.login-empty {
  padding: 24px 20px;
  text-align: center;
}
.empty-title {
  display: block;
  color: #16324F;
  font-size: 20px;
  font-weight: 950;
}
.empty-desc {
  display: block;
  margin-top: 8px;
  color: #6C8198;
  font-size: 13px;
  line-height: 1.6;
}
.login-action,
.browse-btn {
  width: 100%;
  margin-top: 16px;
}
.empty { padding: 24px 20px; }
.loading-hint {
  padding: 16px;
  text-align: center;
  color: #6C8198;
  font-size: 13px;
}

@media (max-width: 430px) {
  .page-head {
    padding: 14px;
  }

  .refresh-btn {
    height: 36px;
    padding: 0 12px;
  }

  .list-wrap {
    max-height: none;
  }
}
</style>
