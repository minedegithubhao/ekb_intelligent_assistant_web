<template>
  <div class="chat-shell">
    <aside class="conversation-panel">
      <div class="panel-header">
        <div>
          <h1>知识助手</h1>
          <span>用户问答工作台</span>
        </div>
        <el-button type="primary" :icon="Plus" circle @click="createConversation" />
      </div>

      <el-input
        v-model="searchKeyword"
        :prefix-icon="Search"
        placeholder="搜索历史会话"
        clearable
        class="conversation-search"
      />

      <div class="conversation-list">
        <button
          v-for="item in filteredConversations"
          :key="item.id"
          class="conversation-item"
          :class="{ active: item.id === activeConversationId }"
          @click="activeConversationId = item.id"
        >
          <span class="conversation-title">{{ item.title }}</span>
          <span class="conversation-meta">{{ item.updatedAt }}</span>
        </button>
      </div>
    </aside>

    <main class="chat-main">
      <header class="chat-header">
        <div>
          <h2>{{ activeConversation?.title || '新会话' }}</h2>
          <span>当前知识库：{{ activeKnowledgeBaseName }}</span>
        </div>
        <div class="header-actions">
          <el-select
            v-if="isAdmin"
            v-model="knowledgeBaseType"
            class="knowledge-select"
            size="small"
            @change="handleKnowledgeBaseChange"
          >
            <el-option label="企业知识库" value="enterprise" />
            <el-option label="个人知识库" value="personal" />
          </el-select>
          <el-tag type="info" effect="plain">Mock</el-tag>
        </div>
      </header>

      <section ref="messageListRef" class="message-list">
        <div
          v-for="message in activeMessages"
          :key="message.id"
          class="message-row"
          :class="message.role"
        >
          <div class="avatar">
            <el-icon v-if="message.role === 'assistant'"><Service /></el-icon>
            <el-icon v-else><User /></el-icon>
          </div>
          <div class="message-bubble">
            <div class="message-role">{{ message.role === 'assistant' ? '助手' : '我' }}</div>
            <p>{{ message.content }}</p>
          </div>
        </div>
      </section>

      <footer class="composer">
        <el-input
          v-model="question"
          type="textarea"
          :autosize="{ minRows: 2, maxRows: 5 }"
          resize="none"
          placeholder="输入你的问题，例如：企业店保证金怎么收取？"
          @keydown.enter.exact.prevent="sendQuestion"
        />
        <el-button type="primary" :icon="Promotion" :disabled="!question.trim()" @click="sendQuestion">
          发送
        </el-button>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Promotion, Search, Service, User } from '@element-plus/icons-vue'

const knowledgeBaseNames = {
  enterprise: '企业知识库',
  personal: '个人知识库'
}

const storedRoles = JSON.parse(localStorage.getItem('roles') || '[]')
const isAdmin = storedRoles.includes('admin')
const knowledgeBaseType = ref(localStorage.getItem('knowledge_base_type') || 'enterprise')
const searchKeyword = ref('')
const question = ref('')
const activeConversationId = ref(1)
const messageListRef = ref(null)

const activeKnowledgeBaseName = computed(() => knowledgeBaseNames[knowledgeBaseType.value] || '未配置')

const handleKnowledgeBaseChange = (value) => {
  localStorage.setItem('knowledge_base_type', value)
  localStorage.setItem('knowledge_base_name', knowledgeBaseNames[value] || '')
  ElMessage.success(`已切换到${knowledgeBaseNames[value]}`)
}

const conversations = ref([
  { id: 1, title: '企业店保证金咨询', updatedAt: '刚刚' },
  { id: 2, title: '个人/个体店入驻规则', updatedAt: '昨天' },
  { id: 3, title: '店铺违规处理说明', updatedAt: '06-20' }
])

const messages = ref({
  1: [
    {
      id: 'm1',
      role: 'assistant',
      content: '你好，我可以协助查询企业店、个人/个体店相关规则。'
    },
    {
      id: 'm2',
      role: 'user',
      content: '企业店保证金怎么收取？'
    },
    {
      id: 'm3',
      role: 'assistant',
      content: '企业店保证金通常按经营类目、店铺类型和平台规则要求收取。当前页面为占位版本，后续会接入后端 RAGService 返回真实答案和来源。'
    }
  ],
  2: [
    {
      id: 'm4',
      role: 'assistant',
      content: '可以询问个人/个体店入驻、资质、交易、退店等规则。'
    }
  ],
  3: [
    {
      id: 'm5',
      role: 'assistant',
      content: '可以查询违规场景、扣分、限制经营、申诉等规则。'
    }
  ]
})

const filteredConversations = computed(() => {
  const keyword = searchKeyword.value.trim()
  if (!keyword) return conversations.value
  return conversations.value.filter((item) => item.title.includes(keyword))
})

const activeConversation = computed(() =>
  conversations.value.find((item) => item.id === activeConversationId.value)
)

const activeMessages = computed(() => messages.value[activeConversationId.value] || [])

const scrollToBottom = async () => {
  await nextTick()
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

const createConversation = () => {
  const id = Date.now()
  conversations.value.unshift({
    id,
    title: `新的${activeKnowledgeBaseName.value}咨询`,
    updatedAt: '刚刚'
  })
  messages.value[id] = [
    {
      id: `${id}-welcome`,
      role: 'assistant',
      content: `新的会话已创建，当前知识库为${activeKnowledgeBaseName.value}。你可以先输入问题，后续这里会接入后端历史会话接口。`
    }
  ]
  activeConversationId.value = id
  scrollToBottom()
}

const sendQuestion = () => {
  const content = question.value.trim()
  if (!content) return

  const conversationMessages = messages.value[activeConversationId.value] || []
  conversationMessages.push({
    id: `${Date.now()}-user`,
    role: 'user',
    content
  })
  conversationMessages.push({
    id: `${Date.now()}-assistant`,
    role: 'assistant',
    content: `已收到问题：“${content}”。当前是${activeKnowledgeBaseName.value}的前端占位回复，后续会调用后端聊天接口并展示流式答案。`
  })
  messages.value[activeConversationId.value] = conversationMessages

  const active = conversations.value.find((item) => item.id === activeConversationId.value)
  if (active) {
    active.title = content.length > 18 ? `${content.slice(0, 18)}...` : content
    active.updatedAt = '刚刚'
  }

  question.value = ''
  ElMessage.success('问题已发送')
  scrollToBottom()
}
</script>

<style scoped>
.chat-shell {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  min-height: 100vh;
  color: #1d2129;
  background: #f5f7fb;
}

.conversation-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 22px;
  background: #ffffff;
  border-right: 1px solid #e5e8ef;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.panel-header h1,
.chat-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 650;
  letter-spacing: 0;
}

.panel-header span,
.chat-header span,
.conversation-meta {
  font-size: 12px;
  color: #86909c;
}

.conversation-search {
  width: 100%;
}

.conversation-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 68px;
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
}

.conversation-item:hover,
.conversation-item.active {
  background: #f2f6ff;
  border-color: #c9dafd;
}

.conversation-title {
  overflow: hidden;
  font-size: 14px;
  font-weight: 550;
  color: #1d2129;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-main {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-width: 0;
  min-height: 100vh;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 28px;
  background: rgba(255, 255, 255, 0.86);
  border-bottom: 1px solid #e5e8ef;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.knowledge-select {
  width: 128px;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 28px;
  overflow-y: auto;
}

.message-row {
  display: flex;
  gap: 12px;
  max-width: 820px;
}

.message-row.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.avatar {
  display: grid;
  flex: 0 0 34px;
  width: 34px;
  height: 34px;
  color: #2362fb;
  background: #eaf1ff;
  border-radius: 8px;
  place-items: center;
}

.message-row.user .avatar {
  color: #ffffff;
  background: #2362fb;
}

.message-bubble {
  max-width: min(680px, 70vw);
  padding: 13px 15px;
  background: #ffffff;
  border: 1px solid #e5e8ef;
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(25, 42, 70, 0.04);
}

.message-row.user .message-bubble {
  color: #ffffff;
  background: #2362fb;
  border-color: #2362fb;
}

.message-role {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 650;
  color: #86909c;
}

.message-row.user .message-role {
  color: rgba(255, 255, 255, 0.78);
}

.message-bubble p {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
}

.composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  padding: 18px 28px 24px;
  background: #ffffff;
  border-top: 1px solid #e5e8ef;
}

.composer .el-button {
  align-self: end;
  height: 40px;
  border-radius: 8px;
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  border-radius: 8px;
}

@media (max-width: 800px) {
  .chat-shell {
    grid-template-columns: 1fr;
  }

  .conversation-panel {
    max-height: 280px;
    border-right: none;
    border-bottom: 1px solid #e5e8ef;
  }

  .chat-main {
    min-height: calc(100vh - 280px);
  }

  .message-bubble {
    max-width: 78vw;
  }

  .composer {
    grid-template-columns: 1fr;
  }
}
</style>
