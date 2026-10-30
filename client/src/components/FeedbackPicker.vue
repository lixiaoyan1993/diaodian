<template>
  <view class="feedback-panel dd-card">
    <view class="feedback-head">
      <text class="feedback-kicker">SPOT STATUS</text>
      <text class="feedback-title">这次现场情况怎么样</text>
      <text class="feedback-desc">选择一个最接近的状态，后面的钓友会更容易判断值不值得跑一趟。</text>
    </view>

    <view class="feedback-grid">
      <button
        v-for="f in feedbacks"
        :key="f.value"
        class="fb-btn"
        :class="{ active: selected === f.value }"
        @tap="select(f.value)"
      >
        <view class="fb-icon" :class="f.tone">
          <text class="fb-icon-mark">{{ f.mark }}</text>
        </view>
        <text class="fb-label">{{ f.value }}</text>
        <text class="fb-meta">{{ f.meta }}</text>
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
const props = defineProps<{ selected?: string }>();
const emit = defineEmits<{ select: [value: string] }>();

const feedbacks = [
  { value: '中鱼', mark: '中', meta: '有口有鱼', tone: 'good' },
  { value: '空军', mark: '空', meta: '暂时没口', tone: 'plain' },
  { value: '禁钓', mark: '禁', meta: '不建议前往', tone: 'danger' },
  { value: '位置不准', mark: '偏', meta: '需要修正点位', tone: 'warn' },
  { value: '有人管', mark: '管', meta: '现场有人管理', tone: 'warn' },
  { value: '挂底', mark: '挂', meta: '容易损耗装备', tone: 'danger' },
];

const select = (v: string) => emit('select', v);
</script>

<style scoped>
.feedback-panel {
  padding: 18px;
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(238, 250, 252, 0.92) 100%);
  border: 1px solid rgba(168, 211, 223, 0.84);
  box-shadow: 0 18px 34px rgba(14, 116, 144, 0.10);
}

.feedback-head {
  margin-bottom: 16px;
}

.feedback-kicker {
  display: block;
  color: #7A95A8;
  font-size: 11px;
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: 0.05em;
}

.feedback-title {
  display: block;
  margin-top: 8px;
  color: #16324F;
  font-size: 20px;
  font-weight: 950;
  line-height: 1.28;
}

.feedback-desc {
  display: block;
  margin-top: 6px;
  color: #6C8198;
  font-size: 12px;
  line-height: 1.6;
}

.feedback-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.fb-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  min-height: 116px;
  padding: 14px;
  border-radius: 22px;
  border: 1px solid rgba(168, 211, 223, 0.82);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.76);
  text-align: left;
}

.fb-btn.active {
  border-color: transparent;
  background: linear-gradient(135deg, rgba(15, 118, 110, 0.96) 0%, rgba(8, 145, 178, 0.96) 100%);
  box-shadow: 0 18px 28px rgba(14, 116, 144, 0.18);
}

.fb-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 16px;
  color: #fff;
  font-size: 18px;
  font-weight: 950;
}

.fb-icon.good { background: linear-gradient(135deg, #10B981 0%, #34D399 100%); }
.fb-icon.plain { background: linear-gradient(135deg, #06B6D4 0%, #0E7490 100%); }
.fb-icon.warn { background: linear-gradient(135deg, #F59E0B 0%, #F97316 100%); }
.fb-icon.danger { background: linear-gradient(135deg, #F97316 0%, #DC2626 100%); }

.fb-icon-mark {
  line-height: 1;
}

.fb-label {
  display: block;
  color: #16324F;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.2;
}

.fb-meta {
  display: block;
  color: #6C8198;
  font-size: 11px;
  line-height: 1.45;
}

.fb-btn.active .fb-label,
.fb-btn.active .fb-meta {
  color: #FFFFFF;
}

@media (max-width: 360px) {
  .feedback-panel {
    padding: 16px;
    border-radius: 24px;
  }

  .feedback-grid {
    gap: 10px;
  }

  .fb-btn {
    min-height: 108px;
    padding: 12px;
    border-radius: 18px;
  }

  .feedback-title {
    font-size: 18px;
  }
}
</style>
