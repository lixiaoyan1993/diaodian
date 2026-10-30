<template>
  <view class="my-page dd-page">
    <view class="profile-card dd-card">
      <view class="avatar">
        <image v-if="auth.user?.avatar" class="avatar-image" :src="auth.user.avatar" mode="aspectFill" />
        <text v-else>{{ (auth.username || '?').charAt(0) }}</text>
      </view>
      <view class="profile-info">
        <text class="nickname">{{ auth.username || '未登录' }}</text>
        <text class="sub">{{ stats.total }}个标点 · {{ stats.fav }}收藏</text>
      </view>
    </view>

    <view class="menu dd-card">
      <view class="menu-item" @tap="goLibrary">
        <view class="menu-left"><text class="menu-mark">点</text><text>我的点库</text></view><text class="arrow">›</text>
      </view>
      <view class="menu-item" @tap="goFavorites">
        <view class="menu-left"><text class="menu-mark favor">藏</text><text>我的收藏</text></view><text class="arrow">›</text>
      </view>
      <view class="menu-item" @tap="goCatches">
        <view class="menu-left"><text class="menu-mark">鱼</text><text>我的渔获</text></view><text class="arrow">›</text>
      </view>
      <view class="menu-item" @tap="goMyVerifications">
        <view class="menu-left"><text class="menu-mark verify">验</text><text>我的验点</text></view><text class="arrow">›</text>
      </view>
      <view class="menu-item" @tap="goFeedback">
        <view class="menu-left"><text class="menu-mark feedback">馈</text><text>意见反馈</text></view><text class="arrow">›</text>
      </view>
      <view v-if="auth.isAdmin" class="menu-item" @tap="goAdmin">
        <view class="menu-left"><text class="menu-mark admin">管</text><text>管理后台</text></view><text class="arrow">›</text>
      </view>
    </view>

    <!-- #ifdef MP-WEIXIN -->
    <button class="share-app-btn dd-secondary-btn" open-type="share">分享小程序给钓友</button>
    <!-- #endif -->
    <!-- #ifndef MP-WEIXIN -->
    <button class="share-app-btn dd-secondary-btn" @tap="copyAppShareLink">分享小程序给钓友</button>
    <!-- #endif -->
    <button v-if="auth.isLoggedIn" class="logout-btn dd-secondary-btn" @tap="auth.logout()">退出登录</button>
    <button v-else class="login-btn dd-primary-btn" @tap="uni.navigateTo({ url: '/pages/login/login' })">登录 / 注册</button>

    <button class="report-fixed-btn" @tap="openIllegalFishingReport">
      <text class="report-fixed-title">举报违法捕捞</text>
      <text class="report-fixed-sub">电鱼 / 网鱼 / 毒鱼</text>
    </button>

    <view v-if="reportSheetOpen" class="report-mask" @tap="closeIllegalFishingReport">
      <view class="report-sheet dd-card" @tap.stop>
        <view class="report-sheet-head">
          <view>
            <text class="report-kicker">违规捕捞举报</text>
            <text class="report-title">报警时先报清位置</text>
          </view>
          <button class="report-close" @tap="closeIllegalFishingReport">关闭</button>
        </view>
        <text class="report-warning">先保证自身安全，不要现场冲突。看到电鱼、网鱼、毒鱼、炸鱼等行为，可复制描述后报警。</text>
        <view class="report-location">
          <text class="report-location-label">{{ reportLocationTitle }}</text>
          <text class="report-location-text">{{ reportCoordText }}</text>
        </view>
        <view class="report-actions">
          <button class="report-action report-action-primary" @tap="copyIllegalFishingReport">复制报警描述</button>
          <button class="report-action report-action-danger" @tap="callPolice">拨打 110</button>
        </view>
        <button class="report-refresh" @tap="refreshReportLocation">{{ reportLocating ? '定位中...' : '刷新当前位置' }}</button>
        <view class="report-contact-block">
          <text class="report-contact-title">举报转接电话</text>
          <button
            v-for="item in reportContacts"
            :key="item.id"
            class="report-contact"
            @tap="callPhone(item.phone)"
          >
            <view class="report-contact-main">
              <text class="report-contact-name">{{ item.label }}</text>
              <text class="report-contact-desc">{{ item.description }}</text>
            </view>
            <text class="report-contact-phone">{{ item.phone }}</text>
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { onShareAppMessage, onShow } from '@dcloudio/uni-app';
import { useAuthStore } from '@/stores/auth';
import { favoriteApi, spotApi } from '@/api/spots';
import { absoluteShareLink, shareCopy, sharePath } from '@/utils/fish';
import { buildFisheryReportText, getFisheryContacts } from '@/utils/fishery-contacts';

const auth = useAuthStore();
const stats = ref({ total: 0, fav: 0, verified: 0 });
const reportSheetOpen = ref(false);
const reportLocating = ref(false);
const reportLocation = ref<{ lat: number; lng: number } | null>(null);

const reportLocationTitle = computed(() => (
  reportLocation.value ? '我的当前位置' : '位置待确认'
));
const reportCoordText = computed(() => {
  if (!reportLocation.value) return '可以先刷新当前位置，或复制后手动补充详细地址。';
  return `坐标：${reportLocation.value.lat.toFixed(6)}, ${reportLocation.value.lng.toFixed(6)}`;
});
const reportContacts = computed(() => getFisheryContacts({}));
const illegalFishingReportText = computed(() => buildFisheryReportText({
  name: reportLocationTitle.value,
  latitude: reportLocation.value?.lat,
  longitude: reportLocation.value?.lng,
}));

async function loadStats() {
  if (!auth.isLoggedIn) {
    stats.value = { total: 0, fav: 0, verified: 0 };
    return;
  }
  await auth.fetchProfile();
  try {
    const [spotRes, favRes, verifyRes] = await Promise.all([
      spotApi.list({ pageSize: '1' }),
      favoriteApi.list(1, 1),
      spotApi.myVerifications(1, 1),
    ]);
    stats.value = {
      ...stats.value,
      total: spotRes.data?.total || 0,
      fav: favRes.data?.total || 0,
      verified: verifyRes.data?.total || 0,
    };
  } catch { /* ignore */ }
}

function goLibrary() {
  if (!auth.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  uni.navigateTo({ url: '/pages/library/library' });
}

function goFavorites() {
  if (!auth.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  uni.navigateTo({ url: '/pages/favorites/favorites' });
}

function goCatches() {
  uni.switchTab({ url: '/pages/catches/catches' });
}

function goFeedback() {
  if (!auth.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  uni.navigateTo({ url: '/pages/feedback/feedback' });
}

function goMyVerifications() {
  if (!auth.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  uni.navigateTo({ url: '/pages/my-verifications/my-verifications' });
}
function goAdmin() {
  // #ifdef H5
  const fallback = 'http://127.0.0.1:3777/admin/';
  fetch('/admin/', { method: 'HEAD' })
    .then((res) => {
      window.location.href = res.ok ? '/admin/' : fallback;
    })
    .catch(() => {
      window.location.href = fallback;
    });
  // #endif
  // #ifndef H5
  uni.showToast({ title: '请在浏览器中打开管理后台', icon: 'none' });
  // #endif
}

function copyAppShareLink() {
  uni.setClipboardData({
    data: absoluteShareLink(sharePath.app),
    success: () => uni.showToast({ title: '小程序入口链接已复制', icon: 'none' }),
  });
}

function openIllegalFishingReport() {
  reportSheetOpen.value = true;
  if (!reportLocation.value) {
    refreshReportLocation(false);
  }
}

function closeIllegalFishingReport() {
  reportSheetOpen.value = false;
}

function refreshReportLocation(showToast = true) {
  if (reportLocating.value) return;
  reportLocating.value = true;
  uni.getLocation({
    type: 'gcj02',
    success: (res) => {
      reportLocation.value = { lat: res.latitude, lng: res.longitude };
      if (showToast) {
        uni.showToast({ title: '位置已更新', icon: 'none' });
      }
    },
    fail: () => {
      if (showToast) {
        uni.showToast({ title: '定位失败，请手动说明位置', icon: 'none' });
      }
    },
    complete: () => {
      reportLocating.value = false;
    },
  });
}

function copyIllegalFishingReport() {
  uni.setClipboardData({
    data: illegalFishingReportText.value,
    success: () => uni.showToast({ title: '报警描述已复制', icon: 'none' }),
  });
}

function callPhone(phone: string) {
  const phoneNumber = String(phone || '').trim();
  if (!phoneNumber) return;
  uni.makePhoneCall({
    phoneNumber,
    fail: () => uni.showToast({ title: '当前环境无法拨号', icon: 'none' }),
  });
}

function callPolice() {
  callPhone('110');
}

onShareAppMessage(() => ({
  title: shareCopy.appTitle,
  path: sharePath.app,
}));

onMounted(() => { loadStats(); });
onShow(() => { loadStats(); });
</script>

<style scoped>
.my-page {
  --my-ink: #222222;
  --my-muted: #6A6A6A;
  --my-muted-soft: #929292;
  --my-accent: #FF385C;
  --my-accent-soft: #FFF1F4;
  --my-line: #EBEBEB;
  --my-shadow: rgba(34, 34, 34, 0.08);
  max-width: 760px;
  padding-top: 12px;
  padding-bottom: calc(112px + env(safe-area-inset-bottom));
  background:
    radial-gradient(circle at 14% -8%, rgba(255, 56, 92, 0.08), transparent 24%),
    radial-gradient(circle at 86% 6%, rgba(255, 195, 167, 0.12), transparent 24%),
    linear-gradient(180deg, #FFFFFF 0%, #FCFCFC 44%, #F7F7F7 100%);
}
.profile-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px;
  border-radius: 30px;
  border: 1px solid var(--my-line);
  background:
    radial-gradient(circle at top right, rgba(255, 56, 92, 0.10), transparent 28%),
    linear-gradient(180deg, rgba(255,255,255,0.99), rgba(255,247,249,0.96));
  box-shadow: 0 18px 34px var(--my-shadow);
}
.avatar {
  width: 62px;
  height: 62px;
  border-radius: 22px;
  background: var(--my-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  box-shadow: 0 14px 24px rgba(255, 56, 92, 0.18);
  overflow: hidden;
}
.avatar-image {
  display: block;
  width: 100%;
  height: 100%;
}
.profile-info { flex: 1; min-width: 0; }
.nickname {
  font-size: 22px;
  line-height: 1.2;
  font-weight: 700;
  color: var(--my-ink);
  display: block;
}
.sub {
  font-size: 13px;
  line-height: 1.45;
  color: var(--my-muted);
  margin-top: 6px;
  display: block;
}
.menu {
  margin-top: 18px;
  overflow: hidden;
  border-radius: 30px;
  border: 1px solid var(--my-line);
  background: rgba(255,255,255,0.98);
  box-shadow: 0 14px 28px rgba(34, 34, 34, 0.06);
}
.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px;
  border-bottom: 1px solid var(--my-line);
  font-size: 15px;
  line-height: 1.3;
  font-weight: 700;
  color: var(--my-ink);
}
.menu-item:last-child { border-bottom: 0; }
.menu-left { display: flex; align-items: center; gap: 12px; }
.menu-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  min-height: 34px;
  border-radius: 12px;
  background: var(--my-accent);
  color: #fff;
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
  box-shadow: 0 10px 18px rgba(255, 56, 92, 0.16);
}
.menu-mark.favor { background: #FF6B6B; }
.menu-mark.verify { background: #2563EB; }
.menu-mark.feedback { background: #F59E0B; }
.menu-mark.admin { background: #111827; }
.arrow {
  color: var(--my-muted-soft);
  font-size: 20px;
}
.share-app-btn,
.logout-btn,
.login-btn {
  width: 100%;
  margin-top: 20px;
}
.share-app-btn {
  color: var(--my-accent);
  border-color: var(--my-line);
  background: rgba(255,255,255,0.96);
  box-shadow: 0 10px 20px rgba(34, 34, 34, 0.05);
}
.logout-btn {
  color: var(--my-ink);
  border-color: var(--my-line);
  background: rgba(255,255,255,0.96);
  box-shadow: 0 10px 20px rgba(34, 34, 34, 0.05);
}
.login-btn {
  background: var(--my-accent);
  box-shadow: 0 18px 30px rgba(255, 56, 92, 0.20);
}
.report-fixed-btn {
  position: fixed;
  left: max(18px, env(safe-area-inset-left));
  right: max(18px, env(safe-area-inset-right));
  bottom: calc(var(--dd-h5-dock-space, 88px) + env(safe-area-inset-bottom) + 10px);
  z-index: 50;
  min-height: 56px;
  border-radius: 24px;
  background: #DC2626;
  color: #FFFFFF;
  box-shadow: 0 18px 34px rgba(220, 38, 38, 0.24);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  padding: 8px 18px;
}
.report-fixed-title {
  display: block;
  color: #FFFFFF;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.15;
}
.report-fixed-sub {
  display: block;
  margin-top: 4px;
  color: rgba(255,255,255,0.78);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.1;
}
.report-mask {
  position: fixed;
  inset: 0;
  z-index: 90;
  padding: 12px;
  background: rgba(0, 0, 0, 0.28);
  display: flex;
  align-items: flex-end;
}
.report-sheet {
  width: 100%;
  max-width: 720px;
  max-height: calc(100vh - 36px);
  margin: 0 auto;
  padding: 16px;
  overflow-y: auto;
  border-radius: 26px;
  border: 1px solid rgba(235, 235, 235, 0.96);
  background: #FFFFFF;
  box-shadow: 0 22px 44px rgba(34, 34, 34, 0.18);
}
.report-sheet-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.report-kicker {
  display: block;
  color: #DC2626;
  font-size: 11px;
  font-weight: 900;
  line-height: 1.2;
}
.report-title {
  display: block;
  margin-top: 5px;
  color: var(--my-ink);
  font-size: 18px;
  font-weight: 950;
  line-height: 1.2;
}
.report-close {
  flex: none;
  min-width: 54px;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: #F7F7F7;
  color: var(--my-muted);
  font-size: 11px;
  font-weight: 800;
}
.report-warning {
  display: block;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 16px;
  background: rgba(220, 38, 38, 0.06);
  color: #7F1D1D;
  font-size: 12px;
  line-height: 1.55;
  font-weight: 700;
}
.report-location {
  margin-top: 10px;
  padding: 12px;
  border-radius: 18px;
  border: 1px solid #F1F1F1;
  background: #FAFAFA;
}
.report-location-label {
  display: block;
  color: var(--my-ink);
  font-size: 14px;
  font-weight: 900;
  line-height: 1.25;
}
.report-location-text {
  display: block;
  margin-top: 5px;
  color: var(--my-muted);
  font-size: 11px;
  line-height: 1.45;
}
.report-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}
.report-action,
.report-refresh {
  min-width: 0;
  min-height: 40px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.1;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  word-break: keep-all;
  overflow: hidden;
}
.report-action {
  flex: 1;
}
.report-action-primary {
  background: var(--my-ink);
  color: #FFFFFF;
}
.report-action-danger {
  background: #DC2626;
  color: #FFFFFF;
}
.report-refresh {
  width: 100%;
  margin-top: 8px;
  background: #FFF1F4;
  color: #DC2626;
}
.report-contact-block {
  margin-top: 12px;
}
.report-contact-title {
  display: block;
  margin-bottom: 8px;
  color: var(--my-ink);
  font-size: 13px;
  font-weight: 900;
  line-height: 1.25;
}
.report-contact {
  width: 100%;
  min-height: 48px;
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 16px;
  border: 1px solid #F1F1F1;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  text-align: left;
}
.report-contact-main {
  flex: 1;
  min-width: 0;
}
.report-contact-name {
  display: block;
  color: var(--my-ink);
  font-size: 12px;
  font-weight: 900;
  line-height: 1.3;
}
.report-contact-desc {
  display: block;
  margin-top: 4px;
  color: #8A8A8A;
  font-size: 10px;
  line-height: 1.35;
}
.report-contact-phone {
  flex: none;
  min-width: 60px;
  color: #DC2626;
  font-size: 13px;
  font-weight: 950;
  line-height: 1.2;
  text-align: right;
}

@media (max-width: 360px) {
  .profile-card {
    padding: 14px;
  }

  .avatar {
    width: 52px;
    height: 52px;
  }

  .menu-item {
    padding: 14px 12px;
  }

  .report-fixed-btn {
    left: 12px;
    right: 12px;
  }
}
</style>
