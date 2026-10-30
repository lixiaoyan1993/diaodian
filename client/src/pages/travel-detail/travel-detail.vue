<template>
  <view class="dd-page detail-page">
    <view v-if="loading" class="dd-empty">正在加载分享内容...</view>
    <view v-else-if="!detail" class="dd-empty">这个出行分享可能已失效或被下架。</view>
    <view v-else class="detail-card dd-card">
      <view class="hero">
        <view class="tag-row">
          <text class="type-tag" :class="detail.travelType">{{ travelTypeLabel(detail.travelType) }}</text>
          <text class="hero-chip">{{ detail.memberCount }} 人已加入</text>
        </view>
        <text class="hero-title">{{ detail.spot.name }}</text>
        <text class="hero-sub">{{ formatDate(detail.departAt) }} · {{ detail.user.username }}</text>
      </view>

      <view class="overview-grid">
        <view class="overview-item">
          <text class="overview-label">出发地</text>
          <text class="overview-value">{{ detail.departurePlace || '未填写' }}</text>
        </view>
        <view class="overview-item">
          <text class="overview-label">有效期至</text>
          <text class="overview-value">{{ formatDate(detail.expiresAt) }}</text>
        </view>
        <view v-if="detail.travelType === 'carpool'" class="overview-item">
          <text class="overview-label">座位情况</text>
          <text class="overview-value">共 {{ detail.seatTotal || 0 }} 座，剩余 {{ detail.seatAvailable || 0 }} 座</text>
        </view>
        <view class="overview-item">
          <text class="overview-label">联系方式</text>
          <text class="overview-value">{{ detail.contact || detail.contactMasked }}</text>
        </view>
      </view>

      <view class="section detail-section">
        <text class="section-label">说明</text>
        <text class="section-value">{{ detail.description || '发布人还没有补充说明' }}</text>
      </view>
      <view class="section detail-section">
        <text class="section-label">钓点位置</text>
        <text class="section-value">{{ detail.spot.city || '' }}{{ detail.spot.district || '' }}{{ detail.spot.address || '' }}</text>
      </view>

      <view class="actions">
        <button v-if="canJoin" class="dd-primary-btn" @tap="joinTravel">申请加入</button>
        <button class="dd-secondary-btn" @tap="copyShareLink">复制分享链接</button>
        <button class="dd-secondary-btn" @tap="goTravel">回到行程页</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { travelApi, type TravelPostItem } from '@/api/travel';
import { useAuthStore } from '@/stores/auth';
import { sharePath, travelDetailShareTitle } from '@/utils/fish';

const auth = useAuthStore();
const loading = ref(false);
const detail = ref<TravelPostItem | null>(null);
const shareToken = ref('');

const canJoin = computed(() => {
  if (!detail.value) return false;
  const hasSeat = detail.value.seatAvailable == null || detail.value.seatAvailable > 0;
  return auth.isLoggedIn && !detail.value.isOwner && !detail.value.joined && detail.value.status === 'active' && hasSeat;
});

function formatDate(value: string) {
  return value ? value.replace('T', ' ').slice(0, 16) : '--';
}

function travelTypeLabel(value: TravelPostItem['travelType']) {
  if (value === 'find_car') return '找车';
  if (value === 'carpool') return '拼车';
  return '结伴';
}

function shareLink() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return detail.value ? `${origin}${detail.value.shareUrl}` : '';
}

async function loadDetail() {
  if (!shareToken.value) return;
  loading.value = true;
  try {
    const res = await travelApi.detailByShare(shareToken.value);
    detail.value = res.data || null;
  } catch (error: any) {
    uni.showToast({ title: error?.message || '加载失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}

async function joinTravel() {
  if (!detail.value) return;
  try {
    const res = await travelApi.join(detail.value.id);
    detail.value = res.data || null;
    uni.showToast({ title: '已申请加入', icon: 'none' });
  } catch (error: any) {
    uni.showToast({ title: error?.message || '加入失败', icon: 'none' });
  }
}

function copyShareLink() {
  const link = shareLink() || detail.value?.sharePath || '';
  uni.setClipboardData({
    data: link,
    success: () => uni.showToast({ title: '链接已复制', icon: 'none' }),
  });
}

function goTravel() {
  uni.switchTab({ url: '/pages/travel/travel' });
}

onShareAppMessage(() => ({
  title: travelDetailShareTitle(detail.value),
  path: detail.value?.sharePath || sharePath.travel,
}));

onLoad((query) => {
  shareToken.value = String(query?.share || '');
  loadDetail();
});
</script>

<style scoped>
.detail-page {
  --detail-ink: #222222;
  --detail-muted: #6A6A6A;
  --detail-muted-soft: #929292;
  --detail-accent: #FF385C;
  --detail-accent-soft: #FFF1F4;
  --detail-line: #EBEBEB;
  --detail-shadow: rgba(34, 34, 34, 0.08);
  max-width: 760px;
  padding-top: 16px;
  padding-bottom: 32px;
  background:
    radial-gradient(circle at 14% -8%, rgba(255, 56, 92, 0.08), transparent 24%),
    radial-gradient(circle at 86% 6%, rgba(255, 195, 167, 0.12), transparent 24%),
    linear-gradient(180deg, #FFFFFF 0%, #FCFCFC 44%, #F7F7F7 100%);
}
.detail-card {
  overflow: hidden;
  border-radius: 30px;
  padding: 16px;
  border: 1px solid var(--detail-line);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 34px var(--detail-shadow);
}
.hero {
  padding: 20px 18px;
  border-radius: 24px;
  border: 1px solid var(--detail-line);
  background:
    radial-gradient(circle at top right, rgba(255, 56, 92, 0.10), transparent 30%),
    linear-gradient(180deg, rgba(255,255,255,0.99), rgba(255,247,249,0.96));
}
.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.type-tag,
.hero-chip {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}
.type-tag {
  background: var(--detail-accent-soft);
  color: var(--detail-accent);
}
.type-tag.carpool {
  background: rgba(239, 246, 255, 0.98);
  color: #2563EB;
}
.type-tag.find_car {
  background: rgba(255, 247, 237, 0.98);
  color: #EA580C;
}
.hero-chip {
  background: rgba(255,255,255,0.96);
  border: 1px solid var(--detail-line);
  color: var(--detail-muted);
}
.hero-title {
  display: block;
  margin-top: 12px;
  color: var(--detail-ink);
  font-size: 24px;
  font-weight: 700;
  line-height: 1.18;
}
.hero-sub {
  display: block;
  margin-top: 6px;
  color: var(--detail-muted);
  font-size: 13px;
  line-height: 1.5;
}
.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  padding: 14px 0 0;
}
.overview-item {
  padding: 14px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(250,250,250,0.96) 100%);
  border: 1px solid var(--detail-line);
  box-shadow: 0 10px 18px rgba(34, 34, 34, 0.04);
}
.overview-label {
  display: block;
  color: var(--detail-muted);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
}
.overview-value {
  display: block;
  margin-top: 6px;
  color: var(--detail-ink);
  font-size: 14px;
  line-height: 1.5;
  font-weight: 700;
}
.section {
  padding: 16px 16px 0;
}
.detail-section {
  margin-top: 12px;
  border-radius: 22px;
  border: 1px solid var(--detail-line);
  background: linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(250,250,250,0.96) 100%);
  box-shadow: 0 12px 20px rgba(34, 34, 34, 0.05);
}
.section-label {
  display: block;
  color: var(--detail-muted);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.2;
}
.section-value {
  display: block;
  margin-top: 6px;
  padding-bottom: 16px;
  color: var(--detail-ink);
  font-size: 14px;
  line-height: 1.65;
  font-weight: 600;
  word-break: break-word;
}
.actions {
  display: grid;
  gap: 10px;
  padding: 18px 0 0;
  border-top: 1px solid rgba(255, 56, 92, 0.12);
  margin-top: 16px;
}
.actions .dd-primary-btn {
  background: var(--detail-accent);
  box-shadow: 0 18px 30px rgba(255, 56, 92, 0.20);
}
.actions .dd-secondary-btn {
  color: var(--detail-ink);
  border-color: var(--detail-line);
  background: rgba(255,255,255,0.96);
  box-shadow: 0 10px 20px rgba(34, 34, 34, 0.05);
}
@media (max-width: 360px) {
  .detail-page {
    padding-left: 10px;
    padding-right: 10px;
  }
  .detail-card {
    padding: 12px;
  }
  .hero {
    padding: 16px 14px;
  }
  .overview-grid {
    grid-template-columns: 1fr;
  }
  .hero-title {
    font-size: 21px;
  }
}
</style>
