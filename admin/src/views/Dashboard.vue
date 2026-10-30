<template>
  <div>
    <h2 class="page-title">仪表盘</h2>
    <el-row :gutter="20">
      <el-col :span="6" v-for="card in cards" :key="card.label">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-value">{{ card.value }}</div>
            <div class="stat-label">{{ card.label }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { adminApi } from '@/api';

const cards = ref([
  { label: '总用户', value: 0, key: 'userCount' },
  { label: '总标点', value: 0, key: 'spotCount' },
  { label: '待审核', value: 0, key: 'pendingCount' },
  { label: '验点记录', value: 0, key: 'verificationCount' },
]);

onMounted(async () => {
  try {
    const res = await adminApi.stats();
    const data = res.data as any;
    if (data?.data) {
      cards.value.forEach(c => { c.value = data.data[c.key] || 0; });
    }
  } catch {
    // The request interceptor already shows the error.
  }
});
</script>

<style scoped>
.page-title { margin: 0 0 20px; color: #15211D; }
.stat-card { text-align: center; padding: 8px 0; }
.stat-value { font-size: 36px; font-weight: 950; color: #C95F32; }
.stat-label { font-size: 14px; color: #64716B; margin-top: 8px; }
</style>
