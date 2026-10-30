<template>
  <view class="style-tags">
    <text
      v-for="item in styles"
      :key="item"
      :class="['style-tag', item === '台钓' ? 'bait' : 'lure']"
    >{{ item }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ kind: string }>();
const styles = computed(() => props.kind.split(',').map(s => s.trim()).filter(Boolean));
</script>

<style scoped>
.style-tags {
  display: inline-flex;
  gap: 4px;
}
.style-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 900;
  color: #fff;
  box-shadow: 0 10px 18px rgba(14, 116, 144, 0.16);
}
.lure { background: linear-gradient(135deg, #0F766E 0%, #0891B2 100%); }
.bait { background: linear-gradient(135deg, #06B6D4 0%, #0E7490 100%); }
</style>
