import { request } from './request'

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )
}

export function getAdminUsers(params = {}) {
  const query = new URLSearchParams(compactParams(params)).toString()
  return request(`/admin/users${query ? `?${query}` : ''}`)
}

export function createAdminUser(payload) {
  return request('/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function updateAdminUser(userId, payload) {
  return request(`/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export function disableAdminUser(userId) {
  return request(`/admin/users/${userId}`, {
    method: 'DELETE'
  })
}
