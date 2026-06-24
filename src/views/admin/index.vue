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
            <el-button type="primary" @click="openConfigModal">新增配置</el-button>
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
            <span>稀疏检索</span>
            <strong>{{ dashboardConfig.sparse_retrieval || '-' }}</strong>
          </div>
          <div class="param-card">
            <span>变体生成</span>
            <strong>{{ dashboardConfig.variant_generation_enabled ? '开' : '关' }}</strong>
          </div>
        </div>
      </div>

      <div class="pane-card">
        <h3>参数版本管理</h3>
        <el-table :data="configVersions" v-loading="configVersionsLoading" style="width: 100%">
          <el-table-column prop="id" label="版本ID" width="90" />
          <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.is_enabled ? 'success' : 'info'" size="small">
                {{ scope.row.is_enabled ? '启用中' : '未启用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" width="180" />
          <el-table-column prop="activated_at" label="启用时间" width="180" />
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="scope">
              <el-button
                link
                type="primary"
                :disabled="scope.row.is_enabled"
                @click="activateConfig(scope.row.id)"
              >
                启用
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pane-card">
        <h3>当前启用热参数</h3>
        <el-table :data="dashboardParamRows" v-loading="dashboardLoading" style="width: 100%">
          <el-table-column prop="label" label="参数" width="260" />
          <el-table-column prop="key" label="字段名" width="260" />
          <el-table-column prop="value" label="当前值" width="160" />
          <el-table-column prop="description" label="说明" min-width="320" />
        </el-table>
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
        <el-table-column prop="name" label="姓名" />
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

    <section v-if="currentTab === 'retrievalTest'" class="retrieval-test-panel">
      <div class="pane-card">
        <div class="dashboard-header">
          <div>
            <h2>检索测试</h2>
            <p>输入问题后查看最终命中、过滤前候选、score、confidence 和当前阈值。</p>
          </div>
          <el-button :loading="retrievalTestLoading" @click="runRetrievalTest">开始测试</el-button>
        </div>

        <el-form class="retrieval-test-form" label-position="top">
          <el-form-item label="测试问题">
            <el-input
              v-model="retrievalTestForm.question"
              type="textarea"
              :rows="3"
              maxlength="2000"
              show-word-limit
              placeholder="例如：不合格商品整改后，商家需要提交什么样的质检报告才能重新上架？"
            />
          </el-form-item>
          <div class="retrieval-test-options">
            <el-form-item label="知识库类型">
              <el-radio-group v-model="retrievalTestForm.knowledge_base_type">
                <el-radio-button label="enterprise">企业知识库</el-radio-button>
                <el-radio-button label="personal">个人知识库</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="指定 kb_version">
              <el-input v-model="retrievalTestForm.kb_version" clearable placeholder="默认使用当前 active 版本" />
            </el-form-item>
            <el-form-item label="测试模式">
              <el-switch
                v-model="retrievalTestForm.include_answer"
                active-text="调用完整问答"
                inactive-text="只看候选"
              />
            </el-form-item>
          </div>
        </el-form>
      </div>

      <div v-if="retrievalTestResult" class="retrieval-result-grid">
        <div class="pane-card">
          <h3>链路结果</h3>
          <div class="retrieval-stat-grid">
            <div class="retrieval-stat">
              <span>命中类型</span>
              <strong>{{ retrievalAnswer?.hit_type || '未生成' }}</strong>
            </div>
            <div class="retrieval-stat">
              <span>知识库版本</span>
              <strong>{{ retrievalDebug?.knowledge_base?.kb_version || '-' }}</strong>
            </div>
            <div class="retrieval-stat">
              <span>Doc 阈值</span>
              <strong>{{ formatScore(retrievalDebug?.thresholds?.doc_evidence_threshold) }}</strong>
            </div>
            <div class="retrieval-stat">
              <span>FAQ 高/中阈值</span>
              <strong>
                {{ formatScore(retrievalDebug?.thresholds?.faq_high_conf_threshold) }}
                /
                {{ formatScore(retrievalDebug?.thresholds?.faq_middle_conf_threshold) }}
              </strong>
            </div>
          </div>

          <div class="retrieval-answer-box">
            <span>最终回答</span>
            <p>{{ retrievalAnswer?.answer || '当前只查看候选，未调用完整问答链路。' }}</p>
          </div>
        </div>

        <div class="pane-card">
          <h3>问题改写与变体</h3>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="归一化问题">
              {{ retrievalDebug?.normalized_question || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="独立问题">
              {{ retrievalDebug?.standalone_question || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="规则命中">
              {{ retrievalDebug?.rule_hit_type || '-' }}
            </el-descriptions-item>
          </el-descriptions>
          <div class="variant-list">
            <el-tag
              v-for="variant in retrievalDebug?.query_variants?.query_variants || []"
              :key="variant"
              effect="plain"
            >
              {{ variant }}
            </el-tag>
          </div>
        </div>
      </div>

      <div v-if="retrievalTestResult" class="pane-card">
        <h3>Doc 候选（阈值过滤前）</h3>
        <el-table :data="retrievalDebug?.doc_candidates || []" style="width: 100%">
          <el-table-column type="index" label="#" width="60" />
          <el-table-column label="通过" width="80">
            <template #default="scope">
              <el-tag :type="scope.row.passed_threshold ? 'success' : 'danger'" size="small">
                {{ scope.row.passed_threshold ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="confidence" width="130">
            <template #default="scope">{{ formatScore(scope.row.confidence) }}</template>
          </el-table-column>
          <el-table-column label="score" width="130">
            <template #default="scope">{{ formatScore(scope.row.score) }}</template>
          </el-table-column>
          <el-table-column prop="source_doc_id" label="source_doc_id" width="190" />
          <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
          <el-table-column label="内容预览" min-width="360" show-overflow-tooltip>
            <template #default="scope">{{ evidencePreview(scope.row) }}</template>
          </el-table-column>
        </el-table>
      </div>

      <div v-if="retrievalTestResult" class="pane-card">
        <h3>FAQ 候选（阈值过滤前）</h3>
        <el-table :data="retrievalDebug?.faq_candidates || []" style="width: 100%">
          <el-table-column type="index" label="#" width="60" />
          <el-table-column label="高/中" width="100">
            <template #default="scope">
              <el-tag v-if="scope.row.passed_high_threshold" type="success" size="small">高</el-tag>
              <el-tag v-else-if="scope.row.passed_middle_threshold" type="warning" size="small">中</el-tag>
              <el-tag v-else type="info" size="small">低</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="confidence" width="130">
            <template #default="scope">{{ formatScore(scope.row.confidence) }}</template>
          </el-table-column>
          <el-table-column label="score" width="130">
            <template #default="scope">{{ formatScore(scope.row.score) }}</template>
          </el-table-column>
          <el-table-column prop="title" label="问题" min-width="260" show-overflow-tooltip />
          <el-table-column prop="answer" label="答案" min-width="360" show-overflow-tooltip />
        </el-table>
      </div>
    </section>

    <section v-if="currentTab === 'keywordRules'" class="keyword-rule-panel">
      <div class="pane-card">
        <div class="dashboard-header">
          <div>
            <h2>关键词规则匹配</h2>
            <p>维护检索流程第一步规则匹配使用的四类固定关键词集合。</p>
          </div>
          <el-button @click="fetchKeywordRules">刷新</el-button>
        </div>
      </div>

      <div
        v-for="rule in keywordRules"
        :key="rule.rule_code"
        class="pane-card keyword-rule-card"
        v-loading="keywordRulesLoading"
      >
        <div class="keyword-rule-head">
          <div>
            <h3>{{ rule.rule_name }}</h3>
            <p>{{ rule.rule_code }} · {{ rule.match_type }} · 排序 {{ rule.match_order }}</p>
          </div>
          <el-tag :type="rule.is_enabled ? 'success' : 'info'" effect="plain">
            {{ rule.is_enabled ? '已启用' : '已停用' }}
          </el-tag>
        </div>
        <el-form label-position="top">
          <el-form-item label="关键词集合">
            <el-select
              v-model="rule.editKeywords"
              multiple
              filterable
              allow-create
              default-first-option
              style="width: 100%"
              placeholder="输入关键词后按回车添加"
            />
          </el-form-item>
          <el-form-item label="规则回复文本">
            <el-input
              v-model="rule.editResponseText"
              type="textarea"
              :rows="3"
              placeholder="请输入规则命中后的回复文本；可留空"
            />
          </el-form-item>
        </el-form>
        <div class="panel-actions">
          <el-button type="primary" @click="saveKeywordRule(rule)">保存规则配置</el-button>
        </div>
      </div>
    </section>

    <section v-if="currentTab === 'termNormalizations'" class="pane-card">
      <div class="dashboard-header">
        <div>
          <h2>规则变体归一化词改写配置</h2>
          <p>维护规则变体生成前使用的标准词和别名集合。</p>
        </div>
        <div class="dashboard-actions">
          <el-button @click="fetchTermNormalizations">刷新</el-button>
          <el-button type="primary" @click="openTermModal('add')">新增归一化词</el-button>
        </div>
      </div>

      <el-table :data="termNormalizations" v-loading="termLoading" style="width: 100%; margin-top: 20px">
        <el-table-column prop="canonical_term" label="标准词" width="180" />
        <el-table-column label="别名集合" min-width="280">
          <template #default="scope">
            <el-tag
              v-for="alias in scope.row.aliases"
              :key="alias"
              class="term-alias"
              effect="plain"
            >
              {{ alias }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="match_type" label="匹配方式" width="120" />
        <el-table-column prop="description" label="说明" min-width="200" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.is_enabled ? 'success' : 'info'" size="small">
              {{ scope.row.is_enabled ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button link type="primary" @click="openTermModal('edit', scope.row)">编辑</el-button>
            <el-button link type="danger" @click="removeTerm(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <section v-if="currentTab === 'knowledge'" class="knowledge-panel">
      <div class="pane-card">
        <div class="dashboard-header">
          <div>
            <h2>文档入库仪表盘</h2>
            <p>服务器目录：{{ activeOfflineConfig.source_data_root || '-' }} / {{ activeOfflineConfig.clean_markdown_dir || '-' }}</p>
          </div>
          <div class="dashboard-actions">
            <el-button @click="fetchKnowledgeWorkbench">刷新</el-button>
            <el-button type="primary" plain @click="openOfflineConfigModal">新增切分策略</el-button>
            <el-button type="primary" @click="createKnowledgeVersion">创建知识库版本</el-button>
            <el-button type="primary" plain @click="jsonImportVisible = true">JSON 入库</el-button>
          </div>
        </div>

        <div class="param-grid" v-loading="offlineLoading">
          <div class="param-card">
            <span>当前版本</span>
            <strong>{{ kbPointer.kb_active_version || '-' }}</strong>
          </div>
          <div class="param-card">
            <span>上一版本</span>
            <strong>{{ kbPointer.kb_previous_version || '-' }}</strong>
          </div>
          <div class="param-card">
            <span>Parent Chunk</span>
            <strong>{{ activeOfflineConfig.doc_parent_chunk_size || '-' }}</strong>
          </div>
          <div class="param-card">
            <span>Child Chunk</span>
            <strong>{{ activeOfflineConfig.doc_child_chunk_size || '-' }}</strong>
          </div>
          <div class="param-card">
            <span>Overlap</span>
            <strong>{{ activeOfflineConfig.doc_child_chunk_overlap ?? '-' }}</strong>
          </div>
        </div>
      </div>

      <div class="pane-card">
        <div class="empty-state">
          <h3>版本化入库</h3>
          <p>先创建 staged 知识库版本，再在版本列表中点击“入库”上传本地 Markdown 或 FAQ CSV 目录。</p>
        </div>
        <div v-if="activeOfflineTask.task_id" class="json-import-progress">
          <div class="json-import-progress-head">
            <span>{{ activeOfflineTask.current_stage || activeOfflineTask.status }}</span>
            <span>{{ activeOfflineTask.progress_percent || 0 }}%</span>
          </div>
          <el-progress :percentage="Number(activeOfflineTask.progress_percent || 0)" :stroke-width="10" />
          <div class="json-import-current">
            任务：{{ activeOfflineTask.task_id }}；类型：{{ formatIngestType(activeOfflineTask.ingest_type) }}；版本：{{ activeOfflineTask.kb_version || '-' }}
          </div>
        </div>
      </div>

      <div class="pane-card">
        <h3>切分策略配置</h3>
        <el-table :data="offlineConfigs" v-loading="offlineLoading" style="width: 100%">
          <el-table-column prop="id" label="配置ID" width="90" />
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.is_enabled ? 'success' : 'info'" size="small">
                {{ scope.row.is_enabled ? '启用中' : '未启用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="doc_parent_chunk_size" label="Parent" width="100" />
          <el-table-column prop="doc_child_chunk_size" label="Child" width="100" />
          <el-table-column prop="doc_child_chunk_overlap" label="Overlap" width="100" />
          <el-table-column prop="table_split_strategy" label="表格策略" width="110" />
          <el-table-column prop="table_row_max_chars" label="表格行上限" width="120" />
          <el-table-column prop="doc_collection_name" label="Doc Collection" min-width="170" show-overflow-tooltip />
          <el-table-column prop="faq_collection_name" label="FAQ Collection" min-width="170" show-overflow-tooltip />
          <el-table-column prop="updated_at" label="更新时间" width="180" />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="scope">
              <el-button link type="primary" :disabled="scope.row.is_enabled" @click="activateOfflineConfig(scope.row.id)">
                启用
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pane-card">
        <h3>知识库版本</h3>
        <el-table :data="kbList" v-loading="offlineLoading" style="width: 100%">
          <el-table-column prop="kb_version" label="版本号" min-width="180" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="110">
            <template #default="scope">
              <el-tag :type="getKbTagType(scope.row.status)" size="small">{{ scope.row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="embedding_model" label="Embedding" width="130" />
          <el-table-column label="Doc状态" width="110">
            <template #default="scope">
              <el-tag :type="scope.row.doc_ready ? 'success' : 'info'" size="small">
                {{ scope.row.doc_ready ? '已准备' : '未准备' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="FAQ状态" width="110">
            <template #default="scope">
              <el-tag :type="scope.row.faq_ready ? 'success' : 'info'" size="small">
                {{ scope.row.faq_ready ? '已准备' : '未准备' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="document_count" label="文档" width="80" align="center" />
          <el-table-column prop="child_chunk_count" label="Child" width="90" align="center" />
          <el-table-column prop="faq_count" label="FAQ" width="80" align="center" />
          <el-table-column prop="doc_collection_name" label="Doc Collection" min-width="170" show-overflow-tooltip />
          <el-table-column prop="faq_collection_name" label="FAQ Collection" min-width="170" show-overflow-tooltip />
          <el-table-column prop="created_at" label="创建时间" width="180" />
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="scope">
              <el-button v-if="scope.row.status === 'staged'" link type="primary" @click="openVersionIngestion(scope.row)">
                入库
              </el-button>
              <el-button
                v-if="scope.row.status === 'staged'"
                link
                type="primary"
                :disabled="!isKbVersionReady(scope.row)"
                @click="publishVersion(scope.row)"
              >
                发布
              </el-button>
              <el-button v-if="scope.row.status === 'archived'" link type="warning" @click="rollbackVersion(scope.row)">
                回滚
              </el-button>
              <span v-if="scope.row.status === 'active'">当前</span>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="pane-card">
        <h3>最近入库任务</h3>
        <el-table :data="offlineTasks" v-loading="offlineTaskLoading" style="width: 100%">
          <el-table-column prop="task_id" label="任务ID" min-width="210" show-overflow-tooltip />
          <el-table-column label="类型" width="100">
            <template #default="scope">
              <el-tag effect="plain">{{ formatIngestType(scope.row.ingest_type) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="110">
            <template #default="scope">
              <el-tag :type="getOfflineTaskTagType(scope.row.status)" size="small">{{ scope.row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="进度" width="180">
            <template #default="scope">
              <el-progress :percentage="Number(scope.row.progress_percent || 0)" :stroke-width="8" />
            </template>
          </el-table-column>
          <el-table-column prop="current_stage" label="阶段" min-width="150" show-overflow-tooltip />
          <el-table-column prop="kb_version" label="版本" min-width="170" show-overflow-tooltip />
          <el-table-column prop="document_count" label="文档" width="80" align="center" />
          <el-table-column prop="child_chunk_count" label="Child" width="90" align="center" />
          <el-table-column prop="faq_count" label="FAQ" width="80" align="center" />
          <el-table-column prop="error_message" label="失败原因" min-width="180" show-overflow-tooltip />
          <el-table-column prop="created_at" label="创建时间" width="180" />
        </el-table>
      </div>
    </section>

    <section v-if="currentTab === 'evaluations'" class="evaluation-workbench">
      <div class="evaluation-tabs" role="tablist" aria-label="评估管理">
        <button
          v-for="tab in evaluationTabs"
          :key="tab.name"
          type="button"
          class="evaluation-tab"
          :class="{ active: evaluationTab === tab.name }"
          @click="evaluationTab = tab.name"
        >
          {{ tab.label }}
        </button>
      </div>

      <section v-if="evaluationTab === 'datasets'" class="pane-card">
        <div class="filter-wrapper">
          <el-input v-model="datasetQuery.keyword" placeholder="评估集名称 / ID" class="filter-item history-search-input" clearable />
          <el-select v-model="datasetQuery.type" placeholder="评估类型" class="filter-item" clearable>
            <el-option label="retrieval_eval" value="retrieval_eval" />
            <el-option label="ingestion_quality" value="ingestion_quality" />
            <el-option label="mixed" value="mixed" />
          </el-select>
          <el-button type="primary" @click="fetchEvaluationDatasets">查询</el-button>
          <el-button type="primary" plain class="right-action" @click="createEvalDataset">新建评估集</el-button>
        </div>

        <el-table :data="filteredEvaluationDatasets" style="width: 100%">
          <el-table-column prop="datasetId" label="评估集ID" min-width="190" show-overflow-tooltip />
          <el-table-column prop="name" label="评估集名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="description" label="描述" min-width="240" show-overflow-tooltip />
          <el-table-column label="适用类型" width="150">
            <template #default="scope">
              <el-tag :type="scope.row.type === 'mixed' ? 'warning' : 'primary'" effect="plain">
                {{ scope.row.type }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="sampleCount" label="样本数" width="110" align="center" />
          <el-table-column prop="createdAt" label="创建时间" width="180" />
          <el-table-column label="操作" width="168" fixed="right" align="center">
            <template #default="scope">
              <div class="dataset-actions">
                <el-button link type="primary" @click="viewDatasetSamples(scope.row)">查看</el-button>
                <el-button link type="primary" @click="openSampleCreateDialog(scope.row)">新增</el-button>
                <el-button link type="primary" @click="importEvalSamples(scope.row)">导入</el-button>
                <el-button link type="danger" @click="deleteEvalDataset(scope.row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </section>


      <section v-if="evaluationTab === 'samples'" class="pane-card">
        <div class="filter-wrapper">
          <el-select v-model="sampleQuery.datasetId" placeholder="评估集" class="filter-item wide-select" clearable filterable>
            <el-option
              v-for="item in evaluationDatasets"
              :key="item.datasetId"
              :label="`${item.datasetId} ｜ ${item.name}`"
              :value="item.datasetId"
            />
          </el-select>
          <el-input v-model="sampleQuery.category" placeholder="分类" class="filter-item" clearable />
          <el-input v-model="sampleQuery.keyword" placeholder="样本ID / 问题 / 评估集" class="filter-item history-search-input" clearable />
          <el-button type="primary" @click="fetchAllEvaluationSamples">查询</el-button>
          <el-button type="primary" plain class="right-action" @click="openSampleCreateDialog">新增样本</el-button>
        </div>

        <el-table :data="allEvaluationSamples" v-loading="sampleOverviewLoading" style="width: 100%">
          <el-table-column prop="datasetId" label="评估集ID" min-width="170" show-overflow-tooltip />
          <el-table-column prop="datasetName" label="评估集名称" min-width="160" show-overflow-tooltip />
          <el-table-column prop="caseId" label="样本ID" min-width="150" show-overflow-tooltip />
          <el-table-column prop="question" label="问题" min-width="260" show-overflow-tooltip />
          <el-table-column label="期望结果 JSON" min-width="260" show-overflow-tooltip>
            <template #default="scope">
              <code>{{ formatJson(scope.row.expectedJson) }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="category" label="分类" width="130" show-overflow-tooltip />
          <el-table-column prop="createdAt" label="创建时间" width="170" />
          <el-table-column label="操作" width="100" fixed="right">
            <template #default="scope">
              <el-button link type="danger" @click="deleteSingleEvalSample(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </section>
      <section v-if="evaluationTab === 'ingestion'" class="evaluation-panel">
        <div class="pane-card">
          <div class="filter-wrapper">
            <el-select v-model="ingestionForm.kbVersion" placeholder="知识库版本" class="filter-item wide-select" filterable :loading="kbVersionsLoading">
              <el-option
                v-for="item in kbVersionOptions"
                :key="item.kbVersion"
                :label="item.label"
                :value="item.kbVersion"
              />
            </el-select>
            <el-input v-model="ingestionForm.minLength" placeholder="最短 80 字" class="filter-item" />
            <el-input v-model="ingestionForm.maxLength" placeholder="最长 1800 字" class="filter-item" />
            <el-input v-model="ingestionForm.duplicateThreshold" placeholder="重复阈值 0.95" class="filter-item" />
            <el-button type="primary" @click="runIngestionEvaluation">开始评估</el-button>
          </div>
        </div>

        <div class="eval-metric-grid">
          <div class="metric-card">
            <div class="m-label">总 Chunk 数</div>
            <div class="m-val">{{ ingestionMetrics.totalChunks }}</div>
          </div>
          <div class="metric-card">
            <div class="m-label">低质量 Chunk</div>
            <div class="m-val warning">{{ ingestionMetrics.lowQualityChunks }}</div>
          </div>
          <div class="metric-card">
            <div class="m-label">过短率</div>
            <div class="m-val primary">{{ ingestionMetrics.tooShortRate }}</div>
          </div>
          <div class="metric-card">
            <div class="m-label">重复率</div>
            <div class="m-val danger">{{ ingestionMetrics.duplicateRate }}</div>
          </div>
        </div>

        <div class="pane-card">
          <h3 class="section-heading">问题 Chunk 明细</h3>
          <el-table :data="problemChunks" style="width: 100%">
            <el-table-column prop="chunkId" label="chunk_id" width="140" />
            <el-table-column prop="ruleId" label="规则ID" width="190" />
            <el-table-column prop="title" label="标题" min-width="240" show-overflow-tooltip />
            <el-table-column prop="length" label="长度" width="100" align="center" />
            <el-table-column label="问题类型" width="120">
              <template #default="scope">
                <el-tag :type="scope.row.issueType === '重复' ? 'success' : 'warning'" effect="plain">
                  {{ scope.row.issueType }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="similarity" label="相似度" width="120" align="center" />
          </el-table>
        </div>
      </section>

      <section v-if="evaluationTab === 'retrieval'" class="evaluation-panel">
        <template v-if="!activeRetrievalDetail">
          <div class="pane-card">
            <div class="filter-wrapper">
              <el-select v-model="retrievalForm.datasetId" placeholder="评估集" class="filter-item wide-select">
                <el-option
                  v-for="item in evaluationDatasets"
                  :key="item.datasetId"
                  :label="item.datasetId"
                  :value="item.datasetId"
                />
              </el-select>
              <el-select v-model="retrievalForm.kbVersion" placeholder="知识库版本" class="filter-item wide-select" filterable :loading="kbVersionsLoading">
                <el-option
                  v-for="item in kbVersionOptions"
                  :key="item.kbVersion"
                  :label="item.label"
                  :value="item.kbVersion"
                />
              </el-select>
              <el-input v-model="retrievalForm.faqTopK" placeholder="FAQ TopK 5" class="filter-item" />
              <el-input v-model="retrievalForm.kbTopK" placeholder="KB TopK 10" class="filter-item" />
              <el-button type="primary" @click="createRetrievalEvaluation">新建检索评估</el-button>
            </div>

            <el-table :data="retrievalEvaluations" style="width: 100%">
              <el-table-column prop="taskId" label="任务ID" min-width="170" />
              <el-table-column prop="datasetId" label="评估集" min-width="190" />
              <el-table-column prop="kbVersion" label="知识库版本" width="130" />
              <el-table-column label="状态" width="120">
                <template #default="scope">
                  <el-tag :type="getEvalTagType(scope.row.status)" effect="plain">{{ scope.row.status }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="faqHitAt5" label="FAQ Hit@5" width="130">
                <template #default="scope"><span class="score-text">{{ scope.row.faqHitAt5 || '-' }}</span></template>
              </el-table-column>
              <el-table-column prop="kbRecallAt10" label="KB Recall@10" width="140">
                <template #default="scope"><span class="score-text">{{ scope.row.kbRecallAt10 || '-' }}</span></template>
              </el-table-column>
              <el-table-column prop="kbMrrAt10" label="KB MRR@10" width="130">
                <template #default="scope"><span class="score-text">{{ scope.row.kbMrrAt10 || '-' }}</span></template>
              </el-table-column>
              <el-table-column label="操作" width="180" fixed="right">
                <template #default="scope">
                  <el-button link type="primary" @click="openRetrievalDetail(scope.row)">查看详情</el-button>
                  <el-button link type="primary" @click="rerunRetrievalEvaluation(scope.row)">重新执行</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </template>

        <template v-else>
          <div class="pane-card run-info-card">
            <el-descriptions :column="4" border>
              <el-descriptions-item label="评估集">{{ activeRetrievalDetail.datasetId }}</el-descriptions-item>
              <el-descriptions-item label="知识库版本">{{ activeRetrievalDetail.kbVersion }}</el-descriptions-item>
              <el-descriptions-item label="FAQ TopK">{{ activeRetrievalDetail.config?.faq_top_k ?? '-' }}</el-descriptions-item>
              <el-descriptions-item label="KB TopK">{{ activeRetrievalDetail.config?.kb_top_k ?? '-' }}</el-descriptions-item>
            </el-descriptions>
          </div>
          <el-button :icon="ArrowLeft" class="back-btn" @click="activeRetrievalDetail = null">返回列表</el-button>
          <div class="eval-metric-grid">
            <div class="metric-card">
              <div class="m-label">FAQ Hit Rate@5</div>
              <div class="m-val primary">{{ activeRetrievalDetail.faqHitAt5 }}</div>
            </div>
            <div class="metric-card">
              <div class="m-label">KB Recall@10</div>
              <div class="m-val primary">{{ activeRetrievalDetail.kbRecallAt10 }}</div>
            </div>
            <div class="metric-card">
              <div class="m-label">KB MRR@10</div>
              <div class="m-val">{{ activeRetrievalDetail.kbMrrAt10 }}</div>
            </div>
            <div class="metric-card">
              <div class="m-label">错误数</div>
              <div class="m-val danger">{{ activeRetrievalDetail.errorCount }}</div>
            </div>
          </div>

          <div class="eval-detail-split">
            <div class="pane-card">
              <h3 class="section-heading">单题结果</h3>
              <el-table :data="retrievalCaseResults" style="width: 100%" @row-click="activeRetrievalCase = $event">
                <el-table-column prop="caseId" label="case_id" width="130" />
                <el-table-column prop="question" label="问题" min-width="240" show-overflow-tooltip />
                <el-table-column prop="faqHit" label="FAQ命中" width="100" align="center" />
                <el-table-column prop="kbRecall" label="KB Recall" width="110" align="center" />
                <el-table-column prop="kbRr" label="KB RR" width="100" align="center" />
              </el-table>
            </div>

            <div class="pane-card">
              <h3 class="section-heading">{{ activeRetrievalCase.caseId }} 召回详情</h3>
              <el-descriptions :column="1" border>
                <el-descriptions-item label="原始问题">{{ activeRetrievalCase.question }}</el-descriptions-item>
                <el-descriptions-item label="改写问题">{{ activeRetrievalCase.rewrittenQuestion }}</el-descriptions-item>
                <el-descriptions-item label="期望规则">{{ activeRetrievalCase.expectedRuleId }}</el-descriptions-item>
              </el-descriptions>

              <div class="hit-list">
                <div v-for="hit in activeRetrievalCase.hits" :key="hit.id" class="hit-item">
                  <div class="hit-head">
                    <strong>{{ hit.title }}</strong>
                    <span>{{ hit.score }}</span>
                  </div>
                  <p>{{ hit.preview }}</p>
                </div>
              </div>
            </div>
          </div>
        </template>
      </section>

      <section v-if="evaluationTab === 'records'" class="evaluation-panel">
        <div class="pane-card">
          <div class="filter-wrapper">
            <el-select v-model="recordQuery.type" placeholder="评估类型" class="filter-item" clearable>
              <el-option label="检索评估" value="retrieval_eval" />
              <el-option label="入库质量" value="ingestion_quality" />
            </el-select>
            <el-select v-model="recordQuery.status" placeholder="任务状态" class="filter-item" clearable>
              <el-option label="completed" value="completed" />
              <el-option label="running" value="running" />
              <el-option label="failed" value="failed" />
            </el-select>
            <el-input v-model="recordQuery.keyword" placeholder="任务ID / 评估集 / 知识库版本" class="filter-item history-search-input" clearable />
            <el-button type="primary" @click="fetchEvaluationRecords">查询</el-button>
          </div>

          <el-table :data="filteredEvaluationRecords" style="width: 100%">
            <el-table-column prop="taskId" label="任务ID" min-width="170" />
            <el-table-column label="评估类型" width="120">
              <template #default="scope">
                <el-tag :type="scope.row.type === 'retrieval_eval' ? 'primary' : 'warning'" effect="plain">
                  {{ scope.row.typeName }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="datasetId" label="评估集" min-width="170" />
            <el-table-column prop="kbVersion" label="知识库版本" width="130" />
            <el-table-column label="状态" width="120">
              <template #default="scope">
                <el-tag :type="getEvalTagType(scope.row.status)" effect="plain">{{ scope.row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="metrics" label="核心指标" min-width="280" show-overflow-tooltip />
            <el-table-column prop="finishedAt" label="完成时间" width="180" />
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="scope">
                <el-button link type="primary" @click="viewEvaluationRecord(scope.row)">查看详情</el-button>
                <el-button link type="primary" @click="rerunEvaluationRecord(scope.row)">重新执行</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="eval-detail-split">
          <div class="pane-card">
            <h3 class="section-heading">最近一次检索评估</h3>
            <div class="mini-metric-grid">
              <div class="metric-card"><div class="m-label">FAQ Hit@5</div><div class="m-val primary">81.25%</div></div>
              <div class="metric-card"><div class="m-label">KB Recall@10</div><div class="m-val primary">86.67%</div></div>
              <div class="metric-card"><div class="m-label">KB MRR@10</div><div class="m-val">0.742</div></div>
            </div>
          </div>
          <div class="pane-card">
            <h3 class="section-heading">最近一次入库质量评估</h3>
            <div class="mini-metric-grid">
              <div class="metric-card"><div class="m-label">低质量 Chunk</div><div class="m-val warning">340</div></div>
              <div class="metric-card"><div class="m-label">过短率</div><div class="m-val primary">4.0%</div></div>
              <div class="metric-card"><div class="m-label">重复率</div><div class="m-val danger">2.0%</div></div>
            </div>
          </div>
        </div>
      </section>
    </section>



    <el-dialog v-model="evalDatasetDialogVisible" title="新建评估集" width="560px" :close-on-click-modal="false">
      <el-form :model="evalDatasetForm" label-position="top">
        <el-form-item label="评估集ID">
          <el-input v-model="evalDatasetForm.datasetId" placeholder="自动生成，可按需修改" />
        </el-form-item>
        <el-form-item label="评估集名称">
          <el-input v-model="evalDatasetForm.name" placeholder="请输入评估集名称" />
        </el-form-item>
        <el-form-item label="适用类型">
          <el-select v-model="evalDatasetForm.evaluationType" placeholder="请选择适用类型" style="width: 100%">
            <el-option label="检索评估" value="retrieval_eval" />
            <el-option label="入库质量" value="ingestion_quality" />
            <el-option label="混合评估" value="mixed" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="evalDatasetForm.description" type="textarea" :rows="3" placeholder="请输入评估集说明" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="evalDatasetDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="evalDatasetSaving" @click="submitEvalDataset">确定创建</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="sampleCreateDialogVisible"
      title="新增评估样本"
      width="640px"
      :close-on-click-modal="false"
    >
      <el-form :model="sampleCreateForm" label-position="top">
        <el-form-item label="所属评估集">
          <el-select v-model="sampleCreateForm.datasetId" placeholder="请选择评估集" filterable style="width: 100%">
            <el-option
              v-for="item in evaluationDatasets"
              :key="item.datasetId"
              :label="`${item.datasetId} - ${item.name}`"
              :value="item.datasetId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="样本ID">
          <el-input v-model="sampleCreateForm.caseId" placeholder="不填则自动生成" />
        </el-form-item>
        <el-form-item label="问题">
          <el-input v-model="sampleCreateForm.question" type="textarea" :rows="3" placeholder="请输入评估问题" />
        </el-form-item>
        <el-form-item label="期望 FAQ ID">
          <el-input v-model="sampleCreateForm.expectedFaqIds" placeholder="多个 ID 用英文逗号分隔" />
        </el-form-item>
        <el-form-item label="期望知识库规则/文档 ID">
          <el-input v-model="sampleCreateForm.expectedRuleIds" placeholder="多个 ID 用英文逗号分隔" />
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="sampleCreateForm.category" placeholder="如 policy_fact / process_lookup" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="sampleCreateDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="sampleCreateSaving" @click="submitSampleCreate">保存样本</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="sampleDialogVisible"
      :title="`评估样本 - ${activeDataset?.name || activeDataset?.datasetId || ''}`"
      width="1120px"
      :close-on-click-modal="false"
    >
      <div class="sample-dialog-tools">
        <el-button type="primary" plain @click="openSampleCreateDialog(activeDataset)">新增样本</el-button>
        <el-button plain @click="downloadEvalSampleTemplate">下载 JSON 示例</el-button>
        <el-button plain @click="fillSampleTemplate">填入示例</el-button>
        <el-button plain @click="importEvalSamples(activeDataset)">导入默认样本</el-button>
      </div>

      <el-form label-position="top" class="sample-import-form">
        <el-form-item label="批量导入 JSON">
          <el-input
            v-model="sampleImportJson"
            type="textarea"
            :rows="6"
            placeholder="支持数组，或 { items: [...] }"
          />
        </el-form-item>
        <el-button type="primary" plain @click="importBatchSampleJson">批量导入</el-button>
      </el-form>

      <el-table :data="activeDatasetSamples" v-loading="sampleDialogLoading" style="width: 100%; margin-top: 16px">
        <el-table-column prop="caseId" label="样本ID" min-width="150" show-overflow-tooltip />
        <el-table-column prop="question" label="问题" min-width="260" show-overflow-tooltip />
        <el-table-column label="期望结果 JSON" min-width="280" show-overflow-tooltip>
          <template #default="scope">
            <code>{{ formatJson(scope.row.expectedJson) }}</code>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="130" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="创建时间" width="170" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="scope">
            <el-button link type="danger" @click="deleteSingleEvalSample(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

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
          <el-input v-model="userForm.username" placeholder="仅允许英文和数字" />
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

    <el-dialog v-model="configModalVisible" title="新增参数配置" width="1080px">
      <el-form :model="configForm" label-position="top" class="config-form">
        <div v-for="group in configParamGroups" :key="group.name" class="config-section">
          <div class="config-section-title">
            <h4>{{ group.name }}</h4>
            <span>{{ group.description }}</span>
          </div>
          <el-table :data="group.items" border class="config-edit-table">
            <el-table-column prop="label" label="参数" width="210" />
            <el-table-column prop="key" label="字段名" width="260" />
            <el-table-column label="配置值" width="190">
              <template #default="scope">
                <template v-if="scope.row.type === 'boolean'">
                  <el-switch v-model="configForm[scope.row.key]" active-text="开" inactive-text="关" />
                </template>
                <template v-else>
                  <el-input-number
                    v-model="configForm[scope.row.key]"
                    :min="scope.row.min"
                    :max="scope.row.max"
                    :step="scope.row.step"
                    controls-position="right"
                    @change="handleConfigFieldChange(scope.row.key)"
                  />
                </template>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" min-width="280" />
          </el-table>
        </div>

        <el-form-item label="调整说明" class="config-description">
          <el-input v-model="configDescription" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="configModalVisible = false">取消</el-button>
        <el-button type="primary" :loading="configSaving" @click="submitConfigForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="termModalVisible"
      :title="termModalType === 'add' ? '新增归一化词' : '编辑归一化词'"
      width="640px"
    >
      <el-form :model="termForm" label-position="top">
        <el-form-item label="标准词">
          <el-input v-model="termForm.canonical_term" placeholder="请输入标准词" />
        </el-form-item>
        <el-form-item label="别名集合">
          <el-select
            v-model="termForm.aliases"
            multiple
            filterable
            allow-create
            default-first-option
            style="width: 100%"
            placeholder="输入别名后按回车添加"
          />
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="termForm.is_enabled" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="termForm.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="termModalVisible = false">取消</el-button>
        <el-button type="primary" :loading="termSaving" @click="submitTermForm">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="offlineConfigModalVisible" title="新增切分策略配置" width="760px">
      <el-form :model="offlineConfigForm" label-position="top" class="config-form">
        <div class="two-column">
          <el-form-item label="Parent Chunk 最大字符数" required>
            <el-input-number v-model="offlineConfigForm.doc_parent_chunk_size" :min="1" :step="100" />
          </el-form-item>
          <el-form-item label="Child Chunk 最大字符数" required>
            <el-input-number v-model="offlineConfigForm.doc_child_chunk_size" :min="1" :step="50" />
          </el-form-item>
        </div>
        <div class="two-column">
          <el-form-item label="Child Chunk 重叠字符数" required>
            <el-input-number v-model="offlineConfigForm.doc_child_chunk_overlap" :min="0" :step="10" />
          </el-form-item>
          <el-form-item label="表格行最大字符数" required>
            <el-input-number v-model="offlineConfigForm.table_row_max_chars" :min="1" :step="100" />
          </el-form-item>
        </div>
        <div class="two-column">
          <el-form-item label="表格切分策略">
            <el-select v-model="offlineConfigForm.table_split_strategy" style="width: 100%">
              <el-option label="按行切分(row)" value="row" />
            </el-select>
          </el-form-item>
          <el-form-item label="表格是否要求表头">
            <el-switch v-model="offlineConfigForm.table_header_required" active-text="是" inactive-text="否" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="offlineConfigModalVisible = false">取消</el-button>
        <el-button type="primary" :loading="offlineConfigSaving" @click="submitOfflineConfig">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="kbUploadVisible" title="版本入库" width="900px" :close-on-click-modal="false">
      <el-descriptions :column="3" border class="offline-source-desc">
        <el-descriptions-item label="版本号">{{ selectedKbVersion?.kb_version || '-' }}</el-descriptions-item>
        <el-descriptions-item label="Doc状态">
          {{ selectedKbVersion?.doc_ready ? '已准备' : '未准备' }}
        </el-descriptions-item>
        <el-descriptions-item label="FAQ状态">
          {{ selectedKbVersion?.faq_ready ? '已准备' : '未准备' }}
        </el-descriptions-item>
        <el-descriptions-item label="Doc Collection">{{ selectedKbVersion?.doc_collection_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="FAQ Collection">{{ selectedKbVersion?.faq_collection_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="说明">{{ selectedKbVersion?.description || '-' }}</el-descriptions-item>
      </el-descriptions>
      <el-tabs v-model="knowledgeIngestionTab" class="offline-ingest-form">
        <el-tab-pane label="文档入库" name="document">
          <el-form :model="documentUploadForm" label-position="top" class="local-ingest-form">
            <div class="three-column">
              <el-form-item label="知识库类型" required>
                <el-select v-model="documentUploadForm.scope" style="width: 100%">
                  <el-option
                    v-for="item in scopeOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="文件数量">
                <el-tag effect="plain">{{ documentUploadFiles.length }} 个 Markdown 文件</el-tag>
              </el-form-item>
            </div>
            <el-form-item label="本地 Markdown 目录" required>
              <div class="local-folder-row">
                <input
                  ref="documentFolderInputRef"
                  class="hidden-file-input"
                  type="file"
                  accept=".md"
                  webkitdirectory
                  directory
                  multiple
                  @change="handleDocumentFolderChange"
                />
                <el-button type="primary" plain @click="chooseLocalFolder('document')">选择本地目录</el-button>
                <span>{{ formatSelectedFolder(documentUploadFiles) }}</span>
              </div>
            </el-form-item>
            <el-form-item label="入库说明">
              <el-input
                v-model="documentUploadForm.description"
                type="textarea"
                :rows="3"
                placeholder="说明本次文档局部更新范围"
              />
            </el-form-item>
            <div class="local-ingest-actions">
              <el-button
                type="primary"
                :loading="documentUploadSubmitting"
                :disabled="!documentUploadFiles.length"
                @click="submitDocumentUpload"
              >
                开始文档入库
              </el-button>
            </div>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="FAQ 入库" name="faq">
          <el-form :model="faqUploadForm" label-position="top" class="local-ingest-form">
            <div class="three-column">
              <el-form-item label="知识库类型" required>
                <el-select v-model="faqUploadForm.scope" style="width: 100%">
                  <el-option
                    v-for="item in scopeOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                </el-select>
              </el-form-item>
              <el-form-item label="文件数量">
                <el-tag effect="plain">{{ faqUploadFiles.length }} 个 CSV 文件</el-tag>
              </el-form-item>
            </div>
            <el-form-item label="本地 FAQ CSV 目录" required>
              <div class="local-folder-row">
                <input
                  ref="faqFolderInputRef"
                  class="hidden-file-input"
                  type="file"
                  accept=".csv"
                  webkitdirectory
                  directory
                  multiple
                  @change="handleFaqFolderChange"
                />
                <el-button type="primary" plain @click="chooseLocalFolder('faq')">选择本地目录</el-button>
                <span>{{ formatSelectedFolder(faqUploadFiles) }}</span>
              </div>
            </el-form-item>
            <el-form-item label="入库说明">
              <el-input
                v-model="faqUploadForm.description"
                type="textarea"
                :rows="3"
                placeholder="说明本次 FAQ 局部更新范围"
              />
            </el-form-item>
            <div class="local-ingest-actions">
              <el-button
                type="primary"
                :loading="faqUploadSubmitting"
                :disabled="!faqUploadFiles.length"
                @click="submitFaqUpload"
              >
                开始 FAQ 入库
              </el-button>
            </div>
          </el-form>
        </el-tab-pane>
      </el-tabs>
      <div v-if="activeOfflineTask.task_id" class="json-import-progress">
        <div class="json-import-progress-head">
          <span>{{ activeOfflineTask.current_stage || activeOfflineTask.status }}</span>
          <span>{{ activeOfflineTask.progress_percent || 0 }}%</span>
        </div>
        <el-progress :percentage="Number(activeOfflineTask.progress_percent || 0)" :stroke-width="10" />
        <div class="json-import-current">
          任务：{{ activeOfflineTask.task_id }}；版本：{{ activeOfflineTask.kb_version || '-' }}
        </div>
      </div>
      <template #footer>
        <el-button @click="kbUploadVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="directoryPickerVisible" title="选择服务器目录" width="760px" :close-on-click-modal="false">
      <div class="directory-picker-toolbar">
        <el-button :disabled="!directoryPickerState.parentPath" @click="loadServerDirectory(directoryPickerState.parentPath)">
          上一级
        </el-button>
        <el-button @click="loadServerDirectory('')">磁盘根目录</el-button>
        <span class="directory-current-path">{{ directoryPickerState.currentPath || '请选择一个服务器目录' }}</span>
      </div>
      <el-table
        :data="directoryPickerState.directories"
        v-loading="directoryPickerLoading"
        height="360"
        style="width: 100%"
        @row-dblclick="enterServerDirectory"
      >
        <el-table-column prop="name" label="目录名" min-width="180" show-overflow-tooltip />
        <el-table-column prop="path" label="完整路径" min-width="360" show-overflow-tooltip />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="scope">
            <el-button link type="primary" @click="enterServerDirectory(scope.row)">进入</el-button>
            <el-button link type="success" @click="selectServerDirectory(scope.row.path)">选择</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="directoryPickerVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!directoryPickerState.currentPath" @click="selectServerDirectory(directoryPickerState.currentPath)">
          选择当前目录
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="jsonImportVisible"
      title="JSON 入库"
      width="760px"
      :close-on-click-modal="false"
      :close-on-press-escape="false"
      @closed="resetJsonImport"
    >
      <el-form :model="jsonImportForm" label-position="top">
        <el-form-item label="入库类型" required>
          <el-radio-group v-model="jsonImportForm.recordType">
            <el-radio value="faq">FAQ 向量库</el-radio>
            <el-radio value="doc">文档向量库</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="JSON 文件" required>
          <el-upload
            v-model:file-list="jsonImportFiles"
            class="upload-drag"
            drag
            action="#"
            :auto-upload="false"
            accept=".json"
            multiple
            :on-change="handleJsonFileChange"
            :on-remove="handleJsonFileRemove"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">将 JSON 文件拖到此处，或 <em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">
                支持多文件；FAQ 写入 faq_collection_dev_sample，文档写入 doc_collection_dev_sample。
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>

      <div v-if="jsonImportLoading || jsonImportProgressRows.length" class="json-import-progress">
        <div class="json-import-progress-head">
          <span>入库进度</span>
          <span>{{ jsonImportProgress.current }} / {{ jsonImportProgress.total }}</span>
        </div>
        <el-progress
          :percentage="jsonImportProgress.percent"
          :status="getJsonImportProgressStatus()"
          :stroke-width="10"
        />
        <div v-if="jsonImportProgress.currentFile" class="json-import-current">
          当前文件：{{ jsonImportProgress.currentFile }}
        </div>
        <el-table :data="jsonImportProgressRows" size="small" style="width: 100%; margin-top: 12px">
          <el-table-column prop="file_name" label="文件名" min-width="180" show-overflow-tooltip />
          <el-table-column label="状态" width="100" align="center">
            <template #default="scope">
              <el-tag :type="getJsonImportRowTagType(scope.row.status)" effect="plain">
                {{ scope.row.status_text }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="版本" min-width="160" show-overflow-tooltip>
            <template #default="scope">
              <span>{{ formatJsonImportVersions(scope.row.kb_versions) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="total_count" label="总条数" width="90" align="center" />
          <el-table-column prop="success_count" label="成功" width="90" align="center" />
          <el-table-column prop="failed_count" label="失败" width="90" align="center" />
          <el-table-column prop="message" label="说明" min-width="220" show-overflow-tooltip />
        </el-table>
      </div>

      <div v-if="jsonImportResult" class="json-import-result">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="Collection">{{ jsonImportResult.collection_name }}</el-descriptions-item>
          <el-descriptions-item label="知识库版本">{{ formatJsonImportVersions(jsonImportResult.kb_versions) }}</el-descriptions-item>
          <el-descriptions-item label="文件数">{{ jsonImportResult.total_files }}</el-descriptions-item>
          <el-descriptions-item label="成功条数">{{ jsonImportResult.success_count }}</el-descriptions-item>
          <el-descriptions-item label="失败条数">{{ jsonImportResult.failed_count }}</el-descriptions-item>
          <el-descriptions-item label="成功文件">{{ jsonImportResult.success_files }}</el-descriptions-item>
          <el-descriptions-item label="失败文件">{{ jsonImportResult.failed_files }}</el-descriptions-item>
        </el-descriptions>

        <el-table :data="jsonImportResult.file_results || []" size="small" style="width: 100%; margin-top: 14px">
          <el-table-column prop="file_name" label="文件名" min-width="180" show-overflow-tooltip />
          <el-table-column label="版本" min-width="160" show-overflow-tooltip>
            <template #default="scope">
              <span>{{ formatJsonImportVersions(scope.row.kb_versions) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="total_count" label="总条数" width="90" align="center" />
          <el-table-column prop="success_count" label="成功" width="90" align="center" />
          <el-table-column prop="failed_count" label="失败" width="90" align="center" />
          <el-table-column label="失败原因" min-width="220" show-overflow-tooltip>
            <template #default="scope">
              <span>{{ formatJsonImportFailures(scope.row.failed_items) }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="jsonImportVisible = false">取消</el-button>
        <el-button type="primary" :loading="jsonImportLoading" @click="submitJsonImport">开始入库</el-button>
      </template>
    </el-dialog>

  </AdminLayout>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, UploadFilled } from '@element-plus/icons-vue'
import {
  deleteAdminConversation,
  getAdminConversationMessages,
  getAdminConversationUsers,
  getAdminConversations
} from '@/api/adminConversations'
import {
  activateConfigVersion,
  createConfigVersion,
  createTermNormalization,
  deleteTermNormalization,
  getConfigVersions,
  getDashboardConfig,
  getKeywordRules,
  getTermNormalizations,
  updateKeywordRuleKeywords,
  updateTermNormalization
} from '@/api/adminConfig'
import { createAdminUser, disableAdminUser, getAdminUsers, updateAdminUser } from '@/api/adminUsers'
import {
  createEvaluationDataset,
  deleteEvaluationCase,
  createIngestionQualityRun,
  createRetrievalRun,
  deleteEvaluationDataset,
  getAllEvaluationCases,
  getEvaluationCases,
  getEvaluationDatasets,
  getEvaluationRunCases,
  getEvaluationRuns,
  importEvaluationCases
} from '@/api/adminEvaluation'
import { testRetrieval } from '@/api/adminRetrieval'
import { createKbVersion, getKbVersionPointer, getKbVersions, publishKbVersion, rollbackKbVersion } from '@/api/kbVersions'
import {
  activateOfflineIngestionConfig,
  createDocumentUploadTask,
  createFaqUploadTask,
  createOfflineIngestionConfig,
  createOfflineIngestionTask,
  getActiveOfflineIngestionConfig,
  getOfflineIngestionConfigs,
  getOfflineIngestionTask,
  getOfflineIngestionTasks,
  getServerDirectories
} from '@/api/offlineIngestion'
import { importJsonVectors } from '@/api/vectorIngestJson'
import AdminLayout from '@/layouts/AdminLayout.vue'

const currentTab = ref('dashboard')
const loading = ref(false)
const currentUserId = JSON.parse(localStorage.getItem('userInfo') || '{}').id
const retrievalTestLoading = ref(false)
const retrievalTestResult = ref(null)
const retrievalTestForm = reactive({
  question: '不合格商品整改后，商家需要提交什么样的质检报告才能重新上架？',
  knowledge_base_type: 'enterprise',
  kb_version: '',
  include_answer: true
})
const dashboardLoading = ref(false)
const dashboardConfig = ref({})
const configModalVisible = ref(false)
const configSaving = ref(false)
const configVersionsLoading = ref(false)
const configVersions = ref([])
const configDescription = ref('')

const paramMetas = [
  { group: 'FAQ 快速检索', key: 'faq_exact_match_max_length', label: 'FAQ 精确匹配最大长度', description: 'FAQ 快速检索的问题最大字符长度', min: 1, step: 1 },
  { group: 'FAQ 快速检索', key: 'faq_fast_retrieval_limit', label: 'FAQ 快速召回数量', description: 'FAQ 快速检索候选返回数量', min: 1, step: 1 },
  { group: 'FAQ 快速检索', key: 'faq_fast_dense_weight', label: 'FAQ 快速稠密权重', description: 'FAQ 快速检索稠密检索权重', min: 0, max: 1, step: 0.01 },
  { group: 'FAQ 快速检索', key: 'faq_fast_sparse_weight', label: 'FAQ 快速稀疏权重', description: 'FAQ 快速检索稀疏检索权重', min: 0, max: 1, step: 0.01 },
  { group: '上下文与查询变体', key: 'follow_up_max_length', label: '追问判断最大长度', description: '追问判断的问题最大字符长度', min: 1, step: 1 },
  { group: '上下文与查询变体', key: 'recent_message_keep_count', label: '最近消息保留条数', description: '不压缩、保留原文的最近消息条数', min: 0, step: 1 },
  { group: '上下文与查询变体', key: 'history_summary_max_chars', label: '历史摘要字符上限', description: '历史消息摘要字符上限', min: 1, step: 1 },
  { group: '上下文与查询变体', key: 'variant_generation_enabled', label: '启用查询变体生成', description: '是否启用查询变体生成', type: 'boolean' },
  { group: '上下文与查询变体', key: 'llm_variant_count', label: 'LLM 变体数量', description: 'LLM 变体生成数量，可动态调整为 N', min: 0, step: 1 },
  { group: 'FAQ 混合检索', key: 'faq_candidate_limit_per_query', label: 'FAQ 每 query 候选数量', description: 'FAQ 混合检索中每条 query 的候选返回数量', min: 1, step: 1 },
  { group: 'FAQ 混合检索', key: 'faq_fusion_top_k', label: 'FAQ 融合保留数量', description: 'FAQ 多 query 候选合并、去重、融合后保留数量', min: 1, step: 1 },
  { group: 'FAQ 混合检索', key: 'faq_dense_weight', label: 'FAQ 稠密权重', description: 'FAQ 稠密检索权重', min: 0, max: 1, step: 0.01 },
  { group: 'FAQ 混合检索', key: 'faq_sparse_weight', label: 'FAQ 稀疏权重', description: 'FAQ 稀疏检索权重', min: 0, max: 1, step: 0.01 },
  { group: 'FAQ 混合检索', key: 'faq_rerank_top_k', label: 'FAQ rerank 保留数量', description: 'FAQ rerank 后保留数量', min: 1, step: 1 },
  { group: 'FAQ 混合检索', key: 'faq_high_conf_threshold', label: 'FAQ 高置信阈值', description: 'FAQ 高置信阈值', min: 0, max: 1, step: 0.01 },
  { group: 'FAQ 混合检索', key: 'faq_middle_conf_threshold', label: 'FAQ 中置信阈值', description: 'FAQ 中置信阈值', min: 0, max: 1, step: 0.01 },
  { group: '文档混合检索', key: 'doc_candidate_limit_per_query', label: '文档每 query 候选数量', description: '文档混合检索中每条 query 的候选返回数量', min: 1, step: 1 },
  { group: '文档混合检索', key: 'doc_fusion_top_k', label: '文档融合保留数量', description: '文档多 query 候选合并、去重、融合后保留数量', min: 1, step: 1 },
  { group: '文档混合检索', key: 'doc_dense_weight', label: '文档稠密权重', description: '文档稠密检索权重', min: 0, max: 1, step: 0.01 },
  { group: '文档混合检索', key: 'doc_sparse_weight', label: '文档稀疏权重', description: '文档稀疏检索权重', min: 0, max: 1, step: 0.01 },
  { group: '文档混合检索', key: 'doc_rerank_top_k', label: '文档 rerank 保留数量', description: '文档 rerank 后保留子块数量', min: 1, step: 1 },
  { group: '文档混合检索', key: 'doc_evidence_threshold', label: '文档证据可用阈值', description: '文档证据可用阈值', min: 0, max: 1, step: 0.01 },
  { group: '最终证据', key: 'final_evidence_top_k', label: '最终 evidence 数量', description: '最终交给 LLM 的 evidence 数量', min: 1, step: 1 }
]

const groupDescriptions = {
  'FAQ 快速检索': '精确场景下先行召回 FAQ 候选，权重成对联动。',
  上下文与查询变体: '控制追问识别、历史摘要和查询变体生成。',
  'FAQ 混合检索': 'FAQ 多 query 召回、融合、重排和置信判断。',
  文档混合检索: '文档候选召回、融合、重排和证据阈值。',
  最终证据: '控制最终交给 LLM 的证据数量。'
}

const configParamGroups = computed(() => {
  const groupMap = new Map()
  paramMetas.forEach((item) => {
    if (!groupMap.has(item.group)) {
      groupMap.set(item.group, {
        name: item.group,
        description: groupDescriptions[item.group] || '',
        items: []
      })
    }
    groupMap.get(item.group).items.push(item)
  })
  return Array.from(groupMap.values())
})

const configForm = reactive({
  variant_generation_enabled: true,
  llm_variant_count: 1,
  faq_exact_match_max_length: 48,
  faq_fast_retrieval_limit: 5,
  faq_fast_dense_weight: 0.5,
  faq_fast_sparse_weight: 0.5,
  follow_up_max_length: 10,
  recent_message_keep_count: 8,
  history_summary_max_chars: 800,
  faq_candidate_limit_per_query: 20,
  faq_fusion_top_k: 20,
  faq_rerank_top_k: 3,
  doc_candidate_limit_per_query: 50,
  doc_fusion_top_k: 20,
  doc_rerank_top_k: 5,
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

const retrievalAnswer = computed(() => retrievalTestResult.value?.answer_result || null)
const retrievalDebug = computed(() => retrievalTestResult.value?.candidate_debug || null)

const formatScore = (value) => {
  if (value === undefined || value === null || value === '') {
    return '-'
  }
  const number = Number(value)
  if (Number.isNaN(number)) {
    return String(value)
  }
  return number.toFixed(6)
}

const evidencePreview = (row) => row?.parent_content || row?.text || row?.answer || '-'

const runRetrievalTest = async () => {
  const question = retrievalTestForm.question.trim()
  if (!question) {
    ElMessage.warning('请输入测试问题')
    return
  }
  retrievalTestLoading.value = true
  try {
    retrievalTestResult.value = await testRetrieval({
      question,
      knowledge_base_type: retrievalTestForm.knowledge_base_type,
      kb_version: retrievalTestForm.kb_version || null,
      include_answer: retrievalTestForm.include_answer
    })
    ElMessage.success('检索测试完成')
  } catch (error) {
    ElMessage.error(error.message || '检索测试失败')
  } finally {
    retrievalTestLoading.value = false
  }
}

const dashboardParamRows = computed(() => {
  const values = dashboardConfig.value.hot_values || dashboardConfig.value.raw || {}
  return paramMetas.map((item) => ({
    ...item,
    value: values[item.key] ?? '-'
  }))
})

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

const fetchConfigVersions = async () => {
  configVersionsLoading.value = true
  try {
    configVersions.value = await getConfigVersions()
  } catch (error) {
    ElMessage.error(error.message || '参数版本加载失败')
  } finally {
    configVersionsLoading.value = false
  }
}

const openConfigModal = () => {
  const raw = dashboardConfig.value.hot_values || dashboardConfig.value.raw || {}
  editableConfigKeys.forEach((key) => {
    if (raw[key] !== undefined) {
      configForm[key] = raw[key]
    }
  })
  configDescription.value = `新增检索热参数配置 ${new Date().toLocaleString()}`
  configModalVisible.value = true
}

const isWeightPairValid = (dense, sparse) => Math.abs(Number(dense) + Number(sparse) - 1) < 0.000001

const weightPairs = {
  faq_fast_dense_weight: 'faq_fast_sparse_weight',
  faq_fast_sparse_weight: 'faq_fast_dense_weight',
  faq_dense_weight: 'faq_sparse_weight',
  faq_sparse_weight: 'faq_dense_weight',
  doc_dense_weight: 'doc_sparse_weight',
  doc_sparse_weight: 'doc_dense_weight'
}

const handleConfigFieldChange = (key) => {
  const pairKey = weightPairs[key]
  if (!pairKey) return
  const value = Number(configForm[key])
  if (Number.isNaN(value)) return
  configForm[key] = Number(value.toFixed(2))
  configForm[pairKey] = Number((1 - configForm[key]).toFixed(2))
}

const submitConfigForm = async () => {
  const raw = dashboardConfig.value.hot_values || dashboardConfig.value.raw || {}
  const nextConfig = { ...raw }
  editableConfigKeys.forEach((key) => {
    nextConfig[key] = configForm[key]
  })

  if (!isWeightPairValid(nextConfig.faq_fast_dense_weight, nextConfig.faq_fast_sparse_weight)) {
    ElMessage.error('FAQ 快速 Dense 与 Sparse 权重之和必须等于 1')
    return
  }
  if (!isWeightPairValid(nextConfig.faq_dense_weight, nextConfig.faq_sparse_weight)) {
    ElMessage.error('FAQ Dense 与 Sparse 权重之和必须等于 1')
    return
  }
  if (!isWeightPairValid(nextConfig.doc_dense_weight, nextConfig.doc_sparse_weight)) {
    ElMessage.error('Doc Dense 与 Sparse 权重之和必须等于 1')
    return
  }

  configSaving.value = true
  try {
    await createConfigVersion({
      config: nextConfig,
      description: configDescription.value,
      activate: false
    })
    ElMessage.success('参数配置已保存')
    configModalVisible.value = false
    fetchConfigVersions()
  } catch (error) {
    ElMessage.error(error.message || '参数保存失败')
  } finally {
    configSaving.value = false
  }
}

const activateConfig = async (versionId) => {
  try {
    await activateConfigVersion(versionId)
    ElMessage.success('参数配置已启用')
    await Promise.all([fetchDashboardConfig(), fetchConfigVersions()])
  } catch (error) {
    ElMessage.error(error.message || '参数启用失败')
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
  ...(userModalType.value === 'add' ? { username: userForm.username } : {}),
  password: userForm.password || undefined,
  displayName: userForm.displayName,
  name: userForm.name || userForm.displayName,
  department: userForm.department,
  role: userForm.role,
  status: userForm.status,
  category: userForm.role === 'admin' ? 'admin' : userForm.category
})

const submitUserForm = async () => {
  if (userModalType.value === 'add' && !/^[A-Za-z0-9]+$/.test(userForm.username)) {
    ElMessage.error('账号只允许英文和数字')
    return
  }
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

const keywordRulesLoading = ref(false)
const keywordRules = ref([])

const fetchKeywordRules = async () => {
  keywordRulesLoading.value = true
  try {
    const data = await getKeywordRules()
    keywordRules.value = data.map((item) => ({
      ...item,
      editKeywords: [...(item.keywords || [])],
      editResponseText: item.response_text || ''
    }))
  } catch (error) {
    ElMessage.error(error.message || '关键词规则加载失败')
  } finally {
    keywordRulesLoading.value = false
  }
}

const saveKeywordRule = async (rule) => {
  try {
    const data = await updateKeywordRuleKeywords(rule.rule_code, {
      keywords: rule.editKeywords,
      response_text: rule.editResponseText
    })
    Object.assign(rule, data, {
      editKeywords: [...(data.keywords || [])],
      editResponseText: data.response_text || ''
    })
    ElMessage.success('规则配置已保存')
  } catch (error) {
    ElMessage.error(error.message || '规则配置保存失败')
  }
}

const termLoading = ref(false)
const termSaving = ref(false)
const termModalVisible = ref(false)
const termModalType = ref('add')
const termNormalizations = ref([])
const termForm = reactive({
  id: '',
  canonical_term: '',
  aliases: [],
  description: '',
  is_enabled: true
})

const fetchTermNormalizations = async () => {
  termLoading.value = true
  try {
    termNormalizations.value = await getTermNormalizations()
  } catch (error) {
    ElMessage.error(error.message || '归一化词加载失败')
  } finally {
    termLoading.value = false
  }
}

const openTermModal = (type, row = null) => {
  termModalType.value = type
  if (type === 'edit' && row) {
    Object.assign(termForm, {
      id: row.id,
      canonical_term: row.canonical_term,
      aliases: [...(row.aliases || [])],
      description: row.description || '',
      is_enabled: row.is_enabled
    })
  } else {
    Object.assign(termForm, {
      id: '',
      canonical_term: '',
      aliases: [],
      description: '',
      is_enabled: true
    })
  }
  termModalVisible.value = true
}

const buildTermPayload = () => ({
  canonical_term: termForm.canonical_term,
  aliases: termForm.aliases,
  description: termForm.description,
  is_enabled: termForm.is_enabled
})

const submitTermForm = async () => {
  termSaving.value = true
  try {
    if (termModalType.value === 'add') {
      await createTermNormalization(buildTermPayload())
      ElMessage.success('归一化词已新增')
    } else {
      await updateTermNormalization(termForm.id, buildTermPayload())
      ElMessage.success('归一化词已更新')
    }
    termModalVisible.value = false
    fetchTermNormalizations()
  } catch (error) {
    ElMessage.error(error.message || '归一化词保存失败')
  } finally {
    termSaving.value = false
  }
}

const removeTerm = (row) => {
  ElMessageBox.confirm(`确定删除归一化词“${row.canonical_term}”吗？`, '删除归一化词', { type: 'warning' })
    .then(async () => {
      await deleteTermNormalization(row.id)
      ElMessage.success('归一化词已删除')
      fetchTermNormalizations()
    })
    .catch(() => {})
}

const kbList = ref([])
const kbUploadVisible = ref(false)
const selectedKbVersion = ref(null)
const offlineConfigModalVisible = ref(false)
const offlineConfigSaving = ref(false)
const offlineLoading = ref(false)
const offlineTaskLoading = ref(false)
const offlineTaskSubmitting = ref(false)
const offlineConfigs = ref([])
const offlineTasks = ref([])
const activeOfflineConfig = ref({})
const activeOfflineTask = ref({})
const kbPointer = ref({})
const offlineTaskPollTimers = new Map()
const knowledgeIngestionTab = ref('document')
const documentFolderInputRef = ref(null)
const faqFolderInputRef = ref(null)
const documentUploadFiles = ref([])
const faqUploadFiles = ref([])
const documentUploadSubmitting = ref(false)
const faqUploadSubmitting = ref(false)
const directoryPickerVisible = ref(false)
const directoryPickerLoading = ref(false)
const directoryPickerTarget = ref('source')
const directoryPickerState = reactive({
  currentPath: '',
  parentPath: null,
  directories: []
})
const jsonImportVisible = ref(false)
const jsonImportLoading = ref(false)
const jsonImportResult = ref(null)
const jsonImportProgressRows = ref([])
const jsonImportProgress = reactive({
  current: 0,
  total: 0,
  percent: 0,
  currentFile: '',
  hasError: false
})
const jsonImportFiles = ref([])
const kbForm = reactive({
  description: '',
  autoEnable: true,
  sourceConfigId: null,
  source_data_root: '',
  clean_markdown_dir: '',
  index_csv_name: '',
  faq_csv_dir: ''
})
const documentUploadForm = reactive({
  scope: 'enterprise',
  description: '',
  autoPublish: false
})
const faqUploadForm = reactive({
  scope: 'enterprise',
  description: '',
  autoPublish: false
})
const offlineConfigForm = reactive({
  doc_parent_chunk_size: 1200,
  doc_child_chunk_size: 400,
  doc_child_chunk_overlap: 80,
  table_split_strategy: 'row',
  table_header_required: true,
  table_row_max_chars: 1000
})
const jsonImportForm = reactive({
  recordType: 'faq'
})

const offlineSourceOptions = computed(() =>
  offlineConfigs.value.map((item) => ({
    id: item.id,
    label: `${item.is_enabled ? '当前启用 · ' : ''}${item.source_data_root}/${item.clean_markdown_dir}`,
    source_data_root: item.source_data_root,
    clean_markdown_dir: item.clean_markdown_dir,
    index_csv_name: item.index_csv_name,
    faq_csv_dir: item.faq_csv_dir
  }))
)

const scopeOptions = computed(() => {
  const scopes = activeOfflineConfig.value.scope_enum || {
    enterprise: '企业',
    personal_individual: '个人/个体'
  }
  return Object.entries(scopes).map(([value, label]) => ({ value, label }))
})

const fetchKnowledgeWorkbench = async () => {
  offlineLoading.value = true
  offlineTaskLoading.value = true
  try {
    const [configs, activeConfig, versions, pointer, tasks] = await Promise.all([
      getOfflineIngestionConfigs(),
      getActiveOfflineIngestionConfig(),
      getKbVersions(),
      getKbVersionPointer(),
      getOfflineIngestionTasks()
    ])
    offlineConfigs.value = configs || []
    activeOfflineConfig.value = activeConfig || {}
    kbList.value = versions?.items || []
    if (selectedKbVersion.value) {
      selectedKbVersion.value =
        kbList.value.find((item) => item.kb_version === selectedKbVersion.value.kb_version) || selectedKbVersion.value
    }
    kbPointer.value = pointer || {}
    offlineTasks.value = tasks || []
  } catch (error) {
    ElMessage.error(error.message || '知识库入库信息加载失败')
  } finally {
    offlineLoading.value = false
    offlineTaskLoading.value = false
  }
}

const getKbTagType = (status) => {
  const maps = { active: 'success', staged: 'primary', archived: 'info', failed: 'danger' }
  return maps[status] || 'info'
}

const isKbVersionReady = (row) => Boolean(row?.doc_ready && row?.faq_ready)

const getKbVersionMissingText = (row) => {
  const missing = []
  if (!row?.doc_ready) missing.push('Doc')
  if (!row?.faq_ready) missing.push('FAQ')
  return missing.join('、')
}

const createKnowledgeVersion = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请输入版本说明，可留空。', '创建知识库版本', {
      confirmButtonText: '创建',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputPlaceholder: '例如：本次更新企业规则文档和 FAQ'
    })
    const version = await createKbVersion({
      description: value || null,
      doc_collection_name: activeOfflineConfig.value.doc_collection_name || 'doc_collection',
      faq_collection_name: activeOfflineConfig.value.faq_collection_name || 'faq_collection'
    })
    ElMessage.success('知识库版本已创建')
    await fetchKnowledgeWorkbench()
    openVersionIngestion(version)
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(error.message || '知识库版本创建失败')
  }
}

const openVersionIngestion = (row) => {
  if (!row || row.status !== 'staged') {
    ElMessage.warning('只能向 staged 版本入库')
    return
  }
  selectedKbVersion.value = row
  activeOfflineTask.value = {}
  documentUploadFiles.value = []
  faqUploadFiles.value = []
  Object.assign(documentUploadForm, { scope: 'enterprise', description: '', autoPublish: false })
  Object.assign(faqUploadForm, { scope: 'enterprise', description: '', autoPublish: false })
  kbUploadVisible.value = true
}

const getOfflineTaskTagType = (status) => {
  const maps = { pending: 'info', running: 'primary', completed: 'success', failed: 'danger' }
  return maps[status] || 'info'
}

const formatIngestType = (type) => {
  const maps = { document: '文档', faq: 'FAQ', mixed: '混合' }
  return maps[type] || '-'
}

const chooseLocalFolder = (type) => {
  if (type === 'faq') {
    faqFolderInputRef.value?.click()
    return
  }
  documentFolderInputRef.value?.click()
}

const filterLocalFiles = (fileList, suffix) =>
  Array.from(fileList || []).filter((file) => file.name.toLowerCase().endsWith(suffix))

const handleDocumentFolderChange = (event) => {
  documentUploadFiles.value = filterLocalFiles(event.target.files, '.md')
  if (!documentUploadFiles.value.length) {
    ElMessage.warning('选择的目录中没有 Markdown 文件')
  }
  event.target.value = ''
}

const handleFaqFolderChange = (event) => {
  faqUploadFiles.value = filterLocalFiles(event.target.files, '.csv')
  if (!faqUploadFiles.value.length) {
    ElMessage.warning('选择的目录中没有 CSV 文件')
  }
  event.target.value = ''
}

const formatSelectedFolder = (files) => {
  if (!files.length) return '尚未选择目录'
  const firstPath = files[0].webkitRelativePath || files[0].name
  const folder = firstPath.includes('/') ? firstPath.split('/')[0] : '已选择目录'
  return `${folder}，${files.length} 个文件`
}

const buildUploadFormData = (files, form) => {
  const formData = new FormData()
  formData.append('kb_version', selectedKbVersion.value?.kb_version || '')
  formData.append('scope', form.scope)
  formData.append('version_description', form.description || '')
  formData.append('auto_publish', 'false')
  files.forEach((file) => {
    formData.append('files', file, file.webkitRelativePath || file.name)
  })
  return formData
}

const afterUploadTaskCreated = async (result, successMessage) => {
  ElMessage.success(successMessage)
  activeOfflineTask.value = {
    task_id: result.task_id,
    status: result.status,
    ingest_type: result.ingest_type,
    kb_version: result.kb_version || selectedKbVersion.value?.kb_version,
    progress_percent: 0,
    current_stage: '等待执行'
  }
  await fetchKnowledgeWorkbench()
  pollOfflineTask(result.task_id)
}

const submitDocumentUpload = async () => {
  if (!selectedKbVersion.value?.kb_version) {
    ElMessage.error('请先选择 staged 知识库版本')
    return
  }
  if (!documentUploadFiles.value.length) {
    ElMessage.error('请先选择包含 Markdown 文件的本地目录')
    return
  }
  documentUploadSubmitting.value = true
  try {
    const result = await createDocumentUploadTask(buildUploadFormData(documentUploadFiles.value, documentUploadForm))
    documentUploadFiles.value = []
    await afterUploadTaskCreated(result, '文档入库任务已提交')
  } catch (error) {
    ElMessage.error(error.message || '文档入库任务提交失败')
  } finally {
    documentUploadSubmitting.value = false
  }
}

const submitFaqUpload = async () => {
  if (!selectedKbVersion.value?.kb_version) {
    ElMessage.error('请先选择 staged 知识库版本')
    return
  }
  if (!faqUploadFiles.value.length) {
    ElMessage.error('请先选择包含 FAQ CSV 文件的本地目录')
    return
  }
  faqUploadSubmitting.value = true
  try {
    const result = await createFaqUploadTask(buildUploadFormData(faqUploadFiles.value, faqUploadForm))
    faqUploadFiles.value = []
    await afterUploadTaskCreated(result, 'FAQ 入库任务已提交')
  } catch (error) {
    ElMessage.error(error.message || 'FAQ 入库任务提交失败')
  } finally {
    faqUploadSubmitting.value = false
  }
}

const openOfflineConfigModal = () => {
  const base = activeOfflineConfig.value || {}
  Object.assign(offlineConfigForm, {
    doc_parent_chunk_size: Number(base.doc_parent_chunk_size || 1200),
    doc_child_chunk_size: Number(base.doc_child_chunk_size || 400),
    doc_child_chunk_overlap: Number(base.doc_child_chunk_overlap || 80),
    table_split_strategy: base.table_split_strategy || 'row',
    table_header_required: base.table_header_required ?? true,
    table_row_max_chars: Number(base.table_row_max_chars || 1000)
  })
  offlineConfigModalVisible.value = true
}

const validateOfflineConfigForm = () => {
  if (offlineConfigForm.doc_child_chunk_overlap >= offlineConfigForm.doc_child_chunk_size) {
    ElMessage.error('Child Chunk 重叠字符数必须小于 Child Chunk 最大字符数')
    return false
  }
  if (offlineConfigForm.table_split_strategy !== 'row') {
    ElMessage.error('第一版表格切分策略只支持 row')
    return false
  }
  return true
}

const submitOfflineConfig = async () => {
  if (!validateOfflineConfigForm()) return
  offlineConfigSaving.value = true
  try {
    await createOfflineIngestionConfig({ ...offlineConfigForm })
    ElMessage.success('切分策略配置已保存')
    offlineConfigModalVisible.value = false
    fetchKnowledgeWorkbench()
  } catch (error) {
    ElMessage.error(error.message || '切分策略配置保存失败')
  } finally {
    offlineConfigSaving.value = false
  }
}

const activateOfflineConfig = async (configId) => {
  try {
    await activateOfflineIngestionConfig(configId)
    ElMessage.success('切分策略已启用')
    fetchKnowledgeWorkbench()
  } catch (error) {
    ElMessage.error(error.message || '切分策略启用失败')
  }
}

const publishVersion = (row) => {
  if (!isKbVersionReady(row)) {
    ElMessage.warning(`版本内容未完整，缺少：${getKbVersionMissingText(row)}`)
    return
  }
  ElMessageBox.confirm(`确定发布版本 ${row.kb_version} 吗？发布后将成为当前线上知识库版本。`, '发布知识库版本', {
    type: 'warning'
  })
    .then(async () => {
      await publishKbVersion(row.kb_version, 'publish from admin knowledge page')
      ElMessage.success('知识库版本已发布')
      fetchKnowledgeWorkbench()
    })
    .catch(() => {})
}

const rollbackVersion = (row) => {
  ElMessageBox.confirm(`确定回滚到版本 ${row.kb_version} 吗？当前 active 版本会归档。`, '回滚知识库版本', {
    type: 'warning'
  })
    .then(async () => {
      await rollbackKbVersion(row.kb_version, 'rollback from admin knowledge page')
      ElMessage.success('知识库版本已切换')
      fetchKnowledgeWorkbench()
    })
    .catch(() => {})
}

const openOfflineIngestionModal = () => {
  activeOfflineTask.value = {}
  const base = activeOfflineConfig.value || {}
  Object.assign(kbForm, {
    description: '',
    autoEnable: true,
    sourceConfigId: base.id || null,
    source_data_root: base.source_data_root || '',
    clean_markdown_dir: base.clean_markdown_dir || '',
    index_csv_name: base.index_csv_name || 'index.csv',
    faq_csv_dir: base.faq_csv_dir || 'faq'
  })
  kbUploadVisible.value = true
}

const applyOfflineSourceOption = (configId) => {
  const option = offlineSourceOptions.value.find((item) => item.id === configId)
  if (!option) return
  Object.assign(kbForm, {
    source_data_root: option.source_data_root,
    clean_markdown_dir: option.clean_markdown_dir,
    index_csv_name: option.index_csv_name,
    faq_csv_dir: option.faq_csv_dir
  })
}

const joinServerPath = (root = '', child = '') => {
  if (!root || !child) return root || child || ''
  const separator = root.includes('\\') ? '\\' : '/'
  return `${root.replace(/[\\/]+$/, '')}${separator}${child.replace(/^[\\/]+/, '')}`
}

const splitServerPath = (path = '') => {
  const normalized = path.replace(/[\\/]+$/, '')
  const index = Math.max(normalized.lastIndexOf('\\'), normalized.lastIndexOf('/'))
  if (index < 0) return { parent: '', name: normalized }
  let parent = normalized.slice(0, index)
  if (/^[A-Za-z]:$/.test(parent)) parent = `${parent}\\`
  return {
    parent,
    name: normalized.slice(index + 1)
  }
}

const loadServerDirectory = async (path = '') => {
  directoryPickerLoading.value = true
  try {
    const data = await getServerDirectories(path || '')
    directoryPickerState.currentPath = data.current_path || ''
    directoryPickerState.parentPath = data.parent_path || null
    directoryPickerState.directories = data.directories || []
  } catch (error) {
    ElMessage.error(error.message || '服务器目录加载失败')
  } finally {
    directoryPickerLoading.value = false
  }
}

const openDirectoryPicker = async (target) => {
  directoryPickerTarget.value = target
  directoryPickerVisible.value = true
  const startPath =
    target === 'clean'
      ? joinServerPath(kbForm.source_data_root, kbForm.clean_markdown_dir)
      : kbForm.source_data_root
  await loadServerDirectory(startPath)
}

const enterServerDirectory = (row) => {
  if (!row?.path) return
  loadServerDirectory(row.path)
}

const selectServerDirectory = (path) => {
  if (!path) {
    ElMessage.warning('请先选择服务器目录')
    return
  }
  if (directoryPickerTarget.value === 'clean') {
    const { parent, name } = splitServerPath(path)
    kbForm.source_data_root = parent
    kbForm.clean_markdown_dir = name
  } else {
    kbForm.source_data_root = path
  }
  directoryPickerVisible.value = false
}

const getFileExtension = (fileName = '') => {
  const normalizedName = fileName.toLowerCase()
  const index = normalizedName.lastIndexOf('.')
  return index > -1 ? normalizedName.slice(index + 1) : ''
}

const isJsonFile = (fileName = '') => getFileExtension(fileName) === 'json'

const handleJsonFileChange = (uploadFile, uploadFiles) => {
  if (!isJsonFile(uploadFile.name)) {
    ElMessage.error('JSON 入库当前仅支持 .json 文件')
    jsonImportFiles.value = uploadFiles.filter((file) => file.uid !== uploadFile.uid)
    return false
  }

  jsonImportFiles.value = uploadFiles
  return true
}

const handleJsonFileRemove = (_uploadFile, uploadFiles) => {
  jsonImportFiles.value = uploadFiles
}

const resetJsonImport = () => {
  Object.assign(jsonImportForm, { recordType: 'faq' })
  jsonImportFiles.value = []
  jsonImportResult.value = null
  jsonImportLoading.value = false
  resetJsonImportProgress()
}

const resetJsonImportProgress = () => {
  jsonImportProgressRows.value = []
  Object.assign(jsonImportProgress, {
    current: 0,
    total: 0,
    percent: 0,
    currentFile: '',
    hasError: false
  })
}

const getJsonImportProgressStatus = () => {
  if (jsonImportLoading.value) return undefined
  if (jsonImportProgress.hasError) return 'exception'
  if (jsonImportProgress.total > 0 && jsonImportProgress.current === jsonImportProgress.total) return 'success'
  return undefined
}

const getJsonImportRowTagType = (status) => {
  const maps = {
    pending: 'info',
    running: 'primary',
    success: 'success',
    failed: 'danger'
  }
  return maps[status] || 'info'
}

const updateJsonImportPercent = () => {
  jsonImportProgress.percent =
    jsonImportProgress.total > 0 ? Math.round((jsonImportProgress.current / jsonImportProgress.total) * 100) : 0
}

const buildJsonImportSummary = (fileResults, recordType) => {
  const collectionName = recordType === 'faq' ? 'faq_collection_dev_sample' : 'doc_collection_dev_sample'
  const successFiles = fileResults.filter((item) => item.status === 'success').length
  const failedFiles = fileResults.filter((item) => item.status === 'failed').length

  return {
    record_type: recordType,
    collection_name: fileResults.find((item) => item.collection_name)?.collection_name || collectionName,
    total_files: fileResults.length,
    success_files: successFiles,
    failed_files: failedFiles,
    kb_versions: Array.from(new Set(fileResults.flatMap((item) => item.kb_versions || []))),
    total_count: fileResults.reduce((sum, item) => sum + Number(item.total_count || 0), 0),
    success_count: fileResults.reduce((sum, item) => sum + Number(item.success_count || 0), 0),
    failed_count: fileResults.reduce((sum, item) => sum + Number(item.failed_count || 0), 0),
    file_results: fileResults
  }
}

const formatJsonImportVersions = (versions = []) => {
  if (!versions.length) return '-'
  return versions.join('，')
}

const formatJsonImportFailures = (failedItems = []) => {
  if (!failedItems.length) return '-'
  return failedItems
    .slice(0, 3)
    .map((item) => {
      const position = item.index >= 0 ? `第 ${item.index + 1} 条` : '文件'
      return `${position}${item.pk ? `(${item.pk})` : ''}: ${item.reason}`
    })
    .join('；')
}

const submitKbUpload = async () => {
  offlineTaskSubmitting.value = true
  try {
    const result = await createOfflineIngestionTask({
      version_description: kbForm.description || null,
      auto_publish: kbForm.autoEnable,
      source_data_root: kbForm.source_data_root,
      clean_markdown_dir: kbForm.clean_markdown_dir,
      index_csv_name: kbForm.index_csv_name,
      faq_csv_dir: kbForm.faq_csv_dir
    })
    ElMessage.success('文档入库任务已提交')
    activeOfflineTask.value = {
      task_id: result.task_id,
      status: result.status,
      progress_percent: 0,
      current_stage: '等待执行'
    }
    await fetchKnowledgeWorkbench()
    pollOfflineTask(result.task_id)
  } catch (error) {
    ElMessage.error(error.message || '文档入库任务提交失败')
  } finally {
    offlineTaskSubmitting.value = false
  }
}

const pollOfflineTask = (taskId) => {
  if (!taskId) return
  if (offlineTaskPollTimers.has(taskId)) {
    clearTimeout(offlineTaskPollTimers.get(taskId))
  }
  const run = async () => {
    try {
      const task = await getOfflineIngestionTask(taskId)
      activeOfflineTask.value = task
      await fetchKnowledgeWorkbench()
      if (['pending', 'running'].includes(task.status)) {
        const timer = setTimeout(run, 3000)
        offlineTaskPollTimers.set(taskId, timer)
      } else {
        offlineTaskPollTimers.delete(taskId)
        if (task.status === 'completed') {
          ElMessage.success('文档入库任务已完成')
        } else if (task.status === 'failed') {
          ElMessage.error(task.error_message || '文档入库任务失败')
        }
      }
    } catch (error) {
      offlineTaskPollTimers.delete(taskId)
      ElMessage.error(error.message || '入库任务状态刷新失败')
    }
  }
  run()
}

const submitJsonImport = async () => {
  if (!jsonImportForm.recordType) {
    ElMessage.error('请选择入库类型')
    return
  }

  if (jsonImportFiles.value.length === 0) {
    ElMessage.error('请上传 JSON 文件')
    return
  }

  if (jsonImportFiles.value.some((file) => !isJsonFile(file.name))) {
    ElMessage.error('JSON 入库当前仅支持 .json 文件')
    return
  }

  const uploadItems = jsonImportFiles.value
    .map((file) => ({ name: file.name, raw: file.raw }))
    .filter((file) => file.raw)
  if (uploadItems.length === 0) {
    ElMessage.error('未读取到可上传的 JSON 文件')
    return
  }

  jsonImportLoading.value = true
  jsonImportResult.value = null
  resetJsonImportProgress()
  jsonImportProgress.total = uploadItems.length
  jsonImportProgressRows.value = uploadItems.map((file) => ({
    file_name: file.name,
    status: 'pending',
    status_text: '等待中',
    total_count: 0,
    success_count: 0,
    failed_count: 0,
    failed_items: [],
    kb_versions: [],
    message: '-'
  }))

  try {
    for (let index = 0; index < uploadItems.length; index += 1) {
      const item = uploadItems[index]
      const row = jsonImportProgressRows.value[index]
      jsonImportProgress.currentFile = item.name
      Object.assign(row, {
        status: 'running',
        status_text: '入库中',
        message: '正在上传并写入向量库'
      })

      try {
        const result = await importJsonVectors({
          recordType: jsonImportForm.recordType,
          files: [item.raw]
        })
        const fileResult = result.file_results?.[0] || {}
        const failedCount = Number(result.failed_count || fileResult.failed_count || 0)
        Object.assign(row, {
          ...fileResult,
          collection_name: result.collection_name,
          file_name: fileResult.file_name || item.name,
          status: failedCount > 0 ? 'failed' : 'success',
          status_text: failedCount > 0 ? '有失败' : '成功',
          kb_versions: fileResult.kb_versions || result.kb_versions || [],
          total_count: Number(fileResult.total_count || result.total_count || 0),
          success_count: Number(fileResult.success_count || result.success_count || 0),
          failed_count: failedCount,
          failed_items: fileResult.failed_items || result.failed_items || [],
          message: failedCount > 0 ? formatJsonImportFailures(fileResult.failed_items || result.failed_items || []) : '入库完成'
        })
      } catch (error) {
        jsonImportProgress.hasError = true
        Object.assign(row, {
          status: 'failed',
          status_text: '失败',
          total_count: 1,
          success_count: 0,
          failed_count: 1,
          failed_items: [{ index: -1, pk: '', reason: error.message || 'JSON 入库失败' }],
          kb_versions: [],
          message: error.message || 'JSON 入库失败'
        })
      } finally {
        jsonImportProgress.current = index + 1
        updateJsonImportPercent()
      }
    }

    const summary = buildJsonImportSummary(jsonImportProgressRows.value, jsonImportForm.recordType)
    jsonImportResult.value = summary
    if (summary.failed_count > 0 || summary.failed_files > 0) {
      ElMessage.warning(`入库完成，成功 ${summary.success_count} 条，失败 ${summary.failed_count} 条`)
    } else {
      ElMessage.success(`入库成功，共 ${summary.success_count} 条`)
    }
  } catch (error) {
    jsonImportProgress.hasError = true
    ElMessage.error(error.message || 'JSON 入库失败')
  } finally {
    jsonImportLoading.value = false
    jsonImportProgress.currentFile = ''
  }
}

const deleteKB = (id) => {
  ElMessageBox.confirm('删除知识库将同步移除相关向量数据，确定继续？', '高危操作', { type: 'error' })
    .then(() => {
      ElMessage.success(`知识库 ${id} 已删除`)
      fetchKnowledgeWorkbench()
    })
    .catch(() => {})
}

const getEvalTagType = (status) => {
  const maps = { pending: 'info', running: 'primary', success: 'success', completed: 'success', failed: 'danger' }
  return maps[status] || 'info'
}

const evaluationTab = ref('datasets')
const evaluationTabs = [
  { name: 'datasets', label: '评估集管理' },
  { name: 'samples', label: '样本总览' },
  { name: 'ingestion', label: '入库质量评估' },
  { name: 'retrieval', label: '检索评估' },
  { name: 'records', label: '评估记录' }
]
const datasetQuery = reactive({ keyword: '', type: '' })
const ingestionForm = reactive({ kbVersion: '', minLength: '', maxLength: '', duplicateThreshold: '' })
const retrievalForm = reactive({ datasetId: '', kbVersion: '', faqTopK: '5', kbTopK: '10' })
const recordQuery = reactive({ type: '', status: '', keyword: '' })
const activeRetrievalDetail = ref(null)

const evaluationDatasets = ref([])
const kbVersionOptions = ref([])
const kbVersionsLoading = ref(false)
const evalDatasetDialogVisible = ref(false)
const evalDatasetSaving = ref(false)
const evalDatasetForm = reactive({ datasetId: '', name: '', evaluationType: 'retrieval_eval', description: '' })
const sampleDialogVisible = ref(false)
const sampleDialogLoading = ref(false)
const activeDataset = ref(null)
const activeDatasetSamples = ref([])
const sampleImportJson = ref('')
const singleSampleForm = reactive({ caseId: '', question: '', expectedFaqIds: '', expectedRuleIds: '', category: '' })
const sampleQuery = reactive({ datasetId: '', category: '', keyword: '' })
const allEvaluationSamples = ref([])
const sampleOverviewLoading = ref(false)
const sampleCreateDialogVisible = ref(false)
const sampleCreateSaving = ref(false)
const sampleCreateForm = reactive({ datasetId: '', caseId: '', question: '', expectedFaqIds: '', expectedRuleIds: '', category: '' })

const filteredEvaluationDatasets = computed(() => {
  const keyword = datasetQuery.keyword.trim()
  return evaluationDatasets.value.filter((item) => {
    const matchedKeyword = !keyword || item.datasetId.includes(keyword) || item.name.includes(keyword)
    const matchedType = !datasetQuery.type || item.type === datasetQuery.type
    return matchedKeyword && matchedType
  })
})

const ingestionMetrics = reactive({
  totalChunks: '0',
  lowQualityChunks: '0',
  tooShortRate: '0',
  duplicateRate: '0'
})

const problemChunks = ref([])
const retrievalEvaluations = ref([])
const retrievalCaseResults = ref([])
const activeRetrievalCase = ref({ caseId: '-', hits: [] })
const evaluationRecords = ref([])

const filteredEvaluationRecords = computed(() => {
  const keyword = recordQuery.keyword.trim()
  return evaluationRecords.value.filter((item) => {
    const matchedType = !recordQuery.type || item.type === recordQuery.type
    const matchedStatus = !recordQuery.status || item.status === recordQuery.status
    const matchedKeyword =
      !keyword || item.taskId.includes(keyword) || item.datasetId.includes(keyword) || item.kbVersion.includes(keyword)
    return matchedType && matchedStatus && matchedKeyword
  })
})

const defaultEvaluationCases = [
  {
    case_id: 'eval_sample_001',
    question: '公司的年假规则是什么？',
    expected_json: {
      expected_faq_ids: ['faq_001'],
      expected_rule_ids: ['rule_annual_leave']
    },
    category: 'policy_fact'
  },
  {
    case_id: 'eval_sample_002',
    question: 'SSD 故障时应该如何申请更换？',
    expected_json: {
      expected_faq_ids: [],
      expected_rule_ids: ['rule_ssd_replacement']
    },
    category: 'process_lookup'
  },
  {
    case_id: 'eval_sample_003',
    question: '报销发票抬头填写有什么要求？',
    expected_json: {
      expected_faq_ids: ['faq_invoice_title'],
      expected_rule_ids: ['rule_reimbursement_invoice']
    },
    category: 'policy_fact'
  }
]

const formatJson = (value) => JSON.stringify(value || {}, null, 2)
const pad2 = (value) => String(value).padStart(2, '0')
const formatCompactDate = (date = new Date()) => {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
    pad2(date.getHours()),
    pad2(date.getMinutes()),
    pad2(date.getSeconds())
  ].join('')
}
const generateEvalDatasetId = () => `eval_set_${formatCompactDate()}_${Math.random().toString(36).slice(2, 6)}`
const generateEvalCaseId = () => `eval_case_${formatCompactDate()}_${Math.random().toString(36).slice(2, 6)}`

const resetEvalDatasetForm = () => {
  evalDatasetForm.datasetId = generateEvalDatasetId()
  evalDatasetForm.name = ''
  evalDatasetForm.evaluationType = 'retrieval_eval'
  evalDatasetForm.description = ''
}

const resetSampleCreateForm = () => {
  sampleCreateForm.datasetId = sampleQuery.datasetId || evaluationDatasets.value[0]?.datasetId || ''
  sampleCreateForm.caseId = ''
  sampleCreateForm.question = ''
  sampleCreateForm.expectedFaqIds = ''
  sampleCreateForm.expectedRuleIds = ''
  sampleCreateForm.category = sampleQuery.category || ''
}

const openSampleCreateDialog = (dataset = null) => {
  resetSampleCreateForm()
  if (dataset?.datasetId) sampleCreateForm.datasetId = dataset.datasetId
  sampleCreateDialogVisible.value = true
}

const resetSingleSampleForm = () => {
  singleSampleForm.caseId = ''
  singleSampleForm.question = ''
  singleSampleForm.expectedFaqIds = ''
  singleSampleForm.expectedRuleIds = ''
  singleSampleForm.category = ''
}

const fillSampleTemplate = () => {
  sampleImportJson.value = formatJson({ items: defaultEvaluationCases })
}

const normalizeExpectedList = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
const normalizeSampleItem = (item) => ({
  case_id: String(item.case_id || item.caseId || generateEvalCaseId()).trim(),
  question: String(item.question || '').trim(),
  expected_json: item.expected_json || item.expectedJson || {
    expected_faq_ids: normalizeExpectedList(item.expected_faq_ids || item.expectedFaqIds),
    expected_rule_ids: normalizeExpectedList(item.expected_rule_ids || item.expectedRuleIds)
  },
  category: item.category || null
})

const parseSampleImportJson = () => {
  const raw = sampleImportJson.value.trim()
  if (!raw) throw new Error('请先粘贴样本 JSON')
  const parsed = JSON.parse(raw)
  const items = Array.isArray(parsed) ? parsed : parsed.items
  if (!Array.isArray(items) || items.length === 0) throw new Error('JSON 需要是数组，或包含 items 数组')
  return items.map(normalizeSampleItem).filter((item) => item.case_id && item.question)
}

const downloadEvalSampleTemplate = () => {
  const content = formatJson({ items: defaultEvaluationCases })
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'evaluation_samples_template.json'
  link.click()
  URL.revokeObjectURL(url)
}

const applyDefaultKbVersion = (version) => {
  if (!version) return
  if (!ingestionForm.kbVersion) ingestionForm.kbVersion = version
  if (!retrievalForm.kbVersion) retrievalForm.kbVersion = version
}

const fetchKbVersionOptions = async () => {
  kbVersionsLoading.value = true
  try {
    const data = await getKbVersions()
    kbVersionOptions.value = (data.items || []).map((item) => ({
      kbVersion: item.kb_version,
      status: item.status || '-',
      label: `${item.kb_version} | ${item.status || '-'}`
    }))
    const defaultVersion = data.active_version || data.activeVersion || kbVersionOptions.value[0]?.kbVersion || ''
    applyDefaultKbVersion(defaultVersion)
  } catch (error) {
    ElMessage.error(error.message || '知识库版本列表获取失败')
  } finally {
    kbVersionsLoading.value = false
  }
}

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const numberOrDefault = (value, defaultValue) => {
  const parsed = toNumberOrNull(value)
  return parsed === null ? defaultValue : parsed
}

const formatPercentMetric = (value) => `${(Number(value || 0) * 100).toFixed(2)}%`

const applyIngestionRun = (run) => {
  const summary = run.summary || {}
  const detail = run.detail || {}
  ingestionMetrics.totalChunks = String(summary.chunk_count ?? detail.chunk_metrics?.chunk_count ?? 0)
  ingestionMetrics.lowQualityChunks = String(summary.low_quality_issue_count ?? detail.chunk_metrics?.low_quality_issue_count ?? 0)
  const chunkCount = Number(summary.chunk_count ?? detail.chunk_metrics?.chunk_count ?? 0)
  const duplicateChunkCount = Number(summary.duplicate_chunk_count ?? detail.chunk_metrics?.duplicate_chunk_count ?? 0)
  ingestionMetrics.tooShortRate = formatPercentMetric(summary.too_short_chunk_rate ?? detail.chunk_metrics?.too_short_chunk_rate ?? 0)
  ingestionMetrics.duplicateRate = formatPercentMetric(chunkCount ? duplicateChunkCount / chunkCount : 0)
  problemChunks.value = (detail.low_quality_issues || []).slice(0, 100).map((item) => ({
    chunkId: item.chunk_id,
    ruleId: item.document_id || '-',
    title: item.reason,
    length: item.text_length,
    issueType: item.issue_type,
    similarity: item.unique_ratio ?? item.duplicate_hash ?? '-'
  }))
}

const fetchEvaluationDatasets = async () => {
  try {
    const data = await getEvaluationDatasets({ keyword: datasetQuery.keyword, evaluationType: datasetQuery.type })
    evaluationDatasets.value = data.items || []
    if (!retrievalForm.datasetId && evaluationDatasets.value.length) {
      retrievalForm.datasetId = evaluationDatasets.value[0].datasetId
    }
  } catch (error) {
    ElMessage.error(error.message || '评估集加载失败')
  }
}

const fetchAllEvaluationSamples = async () => {
  sampleOverviewLoading.value = true
  try {
    const data = await getAllEvaluationCases({
      datasetId: sampleQuery.datasetId,
      category: sampleQuery.category,
      keyword: sampleQuery.keyword,
      pageSize: 200
    })
    allEvaluationSamples.value = data.items || []
  } catch (error) {
    ElMessage.error(error.message || '样本列表加载失败')
  } finally {
    sampleOverviewLoading.value = false
  }
}

const submitSampleCreate = async () => {
  if (!sampleCreateForm.datasetId) {
    ElMessage.warning('请选择评估集')
    return
  }
  if (!sampleCreateForm.question.trim()) {
    ElMessage.warning('请填写问题')
    return
  }
  sampleCreateSaving.value = true
  try {
    const item = normalizeSampleItem({
      caseId: sampleCreateForm.caseId,
      question: sampleCreateForm.question,
      expectedFaqIds: sampleCreateForm.expectedFaqIds,
      expectedRuleIds: sampleCreateForm.expectedRuleIds,
      category: sampleCreateForm.category
    })
    await importEvaluationCases(sampleCreateForm.datasetId, { overwrite: true, items: [item] })
    ElMessage.success('样本新增成功')
    sampleCreateDialogVisible.value = false
    await fetchEvaluationDatasets()
    await fetchAllEvaluationSamples()
    if (activeDataset.value?.datasetId === sampleCreateForm.datasetId) await refreshDatasetSamples()
  } catch (error) {
    ElMessage.error(error.message || '样本新增失败')
  } finally {
    sampleCreateSaving.value = false
  }
}

const deleteSingleEvalSample = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除样本 ${row.caseId} 吗？如果所属评估集已有评估记录，后端会拒绝删除。`, '删除评估样本', { type: 'warning' })
    await deleteEvaluationCase(row.datasetId, row.caseId)
    ElMessage.success('样本已删除')
    await fetchEvaluationDatasets()
    await fetchAllEvaluationSamples()
    if (activeDataset.value?.datasetId === row.datasetId) await refreshDatasetSamples()
  } catch (error) {
    if (error !== 'cancel') ElMessage.error(error.message || '删除失败')
  }
}

const createEvalDataset = () => {
  resetEvalDatasetForm()
  evalDatasetDialogVisible.value = true
}

const submitEvalDataset = async () => {
  const datasetId = evalDatasetForm.datasetId.trim()
  const name = evalDatasetForm.name.trim()
  if (!datasetId) {
    ElMessage.warning('评估集ID不能为空')
    return
  }
  if (!name) {
    ElMessage.warning('评估集名称不能为空')
    return
  }
  evalDatasetSaving.value = true
  try {
    await createEvaluationDataset({
      dataset_id: datasetId,
      name,
      evaluation_type: evalDatasetForm.evaluationType,
      description: evalDatasetForm.description.trim()
    })
    ElMessage.success('评估集创建成功')
    evalDatasetDialogVisible.value = false
    await fetchEvaluationDatasets()
  } catch (error) {
    ElMessage.error(error.message || '评估集创建失败')
  } finally {
    evalDatasetSaving.value = false
  }
}

const openDatasetSamples = async (row) => {
  activeDataset.value = row
  sampleDialogVisible.value = true
  await refreshDatasetSamples()
}

const refreshDatasetSamples = async () => {
  if (!activeDataset.value?.datasetId) {
    activeDatasetSamples.value = []
    return
  }
  sampleDialogLoading.value = true
  try {
    const data = await getEvaluationCases(activeDataset.value.datasetId)
    activeDatasetSamples.value = data.items || []
    activeDataset.value = { ...activeDataset.value, sampleCount: data.total ?? activeDatasetSamples.value.length }
  } catch (error) {
    ElMessage.error(error.message || '样本加载失败')
    activeDatasetSamples.value = []
  } finally {
    sampleDialogLoading.value = false
  }
}

const importEvalSamples = async (row) => {
  const datasetId = row?.datasetId || retrievalForm.datasetId
  if (!datasetId) {
    ElMessage.warning('请先选择评估集')
    return
  }
  try {
    await importEvaluationCases(datasetId, { overwrite: true, items: defaultEvaluationCases })
    ElMessage.success('默认样本已导入')
    await fetchEvaluationDatasets()
    if (activeDataset.value?.datasetId === datasetId) await refreshDatasetSamples()
  } catch (error) {
    ElMessage.error(error.message || '样本导入失败')
  }
}

const importBatchSampleJson = async () => {
  if (!activeDataset.value?.datasetId) {
    ElMessage.warning('请先打开评估样本弹窗')
    return
  }
  try {
    const items = parseSampleImportJson()
    await importEvaluationCases(activeDataset.value.datasetId, { overwrite: true, items })
    ElMessage.success(`已导入 ${items.length} 条样本`)
    await fetchEvaluationDatasets()
    await refreshDatasetSamples()
  } catch (error) {
    ElMessage.error(error.message || '批量导入失败')
  }
}

const importSingleEvalSample = async () => {
  if (!activeDataset.value?.datasetId) {
    ElMessage.warning('请先打开评估样本弹窗')
    return
  }
  if (!singleSampleForm.question.trim()) {
    ElMessage.warning('请填写问题')
    return
  }
  try {
    const item = normalizeSampleItem({
      caseId: singleSampleForm.caseId,
      question: singleSampleForm.question,
      expectedFaqIds: singleSampleForm.expectedFaqIds,
      expectedRuleIds: singleSampleForm.expectedRuleIds,
      category: singleSampleForm.category
    })
    await importEvaluationCases(activeDataset.value.datasetId, { overwrite: true, items: [item] })
    ElMessage.success('单条样本已导入')
    await fetchEvaluationDatasets()
    await refreshDatasetSamples()
    resetSingleSampleForm()
  } catch (error) {
    ElMessage.error(error.message || '单条导入失败')
  }
}

const viewDatasetSamples = async (row) => {
  await openDatasetSamples(row)
}

const deleteEvalDataset = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除评估集 ${row.datasetId} 吗？`, '删除评估集', { type: 'warning' })
    await deleteEvaluationDataset(row.datasetId)
    ElMessage.success('评估集已删除')
    await fetchEvaluationDatasets()
  } catch (error) {
    if (error !== 'cancel') ElMessage.error(error.message || '评估集删除失败')
  }
}

const runIngestionEvaluation = async () => {
  try {
    const run = await createIngestionQualityRun({
      dataset: 'enterprise',
      knowledge_base_version: ingestionForm.kbVersion,
      min_length: numberOrDefault(ingestionForm.minLength, 80),
      max_length: numberOrDefault(ingestionForm.maxLength, 1800),
      duplicate_threshold: numberOrDefault(ingestionForm.duplicateThreshold, 0.95)
    })
    applyIngestionRun(run)
    ElMessage.success('入库质量评估完成')
    await fetchEvaluationRecords()
  } catch (error) {
    ElMessage.error(error.message || '入库质量评估失败')
  }
}

const createRetrievalEvaluation = async () => {
  if (!retrievalForm.datasetId) {
    ElMessage.warning('请选择评估集')
    return
  }
  try {
    const run = await createRetrievalRun({
      dataset_id: retrievalForm.datasetId,
      knowledge_base_version: retrievalForm.kbVersion,
      faq_top_k: Number(retrievalForm.faqTopK) || 5,
      kb_top_k: Number(retrievalForm.kbTopK) || 10,
      mock_mode: false
    })
    retrievalEvaluations.value.unshift(run)
    ElMessage.success('检索评估完成')
    await fetchEvaluationRecords()
  } catch (error) {
    ElMessage.error(error.message || '检索评估失败')
  }
}

const openRetrievalDetail = async (row) => {
  activeRetrievalDetail.value = row
  try {
    const data = await getEvaluationRunCases(row.runId || row.taskId)
    retrievalCaseResults.value = data.items || []
    activeRetrievalCase.value = retrievalCaseResults.value[0] || { caseId: '-', hits: [] }
  } catch (error) {
    retrievalCaseResults.value = []
    activeRetrievalCase.value = { caseId: '-', hits: [] }
    ElMessage.error(error.message || '评估详情加载失败')
  }
}

const rerunRetrievalEvaluation = async (row) => {
  retrievalForm.datasetId = row.datasetId === '-' ? retrievalForm.datasetId : row.datasetId
  retrievalForm.kbVersion = row.kbVersion === '-' ? retrievalForm.kbVersion : row.kbVersion
  await createRetrievalEvaluation()
}

const fetchEvaluationRecords = async () => {
  try {
    const data = await getEvaluationRuns({
      evaluationType: recordQuery.type,
      status: recordQuery.status,
      keyword: recordQuery.keyword,
      pageSize: 50
    })
    evaluationRecords.value = data.items || []
    retrievalEvaluations.value = evaluationRecords.value.filter((item) => item.type === 'retrieval_eval')
  } catch (error) {
    ElMessage.error(error.message || '评估记录加载失败')
  }
}

const viewEvaluationRecord = async (row) => {
  if (row.type === 'retrieval_eval') {
    evaluationTab.value = 'retrieval'
    await openRetrievalDetail(row)
    return
  }
  evaluationTab.value = 'ingestion'
  if (row.detail) applyIngestionRun(row)
}

const rerunEvaluationRecord = async (row) => {
  if (row.type === 'retrieval_eval') {
    await rerunRetrievalEvaluation(row)
    return
  }
  await runIngestionEvaluation()
}

onMounted(() => {
  fetchDashboardConfig()
  fetchConfigVersions()
  fetchUsers()
  fetchHistoryUsers()
  fetchConversationHistory()
  fetchKeywordRules()
  fetchTermNormalizations()
  fetchKnowledgeWorkbench()
  fetchKbVersionOptions()
  fetchEvaluationDatasets()
  fetchAllEvaluationSamples()
  fetchEvaluationRecords()
})

onBeforeUnmount(() => {
  offlineTaskPollTimers.forEach((timer) => clearTimeout(timer))
  offlineTaskPollTimers.clear()
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

.knowledge-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.retrieval-test-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.retrieval-test-form {
  margin-top: 18px;
}

.retrieval-test-options {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(260px, 1fr) minmax(220px, 260px);
  gap: 16px;
  align-items: end;
}

.retrieval-result-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
  gap: 20px;
}

.retrieval-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.retrieval-stat {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 76px;
  padding: 14px;
  background: #f7f9fc;
  border: 1px solid #edf0f5;
  border-radius: 8px;
}

.retrieval-stat span,
.retrieval-answer-box span {
  font-size: 12px;
  color: #86909c;
}

.retrieval-stat strong {
  overflow-wrap: anywhere;
  font-size: 16px;
  color: #1d2129;
}

.retrieval-answer-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
  padding: 14px;
  color: #1d2129;
  white-space: pre-wrap;
  background: #fbfcff;
  border: 1px solid #edf0f5;
  border-radius: 8px;
}

.retrieval-answer-box p {
  margin: 0;
  line-height: 1.7;
}

.variant-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
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

.config-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.config-section {
  padding: 16px;
  background: #f7f9fc;
  border: 1px solid #edf0f5;
  border-radius: 8px;
}

.config-section-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 12px;
  margin-bottom: 14px;
  border-bottom: 1px solid #e7ebf2;
}

.config-section-title h4 {
  margin: 0;
  font-size: 15px;
  color: #1d2129;
}

.config-section-title span {
  font-size: 12px;
  color: #86909c;
}

.config-edit-table :deep(.el-input-number) {
  width: 100%;
}

.config-edit-table :deep(.el-table__cell) {
  vertical-align: middle;
}

.config-description {
  margin-bottom: 0;
}

.keyword-rule-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.keyword-rule-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.keyword-rule-head,
.panel-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.keyword-rule-head h3,
.keyword-rule-head p {
  margin: 0;
}

.keyword-rule-head p {
  margin-top: 6px;
  font-size: 12px;
  color: #86909c;
}

.term-alias {
  margin: 0 6px 6px 0;
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


.dataset-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(52px, 1fr));
  gap: 6px 10px;
  justify-items: center;
  align-items: center;
}

.dataset-actions .el-button {
  margin-left: 0;
  min-width: 44px;
  padding: 0;
}

.score-text {
  font-weight: 600;
  color: #2362fb;
}

.evaluation-workbench {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.evaluation-tabs {
  display: inline-flex;
  align-self: flex-start;
}

.evaluation-tab {
  height: 42px;
  padding: 0 22px;
  background: #ffffff;
  border: 1px solid #d9e2ef;
  color: #536173;
  font-size: 14px;
  cursor: pointer;
}

.evaluation-tab:first-child {
  border-radius: 6px 0 0 6px;
}

.evaluation-tab:last-child {
  border-radius: 0 6px 6px 0;
}

.evaluation-tab + .evaluation-tab {
  margin-left: -1px;
}

.evaluation-tab.active {
  color: #ffffff;
  background: #409eff;
  border-color: #409eff;
}

.evaluation-tab:hover:not(.active) {
  color: #2362fb;
  background: #f5faff;
}

.evaluation-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.wide-select {
  width: 260px;
}

.eval-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.metric-card .m-val.primary {
  color: #2362fb;
}

.metric-card .m-val.warning {
  color: #f59e0b;
}

.metric-card .m-val.danger {
  color: #ff4d4f;
}

.section-heading {
  margin: 0 0 18px;
  font-size: 18px;
  font-weight: 700;
  color: #2b3648;
}

.eval-detail-split {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 18px;
}

.hit-list {
  margin-top: 18px;
  overflow: hidden;
  border: 1px solid #e8edf5;
  border-radius: 6px;
}

.hit-item {
  padding: 14px 16px;
  background: #ffffff;
  border-bottom: 1px solid #e8edf5;
}

.hit-item:last-child {
  border-bottom: none;
}

.hit-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
  font-size: 15px;
}

.hit-head strong {
  color: #243246;
}

.hit-head span {
  font-weight: 700;
  color: #2362fb;
}

.hit-item p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #7b8492;
}

.mini-metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
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

.json-import-result {
  padding-top: 14px;
  margin-top: 16px;
  border-top: 1px solid #edf0f5;
}

.offline-source-desc,
.offline-ingest-form {
  margin-top: 16px;
}

.local-ingest-form {
  padding-top: 8px;
}

.local-folder-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 40px;
}

.local-folder-row span {
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  color: #4e5969;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hidden-file-input {
  display: none;
}

.local-ingest-actions {
  display: flex;
  justify-content: flex-end;
}

.directory-picker-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.directory-current-path {
  flex: 1;
  min-width: 0;
  padding: 7px 10px;
  overflow: hidden;
  font-size: 13px;
  color: #4e5969;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #f7f8fa;
  border: 1px solid #e5e6eb;
  border-radius: 6px;
}

.json-import-progress {
  padding: 14px 16px;
  margin-top: 12px;
  background: #f8fafc;
  border: 1px solid #e8edf5;
  border-radius: 6px;
}

.json-import-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #1d2129;
}

.json-import-current {
  margin-top: 8px;
  font-size: 13px;
  color: #4e5969;
}


.sample-dialog-toolbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 14px;
  margin-bottom: 14px;
  border-bottom: 1px solid #edf0f5;
}

.sample-dialog-toolbar > div:first-child {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.sample-dialog-toolbar strong {
  color: #1d2129;
}

.sample-dialog-toolbar span {
  color: #86909c;
  overflow-wrap: anywhere;
}

.sample-dialog-actions {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
}

.sample-import-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.8fr);
  gap: 16px;
  margin-top: 18px;
}

.sample-import-panel {
  padding: 14px;
  background: #f8fafc;
  border: 1px solid #e8edf5;
  border-radius: 6px;
}

.sample-import-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.sample-import-head h4 {
  margin: 0;
  font-size: 14px;
  color: #1d2129;
}

.single-sample-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}

.single-sample-form :deep(.el-form-item:nth-child(2)) {
  grid-column: 1 / -1;
}

.sample-panel-actions {
  justify-content: flex-end;
  margin-top: 12px;
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
