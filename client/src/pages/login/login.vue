<template>
  <view class="login-page dd-page">
    <view class="hero dd-card">
      <text class="hero-kicker">微信快速登录</text>
      <text class="hero-title">登录后开始记点</text>
      <text class="hero-sub">使用微信登录凭证完成登录，昵称会作为你的用户名展示，进入后就能收藏、记点、记录渔获。</text>
    </view>

    <!-- #ifdef MP-WEIXIN -->
    <view class="login-card dd-card">
      <view class="wechat-badge">
        <text class="wechat-badge-dot"></text>
        <text class="wechat-badge-text">微信小程序</text>
      </view>

      <view class="profile-sync-card">
        <view class="profile-form">
          <text class="profile-form-label">昵称</text>
          <input
            v-model="wechatNickname"
            class="nickname-input"
            type="nickname"
            maxlength="30"
            placeholder="请输入昵称"
          />
          <text class="profile-form-hint">该昵称将作为你的 username 展示。</text>
        </view>
      </view>

      <view class="benefits">
        <view class="benefit-item">
          <text class="benefit-label">一键授权</text>
          <text class="benefit-value">自动获取微信登录凭证</text>
        </view>
        <view class="benefit-item">
          <text class="benefit-label">昵称展示</text>
          <text class="benefit-value">只使用昵称作为 username，不再要求头像</text>
        </view>
        <view class="benefit-item">
          <text class="benefit-label">登录后可用</text>
          <text class="benefit-value">收藏标点、记录渔获、管理个人内容</text>
        </view>
      </view>

      <button class="wechat-login-btn dd-primary-btn" @tap="handleWechatLogin" :disabled="logging">
        {{ logging ? '登录中...' : '微信一键登录' }}
      </button>
      <text class="login-hint">点击后会使用微信登录凭证完成登录，昵称只用于生成当前账号的 username。</text>
      <text class="domain-hint">如果真机登录失败，请确认后端接口域名已加入微信小程序 request 合法域名。</text>
    </view>
    <!-- #endif -->

    <!-- #ifndef MP-WEIXIN -->
    <view class="login-card dd-card">
      <text class="fallback-title">当前页面已切换为微信小程序登录模式</text>
      <text class="fallback-desc">请在微信小程序环境中打开，以完成一键登录和昵称同步。</text>
    </view>
    <!-- #endif -->
  </view>
</template>

<script setup lang="ts">
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/auth';
import { onMounted, ref } from 'vue';

const auth = useAuthStore();
const logging = ref(false);
const wechatNickname = ref('');

function uniLogin(provider: string) {
  return new Promise<UniApp.LoginRes>((resolve, reject) => {
    uni.login({
      provider,
      success: resolve,
      fail: reject,
    });
  });
}

async function handleWechatLogin() {
  // #ifndef MP-WEIXIN
  uni.showToast({ title: '请在微信小程序中使用', icon: 'none' });
  return;
  // #endif

  // #ifdef MP-WEIXIN
  if (logging.value) return;
  logging.value = true;
  try {
    const loginRes = await uniLogin('weixin');
    const code = loginRes.code;
    if (!code) throw new Error('没有获取到微信登录凭证');
    if (!wechatNickname.value.trim()) {
      throw new Error('请先填写昵称');
    }

    const res = await authApi.miniappLogin({
      code,
      platform: 'wechat',
      username: wechatNickname.value.trim(),
    });

    if (res.data) {
      auth.setSession(res.data.user as any, res.data.token);
      uni.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => uni.switchTab({ url: '/pages/hall/hall' }), 400);
    }
  } catch (e: any) {
    uni.showToast({ title: e?.message || '微信登录失败', icon: 'none' });
  } finally {
    logging.value = false;
  }
  // #endif
}

onMounted(() => {
  wechatNickname.value = String(auth.user?.username || '').trim();
});
</script>

<style scoped>
.login-page {
  --login-ink: #222222;
  --login-muted: #6A6A6A;
  --login-muted-soft: #929292;
  --login-accent: #FF385C;
  --login-accent-soft: #FFF1F4;
  --login-line: #EBEBEB;
  --login-shadow: rgba(34, 34, 34, 0.08);
  max-width: 760px;
  min-height: 100vh;
  padding-top: 20px;
  padding-bottom: 36px;
  background:
    radial-gradient(circle at 14% -8%, rgba(255, 56, 92, 0.08), transparent 24%),
    radial-gradient(circle at 86% 6%, rgba(255, 195, 167, 0.12), transparent 24%),
    linear-gradient(180deg, #FFFFFF 0%, #FCFCFC 44%, #F7F7F7 100%);
}
.hero {
  padding: 22px 18px;
  border-radius: 30px;
  border: 1px solid var(--login-line);
  background:
    radial-gradient(circle at top right, rgba(255, 56, 92, 0.10), transparent 28%),
    linear-gradient(180deg, rgba(255,255,255,0.99), rgba(255,247,249,0.96));
  box-shadow: 0 18px 34px var(--login-shadow);
}
.hero-kicker {
  display: block;
  color: var(--login-muted-soft);
  font-size: 10px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: 0.05em;
}
.hero-title {
  display: block;
  margin-top: 8px;
  color: var(--login-ink);
  font-size: 28px;
  line-height: 1.05;
  font-weight: 700;
}
.hero-sub {
  display: block;
  margin-top: 10px;
  color: var(--login-muted);
  font-size: 13px;
  line-height: 1.6;
}
.login-card {
  margin-top: 16px;
  padding: 18px;
  border-radius: 30px;
  border: 1px solid var(--login-line);
  background: rgba(255,255,255,0.98);
  box-shadow: 0 16px 28px rgba(34, 34, 34, 0.06);
}
.wechat-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(7, 193, 96, 0.10);
  color: #067647;
  font-size: 12px;
  font-weight: 700;
}
.wechat-badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #07C160;
}
.wechat-badge-text {
  line-height: 1;
}
.profile-sync-card {
  margin-top: 16px;
  padding: 14px;
  border-radius: 22px;
  border: 1px solid var(--login-line);
  background: linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(250,250,250,0.96) 100%);
}
.profile-form {
  min-width: 0;
}
.profile-form-label {
  display: block;
  color: var(--login-muted);
  font-size: 11px;
  font-weight: 700;
  line-height: 1.2;
}
.nickname-input {
  width: 100%;
  height: 44px;
  margin-top: 8px;
  padding: 0 14px;
  border-radius: 16px;
  border: 1px solid var(--login-line);
  background: #FFFFFF;
  color: var(--login-ink);
  font-size: 14px;
}
.profile-form-hint {
  display: block;
  margin-top: 8px;
  color: var(--login-muted-soft);
  font-size: 11px;
  line-height: 1.45;
}
.benefits {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}
.benefit-item {
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--login-line);
  background: linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(250,250,250,0.96) 100%);
}
.benefit-label {
  display: block;
  color: var(--login-muted);
  font-size: 11px;
  line-height: 1.2;
  font-weight: 700;
}
.benefit-value {
  display: block;
  margin-top: 6px;
  color: var(--login-ink);
  font-size: 14px;
  line-height: 1.5;
  font-weight: 700;
}
.wechat-login-btn {
  width: 100%;
  margin-top: 18px;
  background: var(--login-accent);
  box-shadow: 0 18px 30px rgba(255, 56, 92, 0.20);
}
.wechat-login-btn[disabled] {
  opacity: 0.62;
}
.login-hint,
.domain-hint,
.fallback-title,
.fallback-desc {
  display: block;
}
.login-hint {
  margin-top: 12px;
  color: var(--login-muted);
  font-size: 12px;
  line-height: 1.55;
}
.domain-hint {
  margin-top: 8px;
  color: var(--login-muted-soft);
  font-size: 11px;
  line-height: 1.5;
}
.fallback-title {
  color: var(--login-ink);
  font-size: 18px;
  line-height: 1.25;
  font-weight: 700;
}
.fallback-desc {
  margin-top: 8px;
  color: var(--login-muted);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 380px) {
  .login-page {
    padding-top: 14px;
  }

  .hero,
  .login-card {
    padding: 16px 14px;
  }

  .hero-title {
    font-size: 24px;
  }
}
</style>
