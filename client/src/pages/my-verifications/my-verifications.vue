<template>
  <view class="mine-verify-page dd-page">
    <view class="page-head dd-card">
      <text class="head-title">我的验点记录</text>
      <text class="head-sub">共 {{ total }} 条 · 最近优先</text>
      <view v-if="auth.isLoggedIn" class="head-chips">
        <text class="head-chip">现场反馈沉淀</text>
        <text class="head-chip">帮助后来的钓友判断</text>
      </view>
    </view>

    <view v-if="!auth.isLoggedIn" class="empty dd-card">
      <text class="empty-title">请先登录</text>
      <button class="dd-primary-btn" @tap="goLogin">去登录</button>
    </view>

    <view v-else-if="!loading && items.length === 0" class="empty dd-card">
      <text class="empty-title">还没有验点记录</text>
      <text class="empty-desc">去标点详情写一次“中鱼/空军”等反馈，这里会自动沉淀。</text>
    </view>

    <scroll-view v-else scroll-y class="list-wrap" @scrolltolower="loadMore">
      <view v-for="item in items" :key="item.id" class="verify-card dd-card">
        <view class="verify-top">
          <text class="feedback">{{ item.feedback }}</text>
          <text class="time">{{ formatTime(item.createdAt) }}</text>
        </view>
        <view class="spot-line" @tap="goSpot(item.spotId)">
          <text class="spot-name">{{ item.spot?.name || `标点 #${item.spotId}` }}</text>
          <text class="spot-meta">{{ item.spot?.style || '-' }} · {{ item.spot?.species || '未填鱼种' }}</text>
        </view>
        <text v-if="item.note" class="note">{{ item.note }}</text>
        <scroll-view v-if="item.photoUrls?.length" class="verify-photo-strip" scroll-x>
          <view class="verify-photo-inner">
            <image
              v-for="(url, index) in item.photoUrls"
              :key="`${url}-${index}`"
              class="verify-photo"
              :src="normalizePhotoUrl(url)"
              mode="aspectFill"
              @tap="previewPhotos(item.photoUrls || [], index)"
            />
          </view>
        </scroll-view>
      </view>
      <view v-if="loading" class="loading-hint">加载中…</view>
      <view v-else-if="!hasMore && items.length > 0" class="loading-hint">没有更多了</view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { spotApi, type VerificationItem } from '@/api/spots';

const auth = useAuthStore();
const items = ref<VerificationItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const hasMore = ref(true);
const loading = ref(false);

function formatTime(value: string) {
  if (!value) return '';
  return String(value).replace('T', ' ').slice(0, 16);
}

function normalizePhotoUrl(url: string) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
  return `${base}${url}`;
}

function previewPhotos(urls: string[], index: number) {
  if (!urls.length) return;
  const normalized = urls.map(normalizePhotoUrl);
  uni.previewImage({
    current: normalized[index],
    urls: normalized,
  });
}

async function load(pageNo = 1) {
  if (!auth.isLoggedIn || loading.value) return;
  loading.value = true;
  try {
    const res = await spotApi.myVerifications(pageNo, pageSize);
    const list = res.data?.items || [];
    total.value = res.data?.total || 0;
    if (pageNo === 1) {
      items.value = list;
    } else {
      items.value = [...items.value, ...list];
    }
    hasMore.value = items.value.length < total.value;
    page.value = pageNo;
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  if (loading.value || !hasMore.value) return;
  load(page.value + 1);
}

function goSpot(spotId: number) {
  uni.navigateTo({ url: `/pages/spot/spot?id=${spotId}` });
}

function goLogin() {
  uni.navigateTo({ url: '/pages/login/login' });
}

onMounted(() => {
  load(1);
});
</script>

<style scoped>
.mine-verify-page { padding-bottom: 28px; }
.page-head {
  padding: 18px;
  margin-bottom: 14px;
  border-radius: 30px;
  background:
    linear-gradient(135deg, rgba(15, 118, 110, 0.96) 0%, rgba(8, 145, 178, 0.96) 100%);
  border-color: rgba(255,255,255,0.18);
  box-shadow: 0 24px 44px rgba(8, 145, 178, 0.16);
}
.head-title { display: block; font-size: 22px; font-weight: 950; color: #FFFFFF; }
.head-sub { display: block; margin-top: 6px; font-size: 12px; color: rgba(255,255,255,0.78); }
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
.list-wrap { max-height: calc(100vh - 190px); }
.verify-card { padding: 16px; margin-bottom: 12px; border-radius: 24px; }
.verify-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.feedback {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 900;
  color: #0E7490;
  background: rgba(8,145,178,0.10);
}
.time { font-size: 12px; color: #6C8198; }
.spot-line { margin-top: 8px; }
.spot-name { display: block; font-size: 14px; color: #16324F; font-weight: 900; }
.spot-meta { display: block; margin-top: 4px; font-size: 12px; color: #6C8198; }
.note { display: block; margin-top: 10px; padding: 10px 12px; border-radius: 16px; background: rgba(238,248,251,0.98); font-size: 12px; color: #5C748A; line-height: 1.6; }
.verify-photo-strip { width: 100%; margin-top: 10px; white-space: nowrap; }
.verify-photo-inner { display: inline-flex; gap: 8px; }
.verify-photo { width: 76px; height: 76px; border-radius: 16px; background: #EAF8FB; }
.loading-hint { text-align: center; color: #6C8198; font-size: 12px; padding: 10px 0 16px; }
.empty { padding: 24px 18px; text-align: center; }
.empty-title { display: block; font-size: 16px; color: #16324F; font-weight: 900; }
.empty-desc { display: block; margin-top: 6px; font-size: 12px; color: #6C8198; line-height: 1.6; }
</style>
