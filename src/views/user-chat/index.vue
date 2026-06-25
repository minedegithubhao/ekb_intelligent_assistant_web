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
          <div class="knowledge-switch" aria-label="知识库选择">
            <button
              type="button"
              :class="{ active: knowledgeBaseType === 'enterprise' }"
              @click="handleKnowledgeBaseChange('enterprise')"
            >
              企业知识库
            </button>
            <button
              type="button"
              :class="{ active: knowledgeBaseType === 'personal' }"
              @click="handleKnowledgeBaseChange('personal')"
            >
              个人知识库
            </button>
          </div>
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
  if (!knowledgeBaseNames[value]) return
  knowledgeBaseType.value = value
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
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Serif+SC:wght@400;500;600;700&display=swap");

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

/* Alexandria / Enterprise Research skin
   Style-only override: template, script, events, API calls and business logic are unchanged. */
.chat-shell {
  --eks-surface: #f8f5ed;
  --eks-surface-paper: #fdfbf6;
  --eks-surface-card: #ffffff;
  --eks-surface-muted: #f1ede3;
  --eks-line: #ded8ca;
  --eks-line-soft: #ebe6da;
  --eks-ink: #252525;
  --eks-ink-muted: #5f625f;
  --eks-ink-subtle: #8a877e;
  --eks-navy: #17365d;
  --eks-navy-soft: #e7edf6;
  --eks-gold: #9b7a38;
  --eks-gold-soft: #f4ead2;
  --eks-danger: #963939;
  --eks-shadow-soft: 0 18px 48px rgba(23, 54, 93, 0.08);
  --eks-shadow-hairline: 0 1px 2px rgba(37, 37, 37, 0.04);
  --eks-serif: "Noto Serif SC", "Songti SC", "SimSun", serif;
  --eks-sans: "Inter", "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
  position: relative;
  grid-template-columns: 318px minmax(0, 1fr);
  min-height: 100vh;
  overflow: hidden;
  color: var(--eks-ink);
  background: var(--eks-surface);
  font-family: var(--eks-sans);
}

.chat-shell::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: "";
  background:
    radial-gradient(circle at 18% 14%, rgba(155, 122, 56, 0.08), transparent 28%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.5), transparent 45%);
}

.conversation-panel,
.chat-main {
  position: relative;
  z-index: 1;
}

.conversation-panel {
  gap: 20px;
  padding: 28px 24px 24px;
  background: rgba(253, 251, 246, 0.94);
  border-right: 1px solid var(--eks-line);
  box-shadow: 1px 0 0 rgba(255, 255, 255, 0.7) inset;
}

.panel-header {
  align-items: flex-start;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--eks-line-soft);
}

.panel-header h1 {
  margin: 0;
  font-family: var(--eks-serif);
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--eks-navy);
  letter-spacing: 0;
}

.panel-header span {
  display: inline-block;
  margin-top: 7px;
  font-size: 11px;
  font-weight: 700;
  color: var(--eks-gold);
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.panel-header :deep(.el-button.is-circle) {
  width: 40px;
  height: 40px;
  color: #fff;
  background: var(--eks-navy);
  border-color: var(--eks-navy);
  border-radius: 8px;
  box-shadow: var(--eks-shadow-hairline);
}

.panel-header :deep(.el-button.is-circle:hover) {
  background: #214a7c;
  border-color: #214a7c;
  transform: translateY(-1px);
}

.panel-actions {
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid var(--eks-line-soft);
  border-radius: 8px;
}

.panel-actions :deep(.el-tag) {
  height: 24px;
  padding: 0 9px;
  font-size: 11px;
  font-weight: 700;
  color: var(--eks-gold);
  background: var(--eks-gold-soft);
  border-color: rgba(155, 122, 56, 0.22);
  border-radius: 999px;
}

.panel-actions :deep(.el-button) {
  height: 26px;
  padding: 0 10px;
  font-size: 12px;
  color: var(--eks-danger);
  background: transparent;
  border-color: rgba(150, 57, 57, 0.24);
  border-radius: 6px;
}

.conversation-search :deep(.el-input__wrapper) {
  min-height: 40px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid var(--eks-line);
  border-radius: 8px;
  box-shadow: none;
}

.conversation-search :deep(.el-input__wrapper.is-focus) {
  border-color: rgba(155, 122, 56, 0.55);
  box-shadow: 0 0 0 3px rgba(155, 122, 56, 0.1);
}

.conversation-search :deep(.el-input__inner) {
  color: var(--eks-ink);
  font-size: 13px;
}

.conversation-list {
  gap: 10px;
  padding-right: 4px;
  scrollbar-width: thin;
  scrollbar-color: var(--eks-line) transparent;
}

.conversation-list::-webkit-scrollbar,
.message-list::-webkit-scrollbar {
  width: 5px;
}

.conversation-list::-webkit-scrollbar-track,
.message-list::-webkit-scrollbar-track {
  background: transparent;
}

.conversation-list::-webkit-scrollbar-thumb,
.message-list::-webkit-scrollbar-thumb {
  background: var(--eks-line);
  border-radius: 999px;
}

.conversation-item {
  position: relative;
  gap: 9px;
  min-height: 74px;
  padding: 14px 15px 13px 17px;
  background: rgba(255, 255, 255, 0.54);
  border: 1px solid transparent;
  border-radius: 8px;
  box-shadow: none;
}

.conversation-item::before {
  position: absolute;
  top: 14px;
  bottom: 14px;
  left: 0;
  width: 3px;
  content: "";
  background: transparent;
  border-radius: 999px;
}

.conversation-item:hover {
  background: rgba(255, 255, 255, 0.86);
  border-color: var(--eks-line);
}

.conversation-item.active {
  background: #fff;
  border-color: rgba(23, 54, 93, 0.18);
  box-shadow: var(--eks-shadow-hairline);
}

.conversation-item.active::before {
  background: var(--eks-gold);
}

.conversation-title {
  font-family: var(--eks-serif);
  font-size: 14px;
  font-weight: 600;
  color: var(--eks-ink);
}

.conversation-meta {
  font-size: 11px;
  font-weight: 600;
  color: var(--eks-ink-subtle);
  letter-spacing: 0.02em;
}

.chat-main {
  min-height: 100vh;
  background: rgba(253, 251, 246, 0.58);
}

.chat-header {
  min-height: 86px;
  padding: 22px 34px;
  background: rgba(253, 251, 246, 0.86);
  border-bottom: 1px solid var(--eks-line);
  backdrop-filter: blur(14px);
}

.chat-header h2 {
  margin-bottom: 7px;
  font-family: var(--eks-serif);
  font-size: 25px;
  font-weight: 700;
  color: var(--eks-navy);
  letter-spacing: 0;
}

.chat-header span {
  font-size: 12px;
  font-weight: 600;
  color: var(--eks-gold);
  letter-spacing: 0.03em;
}

.header-actions {
  gap: 10px;
}

.header-actions :deep(.el-button),
.header-actions :deep(.el-select__wrapper) {
  height: 34px;
  font-size: 12px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.72);
  border-color: var(--eks-line);
  border-radius: 7px;
  box-shadow: none;
}

.header-actions :deep(.el-button--primary.is-plain) {
  color: var(--eks-navy);
  background: var(--eks-navy-soft);
  border-color: rgba(23, 54, 93, 0.2);
}

.header-actions :deep(.el-button--danger.is-plain) {
  color: var(--eks-danger);
  background: rgba(150, 57, 57, 0.05);
  border-color: rgba(150, 57, 57, 0.2);
}

.knowledge-select {
  width: 142px;
}

.message-list {
  gap: 28px;
  padding: 42px 42px 132px;
  background: var(--eks-surface);
}

.message-row {
  gap: 16px;
  max-width: min(900px, 84%);
}

.avatar {
  width: 42px;
  height: 42px;
  flex-basis: 42px;
  color: var(--eks-gold);
  background: #fff;
  border: 1px solid var(--eks-line);
  border-radius: 8px;
  box-shadow: var(--eks-shadow-hairline);
}

.message-row.user .avatar {
  color: #fff;
  background: var(--eks-navy);
  border-color: var(--eks-navy);
}

.message-bubble {
  max-width: min(760px, 70vw);
  padding: 20px 22px;
  background: #fff;
  border: 1px solid var(--eks-line-soft);
  border-left: 3px solid rgba(155, 122, 56, 0.5);
  border-radius: 10px;
  box-shadow: var(--eks-shadow-soft);
}

.message-row.assistant .message-bubble::after {
  display: block;
  padding-top: 14px;
  margin-top: 16px;
  font-size: 11px;
  font-weight: 700;
  color: var(--eks-gold);
  content: "文献参考 · Knowledge Retrieval Notes";
  border-top: 1px solid var(--eks-line-soft);
  letter-spacing: 0.08em;
}

.message-row.user .message-bubble {
  color: #fff;
  background: var(--eks-navy);
  border-color: var(--eks-navy);
  border-left-color: var(--eks-gold);
  box-shadow: 0 18px 42px rgba(23, 54, 93, 0.14);
}

.message-role {
  margin-bottom: 9px;
  font-size: 11px;
  font-weight: 800;
  color: var(--eks-gold);
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.message-row.user .message-role {
  color: rgba(255, 255, 255, 0.72);
}

.message-bubble p {
  font-family: var(--eks-serif);
  font-size: 17px;
  line-height: 1.85;
  color: var(--eks-ink);
}

.message-row.user .message-bubble p {
  color: #fff;
}

.message-list :deep(.el-empty) {
  align-self: center;
  padding: 54px 70px;
  background: rgba(255, 255, 255, 0.68);
  border: 1px dashed var(--eks-line);
  border-radius: 10px;
}

.message-list :deep(.el-empty__description p) {
  color: var(--eks-ink-subtle);
  font-size: 13px;
}

.composer {
  position: sticky;
  bottom: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  padding: 16px 34px 24px;
  background: rgba(253, 251, 246, 0.96);
  border-top: 1px solid var(--eks-line);
  backdrop-filter: blur(16px);
  box-shadow: 0 -20px 48px rgba(248, 245, 237, 0.72);
}

.composer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 28px;
}

.composer-label {
  font-size: 11px;
  font-weight: 800;
  color: var(--eks-gold);
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.composer-toolbar :deep(.el-tag) {
  height: 26px;
  padding: 0 10px;
  color: var(--eks-navy);
  background: var(--eks-navy-soft);
  border-color: rgba(23, 54, 93, 0.18);
  border-radius: 999px;
  font-weight: 700;
}

.composer-input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 104px;
  gap: 14px;
  align-items: stretch;
}

.composer :deep(.el-textarea__inner) {
  display: block;
  min-height: 68px !important;
  max-height: 148px;
  padding: 15px 16px;
  color: var(--eks-ink);
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid var(--eks-line);
  border-radius: 10px;
  box-shadow: var(--eks-shadow-hairline);
  font-family: var(--eks-serif);
  font-size: 15px;
  line-height: 1.7;
}

.composer :deep(.el-textarea__inner:focus) {
  border-color: rgba(155, 122, 56, 0.58);
  box-shadow: 0 0 0 3px rgba(155, 122, 56, 0.1);
}

.composer :deep(.el-textarea__inner::placeholder) {
  color: rgba(95, 98, 95, 0.58);
  font-style: italic;
}

.composer .el-button {
  align-self: stretch;
  width: 104px;
  height: 68px;
  min-height: 68px;
  color: #fff;
  background: var(--eks-navy);
  border-color: var(--eks-navy);
  border-radius: 10px;
  box-shadow: 0 14px 30px rgba(23, 54, 93, 0.15);
  font-weight: 800;
  letter-spacing: 0.08em;
}

.composer .el-button:hover {
  background: #214a7c;
  border-color: #214a7c;
  transform: translateY(-1px);
}

.composer .el-button.is-disabled,
.composer .el-button.is-disabled:hover {
  color: rgba(37, 37, 37, 0.38);
  background: var(--eks-surface-muted);
  border-color: var(--eks-line);
  box-shadow: none;
  transform: none;
}

:deep(.el-loading-mask) {
  background-color: rgba(253, 251, 246, 0.72);
  backdrop-filter: blur(3px);
}

:deep(.el-loading-spinner .path) {
  stroke: var(--eks-gold);
}

@media (max-width: 900px) {
  .chat-shell {
    grid-template-columns: 1fr;
  }

  .conversation-panel {
    max-height: 330px;
    border-right: none;
    border-bottom: 1px solid var(--eks-line);
  }

  .chat-main {
    min-height: calc(100vh - 330px);
  }

  .chat-header {
    align-items: flex-start;
    flex-direction: column;
    padding: 20px;
  }

  .header-actions {
    flex-wrap: wrap;
  }

  .message-list {
    padding: 28px 18px 108px;
  }

  .message-row {
    max-width: 100%;
  }

  .message-bubble {
    max-width: min(680px, 78vw);
  }

  .composer {
    grid-template-columns: 1fr;
    padding: 16px 18px 20px;
  }

  .composer-input-row {
    grid-template-columns: 1fr;
  }

  .composer .el-button {
    width: 100%;
    height: 44px;
    min-height: 44px;
  }
}

/* Latest user-chat visual tuning: style-only changes, no template/script logic touched. */
.conversation-panel {
  gap: 14px;
  padding: 18px 18px 16px;
}

.panel-header {
  padding-bottom: 12px;
}

.panel-header h1 {
  font-size: 25px;
}

.conversation-list {
  gap: 9px;
}

.conversation-item {
  min-height: 76px;
  padding: 14px 14px 13px 18px;
}

.conversation-title {
  font-size: 16px;
  line-height: 1.38;
}

.conversation-meta {
  font-size: 12px;
}

.message-list {
  padding-bottom: 142px;
}

.message-bubble p {
  font-size: 15px;
  line-height: 1.8;
}

.message-bubble .assistant-answer,
.message-bubble .markdown-body,
.message-bubble .markdown-body p,
.message-row.user .message-bubble p {
  font-size: 15px;
  line-height: 1.8;
}

.composer {
  width: calc(100% - 68px);
  max-width: none;
  margin: 0 auto 24px;
  padding: 0;
  background: transparent;
  border: none;
  border-radius: 0;
  backdrop-filter: none;
  box-shadow: none;
}

.composer-toolbar {
  justify-content: flex-start;
  min-height: 26px;
  padding: 0 2px 8px;
  background: transparent;
}

.knowledge-switch {
  display: inline-flex;
  gap: 3px;
  padding: 3px;
  background: rgba(255, 255, 255, 0.62);
  border: 1px solid rgba(222, 216, 202, 0.86);
  border-radius: 999px;
  box-shadow: var(--eks-shadow-hairline);
}

.knowledge-switch button {
  height: 28px;
  padding: 0 13px;
  color: var(--eks-ink-muted);
  background: transparent;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.knowledge-switch button:hover {
  color: var(--eks-navy);
  background: rgba(23, 54, 93, 0.06);
}

.knowledge-switch button.active {
  color: #fff;
  background: var(--eks-navy);
  box-shadow: 0 6px 16px rgba(23, 54, 93, 0.18);
}

.composer-input-row {
  grid-template-columns: minmax(0, 1fr) 48px;
  gap: 8px;
  align-items: center;
  padding: 8px;
  background: var(--eks-surface);
  border: 1px solid var(--eks-line);
  border-radius: 10px;
  box-shadow: 0 14px 36px rgba(23, 54, 93, 0.1);
}

.composer :deep(.el-textarea__inner) {
  min-height: 44px !important;
  height: 44px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 10px;
  box-shadow: none;
  font-size: 15px;
  line-height: 1.55;
}

.composer :deep(.el-textarea__inner:focus) {
  border-color: transparent;
  box-shadow: none;
}

.composer .el-button {
  align-self: center;
  width: 48px;
  height: 44px;
  min-height: 44px;
  padding: 0;
  color: #fff;
  background: var(--eks-navy);
  border-color: var(--eks-navy);
  border-radius: 8px;
}

.composer .el-button :deep(span) {
  display: none;
}

.composer .el-button:hover {
  background: #214a7c;
  border-color: #214a7c;
}

.composer .el-button.is-disabled,
.composer .el-button.is-disabled:hover {
  color: rgba(37, 37, 37, 0.38);
  background: var(--eks-surface-muted);
  border-color: var(--eks-line);
}

@media (max-width: 900px) {
  .conversation-panel {
    padding: 16px;
  }

  .conversation-title {
    font-size: 15px;
  }

  .message-list {
    padding-bottom: 134px;
  }

  .composer {
    width: calc(100% - 28px);
    max-width: none;
    margin-bottom: 14px;
    padding: 0;
  }

  .composer-toolbar {
    align-items: center;
    flex-direction: row;
  }

  .knowledge-switch {
    width: 100%;
  }

  .knowledge-switch button {
    flex: 1;
  }

  .composer-input-row {
    grid-template-columns: minmax(0, 1fr) 48px;
    padding: 8px;
  }

  .composer :deep(.el-textarea__inner) {
    height: 44px;
    min-height: 44px !important;
    padding: 10px 12px;
    font-size: 15px;
  }

  .composer .el-button {
    width: 48px;
    height: 44px;
    min-height: 44px;
  }
}
</style>
