<template>
  <view></view>
</template>

<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
onLaunch(() => { auth.loadSession(); });
</script>

<style lang="scss">
page {
  --dd-bg: #EAF7FB;
  --dd-bg-soft: #F5FBFD;
  --dd-surface: rgba(255, 255, 255, 0.94);
  --dd-surface-strong: #FFFFFF;
  --dd-border: rgba(155, 189, 210, 0.72);
  --dd-text: #16324F;
  --dd-text-soft: #6C8198;
  --dd-primary: #0F766E;
  --dd-primary-strong: #0891B2;
  --dd-accent: #10B981;
  --dd-orange: #F59E0B;
  --dd-shadow: 0 18px 40px rgba(21, 94, 117, 0.10);
  --dd-shadow-soft: 0 10px 24px rgba(21, 94, 117, 0.08);
  min-height: 100vh;
  width: 100%;
  min-width: 0;
  overflow-x: hidden;
  background-color: var(--dd-bg);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", sans-serif;
  color: var(--dd-text);
  font-size: 14px;
  line-height: 1.5;
}
html,
body {
  width: 100%;
  min-height: 100%;
  overflow-x: hidden;
  background:
    radial-gradient(circle at top left, rgba(186, 230, 253, 0.34), transparent 30%),
    radial-gradient(circle at top right, rgba(103, 232, 249, 0.18), transparent 32%),
    linear-gradient(180deg, #F6FCFE 0%, #EAF7FB 48%, #E4F3F9 100%);
  overscroll-behavior-x: none;
}
view,
text,
button,
input,
textarea,
scroll-view {
  box-sizing: border-box;
  min-width: 0;
}
text {
  overflow-wrap: break-word;
  word-break: normal;
  line-height: 1.45;
}
image {
  max-width: 100%;
}
button::after { border: none; }
button,
uni-button {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  margin: 0;
  padding: 0;
  line-height: 1.25;
  background: transparent;
  white-space: normal;
  word-break: break-word;
  overflow: visible;
}

.dd-page {
  width: 100%;
  max-width: 720px;
  min-height: 100vh;
  margin: 0 auto;
  padding: 18px 18px 32px;
  padding-left: max(18px, env(safe-area-inset-left));
  padding-right: max(18px, env(safe-area-inset-right));
  padding-bottom: max(32px, env(safe-area-inset-bottom));
}

.dd-head {
  margin-bottom: 14px;
  padding: 22px 20px;
  border-radius: 28px;
  background:
    linear-gradient(135deg, rgba(15, 118, 110, 0.98) 0%, rgba(8, 145, 178, 0.98) 100%);
  border: 1px solid rgba(255, 255, 255, 0.24);
  box-shadow: 0 24px 48px rgba(8, 145, 178, 0.16);
}

.dd-kicker {
  display: block;
  margin-bottom: 6px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.04em;
}

.dd-title {
  display: block;
  color: #FFFFFF;
  font-size: 28px;
  font-weight: 950;
  line-height: 1.2;
}

.dd-desc {
  display: block;
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 13px;
  line-height: 1.5;
}

.dd-card {
  border: 1px solid var(--dd-border);
  border-radius: 28px;
  background: var(--dd-surface);
  box-shadow: var(--dd-shadow-soft);
  backdrop-filter: blur(18px);
}

.dd-chip {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  margin: 0 !important;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid rgba(155, 189, 210, 0.72);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  color: var(--dd-text-soft);
  font-size: 13px;
  font-weight: 900;
  line-height: 1.2;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.74);
}

.dd-chip-active {
  border-color: transparent;
  background: linear-gradient(135deg, var(--dd-primary) 0%, var(--dd-primary-strong) 100%);
  color: #FFFFFF;
  box-shadow: 0 12px 24px rgba(8, 145, 178, 0.18);
}

.dd-primary-btn,
.dd-secondary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  border-radius: 18px;
  font-size: 15px;
  line-height: 1.2;
  font-weight: 950;
}

.dd-primary-btn {
  border: 0;
  background: linear-gradient(135deg, var(--dd-primary) 0%, var(--dd-primary-strong) 100%);
  color: #FFFFFF;
  box-shadow: 0 18px 30px rgba(8, 145, 178, 0.18);
}

.dd-secondary-btn {
  border: 1px solid rgba(155, 189, 210, 0.72);
  background: rgba(255, 255, 255, 0.86);
  color: var(--dd-text);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
}

.dd-field-label {
  display: block;
  margin-bottom: 6px;
  color: var(--dd-text-soft);
  font-size: 12px;
  font-weight: 800;
}

.dd-input {
  width: 100%;
  height: 48px;
  border: 1px solid rgba(155, 189, 210, 0.72);
  border-radius: 18px;
  padding: 0 14px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--dd-text);
  font-size: 14px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
}

.dd-empty {
  padding: 42px 20px;
  text-align: center;
  color: var(--dd-text-soft);
  font-size: 13px;
  line-height: 1.6;
}

@media (hover: hover) and (pointer: fine) {
  button,
  .dd-chip,
  .dd-card,
  .uni-tabbar__item {
    cursor: pointer;
  }

  .dd-card {
    transition: box-shadow 0.24s ease, transform 0.24s ease;
  }

  .dd-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 22px 34px rgba(21, 94, 117, 0.12);
  }

  .dd-primary-btn,
  .dd-secondary-btn,
  .dd-chip {
    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
  }

  .dd-primary-btn:hover,
  .dd-secondary-btn:hover,
  .dd-chip:hover {
    transform: translateY(-1px);
  }
}

/* #ifdef H5 */
uni-app.uni-app--showtabbar {
  --dd-h5-dock-space: 92px;
}

uni-page-head,
.uni-placeholder {
  display: none !important;
}

uni-page-wrapper {
  padding-top: 0 !important;
}

uni-page-body {
  min-height: 100dvh;
  background: transparent;
}

uni-app.uni-app--showtabbar .dd-page {
  padding-bottom: calc(var(--dd-h5-dock-space) + env(safe-area-inset-bottom));
}

uni-tabbar.uni-tabbar-bottom,
uni-tabbar.uni-tabbar-bottom .uni-tabbar {
  background: transparent !important;
}

uni-tabbar.uni-tabbar-bottom {
  position: fixed;
  left: 50%;
  bottom: max(12px, env(safe-area-inset-bottom));
  z-index: 80;
  width: min(680px, calc(100% - 24px));
  transform: translateX(-50%);
}

uni-tabbar.uni-tabbar-bottom .uni-tabbar {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  align-items: center;
  gap: 4px;
  padding: 8px;
  border: 1px solid rgba(155, 189, 210, 0.72);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.86) !important;
  backdrop-filter: blur(18px);
  box-shadow: 0 24px 44px rgba(21, 94, 117, 0.12);
}

uni-tabbar.uni-tabbar-bottom .uni-tabbar-border {
  display: none;
}

uni-tabbar.uni-tabbar-bottom .uni-tabbar__item {
  min-height: 58px;
  padding: 6px 2px;
  width: 100%;
  min-width: 0;
  border-radius: 20px;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

uni-tabbar.uni-tabbar-bottom .uni-tabbar__item:has(.uni-tabbar__label[style*="232, 106, 62"]) {
  background: linear-gradient(180deg, rgba(14, 116, 144, 0.12), rgba(16, 185, 129, 0.06));
  box-shadow: inset 0 0 0 1px rgba(14, 116, 144, 0.12);
}

uni-tabbar.uni-tabbar-bottom .uni-tabbar__bd {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-wrap: nowrap;
  width: 100%;
  min-width: 0;
  text-align: center;
}

uni-tabbar.uni-tabbar-bottom .uni-tabbar__icon {
  margin-bottom: 1px;
  flex: none;
}

uni-tabbar.uni-tabbar-bottom .uni-tabbar__label {
  display: block;
  width: 100%;
  min-width: 0;
  margin-top: 3px !important;
  font-size: 10px !important;
  font-weight: 800;
  line-height: 1 !important;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap !important;
  word-break: keep-all !important;
}

@media (max-width: 430px) {
  uni-app.uni-app--showtabbar {
    --dd-h5-dock-space: 86px;
  }

  .dd-page {
    padding-top: 14px;
    padding-left: max(14px, env(safe-area-inset-left));
    padding-right: max(14px, env(safe-area-inset-right));
  }

  uni-tabbar.uni-tabbar-bottom {
    width: calc(100% - 16px);
    bottom: max(8px, env(safe-area-inset-bottom));
  }

  uni-tabbar.uni-tabbar-bottom .uni-tabbar {
    gap: 3px;
    padding: 6px;
    border-radius: 22px;
  }

  uni-tabbar.uni-tabbar-bottom .uni-tabbar__item {
    min-height: 52px;
    padding: 5px 1px;
    border-radius: 14px;
  }

  uni-tabbar.uni-tabbar-bottom .uni-tabbar__label {
    font-size: 9px !important;
  }
}
/* #endif */

/* ---- page transitions ---- */
.uni-page-wrapper {
  animation: fadeSlideIn 0.3s ease-out;
}

@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* card hover for desktop */
@media (hover: hover) and (pointer: fine) {
  .dd-card {
    transition: box-shadow 0.24s ease, transform 0.24s ease, border-color 0.24s ease;
  }

  .dd-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 14px 30px rgba(11, 92, 74, 0.10);
    border-color: #C8DFD4;
  }
}
</style>
