import { request } from './request'

export function getDashboardConfig() {
  return request('/admin/dashboard/config')
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
