import { request } from './request'

export function importJsonVectors({ recordType, files }) {
  const formData = new FormData()
  formData.append('record_type', recordType)
  files.forEach((file) => {
    formData.append('files', file)
  })

  return request('/admin/vector-ingest/json', {
    method: 'POST',
    body: formData
  })
}
