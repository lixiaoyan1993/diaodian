<template>
  <div v-if="spot">
    <el-button class="back-btn" @click="router.back()">返回</el-button>
    <el-card>
      <div class="head">
        <div>
          <h2>{{ spot.name }}</h2>
          <p>
            <el-tag
              v-for="s in (spot.style || '').split(',').map((s: string) => s.trim()).filter(Boolean)"
              :key="s"
              :type="s === '路亚' ? 'danger' : 'success'"
              size="small"
              class="spot-tag"
            >{{ s }}</el-tag>
            {{ spot.species || '未填鱼种' }} · {{ spot.score }}分
          </p>
        </div>
        <el-tag :type="statusType(spot.status)" size="large">{{ statusLabel(spot.status) }}</el-tag>
      </div>
      <el-descriptions :column="2" border class="descriptions">
        <el-descriptions-item label="创建者">{{ spot.user?.username }}</el-descriptions-item>
        <el-descriptions-item label="鱼种">{{ spot.species || '-' }}</el-descriptions-item>
        <el-descriptions-item label="标签" :span="2">
          <el-tag v-for="tag in spot.tags || []" :key="tag" size="small" class="spot-tag">{{ tag }}</el-tag>
          <span v-if="!spot.tags?.length">-</span>
        </el-descriptions-item>
        <el-descriptions-item label="地址">{{ spot.address || '-' }}</el-descriptions-item>
        <el-descriptions-item label="基础分">{{ spot.baseScore }}</el-descriptions-item>
        <el-descriptions-item label="内容链接" :span="2">
          <a v-if="spot.sourceLink" :href="normalizedSourceLink" target="_blank" rel="noreferrer">{{ spot.sourceLink }}</a>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ spot.note || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card class="verify-card">
      <template #header>验点记录（{{ verifications.length }}）</template>
      <el-table :data="verifications" stripe v-if="verifications.length">
        <el-table-column prop="feedback" label="反馈" width="120" />
        <el-table-column label="验点人" width="120">
          <template #default="{ row }">{{ row.user?.username }}</template>
        </el-table-column>
        <el-table-column prop="note" label="备注" />
        <el-table-column prop="createdAt" label="时间" width="180" />
      </el-table>
      <span v-else class="empty">暂无验点记录</span>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import http from '@/api/request';

const router = useRouter();
const route = useRoute();
const spot = ref<any>(null);
const verifications = ref<any[]>([]);
const normalizedSourceLink = computed(() => {
  const url = spot.value?.sourceLink || '';
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
});

function statusType(s: string) {
  return s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warning';
}

function statusLabel(s: string) {
  if (s === 'approved') return '已通过';
  if (s === 'rejected') return '已驳回';
  return '待审核';
}

onMounted(async () => {
  const id = Number(route.params.id);
  try {
    const res = await http.get(`/api/spots/${id}`);
    const d = res.data as any;
    if (d?.data) {
      spot.value = d.data;
      verifications.value = d.data.verifications || [];
    }
  } catch {
    // The request interceptor already shows the error.
  }
});
</script>

<style scoped>
.back-btn { margin-bottom: 16px; }
.head { display: flex; justify-content: space-between; }
.head h2 { margin: 0 0 10px; color: #15211D; }
.head p { color: #64716B; margin: 0; }
.descriptions { margin-top: 16px; }
.spot-tag { margin-right: 6px; margin-bottom: 4px; }
.verify-card { margin-top: 16px; }
.empty { color: #87938D; }
</style>
