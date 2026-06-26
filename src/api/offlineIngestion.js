import { request } from './request'

export function getOfflineIngestionConfigs() {
  return request('/admin/offline-ingestion/configs')
}

export function getActiveOfflineIngestionConfig() {
  return request('/admin/offline-ingestion/configs/active')
}

export function createOfflineIngestionConfig(config) {
  return request('/admin/offline-ingestion/configs', {
    method: 'POST',
    body: JSON.stringify(config)
  })
}

export function activateOfflineIngestionConfig(configId) {
  return request(`/admin/offline-ingestion/configs/${configId}/activate`, {
    method: 'POST',
    body: JSON.stringify({})
  })
}

export function createOfflineIngestionTask(payload) {
  return request('/admin/offline-ingestion/tasks', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function createDocumentUploadTask(formData) {
  return request('/admin/offline-ingestion/document-tasks', {
    method: 'POST',
    body: formData
  })
}

export function createFaqUploadTask(formData) {
  return request('/admin/offline-ingestion/faq-tasks', {
    method: 'POST',
    body: formData
  })
}

export function getOfflineIngestionTasks() {
  return request('/admin/offline-ingestion/tasks')
}

export function getOfflineIngestionTask(taskId) {
  return request(`/admin/offline-ingestion/tasks/${taskId}`)
}

export function getServerDirectories(path = '') {
  const query = path ? `?path=${encodeURIComponent(path)}` : ''
  return request(`/admin/offline-ingestion/directories${query}`)
}
