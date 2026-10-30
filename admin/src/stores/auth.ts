import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAdminAuth = defineStore('adminAuth', () => {
  const user = ref<any>(null);
  const token = ref<string | null>(null);

  function setSession(u: any, t: string) {
    user.value = u;
    token.value = t;
    localStorage.setItem('admin_token', t);
    localStorage.setItem('admin_user', JSON.stringify(u));
  }

  function loadSession() {
    const t = localStorage.getItem('admin_token') || localStorage.getItem('token');
    const u = localStorage.getItem('admin_user') || localStorage.getItem('user');
    if (t && u) {
      const parsedUser = JSON.parse(u);
      if (parsedUser.role === 'admin') {
        token.value = t;
        user.value = parsedUser;
        localStorage.setItem('admin_token', t);
        localStorage.setItem('admin_user', JSON.stringify(parsedUser));
      }
    }
  }

  function logout() {
    user.value = null;
    token.value = null;
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  }

  return { user, token, setSession, loadSession, logout };
});
