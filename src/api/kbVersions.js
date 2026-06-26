import { request } from './request'

export function getKbVersions() {
  return request('/admin/kb/versions')
}

export function getKbVersionPointer() {
  return request('/admin/kb/versions/pointers/current')
}

export function createKbVersion(payload) {
  return request('/admin/kb/versions', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function publishKbVersion(kbVersion, message = '') {
  return request(`/admin/kb/versions/${kbVersion}/publish`, {
    method: 'POST',
    body: JSON.stringify({ message })
  })
}

export function rollbackKbVersion(kbVersion, message = '') {
  return request(`/admin/kb/versions/${kbVersion}/rollback`, {
    method: 'POST',
    body: JSON.stringify({ message })
  })
}
