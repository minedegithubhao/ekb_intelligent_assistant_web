<template>
  <AdminLayout @menu-change="currentTab = $event">

    <section v-if="currentTab === 'dashboard'" class="simple-dashboard">
      <div class="pane-card module-head">
        <div>
          <h2>仪表盘管理</h2>
          <p>保留核心运营指标、告警和问答记录，减少复杂图表与自定义布局代码。</p>
        </div>
        <div class="module-actions">
          <el-button @click="dashboardReportVisible = true">异常提醒</el-button>
          <el-button type="primary" @click="exportRecords">导出记录</el-button>
        </div>
      </div>

      <div class="dashboard-summary-grid">
        <el-card v-for="item in dashboardSummary" :key="item.label" shadow="never" class="summary-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small :class="item.trend >= 0 ? 'up' : 'down'">
            {{ item.trend >= 0 ? '+' : '' }}{{ item.trend }}% 较昨日
          </small>
        </el-card>
      </div>

      <div class="pane-card compact-toolbar">
        <el-input v-model="dashboardKeyword" placeholder="搜索店铺、问题或状态" clearable />
        <el-button type="primary" plain @click="dashboardKeyword = dashboardKeyword.trim()">查询</el-button>
        <el-button @click="resetDashboardKeyword">重置</el-button>
      </div>

      <div class="dashboard-simple-grid">
        <el-card shadow="never">
          <template #header>咨询趋势</template>
          <div class="simple-bars">
            <div v-for="item in dashboardTrend" :key="item.day" class="simple-bar-row">
              <span>{{ item.day }}</span>
              <div class="simple-bar-track"><i :style="{ width: item.percent + '%' }"></i></div>
              <em>{{ item.count }}</em>
            </div>
          </div>
        </el-card>

        <el-card shadow="never">
          <template #header>TOP 高频问题</template>
          <div class="simple-rank-list">
            <div v-for="(item, index) in dashboardTopQuestions" :key="item.question">
              <b>{{ index + 1 }}</b>
              <span>{{ item.question }}</span>
              <em>{{ item.count }}次</em>
            </div>
          </div>
        </el-card>
      </div>

      <el-card shadow="never" class="simple-table-card">
        <template #header>问答记录</template>
        <el-table :data="filteredDashboardRecords" border stripe style="width: 100%">
          <el-table-column prop="id" label="记录ID" width="150" sortable />
          <el-table-column prop="time" label="时间" width="160" sortable />
          <el-table-column prop="store" label="店铺" width="140" />
          <el-table-column prop="type" label="问题类型" width="120" />
          <el-table-column prop="question" label="用户问题" min-width="220" show-overflow-tooltip />
          <el-table-column prop="answerTime" label="响应秒数" width="110" sortable />
          <el-table-column prop="satisfaction" label="满意度" width="100" />
          <el-table-column prop="status" label="状态" width="100" />
        </el-table>
      </el-card>

      <el-dialog v-model="dashboardReportVisible" title="异常提醒" width="560px">
        <div class="simple-alert-list">
          <div v-for="item in dashboardAlerts" :key="item.title" class="simple-alert-item">
            <strong>{{ item.title }}</strong>
            <p>{{ item.desc }}</p>
          </div>
        </div>
      </el-dialog>
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

    <section v-if="currentTab === 'evaluations'" class="simple-eval">
      <div class="pane-card module-head">
        <div>
          <h2>评估管理</h2>
          <p>简约版 RAG 评估工作台，保留样本查看、打分、缺陷标记和评估报告。</p>
        </div>
        <div class="module-actions">
          <el-button @click="resetEvalFilter">重置筛选</el-button>
          <el-button type="success" plain @click="evalReportVisible = true">评估报告</el-button>
          <el-button type="primary" plain @click="saveCurrentEval">保存当前</el-button>
          <el-button type="primary" @click="batchSubmitEval">提交评估</el-button>
        </div>
      </div>

      <div class="pane-card compact-toolbar">
        <el-select v-model="evalQuery.scene" placeholder="场景筛选" clearable>
          <el-option v-for="scene in evalSceneOptions" :key="scene" :label="scene" :value="scene" />
        </el-select>
        <el-select v-model="evalQuery.status" placeholder="评测状态" clearable>
          <el-option label="待评测" value="pending" />
          <el-option label="草稿" value="draft" />
          <el-option label="已提交" value="submitted" />
        </el-select>
        <el-input v-model="evalQuery.keyword" placeholder="搜索问题、样本ID、店铺" clearable />
      </div>

      <div class="simple-eval-grid">
        <el-card shadow="never" class="eval-list-card">
          <template #header>评测样本</template>
          <el-table
            :data="pagedEvalSamples"
            border
            highlight-current-row
            :row-class-name="getEvalRowClass"
            @current-change="selectEvalSample"
          >
            <el-table-column prop="sampleId" label="样本ID" width="130" />
            <el-table-column prop="scene" label="场景" width="110" />
            <el-table-column prop="storeName" label="店铺" width="130" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-tag :type="getEvalStatusTag(scope.row.status)" size="small">
                  {{ getEvalStatusText(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="userQuestion" label="用户提问" min-width="220" show-overflow-tooltip />
          </el-table>
          <div class="simple-pagination">
            <el-pagination
              v-model:current-page="evalPage"
              background
              small
              layout="prev, pager, next"
              :page-size="evalPageSize"
              :total="filteredEvalSamples.length"
            />
          </div>
        </el-card>

        <el-card v-if="activeEvalSample" shadow="never" class="eval-form-card">
          <template #header>
            <div class="card-header-line">
              <span>{{ activeEvalSample.sampleId }} · {{ activeEvalSample.scene }}</span>
              <el-tag effect="plain">{{ activeEvalSample.storeName }}</el-tag>
            </div>
          </template>

          <section class="simple-block">
            <h3>用户提问</h3>
            <p>{{ activeEvalSample.userQuestion }}</p>
          </section>

          <section class="simple-block">
            <h3>检索知识库原文</h3>
            <el-collapse>
              <el-collapse-item v-for="doc in activeEvalSample.retrievedDocuments" :key="doc.documentId" :title="doc.title" :name="doc.documentId">
                <p>{{ doc.content }}</p>
              </el-collapse-item>
            </el-collapse>
          </section>

          <div class="answer-simple-grid">
            <section class="simple-block">
              <h3>RAG 输出回答</h3>
              <p>{{ activeEvalSample.ragAnswer }}</p>
            </section>
            <section class="simple-block">
              <h3>标准正确答案</h3>
              <p>{{ activeEvalSample.referenceAnswer }}</p>
            </section>
          </div>

          <section class="simple-block">
            <h3>五项评分</h3>
            <div class="score-simple-grid">
              <el-form-item v-for="metric in evalScoreMetrics" :key="metric.key" :label="metric.label" :class="{ 'is-error': evalErrors[metric.key] }">
                <el-input-number v-model="activeEvalSample.scores[metric.key]" :min="0" :max="10" :step="1" />
                <div v-if="evalErrors[metric.key]" class="eval-error-text">{{ evalErrors[metric.key] }}</div>
              </el-form-item>
            </div>
          </section>

          <section class="simple-block">
            <h3>电商缺陷标签</h3>
            <el-checkbox-group v-model="activeEvalSample.defectTags" class="simple-checkbox-group">
              <el-checkbox v-for="tag in ecommerceDefectTags" :key="tag" :label="tag" />
            </el-checkbox-group>
          </section>

          <div class="answer-simple-grid">
            <el-form-item label="扣分理由" :class="{ 'is-error': evalErrors.deductionReason }">
              <el-input v-model="activeEvalSample.deductionReason" type="textarea" :rows="3" />
              <div v-if="evalErrors.deductionReason" class="eval-error-text">{{ evalErrors.deductionReason }}</div>
            </el-form-item>
            <el-form-item label="优化建议">
              <el-input v-model="activeEvalSample.optimizationSuggestion" type="textarea" :rows="3" />
            </el-form-item>
          </div>
        </el-card>
      </div>

      <el-dialog v-model="evalReportVisible" title="评估报告" width="620px">
        <div class="report-summary">
          <div><span>样本总数</span><strong>{{ evalReportSummary.total }}</strong></div>
          <div><span>已提交</span><strong>{{ evalReportSummary.submitted }}</strong></div>
          <div><span>平均分</span><strong>{{ evalReportSummary.averageScore }}</strong></div>
          <div><span>低分样本</span><strong>{{ evalReportSummary.lowScore }}</strong></div>
        </div>
        <el-table :data="evalReportSummary.metricRows" border size="small">
          <el-table-column prop="label" label="指标" />
          <el-table-column prop="value" label="平均分" width="120" />
        </el-table>
      </el-dialog>
    </section>



    <section v-if="currentTab === 'testsets'" class="testset-management-section">
      <el-card shadow="never" class="testset-card">
        <template #header>
          <div class="testset-card-header">
            <div>
              <h3>测试集管理</h3>
              <p>维护电商 RAG 评测测试集，使用本地 Mock 数据。</p>
            </div>
            <el-button type="primary" @click="openTestSetDialog('add')">新增测试集</el-button>
          </div>
        </template>

        <div class="testset-toolbar">
          <el-input
            v-model="testSetKeyword"
            placeholder="按测试集名称搜索"
            class="testset-search"
            clearable
          />
          <el-button type="primary" plain @click="testSetPage = 1">搜索</el-button>
        </div>

        <el-table :data="pagedTestSetList" border stripe style="width: 100%">
          <el-table-column prop="id" label="ID" width="120" />
          <el-table-column prop="name" label="名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="description" label="描述" min-width="260" show-overflow-tooltip />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.status === 'enabled' ? 'success' : 'info'" effect="plain">
                {{ scope.row.status === 'enabled' ? '启用' : '禁用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="caseCount" label="用例数" width="100" align="center" />
          <el-table-column prop="createdAt" label="创建时间" width="180" />
          <el-table-column label="操作" width="160" fixed="right">
            <template #default="scope">
              <el-button link type="primary" @click="openTestSetDialog('edit', scope.row)">编辑</el-button>
              <el-button link type="danger" @click="deleteTestSet(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="testset-pagination">
          <el-pagination
            v-model:current-page="testSetPage"
            v-model:page-size="testSetPageSize"
            background
            layout="total, sizes, prev, pager, next"
            :page-sizes="[5, 10, 20]"
            :total="filteredTestSetList.length"
          />
        </div>
      </el-card>

      <el-dialog
        v-model="testSetDialogVisible"
        :title="testSetDialogType === 'add' ? '新增测试集' : '编辑测试集'"
        width="520px"
      >
        <el-form ref="testSetFormRef" :model="testSetForm" :rules="testSetRules" label-position="top">
          <el-form-item label="名称" prop="name">
            <el-input v-model="testSetForm.name" placeholder="请输入测试集名称" />
          </el-form-item>
          <el-form-item label="描述" prop="description">
            <el-input v-model="testSetForm.description" type="textarea" :rows="3" placeholder="请输入测试集描述" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="testSetForm.status">
              <el-radio value="enabled">启用</el-radio>
              <el-radio value="disabled">禁用</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="testSetDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitTestSetForm">保存</el-button>
        </template>
      </el-dialog>
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

    <section v-if="currentTab === 'sessionAudit'" class="simple-session-audit">
      <el-card shadow="never">
        <template #header>
          <div class="module-head in-card">
            <div>
              <h2>后台会话审计管理</h2>
              <p>简约纯前端 Mock 展示，仅保留筛选、列表和会话详情。</p>
            </div>
            <el-button type="primary" plain @click="simulateSessionExport">模拟导出</el-button>
          </div>
        </template>

        <div class="compact-toolbar">
          <el-input v-model="sessionAuditKeyword" placeholder="搜索标题、用户ID或消息内容" clearable />
          <el-date-picker
            v-model="sessionAuditDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
          />
          <el-select v-model="sessionAuditStatus" placeholder="会话状态" clearable>
            <el-option label="活跃" value="active" />
            <el-option label="关闭" value="closed" />
          </el-select>
          <el-button @click="resetSessionAuditFilters">重置</el-button>
        </div>

        <el-table :data="pagedSessionAuditList" border stripe style="width: 100%" @row-click="openSessionDetail">
          <el-table-column prop="sessionId" label="会话ID" width="160" />
          <el-table-column prop="userName" label="用户名称" width="130" />
          <el-table-column prop="title" label="会话标题" min-width="240" show-overflow-tooltip />
          <el-table-column prop="messageCount" label="消息数" width="90" align="center" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.status === 'active' ? 'success' : 'info'" effect="plain">
                {{ scope.row.status === 'active' ? '活跃' : '关闭' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="180" />
          <el-table-column label="操作" width="110" fixed="right">
            <template #default="scope">
              <el-button link type="primary" @click.stop="openSessionDetail(scope.row)">查看</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="simple-pagination">
          <el-pagination
            v-model:current-page="sessionAuditPage"
            background
            layout="total, prev, pager, next"
            :page-size="sessionAuditPageSize"
            :total="filteredSessionAuditList.length"
          />
        </div>
      </el-card>

      <el-drawer v-model="sessionDetailVisible" size="560px" title="会话详情">
        <template v-if="activeSessionDetail">
          <div class="session-detail-summary">
            <h3>{{ activeSessionDetail.title }}</h3>
            <p>{{ activeSessionDetail.sessionId }} · {{ activeSessionDetail.userName }} · {{ activeSessionDetail.createdAt }}</p>
          </div>
          <div class="session-message-flow">
            <div v-for="message in activeSessionDetail.messages" :key="message.timestamp + message.role" class="session-message" :class="message.role">
              <div class="message-meta">
                <span>{{ message.role === 'user' ? '用户' : 'AI' }}</span>
                <time>{{ message.timestamp }}</time>
              </div>
              <p>{{ message.content }}</p>
              <el-button size="small" text type="primary" @click="copySessionMessage(message.content)">复制</el-button>
            </div>
          </div>
        </template>
      </el-drawer>
    </section>


  </AdminLayout>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import AdminLayout from '@/layouts/AdminLayout.vue'

const currentTab = ref('users')
const loading = ref(false)


const dashboardKeyword = ref('')
const dashboardReportVisible = ref(false)

const dashboardSummary = [
  { label: '今日咨询量', value: '12,486', trend: 7.4 },
  { label: '智能回复率', value: '92.8%', trend: 2.1 },
  { label: '平均响应', value: '8.6s', trend: -5.8 },
  { label: '满意度', value: '4.72', trend: 1.6 }
]

const dashboardTrend = [
  { day: '06-18', count: 9300, percent: 74 },
  { day: '06-19', count: 10800, percent: 86 },
  { day: '06-20', count: 11600, percent: 92 },
  { day: '06-21', count: 12100, percent: 96 },
  { day: '06-22', count: 12486, percent: 100 }
]

const dashboardTopQuestions = [
  { question: '订单什么时候发货？', count: 3862 },
  { question: '七天无理由退货怎么申请？', count: 2950 },
  { question: '优惠券能否叠加？', count: 2418 },
  { question: '尺码偏大还是偏小？', count: 2066 },
  { question: '发票抬头如何修改？', count: 1680 }
]

const dashboardAlerts = [
  { title: '低满意度集中出现', desc: '近 30 分钟出现多条低满意度评价，建议复核活动优惠回答。' },
  { title: '未回复会话超时', desc: '部分店铺存在超过 5 分钟未响应会话，建议转人工处理。' }
]

const dashboardRecords = ref([
  { id: 'QA20260622001', time: '2026-06-22 10:24', store: '天猫旗舰店', type: '订单物流', question: '订单今天能发出吗？', answerTime: 6.2, satisfaction: '高', status: '已回复' },
  { id: 'QA20260622002', time: '2026-06-22 10:21', store: '抖音商城', type: '活动优惠', question: '满减券和会员券能一起用吗？', answerTime: 18.4, satisfaction: '低', status: '待复核' },
  { id: 'QA20260622003', time: '2026-06-22 10:18', store: '京东自营店', type: '退换售后', question: '拆封后还能退货吗？', answerTime: 9.5, satisfaction: '中', status: '已回复' },
  { id: 'QA20260622004', time: '2026-06-22 10:15', store: '微信小店', type: '商品参数', question: '这款外套适合多少温度？', answerTime: 11.1, satisfaction: '高', status: '已标记' }
])

const filteredDashboardRecords = computed(() => {
  const keyword = dashboardKeyword.value.trim().toLowerCase()
  if (!keyword) return dashboardRecords.value
  return dashboardRecords.value.filter((row) =>
    [row.store, row.type, row.question, row.status].some((field) => field.toLowerCase().includes(keyword))
  )
})

const resetDashboardKeyword = () => {
  dashboardKeyword.value = ''
}

const exportRecords = () => {
  ElMessage.success('已模拟导出问答记录')
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
const evalPage = ref(1)
const evalPageSize = 5
const activeEvalSampleId = ref('')
const evalErrors = reactive({})
const evalReportVisible = ref(false)

const evalScoreMetrics = [
  { key: 'answerRelevance', label: '相关性' },
  { key: 'faithfulness', label: '忠实度' },
  { key: 'retrievalGrounding', label: '检索支撑' },
  { key: 'referenceCompleteness', label: '答案覆盖' },
  { key: 'commerceSafety', label: '电商合规' }
]

const ecommerceDefectTags = ['售后规则错误', '优惠误导', '物流不准', '参数缺失', '应转人工']

const evalSamples = ref([
  {
    sampleId: 'EC-RAG-0001',
    storeName: '天猫旗舰店',
    scene: '售后退换',
    status: 'pending',
    userQuestion: '电饭煲已经拆封试用两次，还能申请七天无理由退货吗？',
    retrievedDocuments: [
      { documentId: 'doc_return_001', title: '七天无理由退货规则', content: '厨电类商品如已通电使用且影响二次销售，通常不支持无理由退货。' },
      { documentId: 'doc_service_004', title: '人工复核规则', content: '涉及质量争议或规则边界不清时，应建议提交照片并转人工复核。' }
    ],
    ragAnswer: '拆封后一般仍可申请七天无理由退货，请保持配件齐全。',
    referenceAnswer: '已通电试用的厨电可能影响二次销售，通常不支持七天无理由；如存在质量问题，可提交凭证申请售后检测。',
    scores: { answerRelevance: null, faithfulness: null, retrievalGrounding: null, referenceCompleteness: null, commerceSafety: null },
    defectTags: [],
    deductionReason: '',
    optimizationSuggestion: ''
  },
  {
    sampleId: 'EC-RAG-0002',
    storeName: '京东自营店',
    scene: '活动优惠',
    status: 'draft',
    userQuestion: '618 满减券可以和店铺会员券一起用吗？',
    retrievedDocuments: [
      { documentId: 'doc_coupon_011', title: '优惠券叠加规则', content: '平台满减券可与店铺会员券叠加，但需满足门槛和商品范围限制。' }
    ],
    ragAnswer: '通常可以一起使用，实际以结算页展示为准。',
    referenceAnswer: '可叠加但需满足活动范围、门槛和券类型限制，最终以结算页可用优惠为准。',
    scores: { answerRelevance: 8, faithfulness: 8, retrievalGrounding: 8, referenceCompleteness: 7, commerceSafety: 8 },
    defectTags: [],
    deductionReason: '',
    optimizationSuggestion: ''
  },
  {
    sampleId: 'EC-RAG-0003',
    storeName: '抖音商城',
    scene: '物流配送',
    status: 'submitted',
    userQuestion: '新疆订单页面写 48 小时发货，是 48 小时能到吗？',
    retrievedDocuments: [
      { documentId: 'doc_ship_007', title: '偏远地区配送时效', content: '新疆等地区通常发货后 5-8 天送达，天气或安检可能延迟。' }
    ],
    ragAnswer: '48 小时是发货承诺，不代表 48 小时送达。',
    referenceAnswer: '48 小时发货指商家交付承运商，新疆地区通常发货后 5-8 天送达，具体以物流轨迹为准。',
    scores: { answerRelevance: 9, faithfulness: 9, retrievalGrounding: 9, referenceCompleteness: 8, commerceSafety: 9 },
    defectTags: [],
    deductionReason: '',
    optimizationSuggestion: ''
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
  const start = (evalPage.value - 1) * evalPageSize
  return filteredEvalSamples.value.slice(start, start + evalPageSize)
})
const activeEvalSample = computed(() => evalSamples.value.find((sample) => sample.sampleId === activeEvalSampleId.value) || filteredEvalSamples.value[0] || null)

const evalReportSummary = computed(() => {
  const averages = evalSamples.value
    .map((sample) => evalScoreMetrics.map((metric) => Number(sample.scores[metric.key])).filter((score) => !Number.isNaN(score)))
    .filter((scores) => scores.length === evalScoreMetrics.length)
    .map((scores) => scores.reduce((sum, score) => sum + score, 0) / scores.length)
  const metricRows = evalScoreMetrics.map((metric) => {
    const values = evalSamples.value.map((sample) => Number(sample.scores[metric.key])).filter((score) => !Number.isNaN(score))
    const value = values.length ? (values.reduce((sum, score) => sum + score, 0) / values.length).toFixed(1) : '-'
    return { label: metric.label, value }
  })
  return {
    total: evalSamples.value.length,
    submitted: evalSamples.value.filter((sample) => sample.status === 'submitted').length,
    averageScore: averages.length ? (averages.reduce((sum, score) => sum + score, 0) / averages.length).toFixed(1) : '-',
    lowScore: averages.filter((score) => score < 7).length,
    metricRows
  }
})

const selectEvalSample = (row) => {
  if (row) activeEvalSampleId.value = row.sampleId
}

const validateEvalSample = (sample) => {
  Object.keys(evalErrors).forEach((key) => delete evalErrors[key])
  evalScoreMetrics.forEach((metric) => {
    const value = sample.scores[metric.key]
    if (value === null || value === undefined || value === '') evalErrors[metric.key] = '请填写0-10分'
  })
  const hasLowScore = evalScoreMetrics.some((metric) => Number(sample.scores[metric.key]) < 7)
  if (hasLowScore && !sample.deductionReason.trim()) {
    evalErrors.deductionReason = '低于7分时请填写扣分理由'
  }
  return Object.keys(evalErrors).length === 0
}

const saveCurrentEval = () => {
  if (!activeEvalSample.value) return
  if (!validateEvalSample(activeEvalSample.value)) {
    ElMessage.error('请先修正高亮字段')
    return
  }
  activeEvalSample.value.status = 'draft'
  ElMessage.success('当前样本已保存')
}

const batchSubmitEval = () => {
  if (!activeEvalSample.value) return
  if (!validateEvalSample(activeEvalSample.value)) {
    ElMessage.error('请先完成当前样本评分')
    return
  }
  activeEvalSample.value.status = 'submitted'
  ElMessage.success('当前样本已提交')
}

const resetEvalFilter = () => {
  Object.assign(evalQuery, { scene: '', status: '', keyword: '' })
  evalPage.value = 1
}

const getEvalStatusText = (status) => ({ pending: '待评测', draft: '草稿', submitted: '已提交' }[status] || status)
const getEvalStatusTag = (status) => ({ pending: 'info', draft: 'warning', submitted: 'success' }[status] || 'info')
const getEvalRowClass = ({ row }) => row.sampleId === activeEvalSampleId.value ? 'active-eval-row' : ''
const fetchEvals = () => {}



const testSetKeyword = ref('')
const testSetPage = ref(1)
const testSetPageSize = ref(5)
const testSetDialogVisible = ref(false)
const testSetDialogType = ref('add')
const testSetFormRef = ref(null)
const testSetForm = reactive({ id: '', name: '', description: '', status: 'enabled' })
const testSetRules = {
  name: [{ required: true, message: '请输入测试集名称', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }]
}
const testSetList = ref([
  {
    id: 'ts_ec_001',
    name: '售后退换货核心测试集',
    description: '覆盖七天无理由、质量问题、破损漏液、人工复核等售后场景。',
    status: 'enabled',
    caseCount: 36,
    createdAt: '2026-06-20 09:30:00'
  },
  {
    id: 'ts_ec_002',
    name: '促销优惠券问答测试集',
    description: '验证满减券、会员券、平台券叠加和价格承诺风险回答。',
    status: 'enabled',
    caseCount: 28,
    createdAt: '2026-06-20 14:12:00'
  },
  {
    id: 'ts_ec_003',
    name: '物流时效与偏远地区测试集',
    description: '用于评估发货承诺、预计送达、偏远地区延迟说明的准确性。',
    status: 'disabled',
    caseCount: 18,
    createdAt: '2026-06-21 10:08:00'
  },
  {
    id: 'ts_ec_004',
    name: '商品参数与材质测试集',
    description: '覆盖规格、材质、保养方式、适用人群等商品详情问答。',
    status: 'enabled',
    caseCount: 42,
    createdAt: '2026-06-21 16:45:00'
  },
  {
    id: 'ts_ec_005',
    name: '发票售后测试集',
    description: '验证发票抬头修改、红冲重开、确认收货后开票等财务规则。',
    status: 'enabled',
    caseCount: 15,
    createdAt: '2026-06-22 09:05:00'
  },
  {
    id: 'ts_ec_006',
    name: '客服安全合规测试集',
    description: '识别过度承诺、价格误导、应转人工未转等高风险客服回复。',
    status: 'disabled',
    caseCount: 24,
    createdAt: '2026-06-22 11:20:00'
  }
])
const filteredTestSetList = computed(() => {
  const keyword = testSetKeyword.value.trim().toLowerCase()
  if (!keyword) return testSetList.value
  return testSetList.value.filter((item) => item.name.toLowerCase().includes(keyword))
})
const pagedTestSetList = computed(() => {
  const start = (testSetPage.value - 1) * testSetPageSize.value
  return filteredTestSetList.value.slice(start, start + testSetPageSize.value)
})

const openTestSetDialog = (type, row = null) => {
  testSetDialogType.value = type
  testSetDialogVisible.value = true
  if (row) {
    Object.assign(testSetForm, row)
    return
  }
  Object.assign(testSetForm, { id: '', name: '', description: '', status: 'enabled' })
}

const submitTestSetForm = async () => {
  const valid = await testSetFormRef.value?.validate().catch(() => false)
  if (!valid) return

  if (testSetDialogType.value === 'edit') {
    const target = testSetList.value.find((item) => item.id === testSetForm.id)
    if (target) {
      Object.assign(target, {
        name: testSetForm.name,
        description: testSetForm.description,
        status: testSetForm.status
      })
    }
    ElMessage.success('测试集已更新')
  } else {
    testSetList.value.unshift({
      id: 'ts_ec_' + String(Date.now()).slice(-6),
      name: testSetForm.name,
      description: testSetForm.description,
      status: testSetForm.status,
      caseCount: 0,
      createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).replaceAll('/', '-')
    })
    testSetPage.value = 1
    ElMessage.success('测试集已新增')
  }
  testSetDialogVisible.value = false
}

const deleteTestSet = (row) => {
  ElMessageBox.confirm('确定删除测试集“' + row.name + '”吗？', '删除确认', { type: 'warning' })
    .then(() => {
      testSetList.value = testSetList.value.filter((item) => item.id !== row.id)
      ElMessage.success('测试集已删除')
    })
    .catch(() => {})
}


/**
 * @typedef {'user' | 'assistant'} MessageRole
 * @typedef {{ role: MessageRole, content: string, timestamp: string }} Message
 * @typedef {'active' | 'closed'} SessionStatus
 * @typedef {{ sessionId: string, userId: string, userName: string, title: string, messageCount: number, createdAt: string, status: SessionStatus, messages: Message[] }} Session
 */

const SESSION_AUDIT_MOCK_SESSIONS = [
  {
    sessionId: 'sess_001',
    userId: 'u_10001',
    userName: '李想',
    title: '订单发货时效咨询',
    status: 'active',
    createdAt: '2026-06-22 09:12:00',
    messages: [
      { role: 'user', content: '昨天买的电饭煲今天能发货吗？', timestamp: '2026-06-22 09:12:10' },
      { role: 'assistant', content: '当前订单预计 48 小时内出库，具体以订单详情物流更新为准。', timestamp: '2026-06-22 09:12:18' }
    ]
  },
  {
    sessionId: 'sess_002',
    userId: 'u_10002',
    userName: '张敏',
    title: '优惠券叠加规则',
    status: 'closed',
    createdAt: '2026-06-22 09:35:00',
    messages: [
      { role: 'user', content: '满减券能和会员券一起用吗？', timestamp: '2026-06-22 09:35:03' },
      { role: 'assistant', content: '通常可以叠加，但需要满足商品范围、门槛和券类型限制。', timestamp: '2026-06-22 09:35:09' },
      { role: 'user', content: '为什么结算页没有叠加？', timestamp: '2026-06-22 09:35:27' },
      { role: 'assistant', content: '请以结算页可用优惠为准，也可以转人工核实具体原因。', timestamp: '2026-06-22 09:35:34' }
    ]
  },
  {
    sessionId: 'sess_003',
    userId: 'u_10003',
    userName: '王可',
    title: '七天无理由退货',
    status: 'active',
    createdAt: '2026-06-22 10:05:00',
    messages: [
      { role: 'user', content: '拆封试用后还能七天无理由退货吗？', timestamp: '2026-06-22 10:05:06' },
      { role: 'assistant', content: '如已影响二次销售，通常不支持七天无理由；质量问题可申请售后检测。', timestamp: '2026-06-22 10:05:13' }
    ]
  },
  {
    sessionId: 'sess_004',
    userId: 'u_10004',
    userName: '赵磊',
    title: '偏远地区物流预计送达',
    status: 'closed',
    createdAt: '2026-06-22 10:28:00',
    messages: [
      { role: 'user', content: '新疆订单 48 小时发货，是 48 小时到吗？', timestamp: '2026-06-22 10:28:11' },
      { role: 'assistant', content: '48 小时发货不等于 48 小时送达，新疆通常发货后 5-8 天送达。', timestamp: '2026-06-22 10:28:19' }
    ]
  }
].map((session) => ({ ...session, messageCount: session.messages.length }))

const sessionAuditKeyword = ref('')
const sessionAuditStatus = ref('')
const sessionAuditDateRange = ref([])
const sessionAuditPage = ref(1)
const sessionAuditPageSize = 5
const sessionDetailVisible = ref(false)
const activeSessionDetail = ref(null)
const sessionAuditList = ref([...SESSION_AUDIT_MOCK_SESSIONS])

const filteredSessionAuditList = computed(() => {
  const keyword = sessionAuditKeyword.value.trim().toLowerCase()
  const range = sessionAuditDateRange.value || []
  return sessionAuditList.value.filter((session) => {
    const createdTime = new Date(session.createdAt).getTime()
    const matchKeyword = !keyword ||
      [session.title, session.userId, session.userName, session.sessionId].some((field) => field.toLowerCase().includes(keyword)) ||
      session.messages.some((message) => message.content.toLowerCase().includes(keyword))
    const matchStatus = !sessionAuditStatus.value || session.status === sessionAuditStatus.value
    const matchStart = !range[0] || createdTime >= new Date(range[0]).getTime()
    const matchEnd = !range[1] || createdTime <= new Date(range[1]).getTime()
    return matchKeyword && matchStatus && matchStart && matchEnd
  })
})

const pagedSessionAuditList = computed(() => {
  const start = (sessionAuditPage.value - 1) * sessionAuditPageSize
  return filteredSessionAuditList.value.slice(start, start + sessionAuditPageSize)
})

const resetSessionAuditFilters = () => {
  sessionAuditKeyword.value = ''
  sessionAuditStatus.value = ''
  sessionAuditDateRange.value = []
  sessionAuditPage.value = 1
}

const openSessionDetail = (session) => {
  activeSessionDetail.value = session
  sessionDetailVisible.value = true
}

const copySessionMessage = async (content) => {
  try {
    await navigator.clipboard.writeText(content)
    ElMessage.success('消息内容已复制')
  } catch (error) {
    ElMessage.warning('当前浏览器不支持自动复制')
  }
}

const simulateSessionExport = () => {
  ElMessage.success('已模拟导出当前筛选结果')
}

onMounted(() => {
  fetchUsers()
  fetchKBs()
  fetchEvals()
})
</script>

<style scoped>

.simple-dashboard,
.simple-eval,
.simple-session-audit {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.module-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.module-head.in-card {
  padding: 0;
  border: none;
}

.module-head h2 {
  margin: 0;
  font-size: 18px;
  color: #1d2129;
}

.module-head p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #86909c;
}

.module-actions,
.compact-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.compact-toolbar {
  flex-wrap: wrap;
}

.compact-toolbar :deep(.el-input) {
  width: 280px;
}

.compact-toolbar :deep(.el-select),
.compact-toolbar :deep(.el-date-editor) {
  width: 220px;
}

.dashboard-summary-grid,
.dashboard-simple-grid,
.simple-eval-grid,
.answer-simple-grid,
.score-simple-grid,
.report-summary {
  display: grid;
  gap: 16px;
}

.dashboard-summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.summary-card span,
.summary-card small {
  display: block;
  color: #86909c;
}

.summary-card strong {
  display: block;
  margin: 10px 0;
  font-size: 26px;
  color: #1d2129;
}

.up {
  color: #00a870 !important;
}

.down {
  color: #f53f3f !important;
}

.dashboard-simple-grid,
.answer-simple-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.simple-bars,
.simple-rank-list,
.simple-alert-list,
.session-message-flow {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.simple-bar-row,
.simple-rank-list div,
.card-header-line,
.message-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.simple-bar-row span {
  width: 56px;
  color: #4e5969;
}

.simple-bar-track {
  flex: 1;
  height: 10px;
  overflow: hidden;
  background: #eef2f7;
  border-radius: 999px;
}

.simple-bar-track i {
  display: block;
  height: 100%;
  background: #2362fb;
}

.simple-bar-row em,
.simple-rank-list em {
  font-style: normal;
  color: #4e5969;
}

.simple-rank-list b {
  display: grid;
  width: 24px;
  height: 24px;
  color: #ffffff;
  place-items: center;
  background: #2362fb;
  border-radius: 6px;
}

.simple-rank-list span {
  flex: 1;
}

.simple-alert-item,
.simple-block,
.session-message {
  padding: 12px;
  background: #f7f8fa;
  border-radius: 8px;
}

.simple-alert-item p,
.simple-block p,
.session-detail-summary p,
.session-message p {
  margin: 8px 0 0;
  line-height: 1.7;
  color: #4e5969;
}

.simple-eval-grid {
  grid-template-columns: minmax(420px, 1fr) minmax(420px, 1.2fr);
}

.simple-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.card-header-line {
  justify-content: space-between;
}

.simple-block h3 {
  margin: 0 0 10px;
  font-size: 15px;
  color: #1d2129;
}

.score-simple-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.score-simple-grid :deep(.el-input-number) {
  width: 100%;
}

.simple-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
}

.eval-error-text {
  margin-top: 6px;
  font-size: 12px;
  color: #f53f3f;
}

.active-eval-row td {
  background: #eef4ff !important;
}

.report-summary {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 16px;
}

.report-summary div {
  padding: 12px;
  background: #f7f8fa;
  border-radius: 8px;
}

.report-summary span,
.report-summary strong {
  display: block;
}

.report-summary span {
  color: #86909c;
}

.report-summary strong {
  margin-top: 8px;
  font-size: 22px;
  color: #1d2129;
}

@media (max-width: 1100px) {
  .dashboard-summary-grid,
  .dashboard-simple-grid,
  .simple-eval-grid,
  .answer-simple-grid,
  .score-simple-grid,
  .report-summary {
    grid-template-columns: 1fr;
  }

  .module-head {
    align-items: flex-start;
    flex-direction: column;
  }
}


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

.testset-management-section {
  margin-top: 16px;
}

.testset-card {
  border-radius: 8px;
}

.testset-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.testset-card-header h3 {
  margin: 0;
  font-size: 16px;
  color: #1d2129;
}

.testset-card-header p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #86909c;
}

.testset-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
}

.testset-search {
  width: 280px;
}

.testset-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}


.simple-session-audit :deep(.el-card__header) {
  padding: 16px 20px;
}

.session-detail-summary {
  padding-bottom: 14px;
  margin-bottom: 14px;
  border-bottom: 1px solid #eef2f7;
}

.session-detail-summary h3 {
  margin: 0;
  color: #1d2129;
}

.session-message.user {
  background: #eef4ff;
}

.session-message.assistant {
  background: #f7f8fa;
}

.message-meta {
  justify-content: space-between;
  font-size: 12px;
  color: #86909c;
}


</style>
