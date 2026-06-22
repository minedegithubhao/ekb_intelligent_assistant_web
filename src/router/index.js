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
    component: AdminIndex
  },
  {
    path: '/user-chat',
    name: 'UserChat',
    component: () => import('@/views/user-chat/index.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
