import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi, type UserInfo } from '@/api/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserInfo | null>(null);
  const token = ref<string | null>(null);

  const isLoggedIn = computed(() => !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const username = computed(() => user.value?.username || '');

  function syncAdminSession(u: UserInfo, t: string) {
    // #ifdef H5
    if (u.role === 'admin') {
      localStorage.setItem('admin_token', t);
      localStorage.setItem('admin_user', JSON.stringify(u));
    } else {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
    }
    // #endif
  }

  function setSession(u: UserInfo, t: string) {
    user.value = u;
    token.value = t;
    uni.setStorageSync('token', t);
    uni.setStorageSync('user', JSON.stringify(u));
    syncAdminSession(u, t);
  }

  function loadSession() {
    try {
      const t = uni.getStorageSync('token');
      const u = uni.getStorageSync('user');
      if (t && u) {
        token.value = t;
        user.value = JSON.parse(u);
        syncAdminSession(user.value!, t);
      }
    } catch { /* ignore */ }
  }

  async function fetchProfile() {
    try {
      const res = await authApi.profile();
      if (res.data) {
        user.value = res.data;
        uni.setStorageSync('user', JSON.stringify(res.data));
        if (token.value) syncAdminSession(res.data, token.value);
      }
    } catch { /* ignore */ }
  }

  function logout() {
    user.value = null;
    token.value = null;
    uni.removeStorageSync('token');
    uni.removeStorageSync('user');
    // #ifdef H5
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    // #endif
    uni.switchTab({ url: '/pages/hall/hall' });
  }

  return { user, token, isLoggedIn, isAdmin, username, setSession, loadSession, fetchProfile, logout };
});
