import { request } from './request'

function compactParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  )
}

export function getAdminConversationUsers(params = {}) {
  const query = new URLSearchParams(compactParams(params)).toString()
  return request(`/admin/conversations/users${query ? `?${query}` : ''}`)
}

export function getAdminConversations(params = {}) {
  const query = new URLSearchParams(compactParams(params)).toString()
  return request(`/admin/conversations${query ? `?${query}` : ''}`)
}

export function getAdminConversationMessages(conversationId, params = {}) {
  const query = new URLSearchParams(compactParams(params)).toString()
  return request(`/admin/conversations/${conversationId}/messages${query ? `?${query}` : ''}`)
}

export function deleteAdminConversation(conversationId) {
  return request(`/admin/conversations/${conversationId}`, {
    method: 'DELETE'
  })
}
