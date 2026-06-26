<template>
  <div class="login-container">
    <section class="login-brief" aria-hidden="true">
      <div class="brief-kicker">Store Opening Rules RAG Assistant</div>
      <h2>小东开店助手</h2>
      <p>
        开店规则问答 RAG 智能助手，面向企业店、个人店与个体店规则咨询，提供可信、可追溯的知识问答入口。
      </p>
      <div class="brief-metrics">
        <div>
          <strong>RAG</strong>
          <span>检索增强</span>
        </div>
        <div>
          <strong>KB</strong>
          <span>知识库管理</span>
        </div>
        <div>
          <strong>Eval</strong>
          <span>质量评估</span>
        </div>
      </div>
    </section>

    <div class="login-card">
      <div class="login-header">
        <div class="logo-icon"></div>
        <h1>小东开店助手</h1>
        <p class="subtitle">开店规则问答 RAG 智能助手</p>
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
import { login } from '@/api/auth'

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

const knowledgeBaseMap = {
  merchant: { type: 'enterprise', name: '企业知识库' },
  enterprise: { type: 'enterprise', name: '企业知识库' },
  individual: { type: 'personal', name: '个人知识库' },
  personal: { type: 'personal', name: '个人知识库' },
  admin: { type: 'enterprise', name: '企业知识库' }
}

const resolveKnowledgeBase = (category) => knowledgeBaseMap[category] || { type: '', name: '' }

const handleLogin = async () => {
  if (!loginFormRef.value) return

  const valid = await loginFormRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const data = await login({
      username: loginForm.username,
      password: loginForm.password,
      login_type: loginForm.role
    })
    const roleCodes = (data.user?.roles || []).map((role) => role.code)
    const knowledgeBase = resolveKnowledgeBase(data.user?.category)

    localStorage.setItem('token', data.access_token)
    localStorage.setItem('userInfo', JSON.stringify(data.user))
    localStorage.setItem('roles', JSON.stringify(roleCodes))
    localStorage.setItem('knowledge_base_type', knowledgeBase.type)
    localStorage.setItem('knowledge_base_name', knowledgeBase.name)

    ElMessage.success('登录成功')
    if (!knowledgeBase.type && !roleCodes.includes('admin')) {
      ElMessage.warning('账号知识库类型未配置')
      return
    }
    router.push(roleCodes.includes('admin') ? '/admin' : '/user-chat')
  } catch (error) {
    if (error.code === 40300 || error.message === 'admin role required') {
      ElMessage.error('当前账号不是管理员，请切换普通用户登录')
      return
    }
    ElMessage.error(error.message || '登录失败，请检查网络或凭证')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  --login-surface: #f8f5ed;
  --login-paper: #fdfbf6;
  --login-ink: #252525;
  --login-muted: #68706d;
  --login-subtle: #8a877e;
  --login-line: #ded8ca;
  --login-line-soft: #ebe6da;
  --login-navy: #17365d;
  --login-gold: #9b7a38;
  --login-gold-soft: #f4ead2;
  --login-serif: "Noto Serif SC", "Songti SC", "SimSun", serif;
  --login-sans: "Inter", "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
  display: grid;
  grid-template-columns: minmax(360px, 0.95fr) minmax(360px, 480px);
  gap: clamp(42px, 7vw, 112px);
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: clamp(32px, 6vw, 72px);
  color: var(--login-ink);
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.52), transparent 48%),
    var(--login-surface);
  font-family: var(--login-sans);
}

.login-brief {
  max-width: 640px;
  padding-left: clamp(0px, 4vw, 42px);
}

.brief-kicker {
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  margin-bottom: 26px;
  color: var(--login-gold);
  background: var(--login-gold-soft);
  border: 1px solid rgba(155, 122, 56, 0.22);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.login-brief h2 {
  max-width: 560px;
  margin: 0;
  color: var(--login-navy);
  font-family: var(--login-serif);
  font-size: clamp(36px, 4.5vw, 62px);
  font-weight: 700;
  line-height: 1.12;
}

.login-brief p {
  max-width: 560px;
  margin: 24px 0 0;
  color: var(--login-muted);
  font-family: var(--login-serif);
  font-size: 17px;
  line-height: 1.9;
}

.brief-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  max-width: 540px;
  margin-top: 42px;
}

.brief-metrics div {
  min-height: 86px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.48);
  border: 1px solid var(--login-line-soft);
  border-radius: 8px;
}

.brief-metrics strong {
  display: block;
  color: var(--login-navy);
  font-family: var(--login-serif);
  font-size: 24px;
  line-height: 1;
}

.brief-metrics span {
  display: block;
  margin-top: 12px;
  color: var(--login-subtle);
  font-size: 12px;
  font-weight: 700;
}

.login-card {
  width: min(100%, 440px);
  padding: 42px 40px 36px;
  background: rgba(253, 251, 246, 0.94);
  border: 1px solid var(--login-line);
  border-radius: 8px;
  box-shadow: 0 24px 64px rgba(23, 54, 93, 0.1);
  backdrop-filter: blur(12px);
}

.login-header {
  margin-bottom: 30px;
  text-align: left;
}

.logo-icon {
  position: relative;
  width: 40px;
  height: 40px;
  margin: 0 0 18px;
  background: var(--login-navy);
  border-radius: 8px;
  box-shadow: 0 10px 24px rgba(23, 54, 93, 0.18);
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
  color: var(--login-navy);
  font-family: var(--login-serif);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--login-gold);
  font-weight: 700;
}

.login-card :deep(.el-form-item) {
  margin-bottom: 20px;
}

.login-card :deep(.el-input__wrapper) {
  min-height: 46px;
  background: rgba(255, 255, 255, 0.68);
  border: 1px solid var(--login-line);
  border-radius: 7px;
  box-shadow: none;
}

.login-card :deep(.el-input__wrapper.is-focus) {
  border-color: rgba(155, 122, 56, 0.56);
  box-shadow: 0 0 0 3px rgba(155, 122, 56, 0.1);
}

.login-card :deep(.el-input__inner) {
  color: var(--login-ink);
  font-size: 14px;
}

.role-item {
  margin-top: 22px;
}

.role-group {
  display: flex;
  width: 100%;
  padding: 3px;
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid var(--login-line-soft);
  border-radius: 8px;
}

.role-group :deep(.el-radio-button) {
  flex: 1;
}

.role-group :deep(.el-radio-button__inner) {
  width: 100%;
  padding: 9px 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--login-muted);
  background: transparent;
  border: none !important;
  border-radius: 6px !important;
  box-shadow: none !important;
}

.role-group :deep(.el-radio-button__orig-radio:checked + .el-radio-button__inner) {
  color: #fff;
  background: var(--login-navy);
  box-shadow: 0 8px 20px rgba(23, 54, 93, 0.16) !important;
}

.submit-btn {
  width: 100%;
  min-height: 44px;
  margin-top: 10px;
  font-weight: 800;
  background: var(--login-navy) !important;
  border-color: var(--login-navy) !important;
  border-radius: 8px;
  letter-spacing: 0.02em;
}

.submit-btn:hover {
  background: #214a7c !important;
  border-color: #214a7c !important;
}

.login-footer {
  padding-top: 20px;
  margin-top: 22px;
  font-size: 12px;
  color: var(--login-subtle);
  text-align: left;
  border-top: 1px solid var(--login-line-soft);
}

@media (max-width: 900px) {
  .login-container {
    grid-template-columns: 1fr;
    gap: 28px;
    padding: 24px;
  }

  .login-brief {
    max-width: 440px;
    padding-left: 0;
  }

  .login-brief h2 {
    font-size: 34px;
  }

  .login-brief p {
    font-size: 15px;
  }

  .brief-metrics {
    display: none;
  }

  .login-card {
    width: 100%;
    max-width: 440px;
    padding: 34px 24px 28px;
  }
}
</style>
