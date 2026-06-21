<template>
  <div class="chat-page">
    <header class="chat-header">
      <div>
        <h1>智能问答</h1>
        <p>面向用户的知识库问答页面</p>
      </div>
      <el-button type="primary" plain @click="goLogin">退出登录</el-button>
    </header>

    <main class="chat-shell">
      <section class="message-list">
        <div v-for="message in messages" :key="message.id" class="message-item" :class="message.role">
          <div class="message-bubble">{{ message.content }}</div>
        </div>
      </section>

      <footer class="chat-input">
        <el-input
          v-model="question"
          placeholder="请输入你的问题"
          size="large"
          clearable
          @keyup.enter="sendQuestion"
        />
        <el-button type="primary" size="large" @click="sendQuestion">发送</el-button>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const question = ref('')
const messages = ref([
  { id: 1, role: 'assistant', content: '你好，我是企业知识库智能助手。' }
])

const sendQuestion = () => {
  const value = question.value.trim()
  if (!value) {
    ElMessage.warning('请输入问题')
    return
  }

  messages.value.push({ id: Date.now(), role: 'user', content: value })
  messages.value.push({
    id: Date.now() + 1,
    role: 'assistant',
    content: '当前为前端演示数据，后续可接入问答接口返回真实答案。'
  })
  question.value = ''
}

const goLogin = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('userInfo')
  router.push('/login')
}
</script>

<style scoped>
.chat-page {
  min-height: 100vh;
  padding: 24px;
  background: #eef3ff;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 960px;
  margin: 0 auto 20px;
}

.chat-header h1 {
  margin: 0 0 6px;
  font-size: 24px;
}

.chat-header p {
  margin: 0;
  color: #6b7280;
}

.chat-shell {
  display: flex;
  flex-direction: column;
  max-width: 960px;
  height: calc(100vh - 128px);
  min-height: 520px;
  margin: 0 auto;
  overflow: hidden;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.message-list {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.message-item {
  display: flex;
  margin-bottom: 16px;
}

.message-item.user {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 70%;
  padding: 12px 14px;
  line-height: 1.6;
  background: #f3f4f6;
  border-radius: 8px;
}

.message-item.user .message-bubble {
  color: #ffffff;
  background: #2362fb;
}

.chat-input {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #e5e7eb;
}
</style>
