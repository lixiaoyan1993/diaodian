<template>
  <div>
    <div class="toolbar">
      <h2>标点管理</h2>
      <div>
        <el-select v-model="statusFilter" placeholder="状态" clearable class="status-select" @change="loadSpots">
          <el-option label="待审核" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已驳回" value="rejected" />
        </el-select>
        <el-select v-model="styleFilter" placeholder="钓法" clearable class="style-select" @change="loadSpots">
          <el-option label="路亚" value="路亚" />
          <el-option label="台钓" value="台钓" />
          <el-option label="组合" value="combined" />
        </el-select>
        <el-input v-model="tagFilter" placeholder="标签" clearable class="tag-input" @change="loadSpots" @clear="loadSpots" />
      </div>
    </div>

    <el-table :data="spots" stripe v-loading="loading" style="width:100%">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="名称" min-width="140" />
      <el-table-column label="钓法" width="120">
        <template #default="{ row }">
          <el-tag
            v-for="s in (row.style || '').split(',').map((s: string) => s.trim()).filter(Boolean)"
            :key="s"
            :type="s === '路亚' ? 'danger' : 'success'"
            size="small"
            class="style-tag"
          >{{ s }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="species" label="鱼种" width="100" />
      <el-table-column label="标签" min-width="150">
        <template #default="{ row }">
          <el-tag v-for="tag in row.tags || []" :key="tag" size="small" class="spot-tag">{{ tag }}</el-tag>
          <span v-if="!row.tags?.length">-</span>
        </template>
      </el-table-column>
      <el-table-column label="创建者" width="100">
        <template #default="{ row }">{{ row.user?.username }}</template>
      </el-table-column>
      <el-table-column label="可信分" width="80">
        <template #default="{ row }">{{ row.score }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="viewDetail(row.id)">详情</el-button>
          <el-button v-if="row.status === 'pending'" size="small" type="primary" @click="approve(row.id)">通过</el-button>
          <el-button v-if="row.status === 'pending'" size="small" type="warning" @click="reject(row.id)">驳回</el-button>
          <el-popconfirm title="确定删除这个标点？" @confirm="remove(row.id)">
            <template #reference>
              <el-button size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
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
      @current-change="(page: number) => loadSpots(page)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { adminApi, type AdminSpot } from '@/api';
import { ElMessage } from 'element-plus';

const router = useRouter();
const spots = ref<AdminSpot[]>([]);
const loading = ref(false);
const total = ref(0);
const pageSize = 20;
const statusFilter = ref('');
const styleFilter = ref('');
const tagFilter = ref('');

function statusType(s: string) {
  return s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warning';
}

function statusLabel(s: string) {
  if (s === 'approved') return '已通过';
  if (s === 'rejected') return '已驳回';
  return '待审核';
}

async function loadSpots(page = 1) {
  loading.value = true;
  try {
    const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
    if (statusFilter.value) params.status = statusFilter.value;
    if (styleFilter.value) params.style = styleFilter.value;
    if (tagFilter.value.trim()) params.tag = tagFilter.value.trim();
    const res = await adminApi.spots(params);
    const d = res.data as any;
    if (d?.data) {
      spots.value = d.data.items;
      total.value = d.data.total;
    }
  } finally {
    loading.value = false;
  }
}

async function approve(id: number) {
  await adminApi.updateSpotStatus(id, 'approved');
  ElMessage.success('已通过');
  loadSpots();
}

async function reject(id: number) {
  await adminApi.updateSpotStatus(id, 'rejected');
  ElMessage.success('已驳回');
  loadSpots();
}

async function remove(id: number) {
  await adminApi.deleteSpot(id);
  ElMessage.success('已删除');
  loadSpots();
}

function viewDetail(id: number) {
  router.push(`/spots/${id}`);
}

onMounted(() => loadSpots());
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
.style-select { width: 100px; margin-right: 10px; }
.tag-input { width: 140px; }
.spot-tag { margin-right: 4px; margin-bottom: 4px; }
.pager { margin-top: 16px; justify-content: center; }
</style>
