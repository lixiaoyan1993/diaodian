<template>
  <el-container class="layout">
    <el-aside width="200px" class="aside">
      <div class="logo">叼点 · 管理</div>
      <el-menu
        :default-active="route.path"
        background-color="#15211D"
        text-color="#BFD1C7"
        active-text-color="#fff"
        router
      >
        <el-menu-item index="/dashboard"><el-icon><DataAnalysis /></el-icon>仪表盘</el-menu-item>
        <el-menu-item index="/spots"><el-icon><MapLocation /></el-icon>标点管理</el-menu-item>
        <el-menu-item index="/users"><el-icon><User /></el-icon>用户管理</el-menu-item>
        <el-menu-item index="/verifications"><el-icon><List /></el-icon>验点记录</el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <span class="username">{{ username }}</span>
        <el-button size="small" @click="logout">退出</el-button>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { useAdminAuth } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const auth = useAdminAuth();
const username = auth.user?.username || '管理员';

function logout() {
  auth.logout();
  router.push('/login');
}
</script>

<style scoped>
.layout { min-height: 100vh; }
.aside { background: #15211D; }
.logo {
  padding: 20px 16px;
  color: #fff;
  font-size: 18px;
  font-weight: 900;
}
.header {
  background: #fff;
  border-bottom: 1px solid #E8EDE6;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.username { color: #64716B; margin-right: 16px; }
.main { background: #F3F6F0; }
</style>
