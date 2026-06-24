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
          <el-button plain type="danger" size="small" :icon="SwitchButton" @click="handleLogout">
            退出登录
          </el-button>
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
            <div v-if="message.role === 'assistant'" class="assistant-answer">
              <div v-if="message.pending" class="pending-line">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>{{ message.progressLabel || '正在处理问题...' }}</span>
              </div>
              <div v-if="message.content" class="markdown-body" v-html="renderMarkdown(message.content)" />
            </div>
            <p v-else>{{ message.content }}</p>
            <div
              v-if="message.role === 'assistant' && shouldShowAssistantMeta(message)"
              class="message-sources"
            >
              <div v-if="message.metadata?.judgement || message.hitType" class="message-judgement">
                判断结果：{{ message.metadata?.judgement || judgementText(message.hitType) }}
              </div>
              <div v-if="message.metadata?.elapsed_ms !== undefined" class="message-elapsed">
                耗时：{{ formatElapsed(message.metadata.elapsed_ms) }}
              </div>
              <div
                v-for="(source, index) in message.sources"
                :key="`${message.id}-${index}`"
                class="source-line"
              >
                <span class="source-index">来源{{ index + 1 }}：</span>
                <a
                  v-if="source.reference_source"
                  :href="source.reference_source"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="source-title"
                >
                  {{ sourceTitle(source) }}
                </a>
                <span v-else class="source-title">{{ sourceTitle(source) }}</span>
                <span class="source-separator">|</span>
                <span>置信度：{{ formatConfidence(source.confidence) }}</span>
                <span class="source-separator">|</span>
                <span>文档ID：{{ sourceDocId(source) }}</span>
              </div>
              <el-collapse v-if="message.metadata?.retrieval_flow?.length" class="flow-collapse">
                <el-collapse-item title="检索流程数据" :name="`flow-${message.id}`">
                  <div
                    v-for="(step, index) in message.metadata.retrieval_flow"
                    :key="`${message.id}-flow-${index}`"
                    class="flow-line"
                  >
                    <span>{{ index + 1 }}. {{ step.label || step.stage }}</span>
                    <span>{{ statusText(step.status) }}</span>
                    <span v-if="step.elapsed_ms !== undefined">{{ formatElapsed(step.elapsed_ms) }}</span>
                    <span v-if="step.judgement">判断：{{ step.judgement }}</span>
                    <span v-if="step.candidate_count !== undefined">候选：{{ step.candidate_count }}</span>
                    <span v-if="step.evidence_count !== undefined">证据：{{ step.evidence_count }}</span>
                    <span v-if="step.best_confidence !== undefined">最高置信度：{{ formatConfidence(step.best_confidence) }}</span>
                    <span v-if="step.reason">说明：{{ step.reason }}</span>
                  </div>
                </el-collapse-item>
              </el-collapse>
            </div>
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
        <div class="composer-toolbar">
          <span class="composer-label">提问知识库</span>
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
          <el-tag v-else type="primary" effect="plain">{{ activeKnowledgeBaseName }}</el-tag>
        </div>
        <div class="composer-input-row">
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
        </div>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading, Plus, Promotion, Search, Service, SwitchButton, User } from '@element-plus/icons-vue'
import MarkdownIt from 'markdown-it'
import {
  createConversation as createConversationApi,
  deleteConversation,
  getConversationMessages,
  getConversations,
  streamConversationMessage
} from '@/api/conversation'
import { logout } from '@/api/auth'
import { clearAuthSession } from '@/utils/authSession'

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
const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})
const defaultLinkOpen = markdown.renderer.rules.link_open || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options))
markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen(tokens, idx, options, env, self)
}

const activeKnowledgeBaseName = computed(() => knowledgeBaseNames[knowledgeBaseType.value] || '未配置')

const goAdmin = () => {
  router.push('/admin')
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

const formatElapsed = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return `${(number / 1000).toFixed(2)} 秒`
}

const formatConfidence = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return `${(number * 100).toFixed(2)}%`
}

const renderMarkdown = (value) => markdown.render(value || '')

const statusText = (status) => {
  const map = {
    running: '处理中',
    completed: '完成',
    skipped: '跳过',
    failed: '失败'
  }
  return map[status] || status || '-'
}

const judgementText = (hitType) => {
  const map = {
    rule_greeting: '问候语',
    rule_human_transfer: '请求人工',
    rule_out_of_scope: '越界问题',
    faq_fast: 'FAQ快速匹配',
    faq_high: 'FAQ高置信匹配',
    faq_middle_doc: 'FAQ中置信+文档混合检索',
    doc: '文档混合检索',
    none: '未命中',
    retrieval_error: '检索异常'
  }
  return map[hitType] || hitType || '-'
}

const shouldShowAssistantMeta = (message) => Boolean(
  message.metadata?.judgement ||
  message.hitType ||
  message.metadata?.elapsed_ms !== undefined ||
  message.sources?.length ||
  message.metadata?.retrieval_flow?.length
)

const sourceTitle = (source) => source.title || source.id || source.source_doc_id || '未命名来源'

const sourceDocId = (source) => source.source_doc_id || source.id || '-'

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
  hitType: item.hit_type || item.metadata?.hit_type,
  pending: false,
  progressLabel: '',
  createdAt: item.created_at
})

const normalizeStreamAnswer = (item) => ({
  id: item.message_id,
  conversationId: item.conversation_id,
  role: 'assistant',
  content: item.answer,
  sources: item.sources || [],
  metadata: item.metadata || {},
  hitType: item.hit_type || item.metadata?.hit_type,
  pending: false,
  progressLabel: '',
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

const replaceLocalMessage = (conversationId, messageId, nextMessage) => {
  const list = messages.value[conversationId] || []
  messages.value[conversationId] = list.map((item) => (item.id === messageId ? nextMessage : item))
}

const patchLocalMessage = (conversationId, messageId, patcher) => {
  const list = messages.value[conversationId] || []
  messages.value[conversationId] = list.map((item) => {
    if (item.id !== messageId) return item
    return patcher(item)
  })
}

const sendQuestion = async () => {
  const content = question.value.trim()
  if (!content) return
  questionSending.value = true
  try {
    const conversationId = await ensureActiveConversation()
    if (!conversationId) return
    question.value = ''

    const userMessage = {
      id: `local-user-${Date.now()}`,
      conversationId,
      role: 'user',
      content,
      sources: [],
      metadata: {},
      pending: false,
      createdAt: new Date().toISOString()
    }
    const assistantTempId = `local-assistant-${Date.now()}`
    const assistantMessage = {
      id: assistantTempId,
      conversationId,
      role: 'assistant',
      content: '',
      sources: [],
      metadata: {
        retrieval_flow: []
      },
      hitType: '',
      pending: true,
      progressLabel: '正在准备处理...'
    }
    messages.value[conversationId] = [
      ...(messages.value[conversationId] || []),
      userMessage,
      assistantMessage
    ]
    scrollToBottom()

    await streamConversationMessage(conversationId, {
      question: content,
      knowledge_base_type: knowledgeBaseType.value
    }, {
      onProgress: (step) => {
        patchLocalMessage(conversationId, assistantTempId, (item) => ({
          ...item,
          progressLabel: `${step.label || '处理中'}：${statusText(step.status)}`,
          metadata: {
            ...(item.metadata || {}),
            retrieval_flow: [
              ...((item.metadata || {}).retrieval_flow || []),
              step
            ]
          },
          hitType: step.hit_type || item.hitType
        }))
        scrollToBottom()
      },
      onFinal: (data) => {
        replaceLocalMessage(conversationId, assistantTempId, normalizeStreamAnswer(data))
      },
      onError: (data) => {
        replaceLocalMessage(conversationId, assistantTempId, {
          id: assistantTempId,
          conversationId,
          role: 'assistant',
          content: data.message || '当前知识库检索暂时不可用，请稍后再试。',
          sources: [],
          metadata: {
            elapsed_ms: data.elapsed_ms,
            judgement: '检索异常',
            retrieval_flow: data.stage ? [data] : []
          },
          hitType: 'retrieval_error',
          pending: false,
          progressLabel: ''
        })
      }
    })
    await fetchConversations()
    activeConversationId.value = conversationId
    scrollToBottom()
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
  height: 100vh;
  overflow: hidden;
  color: #1d2129;
  background: #f5f7fb;
}

.conversation-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 0;
  padding: 22px;
  overflow: hidden;
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
  height: 100vh;
  min-height: 0;
  overflow: hidden;
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
  min-height: 0;
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

.assistant-answer {
  min-width: 0;
}

.pending-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
  font-size: 14px;
  color: #4e5969;
}

.markdown-body {
  font-size: 14px;
  line-height: 1.75;
  color: #1d2129;
}

.markdown-body :deep(p) {
  margin: 0 0 10px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 20px;
  margin: 8px 0;
}

.markdown-body :deep(code) {
  padding: 2px 5px;
  font-size: 12px;
  background: #f2f3f5;
  border-radius: 4px;
}

.markdown-body :deep(pre) {
  padding: 10px 12px;
  overflow: auto;
  background: #f2f3f5;
  border-radius: 8px;
}

.markdown-body :deep(a) {
  color: #2362fb;
  text-decoration: none;
}

.message-sources {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
  padding-top: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: #4e5969;
  border-top: 1px solid #edf0f5;
}

.message-elapsed {
  font-weight: 600;
  color: #1d2129;
}

.message-judgement {
  font-weight: 600;
  color: #1d2129;
}

.source-line {
  overflow-wrap: anywhere;
}

.source-index {
  font-weight: 600;
  color: #2362fb;
}

.source-title {
  color: #1d2129;
  text-decoration: none;
}

a.source-title:hover {
  color: #2362fb;
  text-decoration: underline;
}

.source-separator {
  margin: 0 6px;
  color: #c9cdd4;
}

.composer {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  padding: 18px 28px 24px;
  background: #ffffff;
  border-top: 1px solid #e5e8ef;
}

.composer-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 28px;
}

.composer-label {
  font-size: 12px;
  font-weight: 600;
  color: #4e5969;
}

.composer-input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
}

.composer-input-row .el-button {
  align-self: end;
  height: 40px;
  border-radius: 8px;
}

.flow-collapse {
  margin-top: 4px;
  border-top: 1px solid #edf0f5;
  border-bottom: none;
}

.flow-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 4px 0;
  color: #4e5969;
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
