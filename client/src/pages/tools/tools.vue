<template>
  <view class="trip-page dd-page">
    <view class="trip-top">
      <view class="hero dd-card">
      <text class="hero-kicker">我的路线</text>
      <text class="hero-title">出行</text>
      <text class="hero-sub">把想去的钓点排好顺序，准备好后直接导航。</text>
      </view>

      <view class="summary dd-card">
      <view class="summary-item">
        <text class="summary-value">{{ trip.items.length }}</text>
        <text class="summary-label">计划点位</text>
      </view>
      <view class="summary-item">
        <text class="summary-value">{{ trip.distanceText || '--' }}</text>
        <text class="summary-label">直线距离</text>
      </view>
      <view class="summary-item summary-item-wide">
        <text class="summary-value">{{ readyText }}</text>
        <text class="summary-label">导航状态</text>
      </view>
      </view>
    </view>

    <view class="actions">
      <button class="action-card action-main" @tap="goHall">
        <text class="action-kicker">快速找点</text>
        <text class="action-title">去大厅找点</text>
        <text class="action-desc">浏览公开钓点，顺手加入路线。</text>
      </button>
      <button class="action-card action-strong" @tap="goLibrary">
        <text class="action-kicker">我的内容</text>
        <text class="action-title">从点库选择</text>
        <text class="action-desc">把自己记录过的钓点加进行程。</text>
      </button>
      <button class="action-card action-soft" @tap="goFavorites">
        <text class="action-kicker">常用收藏</text>
        <text class="action-title">从收藏选择</text>
        <text class="action-desc">把保存过的钓点快速加进来。</text>
      </button>
      <button class="action-card action-nav" :disabled="!trip.navigableItems.length" @tap="startNavigation">
        <text class="action-kicker">路线完成后</text>
        <text class="action-title">开始导航</text>
        <text class="action-desc">{{ navigationActionText }}</text>
      </button>
      <!-- #ifdef MP-WEIXIN -->
      <button class="action-card action-share" open-type="share">
        <text class="action-kicker">发给钓友</text>
        <text class="action-title">分享出行</text>
        <text class="action-desc">{{ trip.items.length ? '把当前出行计划发给同行钓友。' : '先分享小程序，邀请钓友一起找点。' }}</text>
      </button>
      <!-- #endif -->
      <!-- #ifndef MP-WEIXIN -->
      <button class="action-card action-share" @tap="copyTripShareLink">
        <text class="action-kicker">发给钓友</text>
        <text class="action-title">分享出行</text>
        <text class="action-desc">{{ trip.items.length ? '复制当前出行页链接。' : '复制小程序入口链接。' }}</text>
      </button>
      <!-- #endif -->
    </view>

    <view v-if="!trip.items.length" class="empty dd-card">
      <text class="empty-title">还没有加入出行计划</text>
      <text class="empty-desc">先用上面的入口加几个钓点，下面会自动生成路线。</text>
    </view>

    <view v-else class="route-section dd-card">
      <view class="section-head">
        <view>
          <text class="section-kicker">路线规划</text>
          <text class="section-title">当前出行路线</text>
          <text class="section-desc">按顺序安排钓点，出发时逐点导航。</text>
        </view>
        <button class="section-action" @tap="trip.clear()">清空</button>
      </view>

      <!-- #ifndef H5 -->
      <!-- #ifndef APP-PLUS -->
      <view v-if="trip.currentNavigatingSpot" class="nav-progress-card">
        <view class="nav-progress-copy">
          <text class="nav-progress-kicker">小程序逐点导航</text>
          <text class="nav-progress-title">当前前往第 {{ trip.currentNavigationStep }} / {{ trip.navigableItems.length }} 个点</text>
          <text class="nav-progress-desc">{{ trip.currentNavigatingSpot.name }}</text>
        </view>
        <view class="nav-progress-actions">
          <button class="nav-progress-btn nav-progress-btn-primary" @tap="startNavigation">导航到当前点</button>
          <button class="nav-progress-btn" :disabled="!trip.hasNextNavigableSpot" @tap="goNextSpot">下一个点</button>
          <button class="nav-progress-btn" @tap="trip.resetNavigationProgress()">重置顺序</button>
        </view>
      </view>
      <!-- #endif -->
      <!-- #endif -->

      <view class="route-list">
        <view v-for="(spot, index) in trip.items" :key="spot.id" class="route-card">
          <view class="route-index">{{ index + 1 }}</view>
          <view class="route-main" @tap="goDetail(spot.id)">
            <text class="route-name">{{ spot.name }}</text>
            <text class="route-address">{{ locationText(spot) }}</text>
            <view class="route-meta">
              <text>{{ spot.species || spot.style || '未填写鱼情' }}</text>
              <text>{{ trip.hasLocation(spot) ? '可导航' : '无坐标' }}</text>
            </view>
          </view>
          <view class="route-tools">
            <button class="tool-btn" :disabled="index === 0" @tap="trip.move(spot.id, -1)">上移</button>
            <button class="tool-btn" :disabled="index === trip.items.length - 1" @tap="trip.move(spot.id, 1)">下移</button>
            <button class="tool-btn danger" @tap="trip.remove(spot.id)">移除</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { onShareAppMessage, onShow } from '@dcloudio/uni-app';
import type { SpotItem } from '@/api/spots';
import { useAuthStore } from '@/stores/auth';
import { useTripStore } from '@/stores/trip';
import { absoluteShareLink, sharePath, tripShareTitle } from '@/utils/fish';

const auth = useAuthStore();
const trip = useTripStore();

const readyText = computed(() => {
  if (!trip.items.length) return '待添加';
  return trip.navigableItems.length === trip.items.length ? '已就绪' : '部分可用';
});
const navigationActionText = computed(() => {
  if (!trip.navigableItems.length) return '先加入至少一个可导航钓点。';
  if (!trip.currentNavigatingSpot) return '立即打开地图开始出发。';
  return `从第 ${trip.currentNavigationStep} 个点开始，按顺序逐个导航。`;
});

function locationText(spot: Partial<SpotItem>) {
  const parts = [spot.province, spot.city, spot.district, spot.address]
    .map(item => item?.trim())
    .filter(Boolean);
  return parts.length ? Array.from(new Set(parts)).join('') : '未填写位置';
}

function goHall() {
  uni.switchTab({ url: '/pages/hall/hall' });
}

function requireLogin() {
  if (auth.isLoggedIn) return true;
  uni.navigateTo({ url: '/pages/login/login' });
  return false;
}

function goLibrary() {
  if (!requireLogin()) return;
  uni.navigateTo({ url: '/pages/library/library' });
}

function goFavorites() {
  if (!requireLogin()) return;
  uni.navigateTo({ url: '/pages/favorites/favorites' });
}

function startNavigation() {
  if (!requireLogin()) return;
  trip.startNavigation();
}

function goDetail(id: number) {
  if (!requireLogin()) return;
  uni.navigateTo({ url: `/pages/spot/spot?id=${id}` });
}

function goNextSpot() {
  if (!requireLogin()) return;
  const moved = trip.advanceNavigation();
  if (!moved) {
    uni.showToast({ title: '已经是最后一个可导航点', icon: 'none' });
    return;
  }
  const current = trip.currentNavigatingSpot;
  if (current) {
    uni.showToast({ title: `已切换到第 ${trip.currentNavigationStep} 个点`, icon: 'none' });
  }
}

function getTripShareTitle() {
  return tripShareTitle(trip.items);
}

function copyTripShareLink() {
  uni.setClipboardData({
    data: absoluteShareLink(sharePath.trip),
    success: () => uni.showToast({ title: '出行链接已复制', icon: 'none' }),
  });
}

onShareAppMessage(() => ({
  title: getTripShareTitle(),
  path: sharePath.trip,
}));

onMounted(() => {
  if (auth.isLoggedIn) trip.load();
});
onShow(() => {
  if (!requireLogin()) return;
  trip.load();
});
</script>

<style scoped>
.trip-page {
  --trip-ink: #222222;
  --trip-muted: #6A6A6A;
  --trip-muted-soft: #929292;
  --trip-accent: #FF385C;
  --trip-accent-soft: #FFF1F4;
  --trip-line: #EBEBEB;
  --trip-shadow: rgba(34, 34, 34, 0.08);
  max-width: 760px;
  padding-top: 16px;
  padding-bottom: 32px;
  background:
    radial-gradient(circle at 14% -8%, rgba(255, 56, 92, 0.08), transparent 24%),
    radial-gradient(circle at 86% 6%, rgba(255, 195, 167, 0.12), transparent 24%),
    linear-gradient(180deg, #FFFFFF 0%, #FCFCFC 44%, #F7F7F7 100%);
}
.trip-top {
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(220px, 0.82fr);
  gap: 12px;
  align-items: stretch;
}
.hero {
  padding: 20px 18px;
  border-radius: 30px;
  border: 1px solid var(--trip-line);
  background:
    radial-gradient(circle at top right, rgba(255, 56, 92, 0.10), transparent 28%),
    linear-gradient(180deg, rgba(255,255,255,0.99), rgba(255,247,249,0.96));
  box-shadow: 0 18px 34px var(--trip-shadow);
}
.hero-kicker {
  display: block;
  color: var(--trip-muted-soft);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.05em;
}
.hero-title {
  display: block;
  margin-top: 6px;
  color: var(--trip-ink);
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}
.hero-sub {
  display: block;
  margin-top: 10px;
  color: var(--trip-muted);
  font-size: 13px;
  line-height: 1.5;
}
.summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 0;
  padding: 12px;
  align-content: start;
  border-radius: 30px;
  border: 1px solid var(--trip-line);
  background: rgba(255,255,255,0.98);
  box-shadow: 0 14px 28px rgba(34, 34, 34, 0.06);
}
.summary-item {
  min-height: 68px;
  padding: 12px 10px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,250,250,0.96) 100%);
  border: 1px solid var(--trip-line);
  text-align: center;
}
.summary-item-wide {
  grid-column: 1 / -1;
}
.summary-value {
  display: block;
  color: var(--trip-accent);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
}
.summary-label {
  display: block;
  margin-top: 5px;
  color: var(--trip-muted);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.3;
}
.actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}
.action-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  min-height: 96px;
  padding: 16px;
  border-radius: 24px;
  border: 1px solid var(--trip-line);
  text-align: left;
  box-shadow: 0 14px 28px rgba(34, 34, 34, 0.06);
}
.action-main {
  background: linear-gradient(135deg, rgba(255,255,255,0.99) 0%, rgba(255,247,249,0.95) 100%);
}
.action-strong {
  background: linear-gradient(135deg, rgba(255,249,245,0.98) 0%, rgba(255,255,255,0.99) 100%);
}
.action-soft {
  background: linear-gradient(135deg, rgba(255,255,255,0.99) 0%, rgba(250,250,250,0.96) 100%);
}
.action-nav {
  background: var(--trip-accent);
  border-color: transparent;
  box-shadow: 0 18px 30px rgba(255, 56, 92, 0.18);
}
.action-share {
  background: linear-gradient(135deg, rgba(255,255,255,0.99) 0%, rgba(250,245,255,0.96) 100%);
}
.action-share .action-kicker { color: #8B5CF6; }
.action-share .action-title { color: #4C1D95; }
.action-share .action-desc { color: #7C6A9B; }
.action-nav[disabled] {
  opacity: 0.58;
}
.action-kicker {
  display: block;
  line-height: 1.1;
  font-size: 10px;
  font-weight: 700;
}
.action-main .action-kicker { color: var(--trip-accent); }
.action-strong .action-kicker,
.action-soft .action-kicker { color: var(--trip-muted-soft); }
.action-nav .action-kicker { color: rgba(255,255,255,0.78); }
.action-title {
  display: block;
  margin-top: 6px;
  line-height: 1.1;
  font-size: 18px;
  font-weight: 700;
}
.action-main .action-title,
.action-strong .action-title,
.action-soft .action-title { color: var(--trip-ink); }
.action-nav .action-title { color: #fff; }
.action-desc {
  display: block;
  margin-top: 6px;
  line-height: 1.4;
  font-size: 11px;
  font-weight: 600;
}
.action-main .action-desc,
.action-strong .action-desc,
.action-soft .action-desc { color: var(--trip-muted); }
.action-nav .action-desc { color: rgba(255,255,255,0.74); }
.empty {
  margin-top: 14px;
  padding: 26px 20px;
  text-align: center;
  border: 1px solid var(--trip-line);
  background: rgba(255,255,255,0.98);
}
.empty-title {
  display: block;
  color: var(--trip-ink);
  font-size: 18px;
  font-weight: 700;
}
.empty-desc {
  display: block;
  margin-top: 8px;
  color: var(--trip-muted);
  font-size: 13px;
  line-height: 1.65;
}
.route-section {
  margin-top: 14px;
  padding: 18px;
  border: 1px solid var(--trip-line);
  background: rgba(255,255,255,0.98);
}
.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.section-kicker {
  display: block;
  color: var(--trip-accent);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.05em;
}
.section-title {
  display: block;
  margin-top: 6px;
  color: var(--trip-ink);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.15;
}
.section-desc {
  display: block;
  margin-top: 5px;
  color: var(--trip-muted);
  font-size: 12px;
  line-height: 1.5;
}
.section-action {
  flex: none;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--trip-accent-soft);
  color: var(--trip-accent);
  font-size: 12px;
  font-weight: 700;
}
.route-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}
.nav-progress-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
  padding: 14px;
  border-radius: 22px;
  border: 1px solid rgba(255, 56, 92, 0.12);
  background:
    radial-gradient(circle at top right, rgba(255, 56, 92, 0.10), transparent 34%),
    linear-gradient(180deg, rgba(255,255,255,0.99), rgba(255,247,249,0.96));
}
.nav-progress-copy {
  min-width: 0;
}
.nav-progress-kicker {
  display: block;
  color: var(--trip-muted-soft);
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.04em;
}
.nav-progress-title {
  display: block;
  margin-top: 6px;
  color: var(--trip-ink);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.25;
}
.nav-progress-desc {
  display: block;
  margin-top: 6px;
  color: var(--trip-muted);
  font-size: 12px;
  line-height: 1.5;
}
.nav-progress-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.nav-progress-btn {
  min-height: 40px;
  border-radius: 16px;
  border: 1px solid var(--trip-line);
  background: rgba(255,255,255,0.95);
  color: var(--trip-ink);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
}
.nav-progress-btn-primary {
  border-color: transparent;
  background: var(--trip-accent);
  color: #fff;
  box-shadow: 0 14px 24px rgba(255, 56, 92, 0.18);
}
.nav-progress-btn[disabled] {
  opacity: 0.45;
}
.route-card {
  display: grid;
  grid-template-columns: 34px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--trip-line);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(250,250,250,0.96) 100%);
  box-shadow: 0 14px 24px rgba(34, 34, 34, 0.06);
}
.route-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 12px;
  background: var(--trip-accent);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
}
.route-main {
  min-width: 0;
}
.route-name {
  display: block;
  color: var(--trip-ink);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
}
.route-address {
  display: block;
  margin-top: 4px;
  color: var(--trip-muted);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
}
.route-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 7px;
}
.route-meta text {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--trip-accent-soft);
  color: var(--trip-accent);
  font-size: 11px;
  font-weight: 700;
}
.route-tools {
  display: grid;
  grid-template-columns: 48px;
  gap: 6px;
}
.tool-btn {
  min-height: 30px;
  border-radius: 14px;
  background: rgba(255,255,255,0.96);
  color: var(--trip-ink);
  border: 1px solid var(--trip-line);
  font-size: 11px;
  line-height: 1.2;
  font-weight: 700;
}
.tool-btn.danger {
  background: #FFF7F8;
  color: var(--trip-accent);
  border-color: rgba(255, 56, 92, 0.18);
}
.tool-btn[disabled] {
  opacity: 0.45;
}
@media (max-width: 430px) {
  .trip-page {
    padding-left: 10px;
    padding-right: 10px;
  }
  .trip-top {
    grid-template-columns: 1fr;
  }
  .summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .summary-item-wide {
    grid-column: auto;
  }
  .actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .nav-progress-actions {
    grid-template-columns: 1fr;
  }
  .route-card {
    grid-template-columns: 32px 1fr;
    align-items: flex-start;
  }
  .route-tools {
    grid-column: 1 / -1;
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 360px) {
  .hero-title {
    font-size: 24px;
  }
  .actions {
    grid-template-columns: 1fr;
  }
}
</style>
