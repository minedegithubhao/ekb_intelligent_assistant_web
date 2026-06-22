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
  return saveDashboardConfig(payload)
}

export function activateConfigVersion(versionId) {
  return request(`/admin/config/versions/${versionId}/activate`, {
    method: 'POST'
  })
}
