<template>
  <AdminLayout @menu-change="currentTab = $event">
    <section v-if="currentTab === 'dashboard'" class="dashboard-panel">
      <div class="pane-card">
        <div class="dashboard-header">
          <div>
            <h2>仪表台参数</h2>
            <p>当前生效配置来源：{{ dashboardConfig.source || '-' }}</p>
          </div>
          <div class="dashboard-actions">
            <el-tag v-if="dashboardConfig.version" type="success" effect="plain">
              v{{ dashboardConfig.version.version_no }} · {{ dashboardConfig.version.status }}
            </el-tag>
            <el-button @click="fetchDashboardConfig">刷新</el-button>
            <el-button type="primary" @click="openConfigModal">修改参数</el-button>
          </div>
        </div>

        <div class="param-grid" v-loading="dashboardLoading">
          <div class="param-card">
            <span>模型</span>
            <strong>{{ dashboardConfig.model || '-' }}</strong>
          </div>
          <div class="param-card">
            <span>Embedding</span>
            <strong>{{ dashboardConfig.embedding_model || '-' }}</strong>
          </div>
          <div class="param-card">
            <span>重排模型</span>
            <strong>{{ dashboardConfig.rerank_model || '-' }}</strong>
          </div>
          <div class="param-card">
            <span>变体生成</span>
            <strong>{{ dashboardConfig.variant_generation_enabled ? '开' : '关' }}</strong>
          </div>
          <div class="param-card">
            <span>重排</span>
            <strong>{{ dashboardConfig.rerank_enabled ? '开' : '关' }}</strong>
          </div>
        </div>
      </div>

      <div class="dashboard-two-column">
        <div class="pane-card">
          <h3>TopK</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="FAQ">{{ dashboardConfig.top_k?.faq ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="Doc">{{ dashboardConfig.top_k?.doc ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="Rerank">{{ dashboardConfig.top_k?.rerank ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="Final Evidence">
              {{ dashboardConfig.top_k?.final_evidence ?? '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="pane-card">
          <h3>阈值</h3>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="FAQ 高置信">
              {{ dashboardConfig.thresholds?.faq_high_conf ?? '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="FAQ 中置信">
              {{ dashboardConfig.thresholds?.faq_middle_conf ?? '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="文档证据">
              {{ dashboardConfig.thresholds?.doc_evidence ?? '-' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <div class="pane-card">
        <h3>权重</h3>
        <el-descriptions :column="4" border>
          <el-descriptions-item label="FAQ Dense">{{ dashboardConfig.weights?.faq_dense ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="FAQ Sparse">{{ dashboardConfig.weights?.faq_sparse ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="Doc Dense">{{ dashboardConfig.weights?.doc_dense ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="Doc Sparse">{{ dashboardConfig.weights?.doc_sparse ?? '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </section>

    <section v-if="currentTab === 'users'" class="pane-card">
      <div class="filter-wrapper">
        <el-input v-model="userQuery.keyword" placeholder="搜索账号或显示名称" class="filter-item search-input" clearable />
        <el-select v-model="userQuery.role" placeholder="用户角色" class="filter-item" clearable>
          <el-option label="管理员(admin)" value="admin" />
          <el-option label="普通用户(user)" value="user" />
        </el-select>
        <el-select v-model="userQuery.status" placeholder="用户状态" class="filter-item" clearable>
          <el-option label="正常启用" value="enabled" />
          <el-option label="已停用" value="disabled" />
        </el-select>
        <el-button type="primary" @click="fetchUsers">查询</el-button>
        <el-button @click="resetUserQuery">重置</el-button>
        <el-button type="primary" plain class="right-action" @click="openUserModal('add')">新增用户</el-button>
      </div>

      <el-table :data="userList" v-loading="loading" style="width: 100%">
        <el-table-column prop="userId" label="用户ID" width="110" />
        <el-table-column prop="username" label="账号" />
        <el-table-column prop="displayName" label="显示名称" />
        <el-table-column prop="department" label="部门" />
        <el-table-column prop="role" label="角色">
          <template #default="scope">
            <el-tag :type="scope.row.role === 'admin' ? 'danger' : 'info'" size="small">
              {{ scope.row.role }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="knowledgeBaseName" label="知识库类型" width="130" />
        <el-table-column prop="status" label="状态">
          <template #default="scope">
            <span class="status-dot" :class="scope.row.status"></span>
            {{ scope.row.status === 'enabled' ? '正常启用' : '已停用' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="180" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button link type="primary" @click="openUserModal('edit', scope.row)">修改</el-button>
            <el-button
              v-if="scope.row.status === 'enabled' && scope.row.userId !== currentUserId"
              link
              type="danger"
              @click="disableUser(scope.row.userId)"
            >
              禁用
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section v-if="currentTab === 'history'" class="history-panel">
      <div class="pane-card history-toolbar">
        <div class="history-title">
          <h2>历史会话管理</h2>
          <p>按用户隔离查看用户端会话，管理每次会话的消息列表和消息数量。</p>
        </div>
        <div class="filter-wrapper history-filter">
          <el-select
            v-model="historyQuery.userId"
            placeholder="选择用户"
            class="filter-item"
            clearable
            filterable
            @change="fetchConversationHistory"
          >
            <el-option
              v-for="user in historyUserOptions"
              :key="user.userId"
              :label="`${user.displayName}（${user.username}）`"
              :value="user.userId"
            />
          </el-select>
          <el-select
            v-model="historyQuery.knowledge_base_type"
            placeholder="知识库类型"
            class="filter-item"
            clearable
            @change="fetchConversationHistory"
          >
            <el-option label="企业知识库" value="enterprise" />
            <el-option label="个人知识库" value="personal" />
          </el-select>
          <el-input
            v-model="historyQuery.keyword"
            placeholder="搜索会话标题或消息内容"
            class="filter-item history-search-input"
            clearable
            @keyup.enter="fetchConversationHistory"
          />
          <el-button type="primary" @click="fetchConversationHistory">查询</el-button>
          <el-button @click="resetHistoryQuery">重置</el-button>
        </div>
      </div>

      <div class="history-summary-grid">
        <div class="history-summary-card">
          <span>当前会话数</span>
          <strong>{{ historySummary.sessionCount }}</strong>
        </div>
        <div class="history-summary-card">
          <span>消息总数</span>
          <strong>{{ historySummary.messageCount }}</strong>
        </div>
        <div class="history-summary-card">
          <span>涉及用户</span>
          <strong>{{ historySummary.userCount }}</strong>
        </div>
        <div class="history-summary-card">
          <span>数据来源</span>
          <strong>{{ historyDataMode === 'api' ? '后端接口' : '演示数据' }}</strong>
        </div>
      </div>

      <div class="pane-card">
        <el-table :data="conversationHistory" v-loading="historyLoading" style="width: 100%">
          <el-table-column prop="conversationId" label="会话ID" width="150" />
          <el-table-column label="用户" min-width="180">
            <template #default="scope">
              <div class="history-user-cell">
                <strong>{{ scope.row.displayName }}</strong>
                <span>{{ scope.row.username }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="会话标题" min-width="220" show-overflow-tooltip />
          <el-table-column prop="knowledgeBaseName" label="知识库类型" width="130" />
          <el-table-column prop="messageCount" label="消息数量" width="110" align="center" />
          <el-table-column prop="lastMessageAt" label="最后消息时间" width="180" />
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="scope">
              <el-button link type="primary" @click="openHistoryMessages(scope.row)">消息列表</el-button>
              <el-button link type="danger" @click="deleteHistoryConversation(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </section>

    <section v-if="currentTab === 'knowledge'" class="pane-card">
      <div class="filter-wrapper">
        <el-input v-model="kbQuery.keyword" placeholder="搜索知识库名称" class="filter-item search-input" clearable />
        <el-select v-model="kbQuery.status" placeholder="知识库状态" class="filter-item" clearable>
          <el-option label="已启用" value="enabled" />
          <el-option label="已停用" value="disabled" />
          <el-option label="正在处理" value="processing" />
          <el-option label="处理失败" value="failed" />
        </el-select>
        <el-button type="primary" @click="fetchKBs">查询</el-button>
        <el-button type="primary" plain class="right-action" @click="kbUploadVisible = true">上传知识库</el-button>
      </div>

      <el-table :data="kbList" style="width: 100%">
        <el-table-column prop="knowledgeBaseId" label="知识库ID" width="130" />
        <el-table-column prop="name" label="名称" width="180" />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="documentCount" label="文件数" width="100" align="center" />
        <el-table-column prop="status" label="状态" width="120">
          <template #default="scope">
            <el-tag :type="getKbTagType(scope.row.status)" size="small">{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="scope">
            <el-button
              v-if="scope.row.status === 'disabled'"
              link
              type="primary"
              @click="updateKbStatus(scope.row.knowledgeBaseId, 'enabled')"
            >
              启用
            </el-button>
            <el-button
              v-if="scope.row.status === 'enabled'"
              link
              type="warning"
              @click="updateKbStatus(scope.row.knowledgeBaseId, 'disabled')"
            >
              停用
            </el-button>
            <el-button link type="danger" @click="deleteKB(scope.row.knowledgeBaseId)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section v-if="currentTab === 'evaluations'">
      <div v-if="!activeEvalId" class="pane-card">
        <div class="filter-wrapper">
          <el-select v-model="evalQuery.status" placeholder="任务状态" class="filter-item" clearable>
            <el-option label="待执行" value="pending" />
            <el-option label="执行中" value="running" />
            <el-option label="已完成" value="completed" />
            <el-option label="执行失败" value="failed" />
          </el-select>
          <el-button type="primary" @click="fetchEvals">查询</el-button>
          <el-button type="primary" class="right-action" @click="createEvalVisible = true">新建评估任务</el-button>
        </div>

        <el-table :data="evalList" style="width: 100%">
          <el-table-column prop="evaluationId" label="任务ID" width="130" />
          <el-table-column prop="name" label="任务名称" />
          <el-table-column prop="knowledgeBaseName" label="关联知识库" />
          <el-table-column prop="status" label="状态">
            <template #default="scope">
              <el-tag :type="getEvalTagType(scope.row.status)">{{ scope.row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="averageScore" label="平均分">
            <template #default="scope">
              <span v-if="scope.row.averageScore" class="score-text">{{ scope.row.averageScore }}</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="scope">
              <el-button link type="primary" @click="viewEvalDetail(scope.row.evaluationId)">查看报告</el-button>
              <el-button link type="danger" @click="deleteEval(scope.row.evaluationId)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div v-else class="eval-detail-container">
        <el-button :icon="ArrowLeft" class="back-btn" @click="activeEvalId = null">返回列表</el-button>

        <div class="metrics-grid">
          <div class="metric-card highlight">
            <div class="m-label">平均总得分</div>
            <div class="m-val">{{ evalDetail.summary?.averageScore }}</div>
          </div>
          <div class="metric-card">
            <div class="m-label">检索召回</div>
            <div class="m-val">{{ evalDetail.summary?.retrievalRecall }}</div>
          </div>
          <div class="metric-card">
            <div class="m-label">回答相关性</div>
            <div class="m-val">{{ evalDetail.summary?.answerRelevance }}</div>
          </div>
          <div class="metric-card">
            <div class="m-label">忠实度</div>
            <div class="m-val">{{ evalDetail.summary?.faithfulness }}</div>
          </div>
          <div class="metric-card">
            <div class="m-label">回答质量</div>
            <div class="m-val">{{ evalDetail.summary?.responseQuality }}</div>
          </div>
        </div>

        <div class="pane-card table-wrapper">
          <h2>评测样本细则（共 {{ evalDetail.summary?.questionCount }} 项）</h2>
          <el-table :data="evalDetail.items" border style="width: 100%">
            <el-table-column prop="question" label="评估问题" width="240" />
            <el-table-column prop="answer" label="大模型输出回答" show-overflow-tooltip />
            <el-table-column prop="score" label="单项得分" width="100" align="center" />
            <el-table-column prop="retrievedDocumentCount" label="检索文档数" width="110" align="center" />
            <el-table-column prop="comment" label="分析评语" />
          </el-table>
        </div>
      </div>
    </section>

    <el-drawer v-model="historyDrawerVisible" size="560px" :title="activeHistorySession?.title || '会话消息列表'">
      <div v-if="activeHistorySession" class="history-drawer-meta">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="用户">
            {{ activeHistorySession.displayName }}（{{ activeHistorySession.username }}）
          </el-descriptions-item>
          <el-descriptions-item label="知识库类型">
            {{ activeHistorySession.knowledgeBaseName }}
          </el-descriptions-item>
          <el-descriptions-item label="消息数量">
            {{ activeHistorySession.messageCount }}
          </el-descriptions-item>
          <el-descriptions-item label="最后消息时间">
            {{ activeHistorySession.lastMessageAt }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="history-message-list" v-loading="historyMessageLoading">
        <div
          v-for="message in activeHistoryMessages"
          :key="message.messageId"
          class="history-message-item"
          :class="message.role"
        >
          <div class="history-message-head">
            <el-tag size="small" :type="message.role === 'assistant' ? 'primary' : 'success'" effect="plain">
              {{ message.role === 'assistant' ? '助手' : '用户' }}
            </el-tag>
            <span>{{ message.createdAt }}</span>
          </div>
          <p>{{ message.content }}</p>
        </div>

        <el-empty v-if="!historyMessageLoading && activeHistoryMessages.length === 0" description="暂无消息记录" />
      </div>
    </el-drawer>

    <el-dialog v-model="userModalVisible" :title="userModalType === 'add' ? '新增用户' : '修改用户信息'" width="480px">
      <el-form :model="userForm" label-position="top">
        <el-form-item v-if="userModalType === 'add'" label="用户账号">
          <el-input v-model="userForm.username" placeholder="请输入用于登录的唯一账号" />
        </el-form-item>
        <el-form-item v-if="userModalType === 'add'" label="初始密码">
          <el-input v-model="userForm.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="显示名称">
          <el-input v-model="userForm.displayName" placeholder="请输入对外展示的名称" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="userForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="部门">
          <el-input v-model="userForm.department" placeholder="请输入部门" />
        </el-form-item>
        <el-form-item label="角色设定">
          <el-radio-group v-model="userForm.role">
            <el-radio value="user">普通用户(user)</el-radio>
            <el-radio value="admin">管理员(admin)</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="userForm.role === 'user'" label="知识库类型">
          <el-radio-group v-model="userForm.category">
            <el-radio value="merchant">企业知识库</el-radio>
            <el-radio value="individual">个人知识库</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="账号状态">
          <el-switch
            v-model="userForm.status"
            active-text="正常启用"
            active-value="enabled"
            inactive-text="停用"
            inactive-value="disabled"
          />
        </el-form-item>
        <el-form-item label="备注说明">
          <el-input v-model="userForm.remark" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="userModalVisible = false">取消</el-button>
        <el-button type="primary" @click="submitUserForm">确定保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="configModalVisible" title="修改仪表台参数" width="720px">
      <el-form :model="configForm" label-position="top">
        <div class="two-column">
          <el-form-item label="模型">
            <el-input v-model="configForm.model" />
          </el-form-item>
          <el-form-item label="Embedding 模型">
            <el-input v-model="configForm.embedding_model" />
          </el-form-item>
        </div>
        <el-form-item label="重排模型">
          <el-input v-model="configForm.rerank_model" />
        </el-form-item>
        <div class="two-column">
          <el-form-item label="变体生成">
            <el-switch v-model="configForm.variant_generation_enabled" active-text="开" inactive-text="关" />
          </el-form-item>
          <el-form-item label="重排">
            <el-switch v-model="configForm.rerank_enabled" active-text="开" inactive-text="关" />
          </el-form-item>
        </div>

        <h4>TopK</h4>
        <div class="four-column">
          <el-form-item label="FAQ">
            <el-input-number v-model="configForm.faq_k" :min="1" />
          </el-form-item>
          <el-form-item label="Doc">
            <el-input-number v-model="configForm.doc_k" :min="1" />
          </el-form-item>
          <el-form-item label="Rerank">
            <el-input-number v-model="configForm.rerank_top_k" :min="1" />
          </el-form-item>
          <el-form-item label="Final Evidence">
            <el-input-number v-model="configForm.final_evidence_top_k" :min="1" />
          </el-form-item>
        </div>

        <h4>阈值</h4>
        <div class="three-column">
          <el-form-item label="FAQ 高置信">
            <el-input-number v-model="configForm.faq_high_conf_threshold" :min="0" :max="1" :step="0.01" />
          </el-form-item>
          <el-form-item label="FAQ 中置信">
            <el-input-number v-model="configForm.faq_middle_conf_threshold" :min="0" :max="1" :step="0.01" />
          </el-form-item>
          <el-form-item label="文档证据">
            <el-input-number v-model="configForm.doc_evidence_threshold" :min="0" :max="1" :step="0.01" />
          </el-form-item>
        </div>

        <h4>权重</h4>
        <div class="four-column">
          <el-form-item label="FAQ Dense">
            <el-input-number v-model="configForm.faq_dense_weight" :min="0" :max="1" :step="0.01" />
          </el-form-item>
          <el-form-item label="FAQ Sparse">
            <el-input-number v-model="configForm.faq_sparse_weight" :min="0" :max="1" :step="0.01" />
          </el-form-item>
          <el-form-item label="Doc Dense">
            <el-input-number v-model="configForm.doc_dense_weight" :min="0" :max="1" :step="0.01" />
          </el-form-item>
          <el-form-item label="Doc Sparse">
            <el-input-number v-model="configForm.doc_sparse_weight" :min="0" :max="1" :step="0.01" />
          </el-form-item>
        </div>

        <el-form-item label="版本说明">
          <el-input v-model="configDescription" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="configModalVisible = false">取消</el-button>
        <el-button type="primary" :loading="configSaving" @click="submitConfigForm">保存并启用</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="kbUploadVisible" title="创建并导入知识库" width="540px">
      <el-form :model="kbForm" label-position="top">
        <el-form-item label="知识库名称" required>
          <el-input v-model="kbForm.name" placeholder="请输入知识库名称" />
        </el-form-item>
        <el-form-item label="业务描述">
          <el-input v-model="kbForm.description" type="textarea" placeholder="说明该知识库的知识覆盖范围" />
        </el-form-item>
        <el-form-item label="文件上传">
          <el-upload class="upload-drag" drag action="#" :auto-upload="false">
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">将文件拖到此处，或 <em>点击上传</em></div>
          </el-upload>
        </el-form-item>
        <div class="two-column">
          <el-form-item label="文本切分长度">
            <el-input-number v-model="kbForm.chunkSize" :min="100" :step="50" />
          </el-form-item>
          <el-form-item label="重叠长度">
            <el-input-number v-model="kbForm.chunkOverlap" :min="0" :step="10" />
          </el-form-item>
        </div>
        <el-form-item>
          <el-checkbox v-model="kbForm.autoEnable">处理完成后自动启用</el-checkbox>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="kbUploadVisible = false">取消</el-button>
        <el-button type="primary" @click="submitKbUpload">开始导入</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="createEvalVisible" title="发起 RAG 评估任务" width="540px">
      <el-form :model="newEvalForm" label-position="top">
        <el-form-item label="评估任务名称" required>
          <el-input v-model="newEvalForm.name" placeholder="例如：核心业务库第二轮评测" />
        </el-form-item>
        <el-form-item label="目标评估知识库" required>
          <el-select v-model="newEvalForm.knowledgeBaseId" style="width: 100%">
            <el-option
              v-for="item in kbList"
              :key="item.knowledgeBaseId"
              :label="item.name"
              :value="item.knowledgeBaseId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="选择评估指标">
          <el-checkbox-group v-model="newEvalForm.metrics">
            <el-checkbox value="retrieval_recall">检索召回率</el-checkbox>
            <el-checkbox value="answer_relevance">回答相关性</el-checkbox>
            <el-checkbox value="faithfulness">忠实度</el-checkbox>
            <el-checkbox value="response_quality">综合回答质量</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createEvalVisible = false">取消</el-button>
        <el-button type="primary" @click="submitCreateEval">提交任务</el-button>
      </template>
    </el-dialog>
  </AdminLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, UploadFilled } from '@element-plus/icons-vue'
import {
  deleteAdminConversation,
  getAdminConversationMessages,
  getAdminConversationUsers,
  getAdminConversations
} from '@/api/adminConversations'
import { createConfigVersion, getDashboardConfig } from '@/api/adminConfig'
import { createAdminUser, disableAdminUser, getAdminUsers, updateAdminUser } from '@/api/adminUsers'
import AdminLayout from '@/layouts/AdminLayout.vue'

const currentTab = ref('dashboard')
const loading = ref(false)
const currentUserId = JSON.parse(localStorage.getItem('userInfo') || '{}').id
const dashboardLoading = ref(false)
const dashboardConfig = ref({})
const configModalVisible = ref(false)
const configSaving = ref(false)
const configDescription = ref('')
const configForm = reactive({
  model: '',
  embedding_model: '',
  rerank_model: '',
  variant_generation_enabled: true,
  rerank_enabled: true,
  faq_k: 20,
  doc_k: 20,
  rerank_top_k: 8,
  final_evidence_top_k: 6,
  faq_high_conf_threshold: 0.85,
  faq_middle_conf_threshold: 0.65,
  doc_evidence_threshold: 0.55,
  faq_dense_weight: 0.5,
  faq_sparse_weight: 0.5,
  doc_dense_weight: 0.7,
  doc_sparse_weight: 0.3
})

const editableConfigKeys = Object.keys(configForm)

const fetchDashboardConfig = async () => {
  dashboardLoading.value = true
  try {
    dashboardConfig.value = await getDashboardConfig()
  } catch (error) {
    ElMessage.error(error.message || '仪表台参数加载失败')
  } finally {
    dashboardLoading.value = false
  }
}

const openConfigModal = () => {
  const raw = dashboardConfig.value.raw || {}
  editableConfigKeys.forEach((key) => {
    if (raw[key] !== undefined) {
      configForm[key] = raw[key]
    }
  })
  configDescription.value = `调整仪表台参数 ${new Date().toLocaleString()}`
  configModalVisible.value = true
}

const submitConfigForm = async () => {
  const raw = dashboardConfig.value.raw || {}
  const nextConfig = { ...raw }
  editableConfigKeys.forEach((key) => {
    nextConfig[key] = configForm[key]
  })

  configSaving.value = true
  try {
    await createConfigVersion({
      config: nextConfig,
      description: configDescription.value,
      activate: true
    })
    ElMessage.success('参数已保存并启用')
    configModalVisible.value = false
    fetchDashboardConfig()
  } catch (error) {
    ElMessage.error(error.message || '参数保存失败')
  } finally {
    configSaving.value = false
  }
}

const userQuery = reactive({ keyword: '', role: '', status: '' })
const userList = ref([])
const userModalVisible = ref(false)
const userModalType = ref('add')
const userForm = reactive({
  userId: '',
  username: '',
  password: '',
  name: '',
  displayName: '',
  department: '',
  role: 'user',
  status: 'enabled',
  category: 'merchant',
  remark: ''
})

const fetchUsers = async () => {
  loading.value = true
  try {
    const data = await getAdminUsers(userQuery)
    userList.value = data.items || []
  } catch (error) {
    ElMessage.error(error.message || '用户列表加载失败')
  } finally {
    loading.value = false
  }
}

const openUserModal = (type, row = null) => {
  userModalType.value = type
  userModalVisible.value = true
  if (type === 'edit' && row) {
    Object.assign(userForm, row)
    return
  }

  Object.assign(userForm, {
    userId: '',
    username: '',
    password: '',
    name: '',
    displayName: '',
    department: '',
    role: 'user',
    status: 'enabled',
    category: 'merchant',
    remark: ''
  })
}

const buildUserPayload = () => ({
  username: userForm.username,
  password: userForm.password || undefined,
  displayName: userForm.displayName,
  name: userForm.name || userForm.displayName,
  department: userForm.department,
  role: userForm.role,
  status: userForm.status,
  category: userForm.role === 'admin' ? 'admin' : userForm.category
})

const submitUserForm = async () => {
  try {
    if (userModalType.value === 'add') {
      await createAdminUser(buildUserPayload())
      ElMessage.success('用户创建成功')
    } else {
      await updateAdminUser(userForm.userId, buildUserPayload())
      ElMessage.success('用户信息已更新')
    }
    userModalVisible.value = false
    fetchUsers()
  } catch (error) {
    ElMessage.error(error.message || '用户保存失败')
  }
}

const disableUser = (id) => {
  ElMessageBox.confirm('确定禁用该账号吗？禁用后该用户不能继续登录。', '提示', { type: 'warning' })
    .then(async () => {
      await disableAdminUser(id)
      ElMessage.success(`用户 ${id} 已禁用`)
      fetchUsers()
    })
    .catch(() => {})
}

const resetUserQuery = () => {
  Object.assign(userQuery, { keyword: '', role: '', status: '' })
  fetchUsers()
}

const historyLoading = ref(false)
const historyMessageLoading = ref(false)
const historyDrawerVisible = ref(false)
const historyFallbackNotified = ref(false)
const historyDataMode = ref('api')
const historyUserOptions = ref([])
const conversationHistory = ref([])
const activeHistorySession = ref(null)
const activeHistoryMessages = ref([])
const historyQuery = reactive({
  userId: '',
  knowledge_base_type: '',
  keyword: ''
})

const demoHistoryUsers = [
  { userId: 101, username: 'merchant_user', displayName: '企业用户A' },
  { userId: 102, username: 'personal_user', displayName: '个人用户B' },
  { userId: 103, username: 'service_user', displayName: '客服测试用户' }
]

const demoConversationHistory = ref([
  {
    conversationId: 'conv_10001',
    userId: 101,
    username: 'merchant_user',
    displayName: '企业用户A',
    title: '企业店保证金咨询',
    knowledgeBaseType: 'enterprise',
    knowledgeBaseName: '企业知识库',
    messageCount: 4,
    lastMessageAt: '2026-06-22 09:35:12'
  },
  {
    conversationId: 'conv_10002',
    userId: 102,
    username: 'personal_user',
    displayName: '个人用户B',
    title: '个人店入驻资料要求',
    knowledgeBaseType: 'personal',
    knowledgeBaseName: '个人知识库',
    messageCount: 3,
    lastMessageAt: '2026-06-22 10:14:28'
  },
  {
    conversationId: 'conv_10003',
    userId: 101,
    username: 'merchant_user',
    displayName: '企业用户A',
    title: '发票和结算规则',
    knowledgeBaseType: 'enterprise',
    knowledgeBaseName: '企业知识库',
    messageCount: 5,
    lastMessageAt: '2026-06-22 11:02:46'
  }
])

const demoHistoryMessages = ref({
  conv_10001: [
    {
      messageId: 'msg_10001_1',
      role: 'user',
      content: '企业店保证金怎么收取？',
      createdAt: '2026-06-22 09:31:02'
    },
    {
      messageId: 'msg_10001_2',
      role: 'assistant',
      content: '企业店保证金通常按经营类目、店铺类型和平台规则收取，具体金额以后端知识库返回为准。',
      createdAt: '2026-06-22 09:31:05'
    },
    {
      messageId: 'msg_10001_3',
      role: 'user',
      content: '如果多个类目一起经营怎么办？',
      createdAt: '2026-06-22 09:34:51'
    },
    {
      messageId: 'msg_10001_4',
      role: 'assistant',
      content: '多类目经营通常需要按平台规则取较高标准或分别校验，建议结合具体类目查询。',
      createdAt: '2026-06-22 09:35:12'
    }
  ],
  conv_10002: [
    {
      messageId: 'msg_10002_1',
      role: 'user',
      content: '个人店入驻需要哪些资料？',
      createdAt: '2026-06-22 10:12:40'
    },
    {
      messageId: 'msg_10002_2',
      role: 'assistant',
      content: '个人店通常需要身份信息、联系方式和经营类目相关资料。',
      createdAt: '2026-06-22 10:12:43'
    },
    {
      messageId: 'msg_10002_3',
      role: 'user',
      content: '个体工商户也走个人知识库吗？',
      createdAt: '2026-06-22 10:14:28'
    }
  ],
  conv_10003: [
    {
      messageId: 'msg_10003_1',
      role: 'user',
      content: '企业店发票怎么开？',
      createdAt: '2026-06-22 10:58:19'
    },
    {
      messageId: 'msg_10003_2',
      role: 'assistant',
      content: '发票开具需要结合结算主体、订单类型和平台规则确认。',
      createdAt: '2026-06-22 10:58:23'
    },
    {
      messageId: 'msg_10003_3',
      role: 'user',
      content: '结算周期在哪里看？',
      createdAt: '2026-06-22 11:01:54'
    },
    {
      messageId: 'msg_10003_4',
      role: 'assistant',
      content: '结算周期一般在后台结算中心或合同规则中查看。',
      createdAt: '2026-06-22 11:01:58'
    },
    {
      messageId: 'msg_10003_5',
      role: 'user',
      content: '可以导出结算明细吗？',
      createdAt: '2026-06-22 11:02:46'
    }
  ]
})

const historySummary = computed(() => {
  const userIds = new Set(conversationHistory.value.map((item) => item.userId))
  return {
    sessionCount: conversationHistory.value.length,
    messageCount: conversationHistory.value.reduce((sum, item) => sum + Number(item.messageCount || 0), 0),
    userCount: userIds.size
  }
})

const notifyHistoryFallback = () => {
  if (historyFallbackNotified.value) return
  historyFallbackNotified.value = true
  ElMessage.warning('历史会话接口暂不可用，已切换为前端演示数据')
}

const normalizeHistoryUser = (user) => ({
  userId: user.userId ?? user.user_id ?? user.id,
  username: user.username || user.account || '-',
  displayName: user.displayName || user.display_name || user.name || user.username || '-'
})

const normalizeConversation = (item) => ({
  conversationId: item.conversationId ?? item.conversation_id ?? item.id,
  userId: item.userId ?? item.user_id ?? item.owner_id,
  username: item.username || item.user?.username || '-',
  displayName: item.displayName || item.display_name || item.user?.displayName || item.user?.name || '-',
  title: item.title || item.summary || '未命名会话',
  knowledgeBaseType: item.knowledgeBaseType || item.knowledge_base_type || '',
  knowledgeBaseName: item.knowledgeBaseName || item.knowledge_base_name || '-',
  messageCount: item.messageCount ?? item.message_count ?? item.messages?.length ?? 0,
  lastMessageAt: item.lastMessageAt || item.last_message_at || item.updatedAt || item.updated_at || '-'
})

const normalizeHistoryMessage = (message) => ({
  messageId: message.messageId ?? message.message_id ?? message.id,
  role: message.role || message.sender_role || 'user',
  content: message.content || message.answer || message.question || '',
  createdAt: message.createdAt || message.created_at || '-'
})

const filterDemoConversationHistory = () => {
  const keyword = historyQuery.keyword.trim()
  return demoConversationHistory.value.filter((item) => {
    const matchedUser = !historyQuery.userId || String(item.userId) === String(historyQuery.userId)
    const matchedKnowledge = !historyQuery.knowledge_base_type || item.knowledgeBaseType === historyQuery.knowledge_base_type
    const matchedKeyword =
      !keyword ||
      item.title.includes(keyword) ||
      (demoHistoryMessages.value[item.conversationId] || []).some((message) => message.content.includes(keyword))
    return matchedUser && matchedKnowledge && matchedKeyword
  })
}

const fetchHistoryUsers = async () => {
  try {
    const data = await getAdminConversationUsers()
    const users = Array.isArray(data) ? data : data.items || []
    historyUserOptions.value = users.map(normalizeHistoryUser)
  } catch (error) {
    historyDataMode.value = 'demo'
    historyUserOptions.value = demoHistoryUsers
    notifyHistoryFallback()
  }
}

const fetchConversationHistory = async () => {
  historyLoading.value = true
  try {
    const data = await getAdminConversations(historyQuery)
    const items = Array.isArray(data) ? data : data.items || []
    conversationHistory.value = items.map(normalizeConversation)
    historyDataMode.value = 'api'
  } catch (error) {
    historyDataMode.value = 'demo'
    conversationHistory.value = filterDemoConversationHistory()
    notifyHistoryFallback()
  } finally {
    historyLoading.value = false
  }
}

const resetHistoryQuery = () => {
  Object.assign(historyQuery, { userId: '', knowledge_base_type: '', keyword: '' })
  fetchConversationHistory()
}

const openHistoryMessages = async (row) => {
  activeHistorySession.value = row
  historyDrawerVisible.value = true
  historyMessageLoading.value = true

  try {
    if (historyDataMode.value === 'demo') {
      activeHistoryMessages.value = demoHistoryMessages.value[row.conversationId] || []
      return
    }

    const data = await getAdminConversationMessages(row.conversationId)
    const items = Array.isArray(data) ? data : data.items || []
    activeHistoryMessages.value = items.map(normalizeHistoryMessage)
  } catch (error) {
    activeHistoryMessages.value = demoHistoryMessages.value[row.conversationId] || []
    if (activeHistoryMessages.value.length === 0) {
      ElMessage.error(error.message || '会话消息加载失败')
    }
  } finally {
    historyMessageLoading.value = false
  }
}

const deleteHistoryConversation = (row) => {
  ElMessageBox.confirm(`确定删除会话“${row.title}”吗？删除后该用户端历史会话不可恢复。`, '删除历史会话', {
    type: 'warning'
  })
    .then(async () => {
      if (historyDataMode.value === 'api') {
        await deleteAdminConversation(row.conversationId)
      } else {
        demoConversationHistory.value = demoConversationHistory.value.filter(
          (item) => item.conversationId !== row.conversationId
        )
        delete demoHistoryMessages.value[row.conversationId]
      }

      if (activeHistorySession.value?.conversationId === row.conversationId) {
        historyDrawerVisible.value = false
        activeHistorySession.value = null
        activeHistoryMessages.value = []
      }
      ElMessage.success('历史会话已删除')
      fetchConversationHistory()
    })
    .catch(() => {})
}

const kbQuery = reactive({ keyword: '', status: '' })
const kbList = ref([])
const kbUploadVisible = ref(false)
const kbForm = reactive({ name: '', description: '', chunkSize: 500, chunkOverlap: 50, autoEnable: true })

const fetchKBs = () => {
  kbList.value = [
    {
      knowledgeBaseId: 'kb_10001',
      name: '项目知识库',
      description: '用于 RAG 问答的项目内部资料资源',
      status: 'enabled',
      documentCount: 12,
      createdAt: '2026-06-21 12:00:00'
    },
    {
      knowledgeBaseId: 'kb_10002',
      name: '产品 FAQ 技术库',
      description: '面向售后客服的知识切片库',
      status: 'processing',
      documentCount: 1,
      createdAt: '2026-06-21 15:30:00'
    }
  ]
}

const getKbTagType = (status) => {
  const maps = { enabled: 'success', disabled: 'info', processing: 'primary', failed: 'danger' }
  return maps[status] || 'info'
}

const updateKbStatus = (id, targetStatus) => {
  ElMessage.success(`知识库 ${id} 状态已变更为 ${targetStatus}`)
  fetchKBs()
}

const submitKbUpload = () => {
  ElMessage.success('知识库信息已提交')
  kbUploadVisible.value = false
  fetchKBs()
}

const deleteKB = (id) => {
  ElMessageBox.confirm('删除知识库将同步移除相关向量数据，确定继续？', '高危操作', { type: 'error' })
    .then(() => {
      ElMessage.success(`知识库 ${id} 已删除`)
      fetchKBs()
    })
    .catch(() => {})
}

const evalQuery = reactive({ status: '' })
const evalList = ref([])
const activeEvalId = ref(null)
const createEvalVisible = ref(false)
const newEvalForm = reactive({ name: '', knowledgeBaseId: '', metrics: [] })
const evalDetail = ref({})

const fetchEvals = () => {
  evalList.value = [
    {
      evaluationId: 'eval_10001',
      name: '项目知识库基础盘点',
      knowledgeBaseId: 'kb_10001',
      knowledgeBaseName: '项目知识库',
      status: 'completed',
      questionCount: 50,
      averageScore: 86.5,
      createdAt: '2026-06-21 13:00:00'
    }
  ]
}

const getEvalTagType = (status) => {
  const maps = { pending: 'info', running: 'primary', completed: 'success', failed: 'danger' }
  return maps[status] || 'info'
}

const viewEvalDetail = (id) => {
  activeEvalId.value = id
  evalDetail.value = {
    evaluationId: id,
    name: '项目知识库评估',
    summary: {
      questionCount: 50,
      averageScore: 86.5,
      retrievalRecall: 0.82,
      answerRelevance: 0.88,
      faithfulness: 0.85,
      responseQuality: 0.91
    },
    items: [
      {
        question: '这个项目的核心功能是什么？',
        answer: '项目主要用于企业知识库管理、检索问答和评估分析。',
        score: 88,
        retrievedDocumentCount: 4,
        comment: '回答覆盖核心功能，暂未发现明显幻觉。'
      }
    ]
  }
}

const submitCreateEval = () => {
  ElMessage.success('评估任务创建成功')
  createEvalVisible.value = false
  fetchEvals()
}

const deleteEval = (id) => {
  ElMessage.success(`评估任务 ${id} 已删除`)
  fetchEvals()
}

onMounted(() => {
  fetchDashboardConfig()
  fetchUsers()
  fetchHistoryUsers()
  fetchConversationHistory()
  fetchKBs()
  fetchEvals()
})
</script>

<style scoped>
.pane-card {
  padding: 20px;
  background: #ffffff;
  border: 1px solid #f2f3f5;
  border-radius: 8px;
}

.dashboard-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dashboard-header,
.dashboard-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dashboard-header h2,
.dashboard-header p,
.pane-card h3,
.pane-card h4 {
  margin: 0;
}

.dashboard-header p {
  margin-top: 8px;
  font-size: 13px;
  color: #86909c;
}

.param-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-top: 20px;
}

.param-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 82px;
  padding: 14px;
  background: #f7f9fc;
  border: 1px solid #edf0f5;
  border-radius: 8px;
}

.param-card span {
  font-size: 12px;
  color: #86909c;
}

.param-card strong {
  overflow-wrap: anywhere;
  font-size: 15px;
  color: #1d2129;
}

.dashboard-two-column {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.history-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.history-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.history-title h2,
.history-title p {
  margin: 0;
}

.history-title h2 {
  font-size: 18px;
  color: #1d2129;
}

.history-title p {
  margin-top: 8px;
  font-size: 13px;
  color: #86909c;
}

.history-filter {
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-bottom: 0;
}

.history-search-input {
  width: 260px;
}

.history-summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.history-summary-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 86px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #f2f3f5;
  border-radius: 8px;
}

.history-summary-card span {
  font-size: 13px;
  color: #86909c;
}

.history-summary-card strong {
  font-size: 24px;
  color: #1d2129;
}

.history-user-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.history-user-cell strong {
  font-weight: 600;
  color: #1d2129;
}

.history-user-cell span {
  font-size: 12px;
  color: #86909c;
}

.history-drawer-meta {
  margin-bottom: 18px;
}

.history-message-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 240px;
}

.history-message-item {
  padding: 14px;
  background: #f7f9fc;
  border: 1px solid #edf0f5;
  border-radius: 8px;
}

.history-message-item.assistant {
  background: #f2f6ff;
  border-color: #d7e4ff;
}

.history-message-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.history-message-head span {
  font-size: 12px;
  color: #86909c;
}

.history-message-item p {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: #1d2129;
}

.filter-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
}

.filter-item {
  width: 160px;
}

.search-input {
  width: 240px;
}

.right-action {
  margin-left: auto;
}

.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 6px;
  border-radius: 50%;
}

.status-dot.enabled {
  background: #00b42a;
}

.status-dot.disabled {
  background: #86909c;
}

.score-text {
  font-weight: 600;
  color: #2362fb;
}

.eval-detail-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.back-btn {
  align-self: flex-start;
  border-radius: 6px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
}

.metric-card {
  padding: 20px;
  background: #ffffff;
  border: 1px solid #f2f3f5;
  border-radius: 8px;
}

.metric-card.highlight {
  background: linear-gradient(180deg, #f2f6ff 0%, #ffffff 100%);
  border-color: #2362fb;
}

.metric-card .m-label {
  margin-bottom: 8px;
  font-size: 13px;
  color: #86909c;
}

.metric-card .m-val {
  font-size: 24px;
  font-weight: 700;
  color: #1d2129;
}

.metric-card.highlight .m-val {
  color: #2362fb;
}

.table-wrapper h2 {
  margin: 0 0 16px;
  font-size: 15px;
  color: #1d2129;
}

.two-column {
  display: flex;
  gap: 20px;
}

.three-column,
.four-column {
  display: grid;
  gap: 16px;
}

.three-column {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.four-column {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.upload-drag {
  width: 100%;
}

@media (max-width: 1100px) {
  .history-toolbar {
    flex-direction: column;
  }

  .history-filter {
    justify-content: flex-start;
  }

  .history-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
