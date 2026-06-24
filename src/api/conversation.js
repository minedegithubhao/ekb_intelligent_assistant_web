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

export async function streamConversationMessage(conversationId, payload, handlers = {}) {
  const token = localStorage.getItem('token')
  const response = await fetch(`/api/conversations/${conversationId}/messages/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(withKnowledgeBaseType(payload))
  })

  if (!response.ok || !response.body) {
    throw new Error('请求失败')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  const dispatchEvent = (block) => {
    const lines = block.split('\n')
    const eventLine = lines.find((line) => line.startsWith('event:'))
    const dataLines = lines.filter((line) => line.startsWith('data:'))
    const event = eventLine ? eventLine.slice(6).trim() : 'message'
    const rawData = dataLines.map((line) => line.slice(5).trim()).join('\n')
    if (!rawData) return
    const data = JSON.parse(rawData)

    if (event === 'progress') handlers.onProgress?.(data)
    if (event === 'final') handlers.onFinal?.(data)
    if (event === 'error') handlers.onError?.(data)
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split(/\n\n/)
    buffer = blocks.pop() || ''
    blocks.forEach((block) => {
      if (block.trim()) dispatchEvent(block)
    })
  }

  buffer += decoder.decode()
  if (buffer.trim()) {
    dispatchEvent(buffer)
  }
}
