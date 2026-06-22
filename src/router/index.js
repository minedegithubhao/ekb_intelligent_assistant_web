import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/views/login/index.vue'
import AdminIndex from '@/views/admin/index.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/admin',
    name: 'Admin',
    component: AdminIndex,
    meta: { requiresAuth: true }
  },
  {
    path: '/user-chat',
    name: 'UserChat',
    component: () => import('@/views/user-chat/index.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})


router.beforeEach((to) => {
  const token = sessionStorage.getItem('token')
  if (to.meta.requiresAuth && !token) {
    return '/login'
  }
})

export default router
