<template>
  <div>
    <h2 class="page-title">验点记录</h2>
    <el-table :data="list" stripe v-loading="loading" style="width:100%">
      <el-table-column prop="feedback" label="反馈" width="120">
        <template #default="{ row }">
          <el-tag type="danger" size="small">{{ row.feedback }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="标点" min-width="160">
        <template #default="{ row }">{{ row.spot?.name }}</template>
      </el-table-column>
      <el-table-column label="验点人" width="120">
        <template #default="{ row }">{{ row.user?.username }}</template>
      </el-table-column>
      <el-table-column prop="note" label="备注" min-width="200" />
      <el-table-column prop="createdAt" label="时间" width="180" />
    </el-table>
    <el-pagination
      v-if="total > pageSize"
      background
      layout="prev, pager, next"
      :total="total"
      :page-size="pageSize"
      class="pager"
      @current-change="(page: number) => loadVerifications(page)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { adminApi, type AdminVerification } from '@/api';

const list = ref<AdminVerification[]>([]);
const loading = ref(false);
const total = ref(0);
const pageSize = 20;

async function loadVerifications(page = 1) {
  loading.value = true;
  try {
    const res = await adminApi.verifications(page);
    const d = res.data as any;
    if (d?.data) {
      list.value = d.data.items;
      total.value = d.data.total;
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => loadVerifications());
</script>

<style scoped>
.page-title { margin: 0 0 20px; color: #15211D; }
.pager { margin-top: 16px; justify-content: center; }
</style>
