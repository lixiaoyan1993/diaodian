<template>
  <div class="login-container">
    <div class="login-card">
      <h1>叼点 · 后台管理</h1>
      <p>管理员登录</p>
      <el-form @submit.prevent="handleLogin">
        <el-input v-model="username" placeholder="用户名" class="login-input" />
        <el-input v-model="password" type="password" placeholder="密码" class="login-input" show-password />
        <el-button type="danger" size="large" class="login-button" @click="handleLogin" :loading="loading">登录</el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { adminApi } from '@/api';
import { useAdminAuth } from '@/stores/auth';
import { ElMessage } from 'element-plus';

const router = useRouter();
const auth = useAdminAuth();
const username = ref('');
const password = ref('');
const loading = ref(false);

async function handleLogin() {
  if (!username.value || !password.value) {
    ElMessage.warning('请输入用户名和密码');
    return;
  }
  loading.value = true;
  try {
    const res = await adminApi.login(username.value, password.value);
    const d = res.data as any;
    if (d.data?.user?.role !== 'admin') {
      ElMessage.error('非管理员账号无法登录后台');
      return;
    }
    auth.setSession(d.data.user, d.data.token);
    router.push('/dashboard');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F3F6F0;
}
.login-card {
  width: 380px;
  padding: 36px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 18px 54px rgba(15,36,28,0.12);
}
h1 { margin: 0 0 8px; color: #15211D; }
p { margin: 0 0 24px; color: #64716B; }
.login-input { margin-bottom: 16px; }
.login-button { width: 100%; margin-top: 8px; }
</style>
