<template>
  <view class="feedback-page dd-page">
    <view class="dd-head">
      <text class="dd-kicker">FEEDBACK</text>
      <text class="dd-title">意见反馈</text>
      <text class="dd-desc">告诉我们你遇到的问题和想要的功能，我们会持续优化。</text>
    </view>

    <view class="form-card dd-card">
      <view class="field">
        <text class="dd-field-label">反馈类型</text>
        <view class="type-grid">
          <button
            v-for="item in feedbackTypes"
            :key="item"
            class="type-btn"
            :class="{ active: type === item }"
            @tap="type = item"
          >
            {{ item }}
          </button>
        </view>
      </view>

      <view class="field">
        <view class="field-head">
          <text class="dd-field-label">反馈内容</text>
          <text class="count">{{ content.length }}/500</text>
        </view>
        <textarea
          v-model="content"
          class="textarea"
          maxlength="500"
          placeholder="请尽量描述清楚：在哪个页面、做了什么、出现了什么问题。"
        />
      </view>

      <view class="field">
        <view class="field-head">
          <text class="dd-field-label">联系方式（选填）</text>
          <text class="assist-chip">选填</text>
        </view>
        <input
          v-model="contact"
          class="contact-input"
          maxlength="100"
          placeholder="微信号 / 手机号 / 邮箱，便于我们联系你"
        />
      </view>
    </view>

    <button class="submit-btn dd-primary-btn" :disabled="submitting" @tap="submit">
      {{ submitting ? '提交中…' : '提交反馈' }}
    </button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { feedbackApi, type FeedbackType } from '@/api/feedback';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

const feedbackTypes: FeedbackType[] = ['功能建议', '问题反馈', '体验吐槽', '其他'];
const type = ref<FeedbackType>('功能建议');
const content = ref('');
const contact = ref('');
const submitting = ref(false);

async function submit() {
  if (!auth.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  if (!content.value.trim()) {
    uni.showToast({ title: '请填写反馈内容', icon: 'none' });
    return;
  }

  submitting.value = true;
  try {
    await feedbackApi.create({
      type: type.value,
      content: content.value.trim(),
      contact: contact.value.trim(),
    });
    uni.showToast({ title: '提交成功，感谢反馈', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 1200);
  } catch (e: any) {
    uni.showToast({ title: e?.message || '提交失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.feedback-page {
  padding-bottom: 32px;
}
.form-card {
  margin-top: 14px;
  padding: 16px;
}
.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}
.type-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.type-btn {
  height: 44px;
  border: 1px solid rgba(155, 189, 210, 0.72);
  border-radius: 18px;
  background: rgba(255,255,255,0.84);
  color: #6C8198;
  font-size: 14px;
  font-weight: 900;
  padding: 0;
}
.type-btn.active {
  border-color: transparent;
  background: linear-gradient(135deg, #0F766E 0%, #0891B2 100%);
  color: #FFFFFF;
}
.textarea {
  width: 100%;
  min-height: 132px;
  border: 1px solid rgba(155, 189, 210, 0.72);
  border-radius: 20px;
  padding: 14px;
  font-size: 14px;
  line-height: 1.6;
  background: rgba(255,255,255,0.88);
  color: #16324F;
}
.count {
  display: block;
  font-size: 12px;
  color: #6C8198;
}
.assist-chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(8,145,178,0.10);
  color: #0E7490;
  font-size: 11px;
  font-weight: 900;
}
.contact-input {
  height: 46px;
  border: 1px solid rgba(155, 189, 210, 0.72);
  border-radius: 18px;
  padding: 0 14px;
  background: rgba(255,255,255,0.88);
  font-size: 14px;
  color: #16324F;
}
.submit-btn {
  width: 100%;
  margin-top: 18px;
}
.submit-btn[disabled] {
  opacity: 0.55;
}
</style>
