<template>
  <div class="chat-app">
    <aside class="sidebar">
      <div class="brand">
        <div class="logo">知</div>
        <div class="brand-text">
          <h1>电商企业知识助手</h1>
          <p>Commerce Knowledge</p>
        </div>
      </div>

      <button class="new-chat-btn" @click="createChat">+ 新建对话</button>

      <div class="section-title">历史对话</div>

      <div class="session-list">
        <div
          v-for="chat in chats"
          :key="chat.id"
          class="session-item"
          :class="{ active: currentChatId === chat.id }"
          @click="selectChat(chat.id)"
        >
          <div class="session-content">
            <div class="session-title">{{ chat.title }}</div>
            <div class="session-desc">{{ chat.desc }}</div>
          </div>

          <button
            class="delete-btn"
            title="删除会话"
            @click.stop="deleteChat(chat.id)"
          >
            x
          </button>
        </div>
      </div>

      <div class="sidebar-fill">
        <div class="assistant-panel">
          <div class="assistant-panel-top">
            <div class="assistant-avatar robot-avatar" aria-hidden="true">
              <span class="robot-antenna"></span>
              <span class="robot-eye robot-eye-left"></span>
              <span class="robot-eye robot-eye-right"></span>
              <span class="robot-mouth"></span>
            </div>

            <div class="assistant-panel-copy">
              <div class="assistant-panel-title">智能知识助手</div>
              <p>企业知识库已就绪</p>
            </div>
          </div>

          <div class="assistant-topics">
            <span>履约</span>
            <span>售后</span>
            <span>商家</span>
            <span>营销</span>
          </div>
        </div>
      </div>

      <div class="user-area" @click="toggleUserMenu">
        <div class="avatar user-avatar">企</div>
        <div class="user-info">
          <div class="user-name">当前用户</div>
          <div class="user-status">在线</div>
        </div>

        <div v-if="showUserMenu" class="user-menu">
          <button @click.stop="logout">退出</button>
        </div>
      </div>
    </aside>

    <main class="main">
      <header class="chat-header">
        <h2>{{ currentChat?.title || '新对话' }}</h2>
      </header>

      <section class="messages">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message-row"
          :class="message.role"
        >
          <div
            v-if="message.role === 'assistant'"
            class="message-avatar robot-avatar"
            aria-hidden="true"
          >
            <span class="robot-antenna"></span>
            <span class="robot-eye robot-eye-left"></span>
            <span class="robot-eye robot-eye-right"></span>
            <span class="robot-mouth"></span>
          </div>

          <div class="message-bubble">
            {{ message.content }}
          </div>

          <div
            v-if="message.role === 'user'"
            class="message-avatar user-message-avatar"
            aria-hidden="true"
          >
            企
          </div>
        </div>
      </section>

      <footer class="input-area">
        <div class="tool-row">
          <button>上传文档</button>
          <button>联网检索</button>
          <button>知识库</button>
        </div>

        <div class="input-box">
          <textarea
            v-model="inputText"
            placeholder="输入你的问题..."
            @keydown.enter.exact.prevent="sendMessage"
          />

          <button
            class="send-btn"
            :disabled="!inputText.trim()"
            @click="sendMessage"
          >
            发送
          </button>
        </div>
      </footer>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const showUserMenu = ref(false)
const inputText = ref('')
const currentChatId = ref(1)

const chats = ref([
  {
    id: 1,
    title: '履约流程查询',
    desc: '今天 14:20',
  },
  {
    id: 2,
    title: 'POP 商家入驻规范',
    desc: '昨天 · 3 条消息',
  },
  {
    id: 3,
    title: '大促库存预警机制',
    desc: '周三 · 库存与补货规则',
  },
])

const messages = ref([
  {
    id: 1,
    role: 'assistant',
    content: '你好，我是电商企业知识助手。你可以查询订单履约、仓配协同、售后审核、商家管理、营销活动等内部业务知识。',
  },
  {
    id: 2,
    role: 'user',
    content: '自营订单从用户下单到出库履约，一般会经过哪些关键节点？',
  },
  {
    id: 3,
    role: 'assistant',
    content: '通常会经过订单创建、支付校验、库存锁定、仓库分配、拣货复核、打包称重、交接配送和签收回传等节点。不同品类、仓型和配送方式可能会有差异，实际以企业内部流程配置为准。',
  },
])

const currentChat = computed(() =>
  chats.value.find((chat) => chat.id === currentChatId.value)
)

function createChat() {
  const id = Date.now()

  chats.value.unshift({
    id,
    title: '新的内部知识咨询',
    desc: '刚刚',
  })

  currentChatId.value = id
  messages.value = []
}

function selectChat(id) {
  currentChatId.value = id
}

function deleteChat(id) {
  chats.value = chats.value.filter((chat) => chat.id !== id)

  if (currentChatId.value === id) {
    currentChatId.value = chats.value[0]?.id || null
  }
}

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value
}

function logout() {
  console.log('退出登录')
  showUserMenu.value = false
}

function sendMessage() {
  const content = inputText.value.trim()
  if (!content) return

  messages.value.push({
    id: Date.now(),
    role: 'user',
    content,
  })

  inputText.value = ''

  setTimeout(() => {
    messages.value.push({
      id: Date.now() + 1,
      role: 'assistant',
      content: '已收到你的问题。这里可以接入电商企业内部知识库，根据制度文档、运营手册、流程规范或 FAQ 返回更准确的业务答案。',
    })
  }, 400)
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.chat-app {
  display: flex;
  height: 100vh;
  min-width: 0;
  background: #f7f8fb;
  color: #20242a;
  font-family: Inter, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.sidebar {
  width: 280px;
  flex: 0 0 280px;
  display: flex;
  flex-direction: column;
  padding: 18px 14px;
  background: #f2f4f8;
  border-right: 1px solid #e4e7ee;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 8px 18px;
}

.logo {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #ffffff;
  font-weight: 700;
  background: linear-gradient(135deg, #5b8def, #7c6ee6);
}

.brand-text h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.brand-text p {
  margin: 3px 0 0;
  font-size: 12px;
  color: #8a92a3;
}

.new-chat-btn {
  height: 42px;
  border: none;
  border-radius: 10px;
  background: #5f7fe8;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}

.new-chat-btn:hover {
  background: #4f70d8;
  transform: translateY(-1px);
}

.section-title {
  margin: 22px 8px 10px;
  font-size: 12px;
  color: #8a92a3;
}

.session-list {
  flex: 0 1 auto;
  max-height: min(260px, 34vh);
  overflow-y: auto;
  padding-right: 2px;
}

.session-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 58px;
  padding: 10px 36px 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.session-item:hover {
  background: #e9edf6;
}

.session-item.active {
  background: #e3e9fb;
}

.session-content {
  min-width: 0;
}

.session-title {
  font-size: 14px;
  color: #242833;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-desc {
  margin-top: 4px;
  font-size: 12px;
  color: #8a92a3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delete-btn {
  position: absolute;
  right: 8px;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #9aa2b3;
  font-size: 16px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease, background 0.2s ease;
}

.session-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: #dfe4ef;
  color: #d24b4b;
}

.sidebar-fill {
  flex: 1;
  min-height: 170px;
  display: flex;
  align-items: flex-start;
  padding: 16px 2px 12px;
}

.assistant-panel {
  width: 100%;
  padding: 14px;
  border: 1px solid #e3e8f3;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #eef3ff 100%);
  box-shadow: 0 10px 26px rgba(49, 67, 110, 0.06);
}

.assistant-panel-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.assistant-avatar {
  width: 58px;
  height: 58px;
  flex: 0 0 58px;
}

.assistant-panel-copy {
  min-width: 0;
}

.assistant-panel-title {
  font-size: 14px;
  font-weight: 700;
  color: #26345f;
}

.assistant-panel-copy p {
  margin: 5px 0 0;
  font-size: 12px;
  color: #7c879b;
}

.assistant-topics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin-top: 14px;
}

.assistant-topics span {
  min-width: 0;
  padding: 6px 0;
  border-radius: 8px;
  background: rgba(95, 127, 232, 0.08);
  color: #5266a8;
  font-size: 12px;
  text-align: center;
}

.robot-avatar {
  position: relative;
  display: grid;
  place-items: center;
  border: 1px solid rgba(95, 127, 232, 0.24);
  border-radius: 16px;
  background: linear-gradient(135deg, #f6f9ff 0%, #dfe8ff 100%);
  box-shadow: inset 0 -10px 16px rgba(95, 127, 232, 0.12);
}

.robot-avatar::after {
  content: "";
  position: absolute;
  inset: 18% 15% 20%;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.72);
}

.robot-antenna {
  position: absolute;
  top: -8px;
  left: 50%;
  z-index: 1;
  width: 2px;
  height: 10px;
  background: #9aa9e8;
  transform: translateX(-50%);
}

.robot-antenna::before {
  content: "";
  position: absolute;
  top: -5px;
  left: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #5f7fe8;
  transform: translateX(-50%);
}

.robot-eye,
.robot-mouth {
  position: absolute;
  z-index: 2;
}

.robot-eye {
  top: 42%;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #556bca;
}

.robot-eye-left {
  left: 32%;
}

.robot-eye-right {
  right: 32%;
}

.robot-mouth {
  left: 50%;
  bottom: 28%;
  width: 18px;
  height: 3px;
  border-radius: 999px;
  background: #7b8ed8;
  transform: translateX(-50%);
}

.user-area {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.user-area:hover {
  background: #e9edf6;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #ffffff;
  background: #7083cc;
  font-weight: 600;
}

.user-avatar,
.user-message-avatar {
  background: linear-gradient(135deg, #30466f, #607edb);
  box-shadow: inset 0 -8px 12px rgba(255, 255, 255, 0.16);
  letter-spacing: 0;
}

.user-name {
  font-size: 14px;
}

.user-status {
  margin-top: 2px;
  font-size: 12px;
  color: #8a92a3;
}

.user-menu {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 58px;
  padding: 6px;
  border: 1px solid #e2e6ef;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(28, 38, 70, 0.12);
}

.user-menu button {
  width: 100%;
  height: 34px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #d24b4b;
  cursor: pointer;
}

.user-menu button:hover {
  background: #f7eeee;
}

.main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fbfcff;
}

.chat-header {
  height: 58px;
  display: flex;
  align-items: center;
  padding: 0 28px;
  border-bottom: 1px solid #edf0f5;
  background: rgba(251, 252, 255, 0.9);
}

.chat-header h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #303542;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 32px 12%;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 18px;
}

.message-row.assistant {
  justify-content: flex-start;
}

.message-row.user {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 68%;
  padding: 13px 16px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.7;
  word-break: break-word;
}

.message-avatar {
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  margin-top: 2px;
}

.message-avatar.robot-avatar {
  border-radius: 12px;
}

.message-avatar .robot-antenna {
  top: -6px;
  height: 8px;
}

.message-avatar .robot-antenna::before {
  width: 7px;
  height: 7px;
}

.message-avatar .robot-eye {
  width: 5px;
  height: 5px;
}

.message-avatar .robot-mouth {
  width: 14px;
  height: 3px;
}

.user-message-avatar {
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
}

.message-row.assistant .message-bubble {
  background: #ffffff;
  border: 1px solid #edf0f5;
  color: #252a35;
}

.message-row.user .message-bubble {
  background: #eef3ff;
  color: #26345f;
}

.input-area {
  padding: 14px 12% 24px;
  background: #fbfcff;
}

.tool-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.tool-row button {
  height: 30px;
  padding: 0 12px;
  border: 1px solid #e1e6f0;
  border-radius: 8px;
  background: #ffffff;
  color: #687184;
  font-size: 12px;
  cursor: pointer;
}

.tool-row button:hover {
  background: #f2f5fb;
  color: #4f70d8;
}

.input-box {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 12px;
  border: 1px solid #dfe5f0;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(34, 44, 70, 0.06);
}

textarea {
  flex: 1;
  min-height: 48px;
  max-height: 140px;
  resize: none;
  border: none;
  outline: none;
  font-size: 14px;
  line-height: 1.6;
  color: #222631;
  font-family: inherit;
}

textarea::placeholder {
  color: #a4acbb;
}

.send-btn {
  width: 72px;
  height: 38px;
  border: none;
  border-radius: 10px;
  background: #5f7fe8;
  color: #ffffff;
  cursor: pointer;
  transition: background 0.2s ease;
}

.send-btn:hover:not(:disabled) {
  background: #4f70d8;
}

.send-btn:disabled {
  cursor: not-allowed;
  background: #c8d0e6;
}

@media (max-width: 760px) {
  .chat-app {
    flex-direction: column;
    height: 100svh;
  }

  .sidebar {
    width: 100%;
    flex: 0 0 auto;
    max-height: 46svh;
    border-right: none;
    border-bottom: 1px solid #e4e7ee;
  }

  .session-list {
    max-height: 120px;
  }

  .sidebar-fill {
    display: none;
  }

  .messages,
  .input-area {
    padding-right: 20px;
    padding-left: 20px;
  }

  .message-bubble {
    max-width: calc(100% - 48px);
  }
}
</style>
