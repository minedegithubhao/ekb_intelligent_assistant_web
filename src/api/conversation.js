import { request } from './request'

function withKnowledgeBaseType(data = {}) {
  const knowledgeBaseType = data.knowledge_base_type || localStorage.getItem('knowledge_base_type')
  return {
    ...data,
    ...(knowledgeBaseType ? { knowledge_base_type: knowledgeBaseType } : {})
  }
}

export function getConversations(params = {}) {
  const query = new URLSearchParams(withKnowledgeBaseType(params)).toString()
  return request(`/conversations${query ? `?${query}` : ''}`)
}

export function createConversation(payload = {}) {
  return request('/conversations', {
    method: 'POST',
    body: JSON.stringify(withKnowledgeBaseType(payload))
  })
}

export function getConversationMessages(conversationId, params = {}) {
  const query = new URLSearchParams(withKnowledgeBaseType(params)).toString()
  return request(`/conversations/${conversationId}/messages${query ? `?${query}` : ''}`)
}

export function deleteConversation(conversationId) {
  return request(`/conversations/${conversationId}`, {
    method: 'DELETE'
  })
}

export function sendConversationMessage(conversationId, payload) {
  return request(`/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(withKnowledgeBaseType(payload))
  })
}
