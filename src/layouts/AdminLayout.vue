<template>
  <el-container class="layout-container">
    <el-aside width="240px" class="aside-menu">
      <div class="menu-logo">
        <div class="logo-small"></div>
        <span>RAG 工作台</span>
      </div>

      <el-menu :default-active="activeMenu" class="custom-el-menu" @select="handleMenuSelect">
        <el-menu-item index="dashboard">
          <el-icon><Setting /></el-icon>
          <span>仪表台参数</span>
        </el-menu-item>
        <el-menu-item index="users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="history">
          <el-icon><ChatDotRound /></el-icon>
          <span>历史会话管理</span>
        </el-menu-item>
        <el-menu-item index="retrievalTest">
          <el-icon><Search /></el-icon>
          <span>检索测试</span>
        </el-menu-item>
        <el-menu-item index="keywordRules">
          <el-icon><Collection /></el-icon>
          <span>关键词规则匹配</span>
        </el-menu-item>
        <el-menu-item index="termNormalizations">
          <el-icon><Operation /></el-icon>
          <span>归一化词改写配置</span>
        </el-menu-item>
        <el-menu-item index="knowledge">
          <el-icon><FolderOpened /></el-icon>
          <span>知识库管理</span>
        </el-menu-item>
        <el-menu-item index="evaluations">
          <el-icon><DataAnalysis /></el-icon>
          <span>评估管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="main-header">
        <div class="breadcrumb">
          <span class="parent">后台管理</span>
          <span class="divider">/</span>
          <span class="current">{{ menuTitleMap[activeMenu] }}</span>
        </div>
        <div class="user-info">
          <el-button type="primary" plain :icon="ChatLineRound" @click="goUserChat">进入用户端</el-button>
          <el-avatar :size="32">管</el-avatar>
          <span class="nickname">管理员</span>
          <el-tag size="small" type="primary" effect="plain">Admin</el-tag>
          <el-button plain type="danger" :icon="SwitchButton" @click="handleLogout">退出登录</el-button>
        </div>
      </el-header>

      <el-main class="main-content">
        <slot :active-tab="activeMenu"></slot>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ChatDotRound,
  ChatLineRound,
  Collection,
  DataAnalysis,
  FolderOpened,
  Operation,
  Search,
  Setting,
  SwitchButton,
  User
} from '@element-plus/icons-vue'
import { logout } from '@/api/auth'
import { clearAuthSession } from '@/utils/authSession'

const emit = defineEmits(['menu-change'])
const router = useRouter()

const activeMenu = ref('dashboard')
const menuTitleMap = {
  dashboard: '仪表台参数',
  users: '用户管理',
  history: '历史会话管理',
  retrievalTest: '检索测试',
  keywordRules: '关键词规则匹配',
  termNormalizations: '归一化词改写配置',
  knowledge: '知识库管理',
  evaluations: '评估管理'
}

const handleMenuSelect = (index) => {
  activeMenu.value = index
  emit('menu-change', index)
}

const goUserChat = () => {
  router.push('/user-chat')
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm('确定退出当前账号吗？', '退出登录', {
      type: 'warning',
      confirmButtonText: '退出',
      cancelButtonText: '取消'
    })
  } catch {
    return
  }

  try {
    await logout()
  } catch {
    // 本地退出优先，后端 token 已失效或网络异常时也清理登录态。
  } finally {
    clearAuthSession()
    ElMessage.success('已退出登录')
    router.replace('/login')
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  background: #f7f8fa;
}

.aside-menu {
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-right: 1px solid #f2f3f5;
}

.menu-logo {
  display: flex;
  align-items: center;
  height: 60px;
  padding-left: 24px;
  border-bottom: 1px solid #f2f3f5;
}

.logo-small {
  width: 24px;
  height: 24px;
  margin-right: 12px;
  background: #2362fb;
  border-radius: 6px;
}

.menu-logo span {
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
}

.custom-el-menu {
  padding: 16px 12px;
  border-right: none !important;
}

.custom-el-menu :deep(.el-menu-item) {
  height: 48px;
  margin-bottom: 4px;
  line-height: 48px;
  color: #4e5969;
  border-radius: 8px;
}

.custom-el-menu :deep(.el-menu-item:hover) {
  color: #1d2129;
  background: #f2f3f5;
}

.custom-el-menu :deep(.el-menu-item.is-active) {
  font-weight: 500;
  color: #2362fb !important;
  background: #e8f0ff !important;
}

.main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 24px;
  background: #ffffff;
  border-bottom: 1px solid #f2f3f5;
}

.breadcrumb {
  font-size: 14px;
}

.breadcrumb .parent {
  color: #86909c;
}

.breadcrumb .divider {
  margin: 0 8px;
  color: #c9cdd4;
}

.breadcrumb .current {
  font-weight: 500;
  color: #1d2129;
}

.user-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.nickname {
  font-size: 14px;
  color: #4e5969;
}

.main-content {
  padding: 24px;
  overflow-y: auto;
}
</style>
