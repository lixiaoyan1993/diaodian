<template>
  <div>
    <div class="toolbar">
      <h2>行程管理</h2>
      <div>
        <el-select v-model="typeFilter" placeholder="类型" clearable class="status-select" @change="loadPosts">
          <el-option label="结伴" value="companion" />
          <el-option label="找车" value="find_car" />
          <el-option label="拼车" value="carpool" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="状态" clearable class="style-select" @change="loadPosts">
          <el-option label="进行中" value="active" />
          <el-option label="已关闭" value="closed" />
          <el-option label="已删除" value="deleted" />
          <el-option label="管理员下架" value="admin_removed" />
        </el-select>
      </div>
    </div>

    <el-table :data="posts" stripe v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column label="类型" width="90">
        <template #default="{ row }">
          <el-tag :type="typeTagType(row.travelType)" size="small">
            {{ typeLabel(row.travelType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="钓点" min-width="140">
        <template #default="{ row }">{{ row.spot?.name }}</template>
      </el-table-column>
      <el-table-column label="发布人" width="100">
        <template #default="{ row }">{{ row.user?.username }}</template>
      </el-table-column>
      <el-table-column prop="departurePlace" label="出发地" width="140" />
      <el-table-column prop="departAt" label="出行时间" width="170" />
      <el-table-column prop="expiresAt" label="有效期至" width="170" />
      <el-table-column label="座位数" width="90">
        <template #default="{ row }">{{ row.seatTotal ?? '-' }}</template>
      </el-table-column>
      <el-table-column prop="memberCount" label="加入人数" width="90" />
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="说明" min-width="180">
        <template #default="{ row }">{{ row.description || '-' }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status !== 'active'" size="small" type="primary" @click="setStatus(row.id, 'active')">恢复</el-button>
          <el-button v-if="row.status === 'active'" size="small" type="warning" @click="setStatus(row.id, 'closed')">关闭</el-button>
          <el-button size="small" type="danger" @click="setStatus(row.id, 'admin_removed')">下架</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-if="total > pageSize"
      background
      layout="prev, pager, next"
      :total="total"
      :page-size="pageSize"
      class="pager"
      @current-change="(page: number) => loadPosts(page)"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { adminApi, type AdminTravelPost } from '@/api';

const posts = ref<AdminTravelPost[]>([]);
const loading = ref(false);
const total = ref(0);
const pageSize = 20;
const typeFilter = ref('');
const statusFilter = ref('');

function typeLabel(type: string) {
  if (type === 'find_car') return '找车';
  if (type === 'carpool') return '拼车';
  return '结伴';
}

function typeTagType(type: string) {
  if (type === 'find_car') return 'info';
  if (type === 'carpool') return 'warning';
  return 'success';
}

function statusType(status: string) {
  if (status === 'active') return 'success';
  if (status === 'closed') return 'warning';
  return 'danger';
}

function statusLabel(status: string) {
  if (status === 'active') return '进行中';
  if (status === 'closed') return '已关闭';
  if (status === 'deleted') return '已删除';
  return '管理员下架';
}

async function loadPosts(page = 1) {
  loading.value = true;
  try {
    const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
    if (typeFilter.value) params.type = typeFilter.value;
    if (statusFilter.value) params.status = statusFilter.value;
    const res = await adminApi.travelPosts(params);
    const d = res.data as any;
    if (d?.data) {
      posts.value = d.data.items;
      total.value = d.data.total;
    }
  } finally {
    loading.value = false;
  }
}

async function setStatus(id: number, status: string) {
  await adminApi.updateTravelPostStatus(id, status);
  ElMessage.success('状态已更新');
  loadPosts();
}

onMounted(() => loadPosts());
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.toolbar h2 { margin: 0; color: #15211D; }
.status-select { width: 120px; margin-right: 10px; }
.style-select { width: 140px; }
.pager { margin-top: 16px; justify-content: center; }
</style>
