<template>
  <AdminLayout @menu-change="currentTab = $event">

    <section v-if="currentTab === 'dashboard'" class="commerce-dashboard" :class="{ 'dark-theme': darkTheme }">
      <div class="dashboard-shell">
        <aside class="dashboard-sidebar">
          <div class="brand-block">
            <div class="brand-logo">K</div>
            <div>
              <strong>KnowForge</strong>
              <span>电商知识问答中台</span>
            </div>
          </div>
          <el-menu default-active="overview" class="dashboard-menu">
            <el-sub-menu index="business">
              <template #title>
                <el-icon><DataAnalysis /></el-icon>
                <span>经营洞察</span>
              </template>
              <el-menu-item index="overview">问答总览</el-menu-item>
              <el-menu-item index="store">店铺热力</el-menu-item>
              <el-menu-item index="channel">渠道分布</el-menu-item>
            </el-sub-menu>
            <el-sub-menu index="qa">
              <template #title>
                <el-icon><ChatDotRound /></el-icon>
                <span>问答运营</span>
              </template>
              <el-menu-item index="records">问答记录</el-menu-item>
              <el-menu-item index="review">人工复核</el-menu-item>
              <el-menu-item index="alerts">异常告警</el-menu-item>
            </el-sub-menu>
            <el-sub-menu index="settings">
              <template #title>
                <el-icon><Setting /></el-icon>
                <span>系统配置</span>
              </template>
              <el-menu-item index="layout">卡片布局</el-menu-item>
              <el-menu-item index="rules">回复策略</el-menu-item>
            </el-sub-menu>
          </el-menu>
        </aside>

        <main class="dashboard-main">
          <header class="dashboard-header">
            <div class="header-left">
              <div class="header-logo">电商企业知识问答助手</div>
              <el-input v-model="globalKeyword" class="global-search" placeholder="搜索店铺、订单、知识条目或问题" clearable>
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
            <div class="header-actions">
              <el-badge :value="alertList.length" class="notice-badge">
                <el-button :icon="Bell" circle @click="detailDialogVisible = true" />
              </el-badge>
              <el-switch v-model="darkTheme" inline-prompt active-text="暗" inactive-text="亮" class="theme-switch" />
            </div>
          </header>

          <div class="dashboard-breadcrumb-row">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item>后台管理</el-breadcrumb-item>
              <el-breadcrumb-item>经营洞察</el-breadcrumb-item>
              <el-breadcrumb-item>问答仪表盘</el-breadcrumb-item>
            </el-breadcrumb>
            <div class="dashboard-toolbar-actions">
              <el-button :icon="Setting" @click="layoutDrawerVisible = true">配置布局</el-button>
              <el-button type="primary" :icon="Download" @click="exportRecords">导出数据</el-button>
            </div>
          </div>

          <div class="filter-bar dashboard-filter">
            <el-date-picker v-model="dashboardFilters.dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" />
            <el-select v-model="dashboardFilters.store" placeholder="店铺" clearable>
              <el-option v-for="store in storeOptions" :key="store" :label="store" :value="store" />
            </el-select>
            <el-select v-model="dashboardFilters.type" placeholder="问题类型" clearable>
              <el-option v-for="type in questionTypeOptions" :key="type" :label="type" :value="type" />
            </el-select>
            <el-select v-model="dashboardFilters.satisfaction" placeholder="满意度" clearable>
              <el-option label="高满意" value="高满意" />
              <el-option label="中性" value="中性" />
              <el-option label="低满意" value="低满意" />
            </el-select>
            <el-button type="primary">查询</el-button>
            <el-button @click="resetDashboardFilters">重置</el-button>
          </div>

          <div class="kpi-grid">
            <article v-for="item in kpiCards" :key="item.title" class="kpi-card">
              <div class="kpi-card-head">
                <span>{{ item.title }}</span>
                <el-tag :type="item.status" effect="plain" size="small">{{ item.badge }}</el-tag>
              </div>
              <strong>{{ item.value }}</strong>
              <div class="compare-row">
                <span :class="item.yoy >= 0 ? 'up' : 'down'">同比 {{ formatPercent(item.yoy) }}</span>
                <span :class="item.mom >= 0 ? 'up' : 'down'">环比 {{ formatPercent(item.mom) }}</span>
              </div>
            </article>
          </div>

          <section class="dashboard-layout-grid">
            <section v-for="card in enabledLayoutCards" :key="card.key" class="dashboard-card" :class="card.className">
              <div class="card-title-row">
                <h3>{{ card.title }}</h3>
                <span>{{ card.extra }}</span>
              </div>

              <template v-if="card.key === 'trend'">
                <div class="trend-chart">
                  <svg viewBox="0 0 500 170" preserveAspectRatio="none">
                    <polyline :points="trendPolyline" fill="none" stroke="#2f6fed" stroke-width="4" stroke-linecap="round" />
                    <rect v-for="(item, index) in trendData" :key="item.label" :x="42 + index * 62" :y="155 - (16 - item.latency) * 8" width="22" :height="(16 - item.latency) * 8" rx="4" fill="#12b981" opacity="0.78" />
                  </svg>
                  <div class="chart-axis"><span v-for="item in trendData" :key="item.label">{{ item.label }}</span></div>
                </div>
                <div class="legend-row"><span class="legend blue">咨询量</span><span class="legend green">回复时效</span></div>
              </template>

              <template v-else-if="card.key === 'pie'">
                <div class="pie-grid">
                  <div class="pie-block">
                    <div class="donut" :style="pieStyle(categoryShare)"><span>分类</span></div>
                    <div class="pie-legend"><p v-for="item in categoryShare" :key="item.name"><i :style="{ background: item.color }"></i>{{ item.name }} {{ item.value }}%</p></div>
                  </div>
                  <div class="pie-block">
                    <div class="donut" :style="pieStyle(channelShare)"><span>渠道</span></div>
                    <div class="pie-legend"><p v-for="item in channelShare" :key="item.name"><i :style="{ background: item.color }"></i>{{ item.name }} {{ item.value }}%</p></div>
                  </div>
                </div>
              </template>

              <template v-else-if="card.key === 'ranking'">
                <div class="rank-list">
                  <div v-for="(item, index) in topQuestions" :key="item.question" class="rank-item">
                    <b>{{ index + 1 }}</b>
                    <div><strong>{{ item.question }}</strong><span>咨询 {{ item.count }} 次 · 解决率 {{ item.resolveRate }}</span></div>
                  </div>
                </div>
              </template>

              <template v-else-if="card.key === 'heat'">
                <div class="heat-list">
                  <div v-for="item in heatStores" :key="item.name" class="heat-row">
                    <div class="heat-meta"><span>{{ item.name }}</span><em>{{ item.hot }}%</em></div>
                    <div class="heat-bar" :style="heatStyle(item.hot)"><span>待响应 {{ item.wait }}</span></div>
                  </div>
                </div>
              </template>

              <template v-else-if="card.key === 'visitor'">
                <div class="visitor-grid">
                  <div v-for="item in visitorBoard" :key="item.channel" class="visitor-item">
                    <span>{{ item.channel }}</span><strong>{{ item.consulting }}</strong><small>访客 {{ item.visitors }} · {{ item.trend }}</small>
                  </div>
                </div>
              </template>

              <template v-else-if="card.key === 'alert'">
                <div class="mini-alert-list">
                  <div v-for="item in alertList" :key="item.title" class="mini-alert" :class="item.level"><strong>{{ item.title }}</strong><span>{{ item.desc }}</span></div>
                </div>
              </template>

              <template v-else-if="card.key === 'review'">
                <div class="review-list">
                  <div v-for="item in reviewTasks" :key="item.id" class="review-item">
                    <div><strong>{{ item.title }}</strong><span>{{ item.id }} · {{ item.owner }}</span></div><em>{{ item.priority }}</em>
                  </div>
                </div>
              </template>

              <template v-else-if="card.key === 'records'">
                <div class="record-actions"><el-button @click="batchMarkRecords">批量标记</el-button><el-button type="primary" @click="exportRecords">导出</el-button></div>
                <el-table :data="qaRecords" border stripe @selection-change="handleRecordSelection">
                  <el-table-column type="selection" width="48" />
                  <el-table-column prop="id" label="记录ID" width="150" sortable />
                  <el-table-column prop="time" label="时间" width="160" sortable />
                  <el-table-column prop="store" label="店铺" width="120" />
                  <el-table-column prop="type" label="问题类型" width="110" />
                  <el-table-column prop="question" label="用户问题" show-overflow-tooltip />
                  <el-table-column prop="answerTime" label="响应秒数" width="110" sortable />
                  <el-table-column prop="satisfaction" label="满意度" width="100" />
                  <el-table-column prop="status" label="状态" width="100" />
                </el-table>
                <div class="pagination-row"><el-pagination background layout="prev, pager, next, sizes, total" :total="128" :page-sizes="[10, 20, 50]" /></div>
              </template>
            </section>
          </section>
        </main>
      </div>

      <el-dialog v-model="detailDialogVisible" title="全局详情与异常提醒" width="640px">
        <div class="alert-stack">
          <div v-for="alert in alertList" :key="alert.title" class="alert-item" :class="alert.level">
            <div><strong>{{ alert.title }}</strong><p>{{ alert.desc }}</p></div>
            <el-tag :type="alert.tag">{{ alert.time }}</el-tag>
          </div>
        </div>
      </el-dialog>

      <el-drawer v-model="layoutDrawerVisible" title="仪表盘卡片自定义布局" size="360px">
        <div class="layout-config-list">
          <div v-for="(card, index) in layoutCards" :key="card.key" class="layout-config-item">
            <el-checkbox v-model="card.enabled">{{ card.title }}</el-checkbox>
            <div>
              <el-button :icon="ArrowUp" circle size="small" :disabled="index === 0" @click="moveLayoutCard(index, -1)" />
              <el-button :icon="ArrowDown" circle size="small" :disabled="index === layoutCards.length - 1" @click="moveLayoutCard(index, 1)" />
            </div>
          </div>
        </div>
      </el-drawer>
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
        <el-table-column prop="role" label="角色">
          <template #default="scope">
            <el-tag :type="scope.row.role === 'admin' ? 'danger' : 'info'" size="small">
              {{ scope.row.role }}
            </el-tag>
          </template>
        </el-table-column>
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
            <el-button link type="danger" @click="deleteUser(scope.row.userId)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
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

    <section v-if="currentTab === 'evaluations'" class="rag-eval-workbench">
      <div class="eval-topbar pane-card">
        <div>
          <h2>电商RAG评测工作台</h2>
          <p>对齐 RAG 评测后端字段，逐条评估检索证据、模型回答与标准答案。</p>
        </div>
        <div class="eval-actions">
          <el-button @click="resetEvalFilter">重置筛选</el-button>
          <el-button type="primary" plain @click="saveCurrentEval">保存当前样本</el-button>
          <el-button type="primary" @click="batchSubmitEval">批量提交</el-button>
        </div>
      </div>

      <div class="eval-filter pane-card">
        <el-select v-model="evalQuery.scene" placeholder="场景筛选" clearable>
          <el-option v-for="scene in evalSceneOptions" :key="scene" :label="scene" :value="scene" />
        </el-select>
        <el-select v-model="evalQuery.status" placeholder="评测状态" clearable>
          <el-option label="待评测" value="pending" />
          <el-option label="草稿" value="draft" />
          <el-option label="已提交" value="submitted" />
        </el-select>
        <el-input v-model="evalQuery.keyword" placeholder="搜索问题、样本ID、店铺" clearable class="eval-keyword" />
      </div>

      <div class="eval-workspace">
        <aside class="eval-sample-list pane-card">
          <div class="eval-section-title">
            <h3>评测样本</h3>
            <span>{{ filteredEvalSamples.length }} 条</span>
          </div>
          <el-table
            :data="pagedEvalSamples"
            height="520"
            highlight-current-row
            :row-class-name="getEvalRowClass"
            @current-change="selectEvalSample"
            @selection-change="handleEvalSelection"
          >
            <el-table-column type="selection" width="42" />
            <el-table-column prop="sampleId" label="样本ID" width="128" />
            <el-table-column prop="scene" label="场景" width="100" />
            <el-table-column prop="status" label="状态" width="88">
              <template #default="scope">
                <el-tag :type="getEvalStatusTag(scope.row.status)" size="small">{{ getEvalStatusText(scope.row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="userQuestion" label="用户提问" show-overflow-tooltip />
          </el-table>
          <div class="eval-pagination">
            <el-pagination
              v-model:current-page="evalPagination.page"
              v-model:page-size="evalPagination.pageSize"
              background
              small
              layout="prev, pager, next"
              :total="filteredEvalSamples.length"
            />
          </div>
        </aside>

        <main v-if="activeEvalSample" class="eval-detail pane-card">
          <div class="eval-detail-head">
            <div>
              <el-tag type="primary" effect="plain">{{ activeEvalSample.sampleId }}</el-tag>
              <el-tag effect="plain">{{ activeEvalSample.scene }}</el-tag>
              <el-tag type="success" effect="plain">{{ activeEvalSample.storeName }}</el-tag>
            </div>
            <span>任务：{{ activeEvalSample.evaluationTaskId }} · 知识库：{{ activeEvalSample.knowledgeBaseId }}</span>
          </div>

          <section class="eval-question-block">
            <h3>用户提问</h3>
            <p>{{ activeEvalSample.userQuestion }}</p>
          </section>

          <section class="eval-doc-block">
            <div class="eval-section-title">
              <h3>检索知识库原文</h3>
              <span>{{ activeEvalSample.retrievedDocuments.length }} 条证据</span>
            </div>
            <el-collapse class="retrieval-collapse">
              <el-collapse-item v-for="doc in activeEvalSample.retrievedDocuments" :key="doc.documentId" :name="doc.documentId">
                <template #title>
                  <div class="doc-title">
                    <strong>{{ doc.title }}</strong>
                    <span>相似度 {{ doc.score }} · {{ doc.source }}</span>
                  </div>
                </template>
                <p class="doc-content">{{ doc.content }}</p>
              </el-collapse-item>
            </el-collapse>
          </section>

          <div class="answer-compare-grid">
            <section class="answer-card rag-answer">
              <h3>RAG输出回答</h3>
              <p>{{ activeEvalSample.ragAnswer }}</p>
            </section>
            <section class="answer-card standard-answer">
              <h3>标准正确答案</h3>
              <p>{{ activeEvalSample.referenceAnswer }}</p>
            </section>
          </div>

          <section class="score-panel">
            <div class="eval-section-title">
              <h3>五项评分</h3>
              <span>0-10分，支持小数</span>
            </div>
            <div class="score-grid">
              <el-form-item v-for="metric in evalScoreMetrics" :key="metric.key" :label="metric.label" :class="{ 'is-error': evalErrors[metric.key] }">
                <el-input-number
                  v-model="activeEvalSample.scores[metric.key]"
                  :min="0"
                  :max="10"
                  :step="0.5"
                  :precision="1"
                  controls-position="right"
                />
                <div v-if="evalErrors[metric.key]" class="eval-error-text">{{ evalErrors[metric.key] }}</div>
              </el-form-item>
            </div>
          </section>

          <section class="defect-panel">
            <h3>电商缺陷标签</h3>
            <el-checkbox-group v-model="activeEvalSample.defectTags" class="defect-tags">
              <el-checkbox-button v-for="tag in ecommerceDefectTags" :key="tag" :label="tag" />
            </el-checkbox-group>
          </section>

          <div class="eval-input-grid">
            <el-form-item label="扣分理由" :class="{ 'is-error': evalErrors.deductionReason }">
              <el-input v-model="activeEvalSample.deductionReason" type="textarea" :rows="4" placeholder="说明扣分依据，例如证据缺失、承诺过度、售后规则错误等" />
              <div v-if="evalErrors.deductionReason" class="eval-error-text">{{ evalErrors.deductionReason }}</div>
            </el-form-item>
            <el-form-item label="优化建议" :class="{ 'is-error': evalErrors.optimizationSuggestion }">
              <el-input v-model="activeEvalSample.optimizationSuggestion" type="textarea" :rows="4" placeholder="给出可执行优化建议，例如补充知识库字段、修改提示词、增加转人工规则" />
              <div v-if="evalErrors.optimizationSuggestion" class="eval-error-text">{{ evalErrors.optimizationSuggestion }}</div>
            </el-form-item>
          </div>
        </main>
      </div>
    </section>

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
        <el-form-item label="角色设定">
          <el-radio-group v-model="userForm.role">
            <el-radio value="user">普通用户(user)</el-radio>
            <el-radio value="admin">管理员(admin)</el-radio>
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
import { ArrowDown, ArrowLeft, ArrowUp, Bell, ChatDotRound, DataAnalysis, Download, Search, Setting, UploadFilled } from '@element-plus/icons-vue'
import AdminLayout from '@/layouts/AdminLayout.vue'

const currentTab = ref('users')
const loading = ref(false)


const globalKeyword = ref('')
const darkTheme = ref(false)
const detailDialogVisible = ref(false)
const layoutDrawerVisible = ref(false)
const selectedRecordIds = ref([])

const storeOptions = ['天猫旗舰店', '京东自营店', '抖音商城', '微信小店', '拼多多专营店']
const questionTypeOptions = ['售前咨询', '订单物流', '退换售后', '活动优惠', '商品参数']
const dashboardFilters = reactive({ dateRange: [], store: '', type: '', satisfaction: '' })

const kpiCards = [
  { title: '今日咨询量', value: '12,486', yoy: 18.6, mom: 7.4, badge: '高峰稳定', status: 'success' },
  { title: '智能回复率', value: '92.8%', yoy: 6.2, mom: 2.1, badge: '自动承接', status: 'primary' },
  { title: '平均响应时效', value: '8.6s', yoy: -12.4, mom: -5.8, badge: '持续优化', status: 'warning' },
  { title: '满意度评分', value: '4.72', yoy: 3.8, mom: 1.6, badge: '口碑良好', status: 'success' }
]

const trendData = [
  { label: '06-16', consult: 7600, latency: 13 },
  { label: '06-17', consult: 8800, latency: 11 },
  { label: '06-18', consult: 9300, latency: 10 },
  { label: '06-19', consult: 10800, latency: 9 },
  { label: '06-20', consult: 11600, latency: 8.8 },
  { label: '06-21', consult: 12100, latency: 8.4 },
  { label: '06-22', consult: 12486, latency: 8.6 }
]

const categoryShare = [
  { name: '订单物流', value: 32, color: '#2f6fed' },
  { name: '退换售后', value: 24, color: '#12b981' },
  { name: '商品参数', value: 18, color: '#f59e0b' },
  { name: '活动优惠', value: 16, color: '#8b5cf6' },
  { name: '其他问题', value: 10, color: '#64748b' }
]
const channelShare = [
  { name: 'APP', value: 36, color: '#0ea5e9' },
  { name: '小程序', value: 28, color: '#22c55e' },
  { name: '网页客服', value: 21, color: '#f97316' },
  { name: '企微', value: 15, color: '#a855f7' }
]
const topQuestions = [
  { question: '订单什么时候发货？', count: 3862, resolveRate: '96%' },
  { question: '7天无理由退货怎么申请？', count: 2950, resolveRate: '94%' },
  { question: '618优惠券能否叠加？', count: 2418, resolveRate: '91%' },
  { question: '尺码偏大还是偏小？', count: 2066, resolveRate: '88%' },
  { question: '发票抬头如何修改？', count: 1680, resolveRate: '93%' }
]
const heatStores = [
  { name: '天猫旗舰店', hot: 94, wait: 18 },
  { name: '京东自营店', hot: 82, wait: 11 },
  { name: '抖音商城', hot: 76, wait: 23 },
  { name: '微信小店', hot: 58, wait: 7 },
  { name: '拼多多专营店', hot: 66, wait: 15 },
  { name: '有赞会员店', hot: 49, wait: 5 }
]
const visitorBoard = [
  { channel: '天猫', visitors: 1482, consulting: 126, trend: '+12%' },
  { channel: '京东', visitors: 1036, consulting: 84, trend: '+8%' },
  { channel: '抖音', visitors: 1860, consulting: 172, trend: '+21%' },
  { channel: '微信', visitors: 642, consulting: 45, trend: '+5%' }
]
const alertList = [
  { title: '低满意度集中出现', desc: '抖音商城近30分钟出现12条低满意度评价，集中在优惠券叠加问题。', time: '2分钟前', level: 'danger', tag: 'danger' },
  { title: '未回复会话超时', desc: '京东自营店有8条会话超过3分钟未响应，建议转人工处理。', time: '8分钟前', level: 'warning', tag: 'warning' },
  { title: '知识命中率波动', desc: '商品参数类知识命中率较昨日下降4.3%，建议复核新品资料。', time: '15分钟前', level: 'info', tag: 'primary' }
]
const reviewTasks = [
  { id: 'R-1024', title: '大促价保规则回答冲突', owner: '售后组', priority: '高' },
  { id: 'R-1025', title: '海外仓物流时效待确认', owner: '物流组', priority: '中' },
  { id: 'R-1026', title: '新品材质参数缺少来源', owner: '商品组', priority: '中' }
]
const qaRecords = ref([
  { id: 'QA20260622001', time: '2026-06-22 10:24', store: '天猫旗舰店', type: '订单物流', question: '订单今天能发出吗？', answerTime: 6.2, satisfaction: '高满意', status: '已回复' },
  { id: 'QA20260622002', time: '2026-06-22 10:21', store: '抖音商城', type: '活动优惠', question: '满减券和会员券能一起用吗？', answerTime: 18.4, satisfaction: '低满意', status: '待复核' },
  { id: 'QA20260622003', time: '2026-06-22 10:18', store: '京东自营店', type: '退换售后', question: '拆封后还能退货吗？', answerTime: 9.5, satisfaction: '中性', status: '已回复' },
  { id: 'QA20260622004', time: '2026-06-22 10:15', store: '微信小店', type: '商品参数', question: '这款外套适合多少温度？', answerTime: 11.1, satisfaction: '高满意', status: '已标记' }
])
const layoutCards = reactive([
  { key: 'trend', title: '折线/柱状趋势图', extra: '咨询量 · 回复时效', enabled: true, className: 'span-8' },
  { key: 'pie', title: '环形饼图', extra: '分类 · 渠道', enabled: true, className: 'span-4' },
  { key: 'ranking', title: 'TOP高频问题排行榜', extra: '今日', enabled: true, className: 'span-4' },
  { key: 'heat', title: '店铺咨询热力分布图', extra: '实时', enabled: true, className: 'span-4' },
  { key: 'visitor', title: '实时访客咨询看板', extra: '在线', enabled: true, className: 'span-4' },
  { key: 'alert', title: '低满意度/未回复异常告警', extra: '待处理', enabled: true, className: 'span-4' },
  { key: 'review', title: '待处理人工复核面板', extra: '3项', enabled: true, className: 'span-4' },
  { key: 'records', title: '数据问答记录表', extra: '分页 · 排序 · 导出', enabled: true, className: 'span-12' }
])
const maxConsult = computed(() => Math.max(...trendData.map((item) => item.consult)))
const trendPolyline = computed(() => trendData.map((item, index) => {
  const x = 24 + index * 72
  const y = 150 - (item.consult / maxConsult.value) * 112
  return x + ',' + y
}).join(' '))
const enabledLayoutCards = computed(() => layoutCards.filter((card) => card.enabled))
const formatPercent = (value) => (value > 0 ? '+' : '') + value + '%'
const pieStyle = (items) => ({ background: 'conic-gradient(' + items.map((item, index) => {
  const start = items.slice(0, index).reduce((sum, cur) => sum + cur.value, 0)
  const end = start + item.value
  return item.color + ' ' + start + '% ' + end + '%'
}).join(', ') + ')' })
const heatStyle = (hot) => ({ background: 'linear-gradient(90deg, rgba(47, 111, 237, ' + (0.18 + hot / 140) + ') ' + hot + '%, #eef2f7 ' + hot + '%)' })
const resetDashboardFilters = () => {
  Object.assign(dashboardFilters, { dateRange: [], store: '', type: '', satisfaction: '' })
}
const exportRecords = () => {
  ElMessage.success('问答记录导出任务已创建')
}
const handleRecordSelection = (rows) => {
  selectedRecordIds.value = rows.map((row) => row.id)
}
const batchMarkRecords = () => {
  if (!selectedRecordIds.value.length) {
    ElMessage.warning('请先选择需要标记的问答记录')
    return
  }
  qaRecords.value = qaRecords.value.map((row) => selectedRecordIds.value.includes(row.id) ? { ...row, status: '已标记' } : row)
  ElMessage.success('已批量标记 ' + selectedRecordIds.value.length + ' 条记录')
}
const moveLayoutCard = (index, offset) => {
  const target = index + offset
  if (target < 0 || target >= layoutCards.length) return
  const [item] = layoutCards.splice(index, 1)
  layoutCards.splice(target, 0, item)
}

const userQuery = reactive({ keyword: '', role: '', status: '' })
const userList = ref([])
const userModalVisible = ref(false)
const userModalType = ref('add')
const userForm = reactive({
  userId: '',
  username: '',
  password: '',
  displayName: '',
  role: 'user',
  status: 'enabled',
  remark: ''
})

const fetchUsers = () => {
  loading.value = true
  setTimeout(() => {
    userList.value = [
      {
        userId: 'u_10001',
        username: 'lixiangchen',
        displayName: 'LiXiangchen',
        role: 'user',
        status: 'enabled',
        createdAt: '2026-06-21 10:00:00'
      },
      {
        userId: 'u_10002',
        username: 'zhangsan',
        displayName: '张三',
        role: 'admin',
        status: 'disabled',
        createdAt: '2026-06-21 11:00:00'
      }
    ]
    loading.value = false
  }, 300)
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
    displayName: '',
    role: 'user',
    status: 'enabled',
    remark: ''
  })
}

const submitUserForm = () => {
  ElMessage.success(userModalType.value === 'add' ? '用户创建成功' : '用户信息已更新')
  userModalVisible.value = false
  fetchUsers()
}

const deleteUser = (id) => {
  ElMessageBox.confirm('确定删除该账号吗？', '提示', { type: 'warning' })
    .then(() => {
      ElMessage.success(`用户 ${id} 已删除`)
      fetchUsers()
    })
    .catch(() => {})
}

const resetUserQuery = () => {
  Object.assign(userQuery, { keyword: '', role: '', status: '' })
  fetchUsers()
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

const evalQuery = reactive({ scene: '', status: '', keyword: '' })
const evalPagination = reactive({ page: 1, pageSize: 5 })
const selectedEvalSampleIds = ref([])
const activeEvalSampleId = ref('')
const evalErrors = reactive({})
const createEvalVisible = ref(false)
const newEvalForm = reactive({ name: '', knowledgeBaseId: '', metrics: [] })
const evalDetail = ref({})
const activeEvalId = ref(null)

// Backend-aligned metric keys: each score is persisted under scores[metricKey] in the JSON payload.
const evalScoreMetrics = [
  { key: 'answerRelevance', label: '回答相关性' },
  { key: 'faithfulness', label: '事实忠实度' },
  { key: 'retrievalGrounding', label: '检索支撑度' },
  { key: 'referenceCompleteness', label: '标准答案覆盖' },
  { key: 'commerceSafety', label: '电商安全合规' }
]

const ecommerceDefectTags = [
  '售后规则错误',
  '优惠活动误导',
  '物流时效不准',
  '商品参数缺失',
  '价格承诺风险',
  '未引用检索证据',
  '话术不符合客服规范',
  '应转人工未转'
]

const evalSamples = ref([
  {
    evaluationTaskId: 'eval_ec_20260622',
    sampleId: 'EC-RAG-0001',
    knowledgeBaseId: 'kb_after_sale_policy',
    storeName: '天猫旗舰店',
    scene: '售后退换',
    status: 'pending',
    userQuestion: '我买的电饭煲已经拆封试用了两次，还能申请七天无理由退货吗？',
    retrievedDocuments: [
      { documentId: 'doc_return_001', title: '七天无理由退货规则', source: '售后政策库/退换货.md', score: 0.93, content: '支持七天无理由退货的商品需保持完好，不影响二次销售。厨电类商品如已通电使用且产生使用痕迹，通常不支持无理由退货。' },
      { documentId: 'doc_return_018', title: '厨电商品退换细则', source: '售后政策库/厨电.md', score: 0.88, content: '质量问题可按三包政策处理；非质量问题退货需包装、配件、赠品齐全且未影响二次销售。' },
      { documentId: 'doc_service_004', title: '客服转人工规则', source: '客服SOP/升级处理.md', score: 0.76, content: '涉及质量争议、消费者描述与规则边界不清晰时，客服机器人应建议提交照片并转人工复核。' }
    ],
    ragAnswer: '您好，电饭煲拆封后一般仍可以申请七天无理由退货，请保持配件齐全并在订单页提交申请。',
    referenceAnswer: '已通电试用两次的厨电可能影响二次销售，通常不支持七天无理由退货；如存在质量问题，可提交照片或视频申请售后检测，必要时转人工复核。',
    scores: { answerRelevance: null, faithfulness: null, retrievalGrounding: null, referenceCompleteness: null, commerceSafety: null },
    defectTags: [],
    deductionReason: '',
    optimizationSuggestion: '',
    evaluator: 'admin'
  },
  {
    evaluationTaskId: 'eval_ec_20260622',
    sampleId: 'EC-RAG-0002',
    knowledgeBaseId: 'kb_promotion_rule',
    storeName: '京东自营店',
    scene: '活动优惠',
    status: 'draft',
    userQuestion: '618满减券可以和店铺会员券一起用吗？为什么结算页少减了20元？',
    retrievedDocuments: [
      { documentId: 'doc_coupon_011', title: '618券叠加规则', source: '营销规则/618.md', score: 0.91, content: '平台满减券可与店铺会员券叠加，但同类型店铺券不可重复叠加。部分商品不参与会员券优惠，以结算页可用券为准。' },
      { documentId: 'doc_coupon_014', title: '优惠金额差异说明', source: '营销规则/优惠计算.md', score: 0.84, content: '用户反馈优惠少减时，应核对商品活动范围、券门槛、券类型和订单金额是否满足使用条件。' }
    ],
    ragAnswer: '可以一起使用，少减20元可能是系统延迟，建议刷新后重新下单。',
    referenceAnswer: '平台满减券和店铺会员券通常可叠加，但需满足商品范围、门槛和券类型限制；少减20元应引导用户核对结算页不可用原因，而不是承诺系统延迟。',
    scores: { answerRelevance: 6, faithfulness: 4, retrievalGrounding: 5, referenceCompleteness: 5, commerceSafety: 3 },
    defectTags: ['优惠活动误导', '价格承诺风险'],
    deductionReason: '回答直接归因系统延迟，缺少对券门槛、适用商品和不可用原因的核对，存在误导用户风险。',
    optimizationSuggestion: '补充优惠核验步骤，并要求模型引用结算页不可用原因，避免承诺刷新后一定生效。',
    evaluator: 'admin'
  },
  {
    evaluationTaskId: 'eval_ec_20260622',
    sampleId: 'EC-RAG-0003',
    knowledgeBaseId: 'kb_logistics',
    storeName: '抖音商城',
    scene: '物流配送',
    status: 'pending',
    userQuestion: '我在新疆下单的羽绒服，页面写48小时发货，预计几天能到？',
    retrievedDocuments: [
      { documentId: 'doc_ship_007', title: '偏远地区配送时效', source: '物流政策/区域时效.md', score: 0.89, content: '新疆、西藏、内蒙古等区域发货后预计5-8天送达，遇天气或安检可能延迟。' },
      { documentId: 'doc_ship_002', title: '发货承诺说明', source: '物流政策/发货.md', score: 0.82, content: '48小时发货指商家完成出库并交付承运商，不等同于48小时送达。' }
    ],
    ragAnswer: '48小时内会送到，请您耐心等待物流更新。',
    referenceAnswer: '48小时发货不等于48小时送达；新疆地区通常发货后预计5-8天送达，具体以物流轨迹为准，天气或安检可能导致延迟。',
    scores: { answerRelevance: null, faithfulness: null, retrievalGrounding: null, referenceCompleteness: null, commerceSafety: null },
    defectTags: [],
    deductionReason: '',
    optimizationSuggestion: '',
    evaluator: 'admin'
  },
  {
    evaluationTaskId: 'eval_ec_20260622',
    sampleId: 'EC-RAG-0004',
    knowledgeBaseId: 'kb_product_specs',
    storeName: '微信小店',
    scene: '商品参数',
    status: 'submitted',
    userQuestion: '这款儿童保温杯内胆是不是316不锈钢？能不能放洗碗机？',
    retrievedDocuments: [
      { documentId: 'doc_sku_316', title: '儿童保温杯材质说明', source: '商品资料/SKU-BC316.md', score: 0.95, content: '杯体内胆材质为316L不锈钢，杯盖含PP与硅胶密封圈。' },
      { documentId: 'doc_sku_clean', title: '清洗保养说明', source: '商品资料/清洗.md', score: 0.87, content: '建议手洗，不建议整杯放入洗碗机，高温可能影响密封圈寿命。' }
    ],
    ragAnswer: '内胆是316L不锈钢。建议手洗，不建议整杯放入洗碗机，以免影响杯盖密封圈。',
    referenceAnswer: '内胆为316L不锈钢；杯盖含PP和硅胶密封圈，建议手洗，不建议整杯放入洗碗机。',
    scores: { answerRelevance: 9, faithfulness: 9, retrievalGrounding: 9, referenceCompleteness: 8.5, commerceSafety: 9 },
    defectTags: [],
    deductionReason: '整体正确，仅未明确杯盖含PP和硅胶密封圈。',
    optimizationSuggestion: '回答商品材质时同时覆盖杯体、杯盖和密封圈，减少用户二次追问。',
    evaluator: 'admin'
  },
  {
    evaluationTaskId: 'eval_ec_20260622',
    sampleId: 'EC-RAG-0005',
    knowledgeBaseId: 'kb_invoice',
    storeName: '拼多多专营店',
    scene: '发票售后',
    status: 'pending',
    userQuestion: '订单已经确认收货了，还能改公司发票抬头吗？',
    retrievedDocuments: [
      { documentId: 'doc_invoice_003', title: '发票抬头修改规则', source: '财务规则/发票.md', score: 0.9, content: '发票未开具前可修改抬头；已开具发票需先申请红冲后重新开具，具体以财务审核为准。' },
      { documentId: 'doc_invoice_006', title: '确认收货后开票', source: '财务规则/收货后.md', score: 0.79, content: '确认收货不影响发票申请，但已开具发票的修改需走作废或红冲流程。' }
    ],
    ragAnswer: '确认收货后不能再修改发票抬头。',
    referenceAnswer: '确认收货不等于不能修改。若发票未开具，可修改抬头；若已开具，需要申请作废或红冲后重开，并以财务审核结果为准。',
    scores: { answerRelevance: null, faithfulness: null, retrievalGrounding: null, referenceCompleteness: null, commerceSafety: null },
    defectTags: [],
    deductionReason: '',
    optimizationSuggestion: '',
    evaluator: 'admin'
  },
  {
    evaluationTaskId: 'eval_ec_20260622',
    sampleId: 'EC-RAG-0006',
    knowledgeBaseId: 'kb_after_sale_policy',
    storeName: '天猫旗舰店',
    scene: '人工复核',
    status: 'pending',
    userQuestion: '收到的护肤品瓶口有漏液，但我已经拆包装了，可以赔偿吗？',
    retrievedDocuments: [
      { documentId: 'doc_damage_021', title: '破损漏液处理', source: '售后政策/破损.md', score: 0.92, content: '签收后发现破损、漏液，应在48小时内提交外包装、商品破损照片和快递面单，客服核实后提供补发、退款或补偿方案。' },
      { documentId: 'doc_manual_009', title: '争议售后转人工', source: '客服SOP/人工复核.md', score: 0.86, content: '涉及破损漏液、赔付金额和责任归属的售后争议，应收集凭证后转人工处理。' }
    ],
    ragAnswer: '拆包装后不能赔偿，建议下次签收时检查。',
    referenceAnswer: '拆包装不必然影响漏液售后。应引导用户在48小时内提交外包装、商品漏液照片和快递面单，核实后提供补发、退款或补偿方案，并转人工复核。',
    scores: { answerRelevance: null, faithfulness: null, retrievalGrounding: null, referenceCompleteness: null, commerceSafety: null },
    defectTags: [],
    deductionReason: '',
    optimizationSuggestion: '',
    evaluator: 'admin'
  }
])

const evalSceneOptions = computed(() => Array.from(new Set(evalSamples.value.map((sample) => sample.scene))))
const filteredEvalSamples = computed(() => {
  const keyword = evalQuery.keyword.trim().toLowerCase()
  return evalSamples.value.filter((sample) => {
    const matchScene = !evalQuery.scene || sample.scene === evalQuery.scene
    const matchStatus = !evalQuery.status || sample.status === evalQuery.status
    const matchKeyword = !keyword || [sample.sampleId, sample.storeName, sample.userQuestion].some((field) => field.toLowerCase().includes(keyword))
    return matchScene && matchStatus && matchKeyword
  })
})
const pagedEvalSamples = computed(() => {
  const start = (evalPagination.page - 1) * evalPagination.pageSize
  return filteredEvalSamples.value.slice(start, start + evalPagination.pageSize)
})
const activeEvalSample = computed(() => evalSamples.value.find((sample) => sample.sampleId === activeEvalSampleId.value) || filteredEvalSamples.value[0] || null)


const clearEvalErrors = () => {
  Object.keys(evalErrors).forEach((key) => delete evalErrors[key])
}

const validateEvalSample = (sample) => {
  clearEvalErrors()
  evalScoreMetrics.forEach((metric) => {
    const value = sample.scores[metric.key]
    if (value === null || value === undefined || value === '') {
      evalErrors[metric.key] = '请填写0-10分'
    } else if (value < 0 || value > 10) {
      evalErrors[metric.key] = '分数必须在0-10之间'
    }
  })
  const scoreValues = evalScoreMetrics.map((metric) => Number(sample.scores[metric.key]))
  const hasLowScore = scoreValues.some((value) => Number.isFinite(value) && value < 7)
  if (hasLowScore && !sample.deductionReason.trim()) {
    evalErrors.deductionReason = '存在低于7分项时必须填写扣分理由'
  }
  if (sample.defectTags.length && !sample.optimizationSuggestion.trim()) {
    evalErrors.optimizationSuggestion = '选择缺陷标签后请填写优化建议'
  }
  return Object.keys(evalErrors).length === 0
}

const selectEvalSample = (sample) => {
  if (!sample) return
  activeEvalSampleId.value = sample.sampleId
  clearEvalErrors()
}

const handleEvalSelection = (rows) => {
  selectedEvalSampleIds.value = rows.map((row) => row.sampleId)
}

const saveCurrentEval = () => {
  if (!activeEvalSample.value) return
  if (!validateEvalSample(activeEvalSample.value)) {
    ElMessage.error('请先修正高亮的评测字段')
    return
  }
  activeEvalSample.value.status = 'draft'
  ElMessage.success('当前评测样本已保存为草稿')
}

const batchSubmitEval = () => {
  const targets = selectedEvalSampleIds.value.length
    ? evalSamples.value.filter((sample) => selectedEvalSampleIds.value.includes(sample.sampleId))
    : [activeEvalSample.value].filter(Boolean)
  if (!targets.length) {
    ElMessage.warning('请选择需要提交的评测样本')
    return
  }
  const invalid = targets.find((sample) => !validateEvalSample(sample))
  if (invalid) {
    activeEvalSampleId.value = invalid.sampleId
    ElMessage.error('存在未通过校验的样本，请补全后再提交')
    return
  }
  targets.forEach((sample) => {
    sample.status = 'submitted'
  })
  ElMessage.success('评测样本已批量提交')
}

const resetEvalFilter = () => {
  Object.assign(evalQuery, { scene: '', status: '', keyword: '' })
  evalPagination.page = 1
}

const getEvalStatusText = (status) => {
  const maps = { pending: '待评测', draft: '草稿', submitted: '已提交' }
  return maps[status] || status
}

const getEvalStatusTag = (status) => {
  const maps = { pending: 'info', draft: 'warning', submitted: 'success' }
  return maps[status] || 'info'
}

const getEvalRowClass = ({ row }) => row.sampleId === activeEvalSampleId.value ? 'active-eval-row' : ''

const fetchEvals = () => {
  ElMessage.success('已加载内置电商RAG评测样本')
}

const getEvalTagType = getEvalStatusTag
const viewEvalDetail = (id) => {
  activeEvalId.value = id
}
const submitCreateEval = () => {
  ElMessage.success('评估任务创建成功')
  createEvalVisible.value = false
}
const deleteEval = (id) => {
  ElMessage.success('评估任务 ' + id + ' 已删除')
}


onMounted(() => {
  fetchUsers()
  fetchKBs()
  fetchEvals()
})
</script>

<style scoped>

.rag-eval-workbench {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.eval-topbar,
.eval-filter,
.eval-detail,
.eval-sample-list {
  border-color: #e5e7eb;
}

.eval-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.eval-topbar h2,
.eval-section-title h3,
.eval-question-block h3,
.answer-card h3,
.defect-panel h3 {
  margin: 0;
  font-size: 15px;
  color: #111827;
}

.eval-topbar p {
  margin: 8px 0 0;
  font-size: 13px;
  color: #64748b;
}

.eval-actions,
.eval-filter,
.eval-detail-head,
.eval-section-title,
.doc-title {
  display: flex;
  align-items: center;
}

.eval-actions {
  flex: none;
  gap: 10px;
}

.eval-filter {
  flex-wrap: wrap;
  gap: 12px;
}

.eval-filter :deep(.el-select) {
  width: 180px;
}

.eval-keyword {
  width: 320px;
}

.eval-workspace {
  display: grid;
  grid-template-columns: 430px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.eval-section-title {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.eval-section-title span,
.eval-detail-head span,
.doc-title span {
  font-size: 12px;
  color: #64748b;
}

.eval-sample-list :deep(.active-eval-row td) {
  background: #eef4ff !important;
}

.eval-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.eval-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.eval-detail-head {
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eef2f7;
}

.eval-detail-head > div {
  display: flex;
  gap: 8px;
  align-items: center;
}

.eval-question-block,
.eval-doc-block,
.score-panel,
.defect-panel,
.eval-question-block p,
.answer-card p,
.doc-content {
  margin: 10px 0 0;
  line-height: 1.7;
  color: #334155;
}

.retrieval-collapse {
  background: #ffffff;
  border-radius: 8px;
}

.doc-title {
  width: 100%;
  justify-content: space-between;
  gap: 12px;
  padding-right: 12px;
}

.answer-compare-grid,
.eval-input-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.answer-card {
  min-height: 150px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.rag-answer {
  background: #fff7ed;
  border-color: #fed7aa;
}

.standard-answer {
  background: #ecfdf5;
  border-color: #bbf7d0;
}

.score-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(130px, 1fr));
  gap: 12px;
}

.score-grid :deep(.el-form-item) {
  display: block;
  margin-bottom: 0;
}

.score-grid :deep(.el-input-number) {
  width: 100%;
}

.defect-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.eval-input-grid :deep(.el-form-item) {
  display: block;
  margin-bottom: 0;
}

.eval-error-text {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.4;
  color: #dc2626;
}

.score-panel :deep(.el-form-item.is-error .el-input-number__wrapper),
.eval-input-grid :deep(.el-form-item.is-error .el-textarea__inner) {
  box-shadow: 0 0 0 1px #ef4444 inset;
}

@media (max-width: 1280px) {
  .eval-workspace {
    grid-template-columns: 1fr;
  }

  .score-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .eval-topbar,
  .eval-detail-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .eval-actions,
  .eval-filter,
  .answer-compare-grid,
  .eval-input-grid,
  .score-grid {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .eval-keyword,
  .eval-filter :deep(.el-select) {
    width: 100%;
  }
}


.commerce-dashboard { min-height: calc(100vh - 108px); color: #1f2937; }
.dashboard-shell { display: grid; grid-template-columns: 232px minmax(0, 1fr); min-height: calc(100vh - 108px); overflow: hidden; background: #f3f6fb; border: 1px solid #e5e7eb; border-radius: 8px; }
.dashboard-sidebar { padding: 18px 14px; background: #101828; border-right: 1px solid rgba(255, 255, 255, 0.08); }
.brand-block { display: flex; gap: 12px; align-items: center; padding: 0 8px 18px; color: #ffffff; }
.brand-logo { display: grid; width: 36px; height: 36px; font-weight: 700; color: #ffffff; place-items: center; background: #2f6fed; border-radius: 8px; }
.brand-block strong, .brand-block span { display: block; }
.brand-block span { margin-top: 4px; font-size: 12px; color: #98a2b3; }
.dashboard-menu { --el-menu-bg-color: transparent; --el-menu-text-color: #cbd5e1; --el-menu-hover-bg-color: rgba(255, 255, 255, 0.08); --el-menu-active-color: #ffffff; border-right: none; }
.dashboard-menu :deep(.el-sub-menu__title), .dashboard-menu :deep(.el-menu-item) { border-radius: 8px; }
.dashboard-main { min-width: 0; padding: 18px; overflow-y: auto; }
.dashboard-header, .dashboard-breadcrumb-row, .dashboard-filter, .kpi-card, .dashboard-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; }
.dashboard-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; }
.header-left, .header-actions, .dashboard-breadcrumb-row, .dashboard-toolbar-actions, .compare-row, .card-title-row, .legend-row, .heat-meta, .review-item, .layout-config-item { display: flex; align-items: center; }
.header-left { flex: 1; gap: 18px; min-width: 0; }
.header-logo { flex: none; font-size: 17px; font-weight: 700; color: #111827; }
.global-search { max-width: 420px; }
.header-actions { gap: 12px; }
.dashboard-breadcrumb-row { justify-content: space-between; margin-top: 14px; padding: 12px 16px; }
.dashboard-toolbar-actions { gap: 10px; }
.dashboard-filter { flex-wrap: wrap; margin-top: 14px; padding: 14px; }
.dashboard-filter :deep(.el-date-editor), .dashboard-filter :deep(.el-select) { width: 220px; }
.kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 14px; }
.kpi-card { padding: 18px; }
.kpi-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; font-size: 13px; color: #64748b; }
.kpi-card strong { display: block; margin-bottom: 12px; font-size: 28px; color: #111827; }
.compare-row { gap: 12px; font-size: 12px; }
.up { color: #059669; }
.down { color: #dc2626; }
.dashboard-layout-grid { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px; align-items: stretch; margin-top: 14px; }
.dashboard-card { display: flex; flex-direction: column; min-width: 0; min-height: 280px; padding: 16px; }
.span-4 { grid-column: span 4; }
.span-8 { grid-column: span 8; }
.span-12 { grid-column: span 12; }
.card-title-row { justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.card-title-row h3 { margin: 0; font-size: 15px; color: #111827; }
.card-title-row span { font-size: 12px; color: #64748b; }
.trend-chart { flex: 1; min-height: 230px; }
.trend-chart svg { width: 100%; height: 185px; background: linear-gradient(#ffffff 24px, #f8fafc 25px); background-size: 100% 40px; border: 1px solid #eef2f7; border-radius: 8px; }
.chart-axis { display: grid; grid-template-columns: repeat(7, 1fr); margin-top: 8px; font-size: 12px; color: #64748b; text-align: center; }
.legend-row { gap: 18px; font-size: 12px; color: #475467; }
.legend::before { display: inline-block; width: 9px; height: 9px; margin-right: 6px; content: ''; border-radius: 50%; }
.legend.blue::before { background: #2f6fed; }
.legend.green::before { background: #12b981; }
.pie-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.pie-block { display: grid; grid-template-columns: 138px minmax(0, 1fr); gap: 16px; align-items: center; }
.donut { display: grid; width: 138px; height: 138px; place-items: center; border-radius: 50%; }
.donut span { display: grid; width: 76px; height: 76px; font-weight: 700; color: #334155; place-items: center; background: #ffffff; border-radius: 50%; }
.pie-legend p { margin: 8px 0; font-size: 13px; color: #475467; }
.pie-legend i { display: inline-block; width: 8px; height: 8px; margin-right: 8px; border-radius: 50%; }
.rank-list, .heat-list, .mini-alert-list, .review-list, .alert-stack, .layout-config-list { display: flex; flex: 1; flex-direction: column; gap: 10px; }
.rank-item { display: grid; grid-template-columns: 30px 1fr; gap: 10px; align-items: center; padding: 10px; background: #f8fafc; border-radius: 8px; }
.rank-item b { display: grid; width: 26px; height: 26px; color: #ffffff; place-items: center; background: #2f6fed; border-radius: 6px; }
.rank-item strong, .rank-item span, .review-item strong, .review-item span { display: block; }
.rank-item span, .review-item span { margin-top: 4px; font-size: 12px; color: #64748b; }
.heat-meta { justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
.heat-meta em { font-style: normal; color: #2f6fed; }
.heat-bar { height: 30px; overflow: hidden; border-radius: 8px; }
.heat-bar span { display: inline-flex; align-items: center; height: 30px; padding-left: 10px; font-size: 12px; color: #334155; }
.visitor-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.visitor-item { padding: 12px; background: #f8fafc; border-radius: 8px; }
.visitor-item span, .visitor-item small, .visitor-item strong { display: block; }
.visitor-item strong { margin: 8px 0; font-size: 24px; color: #111827; }
.visitor-item small { color: #64748b; }
.mini-alert, .alert-item { padding: 12px; border: 1px solid #e5e7eb; border-left-width: 4px; border-radius: 8px; }
.mini-alert strong, .mini-alert span, .alert-item strong, .alert-item p { display: block; }
.mini-alert span, .alert-item p { margin: 6px 0 0; font-size: 12px; color: #64748b; }
.mini-alert.danger, .alert-item.danger { border-left-color: #ef4444; }
.mini-alert.warning, .alert-item.warning { border-left-color: #f59e0b; }
.mini-alert.info, .alert-item.info { border-left-color: #2f6fed; }
.alert-item { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.review-item { justify-content: space-between; gap: 12px; padding: 12px; background: #f8fafc; border-radius: 8px; }
.review-item em { flex: none; padding: 3px 8px; font-size: 12px; font-style: normal; color: #b45309; background: #fff7ed; border-radius: 999px; }
.record-actions { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 12px; }
.table-card { min-height: 420px; }
.table-card :deep(.el-table) { border-radius: 8px; }
.pagination-row { display: flex; justify-content: flex-end; margin-top: 14px; }
.layout-config-item { justify-content: space-between; padding: 12px; border: 1px solid #eef2f7; border-radius: 8px; }
.dark-theme .dashboard-shell { background: #111827; border-color: #334155; }
.dark-theme .dashboard-header, .dark-theme .dashboard-breadcrumb-row, .dark-theme .dashboard-filter, .dark-theme .kpi-card, .dark-theme .dashboard-card { color: #e5e7eb; background: #182230; border-color: #334155; }
.dark-theme .header-logo, .dark-theme .kpi-card strong, .dark-theme .card-title-row h3, .dark-theme .visitor-item strong { color: #f8fafc; }
.dark-theme .visitor-item, .dark-theme .rank-item, .dark-theme .review-item, .dark-theme .trend-chart svg { background: #101828; }
@media (max-width: 1280px) { .dashboard-shell { grid-template-columns: 1fr; } .dashboard-sidebar { display: none; } .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .dashboard-layout-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .span-4, .span-8, .span-12 { grid-column: span 1; } .table-card { grid-column: span 2; } }
@media (max-width: 860px) { .dashboard-header, .dashboard-breadcrumb-row { align-items: flex-start; flex-direction: column; gap: 12px; } .header-left { align-items: stretch; flex-direction: column; width: 100%; } .global-search { max-width: none; } .kpi-grid, .dashboard-layout-grid, .pie-grid, .pie-block, .visitor-grid { grid-template-columns: 1fr; } .span-4, .span-8, .span-12, .table-card { grid-column: span 1; } }

.pane-card {
  padding: 20px;
  background: #ffffff;
  border: 1px solid #f2f3f5;
  border-radius: 8px;
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

.upload-drag {
  width: 100%;
}
</style>
