import { request } from './request'

export function getDashboardConfig() {
  return request('/admin/dashboard/config')
}

export function saveDashboardConfig(payload) {
  return request('/admin/dashboard/config', {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export function getConfigVersions() {
  return request('/admin/config/versions')
}

export function createConfigVersion(payload) {
  return request('/admin/config/versions', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function activateConfigVersion(versionId) {
  return request(`/admin/config/versions/${versionId}/activate`, {
    method: 'POST'
  })
}

export function getKeywordRules() {
  return request('/admin/retrieval/keyword-rules')
}

export function updateKeywordRuleKeywords(ruleCode, payload) {
  return request(`/admin/retrieval/keyword-rules/${ruleCode}/keywords`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export function getTermNormalizations() {
  return request('/admin/retrieval/term-normalizations')
}

export function createTermNormalization(payload) {
  return request('/admin/retrieval/term-normalizations', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function updateTermNormalization(termId, payload) {
  return request(`/admin/retrieval/term-normalizations/${termId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export function deleteTermNormalization(termId) {
  return request(`/admin/retrieval/term-normalizations/${termId}`, {
    method: 'DELETE'
  })
}
