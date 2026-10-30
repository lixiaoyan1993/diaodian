import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login', name: 'Login', component: () => import('@/views/Login.vue') },
    {
      path: '/',
      component: () => import('@/views/Layout.vue'),
      redirect: '/dashboard',
      children: [
        { path: 'dashboard', name: 'Dashboard', component: () => import('@/views/Dashboard.vue') },
        { path: 'users', name: 'Users', component: () => import('@/views/Users.vue') },
        { path: 'spots', name: 'Spots', component: () => import('@/views/Spots.vue') },
        { path: 'spots/:id', name: 'SpotDetail', component: () => import('@/views/SpotDetail.vue') },
        { path: 'verifications', name: 'Verifications', component: () => import('@/views/Verifications.vue') },
      ],
    },
  ],
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
  const rawUser = localStorage.getItem('admin_user') || localStorage.getItem('user');
  let isAdmin = false;
  try {
    isAdmin = !!rawUser && JSON.parse(rawUser).role === 'admin';
  } catch {
    isAdmin = false;
  }
  if (to.path !== '/login' && (!token || !isAdmin)) next('/login');
  else next();
});

export default router;
