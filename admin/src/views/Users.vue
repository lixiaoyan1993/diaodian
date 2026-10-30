<template>
  <div>
    <h2 class="page-title">用户管理</h2>
    <el-table :data="users" stripe v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="phone" label="手机号" width="140" />
      <el-table-column label="角色" width="100">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'danger' : 'info'" size="small">
            {{ row.role === 'admin' ? '管理员' : '用户' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="标点数" width="100">
        <template #default="{ row }">{{ row._count?.spots || 0 }}</template>
      </el-table-column>
      <el-table-column label="验点数" width="100">
        <template #default="{ row }">{{ row._count?.verifications || 0 }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="注册时间" width="180" />
    </el-table>
    <el-pagination
      v-if="total > pageSize"
      background
      layout="prev, pager, next"
      :total="total"
      :page-size="pageSize"
      class="pager"
      @current-change="(page: number) => loadUsers(page)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { adminApi, type AdminUser } from '@/api';

const users = ref<AdminUser[]>([]);
const loading = ref(false);
const total = ref(0);
const pageSize = 20;

async function loadUsers(page = 1) {
  loading.value = true;
  try {
    const res = await adminApi.users(page);
    const d = res.data as any;
    if (d?.data) {
      users.value = d.data.items;
      total.value = d.data.total;
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => loadUsers());
</script>

<style scoped>
.page-title { margin: 0 0 20px; color: #15211D; }
.pager { margin-top: 16px; justify-content: center; }
</style>
