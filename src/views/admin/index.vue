<template>
  <AdminLayout @menu-change="currentTab = $event">
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
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, UploadFilled } from '@element-plus/icons-vue'
import AdminLayout from '@/layouts/AdminLayout.vue'

const currentTab = ref('users')
const loading = ref(false)

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
  fetchUsers()
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
