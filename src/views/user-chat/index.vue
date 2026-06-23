<template>
  <div class="chat-shell">
    <aside class="conversation-panel">
      <div class="panel-header">
        <div>
          <h1>知识助手</h1>
          <span>用户问答工作台</span>
        </div>
        <el-button type="primary" :icon="Plus" circle :loading="conversationCreating" @click="createConversation" />
      </div>

      <div class="panel-actions">
        <el-tag type="success" effect="plain">历史已接入</el-tag>
        <el-button v-if="activeConversationId" type="danger" plain size="small" @click="removeActiveConversation">
          删除会话
        </el-button>
      </div>

      <el-input
        v-model="searchKeyword"
        :prefix-icon="Search"
        placeholder="搜索历史会话"
        clearable
        class="conversation-search"
      />

      <div class="conversation-list" v-loading="conversationLoading">
        <button
          v-for="item in filteredConversations"
          :key="item.id"
          class="conversation-item"
          :class="{ active: item.id === activeConversationId }"
          @click="selectConversation(item.id)"
        >
          <span class="conversation-title">{{ item.title }}</span>
          <span class="conversation-meta">{{ item.updatedAt }}</span>
        </button>
        <el-empty v-if="!conversationLoading && filteredConversations.length === 0" description="暂无历史会话" />
      </div>
    </aside>

    <main class="chat-main">
      <header class="chat-header">
        <div>
          <h2>{{ activeConversation?.title || '新会话' }}</h2>
          <span>当前知识库：{{ activeKnowledgeBaseName }}</span>
        </div>
        <div class="header-actions">
          <el-button v-if="isAdmin" type="primary" plain size="small" @click="goAdmin">
            返回管理端
          </el-button>
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
        </div>
      </header>

      <section ref="messageListRef" class="message-list" v-loading="messageLoading">
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
        <el-empty
          v-if="!messageLoading && activeConversationId && activeMessages.length === 0"
          description="当前会话暂无消息"
        />
        <el-empty
          v-if="!messageLoading && !activeConversationId"
          description="请选择或新建一个会话"
        />
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
        <el-button
          type="primary"
          :icon="Promotion"
          :loading="questionSending"
          :disabled="!question.trim()"
          @click="sendQuestion"
        >
          发送
        </el-button>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Promotion, Search, Service, User } from '@element-plus/icons-vue'
import {
  createConversation as createConversationApi,
  deleteConversation,
  getConversationMessages,
  getConversations,
  sendConversationMessage
} from '@/api/conversation'

const knowledgeBaseNames = {
  enterprise: '企业知识库',
  personal: '个人知识库'
}

const storedRoles = JSON.parse(localStorage.getItem('roles') || '[]')
const isAdmin = storedRoles.includes('admin')
const router = useRouter()
const knowledgeBaseType = ref(localStorage.getItem('knowledge_base_type') || 'enterprise')
const searchKeyword = ref('')
const question = ref('')
const activeConversationId = ref(null)
const messageListRef = ref(null)
const conversationLoading = ref(false)
const conversationCreating = ref(false)
const messageLoading = ref(false)
const questionSending = ref(false)

const activeKnowledgeBaseName = computed(() => knowledgeBaseNames[knowledgeBaseType.value] || '未配置')

const goAdmin = () => {
  router.push('/admin')
}

const handleKnowledgeBaseChange = async (value) => {
  localStorage.setItem('knowledge_base_type', value)
  localStorage.setItem('knowledge_base_name', knowledgeBaseNames[value] || '')
  ElMessage.success(`已切换到${knowledgeBaseNames[value]}`)
  activeConversationId.value = null
  messages.value = {}
  await fetchConversations()
}

const conversations = ref([])
const messages = ref({})

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

const normalizeConversation = (item) => ({
  id: item.conversation_id,
  title: item.title || '新会话',
  knowledgeBaseType: item.knowledge_base_type,
  updatedAt: formatDateTime(item.last_message_at || item.updated_at || item.created_at)
})

const normalizeMessage = (item) => ({
  id: item.message_id,
  conversationId: item.conversation_id,
  role: item.role,
  content: item.content,
  sources: item.sources || [],
  metadata: item.metadata || {},
  createdAt: item.created_at
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

const fetchConversations = async () => {
  conversationLoading.value = true
  try {
    const data = await getConversations({ knowledge_base_type: knowledgeBaseType.value })
    conversations.value = data.map(normalizeConversation)
    if (!activeConversationId.value && conversations.value.length > 0) {
      activeConversationId.value = conversations.value[0].id
      await fetchMessages(activeConversationId.value)
    }
  } catch (error) {
    ElMessage.error(error.message || '历史会话加载失败')
  } finally {
    conversationLoading.value = false
  }
}

const fetchMessages = async (conversationId) => {
  if (!conversationId) return
  messageLoading.value = true
  try {
    const data = await getConversationMessages(conversationId, {
      knowledge_base_type: knowledgeBaseType.value
    })
    messages.value[conversationId] = data.map(normalizeMessage)
    scrollToBottom()
  } catch (error) {
    ElMessage.error(error.message || '历史消息加载失败')
  } finally {
    messageLoading.value = false
  }
}

const selectConversation = async (conversationId) => {
  activeConversationId.value = conversationId
  if (!messages.value[conversationId]) {
    await fetchMessages(conversationId)
  } else {
    scrollToBottom()
  }
}

const createConversation = async () => {
  conversationCreating.value = true
  try {
    const data = await createConversationApi({
      knowledge_base_type: knowledgeBaseType.value,
      title: `新的${activeKnowledgeBaseName.value}咨询`
    })
    const conversation = normalizeConversation(data)
    conversations.value.unshift(conversation)
    messages.value[conversation.id] = []
    activeConversationId.value = conversation.id
    ElMessage.success('会话已创建')
    scrollToBottom()
  } catch (error) {
    ElMessage.error(error.message || '会话创建失败')
  } finally {
    conversationCreating.value = false
  }
}

const ensureActiveConversation = async () => {
  if (activeConversationId.value) return activeConversationId.value
  await createConversation()
  return activeConversationId.value
}

const sendQuestion = async () => {
  const content = question.value.trim()
  if (!content) return
  questionSending.value = true
  try {
    const conversationId = await ensureActiveConversation()
    if (!conversationId) return
    await sendConversationMessage(conversationId, {
      question: content,
      knowledge_base_type: knowledgeBaseType.value
    })
    question.value = ''
    await fetchMessages(conversationId)
    await fetchConversations()
    activeConversationId.value = conversationId
  } catch (error) {
    ElMessage.error(error.message || '问题发送失败')
  } finally {
    questionSending.value = false
  }
}

const removeActiveConversation = async () => {
  if (!activeConversationId.value) return
  try {
    await deleteConversation(activeConversationId.value)
    delete messages.value[activeConversationId.value]
    activeConversationId.value = null
    await fetchConversations()
    ElMessage.success('会话已删除')
  } catch (error) {
    ElMessage.error(error.message || '会话删除失败')
  }
}

onMounted(fetchConversations)
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

.panel-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.panel-actions .el-button {
  flex: 0 0 auto;
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
