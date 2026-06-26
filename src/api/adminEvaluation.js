import { request } from './request'

function formatDate(value) {
  if (!value) return '-'
  return String(value).replace('T', ' ').replace(/\.\d+.*$/, '')
}

function percent(value) {
  if (value === null || value === undefined || value === '') return ''
  return `${(Number(value) * 100).toFixed(2)}%`
}

function typeName(type) {
  const names = {
    retrieval_eval: '检索评估',
    ingestion_quality: '入库质量',
    end_to_end: '端到端评估',
    mixed: '混合评估'
  }
  return names[type] || type
}


function mapKbVersion(item) {
  const status = item.status || '-'
  return {
    kbVersion: item.kb_version,
    status,
    faqCollectionName: item.faq_collection_name || '-',
    docCollectionName: item.doc_collection_name || '-',
    createdAt: formatDate(item.created_at),
    description: item.description || '',
    operation: item.operation || '',
    label: `${item.kb_version} | ${status}`
  }
}
function mapEvaluationCase(item) {
  return {
    id: item.id,
    caseId: item.case_id,
    datasetId: item.dataset_id,
    datasetName: item.dataset_name || '',
    evaluationType: item.evaluation_type || '',
    question: item.question,
    expectedJson: item.expected_json || {},
    category: item.category || '',
    createdAt: formatDate(item.created_at)
  }
}
function mapDataset(item) {
  return {
    id: item.id,
    datasetId: item.dataset_id,
    name: item.name,
    type: item.evaluation_type,
    description: item.description,
    sampleCount: item.sample_count || 0,
    createdAt: formatDate(item.created_at)
  }
}

function mapRun(item) {
  const summary = item.summary_json || {}
  const config = item.config_json || {}
  return {
    id: item.id,
    taskId: item.run_id,
    runId: item.run_id,
    type: item.evaluation_type,
    typeName: typeName(item.evaluation_type),
    datasetId: item.dataset_id || '-',
    kbVersion: item.knowledge_base_version || '-',
    status: item.status,
    metrics: item.metrics_text || '-',
    finishedAt: formatDate(item.finished_at),
    createdAt: formatDate(item.created_at),
    summary,
    config,
    detail: item.detail_json || {},
    faqHitAt5: percent(summary.faq_hit_rate_at_5),
    kbRecallAt10: percent(summary.kb_recall_at_10),
    kbMrrAt10: summary.kb_mrr_at_10 ?? '',
    errorCount: summary.error_count || 0
  }
}

function mapCaseResult(item) {
  const retrieved = item.retrieved_items_json || {}
  const metrics = item.metric_results_json || {}
  const expected = item.expected_json || {}
  const faqHits = retrieved.faq_hits || []
  const kbHits = retrieved.kb_hits || []
  return {
    id: item.id,
    caseId: item.case_id,
    question: item.question || retrieved.question || '-',
    rewrittenQuestion: retrieved.rewritten_query || '-',
    expectedRuleId: (expected.expected_rule_ids || []).join(', ') || '-',
    expectedFaqId: (expected.expected_faq_ids || []).join(', ') || '-',
    faqHit: metrics.faq_hit_at_k ?? '-',
    kbRecall: metrics.kb_recall_at_k ?? '-',
    kbRr: metrics.kb_rr ?? '-',
    faqHits,
    kbHits,
    hits: [
      ...faqHits.map((hit) => ({
        id: hit.faq_id,
        title: `FAQ #${hit.rank} ${hit.faq_id}`,
        score: hit.score ?? '-',
        preview: hit.question || '-'
      })),
      ...kbHits.map((hit) => ({
        id: hit.chunk_id || hit.rule_id,
        title: `KB #${hit.rank} ${hit.title || hit.rule_id}`,
        score: hit.score ?? '-',
        preview: hit.chunk_text_preview || '-'
      }))
    ]
  }
}

export async function getEvaluationDatasets(params = {}) {
  const query = new URLSearchParams()
  if (params.keyword) query.set('keyword', params.keyword)
  if (params.evaluationType) query.set('evaluation_type', params.evaluationType)
  const data = await request(`/admin/evaluations/datasets${query.toString() ? `?${query}` : ''}`)
  return { ...data, items: (data.items || []).map(mapDataset) }
}

export function createEvaluationDataset(payload) {
  return request('/admin/evaluations/datasets', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function deleteEvaluationDataset(datasetId) {
  return request(`/admin/evaluations/datasets/${encodeURIComponent(datasetId)}`, { method: 'DELETE' })
}

export async function getEvaluationCases(datasetId) {
  const data = await request(`/admin/evaluations/datasets/${encodeURIComponent(datasetId)}/cases`)
  return { ...data, items: (data.items || []).map(mapEvaluationCase) }
}

export function importEvaluationCases(datasetId, payload) {
  return request(`/admin/evaluations/datasets/${encodeURIComponent(datasetId)}/cases/import`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}


export async function getAllEvaluationCases(params = {}) {
  const query = new URLSearchParams()
  if (params.datasetId) query.set('dataset_id', params.datasetId)
  if (params.category) query.set('category', params.category)
  if (params.keyword) query.set('keyword', params.keyword)
  query.set('page', params.page || 1)
  query.set('page_size', params.pageSize || 100)
  const data = await request(`/admin/evaluations/cases?${query}`)
  return { ...data, items: (data.items || []).map(mapEvaluationCase) }
}

export function deleteEvaluationCase(datasetId, caseId) {
  return request(`/admin/evaluations/datasets/${encodeURIComponent(datasetId)}/cases/${encodeURIComponent(caseId)}`, {
    method: 'DELETE'
  })
}
export async function createIngestionQualityRun(payload) {
  const data = await request('/admin/evaluations/ingestion-quality/runs', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return mapRun(data)
}

export async function createRetrievalRun(payload) {
  const data = await request('/admin/evaluations/retrieval/runs', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
  return mapRun(data)
}

export async function getEvaluationRuns(params = {}) {
  const query = new URLSearchParams()
  if (params.evaluationType) query.set('evaluation_type', params.evaluationType)
  if (params.status) query.set('status', params.status)
  if (params.keyword) query.set('keyword', params.keyword)
  query.set('page', params.page || 1)
  query.set('page_size', params.pageSize || 50)
  const data = await request(`/admin/evaluations/runs?${query}`)
  return { ...data, items: (data.items || []).map(mapRun) }
}

export async function getEvaluationRunCases(runId) {
  const data = await request(`/admin/evaluations/runs/${encodeURIComponent(runId)}/cases`)
  return { ...data, items: (data.items || []).map(mapCaseResult) }
}

export async function getKbVersions(params = {}) {
  const query = new URLSearchParams()
  if (params.status) query.set('status', params.status)
  const data = await request(`/admin/kb/versions${query.toString() ? `?${query}` : ''}`)
  return {
    ...data,
    items: (data.items || []).map(mapKbVersion),
    activeVersion: data.active_version || '',
    previousVersion: data.previous_version || ''
  }
}
