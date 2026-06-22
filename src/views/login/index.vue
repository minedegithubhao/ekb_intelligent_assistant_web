<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <div class="logo-icon"></div>
        <h1>RAG 系统管理后台</h1>
        <p class="subtitle">企业级知识库与检索评估工作台</p>
      </div>

      <el-form ref="loginFormRef" :model="loginForm" :rules="rules" size="large" label-position="top">
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名、手机号或邮箱"
            :prefix-icon="User"
            clearable
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-form-item prop="role" class="role-item">
          <el-radio-group v-model="loginForm.role" class="role-group">
            <el-radio-button label="user">普通用户</el-radio-button>
            <el-radio-button label="admin">管理员</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" class="submit-btn" :loading="loading" @click="handleLogin">
            立即登录
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <span>遇到问题？请联系系统管理员</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock, User } from '@element-plus/icons-vue'

const router = useRouter()
const loginFormRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: '',
  role: 'admin'
})

const rules = {
  username: [{ required: true, message: '用户名不能为空', trigger: 'blur' }],
  password: [{ required: true, message: '密码不能为空', trigger: 'blur' }]
}

const handleLogin = async () => {
  if (!loginFormRef.value) return

  const valid = await loginFormRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const mockResponse = {
      code: 200,
      message: '登录成功',
      data: {
        token: 'mock-token',
        user: {
          id: 1,
          username: loginForm.username,
          nickname: loginForm.role === 'admin' ? '管理员' : '普通用户',
          role: loginForm.role
        }
      }
    }

    ElMessage.success(mockResponse.message)
    sessionStorage.setItem('token', mockResponse.data.token)
    sessionStorage.setItem('userInfo', JSON.stringify(mockResponse.data.user))

    router.push(mockResponse.data.user.role === 'admin' ? '/admin' : '/user-chat')
  } catch (error) {
    ElMessage.error('登录失败，请检查网络或凭证')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8f0 100%);
}

.login-card {
  width: min(100%, 400px);
  padding: 40px;
  background: #ffffff;
  border: 1px solid rgba(235, 238, 245, 0.8);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04);
}

.login-header {
  margin-bottom: 32px;
  text-align: center;
}

.logo-icon {
  position: relative;
  width: 42px;
  height: 42px;
  margin: 0 auto 16px;
  background: #2362fb;
  border-radius: 8px;
}

.logo-icon::after {
  position: absolute;
  top: 9px;
  left: 9px;
  width: 18px;
  height: 18px;
  content: '';
  border: 3px solid #ffffff;
  border-radius: 50%;
}

.login-header h1 {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
  color: #1d2129;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: #86909c;
}

.role-item {
  margin-top: 24px;
}

.role-group {
  display: flex;
  width: 100%;
  padding: 3px;
  background: #f2f3f5;
  border-radius: 8px;
}

.role-group :deep(.el-radio-button) {
  flex: 1;
}

.role-group :deep(.el-radio-button__inner) {
  width: 100%;
  padding: 8px 0;
  font-size: 14px;
  color: #4e5969;
  background: transparent;
  border: none !important;
  border-radius: 6px !important;
  box-shadow: none !important;
}

.role-group :deep(.el-radio-button__orig-radio:checked + .el-radio-button__inner) {
  font-weight: 500;
  color: #2362fb;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06) !important;
}

.submit-btn {
  width: 100%;
  margin-top: 12px;
  font-weight: 500;
  background: #2362fb !important;
  border-color: #2362fb !important;
  border-radius: 8px;
}

.submit-btn:hover {
  background: #3875ff !important;
}

.login-footer {
  margin-top: 24px;
  font-size: 12px;
  color: #86909c;
  text-align: center;
}
</style>
